const path = require('path');
const zlib = require('zlib');
const C = require('./common');

// itch.io: los juegos de la app van a %APPDATA%\itch\apps\<juego>; en cada carpeta, .itch\receipt.json.gz tiene el título y la portada.
function receipt(dir, deps) {
  const buf = deps.readBuf(path.join(dir, '.itch', 'receipt.json.gz'));
  if (!buf) return null;
  try { return JSON.parse(zlib.gunzipSync(buf).toString('utf8')); } catch { return null; }
}

async function scanItch(depsIn) {
  const deps = { ...C.realDeps, ...(depsIn || {}) };
  const env = deps.env || {};
  const roots = [];
  if (env.APPDATA) roots.push(path.join(env.APPDATA, 'itch', 'apps'));
  if (env.LOCALAPPDATA) roots.push(path.join(env.LOCALAPPDATA, 'itch', 'apps'));
  const games = [], seen = new Set();
  for (const root of roots) for (const d of C.subdirs(root, deps)) {
    if (seen.has(C.norm(d.full))) continue; seen.add(C.norm(d.full));
    const rc = receipt(d.full, deps);
    const exe = C.findGameExe(d.full, deps);
    if (!exe) continue; // juegos web o de otros sistemas
    const gm = (rc && rc.game) || {};
    games.push({ id: `itch:${C.slug(d.name)}`, source: 'itch', name: (gm.title || d.name).trim(), cover: gm.coverUrl || gm.stillCoverUrl || null, exe, installPath: d.full, cwd: path.dirname(exe) });
  }
  return games;
}

module.exports = { scanItch };
