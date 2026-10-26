// Juegos gratis del momento en Epic Games Store y Steam (ofertas temporales: «gratis por tiempo limitado»)
const Dupes = require('./renderer/dupes.js');

// Epic: https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions
function parseEpic(json, { now = Date.now(), lang = 'es-ES' } = {}) {
  const els = (((json || {}).data || {}).Catalog || {}).searchStore;
  const list = (els && els.elements) || [];
  const out = [];
  const win = (o) => { const s = Date.parse(o.startDate), e = Date.parse(o.endDate); return { s: Number.isFinite(s) ? s : null, e: Number.isFinite(e) ? e : null }; };
  for (const el of list) {
    const p = el.promotions || {};
    const cur = [].concat(...((p.promotionalOffers || []).map((x) => x.promotionalOffers || []))).filter((o) => o.discountSetting && o.discountSetting.discountPercentage === 0);
    const nxt = [].concat(...((p.upcomingPromotionalOffers || []).map((x) => x.promotionalOffers || []))).filter((o) => o.discountSetting && o.discountSetting.discountPercentage === 0);
    let status = null, w = null;
    for (const o of cur) { const x = win(o); if ((x.s == null || x.s <= now) && (x.e == null || x.e > now)) { status = 'now'; w = x; break; } }
    if (!status) for (const o of nxt) { const x = win(o); if (x.s != null && x.s > now) { status = 'soon'; w = x; break; } }
    if (!status) continue;
    const total = (el.price && el.price.totalPrice) || {};
    const slugOf = () => {
      const m = ((el.catalogNs || {}).mappings || []).find((x) => x.pageType === 'productHome');
      const s = el.productSlug || (m && m.pageSlug) || ((el.offerMappings || [])[0] || {}).pageSlug || el.urlSlug || '';
      return String(s).replace(/\/home$/, '');
    };
    const imgs = el.keyImages || [];
    const img = ['OfferImageWide', 'DieselStoreFrontWide', 'Thumbnail', 'OfferImageTall'].map((t) => imgs.find((i) => i.type === t)).find(Boolean) || imgs[0];
    const slug = slugOf();
    out.push({
      id: 'epic:' + el.id, store: 'epic', title: el.title, status,
      kind: /^(ADD_?ON|DLC|EDITION_ADD_?ON)$/i.test(el.offerType || '') ? 'dlc' : /^(BASE_GAME|EDITION|BUNDLE)$/i.test(el.offerType || '') ? 'game' : null,
      image: img ? img.url : null,
      url: slug && !/^\[?mystery/i.test(el.title) ? `https://store.epicgames.com/${lang}/p/${slug}` : `https://store.epicgames.com/${lang}/free-games`,
      app: slug && !/^\[?mystery/i.test(el.title) ? `com.epicgames.launcher://store/p/${slug}` : 'com.epicgames.launcher://store/free-games',
      start: w.s, end: w.e,
      price: total.fmtPrice && total.fmtPrice.originalPrice && total.fmtPrice.originalPrice !== '0' ? total.fmtPrice.originalPrice : null,
    });
  }
  return out;
}

// Steam (1): https://store.steampowered.com/api/featuredcategories  -> specials.items[]
function parseSteamFeatured(json, { now = Date.now() } = {}) {
  const items = ((json || {}).specials || {}).items || [];
  const out = [];
  for (const it of items) {
    const free = it.discount_percent === 100 || (it.final_price === 0 && it.original_price > 0);
    if (!free || !it.id) continue;
    const end = it.discount_expiration ? it.discount_expiration * 1000 : null;
    if (end && end <= now) continue;
    out.push({ id: 'steam:' + it.id, store: 'steam', appid: String(it.id), title: it.name, status: 'now',
      image: it.header_image || it.large_capsule_image || `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${it.id}/header.jpg`,
      url: `https://store.steampowered.com/app/${it.id}/`, app: `steam://store/${it.id}`, start: null, end, price: null });
  }
  return out;
}

// Steam (2): búsqueda de ofertas del 100 % (HTML dentro de un JSON)
function parseSteamSearch(json) {
  const html = (json && json.results_html) || '';
  const out = [];
  for (const row of html.split('<a ').slice(1)) {
    const id = /data-ds-appid="(\d+)/.exec(row) || /\/app\/(\d+)/.exec(row);
    if (!id) continue;
    if (!/data-discount="100"|discount_pct">\s*-100%/.test(row)) continue;
    const t = /<span class="title">([^<]*)<\/span>/.exec(row);
    const orig = /discount_original_price">([^<]*)</.exec(row);
    out.push({ id: 'steam:' + id[1], store: 'steam', appid: id[1], title: t ? t[1].replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"') : 'Juego ' + id[1], status: 'now',
      image: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${id[1]}/header.jpg`, url: `https://store.steampowered.com/app/${id[1]}/`, app: `steam://store/${id[1]}`, start: null, end: null, price: orig ? orig[1].trim() : null });
  }
  return out;
}

// Steam: qué es cada oferta (juego, DLC, extra), su imagen real y el juego base de los DLC, con appdetails
async function enrichSteam(getJson, items, country, sl) {
  let i = 0;
  const work = async () => {
    while (i < items.length) {
      const it = items[i++];
      for (let tryN = 0; tryN < 2; tryN++) try {
        const j = await getJson(`https://store.steampowered.com/api/appdetails?appids=${it.appid}&cc=${country}&l=${sl}`);
        const d = j && j[it.appid] && j[it.appid].success ? j[it.appid].data : null;
        if (!d) continue;
        it.kind = d.type === 'game' ? 'game' : d.type === 'dlc' ? 'dlc' : 'extra';
        if (d.name) it.title = d.name;
        if (d.header_image) it.image = d.header_image;
        if (d.fullgame && d.fullgame.name) it.base = d.fullgame.name;
        if (d.fullgame && d.fullgame.appid) it.baseAppid = String(d.fullgame.appid);
        const po = d.price_overview;
        if (po && po.initial_formatted) it.price = po.initial_formatted;
        break;
      } catch { /* se reintenta una vez; si no, se queda sin clasificar */ }
    }
  };
  await Promise.all([work(), work(), work(), work()]);
  return items;
}

const mergeSteam = (a, b) => {
  const m = new Map();
  for (const g of [...a, ...b]) { const old = m.get(g.id); m.set(g.id, old ? { ...g, ...old, end: old.end || g.end, price: old.price || g.price } : g); }
  return [...m.values()];
};

// País según la zona horaria de Windows (más fiable que el idioma: «es-MX» puede estar puesto sin vivir en México)
const TZ = { 'America/Bogota': 'CO', 'America/Mexico_City': 'MX', 'America/Cancun': 'MX', 'America/Monterrey': 'MX', 'America/Merida': 'MX', 'America/Tijuana': 'MX', 'America/Chihuahua': 'MX', 'America/Hermosillo': 'MX', 'America/Mazatlan': 'MX',
  'America/Lima': 'PE', 'America/Santiago': 'CL', 'America/Caracas': 'VE', 'America/Guayaquil': 'EC', 'America/Montevideo': 'UY', 'America/La_Paz': 'BO', 'America/Asuncion': 'PY', 'America/Panama': 'PA', 'America/Costa_Rica': 'CR', 'America/Guatemala': 'GT',
  'America/El_Salvador': 'SV', 'America/Tegucigalpa': 'HN', 'America/Managua': 'NI', 'America/Santo_Domingo': 'DO', 'America/Puerto_Rico': 'PR', 'America/Sao_Paulo': 'BR', 'America/Argentina/Buenos_Aires': 'AR', 'America/Buenos_Aires': 'AR', 'Europe/Madrid': 'ES', 'Atlantic/Canary': 'ES',
  'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE', 'Europe/Rome': 'IT', 'Europe/Lisbon': 'PT', 'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US', 'America/Toronto': 'CA', 'America/Vancouver': 'CA' };
const countryFromTimeZone = (tz) => (tz && (TZ[tz] || (/^America\/Argentina\//.test(tz) ? 'AR' : null))) || null;

// «ES» de «es-CO» -> país para las tiendas
const countryOf = (locale) => { const m = /[-_]([A-Za-z]{2})\b/.exec(locale || ''); return m ? m[1].toUpperCase() : 'US'; };

// Descarga todo con la función `getJson(url)` (net.fetch en la aplicación). Cada tienda falla por separado.
async function fetchAll(getJson, locale, now = Date.now(), forcedCountry) {
  const country = (forcedCountry && /^[A-Za-z]{2}$/.test(forcedCountry) ? forcedCountry.toUpperCase() : countryOf(locale)), lang = (locale || 'es-ES').replace('_', '-');
  const epicLang = /^es/i.test(lang) ? 'es-ES' : 'en-US';
  const res = { epic: [], steam: [], other: [], errors: {}, updated: now, country };
  try {
    res.epic = parseEpic(await getJson(`https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=${lang}&country=${country}&allowCountries=${country}`), { now, lang: epicLang });
  } catch (e) { res.errors.epic = String((e && e.message) || e); }
  const sl = /^es/i.test(lang) ? 'spanish' : 'english';
  const [a, b] = await Promise.allSettled([
    getJson(`https://store.steampowered.com/api/featuredcategories?cc=${country}&l=${sl}`),
    getJson(`https://store.steampowered.com/search/results/?query&start=0&count=50&specials=1&maxprice=free&cc=${country}&l=${sl}&infinite=1`),
  ]);
  const sa = a.status === 'fulfilled' ? parseSteamFeatured(a.value, { now }) : [], sb = b.status === 'fulfilled' ? parseSteamSearch(b.value) : [];
  res.other = [];
  try { res.other = parseGamerPower(await getJson('https://www.gamerpower.com/api/giveaways?platform=pc&type=game&sort-by=date'), { now }).slice(0, 30); } catch (e) { res.errors.other = String((e && e.message) || e); }
  res.steam = mergeSteam(sa, sb).slice(0, 24);
  await enrichSteam(getJson, res.steam, country, sl);
  if (a.status === 'rejected' && b.status === 'rejected') res.errors.steam = String((a.reason && a.reason.message) || a.reason);
  return res;
}

// Otras tiendas (Ubisoft, EA, Battle.net, itch.io, Amazon Prime Gaming, Microsoft Store…) vía GamerPower (api pública de terceros).
// Steam y Epic ya se consultan directamente, y GOG no se usa en Comptus: se descartan.
const OTHER_STORES = [
  [/ubisoft|uplay/i, 'ubisoft', 'Ubisoft'], [/\bea\b|origin|ea app|ea play/i, 'ea', 'EA'], [/battle\.?net|blizzard/i, 'battlenet', 'Battle.net'],
  [/itch/i, 'itch', 'itch.io'], [/prime|amazon/i, 'prime', 'Amazon Prime Gaming'], [/xbox|microsoft/i, 'xbox', 'Xbox / Microsoft Store'], [/rockstar/i, 'rockstar', 'Rockstar'],
];
function parseGamerPower(list, { now = Date.now() } = {}) {
  const out = [];
  for (const g of Array.isArray(list) ? list : []) {
    if (!g || !g.id || !g.title) continue;
    const type = String(g.type || '');
    if (!/^(game|dlc)$/i.test(type) || /^active$/i.test(g.status || 'Active') === false) continue;
    const plat = String(g.platforms || '');
    if (/gog/i.test(plat) && !/ubisoft|epic|steam/i.test(plat)) continue;
    const hit = OTHER_STORES.find(([re]) => re.test(plat));
    const onlyNative = !hit && /(steam|epic)/i.test(plat) && !/(drm-free|itch|gog)/i.test(plat);
    if (onlyNative) continue; // ya se muestra con los datos directos de Steam y Epic
    let end = null;
    if (g.end_date && !/^n\/?a$/i.test(g.end_date)) { const t = Date.parse(String(g.end_date).replace(' ', 'T') + 'Z'); if (Number.isFinite(t)) end = t; }
    if (end && end <= now) continue;
    const url = g.open_giveaway_url || g.gamerpower_url;
    if (!/^https:\/\/www\.gamerpower\.com\//.test(String(url || ''))) continue;
    out.push({ id: 'gp:' + g.id, store: hit ? hit[1] : 'other', storeName: hit ? hit[2] : (plat.split(',').map((x) => x.trim()).filter((x) => x && !/^pc$/i.test(x))[0] || 'Otra tienda'),
      title: String(g.title).replace(/\s*\((?:[^)]*)\)?\s*giveaway\s*$/i, '').replace(/\s*giveaway\s*$/i, '').trim() || g.title, status: 'now', kind: /dlc/i.test(type) ? 'dlc' : 'game',
      image: g.image || g.thumbnail || null, url, start: null, end, price: g.worth && g.worth !== 'N/A' ? g.worth : null, via: 'GamerPower' });
  }
  return out;
}

// Marca los que ya tienes (en tu biblioteca): Steam por appid, Epic por nombre
function markOwned(items, library) {
  const steamIds = new Set(library.filter((g) => g.source === 'steam' && g.appid).map((g) => String(g.appid)));
  const allNames = new Set(library.map((g) => Dupes.norm(g.name)));
  const epicNames = new Set(library.filter((g) => g.source === 'epic').map((g) => Dupes.norm(g.name)));
  return items.map((it) => ({ ...it, owned: it.store === 'steam' ? steamIds.has(it.appid) : it.store === 'epic' ? epicNames.has(Dupes.norm(it.title)) : allNames.has(Dupes.norm(it.title)) }));
}

// Ofertas de las que aún no se avisó (clave = id + fin de la oferta, para volver a avisar si se repite en otra fecha)
const offerKey = (it) => `${it.id}|${it.end || it.start || ''}`;
function newOffers(items, seen, opts) {
  const s = seen instanceof Set ? seen : new Set(seen || []);
  const dlc = !!(opts && opts.dlc);
  return (items || []).filter((it) => it.status === 'now' && !it.owned && (dlc || (it.kind !== 'dlc' && it.kind !== 'extra')) && !s.has(offerKey(it)));
}
const storeLabel = (x) => (x.store === 'epic' ? 'Epic Games' : x.store === 'steam' ? 'Steam' : x.storeName || 'otra tienda');
function notifText(list) {
  const n = list.length;
  const names = list.slice(0, 3).map((x) => x.title).join(', ') + (n > 3 ? ` y ${n - 3} más` : '');
  const stores = [...new Set(list.map((x) => storeLabel(x)))].join(' y ');
  return { title: n === 1 ? `Gratis en ${stores}` : `${n} ofertas gratis nuevas`, body: n === 1 ? list[0].title + (list[0].end ? ' · por tiempo limitado' : '') : `${names} (${stores})` };
}

module.exports = { parseGamerPower, storeLabel, offerKey, newOffers, notifText, enrichSteam, countryFromTimeZone, parseEpic, parseSteamFeatured, parseSteamSearch, mergeSteam, countryOf, fetchAll, markOwned };
