// Lee la caché local de Ubisoft Connect (%LOCALAPPDATA%\Ubisoft Game Launcher\cache\configuration\configurations).
// Es un archivo protobuf con un registro por producto de tu cuenta; cada uno trae un YAML con el nombre, imágenes,
// si es contenido extra, si es de otra tienda, etc. Es lo mismo que lee Playnite. Formato no documentado: el lector
// es tolerante (si algo no cuadra, se salta ese registro) y el diagnóstico dice qué pasó.
const fs = require('fs');
const path = require('path');

const ASSET_BASE = 'https://ubistatic3-a.akamaihd.net/orbit/uplay_launcher_3_0/assets/';

// --- protobuf mínimo ---
function readVarint(buf, pos) {
  let result = 0, shift = 0, b;
  do {
    if (pos >= buf.length || shift > 56) throw new Error('varint');
    b = buf[pos++];
    result += (b & 0x7f) * Math.pow(2, shift);
    shift += 7;
  } while (b & 0x80);
  return [result, pos];
}
// Devuelve [{ no, wire, value }] (varint: número; length-delimited: Buffer)
function parseFields(buf) {
  const out = [];
  let pos = 0;
  while (pos < buf.length) {
    let tag; [tag, pos] = readVarint(buf, pos);
    const no = Math.floor(tag / 8), wire = tag % 8;
    if (wire === 0) { let v; [v, pos] = readVarint(buf, pos); out.push({ no, wire, value: v }); }
    else if (wire === 2) { let len; [len, pos] = readVarint(buf, pos); if (pos + len > buf.length) throw new Error('len'); out.push({ no, wire, value: buf.subarray(pos, pos + len) }); pos += len; }
    else if (wire === 1) { pos += 8; }
    else if (wire === 5) { pos += 4; }
    else throw new Error('wire');
  }
  return out;
}

// --- YAML mínimo (solo lo que hace falta) ---
const unq = (s) => String(s == null ? '' : s).trim().replace(/^(['"])(.*)\1$/, '$2').trim();
const indentOf = (l) => l.length - l.trimStart().length;
function parseProductYaml(text) {
  const lines = String(text).split(/\r?\n/);
  const info = { name: '', thumb: '', icon: '', background: '', logo: '', thirdParty: false, isUlc: false, addons: [], hasStart: false, loc: {} };
  let top = null, sec = null; // sección de primer nivel y subsección (root > addons…)
  for (const raw of lines) {
    if (!raw.trim() || /^\s*#/.test(raw)) continue;
    const ind = indentOf(raw), line = raw.trim();
    if (ind === 0) { const m = line.match(/^([\w-]+):\s*(.*)$/); top = m ? m[1] : null; sec = null; continue; }
    if (top === 'localizations') {
      if (ind === 2) { const m = line.match(/^([\w-]+):/); sec = m ? m[1] : null; }
      else if (ind >= 4 && sec === 'default') { const m = line.match(/^([^:]+):\s*(.*)$/); if (m) info.loc[unq(m[1])] = unq(m[2]); }
      continue;
    }
    if (top !== 'root') continue;
    if (ind === 2 && sec === 'addons' && line.startsWith('-')) { const a = line.match(/(?:id|uplay_id):\s*(\d+)/); if (a) info.addons.push(Number(a[1])); continue; }
    if (ind === 2) {
      const m = line.match(/^([\w-]+):\s*(.*)$/); if (!m) continue;
      sec = m[1]; const v = unq(m[2]);
      if (m[1] === 'name') info.name = v;
      else if (m[1] === 'thumb_image') info.thumb = v;
      else if (m[1] === 'icon_image') info.icon = v;
      else if (m[1] === 'background_image') info.background = v;
      else if (m[1] === 'logo_image') info.logo = v;
      else if (m[1] === 'is_ulc') info.isUlc = /^true$/i.test(v);
      else if (m[1] === 'third_party_platform') info.thirdParty = v !== '' && !/^(null|~)$/i.test(v) ? true : info.thirdParty;
      else if (m[1] === 'start_game') info.hasStart = true;
    } else if (sec === 'third_party_platform') info.thirdParty = true;
    else if (sec === 'addons') { const m = line.match(/(?:^-\s*)?(?:id|uplay_id):\s*(\d+)/); if (m) info.addons.push(Number(m[1])); }
  }
  return info;
}

const clean = (s) => String(s || '').replace(/[™®©]/g, '').replace(/\s+/g, ' ').trim();
const localized = (v, loc) => (v && Object.prototype.hasOwnProperty.call(loc, v) ? loc[v] : v);
const asset = (v) => (v ? (/^https?:/i.test(v) ? v : ASSET_BASE + v) : null);

// Texto -> productos [{ uplayId, installId, name, cover, icon, background, logo, thirdParty, isUlc, addons, hasStart }]
function parseConfigurations(buf) {
  const stats = { entries: 0, parsed: 0, skipped: 0 };
  const products = [];
  let top;
  try { top = parseFields(buf); } catch { return { products, stats, error: 'El archivo no tiene el formato esperado.' }; }
  const entries = [];
  for (const f of top) if (f.wire === 2) entries.push(f.value); // cada campo del nivel superior es un registro (o los contiene)
  for (const e of entries) {
    stats.entries++;
    let fields;
    try { fields = parseFields(e); } catch { stats.skipped++; continue; }
    // algunos archivos anidan los registros en un campo contenedor
    const candidates = [fields];
    for (const f of fields) if (f.wire === 2 && f.value.length > 20 && !/root:/.test(f.value.toString('utf8', 0, Math.min(f.value.length, 4000)))) { try { candidates.push(parseFields(f.value)); } catch {} }
    let found = false;
    for (const fl of candidates) {
      const y = fl.filter((f) => f.wire === 2 && /(^|\n)\s*root:/.test(f.value.toString('utf8'))).sort((a, b) => b.value.length - a.value.length)[0];
      if (!y) continue;
      const varints = fl.filter((f) => f.wire === 0);
      const uplayId = (varints.find((f) => f.no === 1) || varints[0] || {}).value;
      const installId = (varints.find((f) => f.no === 2) || {}).value;
      if (!uplayId) continue;
      const p = parseProductYaml(y.value.toString('utf8'));
      products.push({
        uplayId, installId,
        name: clean(localized(p.name, p.loc)),
        cover: asset(localized(p.thumb, p.loc)), icon: asset(localized(p.icon, p.loc)),
        background: asset(localized(p.background, p.loc)), logo: asset(localized(p.logo, p.loc)),
        thirdParty: p.thirdParty, isUlc: p.isUlc, addons: p.addons, hasStart: p.hasStart,
      });
      stats.parsed++; found = true; break;
    }
    if (!found) stats.skipped++;
  }
  return { products, stats };
}

// Quita lo que no es un juego propio: contenido extra, de otra tienda o sin forma de abrirse.
// Con `excluded` (un array) se anota cada descarte con su motivo, para el diagnóstico.
function ownedGames(products, excluded, opts) {
  const includeStore = !!(opts && opts.includeStore);
  const addonIds = new Set();
  for (const p of products) for (const a of p.addons) addonIds.add(a);
  const out = [];
  for (const p of products) {
    let why = '';
    const viaStore = includeStore && p.thirdParty; // vinculado desde otra tienda (Steam…): se jugará desde allí
    if (!p.name) why = 'sin nombre';
    else if (p.thirdParty && !includeStore) why = 'comprado en otra tienda';
    else if (p.isUlc) why = 'contenido extra (ULC)';
    else if (addonIds.has(p.uplayId)) why = 'DLC de otro juego';
    else if (!p.hasStart && !viaStore) why = 'sin forma de abrirse (start_game)';
    if (why) { if (excluded) excluded.push({ id: p.uplayId, name: p.name || '(sin nombre)', why }); } else out.push(viaStore ? { ...p, viaStore: true } : p);
  }
  return out;
}

function cachePath(env) { return path.join((env || process.env).LOCALAPPDATA || '', 'Ubisoft Game Launcher', 'cache', 'configuration', 'configurations'); }

function readCache(env) {
  const file = cachePath(env);
  let buf;
  try { buf = fs.readFileSync(file); } catch { return { products: [], stats: { entries: 0, parsed: 0, skipped: 0 }, file, missing: true }; }
  return { ...parseConfigurations(buf), file, bytes: buf.length };
}

module.exports = { parseConfigurations, parseProductYaml, ownedGames, readCache, cachePath, ASSET_BASE };
