const path = require('path');
const { queryAll } = require('./winreg');
const C = require('./common');

// Battle.net: los juegos se registran en «Uninstall» con Blizzard (o Activision) como editor. Para los más conocidos se abren
// por el launcher (battlenet://CÓDIGO); el resto, por su .exe.
const UNINSTALL = ['HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall', 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'];
const CODES = [
  [/world of warcraft/i, 'WoW'], [/diablo iv/i, 'Fen'], [/diablo.*immortal/i, 'ANBS'], [/diablo.*resurrected/i, 'OSI'], [/diablo.*iii/i, 'D3'],
  [/overwatch/i, 'Pro'], [/hearthstone/i, 'WTCG'], [/heroes of the storm/i, 'Hero'], [/starcraft.*(ii|2)\b/i, 'S2'], [/starcraft.*remastered/i, 'S1'],
  [/warcraft.*iii|warcraft 3/i, 'W3'],
];
const realDeps = { ...C.realDeps, uninstall: async () => { const all = {}; for (const r of UNINSTALL) Object.assign(all, await queryAll(r)); return all; } };

async function scanBattlenet(depsIn) {
  const deps = { ...realDeps, ...(depsIn || {}) };
  if (!C.launcherPresent(deps, ['Battle.net', 'Blizzard Entertainment'])) return []; // no tienes ese launcher: ni se consulta el registro
  const reg = await deps.uninstall().catch(() => ({}));
  const games = [], seen = new Set();
  for (const v of Object.values(reg)) {
    const name = String(v.DisplayName || '').trim();
    if (!name || /^battle\.net$/i.test(name)) continue;
    const pub = String(v.Publisher || ''), un = String(v.UninstallString || '') + ' ' + String(v.DisplayIcon || '');
    const blizz = /blizzard|activision/i.test(pub) || /battle\.net/i.test(un);
    if (!blizz || /agent|battle\.net/i.test(name)) continue;
    const dir = C.clean(v.InstallLocation || '');
    if (!dir || !deps.exists(dir) || seen.has(C.norm(dir))) continue;
    seen.add(C.norm(dir));
    const code = (CODES.find(([re]) => re.test(name)) || [])[1];
    const exe = C.findGameExe(dir, deps);
    if (!code && !exe) continue;
    const g = { id: `battlenet:${C.slug(name)}`, source: 'battlenet', name, cover: null, installPath: dir };
    if (code) g.launchUri = `battlenet://${code}`; else { g.exe = exe; g.cwd = path.dirname(exe); }
    games.push(g);
  }
  return games;
}

module.exports = { scanBattlenet };
