// Convierte el manifiesto de Ludusavi (YAML, ~18 MB) en un índice pequeño con solo lo necesario:
// juegos con archivos de guardado en Windows. Se ejecuta en un proceso aparte para no frenar Comptus.
// Uso: node saves-build.js <manifest.yaml> <salida.json>
const fs = require('fs');
const YAML = require('yaml');

const wt = require('worker_threads');
const input = wt.isMainThread ? process.argv[2] : wt.workerData.input, output = wt.isMainThread ? process.argv[3] : wt.workerData.output;
const doc = YAML.parse(fs.readFileSync(input, 'utf8'));
const out = [];
for (const [name, e] of Object.entries(doc)) {
  if (!e || !e.files) continue;
  const files = [];
  for (const [p, def] of Object.entries(e.files)) {
    const tags = (def && def.tags) || [];
    if (!tags.includes('save')) continue; // solo partidas (no «config» suelto)
    const when = (def && def.when) || [];
    if (when.length && !when.some((w) => !w.os || w.os === 'windows')) continue;
    // las rutas de otras tiendas que no sean la del juego no sirven sin esa tienda
    if (when.length && when.every((w) => w.store && w.store !== 'steam' && w.store !== 'gog' && w.store !== 'epic' && w.store !== 'other')) continue;
    files.push(p);
  }
  if (!files.length) continue;
  const r = { n: name, f: files };
  if (e.steam && e.steam.id) r.s = e.steam.id;
  if (e.gog && e.gog.id) r.g = e.gog.id;
  if (e.id && Array.isArray(e.id.steamExtra) && e.id.steamExtra.length) r.x = e.id.steamExtra;
  if (e.installDir) r.d = Object.keys(e.installDir);
  out.push(r);
}
fs.writeFileSync(output, JSON.stringify({ built: Date.now(), games: out }));
