// Juegos de Epic Games que tienes en tu cuenta aunque no estén instalados.
// Epic no ofrece una API pública para esto: se usa el mismo inicio de sesión y servicio de biblioteca
// que usa el propio Epic Games Launcher (igual que hacen Legendary o Heroic). Tu contraseña nunca pasa
// por el lanzador: inicias sesión en la página oficial de Epic y solo se guarda un token renovable.
// `request(url, {method, headers, body})` se inyecta y devuelve { status, json }.

const CLIENT_ID = '34a02cf8f4414e29b15921876da36f9a';
const CLIENT_SECRET = 'daafbccc737745039dffe53d94fc76cf';
const BASIC = 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
const OAUTH = 'https://account-public-service-prod03.ol.epicgames.com/account/api/oauth/token';
const LIBRARY = 'https://library-service.live.use1a.on.epicgames.com/library/api/public/items?includeMetadata=true';
const CATALOG = 'https://catalog-public-service-prod06.ol.epicgames.com/catalog/api/shared/namespace';
const REDIRECT_BASE = 'https://www.epicgames.com/id/api/redirect';
const LOGIN_URL = 'https://www.epicgames.com/id/login?redirectUrl=' + encodeURIComponent(`${REDIRECT_BASE}?clientId=${CLIENT_ID}&responseType=code`);

// Acepta el JSON que muestra Epic ({"authorizationCode":"..."}) o el código suelto
function parseAuthCode(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  try { const j = JSON.parse(t); if (j && j.authorizationCode) return String(j.authorizationCode).trim(); } catch {}
  const m = t.match(/"authorizationCode"\s*:\s*"([^"]+)"/);
  if (m) return m[1];
  const raw = t.replace(/^"|"$/g, '');
  return /^[A-Za-z0-9]{20,64}$/.test(raw) ? raw : '';
}

function toAuth(j) {
  const now = Date.now();
  return {
    refreshToken: j.refresh_token,
    accessToken: j.access_token,
    accountId: j.account_id,
    name: j.displayName || '',
    accessExpires: now + (Number(j.expires_in) || 0) * 1000,
    refreshExpires: j.refresh_expires_at ? Date.parse(j.refresh_expires_at) : now + (Number(j.refresh_expires) || 0) * 1000,
  };
}

// Cambia un código de inicio de sesión (o el token guardado) por un acceso nuevo
async function epicToken({ code, refreshToken, request }) {
  const form = code
    ? `grant_type=authorization_code&code=${encodeURIComponent(code)}&token_type=eg1`
    : `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}&token_type=eg1`;
  let r;
  try {
    r = await request(OAUTH, { method: 'POST', headers: { Authorization: BASIC, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
  } catch { return { code: 'net', error: 'No se pudo conectar con Epic. Revisa tu conexión.' }; }
  if (r.status >= 200 && r.status < 300 && r.json && r.json.access_token) return { auth: toAuth(r.json) };
  if (r.status === 400 || r.status === 401 || r.status === 403) {
    return { code: 'expired', error: code ? 'Epic rechazó el código (caduca en un minuto). Inicia sesión otra vez.' : 'Tu sesión de Epic caducó. Vuelve a iniciar sesión en Configuración > Epic Games.' };
  }
  return { code: 'net', error: `Epic respondió con un error (${r.status}). Inténtalo más tarde.` };
}

const authHeader = (a) => ({ Authorization: `bearer ${a.accessToken}` });

// Acceso vigente: renueva el token si hace falta. Devuelve { auth } o { code, error }
async function ensureAccess({ auth, request }) {
  if (!auth || !auth.refreshToken) return { code: 'nologin', error: 'Inicia sesión en Configuración > Epic Games.' };
  if (auth.accessToken && auth.accessExpires && auth.accessExpires - Date.now() > 60000) return { auth };
  return epicToken({ refreshToken: auth.refreshToken, request });
}

// ---------- Logros ----------
// Mismas consultas que usa la web/el lanzador de Epic (y plugins como SuccessStory de Playnite).
const GRAPHQL = 'https://launcher.store.epicgames.com/graphql';
const Q_SCHEMA = `query Achievement($SandboxId: String!, $Locale: String!) {
  Achievement {
    productAchievementsRecordBySandbox(sandboxId: $SandboxId, locale: $Locale) {
      productId sandboxId totalAchievements
      achievements { achievement { name hidden achievementSetId isBase unlockedDisplayName lockedDisplayName unlockedDescription lockedDescription unlockedIconLink lockedIconLink XP rarity { percent } } }
    }
  }
}`;
const Q_PLAYER = `query playerProfileAchievementsByProductId($EpicAccountId: String!, $ProductId: String!) {
  PlayerProfile {
    playerProfile(epicAccountId: $EpicAccountId) {
      epicAccountId
      productAchievements(productId: $ProductId) {
        __typename
        ... on PlayerProductAchievementsResponseSuccess {
          data { totalUnlocked playerAchievements { playerAchievement { achievementName progress unlocked unlockDate XP } } }
        }
      }
    }
  }
}`;
async function gql(request, auth, operationName, query, variables) {
  const r = await request(GRAPHQL, { method: 'POST', headers: { Authorization: `bearer ${auth.accessToken}`, 'Content-Type': 'application/json', 'User-Agent': 'EpicGamesLauncher/16.0.0-0 Windows/10' }, body: JSON.stringify({ operationName, query, variables }) });
  if (r.status === 401 || r.status === 403) return { code: 'expired', error: 'Tu sesión de Epic caducó. Vuelve a iniciar sesión en Configuración > Epic Games.' };
  const errs = r.json && Array.isArray(r.json.errors) && r.json.errors.length ? r.json.errors.map((x) => x && x.message).filter(Boolean).slice(0, 2).join(' | ') : '';
  if (errs) return { code: 'api', error: `Epic rechazó la consulta de logros (${operationName}): ${errs}` };
  if (r.status < 200 || r.status >= 300 || !r.json) return { code: 'net', error: `Epic respondió con un error (${r.status}).` };
  return { data: r.json.data };
}
const httpsOnly = (u) => (typeof u === 'string' && /^https:\/\//.test(u) ? u : '');
// Devuelve { data: {total, unlocked, list, fetchedAt} } con el mismo formato que los logros de Steam, o { code, error }
async function fetchEpicAchievements({ auth, sandboxId, request }) {
  if (!sandboxId) return { code: 'none', error: 'No se pudo identificar este juego en tu cuenta de Epic. Sincroniza tu cuenta en Configuración > Epic Games.' };
  try {
    const s = await gql(request, auth, 'Achievement', Q_SCHEMA, { SandboxId: sandboxId, Locale: 'es-ES' });
    if (!s.data) return s;
    const rec = s.data.Achievement && s.data.Achievement.productAchievementsRecordBySandbox;
    const defs = (rec && rec.achievements) || [];
    if (!rec || !defs.length) return { code: 'none', error: 'Este juego no tiene logros en Epic.' };
    const p = await gql(request, auth, 'playerProfileAchievementsByProductId', Q_PLAYER, { EpicAccountId: auth.accountId, ProductId: rec.productId });
    if (!p.data) return p;
    const pa = p.data.PlayerProfile && p.data.PlayerProfile.playerProfile && p.data.PlayerProfile.playerProfile.productAchievements;
    const mine = new Map((((pa && pa.data && pa.data.playerAchievements) || [])).map((x) => (x && x.playerAchievement) || x).filter(Boolean).map((x) => [x.achievementName, x]));
    const list = defs.map((w) => w.achievement || w).filter((d) => d && d.name).map((d) => {
      const m = mine.get(d.name) || {};
      const achieved = !!m.unlocked;
      const t = achieved && m.unlockDate ? Date.parse(m.unlockDate) : 0;
      const pct = d.rarity && Number(d.rarity.percent);
      return {
        id: d.name,
        name: (achieved ? d.unlockedDisplayName : d.lockedDisplayName) || d.unlockedDisplayName || d.lockedDisplayName || d.name,
        description: (achieved ? d.unlockedDescription : d.lockedDescription) || d.unlockedDescription || d.lockedDescription || '',
        hidden: !!d.hidden,
        icon: httpsOnly(d.unlockedIconLink),
        iconGray: httpsOnly(d.lockedIconLink) || httpsOnly(d.unlockedIconLink),
        achieved,
        unlockTime: Number.isFinite(t) ? t : 0,
        percent: Number.isFinite(pct) ? Math.round(pct * 10) / 10 : null,
      };
    });
    return { data: { source: 'epic', sandboxId, total: list.length, unlocked: list.filter((a) => a.achieved).length, list, fetchedAt: Date.now() } };
  } catch {
    return { code: 'net', error: 'No se pudo conectar con Epic. Revisa tu conexión.' };
  }
}

// Devuelve { games, auth } (auth viene si el token se renovó, para guardarlo)
async function fetchOwnedEpic({ auth, request }) {
  if (!auth || !auth.refreshToken) return { code: 'nologin', error: 'Inicia sesión en Configuración > Epic Games.' };
  let cur = auth;
  if (!cur.accessToken || !cur.accessExpires || cur.accessExpires - Date.now() < 60000) {
    const t = await epicToken({ refreshToken: cur.refreshToken, request });
    if (!t.auth) return t;
    cur = t.auth;
  }
  try {
    // 1) lista de lo que tienes (paginada)
    const records = [];
    let cursor = '';
    for (let i = 0; i < 50; i++) {
      const r = await request(LIBRARY + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''), { headers: authHeader(cur) });
      if (r.status === 401 || r.status === 403) return { code: 'expired', error: 'Tu sesión de Epic caducó. Vuelve a iniciar sesión en Configuración > Epic Games.', auth: cur };
      if (r.status < 200 || r.status >= 300 || !r.json) return { code: 'net', error: `Epic respondió con un error (${r.status}).`, auth: cur };
      records.push(...(r.json.records || []));
      cursor = r.json.responseMetadata && r.json.responseMetadata.nextCursor;
      if (!cursor) break;
    }
    const byNs = new Map();
    const seen = new Set();
    for (const rec of records) {
      if (!rec || !rec.namespace || !rec.catalogItemId || !rec.appName || rec.namespace === 'ue' || seen.has(rec.catalogItemId)) continue;
      seen.add(rec.catalogItemId);
      if (!byNs.has(rec.namespace)) byNs.set(rec.namespace, []);
      byNs.get(rec.namespace).push(rec);
    }
    // 2) nombre e imágenes (catálogo), por espacios de nombres y en lotes
    const games = [];
    const jobs = [...byNs.entries()];
    const worker = async () => {
      while (jobs.length) {
        const [ns, recs] = jobs.shift();
        for (let i = 0; i < recs.length; i += 40) {
          const part = recs.slice(i, i + 40);
          const url = `${CATALOG}/${encodeURIComponent(ns)}/bulk/items?${part.map((x) => 'id=' + encodeURIComponent(x.catalogItemId)).join('&')}&includeDLCDetails=true&includeMainGameDetails=true&country=US&locale=en-US`;
          let r;
          try { r = await request(url, { headers: authHeader(cur) }); } catch { continue; }
          if (!r.json || r.status >= 300) continue;
          for (const rec of part) {
            const it = r.json[rec.catalogItemId];
            if (!it || !it.title || it.mainGameItem) continue;                       // DLC
            const cats = (it.categories || []).map((c) => c && c.path);
            if (!cats.includes('games') || cats.includes('addons') || cats.includes('digitalextras')) continue;
            const img = (t) => { const k = (it.keyImages || []).find((x) => x.type === t); return k ? k.url : ''; };
            games.push({
              appName: rec.appName, namespace: rec.namespace, catalogItemId: rec.catalogItemId, name: it.title,
              cover: img('DieselGameBoxTall') || img('OfferImageTall') || '',
              banner: img('DieselGameBox') || img('OfferImageWide') || img('Thumbnail') || '',
              logo: img('DieselGameBoxLogo') || '',
              description: String(it.description || it.longDescription || '').replace(/\s+/g, ' ').trim().slice(0, 1500),
              developer: String(it.developer || '').trim(),
            });
          }
        }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    games.sort((a, b) => a.name.localeCompare(b.name));
    return { games, auth: cur };
  } catch {
    return { code: 'net', error: 'No se pudo conectar con Epic. Revisa tu conexión.', auth: cur };
  }
}

// El CDN de Epic reduce la imagen si se le pide (las originales pesan mucho y hacen lenta la lista)
const sized = (u, w, h) => (/^https:\/\/cdn\d*\.epicgames\.com\//.test(u) && !u.includes('?') ? `${u}?h=${h}&resize=1&w=${w}&quality=medium` : u);

// Convierte la lista guardada en juegos para la biblioteca, sin repetir los que ya están instalados
function epicOwnedToGames(list, installedIds) {
  const out = [];
  for (const o of list || []) {
    const id = `epic:${o.appName}`;
    if (installedIds.has(id)) continue;
    out.push({
      id,
      source: 'epic',
      name: o.name,
      installed: false,
      installUri: `com.epicgames.launcher://apps/${o.namespace}%3A${o.catalogItemId}%3A${o.appName}?action=install`,
      ...(o.cover ? { cover: sized(o.cover, 600, 800), coverFallback: o.cover } : {}),
      ...(o.banner ? { banner: o.banner } : {}),
      epicNs: o.namespace,
      ...(o.logo ? { logo: o.logo } : {}),
      ...(o.description ? { epicInfo: { description: o.description, developer: o.developer || '' } } : {}),
    });
  }
  return out;
}

module.exports = { ensureAccess, fetchEpicAchievements, LOGIN_URL, REDIRECT_BASE, parseAuthCode, epicToken, fetchOwnedEpic, epicOwnedToGames };
