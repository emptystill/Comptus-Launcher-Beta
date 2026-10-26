// Carpeta de imágenes propias de Comptus: <datos de la aplicación>/media/{Banners,Portadas,Logos,Iconos,Fondos}
// - Al elegir una imagen desde Comptus se COPIA aquí y en los datos se guarda «media:Portadas/Juego.png» (no una ruta del PC),
//   así sobrevive a borrar el original y viaja con las copias de seguridad.
// - Cualquier imagen que dejes en estas carpetas con el nombre del juego (o con su número de Steam) se usa sola.
const fs = require('fs');
const path = require('path');
const Dupes = require('./renderer/dupes.js');

const KINDS = { banner: 'Banners', cover: 'Portadas', logo: 'Logos', icon: 'Iconos', background: 'Themes Wallpaper', collection: 'Collections Banners', trailer: 'Video - Trailers', themes: 'My Themes' };
const BACKUPS = 'Comptus Copias de seguridad';
const ROOT_NAME = 'Comptus Media';
const ALIASES = { Fondos: 'Themes Wallpaper' }; // nombres de carpeta de versiones anteriores
let customRoot = null; // carpeta elegida por el usuario («Comptus Media»); si no, <datos>/media
const setRoot = (r) => { customRoot = r || null; idxCache = null; };
const getRoot = () => customRoot;
let idxCache = null;
const IMG = /\.(png|jpe?g|webp|gif|bmp|avif)$/i;

const dirOf = (userData) => customRoot || path.join(userData, 'media');
function ensure(userData) {
  for (const sub of [...Object.values(KINDS), BACKUPS]) fs.mkdirSync(path.join(dirOf(userData), sub), { recursive: true });
  return dirOf(userData);
}
const norm = (p) => path.resolve(p).toLowerCase();
const inside = (userData, p) => norm(p).startsWith(norm(dirOf(userData)) + path.sep);
const safeName = (s) => String(s || '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '').slice(0, 80);

// «media:Portadas/Juego.png» -> ruta completa (cualquier otra cosa se devuelve igual)
function resolve(userData, v) {
  if (typeof v !== 'string' || !v.startsWith('media:')) return v;
  const parts = v.slice(6).split('/').filter(Boolean);
  if (parts[0] && ALIASES[parts[0]]) parts[0] = ALIASES[parts[0]];
  if (!parts.length || parts.some((x) => x === '..' || x === '.')) return null;
  return path.join(dirOf(userData), ...parts);
}

function sameContent(a, b) {
  try {
    const sa = fs.statSync(a), sb = fs.statSync(b);
    return sa.size === sb.size && fs.readFileSync(a).equals(fs.readFileSync(b));
  } catch { return false; }
}

// Convierte una ruta a «media:…» copiando el archivo a la carpeta si hace falta. Si no se puede, devuelve la ruta tal cual.
function toToken(userData, kind, p, gameName) {
  if (typeof p !== 'string' || !p || p.startsWith('media:') || /^https?:/i.test(p) || !path.isAbsolute(p)) return p;
  const sub = KINDS[kind];
  if (!sub) return p;
  try {
    if (inside(userData, p)) return 'media:' + path.relative(dirOf(userData), p).split(path.sep).join('/');
    if (!fs.existsSync(p) || !fs.statSync(p).isFile()) return p;
    const ext = path.extname(p).toLowerCase();
    const base = safeName(gameName) || safeName(path.basename(p, path.extname(p))) || 'imagen';
    fs.mkdirSync(path.join(dirOf(userData), sub), { recursive: true });
    for (let n = 1; n < 500; n++) {
      const name = n === 1 ? base + ext : `${base} (${n})${ext}`;
      const dest = path.join(dirOf(userData), sub, name);
      if (!fs.existsSync(dest)) { fs.copyFileSync(p, dest); return `media:${sub}/${name}`; }
      if (sameContent(dest, p)) return `media:${sub}/${name}`;
    }
  } catch { /* sin permiso o disco lleno: se deja la ruta original */ }
  return p;
}

// Índice de lo que hay en las carpetas: tipo -> Map(nombre normalizado | 'id:número' -> ruta). Se recalcula si cambian las carpetas.
function index(userData) {
  const stamp = ['banner', 'cover', 'logo', 'icon'].map((k) => { try { return fs.statSync(path.join(dirOf(userData), KINDS[k])).mtimeMs; } catch { return 0; } }).join('|') + '|' + dirOf(userData);
  if (idxCache && idxCache.stamp === stamp) return idxCache.map;
  const map = {};
  for (const k of ['banner', 'cover', 'logo', 'icon']) {
    const m = new Map();
    const folder = path.join(dirOf(userData), KINDS[k]);
    let files = [];
    try { files = fs.readdirSync(folder); } catch { /* aún no existe */ }
    for (const f of files.sort()) {
      if (!IMG.test(f)) continue;
      const base = path.basename(f, path.extname(f));
      const key = /^\d{3,}$/.test(base) ? 'id:' + base : Dupes.norm(base);
      if (key && !m.has(key)) m.set(key, path.join(folder, f));
    }
    map[k] = m;
  }
  idxCache = { stamp, map };
  return map;
}
function autoFor(idx, game, kind) {
  const m = idx[kind];
  if (!m || !m.size) return null;
  return (game.appid && m.get('id:' + game.appid)) || m.get(Dupes.norm(game.name)) || null;
}

// Copia el contenido de una carpeta de imágenes a otra (renombrando carpetas antiguas); no pisa lo que ya existe
function copyTree(from, to) {
  let n = 0;
  if (!fs.existsSync(from) || path.resolve(from).toLowerCase() === path.resolve(to).toLowerCase()) return n;
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const dst = path.join(to, ALIASES[e.name] && e.isDirectory() ? ALIASES[e.name] : e.name);
    if (e.isDirectory()) { fs.mkdirSync(dst, { recursive: true }); n += copyTree(path.join(from, e.name), dst); }
    else if (!fs.existsSync(dst)) { fs.copyFileSync(path.join(from, e.name), dst); n++; }
  }
  return n;
}
// Carpeta «Comptus Media» dentro de la ubicación elegida (si la elegida ya se llama así, se usa tal cual)
const rootIn = (parent) => (path.basename(parent).toLowerCase() === ROOT_NAME.toLowerCase() ? parent : path.join(parent, ROOT_NAME));

module.exports = { BACKUPS, ROOT_NAME, setRoot, getRoot, copyTree, rootIn, KINDS, dirOf, ensure, inside, resolve, toToken, index, autoFor, safeName };
