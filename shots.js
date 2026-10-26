// Capturas de pantalla: una carpeta por juego dentro de los datos de la app.
const fs = require('fs');
const path = require('path');

const safe = (id) => String(id || '_otros').replace(/[^a-zA-Z0-9._-]+/g, '_');
const root = (ud) => path.join(ud, 'screenshots');
const dirFor = (ud, id) => path.join(root(ud), safe(id));

function stamp(t) {
  const d = new Date(t), p = (n, l = 2) => String(n).padStart(l, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}`;
}

function save(ud, id, buffer, t = Date.now()) {
  const dir = dirFor(ud, id);
  fs.mkdirSync(dir, { recursive: true });
  let file = path.join(dir, `${stamp(t)}.jpg`);
  for (let n = 2; fs.existsSync(file); n++) file = path.join(dir, `${stamp(t)}_${n}.jpg`);
  fs.writeFileSync(file, buffer);
  return file;
}

function list(ud, id) {
  const dir = dirFor(ud, id);
  let names = [];
  try { names = fs.readdirSync(dir); } catch { return []; }
  return names.filter((n) => /\.(jpe?g|png)$/i.test(n)).map((n) => {
    const file = path.join(dir, n);
    let time = 0;
    try { time = fs.statSync(file).mtimeMs; } catch { /* ignorar */ }
    return { path: file, time };
  }).sort((a, b) => b.time - a.time || (a.path < b.path ? 1 : -1));
}

// Solo se borra dentro de la carpeta de capturas (nunca una ruta cualquiera)
function remove(ud, file) {
  const r = path.resolve(root(ud)) + path.sep;
  const f = path.resolve(String(file || ''));
  if (!f.startsWith(r) || !/\.(jpe?g|png)$/i.test(f)) return false;
  try { fs.unlinkSync(f); return true; } catch { return false; }
}

module.exports = { save, list, remove, dirFor, root, safe };
