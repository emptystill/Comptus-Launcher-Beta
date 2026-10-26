// Logros de Steam (API oficial). Necesita la clave gratuita del usuario (steamcommunity.com/dev/apikey)
// y que el perfil tenga los «Detalles del juego» en público.
//   1) Esquema del juego: nombre, descripción e iconos de cada logro.
//   2) Logros del jugador: cuáles tiene y cuándo los desbloqueó.
//   3) Porcentaje global (no pide clave): sirve para destacar los raros.
// `getJson(url)` se inyecta; si falla con un código HTTP, el error trae `.status`.

const API = 'https://api.steampowered.com';
const ID64_BASE = 76561197960265728n;

// Convierte el número de carpeta de userdata (32 bits) al SteamID de 64 bits
function toSteamId64(accountId) {
  try { return String(BigInt(accountId) + ID64_BASE); } catch { return null; }
}

// SteamID del usuario: el último que inició sesión (loginusers.vdf) o, si no se puede leer,
// la carpeta de userdata más reciente. `readFile`/`listDir` se pueden inyectar para probar.
function detectSteamId(steamPath, { parseVdf, getCI, fs, path }) {
  try {
    const vdf = parseVdf(fs.readFileSync(path.join(steamPath, 'config', 'loginusers.vdf'), 'utf8'));
    const users = getCI(vdf, 'users') || {};
    const ids = Object.keys(users).filter((k) => /^\d{17}$/.test(k));
    const recent = ids.find((k) => String(getCI(users[k], 'MostRecent')) === '1');
    if (recent || ids.length) return recent || ids[0];
  } catch { /* se prueba con userdata */ }
  try {
    const dirs = fs.readdirSync(path.join(steamPath, 'userdata')).filter((d) => /^\d+$/.test(d) && d !== '0');
    if (dirs.length) return toSteamId64(dirs[0]);
  } catch { /* sin datos */ }
  return null;
}

function pct(v) { const n = parseFloat(v); return Number.isFinite(n) ? Math.round(n * 10) / 10 : null; }
const httpsOnly = (u) => (/^https:\/\//.test(u || '') ? u : '');

// Devuelve { data } o { error, code }. code: 'nokey' | 'badkey' | 'private' | 'none' | 'net'
async function fetchAchievements({ appid, steamId, key, getJson, lang = 'spanish' }) {
  key = String(key || '').trim();
  if (!key) return { code: 'nokey', error: 'Falta tu clave de Steam Web API (Configuración > Steam).' };
  if (!/^\d{17}$/.test(String(steamId || ''))) return { code: 'nosteamid', error: 'No se encontró tu SteamID. Escríbelo en Configuración > Steam.' };
  const q = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  try {
    let schema;
    try {
      schema = await getJson(`${API}/ISteamUserStats/GetSchemaForGame/v2/?${q({ key, appid, l: lang })}`);
    } catch (e) {
      if (e && (e.status === 403 || e.status === 401)) return { code: 'badkey', error: 'Steam rechazó la clave. Revísala en Configuración > Steam.' };
      throw e;
    }
    const defs = (schema && schema.game && schema.game.availableGameStats && schema.game.availableGameStats.achievements) || [];
    if (!defs.length) return { code: 'none', error: 'Este juego no tiene logros.' };

    let player;
    try {
      player = await getJson(`${API}/ISteamUserStats/GetPlayerAchievements/v1/?${q({ key, steamid: steamId, appid, l: lang })}`);
    } catch (e) {
      if (e && e.status === 403) return { code: 'private', error: 'Tu perfil de Steam no es público. En Steam: Perfil > Editar perfil > Privacidad > «Detalles del juego» en público.' };
      if (e && e.status === 400) return { code: 'none', error: 'Steam no tiene logros de este juego para tu cuenta.' };
      throw e;
    }
    const ps = player && player.playerstats;
    if (!ps || ps.success === false) {
      const msg = String((ps && ps.error) || '');
      if (/not public|private/i.test(msg)) return { code: 'private', error: 'Tu perfil de Steam no es público. En Steam: Perfil > Editar perfil > Privacidad > «Detalles del juego» en público.' };
      return { code: 'none', error: msg || 'Steam no devolvió logros para este juego.' };
    }
    const mine = new Map((ps.achievements || []).map((a) => [a.apiname, a]));

    const percents = new Map();
    try { // extra: si falla se muestran igual sin el porcentaje
      const g = await getJson(`${API}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?${q({ gameid: appid })}`);
      for (const a of (g && g.achievementpercentages && g.achievementpercentages.achievements) || []) percents.set(a.name, pct(a.percent));
    } catch { /* sin porcentajes */ }

    const list = defs.map((d) => {
      const m = mine.get(d.name) || {};
      const achieved = !!m.achieved;
      return {
        id: d.name,
        name: d.displayName || d.name,
        description: d.description || '',
        hidden: !!d.hidden,
        icon: httpsOnly(d.icon),
        iconGray: httpsOnly(d.icongray) || httpsOnly(d.icon),
        achieved,
        unlockTime: achieved && m.unlocktime ? m.unlocktime * 1000 : 0,
        percent: percents.has(d.name) ? percents.get(d.name) : null,
      };
    });
    return { data: { appid: String(appid), total: list.length, unlocked: list.filter((a) => a.achieved).length, list, fetchedAt: Date.now() } };
  } catch (e) {
    return { code: 'net', error: 'No se pudo conectar con Steam. Revisa tu conexión.' };
  }
}

module.exports = { fetchAchievements, detectSteamId, toSteamId64 };
