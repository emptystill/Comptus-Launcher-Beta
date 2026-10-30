// Amigos de Steam (API oficial). Necesita la clave del usuario y que su lista de amigos sea pública.
//   1) ISteamUser/GetFriendList → SteamIDs de los amigos.
//   2) ISteamUser/GetPlayerSummaries (de 100 en 100) → nombre, avatar, estado y juego actual.
// `getJson(url)` se inyecta; los errores HTTP traen `.status`.

const API = 'https://api.steampowered.com';

// Orden: jugando > en línea > ausente/ocupado > desconectado (por última conexión)
function rank(f) { return f.game ? 0 : f.state > 0 ? 1 : 2; }

async function fetchFriends({ steamId, key, getJson }) {
  if (!steamId) return { ok: false, code: 'nosteam', error: 'No se encontró tu SteamID.' };
  if (!String(key || '').trim()) return { ok: false, code: 'nokey', error: 'Falta la clave de la API de Steam (Ajustes).' };
  let ids; const since = {};
  try {
    const r = await getJson(`${API}/ISteamUser/GetFriendList/v1/?key=${encodeURIComponent(key)}&steamid=${steamId}&relationship=friend`);
    const fl = (r && r.friendslist && r.friendslist.friends) || []; ids = fl.map((f) => f.steamid); for (const f of fl) since[f.steamid] = Number(f.friend_since) || 0;
  } catch (e) {
    if (e && (e.status === 401 || e.status === 403)) return { ok: false, code: 'private', error: 'Tu lista de amigos de Steam es privada o la clave no es válida.' };
    return { ok: false, code: 'net', error: 'No se pudo consultar a Steam.' };
  }
  if (!ids.length) return { ok: true, friends: [], updated: Date.now() };
  const friends = [];
  for (let i = 0; i < ids.length; i += 100) {
    try {
      const r = await getJson(`${API}/ISteamUser/GetPlayerSummaries/v2/?key=${encodeURIComponent(key)}&steamids=${ids.slice(i, i + 100).join(',')}`);
      for (const p of (r && r.response && r.response.players) || []) {
        friends.push({
          id: p.steamid,
          name: p.personaname || p.steamid,
          avatar: p.avatarfull || p.avatarmedium || p.avatar || '',
          state: Number(p.personastate) || 0, // 0 desconectado · 1 en línea · 2 ocupado · 3 ausente · 4 dormido · 5/6 buscando
          game: p.gameextrainfo || '',
          appid: p.gameid ? Number(p.gameid) : 0,
          lastOff: Number(p.lastlogoff) || 0,
          url: p.profileurl || '',
          since: since[p.steamid] || 0,
        });
      }
    } catch { /* un lote fallido no tira el resto */ }
  }
  friends.sort((a, b) => rank(a) - rank(b) || (b.lastOff - a.lastOff) || a.name.localeCompare(b.name));
  return { ok: true, friends, updated: Date.now() };
}


// Ficha de un amigo: nivel de Steam y juegos de las últimas 2 semanas (solo si su perfil/detalles de juego son públicos)
async function fetchFriendDetail({ id, key, getJson }) {
  const k = encodeURIComponent(key); const out = { ok: true, level: null, recent: [], recentOk: false };
  try { const r = await getJson(`${API}/IPlayerService/GetSteamLevel/v1/?key=${k}&steamid=${id}`); if (r && r.response && r.response.player_level != null) out.level = Number(r.response.player_level); } catch { /* privado */ }
  try {
    const r = await getJson(`${API}/IPlayerService/GetRecentlyPlayedGames/v1/?key=${k}&steamid=${id}&count=6`);
    if (r && r.response && Array.isArray(r.response.games)) { out.recentOk = true; out.recent = r.response.games.map((g) => ({ appid: g.appid, name: g.name || String(g.appid), min2w: g.playtime_2weeks || 0, total: g.playtime_forever || 0 })); }
  } catch { /* privado */ }
  return out;
}

// Amigos que tienen un juego (y cuánto lo han jugado). Una consulta por amigo, de 6 en 6; los perfiles con detalles de juego privados se omiten.
async function fetchOwners({ appid, friends, key, getJson }) {
  const k = encodeURIComponent(key), list = (friends || []).slice(0, 200), res = []; let hidden = 0, i = 0;
  async function worker() {
    while (i < list.length) {
      const f = list[i++];
      try {
        const inp = encodeURIComponent(JSON.stringify({ steamid: f.id, appids_filter: [Number(appid)], include_played_free_games: true, include_appinfo: false }));
        const r = await getJson(`${API}/IPlayerService/GetOwnedGames/v1/?key=${k}&input_json=${inp}`);
        const rp = r && r.response; if (!rp || rp.game_count == null) { hidden++; continue; }
        const g = (rp.games || [])[0]; if (g) res.push({ id: f.id, minutes: g.playtime_forever || 0, last: g.rtime_last_played || 0 });
      } catch { hidden++; }
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  return { ok: true, owners: res, hidden };
}

module.exports = { fetchFriends, fetchFriendDetail, fetchOwners };
