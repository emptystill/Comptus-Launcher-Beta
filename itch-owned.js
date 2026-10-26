// Juegos de itch.io que tienes en tu cuenta (comprados o reclamados) aunque no estén instalados.
// API oficial de itch.io: GET https://api.itch.io/profile/owned-keys con tu clave personal (itch.io > Settings > API keys).
// `request(url, {headers})` se inyecta y devuelve { status, json }.

const OWNED = 'https://api.itch.io/profile/owned-keys';
const MAX_PAGES = 40;

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Devuelve { games: [{id, name, url, cover}] } o { code, error }
async function fetchOwnedItch({ key, request }) {
  key = String(key || '').trim();
  if (!key) return { code: 'nokey', error: 'Falta tu clave de itch.io (Configuración > itch.io).' };
  const games = [], seen = new Set();
  for (let page = 1; page <= MAX_PAGES; page++) {
    let r;
    try { r = await request(`${OWNED}?page=${page}`, { headers: { Authorization: `Bearer ${key}` } }); }
    catch { return { code: 'net', error: 'No se pudo conectar con itch.io. Revisa tu conexión.' }; }
    if (r.status === 401 || r.status === 403) return { code: 'badkey', error: 'itch.io rechazó la clave. Revísala en Configuración > itch.io.' };
    if (r.status < 200 || r.status >= 300 || !r.json) return { code: 'net', error: `itch.io respondió con un error (${r.status}). Inténtalo más tarde.` };
    const keys = Array.isArray(r.json.owned_keys) ? r.json.owned_keys : [];
    for (const k of keys) {
      const g = k && k.game;
      if (!g || !g.id || !g.title || seen.has(g.id)) continue;
      if (g.classification && g.classification !== 'game') continue; // herramientas, bandas sonoras, libros…
      if (Array.isArray(g.traits) && g.traits.length && !g.traits.some((t) => /^p_(windows|web)$/.test(t))) continue; // solo Windows (o web)
      seen.add(g.id);
      games.push({ id: String(g.id), name: String(g.title).trim(), url: g.url || '', cover: g.cover_url || g.still_cover_url || '' });
    }
    const per = Number(r.json.per_page) || 0;
    if (!keys.length || (per && keys.length < per)) break;
  }
  return { games };
}

// Lista guardada -> juegos de la biblioteca, sin repetir los instalados (se comparan por nombre)
function itchOwnedToGames(list, installedNames) {
  const out = [];
  for (const o of list || []) {
    if (installedNames && installedNames.has(slug(o.name))) continue;
    out.push({
      id: `itch:game:${o.id}`,
      source: 'itch',
      name: o.name,
      installed: false,
      installUri: o.url || `https://itch.io/`,
      ...(o.cover ? { cover: o.cover } : {}),
    });
  }
  return out;
}

module.exports = { fetchOwnedItch, itchOwnedToGames, slug };
