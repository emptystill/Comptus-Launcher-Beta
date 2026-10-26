// Juegos que tienes en tus cuentas aunque no estén instalados.
// Steam: API oficial GetOwnedGames (misma clave y SteamID que los logros; el perfil debe tener
// los «Detalles del juego» en público). `getJson(url)` se inyecta; si falla con HTTP trae `.status`.

const API = 'https://api.steampowered.com';
const CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps';

// Cosas que Steam lista como «aplicaciones» pero no son juegos que quieras ver
const NOT_GAMES = [/^Steamworks/i, /^Proton\b/i, /^Steam Linux Runtime/i, /Dedicated Server/i, /\bSDK\b/i, /Soundtrack/i, /\bOST\b/i, /Authoring Tools/i, /\bBenchmark Tool\b/i];
const IGNORED_IDS = new Set(['228980']);

// Devuelve { games: [{appid, name, playTime (min), lastPlayed (ms)}] } o { error, code }
async function fetchOwnedSteam({ steamId, key, getJson }) {
  key = String(key || '').trim();
  if (!key) return { code: 'nokey', error: 'Falta tu clave de Steam Web API (Configuración > Steam).' };
  if (!/^\d{17}$/.test(String(steamId || ''))) return { code: 'nosteamid', error: 'No se encontró tu SteamID. Escríbelo en Configuración > Steam.' };
  try {
    const url = `${API}/IPlayerService/GetOwnedGames/v1/?key=${encodeURIComponent(key)}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&format=json`;
    let data;
    try { data = await getJson(url); } catch (e) {
      if (e && (e.status === 401 || e.status === 403)) return { code: 'badkey', error: 'Steam rechazó la clave. Revísala en Configuración > Steam.' };
      throw e;
    }
    const r = data && data.response;
    // con el perfil privado Steam responde vacío (sin «games»)
    if (!r || (!Array.isArray(r.games) && !r.game_count)) {
      return { code: 'private', error: 'Steam no devolvió juegos. Pon «Detalles del juego» en público (Perfil > Editar perfil > Privacidad) o revisa tu SteamID.' };
    }
    const games = (r.games || [])
      .filter((g) => g && g.appid && g.name && !IGNORED_IDS.has(String(g.appid)) && !NOT_GAMES.some((re) => re.test(g.name)))
      .map((g) => ({
        appid: String(g.appid),
        name: g.name,
        playTime: g.playtime_forever || 0,
        lastPlayed: g.rtime_last_played ? g.rtime_last_played * 1000 : 0,
      }));
    return { games };
  } catch {
    return { code: 'net', error: 'No se pudo conectar con Steam. Revisa tu conexión.' };
  }
}

// Convierte la lista guardada en juegos para la biblioteca, sin repetir los que ya están instalados
function steamOwnedToGames(list, installedIds) {
  const out = [];
  for (const o of list || []) {
    const id = `steam:${o.appid}`;
    if (installedIds.has(id)) continue;
    out.push({
      id,
      source: 'steam',
      name: o.name,
      appid: o.appid,
      installed: false,
      installUri: `steam://install/${o.appid}`,
      cover: `${CDN}/${o.appid}/library_600x900.jpg`,
      coverFallback: `${CDN}/${o.appid}/header.jpg`,
      banner: `${CDN}/${o.appid}/library_hero.jpg`,
      bannerFallback: `${CDN}/${o.appid}/header.jpg`,
      ...(o.playTime ? { playTime: o.playTime } : {}),
      ...(o.lastPlayed ? { lastPlayed: o.lastPlayed } : {}),
    });
  }
  return out;
}

module.exports = { fetchOwnedSteam, steamOwnedToGames };
