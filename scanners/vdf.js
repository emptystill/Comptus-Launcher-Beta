// Lector mínimo del formato VDF de Valve ("clave" "valor" y "clave" { ... }).
// Devuelve objetos anidados; las claves se guardan tal cual (la búsqueda ignora mayúsculas con `getCI`).
function parseVdf(text) {
  const tokens = [];
  const re = /"((?:[^"\\]|\\.)*)"|([{}])/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[2]) tokens.push(m[2]);
    else tokens.push({ s: m[1].replace(/\\(.)/g, (_, c) => (c === 'n' ? '\n' : c === 't' ? '\t' : c)) });
  }
  let i = 0;
  function block() {
    const obj = {};
    while (i < tokens.length) {
      const t = tokens[i];
      if (t === '}') { i++; return obj; }
      if (typeof t === 'string') { i++; continue; } // llave suelta
      const key = t.s;
      i++;
      const v = tokens[i];
      if (v === '{') { i++; obj[key] = block(); }
      else if (v && typeof v === 'object') { obj[key] = v.s; i++; }
    }
    return obj;
  }
  return block();
}

// Busca una clave sin importar mayúsculas/minúsculas
function getCI(obj, key) {
  if (!obj || typeof obj !== 'object') return undefined;
  const k = Object.keys(obj).find((x) => x.toLowerCase() === key.toLowerCase());
  return k === undefined ? undefined : obj[k];
}

module.exports = { parseVdf, getCI };
