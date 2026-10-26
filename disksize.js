// Tamaño en disco de los juegos instalados (de cualquier tienda): se calcula en segundo plano y se guarda aparte
// (userData/disk-sizes.json) para no tener que recorrer las carpetas cada vez.
const fs = require('fs');
const path = require('path');

const MAX_AGE = 7 * 24 * 3600 * 1000; // se recalcula pasada una semana
const MAX_FILES = 400000; // más que esto = probablemente no es la carpeta de un juego (raíz de un disco, etc.)

async function dirSize(dir, opts) {
  const maxFiles = (opts && opts.maxFiles) || MAX_FILES;
  let total = 0, files = 0;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let ents;
    try { ents = await fs.promises.readdir(d, { withFileTypes: true }); } catch { continue; }
    const jobs = [];
    for (const e of ents) {
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) { stack.push(path.join(d, e.name)); continue; }
      if (!e.isFile()) continue;
      files++;
      jobs.push(fs.promises.stat(path.join(d, e.name)).then((s) => { total += s.size; }, () => {}));
      if (jobs.length >= 64) await Promise.all(jobs.splice(0));
    }
    await Promise.all(jobs);
    if (files > maxFiles) return null;
  }
  return total;
}

// Carpeta que se mide para un juego (null si no se sabe o no merece la pena medirla)
function gameDir(g) {
  if (!g || g.installed === false) return null;
  let dir = g.installPath || (g.exe && path.dirname(g.exe)) || null;
  if (!dir || !path.isAbsolute(dir)) return null;
  dir = path.resolve(dir);
  if (path.dirname(dir) === dir) return null; // raíz de un disco
  return dir;
}

function create(file) {
  let data = {};
  try { data = JSON.parse(fs.readFileSync(file, 'utf8')) || {}; } catch { data = {}; }
  let scanning = false, last = null;
  const save = () => { try { fs.writeFileSync(file, JSON.stringify(data)); } catch { /* sin permiso: se recalcula la próxima vez */ } };
  return {
    bytes: (id) => (data[id] && Number.isFinite(data[id].b) ? data[id].b : null),
    all: () => Object.fromEntries(Object.entries(data).filter(([, v]) => Number.isFinite(v.b)).map(([k, v]) => [k, v.b])),
    state: () => ({ scanning, last }),
    // Mide los juegos pendientes (sin dato, con otra ruta o con dato viejo; todos si force)
    async scan(games, { force, onProgress } = {}) {
      if (scanning) return false;
      scanning = true;
      let done = 0;
      try {
        const now = Date.now();
        const todo = [];
        const live = new Set();
        for (const g of games) {
          const dir = gameDir(g);
          if (!dir) continue;
          live.add(g.id);
          const c = data[g.id];
          if (force || !c || c.p !== dir || now - c.t > MAX_AGE) todo.push([g, dir]);
        }
        for (const id of Object.keys(data)) if (!live.has(id) && !games.some((g) => g.id === id)) delete data[id]; // juegos que ya no existen
        for (const [g, dir] of todo) {
          const b = await dirSize(dir);
          data[g.id] = { b, t: Date.now(), p: dir };
          done++;
          if (onProgress && done % 5 === 0) onProgress(done, todo.length);
        }
        last = Date.now();
        save();
      } finally { scanning = false; }
      return true;
    },
  };
}

module.exports = { dirSize, gameDir, create };
