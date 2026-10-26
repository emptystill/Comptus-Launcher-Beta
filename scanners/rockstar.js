const path = require('path');
const { queryAll } = require('./winreg');
const C = require('./common');

// Rockstar Games Launcher: cada juego deja «InstallFolder» en HKLM\SOFTWARE\WOW6432Node\Rockstar Games\<juego>.
const ROOTS = ['HKLM\\SOFTWARE\\WOW6432Node\\Rockstar Games', 'HKLM\\SOFTWARE\\Rockstar Games'];
const NAMES = { gtav: 'Grand Theft Auto V', gta5: 'Grand Theft Auto V', gtaiv: 'Grand Theft Auto IV', 'grand theft auto v': 'Grand Theft Auto V', rdr2: 'Red Dead Redemption 2', 'red dead redemption 2': 'Red Dead Redemption 2', mp3: 'Max Payne 3', 'la noire': 'L.A. Noire', bully: 'Bully: Scholarship Edition' };
const SKIP = /launcher|social club|rockstar games$|^rockstar$/i;
const realDeps = { ...C.realDeps, registry: async () => { const all = {}; for (const r of ROOTS) Object.assign(all, await queryAll(r)); return all; } };

async function scanRockstar(depsIn) {
  const deps = { ...realDeps, ...(depsIn || {}) };
  if (!C.launcherPresent(deps, ['Rockstar Games'])) return []; // no tienes ese launcher: ni se consulta el registro
  const reg = await deps.registry().catch(() => ({}));
  const games = [], seen = new Set();
  for (const [key, v] of Object.entries(reg)) {
    const leaf = key.split('\\').pop();
    const dir = C.clean(v.InstallFolder || v.InstallLocation || '');
    if (!dir || SKIP.test(leaf) || !deps.exists(dir) || seen.has(C.norm(dir))) continue;
    seen.add(C.norm(dir));
    const exe = C.findGameExe(dir, deps, /^play.*\.exe$/i);
    if (!exe) continue;
    const name = NAMES[leaf.toLowerCase()] || v.DisplayName || leaf;
    games.push({ id: `rockstar:${C.slug(leaf)}`, source: 'rockstar', name, cover: null, exe, installPath: dir, cwd: path.dirname(exe) });
  }
  return games;
}

module.exports = { scanRockstar };
