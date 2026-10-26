const { execFile } = require('child_process');

// Ejecuta `reg` y devuelve su salida (o '' si la clave no existe / no estamos en Windows)
function reg(args) {
  return new Promise((resolve) => {
    execFile('reg', args, { windowsHide: true, maxBuffer: 16 * 1024 * 1024 }, (err, stdout) => resolve(err ? '' : stdout));
  });
}

// Convierte la salida de `reg query ... /s` en { rutaDeClave: { nombreValor: dato } }
function parseReg(out) {
  const keys = {};
  let cur = null;
  for (const raw of String(out).split(/\r?\n/)) {
    if (!raw.trim()) continue;
    if (!/^\s/.test(raw)) { cur = raw.trim(); keys[cur] = {}; continue; }
    const m = raw.match(/^\s+(.+?)\s{4}(REG_\w+)\s{4}(.*)$/);
    if (m && cur) keys[cur][m[1]] = m[3];
  }
  return keys;
}

async function queryAll(key) {
  return parseReg(await reg(['query', key, '/s']));
}

// Claves cuyo nombre contiene `text` (sin sus valores): para encontrar entradas con un nombre variable
async function findKeys(root, text) {
  const out = await reg(['query', root, '/f', text, '/k']);
  return String(out).split(/\r?\n/).map((l) => l.trim()).filter((l) => /^HK/i.test(l) && l.toLowerCase() !== root.toLowerCase());
}

module.exports = { queryAll, findKeys, parseReg };
