const path = require('path');
const { queryAll, findKeys } = require('./winreg');
const C = require('./common');

// Amazon Games: cada juego instalado aparece en «Uninstall» como «AmazonGames/<título>»; en su carpeta, fuel.json dice qué ejecutar.
const ROOTS = ['HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall', 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall', 'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall'];
const realDeps = {
  ...C.realDeps,
  uninstall: async () => { const all = {}; for (const r of ROOTS) for (const k of await findKeys(r, 'AmazonGames')) Object.assign(all, await queryAll(k)); return all; },
};

function fuelExe(dir, deps) {
  try {
    const j = JSON.parse(deps.readText(path.join(dir, 'fuel.json')).replace(/^\uFEFF/, ''));
    const cmd = j && j.Main && j.Main.Command;
    if (cmd) { const full = path.join(dir, String(cmd).replace(/\\/g, '/').replace(/^\/+/, '')); if (deps.exists(full)) return { exe: full, args: (j.Main.Args || []).join(' ') }; }
  } catch { /* sin fuel.json */ }
  return null;
}

async function scanAmazon(depsIn) {
  const deps = { ...realDeps, ...(depsIn || {}) };
  if (!C.launcherPresent(deps, ['Amazon Games'])) return []; // no tienes ese launcher: ni se consulta el registro
  const reg = await deps.uninstall().catch(() => ({}));
  const games = [], seen = new Set();
  for (const [key, v] of Object.entries(reg)) {
    const dir = C.clean(v.InstallLocation || '');
    const name = String(v.DisplayName || key.split('AmazonGames/').pop() || '').trim();
    if (!dir || !name || !deps.exists(dir) || seen.has(C.norm(dir))) continue;
    seen.add(C.norm(dir));
    const f = fuelExe(dir, deps);
    const exe = f ? f.exe : C.findGameExe(dir, deps);
    if (!exe) continue;
    games.push({ id: `amazon:${C.slug(name)}`, source: 'prime', name, cover: null, exe, args: f ? f.args : '', installPath: dir, cwd: path.dirname(exe) });
  }
  return games;
}

module.exports = { scanAmazon };
