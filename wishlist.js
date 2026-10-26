// Listas de deseados: Steam (lista pública, se consulta con el SteamID) y Epic (con la sesión de Epic ya iniciada).
// Ubisoft, Xbox, EA y el resto no ofrecen ninguna forma de leer la lista de deseados desde fuera.
const SW = 'https://api.steampowered.com/IWishlistService/GetWishlist/v1/?steamid=';
const SB = 'https://api.steampowered.com/IStoreBrowseService/GetItems/v1/?input_json=';
const CATALOG = 'https://catalog-public-service-prod06.ol.epicgames.com/catalog/api/shared/namespace';
const GRAPHQL = 'https://launcher.store.epicgames.com/graphql';
const Q_WISH = `query wishlistQuery($country: String!, $locale: String) {
  Wishlist { wishlistItems { elements {
    id offerId namespace created
    offer { id title productSlug urlSlug keyImages { type url }
      price(country: $country) { totalPrice { discountPrice originalPrice discount currencyCode currencyInfo { decimals } } } }
  } } }
}`;

const money = (cents, cur, dec) => {
  try { return new Intl.NumberFormat('es', { style: 'currency', currency: cur }).format(cents / Math.pow(10, dec)); } catch { return `${(cents / Math.pow(10, dec)).toFixed(2)} ${cur}`; }
};
const LANG = { es: 'spanish', en: 'english', pt: 'brazilian', fr: 'french', de: 'german', it: 'italian' };

// ---- Steam ----
function parseSteamIds(j) {
  const it = j && j.response && Array.isArray(j.response.items) ? j.response.items : [];
  return it.map((x) => ({ appid: String(x.appid), priority: Number(x.priority) || 0, added: (Number(x.date_added) || 0) * 1000 })).filter((x) => x.appid && x.appid !== 'undefined');
}
function parseSteamItems(j, ids) {
  const byId = new Map(ids.map((x) => [x.appid, x]));
  const list = j && j.response && Array.isArray(j.response.store_items) ? j.response.store_items : [];
  const out = [];
  for (const s of list) {
    const appid = String(s.appid || s.id); const base = byId.get(appid) || {};
    const o = s.best_purchase_option || null;
    const a = s.assets || {};
    const image = a.asset_url_format && a.header ? 'https://shared.fastly.steamstatic.com/store_item_assets/' + a.asset_url_format.replace('${FILENAME}', a.header) : `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appid}/header.jpg`;
    const soon = !!(s.release && s.release.is_coming_soon) || !!s.coming_soon;
    out.push({
      id: 'steam:' + appid, store: 'steam', appid, title: s.name || ('Juego ' + appid), image,
      url: `https://store.steampowered.com/app/${appid}/`, app: `steam://store/${appid}`,
      price: o ? (o.formatted_final_price || '') : '', orig: o && o.discount_pct ? (o.formatted_original_price || '') : '',
      discount: o ? Number(o.discount_pct) || 0 : 0, free: !!s.is_free || (!!o && o.final_price_in_cents === 0 && !soon),
      soon, added: base.added || 0, priority: base.priority || 0,
    });
  }
  // los que Steam no devolvió (retirados o no disponibles en el país) se muestran igual con lo mínimo
  for (const b of ids) if (!out.some((x) => x.appid === b.appid)) out.push({ id: 'steam:' + b.appid, store: 'steam', appid: b.appid, title: 'Juego ' + b.appid, image: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${b.appid}/header.jpg`, url: `https://store.steampowered.com/app/${b.appid}/`, app: `steam://store/${b.appid}`, price: '', orig: '', discount: 0, free: false, soon: false, added: b.added, priority: b.priority, unavailable: true });
  return out;
}
async function fetchSteamWishlist({ steamId, country, lang, getJson }) {
  if (!steamId) return { code: 'nosteam', error: 'Falta tu SteamID. Escríbelo en Configuración > Steam o inicia sesión en Steam en este equipo.' };
  let ids;
  try { ids = parseSteamIds(await getJson(SW + encodeURIComponent(steamId))); } catch (e) { return { code: 'net', error: 'No se pudo consultar tu lista de deseados de Steam. Revisa tu conexión y que tu perfil y «detalles del juego» sean públicos.' }; }
  if (!ids.length) return { items: [] };
  const items = [];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const input = { ids: chunk.map((x) => ({ appid: Number(x.appid) })), context: { language: LANG[lang] || 'spanish', country_code: country, steam_realm: 1 }, data_request: { include_assets: true, include_basic_info: true, include_release: true } };
    try { items.push(...parseSteamItems(await getJson(SB + encodeURIComponent(JSON.stringify(input))), chunk)); } catch { items.push(...parseSteamItems(null, chunk)); }
  }
  return { items };
}

// ---- Epic ----
function parseEpicWish(j, locale) {
  const els = j && j.Wishlist && j.Wishlist.wishlistItems && j.Wishlist.wishlistItems.elements;
  if (!Array.isArray(els)) return null;
  const loc = locale || 'es-ES';
  return els.filter((e) => e && (e.offer || e.offerId)).map((e) => {
    const o = e.offer || { id: e.offerId, title: '', keyImages: [], noOffer: true, ns: e.namespace }; const slug = o.productSlug || o.urlSlug || '';
    const imgs = o.keyImages || [];
    const pick = (t) => (imgs.find((x) => x.type === t) || {}).url;
    const tp = o.price && o.price.totalPrice; const dec = tp && tp.currencyInfo ? tp.currencyInfo.decimals : 2;
    const free = !!tp && tp.discountPrice === 0;
    return {
      id: 'epic:' + (e.offerId || o.id), store: 'epic', title: o.title || 'Juego de Epic', offerId: e.offerId || o.id, ns: e.namespace || o.ns, noOffer: !!o.noOffer,
      image: pick('OfferImageWide') || pick('DieselStoreFrontWide') || pick('Thumbnail') || (imgs[0] || {}).url || '',
      url: slug ? `https://store.epicgames.com/${loc}/p/${String(slug).replace(/\/home$/, '')}` : 'https://store.epicgames.com/',
      app: slug && /^[\w-]+$/.test(String(slug).replace(/\/home$/, '')) ? `com.epicgames.launcher://store/p/${String(slug).replace(/\/home$/, '')}` : null,
      price: tp ? (free ? 'Gratis' : money(tp.discountPrice, tp.currencyCode, dec)) : '',
      orig: tp && tp.discount > 0 ? money(tp.originalPrice, tp.currencyCode, dec) : '',
      discount: tp && tp.originalPrice > 0 ? Math.round((1 - tp.discountPrice / tp.originalPrice) * 100) : 0,
      free, soon: false, added: e.created ? Date.parse(e.created) || 0 : 0, priority: 0,
    };
  });
}
const Q_OFFER = `query wishOffer($ns: String!, $id: String!, $country: String!, $locale: String) {
  Catalog { catalogOffer(namespace: $ns, id: $id, locale: $locale) {
    id title productSlug urlSlug keyImages { type url }
    price(country: $country) { totalPrice { discountPrice originalPrice discount currencyCode currencyInfo { decimals } } }
  } }
}`;
const Q_MIN = `query wishlistQuery { Wishlist { wishlistItems { elements { id offerId namespace created } } } }`;
const Q_PAGED = `query wishlistQuery($page: Int, $perPage: Int) { Wishlist { wishlistItems(page: $page, perPage: $perPage) { elements { id offerId namespace created } } } }`;
async function fetchEpicWishlist({ auth, request, country, locale }) {
  const UA = 'EpicGamesLauncher/16.0.0-0 Windows/10';
  const tries = [
    ['launcher', GRAPHQL, Q_WISH, { country, locale }],
    ['launcher-min', GRAPHQL, Q_MIN, {}],
    ['web', 'https://store.epicgames.com/graphql', Q_WISH, { country, locale }],
    ['web-min', 'https://store.epicgames.com/graphql', Q_MIN, {}],
    ['launcher-pag', GRAPHQL, Q_PAGED, { page: 1, perPage: 200 }],
  ];
  const diag = []; let items = null, sawAuthErr = false;
  for (const [name, url, query, variables] of tries) {
    let r;
    try { r = await request(url, { method: 'POST', headers: { Authorization: `bearer ${auth.accessToken}`, 'Content-Type': 'application/json', 'User-Agent': UA }, body: JSON.stringify({ operationName: 'wishlistQuery', query, variables }) }); }
    catch { diag.push(`${name}: sin conexión`); continue; }
    if (r.status === 401 || r.status === 403) { sawAuthErr = true; diag.push(`${name}: ${r.status}`); continue; }
    const errs = r.json && Array.isArray(r.json.errors) && r.json.errors.length ? r.json.errors.map((x) => x && x.message).filter(Boolean).slice(0, 1).join('|').slice(0, 80) : '';
    const got = r.json && r.json.data ? parseEpicWish(r.json.data, locale) : null;
    diag.push(`${name}: ${r.status}${got ? ' ' + got.length + ' juegos' : ''}${errs ? ' «' + errs + '»' : ''}`);
    if (got && got.length) { items = got; break; }
    if (got && !items) items = [];
  }
  if (!items) return { code: sawAuthErr ? 'expired' : 'api', error: (sawAuthErr ? 'Epic no dejó leer tu lista de deseados con esta sesión.' : 'Epic no devolvió la lista de deseados.') + ' [' + diag.join(' · ') + ']' };
  if (!items.length) return { items, diag: diag.join(' · ') };
  // Epic a veces devuelve el juego sin su ficha (sin título): se completa con la oferta del catálogo
  const loc = locale || 'es-ES';
  const hdr = { Authorization: `bearer ${auth.accessToken}`, 'Content-Type': 'application/json', 'User-Agent': UA };
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!(it.noOffer && it.ns && it.offerId)) continue;
    let offer = null;
    try {
      const r = await request(GRAPHQL, { method: 'POST', headers: hdr, body: JSON.stringify({ operationName: 'wishOffer', query: Q_OFFER, variables: { ns: it.ns, id: it.offerId, country, locale: loc } }) });
      offer = r.json && r.json.data && r.json.data.Catalog && r.json.data.Catalog.catalogOffer;
    } catch { /* se prueba el catálogo */ }
    if (!(offer && offer.title)) {
      try {
        const r = await request(`${CATALOG}/${encodeURIComponent(it.ns)}/bulk/offers?id=${encodeURIComponent(it.offerId)}&returnItemDetails=false&country=${country}&locale=${encodeURIComponent(loc)}`, { headers: { Authorization: hdr.Authorization } });
        const d = r.json && r.json[it.offerId];
        if (d && d.title) {
          const sl = d.customAttributes && d.customAttributes.find ? d.customAttributes.find((x) => x.key === 'com.epicgames.app.productSlug') : null;
          offer = { id: it.offerId, title: d.title, keyImages: d.keyImages || [], productSlug: (sl && sl.value) || d.urlSlug || '' };
        }
      } catch { /* se queda con el nombre genérico */ }
    }
    if (offer && offer.title) {
      const [full] = parseEpicWish({ Wishlist: { wishlistItems: { elements: [{ offerId: it.offerId, namespace: it.ns, offer }] } } }, loc) || [];
      if (full) items[i] = { ...full, added: it.added };
    }
  }
  return { items, diag: diag.join(' · ') };
}

// Rebajas nuevas entre las que aún no se avisó (clave = id + porcentaje, para avisar otra vez si cambia la rebaja)
const wishKey = (it) => `${it.id}|${it.free ? 100 : it.discount}`;
function newSales(items, seen, minPct) {
  const s = seen instanceof Set ? seen : new Set(seen || []);
  return (items || []).filter((it) => !it.owned && !it.soon && (it.free || it.discount >= (minPct || 1)) && it.discount > 0 && !s.has(wishKey(it)));
}

module.exports = { parseSteamIds, parseSteamItems, fetchSteamWishlist, parseEpicWish, fetchEpicWishlist, wishKey, newSales };
