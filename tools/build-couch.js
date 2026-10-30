// Une renderer/couch/*.js (en orden alfabético) en renderer/couch.js, que es el que carga index.html.
// Uso:  node tools/build-couch.js          → genera renderer/couch.js
//       node tools/build-couch.js --check  → falla si renderer/couch.js no está al día
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'renderer', 'couch');
const out = path.join(__dirname, '..', 'renderer', 'couch.js');
const parts = fs.readdirSync(dir).filter((f) => /\.js$/.test(f)).sort();
if (!parts.length) { console.error('No hay partes en renderer/couch/'); process.exit(1); }
const txt = parts.map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('');
const cur = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
if (process.argv.includes('--check')) {
  if (cur !== txt) { console.error('renderer/couch.js no está al día: ejecuta  npm run couch'); process.exit(1); }
  console.log('couch.js al día (' + parts.length + ' partes)'); process.exit(0);
}
if (cur !== txt) { fs.writeFileSync(out, txt); console.log('couch.js generado (' + parts.length + ' partes, ' + txt.split('\n').length + ' líneas)'); }
else console.log('couch.js ya estaba al día');
