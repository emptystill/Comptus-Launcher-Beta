// Cuenta de Xbox: juegos de PC de tu historial de Xbox / Microsoft Store / Game Pass (aunque no estén instalados)
// y sus logros. Usa el inicio de sesión de Microsoft por «código de dispositivo» (sin registrar ninguna aplicación):
// tu contraseña nunca pasa por el lanzador y solo se guarda un permiso renovable.
// Flujo: Microsoft (OAuth) -> Xbox Live (XBL) -> XSTS -> servicios titlehub / achievements.
// `request(url, {method, headers, body})` se inyecta y devuelve { status, json }.

// Inicio de sesión de «Live Connect» (login.live.com), el mismo que usan la app de Xbox y otros programas de
// terceros: no hace falta registrar nada en Azure. Se prueban estos identificadores en orden.
const LIVE_DEVICE = 'https://login.live.com/oauth20_connect.srf';
const LIVE_TOKEN = 'https://login.live.com/oauth20_token.srf';
const CLIENT_IDS = ['000000004c12ae6f', '00000000402b5328']; // app de Xbox · lanzador de Minecraft
const SCOPE = 'service::user.auth.xboxlive.com::MBI_SSL';
const XBL_URL = 'https://user.auth.xboxlive.com/user/authenticate';
const XSTS_URL = 'https://xsts.auth.xboxlive.com/xsts/authorize';
const TITLEHUB = 'https://titlehub.xboxlive.com';
const ACHIEVEMENTS = 'https://achievements.xboxlive.com';

const form = (o) => Object.entries(o).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
const FORM = { 'Content-Type': 'application/x-www-form-urlencoded' };
const JSONH = { 'Content-Type': 'application/json', Accept: 'application/json' };

// 1) Pide un código para que el usuario lo escriba en microsoft.com/link
async function startDeviceCode({ request, clientIds = CLIENT_IDS }) {
  let last = null;
  for (const clientId of clientIds) {
    let r;
    try { r = await request(LIVE_DEVICE, { method: 'POST', headers: FORM, body: form({ client_id: clientId, scope: SCOPE, response_type: 'device_code' }) }); }
    catch { return { code: 'net', error: 'No se pudo conectar con Microsoft. Revisa tu conexión.' }; }
    if (r.status === 200 && r.json && r.json.device_code) {
      return { ok: true, clientId, deviceCode: r.json.device_code, userCode: r.json.user_code, verificationUri: r.json.verification_uri || 'https://www.microsoft.com/link',
        interval: Number(r.json.interval) || 5, expiresIn: Number(r.json.expires_in) || 900 };
    }
    last = r;
  }
  const d = last && last.json && (last.json.error_description || last.json.error) || '';
  return { code: 'client', error: `Microsoft no aceptó iniciar sesión desde Comptus (${last ? last.status : '?'}). ${String(d).split('\r')[0]}`.trim() };
}

function msAuth(j) {
  return { refreshToken: j.refresh_token, accessToken: j.access_token, accessExpires: Date.now() + (Number(j.expires_in) || 0) * 1000 };
}

// 2) Se consulta hasta que el usuario acepta. Devuelve { pending } | { auth } | { code, error }
async function pollDeviceCode({ clientId, deviceCode, request }) {
  let r;
  try { r = await request(LIVE_TOKEN, { method: 'POST', headers: FORM, body: form({ grant_type: 'urn:ietf:params:oauth:grant-type:device_code', client_id: clientId, device_code: deviceCode }) }); }
  catch { return { code: 'net', error: 'No se pudo conectar con Microsoft.' }; }
  if (r.status === 200 && r.json && r.json.access_token) return { auth: msAuth(r.json) };
  const e = r.json && r.json.error;
  if (e === 'authorization_pending') return { pending: true };
  if (e === 'slow_down') return { pending: true, slower: true };
  if (e === 'expired_token' || e === 'code_expired') return { code: 'expired', error: 'El código caducó. Vuelve a pulsar «Iniciar sesión».' };
  if (e === 'authorization_declined' || e === 'access_denied') return { code: 'denied', error: 'Se canceló el inicio de sesión.' };
  return { code: 'net', error: `Microsoft respondió con un error (${r.status}${e ? ': ' + e : ''}).` };
}

async function refreshMs({ clientId, refreshToken, request }) {
  let r;
  try { r = await request(LIVE_TOKEN, { method: 'POST', headers: FORM, body: form({ grant_type: 'refresh_token', client_id: clientId || CLIENT_IDS[0], refresh_token: refreshToken, scope: SCOPE }) }); }
  catch { return { code: 'net', error: 'No se pudo conectar con Microsoft. Revisa tu conexión.' }; }
  if (r.status === 200 && r.json && r.json.access_token) {
    const a = msAuth(r.json);
    if (!a.refreshToken) a.refreshToken = refreshToken;
    return { auth: a };
  }
  if (r.status === 400 || r.status === 401) return { code: 'expired', error: 'Tu sesión de Xbox caducó. Vuelve a iniciar sesión en Configuración > Xbox.' };
  return { code: 'net', error: `Microsoft respondió con un error (${r.status}). Inténtalo más tarde.` };
}

// 3) Del acceso de Microsoft al token de Xbox Live. Devuelve { session } con la cabecera lista
async function xboxSession({ msAccessToken, request }) {
  // Según el tipo de inicio de sesión, Xbox espera el token con «t=», sin prefijo o con «d=»: se prueban en orden
  const tok = String(msAccessToken || '');
  const tickets = /^[td]=/.test(tok) ? [tok] : [`t=${tok}`, tok, `d=${tok}`];
  let r;
  for (const ticket of tickets) {
    try {
      r = await request(XBL_URL, { method: 'POST', headers: { ...JSONH, 'x-xbl-contract-version': '1' },
        body: JSON.stringify({ Properties: { AuthMethod: 'RPS', SiteName: 'user.auth.xboxlive.com', RpsTicket: ticket }, RelyingParty: 'http://auth.xboxlive.com', TokenType: 'JWT' }) });
    } catch { return { code: 'net', error: 'No se pudo conectar con Xbox Live.' }; }
    if (r.status === 200 && r.json && r.json.Token) break;
  }
  if (!(r.status === 200 && r.json && r.json.Token)) return { code: 'xbl', error: `Xbox Live rechazó el inicio de sesión (${r.status}).` };
  let s;
  try {
    s = await request(XSTS_URL, { method: 'POST', headers: { ...JSONH, 'x-xbl-contract-version': '1' },
      body: JSON.stringify({ Properties: { UserTokens: [r.json.Token], SandboxId: 'RETAIL' }, RelyingParty: 'http://xboxlive.com', TokenType: 'JWT' }) });
  } catch { return { code: 'net', error: 'No se pudo conectar con Xbox Live.' }; }
  if (s.status === 401 && s.json && s.json.XErr) {
    const x = Number(s.json.XErr);
    if (x === 2148916233) return { code: 'noxbox', error: 'Esa cuenta de Microsoft no tiene perfil de Xbox. Crea uno en xbox.com e inténtalo otra vez.' };
    if (x === 2148916238) return { code: 'child', error: 'Las cuentas de menores necesitan estar en un grupo familiar para usar Xbox Live.' };
    return { code: 'xsts', error: `Xbox Live no autorizó la cuenta (código ${x}).` };
  }
  if (!(s.status === 200 && s.json && s.json.Token)) return { code: 'xsts', error: `Xbox Live no autorizó la cuenta (${s.status}).` };
  const claim = ((s.json.DisplayClaims || {}).xui || [])[0] || {};
  if (!claim.uhs || !claim.xid) return { code: 'xsts', error: 'Xbox Live no devolvió el identificador de tu cuenta.' };
  return { session: { header: `XBL3.0 x=${claim.uhs};${s.json.Token}`, xuid: claim.xid, gamertag: claim.gtg || '', expires: s.json.NotAfter ? Date.parse(s.json.NotAfter) : Date.now() + 8 * 3600 * 1000 } };
}

const live = (session, ver = '2') => ({ Authorization: session.header, 'x-xbl-contract-version': ver, Accept: 'application/json', 'Accept-Language': 'es-ES' });

// Mejor imagen de cada tipo entre las que da Xbox
function pickImage(images, ...types) {
  for (const t of types) {
    const i = (images || []).find((x) => x && x.url && String(x.type || x.imageType || '').toLowerCase() === t.toLowerCase());
    if (i) return String(i.url).replace(/^http:/, 'https:');
  }
  return null;
}

// Juegos de PC de tu historial (los de consola se descartan)
async function fetchXboxTitles({ session, request }) {
  let r;
  try { r = await request(`${TITLEHUB}/users/xuid(${session.xuid})/titles/titlehistory/decoration/achievement,image,detail,scid`, { headers: live(session) }); }
  catch { return { code: 'net', error: 'No se pudo conectar con Xbox Live.' }; }
  if (r.status === 401 || r.status === 403) return { code: 'expired', error: 'Xbox rechazó el acceso. Vuelve a iniciar sesión en Configuración > Xbox.' };
  if (!(r.status === 200 && r.json && Array.isArray(r.json.titles))) return { code: 'net', error: `Xbox Live respondió con un error (${r.status}).` };
  const games = [];
  for (const t of r.json.titles) {
    const devices = (t.devices || []).map((d) => String(d).toLowerCase());
    if (!devices.includes('pc') && !devices.includes('win32')) continue;
    if (t.type && !/game/i.test(t.type)) continue;
    const ach = t.achievement || {};
    games.push({
      titleId: String(t.titleId),
      pfn: t.pfn || '',
      name: t.name,
      cover: pickImage(t.images, 'Poster', 'BoxArt'),
      banner: pickImage(t.images, 'TitledHeroArt', 'SuperHeroArt', 'Screenshot'),
      logo: pickImage(t.images, 'Logo'),
      icon: t.displayImage ? String(t.displayImage).replace(/^http:/, 'https:') : pickImage(t.images, 'Tile', 'Logo'),
      description: (t.detail && t.detail.description) || '',
      developer: (t.detail && (t.detail.developerName || t.detail.publisherName)) || '',
      lastPlayed: t.titleHistory && t.titleHistory.lastTimePlayed ? Date.parse(t.titleHistory.lastTimePlayed) || null : null,
      totalAchievements: Number(ach.totalAchievements) || 0,
    });
  }
  return { games };
}

// Logros de un juego, con la misma forma que los de Steam y Epic
async function fetchXboxAchievements({ session, titleId, request }) {
  const list = [];
  let url = `${ACHIEVEMENTS}/users/xuid(${session.xuid})/achievements?titleId=${encodeURIComponent(titleId)}&maxItems=1000`;
  for (let page = 0; page < 5 && url; page++) {
    let r;
    try { r = await request(url, { headers: live(session) }); } catch { return { code: 'net', error: 'No se pudo conectar con Xbox Live.' }; }
    if (r.status === 401 || r.status === 403) return { code: 'expired', error: 'Xbox rechazó el acceso. Vuelve a iniciar sesión en Configuración > Xbox.' };
    if (r.status === 404) return { code: 'none', error: 'Este juego no tiene logros en Xbox.' };
    if (!(r.status === 200 && r.json && Array.isArray(r.json.achievements))) return { code: 'net', error: `Xbox Live respondió con un error (${r.status}).` };
    for (const a of r.json.achievements) {
      const done = String(a.progressState || '').toLowerCase() === 'achieved';
      const media = (a.mediaAssets || []).find((m) => m && m.url);
      const secret = !!a.isSecret;
      list.push({
        id: String(a.id),
        name: a.name || '',
        description: (secret && !done ? a.lockedDescription : a.description) || a.lockedDescription || '',
        hidden: secret,
        icon: media ? String(media.url).replace(/^http:/, 'https:') : null,
        iconGray: null,
        achieved: done,
        unlockTime: done && a.progression && a.progression.timeUnlocked ? Math.floor(Date.parse(a.progression.timeUnlocked) / 1000) || 0 : 0,
        percent: a.rarity && a.rarity.currentPercentage != null ? Number(a.rarity.currentPercentage) : null,
      });
    }
    const tok = r.json.pagingInfo && r.json.pagingInfo.continuationToken;
    url = tok ? `${ACHIEVEMENTS}/users/xuid(${session.xuid})/achievements?titleId=${encodeURIComponent(titleId)}&maxItems=1000&continuationToken=${encodeURIComponent(tok)}` : null;
  }
  if (!list.length) return { code: 'none', error: 'Este juego no tiene logros en Xbox.' };
  return { data: { total: list.length, unlocked: list.filter((a) => a.achieved).length, list, fetchedAt: Date.now() } };
}

const norm = (s) => String(s || '').toLowerCase().replace(/[™®©:’'"\-–—!?.,]/g, ' ').replace(/\s+/g, ' ').trim();

// Juegos de tu cuenta que no están instalados (los instalados se enlazan aparte con `matchInstalled`)
function xboxOwnedToGames(list, installedIds) {
  const out = [];
  for (const o of list || []) {
    const id = o.pfn ? `xbox:${o.pfn}` : `xbox:t${o.titleId}`;
    if (installedIds.has(id)) continue;
    out.push({
      id, source: 'xbox', name: o.name, installed: false, xboxTitleId: o.titleId,
      installUri: `ms-windows-store://search/?query=${encodeURIComponent(o.name)}`,
      ...(o.cover ? { cover: o.cover } : {}),
      ...(o.banner ? { banner: o.banner } : {}),
      ...(o.logo ? { logo: o.logo } : {}),
      ...(o.icon ? { icon: o.icon } : {}),
      ...(o.lastPlayed ? { lastPlayed: o.lastPlayed } : {}),
      ...(o.description ? { xboxInfo: { description: o.description, developer: o.developer || '' } } : {}),
    });
  }
  return out;
}

// A un juego de Xbox instalado le pone el titleId (por paquete o, si no, por nombre)
function matchInstalled(g, list) {
  const byPfn = (list || []).find((o) => o.pfn && g.id === `xbox:${o.pfn}`);
  const o = byPfn || (list || []).find((x) => norm(x.name) === norm(g.name));
  return o || null;
}

module.exports = { CLIENT_IDS, startDeviceCode, pollDeviceCode, refreshMs, xboxSession, fetchXboxTitles, fetchXboxAchievements, xboxOwnedToGames, matchInstalled };
