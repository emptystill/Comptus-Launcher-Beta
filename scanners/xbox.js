const { execFile } = require('child_process');

// Los juegos de Xbox / Game Pass para PC son paquetes de Windows que incluyen un archivo
// MicrosoftGame.config. Los listamos con PowerShell y los abrimos con su AppUserModelId.
const SCRIPT = `
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'
$list = Get-AppxPackage | Where-Object {
  -not $_.IsFramework -and $_.InstallLocation -and (Test-Path -LiteralPath (Join-Path $_.InstallLocation 'MicrosoftGame.config'))
} | ForEach-Object {
  [pscustomobject]@{
    pfn    = $_.PackageFamilyName
    name   = $_.Name
    config = (Get-Content -Raw -LiteralPath (Join-Path $_.InstallLocation 'MicrosoftGame.config'))
  }
}
if ($list) { ConvertTo-Json -InputObject @($list) -Compress -Depth 3 } else { '[]' }
`;

function runPowerShell() {
  return new Promise((resolve) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', SCRIPT],
      { windowsHide: true, timeout: 20000, maxBuffer: 32 * 1024 * 1024 },
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

// `jsonOverride` permite probar con datos de ejemplo.
async function scanXbox(jsonOverride) {
  let items;
  try { items = JSON.parse(jsonOverride || (await runPowerShell()) || '[]'); } catch { return []; }
  if (!Array.isArray(items)) items = [items];

  const games = [];
  const seen = new Set();
  for (const it of items) {
    if (!it || !it.pfn || seen.has(it.pfn)) continue;
    const cfg = it.config || '';

    let name = (cfg.match(/DefaultDisplayName="([^"]+)"/) || [])[1];
    if (!name || /^ms-resource:/i.test(name)) name = prettyName(it.name); // nombre localizado: usamos el del paquete
    name = decodeXml(name);

    const appId = (cfg.match(/<Executable\b[^>]*\bId="([^"]+)"/) || [])[1] || 'Game';

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
