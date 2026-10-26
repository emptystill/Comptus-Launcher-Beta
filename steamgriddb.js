// SteamGridDB (steamgriddb.com): portadas, banners (heroes), logos e iconos hechos por la comunidad.
// API v2 con clave gratuita (se saca en su web: Preferences > API). `getJson(url, headers)` se inyecta.
const Dupes = require('./renderer/dupes.js');
const BASE = 'https://www.steamgriddb.com/api/v2';

// Qué pedir para cada tipo de imagen de Comptus
const KINDS = {
  cover: { path: 'grids', query: 'dimensions=600x900,342x482,660x930&types=static&nsfw=false&humor=false&epilepsy=false', retryOpen: false },
  banner: { path: 'heroes', query: 'dimensions=1920x620,3840x1240,1600x650&types=static&nsfw=false&humor=false&epilepsy=false', retryOpen: true },
  logo: { path: 'logos', query: 'types=static&nsfw=false&humor=false&epilepsy=false', retryOpen: false },
  icon: { path: 'icons', query: 'types=static&nsfw=false&humor=false&epilepsy=false', retryOpen: false },
};
const auth = (key) => ({ Authorization: `Bearer ${key}` });
const dataOf = (j) => (j && j.success && Array.isArray(j.data) ? j.data : []);

// Juego de SteamGridDB: por número de Steam si lo hay; si no, por nombre (solo si coincide exactamente, para no poner imágenes de otro juego)
async function findGame({ name, appid, key, getJson }) {
  if (appid && /^\d+$/.test(String(appid))) {
    try { const j = await getJson(`${BASE}/games/steam/${appid}`, auth(key)); if (j && j.success && j.data && j.data.id) return { id: j.data.id, name: j.data.name }; } catch (e) { if (e && (e.status === 401 || e.status === 403)) throw e; }
  }
  if (!name) return null;
  const j = await getJson(`${BASE}/search/autocomplete/${encodeURIComponent(name)}`, auth(key));
  const list = dataOf(j);
  const want = Dupes.norm(name);
  const hit = list.find((x) => Dupes.norm(x.name) === want) || null;
  return hit ? { id: hit.id, name: hit.name } : null;
}

// La mejor imagen de ese tipo (la más valorada por la comunidad)
function best(list) {
  const ok = list.filter((x) => x && typeof x.url === 'string' && /^https:\/\//.test(x.url) && !x.nsfw && !x.humor);
  ok.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
  return ok[0] || null;
}
async function findImage({ gameId, kind, key, getJson }) {
  const k = KINDS[kind]; if (!k) return null;
  let list = dataOf(await getJson(`${BASE}/${k.path}/game/${gameId}?${k.query}`, auth(key)));
  if (!list.length && k.retryOpen) list = dataOf(await getJson(`${BASE}/${k.path}/game/${gameId}?types=static&nsfw=false&humor=false`, auth(key)));
  return best(list);
}
async function testKey({ key, getJson }) {
  if (!key) return { ok: false, error: 'Escribe tu clave de SteamGridDB.' };
  try { const j = await getJson(`${BASE}/search/autocomplete/portal`, auth(key)); return j && j.success ? { ok: true } : { ok: false, error: 'SteamGridDB no aceptó la clave.' }; }
  catch (e) { return e && (e.status === 401 || e.status === 403) ? { ok: false, error: 'SteamGridDB rechazó la clave. Compruébala en tu perfil de steamgriddb.com (Preferences > API).' } : { ok: false, error: 'No se pudo conectar con SteamGridDB.' }; }
}
const extOf = (url, type) => {
  const t = String(type || '').toLowerCase();
  if (t.includes('png')) return '.png'; if (t.includes('webp')) return '.webp'; if (t.includes('jpeg') || t.includes('jpg')) return '.jpg'; if (t.includes('gif')) return '.gif'; if (t.includes('icon')) return '.ico';
  const m = /\.(png|jpe?g|webp|gif|ico)(\?|$)/i.exec(String(url)); return m ? '.' + m[1].toLowerCase().replace('jpeg', 'jpg') : '.png';
};

// Qué le falta a cada juego (según lo ya resuelto en la biblioteca) y no se intentó hace poco
function pending(games, kinds, tried, now, retryMs, replace) {
  const rep = new Set(replace || []);
  const out = [];
  for (const g of games) {
    if (!g || !g.name) continue;
    for (const kind of kinds) {
      // «automática» = viene de la tienda (una dirección web); lo que eligió el usuario o ya está en su carpeta es una ruta de archivo y no se toca
      if (g[kind] && !(rep.has(kind) && /^https?:\/\//i.test(String(g[kind])))) continue;
      if (kind === 'logo' && g.logoOff) continue;
      const t = tried && tried[`${g.id}|${kind}`];
      if (t && now - t < retryMs) continue;
      out.push({ game: g, kind });
    }
  }
  return out;
}

module.exports = { findGame, findImage, testKey, best, extOf, pending, KINDS };
