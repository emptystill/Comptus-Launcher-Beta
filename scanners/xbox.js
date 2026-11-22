const { execFile } = require('child_process');

// Los juegos de Xbox / Game Pass para PC son paquetes de Windows. Los modernos incluyen un archivo
// MicrosoftGame.config; los primeros (2016-2018, p. ej. Gears of War 4) solo tienen el AppxManifest.xml de
// cualquier app de Windows. Esos se reconocen si su paquete está en tu lista de juegos de Xbox (cuenta iniciada),
// que llega en COMPTUS_XBOX_PFNS. Los listamos con PowerShell y los abrimos con su AppUserModelId.
const SCRIPT = `
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'
$known = @{}; foreach ($k in ($env:COMPTUS_XBOX_PFNS -split ',')) { if ($k) { $known[$k.ToLower()] = 1 } }
$list = Get-AppxPackage | Where-Object { -not $_.IsFramework -and $_.InstallLocation } | ForEach-Object {
  $cfgPath = Join-Path $_.InstallLocation 'MicrosoftGame.config'
  if (Test-Path -LiteralPath $cfgPath) {
    [pscustomobject]@{ pfn = $_.PackageFamilyName; name = $_.Name; config = (Get-Content -Raw -LiteralPath $cfgPath) }
  } elseif ($known.ContainsKey($_.PackageFamilyName.ToLower())) {
    $app = $null; $title = $null
    try { $m = $_ | Get-AppxPackageManifest; $app = @($m.Package.Applications.Application)[0]; $title = $m.Package.Properties.DisplayName } catch {}
    [pscustomobject]@{ pfn = $_.PackageFamilyName; name = $_.Name; config = ''; appId = $(if ($app) { $app.Id } else { '' }); title = $title }
  }
}
if ($list) { ConvertTo-Json -InputObject @($list) -Compress -Depth 3 } else { '[]' }
`;

function runPowerShell(knownPfns) {
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', SCRIPT],
      { windowsHide: true, timeout: 20000, maxBuffer: 32 * 1024 * 1024, env: { ...process.env, COMPTUS_XBOX_PFNS: (knownPfns || []).join(',') } },
      (err, stdout) => resolve(err ? '[]' : stdout));
  });
}

function decodeXml(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

function prettyName(pkgName) {
  const last = String(pkgName).split('.').pop() || pkgName;
  return last.replace(/([a-z])([A-Z])/g, '$1 $2');
}

// `jsonOverride` permite probar con datos de ejemplo. `knownPfns`: paquetes de tu lista de juegos de Xbox.
async function scanXbox(jsonOverride, { knownPfns } = {}) {
  let items;
  try { items = JSON.parse(jsonOverride || (await runPowerShell(knownPfns)) || '[]'); } catch { return []; }
  if (!Array.isArray(items)) items = [items];

  const games = [];
  const seen = new Set();
  for (const it of items) {
    if (!it || !it.pfn || seen.has(it.pfn)) continue;
    const cfg = it.config || '';

    let name = (cfg.match(/DefaultDisplayName="([^"]+)"/) || [])[1] || it.title;
    if (!name || /^ms-resource:/i.test(name)) name = prettyName(it.name); // nombre localizado: usamos el del paquete
    name = decodeXml(String(name));

    const appId = (cfg.match(/<Executable\b[^>]*\bId="([^"]+)"/) || [])[1] || it.appId || 'Game';

    seen.add(it.pfn);
    games.push({
      id: `xbox:${it.pfn}`,
      source: 'xbox',
      name,
      cover: null,
      launchCmd: ['explorer.exe', `shell:AppsFolder\\${it.pfn}!${appId}`],
    });
  }
  return games;
}

module.exports = { scanXbox };
