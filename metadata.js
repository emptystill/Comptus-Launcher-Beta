// Información de cada juego (descripción, desarrollador, fecha, géneros, capturas…)
// Fuente: la tienda de Steam. No pide cuenta ni clave de API.
//  - Juegos de Steam: se consulta directamente por su appid.
//  - Juegos de otras bibliotecas o locales: se busca por nombre en la tienda de Steam y solo se acepta
//    un resultado cuyo nombre sea casi igual (para no poner la información de otro juego).
// `getJson(url)` se inyecta (en la app usa net.fetch; en las pruebas es un simulador).

const STORE = 'https://store.steampowered.com';
const RAWG = 'https://api.rawg.io/api';

function normName(s) {
  return String(s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[™®©]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Quita «Standard Edition», «Deluxe», «Game of the Year»… que ponen las tiendas y no están en el nombre del juego
function cleanTitle(s) {
  return String(s || '')
    .replace(/[\(\[][^)\]]*(edition|bundle|pack|version)[^)\]]*[\)\]]/gi, ' ')
    .replace(/\b(standard|deluxe|ultimate|premium|digital|collector'?s?|gold|complete|definitive|game of the year|goty|anniversary|enhanced|launch|special|founder'?s?|legendary)\s+(edition|bundle|pack)\b/gi, ' ')
    .replace(/\s+[-–:]\s*(edition|standard|deluxe|ultimate|complete)\b.*$/i, '')
    .replace(/\s{2,}/g, ' ').replace(/\s*[-–:]\s*$/, '').trim();
}

function bigrams(s) {
  const t = s.replace(/ /g, '');
  const out = new Map();
  for (let i = 0; i < t.length - 1; i++) {
    const b = t.slice(i, i + 2);
    out.set(b, (out.get(b) || 0) + 1);
  }
  return out;
}
// Parecido entre dos nombres, de 0 a 1 (coeficiente de Dice sobre pares de letras)
function similarity(a, b) {
  a = normName(a); b = normName(b);
  if (!a || !b) return 0;
  if (a === b) return 1;
  // "Portal" y "Portal 2" son juegos distintos: si los números no coinciden, no es el mismo juego
  const digits = (x) => (x.match(/\d+/g) || []).join(',');
  const penalty = digits(a) === digits(b) ? 1 : 0.5;
  const A = bigrams(a), B = bigrams(b);
  let inter = 0, total = 0;
  for (const [k, v] of A) { total += v; if (B.has(k)) inter += Math.min(v, B.get(k)); }
  for (const v of B.values()) total += v;
  return total ? (penalty * 2 * inter) / total : 0;
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
    .trim();
}

// El usuario puede escribir un nombre, un número (appid) o pegar el enlace de la tienda
function parseTerm(term) {
  const t = String(term || '').trim();
  const rawg = t.match(/^rawg:(\d+)$/i);
  if (rawg) return { rawgId: rawg[1] };
  // Enlace de RAWG (rawg.io/games/<nombre-del-juego>): la API acepta ese identificador tal cual
  const rawgUrl = t.match(/rawg\.io\/games\/([\w-]+)/i);
  if (rawgUrl) return { rawgId: rawgUrl[1] };
  const url = t.match(/store\.steampowered\.com\/app\/(\d+)/i);
  if (url) return { appid: url[1] };
  if (/^\d{2,8}$/.test(t)) return { appid: t };
  // Cualquier otro enlace no es un nombre: no se busca (daría un resultado al azar)
  if (/^https?:\/\//i.test(t)) return { badUrl: true };
  return { name: t };
}

function pickMatch(name, items, min = 0.85) {
  let best = null, bestScore = 0;
  for (const it of items || []) {
    const s = similarity(name, it.name);
    if (s > bestScore) { best = it; bestScore = s; }
  }
  return best && bestScore >= min ? best : null;
}

async function searchSteam(term, getJson) {
  const url = `${STORE}/api/storesearch/?term=${encodeURIComponent(term)}&l=spanish&cc=US`;
  const data = await getJson(url);
  return ((data && data.items) || []).filter((i) => i && i.id && i.name).map((i) => ({ id: String(i.id), name: i.name }));
}

// Solo se aceptan vídeos servidos por la CDN de Steam (https)
const steamUrl = (u) => {
  const v = String(u || '').replace(/^http:\/\//, 'https://');
  return /^https:\/\/[\w.-]+\.steamstatic\.com\//.test(v) ? v : '';
};
// Tráilers de la tienda. Steam los entrega como flujos HLS; los formatos mp4/webm, si aparecen, se prefieren
function steamMovies(list) {
  return (list || []).slice(0, 6).map((m) => {
    const mp4 = m.mp4 && (m.mp4.max || m.mp4['480']);
    const webm = m.webm && (m.webm.max || m.webm['480']);
    return { id: String(m.id || ''), name: String(m.name || '').slice(0, 120), thumb: steamUrl(m.thumbnail), mp4: steamUrl(mp4), webm: steamUrl(webm), hls: steamUrl(m.hls_h264) };
  }).filter((m) => m.mp4 || m.webm || m.hls);
}

async function steamDetails(appid, getJson) {
  const data = await getJson(`${STORE}/api/appdetails?appids=${encodeURIComponent(appid)}&l=spanish`);
  const entry = data && data[appid];
  if (!entry || !entry.success || !entry.data) return null;
  const d = entry.data;
  const description = stripHtml(d.short_description) || stripHtml(d.about_the_game).slice(0, 600);
  const cdn = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}`;
  const header = d.header_image || `${cdn}/header.jpg`;
  return {
    appid: String(appid),
    // Imágenes por defecto para juegos que no tienen portada o banner propios (las mismas que usa la biblioteca de Steam)
    images: { cover: `${cdn}/library_600x900.jpg`, coverFallback: header, banner: `${cdn}/library_hero.jpg`, bannerFallback: header, logo: `${cdn}/library_logo.png`, logoFallback: `${cdn}/logo.png` },
    title: d.name || '',
    description,
    developers: (d.developers || []).filter(Boolean),
    publishers: (d.publishers || []).filter(Boolean),
    releaseDate: d.release_date && d.release_date.date ? d.release_date.date : '',
    genres: (d.genres || []).map((g) => g.description).filter(Boolean),
    screenshots: (d.screenshots || []).slice(0, 8).map((s) => ({ thumb: s.path_thumbnail, full: s.path_full })).filter((s) => s.thumb && s.full),
    movies: steamMovies(d.movies),
    website: d.website || '',
    metacritic: d.metacritic && d.metacritic.score ? d.metacritic.score : null,
    storeUrl: `${STORE}/app/${appid}`,
    fetchedAt: Date.now(),
  };
}


// RAWG devuelve los géneros en inglés: estos son los suyos con su nombre en español
const GENRES_ES = {
  Action: 'Acción', Adventure: 'Aventura', 'Role-playing (RPG)': 'Rol (RPG)', RPG: 'Rol (RPG)', Shooter: 'Disparos', Strategy: 'Estrategia',
  Puzzle: 'Puzles', Racing: 'Carreras', Sports: 'Deportes', Simulation: 'Simulación', Platformer: 'Plataformas', Fighting: 'Lucha',
  Family: 'Familiar', Arcade: 'Arcade', Casual: 'Casual', Indie: 'Indie', 'Massively Multiplayer': 'Multijugador masivo',
  'Board Games': 'Juegos de mesa', Educational: 'Educativo', Card: 'Cartas',
};

// ---------- RAWG (opcional: necesita una clave gratuita del propio usuario) ----------
async function searchRawg(term, key, getJson) {
  const data = await getJson(`${RAWG}/games?key=${encodeURIComponent(key)}&search=${encodeURIComponent(term)}&page_size=6`);
  return ((data && data.results) || []).filter((i) => i && i.id && i.name).map((i) => ({ id: String(i.id), name: i.name }));
}

async function rawgDetails(id, key, getJson) {
  const d = await getJson(`${RAWG}/games/${encodeURIComponent(id)}?key=${encodeURIComponent(key)}`);
  if (!d || !d.id) return null;
  let screenshots = [];
  try { // las capturas son un extra: si falla, no se pierde el resto
    const sh = await getJson(`${RAWG}/games/${encodeURIComponent(id)}/screenshots?key=${encodeURIComponent(key)}`);
    screenshots = ((sh && sh.results) || []).slice(0, 8).map((s) => ({ thumb: s.image, full: s.image })).filter((s) => s.thumb);
  } catch { /* sin capturas */ }
  return {
    source: 'rawg',
    rawgId: String(d.id),
    title: d.name || '',
    description: stripHtml(d.description_raw || d.description).slice(0, 1500),
    developers: (d.developers || []).map((x) => x.name).filter(Boolean),
    publishers: (d.publishers || []).map((x) => x.name).filter(Boolean),
    releaseDate: d.released || '',
    genres: (d.genres || []).map((g) => GENRES_ES[g.name] || g.name).filter(Boolean),
    lang: 'en', // la descripción viene en inglés (se puede traducir)
    // RAWG solo tiene imágenes horizontales: sirven de banner y, recortadas, de portada
    images: /^https:\/\//.test(d.background_image || '')
      ? { cover: d.background_image, banner: d.background_image, ...(/^https:\/\//.test(d.background_image_additional || '') ? { bannerFallback: d.background_image_additional } : {}) }
      : null,
    screenshots,
    website: d.website || '',
    metacritic: d.metacritic || null,
    storeUrl: d.slug ? `https://rawg.io/games/${d.slug}` : '',
    fetchedAt: Date.now(),
  };
}

// Devuelve { info } si encontró algo, o { error } con un motivo legible.
async function fetchInfo(game, { getJson, term, rawgKey } = {}) {
  const key = String(rawgKey || '').trim();
  try {
    const manual = term && String(term).trim();
    const p = manual ? parseTerm(term) : null;
    if (p && p.badUrl) return { error: 'Ese enlace no se reconoce. Usa uno de la tienda de Steam o de rawg.io/games/…, o escribe el nombre del juego.' };

    if (p && p.rawgId) {
      if (!key) return { error: 'Para usar RAWG necesitas tu clave (Configuración > Información).' };
      const info = await rawgDetails(p.rawgId, key, getJson);
      return info ? { info } : { error: 'RAWG no tiene información de ese juego.' };
    }
    if (p && p.appid) {
      const info = await steamDetails(p.appid, getJson);
      return info ? { info: { source: 'steam', ...info } } : { error: 'La tienda de Steam no tiene información de ese juego.' };
    }
    if (!p && game.source === 'steam' && game.appid) {
      const info = await steamDetails(game.appid, getJson);
      return info ? { info: { source: 'steam', ...info } } : { error: 'La tienda de Steam no tiene información de ese juego.' };
    }

    // Por nombre: primero Steam; si no hay coincidencia y hay clave, RAWG.
    // Automático = coincidencia muy clara; búsqueda manual = más permisiva (tú decides el nombre).
    const name = p ? p.name : game.name;
    const min = p ? 0.6 : 0.85;
    const names = [...new Set([name, cleanTitle(name)].filter(Boolean))];
    for (const n of names) {
      const steamHit = pickMatch(n, await searchSteam(n, getJson), min) || null;
      if (steamHit) {
        const info = await steamDetails(steamHit.id, getJson);
        if (info) return { info: { source: 'steam', ...info } };
      }
    }
    if (key) {
      for (const n of names) {
        const items = await searchRawg(n, key, getJson);
        const hit = pickMatch(n, items, min) || (p ? items[0] : null);
        if (hit) {
          const info = await rawgDetails(hit.id, key, getJson);
          if (info) return { info };
        }
      }
    }
    // Juegos de Epic que no están en Steam ni en RAWG: se usan los datos de la propia tienda de Epic
    if (!p && game.epicInfo && game.epicInfo.description) {
      const e = game.epicInfo;
      return { info: { source: 'epic', title: game.name, lang: 'en', description: e.description, developers: e.developer ? [e.developer] : [], publishers: [], genres: [], screenshots: [], movies: [], website: '', metacritic: null, storeUrl: '', fetchedAt: Date.now() } };
    }
    return { error: p
      ? `No se encontró «${name}».${key ? '' : ' Para juegos que no están en Steam puedes agregar una clave de RAWG en Configuración > Información.'}`
      : `No se encontró una coincidencia clara.${key ? '' : ' Prueba a buscarlo con otro nombre o agrega una clave de RAWG en Configuración > Información.'}` };
  } catch (e) {
    return { error: 'No se pudo conectar para descargar la información. Revisa tu conexión (y la clave de RAWG, si la usas).' };
  }
}

// Campos que el usuario puede escribir a mano (se guardan aparte y mandan sobre lo descargado)
const EDITABLE = {
  description: 'string', releaseDate: 'string',
  developers: 'list', publishers: 'list', genres: 'list',
};
function cleanEdit(patch) {
  const out = {};
  for (const [k, type] of Object.entries(EDITABLE)) {
    if (!(k in (patch || {}))) continue;
    let v = patch[k];
    if (type === 'list') v = (Array.isArray(v) ? v : String(v || '').split(',')).map((x) => String(x).trim()).filter(Boolean).slice(0, 12);
    else v = String(v || '').trim().slice(0, 4000);
    if (type === 'list' ? v.length : v) out[k] = v;
  }
  return out;
}

module.exports = { cleanTitle, fetchInfo, cleanEdit, normName, similarity, stripHtml, parseTerm, pickMatch };
