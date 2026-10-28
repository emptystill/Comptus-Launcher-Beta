const state = { games: [], filter: 'all', query: '', sort: 'name', detailId: null, loading: true };
const newFilters = () => ({ sources: new Set(), status: 'all', time: 'all', fav: false, ach: 'all', genres: new Set(), info: 'all', meta: 0, colls: new Set(), play: 'all', tags: new Set() });
state.f = newFilters(); // filtros del botón «Filtrar» (solo de esta sesión)
let editing = null; // juego local que se está editando
let editCover = null;
let SOURCES = [];       // bibliotecas conocidas: [{ id, name, color, defaultEnabled }]
let sourceEnabled = {}; // bibliotecas activadas/desactivadas por el usuario

const $ = (sel) => document.querySelector(sel);
const grid = $('#grid');
const srcDef = (id) => SOURCES.find((s) => s.id === id) || { id, name: id, color: '#aaaaaa' };
const isEnabled = (s) => (sourceEnabled[s.id] !== undefined ? sourceEnabled[s.id] : s.defaultEnabled !== false);

// ---------- Utilidades ----------
function toast(msg, ms = 3000) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add('hidden'), ms);
}

function fileUrl(p) {
  return encodeURI('file:///' + p.replace(/\\/g, '/')).replace(/#/g, '%23').replace(/\?/g, '%3F');
}

function imgUrl(p) {
  return /^https?:/.test(p) ? p : fileUrl(p);
}

// Versiones reducidas (en caché en disco) de las imágenes propias grandes; ver 'img:small' en main.js
const smallCache = new Map();
let smallBusy = 0; const smallQueue = [];
// Imágenes animadas (webp, gif): 'all' todas en movimiento · 'few' solo unas pocas de las visibles · 'hover' solo al pasar el ratón
let animMode = 'hover';
const ANIM_BUDGET = 4; // en modo 'few': cuántas tarjetas a la vez
// Devuelve { url, anim }: url = la imagen a mostrar (ligera si hace falta) y anim = el original animado
// para mostrarlo en movimiento cuando toca. `still` fuerza una copia fija aunque la imagen sea animada.
function smallImage(p, width, fmt = 'jpg', still = false) {
  if (!p || /^https?:/.test(p)) return Promise.resolve({ url: p || null, anim: null });
  const k = `${p}|${width}|${fmt}|${still ? 1 : 0}|${animMode === 'all' ? 1 : 0}`;
  if (!smallCache.has(k)) {
    smallCache.set(k, (async () => {
      let r;
      try {
        r = await window.api.imgSmall(p, width, fmt, false); // consulta ligera: sin límite de a cuántas a la vez
        const stillWanted = still || animMode !== 'all';
        if (r.animated && !stillWanted) return { url: p, anim: null }; // todas en movimiento: se usa el original
        if (r.animated && stillWanted) r = await window.api.imgSmall(p, width, fmt, true); // copia fija del primer fotograma
        const anim = r.animated && !still ? p : null;
        if (r.path) return { url: r.path, anim: r.path === p ? null : anim };
      } catch { return { url: p, anim: null }; }
      // hay que crear la versión ligera (trabajo pesado): solo 3 a la vez
      await new Promise((go) => { if (smallBusy < 3) { smallBusy++; go(); } else smallQueue.push(() => { smallBusy++; go(); }); });
      try {
        const anim = r.animated && !still ? p : null;
        const im = new Image();
        im.src = fileUrl(p);
        await im.decode();
        if (im.naturalWidth <= width && !r.animated) return { url: p, anim: null };
        const w = Math.min(width, im.naturalWidth);
        const c = document.createElement('canvas');
        c.width = w; c.height = Math.max(1, Math.round(im.naturalHeight * w / im.naturalWidth));
        const ctx = c.getContext('2d');
        if (fmt === 'jpg') { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height); }
        ctx.drawImage(im, 0, 0, c.width, c.height);
        const ok = await window.api.imgStore(r.out, fmt === 'png' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.88));
        return { url: ok ? r.out : p, anim: ok ? anim : null };
      } catch { return { url: p, anim: null }; } finally {
        smallBusy--;
        const next = smallQueue.shift(); if (next) next();
      }
    })());
  }
  return smallCache.get(k);
}
// Calcula las versiones reducidas de lo que se ve en tarjetas, listas y cabeceras
async function smallifyLibrary(games) {
  try { await smallifyLibrary0(games); if (cardShape === 'wide') { await Promise.all(games.map(compLookup)); } } catch { /* sin imagen unida */ }
}
async function smallifyLibrary0(games) {
  // las imágenes de las tiendas (web) se guardan en disco y se usan desde ahí
  let loc = (u) => u;
  if (window.api.imgRemote) {
    const urls = new Set(); for (const g of games) for (const k of ['cover', 'banner', 'logo']) if (/^https:/.test(g[k] || '')) urls.add(g[k]);
    if (urls.size) { try { const m = await window.api.imgRemote([...urls]); loc = (u) => (u && m[u]) || u; } catch { /* sin caché: se usan desde internet */ } }
  }
  await Promise.all([
    ...games.map(async (g) => {
      if (g.cover) {
        const s = await smallImage(loc(g.cover), 480); g.coverSm = s.url; g.coverAnim = s.anim;
        // los iconos de la lista lateral nunca se animan
        g.coverStill = s.anim || (animMode === 'all' && s.url === loc(g.cover)) ? (await smallImage(loc(g.cover), 96, 'jpg', true)).url : null;
      }
      if (g.icon) g.iconSm = (await smallImage(g.icon, 96, 'png', true)).url;
      if (g.logo) { const s = await smallImage(loc(g.logo), 1000, 'png'); g.logoSm = s.anim ? g.logo : s.url; g.logoCard = (s.anim || cardShape !== 'wide') ? null : (await smallImage(loc(g.logo), 360, 'png')).url; } // un logotipo enorme tardaba ~240 ms en pintarse al abrir la ficha
      if (g.banner) { const s = await smallImage(loc(g.banner), 1600); g.bannerSm = s.url; g.bannerAnim = s.anim; g.bannerCard = cardShape === 'wide' ? (await smallImage(loc(g.banner), 720, 'jpg', true)).url : null; } // el banner animado se conserva para la cabecera
    }),
    ...collections.filter((c) => c.cover).map(async (c) => { const s = await smallImage(c.cover, 640); c.coverSm = s.url; c.coverAnim = s.anim; }),
  ]);
}


// ---------- Portadas horizontales de una sola imagen ----------
// Banner + logo se unen en una imagen ligera por juego (se guarda en disco): una tarjeta = una imagen, sin capas extra.
// Si todavía no está hecha, la tarjeta se ve como siempre (banner y logo) y se cambia sola cuando termina.
const compVariant = () => (hideNames ? 'n' : 't');
const isLocal = (p) => typeof p === 'string' && /^(?:[a-zA-Z]:[\\/]|\/)/.test(p);
async function compLookup(g) {
  if (cardShape !== 'wide' || !wideLogos || g.logoOff || !g.logo || !g.banner || !window.api.imgComp) { g.compCard = null; return; }
  const b = g.bannerCard || g.bannerSm || g.banner, l = g.logoSm || g.logo;
  if (!isLocal(b) || !isLocal(l)) { g.compCard = null; return; }
  const r = await window.api.imgComp(b, l, compVariant());
  g.compCard = r && r.path ? r.path : null; g.compNeed = r && r.need ? { b, l, out: r.out } : null;
}
async function compMake(g) {
  const n = g.compNeed; if (!n) return false;
  const load = async (p) => { const im = new Image(); im.src = fileUrl(p); await im.decode(); return im; };
  const [bi, li] = await Promise.all([load(n.b), load(n.l)]);
  const W = 640, H = 360, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  const k = Math.max(W / bi.naturalWidth, H / bi.naturalHeight), bw = bi.naturalWidth * k, bh = bi.naturalHeight * k;
  x.drawImage(bi, (W - bw) / 2, (H - bh) / 2, bw, bh);
  x.save(); x.translate(W * .5, H * .38); x.scale(1, .62); // mismo oscurecimiento suave del centro que antes hacía el CSS
  const rg = x.createRadialGradient(0, 0, 0, 0, 0, W * .45); rg.addColorStop(0, 'rgba(0,0,0,.38)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = rg; x.fillRect(-W, -H * 2, W * 2, H * 4); x.restore();
  const box = hideNames ? { x: .08, y: .08, w: .84, h: .84 } : { x: .08, y: .12, w: .84, h: .54 };
  const bx = W * box.x, by = H * box.y, bwid = W * box.w, bhei = H * box.h, m = Math.min(bwid / li.naturalWidth, bhei / li.naturalHeight, 1.6);
  const lw = li.naturalWidth * m, lh = li.naturalHeight * m;
  x.drawImage(li, bx + (bwid - lw) / 2, by + (bhei - lh) / 2, lw, lh);
  const ok = await window.api.imgStore(n.out, c.toDataURL('image/jpeg', 0.86));
  if (ok) { g.compCard = n.out; g.compNeed = null; }
  return ok;
}
// En segundo plano (de 2 en 2, sin molestar al desplazarte) hace las que faltan y cambia la tarjeta que ya está en pantalla
let compToken = 0;
function compBackground(games) {
  const tok = ++compToken;
  const todo = games.filter((g) => g.compNeed);
  let i = 0;
  const next = async () => {
    if (tok !== compToken) return;
    if (Date.now() - lastScroll < 500 || document.hidden) { setTimeout(next, 400); return; }
    const g = todo[i++]; if (!g) return;
    try {
      if (await compMake(g)) {
        const card = document.querySelector(`#grid .card[data-id="${CSS.escape(g.id)}"]`);
        if (card && cardShape === 'wide') { // se cambia solo la imagen, ya cargada, sin rehacer la tarjeta (así no parpadea)
          const img = card.querySelector('img:not(.card-logo)');
          if (img) {
            const pre = new Image(); pre.src = fileUrl(g.compCard);
            let ready = true; try { await pre.decode(); } catch { ready = false; }
            if (ready) { img.src = pre.src; card.querySelector('.card-logo')?.remove(); card.classList.remove('has-logo'); }
          }
        }
      }
    } catch { /* se queda con banner y logo por separado */ }
    setTimeout(next, 30);
  };
  next(); next();
}

// Control de qué tarjetas se mueven (modos 'few' y 'hover'): al pasar el ratón siempre; y en 'few' además
// unas pocas de las que se ven en pantalla. Fuera de pantalla o con la ventana oculta todo queda quieto.
const animCards = new Map(); // tarjeta -> { img, still, anim, visible, hover, cur }
const animIO = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((entries) => {
  for (const e of entries) { const s = animCards.get(e.target); if (s) s.visible = e.isIntersecting; }
  refreshAnim();
}) : null;
function refreshAnim() {
  for (const [c] of animCards) if (!c.isConnected) { if (animIO) animIO.unobserve(c); animCards.delete(c); }
  const playing = new Set();
  if (animMode === 'few' && !document.hidden) {
    [...animCards.entries()].filter(([, s]) => s.visible)
      .sort((a, b) => (a[0].compareDocumentPosition(b[0]) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1))
      .slice(0, ANIM_BUDGET).forEach(([c]) => playing.add(c));
  }
  for (const [c, s] of animCards) {
    const want = (playing.has(c) || s.hover) && !document.hidden ? s.anim : s.still;
    if (s.cur !== want) { s.img.src = want; s.cur = want; }
  }
}
document.addEventListener('visibilitychange', refreshAnim);
function wireAnim(card, animSrc) {
  const img = card.querySelector('img[data-anim]');
  if (!img || animMode === 'all') return;
  const s = { img, still: img.src, anim: imgUrl(animSrc), visible: false, hover: false, cur: img.src };
  animCards.set(card, s);
  card.addEventListener('mouseenter', () => { s.hover = true; refreshAnim(); });
  card.addEventListener('mouseleave', () => { s.hover = false; refreshAnim(); });
  if (animIO && animMode === 'few') animIO.observe(card);
}

function coverSrc(g) {
  const c = g.coverSm || g.cover;
  return c ? imgUrl(c) : null;
}

function colorFor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `linear-gradient(135deg, hsl(${h} 55% 38%), hsl(${(h + 50) % 360} 60% 22%))`;
}

function formatPlayTime(min) {
  if (!min) return '';
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h ${m} min jugados` : `${m} min jugados`;
}

function formatLastPlayed(ts) {
  if (!ts) return 'Nunca jugado';
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return 'Jugado hoy';
  if (days === 1) return 'Jugado ayer';
  if (days < 30) return `Jugado hace ${days} días`;
  return 'Jugado hace más de un mes';
}

// Textos de la barra de acción (como en Steam)
function formatLastSession(ts) {
  if (!ts) return 'Nunca';
  const d = new Date(ts);
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
}
// Espacio en disco
function fmtBytes(b) {
  if (!Number.isFinite(b)) return '';
  if (b >= 1024 ** 3) return (b / 1024 ** 3).toFixed(b >= 10 * 1024 ** 3 ? 0 : 1).replace('.', ',') + ' GB';
  if (b >= 1024 ** 2) return Math.round(b / 1024 ** 2) + ' MB';
  return Math.max(1, Math.round(b / 1024)) + ' KB';
}
let diskScanning = false;
function applyDisk(sizes) {
  if (sizes) for (const g of state.games) { const b = sizes[g.id]; if (Number.isFinite(b)) g.diskBytes = b; }
}
function onDiskChanged(p) {
  if (!p) return;
  diskScanning = !!p.scanning; applyDisk(p.sizes);
  if (state.filter === 'stats' && !state.detailId) renderStats();
  else if (!p.scanning && state.sort === 'diskSize') render();
}
window.api.onDiskChanged && window.api.onDiskChanged(onDiskChanged);
function formatHoursStat(min) {
  if (!min) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 6) / 10; // un decimal
  return `${String(h).replace('.', ',')} horas`;
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) { if (typeof text === 'string' && text.includes('[[')) rich(e, text); else e.textContent = text; }
  return e;
}

// ---------- Menú contextual (para los botones de icono y el clic derecho) ----------
let menuEl = null;
function closeMenu() {
  if (menuEl) { menuEl.remove(); menuEl = null; }
}
// `anchor` puede ser un elemento o un punto { x, y }
function showMenu(anchor, items) {
  closeMenu();
  const m = el('div', 'ctx-menu');
  for (const it of items) {
    if (it.sep) { m.append(el('div', 'ctx-sep')); continue; }
    if (it.node) { m.append(it.node); continue; } // contenido propio (p. ej. controles del logotipo)
    const b = el('button', null);
    if (it.icon !== undefined) {
      const slot = el('span', 'mi');
      if (it.icon && UI_ICONS[it.icon]) slot.append(iconEl(it.icon)); else slot.textContent = it.icon || '';
      b.append(slot);
    }
    b.append(document.createTextNode(it.label));
    b.onclick = () => { closeMenu(); it.run(); };
    m.append(b);
  }
  document.body.append(m);
  menuEl = m;

  const isEl = typeof anchor.getBoundingClientRect === 'function';
  const r = isEl ? anchor.getBoundingClientRect() : { left: anchor.x, right: anchor.x, top: anchor.y, bottom: anchor.y };
  const mw = m.offsetWidth, mh = m.offsetHeight;
  let left = isEl ? r.right - mw : r.left;
  let top = r.bottom + 6;
  left = Math.max(8, Math.min(left, window.innerWidth - mw - 8));
  if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 6);
  top = Math.max(8, Math.min(top, window.innerHeight - mh - 8));
  m.style.left = left + 'px';
  m.style.top = top + 'px';
}
document.addEventListener('mousedown', (e) => { if (menuEl && !menuEl.contains(e.target)) closeMenu(); });
window.addEventListener('blur', closeMenu);

// ---------- Seguimiento: estado y etiquetas propias de cada juego ----------
const PLAY_STATUS = [
  { id: 'backlog', label: 'Pendiente', color: '#e0a93b' },
  { id: 'playing', label: 'Jugando', color: '#4fd08a' },
  { id: 'done', label: 'Completado', color: '#5aa7ff' },
  { id: 'dropped', label: 'Abandonado', color: '#9a9db8' },
];
const statusDef = (id) => PLAY_STATUS.find((x) => x.id === id) || null;
const gameTags = (g) => (Array.isArray(g.tags) ? g.tags : []);

// ---------- Juegos repetidos (ver dupes.js) ----------
let mergeDupes = true;
let ubiVia = true;
const groupIds = (g) => g.group || [g.id];
const inColl = (c, g) => groupIds(g).some((id) => c.games.includes(id));
// En «todos», favoritos, recientes y colecciones los repetidos se ven una sola vez; dentro de una biblioteca, cada uno lo suyo
const mixedView = () => !SOURCES.some((x) => state.filter === x.id || state.filter.startsWith(x.id + ':')) && state.f.sources.size === 0;
const runStateFor = (g) => (runState && groupIds(g).includes(runState.id) ? runState : null);
// Favorito de una ficha unida: si lo es en alguna biblioteca, quitarlo lo quita en todas
async function toggleFav(g) {
  const ids = groupIds(g);
  if (ids.length > 1 && g.favorite) {
    for (const m of state.games.filter((x) => ids.includes(x.id))) if (m === g ? g.ownFavorite : m.favorite) await window.api.toggleFavorite(m.id);
  } else await window.api.toggleFavorite(g.id);
  await load();
}

// ---------- Filtrado ----------
function visibleGames() {
  const q = state.query.trim().toLowerCase();
  let list = state.games.filter((g) => {
    if (state.filter === 'hidden') return g.hidden;
    if (g.hidden) return false;
    if (g.dupOf && (g.viaStore || mixedView())) return false; // el vinculado desde otra tienda ya se ve en la ficha de esa tienda
    // «Solo instalados» solo afecta a la página principal; en las demás secciones se ve todo
    // ...ni cuando hay algún filtro del panel activo (así «Todos» muestra de verdad todos)
    if (onlyInstalled && state.filter === 'all' && activeFilterCount() === 0 && g.installed === false) return false;
    switch (state.filter) {
      case 'all': case 'collections': case 'stats': case 'free': case 'events': case 'wish': case 'community': return true; // en «colecciones» la lista lateral muestra todos
      case 'favorites': return g.favorite;
      case 'recent': return !!g.lastPlayed;
      case 'notinstalled': return g.installed === false;
      default: {
        if (state.filter.startsWith('col:')) { const c = collections.find((x) => 'col:' + x.id === state.filter); return !!c && inColl(c, g); }
        const [src, st] = state.filter.split(':'); // «steam» o «steam:installed» / «steam:notinstalled»
        if (g.source !== src) return false;
        return !st || (st === 'notinstalled') === (g.installed === false);
      }
    }
  });
  if (q) list = list.filter((g) => g.name.toLowerCase().includes(q) || gameTags(g).some((t) => t.toLowerCase().includes(q)));
  if (state.filter !== 'collections' && state.filter !== 'stats' && state.filter !== 'free' && state.filter !== 'events' && state.filter !== 'wish' && state.filter !== 'community') list = list.filter(matchesFilters);

  const by = {
    name: (a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }),
    lastPlayed: (a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0) || by.name(a, b),
    playTime: (a, b) => (b.playTime || 0) - (a.playTime || 0) || by.name(a, b),
    diskSize: (a, b) => (b.diskBytes || 0) - (a.diskBytes || 0) || by.name(a, b),
    nameDesc: (a, b) => by.name(b, a),
    releaseDate: (a, b) => releaseKey(b) - releaseKey(a) || by.name(a, b),
    releaseOld: (a, b) => (releaseKey(a) || Infinity) - (releaseKey(b) || Infinity) || by.name(a, b),
    metacritic: (a, b) => ((b.info && b.info.metacritic) || 0) - ((a.info && a.info.metacritic) || 0) || by.name(a, b),
    achievements: (a, b) => ((b.achievements && b.achievements.unlocked) || 0) - ((a.achievements && a.achievements.unlocked) || 0) || by.name(a, b),
  };
  const sort = state.filter === 'recent' && state.sort === 'name' ? 'lastPlayed' : state.sort;
  return list.sort(by[sort]);
}

// ---------- Filtros avanzados (botón del embudo) ----------
function releaseKey(g) { // fecha de lanzamiento como número (0 si no se sabe)
  const s = g.info && g.info.releaseDate;
  if (!s) return 0;
  const t = Date.parse(s);
  if (Number.isFinite(t)) return t;
  const y = /(\d{4})/.exec(String(s));
  return y ? Date.UTC(+y[1], 0, 1) : 0;
}
const TIME_RANGES = { none: [0, 1], u1: [1, 60], h10: [60, 600], h50: [600, 3000], h50p: [3000, Infinity] };
function matchesFilters(g) {
  const f = state.f;
  if (f.sources.size && !f.sources.has(g.source)) return false;
  if (f.status === 'installed' && g.installed === false) return false;
  if (f.status === 'notinstalled' && g.installed !== false) return false;
  if (f.fav && !g.favorite) return false;
  if (f.time !== 'all') { const m = g.playTime || 0, [lo, hi] = TIME_RANGES[f.time]; if (m < lo || m >= hi) return false; }
  if (f.ach !== 'all') {
    const a = g.achievements;
    if (!a || !a.total) return false; // solo se conocen los logros de los juegos que ya abriste
    const done = a.unlocked === a.total;
    if (f.ach === 'done' && !done) return false;
    if (f.ach === 'progress' && !(a.unlocked > 0 && !done)) return false;
    if (f.ach === 'none' && a.unlocked > 0) return false;
  }
  if (f.genres.size && !((g.info && g.info.genres) || []).some((x) => f.genres.has(x))) return false;
  const inf = g.info;
  if (f.info === 'with' && !inf) return false;
  if (f.info === 'without' && inf) return false;
  if (f.info === 'trailer' && !((inf && inf.movies && inf.movies.length) || g.customTrailer)) return false;
  if (f.meta && !(inf && inf.metacritic >= f.meta)) return false;
  if (f.play === 'none' ? !!g.status : (f.play !== 'all' && g.status !== f.play)) return false;
  if (f.tags.size && ![...f.tags].some((t) => gameTags(g).includes(t))) return false;
  if (f.colls.size && ![...f.colls].some((id) => { const c = collections.find((x) => x.id === id); return c && inColl(c, g); })) return false;
  return true;
}
function activeFilterCount() {
  const f = state.f;
  return f.sources.size + f.genres.size + f.colls.size + (f.status !== 'all') + (f.time !== 'all') + (+f.fav) + (f.ach !== 'all') + (f.info !== 'all') + (f.meta ? 1 : 0) + f.tags.size + (f.play !== 'all');
}
function updateFilterBtn() {
  const n = activeFilterCount();
  $('#filterCount').textContent = n || ''; $('#filterCount').classList.toggle('hidden', !n);
  $('#filterBtn').classList.toggle('on', n > 0 || !!filterPanelEl);
  $('#filterBtn').title = n ? `Filtrar y ordenar (${n} ${n === 1 ? 'filtro activo' : 'filtros activos'})` : 'Filtrar y ordenar';
}
let filterPanelEl = null; // barra lateral derecha (existe siempre; se muestra u oculta)
function closeFilter() {
  if (!filterPanelEl) return;
  filterPanelEl.classList.remove('open'); filterPanelEl = null;
  $('#filterSide').setAttribute('aria-hidden', 'true');
  $('#filterBtn').classList.toggle('on', activeFilterCount() > 0);
  try { window.api.setSettings({ filterOpen: false }); } catch {}
}
function openFilter() {
  if (filterPanelEl) { closeFilter(); return; }
  filterPanelEl = $('#filterSide');
  filterPanelEl.classList.add('open'); filterPanelEl.setAttribute('aria-hidden', 'false');
  buildFilterPanel();
  $('#filterBtn').classList.add('on');
  try { window.api.setSettings({ filterOpen: true }); } catch {}
}
function buildFilterPanel() {
  const p = filterPanelEl; if (!p) return;
  const body = p.querySelector('.fbody'); const keep = body.scrollTop;
  const f = state.f;
  const refresh = () => { render(); buildFilterPanel(); updateFilterBtn(); };
  const chip = (label, on, click, title, kind = 'check') => { const b = el('button', 'fchip frow ' + kind + (on ? ' on' : '')); b.append(el('span', 'fbox'), el('span', 'flabel', label)); b.setAttribute('role', kind === 'radio' ? 'radio' : 'checkbox'); b.setAttribute('aria-checked', on ? 'true' : 'false'); b.type = 'button'; if (title) b.title = title; b.onclick = click; return b; };
  const group = (title, hint, chips) => {
    const s = el('div', 'fgroup');
    s.append(el('div', 'fgroup-title', title));
    if (hint) s.append(el('div', 'fhint', hint));
    s.append(el('div', 'fchips'));
    s.lastChild.append(...chips);
    return s;
  };
  const single = (key, opts) => opts.map(([v, label]) => chip(label, f[key] === v, () => { f[key] = v; refresh(); }, null, 'radio'));
  const multi = (set, items) => items.map(([v, label]) => chip(label, set.has(v), () => { if (set.has(v)) set.delete(v); else set.add(v); refresh(); }));

  const clear = el('button', 'ghost small', '[[undo]] Limpiar filtros');
  clear.type = 'button'; clear.disabled = activeFilterCount() === 0;
  clear.onclick = () => { state.f = newFilters(); refresh(); };

  const sortOpts = [...$('#sort').options].map((o) => [o.value, o.textContent]);
  const sorts = group('Ordenar por', '', sortOpts.map(([v, label]) => chip(label, state.sort === v, () => { $('#sort').value = v; $('#sort').dispatchEvent(new Event('change')); buildFilterPanel(); }, null, 'radio')));

  const srcs = SOURCES.filter((s) => state.games.some((g) => g.source === s.id));
  const genreCount = new Map();
  for (const g of state.games) for (const x of (g.info && g.info.genres) || []) genreCount.set(x, (genreCount.get(x) || 0) + 1);
  const genres = [...genreCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es')).slice(0, 40);

  const tagCount = new Map();
  for (const g of state.games) for (const x of gameTags(g)) tagCount.set(x, (tagCount.get(x) || 0) + 1);
  const tagList = [...tagCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'));

  const closeB = el('button', 'icon-btn fclose', '[[x]]'); closeB.type = 'button'; closeB.title = 'Cerrar (Esc)'; closeB.onclick = closeFilter;
  p.querySelector('.fhead').replaceChildren(el('strong', null, 'Filtrar y ordenar'), el('span', 'fcount', `${visibleGames().length} juegos`), clear, closeB);
  body.replaceChildren(sorts,
    group('Biblioteca', '', multi(f.sources, srcs.map((s) => [s.id, s.name]))),
    group('Estado', '', single('status', [['all', 'Todos'], ['installed', 'Instalados'], ['notinstalled', 'No instalados']])),
    group('Mi seguimiento', '', single('play', [['all', 'Todos'], ...PLAY_STATUS.map((x) => [x.id, x.label]), ['none', 'Sin estado']])),
    ...(tagList.length ? [group('Etiquetas', 'Los que tengan cualquiera de las elegidas.', multi(f.tags, tagList.map(([x, n]) => [x, `${x} · ${n}`])))] : []),
    group('Favoritos', '', [chip('Solo favoritos', f.fav, () => { f.fav = !f.fav; refresh(); })]),
    group('Tiempo jugado', '', single('time', [['all', 'Cualquiera'], ['none', 'Sin jugar'], ['u1', 'Menos de 1 h'], ['h10', '1 – 10 h'], ['h50', '10 – 50 h'], ['h50p', 'Más de 50 h']])),
    group('Logros', 'Cuentan los juegos de Steam y Epic cuyos logros ya se descargaron (al abrir su página o en segundo plano).', single('ach', [['all', 'Cualquiera'], ['done', '100 % completados'], ['progress', 'En progreso'], ['none', 'Sin empezar']])),
    ...(genres.length ? [group('Género', 'Muestra los juegos que tengan cualquiera de los elegidos.', multi(f.genres, genres.map(([x, n]) => [x, `${x} · ${n}`])))] : []),
    group('Información', '', single('info', [['all', 'Cualquiera'], ['with', 'Con información'], ['without', 'Sin información'], ['trailer', 'Con tráiler']])),
    group('Puntuación Metacritic', '', single('meta', [[0, 'Cualquiera'], [70, '70 o más'], [80, '80 o más'], [90, '90 o más']])),
    ...(collections.length ? [group('Colección', 'Los que estén en cualquiera de las elegidas.', multi(f.colls, sortedCollections().map((c) => [c.id, c.name])))] : []),
  );
  body.scrollTop = keep;
}
$('#filterBtn').onclick = openFilter;

// Los filtros por biblioteca se generan solos: solo aparecen las que tienen juegos
function renderSourceFilters(counts) {
  const defs = SOURCES.filter((s) => counts[s.id] > 0 || state.filter === s.id || state.filter.startsWith(s.id + ':'));
  const mk = (filter, labelNode, cls) => {
    const b = el('button', 'filter' + (cls ? ' ' + cls : ''));
    b.dataset.filter = filter;
    const label = el('span', 'flabel');
    label.append(labelNode);
    const count = el('span', 'count');
    count.dataset.count = filter;
    b.append(label, count);
    return b;
  };
  const rows = [];
  for (const s of defs) {
    const logo = sourceIcon(s.id, 15);
    logo.style.color = s.color;
    const lab = el('span'); lab.style.display = 'contents'; lab.append(logo, document.createTextNode(s.name));
    const row = el('div', 'src-row');
    row.append(mk(s.id, lab));
    rows.push(row);
  }
  $('#sourceFilters').replaceChildren(...rows);
}

const sortedCollections = () => collections.slice().sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base', numeric: true }));
function renderCollections(counts) {
  if (state.filter.startsWith('col:') && !collections.some((c) => 'col:' + c.id === state.filter)) state.filter = 'all';
  const box = $('#collList');
  if (!collections.length) { box.replaceChildren(el('p', 'hint coll-empty', 'Crea colecciones para agrupar juegos a tu gusto.')); return; }
  const nodes = [];
  for (const c of sortedCollections()) {
    const b = el('button', 'filter');
    b.dataset.filter = 'col:' + c.id;
    b.title = c.name + ' · clic derecho para renombrar o eliminar';
    const label = el('span', 'flabel');
    label.append(collIcon(c), document.createTextNode(c.name));
    const count = el('span', 'count', String(counts['col:' + c.id] || 0));
    count.dataset.count = 'col:' + c.id;
    b.append(label, count);
    b.oncontextmenu = (e) => { e.preventDefault(); showMenu({ x: e.clientX, y: e.clientY }, collMenuItems(c)); };
    // Lista desplegable con los juegos de la colección
    const games = state.games.filter((g) => !g.hidden && !g.dupOf && inColl(c, g))
      .sort((a, z) => a.name.localeCompare(z.name, 'es', { sensitivity: 'base', numeric: true }));
    const key = 'col:' + c.id;
    const open = games.length > 0 && !!navOpen[key];
    const row = el('div', 'src-row');
    row.append(b);
    if (games.length) {
      const chev = el('button', 'chev', open ? '[[chevD]]' : '[[chevR]]');
      chev.title = open ? 'Ocultar los juegos' : 'Ver los juegos de la colección';
      chev.dataset.chev = key;
      row.append(chev);
    }
    nodes.push(row);
    if (open) {
      for (const g of games) {
        const gb = el('button', 'cgame' + (g.installed === false ? ' ni' : '') + (state.detailId === g.id ? ' on' : ''), g.name);
        gb.dataset.gid = g.id;
        gb.title = g.name;
        gb.oncontextmenu = (e) => { e.preventDefault(); showMenu({ x: e.clientX, y: e.clientY }, gameMenuItems(g, state.detailId === g.id)); };
        nodes.push(gb);
      }
    }
  }
  box.replaceChildren(...nodes);
}

function updateCounts() {
  const visible = state.games.filter((g) => !g.hidden);
  const counts = {
    all: visible.filter((g) => !g.dupOf && (!onlyInstalled || g.installed !== false)).length, // solo la principal respeta el filtro
    favorites: visible.filter((g) => !g.dupOf && g.favorite).length,
    recent: visible.filter((g) => !g.dupOf && g.lastPlayed).length,
    hidden: state.games.filter((g) => g.hidden).length,
    free: (() => { try { return freeCount(); } catch { return 0; } })(),
    wish: (() => { try { return wishCount(); } catch { return 0; } })(),
    events: (() => { try { return evLive(); } catch { return 0; } })(),
  };
  for (const g of visible) {
    if (g.viaStore && g.dupOf) continue;
    counts[g.source] = (counts[g.source] || 0) + 1;
    const k = g.source + (g.installed === false ? ':notinstalled' : ':installed');
    counts[k] = (counts[k] || 0) + 1;
  }
  for (const c of collections) counts['col:' + c.id] = visible.filter((g) => !g.dupOf && inColl(c, g)).length;

  renderSourceFilters(counts);
  renderCollections(counts);
  document.querySelectorAll('[data-count]').forEach((e) => (e.textContent = counts[e.dataset.count] || (e.dataset.count === 'free' || e.dataset.count === 'events' || e.dataset.count === 'wish' ? '' : 0)));
  document.querySelectorAll('.filter').forEach((b) => b.classList.toggle('active', b.dataset.filter === state.filter));
  $('#collsLink').classList.toggle('active', state.filter === 'collections' && !state.detailId);
}

// ---------- Diagnóstico de rendimiento (para investigar cuando algo «se frena») ----------
const perf = { long: [], img: [], detail: [], palette: [], loaf: [] };
const viewNow = () => state.filter + (state.detailId ? ' > ' + state.detailId : '');
const perfObs = [];
const takeLong = (es) => { for (const e of es) perf.long.push({ at: Math.round(e.startTime), ms: Math.round(e.duration), view: viewNow() }); perf.long = perf.long.slice(-80); };
const takeImg = (es) => { for (const e of es) if (e.initiatorType === 'img' && e.duration > 200) perf.img.push({ at: Math.round(e.startTime), ms: Math.round(e.duration), kb: Math.round((e.encodedBodySize || 0) / 1024), url: decodeURIComponent(e.name).slice(-90) }); perf.img = perf.img.slice(-60); };
// «long-animation-frame» dice en qué se fue el tiempo de un fotograma lento: código, estilos/diseño o pintado
const takeLoaf = (es) => {
  for (const e of es) {
    if (e.duration < 100) continue;
    perf.loaf.push({ at: Math.round(e.startTime), ms: Math.round(e.duration), blocking: Math.round(e.blockingDuration || 0),
      render: Math.round(e.renderStart ? e.startTime + e.duration - e.renderStart : 0), layout: Math.round(e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0), view: viewNow(),
      scripts: (e.scripts || []).filter((s) => s.duration > 15).map((s) => `${Math.round(s.duration)}ms ${s.invoker || ''} ${s.sourceFunctionName || ''} ${String(s.sourceURL || '').split('/').pop()}:${s.sourceCharPosition}`) });
  }
  perf.loaf = perf.loaf.slice(-40);
};
for (const [type, take] of [['longtask', takeLong], ['resource', takeImg], ['long-animation-frame', takeLoaf]]) {
  try { const o = new PerformanceObserver((l) => take(l.getEntries())); o.observe({ type, buffered: true }); perfObs.push([o, take]); } catch { /* no disponible */ }
}
function perfReport() {
  for (const [o, take] of perfObs) take(o.takeRecords()); // entradas que aún no se habían entregado
  const g = state.games.find((x) => x.id === state.detailId);
  const L = ['Diagnóstico de rendimiento — Comptus ' + (document.getElementById('appVersion').textContent.match(/\d+\.\d+\.\d+/) || [''])[0], `Juegos: ${state.games.length} · vista actual: ${viewNow()}`];
  if (g) L.push(`Ficha abierta: ${g.name} · banner=${g.banner || '-'} · bannerAnim=${g.bannerAnim || '-'} · bannerSm=${g.bannerSm || '-'} · cover=${g.cover || '-'} · coverSm=${g.coverSm || '-'} · logo=${g.logo || '-'} · logoSm=${g.logoSm || '-'} · icon=${g.icon || '-'} · tráiler=${g.customTrailer ? 'propio' : (g.info && g.info.trailer ? 'sí' : 'no')}`);
  L.push('', `Pausas largas de la interfaz (>50 ms): ${perf.long.length}`, ...perf.long.slice(-25).map((x) => `  ${x.ms} ms · a los ${x.at} ms · ${x.view}`));
  L.push('', `Fotogramas lentos (>100 ms): ${perf.loaf.length}`, ...perf.loaf.slice(-12).flatMap((x) => [`  ${x.ms} ms (bloqueo ${x.blocking}) · a los ${x.at} ms · ${x.view} · pintado/estilos al final: ${x.render}/${x.layout} ms`, ...x.scripts.map((s) => '      ' + s)]));
  L.push('', 'Fichas dibujadas (ms):', ...perf.detail.slice(-15).map((x) => `  ${x.ms} ms · ${x.id}`));
  L.push('', `Imágenes lentas (>200 ms): ${perf.img.length}`, ...perf.img.slice(-20).map((x) => `  ${x.ms} ms · ${x.kb} KB · ${x.url}`));
  L.push('', `Colores de ficha calculados: ${perf.palette.length}`, ...perf.palette.slice(-15).map((x) => `  ${x.ms} ms · ${x.key}`));
  return L.join('\n');
}

// ---------- Transiciones suaves ----------
let couchStart = false, transitions = true, lastViewKey = null, padOn = true, saveAuto = true, saveKeep = 5;
function playIn(target) {
  if (!transitions) return;
  const e = typeof target === 'string' ? document.querySelector(target) : target;
  if (!e) return;
  e.classList.remove('view-in'); void e.offsetWidth; e.classList.add('view-in');
  clearTimeout(e._viewT); e._viewT = setTimeout(() => e.classList.remove('view-in'), 560); // también si se oculta a mitad (animationend no llegaría)
}

// ---------- Estadísticas ----------
// ¿Qué juego hoy?
{
  const modes = Random.MODES;
  $('#diceMode').replaceChildren(...modes.map((m) => { const o = document.createElement('option'); o.value = m.id; o.textContent = m.label; return o; }));
  let cur = null, seen = [];
  const st = (id) => { const d = statusDef(id); return d ? d.label : ''; };
  const draw = () => {
    const list = Random.pool(state.games, $('#diceMode').value, { skipDone: $('#diceSkip').checked });
    cur = Random.pick(list, seen);
    const box = $('#diceResult');
    for (const b of ['#diceAgain', '#diceView', '#dicePlay']) $(b).disabled = !cur;
    if (!cur) { box.replaceChildren(el('div', 'dice-empty', 'No hay juegos que cumplan eso. Prueba con otra opción.')); return; }
    seen.push(cur.id); if (seen.length > list.length) seen = [cur.id];
    const cv = el('div', 'dice-cover'); cv.append(makeCover(cur));
    const info = el('div', 'dice-info');
    info.append(el('div', 'dice-name', cur.name));
    const bits = [cur.source ? (SOURCES.find((s) => s.id === cur.source) || {}).name || cur.source : '', st(cur.status), cur.playTime ? formatPlayTime(cur.playTime) : 'Sin estrenar'].filter(Boolean);
    info.append(el('div', 'dice-meta', bits.join(' · ')), el('div', 'dice-meta', `${list.length} opción(es) en este grupo`));
    box.replaceChildren(cv, info);
  };
  const open = () => { seen = []; $('#diceModal').classList.remove('hidden'); draw(); };
  const close = () => $('#diceModal').classList.add('hidden');
  $('#diceBtn').onclick = open;
  $('#diceClose').onclick = close;
  $('#diceModal').onclick = (e) => { if (e.target.id === 'diceModal') close(); };
  $('#diceAgain').onclick = draw;
  $('#diceMode').onchange = () => { seen = []; draw(); window.api.setSettings({ diceMode: $('#diceMode').value }); };
  $('#diceSkip').onchange = () => { seen = []; draw(); window.api.setSettings({ diceSkip: $('#diceSkip').checked }); };
  $('#diceView').onclick = () => { if (cur) { close(); state.filter = 'all'; openDetail(cur.id); } };
  $('#dicePlay').onclick = () => { if (cur) { const g = cur; close(); launch(g); } };
  window.__diceRestore = (s) => { if (s && modes.some((m) => m.id === s.diceMode)) $('#diceMode').value = s.diceMode; if (s && s.diceSkip === false) $('#diceSkip').checked = false; };
}
$('#statsBtn').onclick = () => { state.filter = state.filter === 'stats' ? 'all' : 'stats'; state.detailId = null; render(); };
let statsYear = null, statsSessions = [], statsLoaded = false;
async function renderStats() {
  const box = $('#statsPage');
  if (!statsLoaded && window.api.statsSessions) { try { statsSessions = await window.api.statsSessions(); } catch { statsSessions = []; } statsLoaded = true; }
  if (state.filter !== 'stats' || state.detailId) return;
  const S = window.Stats, st = S.compute(state.games, statsSessions, { year: statsYear });
  const T = S.fmtTime;
  const card = (title, ...kids) => { const c = el('section', 'stat-card'); c.append(el('h3', null, title), ...kids); return c; };
  const tile = (value, label) => { const t = el('div', 'stat-tile'); t.append(el('b', null, value), el('span', null, label)); return t; };
  const note = (txt) => el('p', 'hint', txt);
  const srcDef = (id) => SOURCES.find((x) => x.id === id);

  const head = el('div', 'stats-head');
  head.append(el('h1', null, 'Estadísticas'));
  const tiles = el('div', 'stat-tiles');
  tiles.append(tile(T(st.totals.min), 'tiempo jugado en total'), tile(String(st.totals.played), `juegos jugados de ${st.totals.library}`),
    tile(String(st.totals.finished), 'completados'), tile(String(st.totals.backlog), 'instalados sin estrenar'));

  // Más jugados
  const topBody = el('div', 'sx-bar-list');
  const maxTop = st.top.length ? st.top[0].min : 1;
  st.top.forEach((g, i) => {
    const row = el('button', 'sx-bar-row'); row.type = 'button'; row.title = 'Abrir la página del juego';
    const fill = el('span', 'sx-bar-fill'); fill.style.width = Math.max(3, Math.round((g.min / maxTop) * 100)) + '%';
    const label = el('span', 'sx-bar-label'); label.append(el('i', null, String(i + 1)), el('span', 'sx-bar-name', g.name));
    row.append(fill, label, el('span', 'sx-bar-val', T(g.min)));
    row.onclick = () => openDetail(g.id);
    topBody.append(row);
  });
  if (!st.top.length) topBody.append(note('Aún no hay tiempo de juego registrado.'));

  // Por tienda
  const srcBody = el('div', 'sx-bar-list');
  const maxSrc = st.bySource.length ? st.bySource[0].min : 1;
  for (const s of st.bySource) {
    const d = srcDef(s.source);
    const row = el('div', 'sx-bar-row static');
    const fill = el('span', 'sx-bar-fill'); fill.style.width = Math.max(3, Math.round((s.min / maxSrc) * 100)) + '%';
    if (d && d.color) fill.style.background = `color-mix(in srgb, ${d.color} 55%, var(--text) 45%)`; fill.style.opacity = ".55";
    row.append(fill, el('span', 'sx-bar-label', d ? d.name : s.source), el('span', 'sx-bar-val', T(s.min)));
    srcBody.append(row);
  }
  if (!st.bySource.length) srcBody.append(note('Sin datos todavía.'));

  // Por estado
  const stBody = el('div', 'chip-row');
  for (const p of PLAY_STATUS) {
    const n = st.status[p.id] || 0;
    const c = el('span', 'st-chip'); c.style.setProperty('--sc', p.color); c.style.cursor = 'default'; c.textContent = `${p.label} · ${n}`;
    stBody.append(c);
  }

  // Meses del año
  const sel = el('select', 'stats-year');
  for (const y of st.years) { const o = el('option', null, String(y)); o.value = y; if (y === st.year) o.selected = true; sel.append(o); }
  sel.onchange = () => { statsYear = Number(sel.value); renderStats(); };
  const MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const maxM = Math.max(1, ...st.months);
  const cols = el('div', 'sx-col-chart');
  st.months.forEach((v, i) => {
    const c = el('div', 'sx-col'); c.title = `${MES[i]} ${st.year}: ${T(v)}`;
    const bar = el('span', 'sx-col-bar'); bar.style.height = v ? Math.max(4, Math.round((v / maxM) * 100)) + '%' : '0';
    c.append(el('em', null, v ? T(v) : ''), bar, el('small', null, MES[i]));
    cols.append(c);
  });
  const yearInfo = el('p', 'hint', st.sessionsYear
    ? `${T(st.yearMin)} en ${st.sessionsYear} ${st.sessionsYear === 1 ? 'sesión' : 'sesiones'} · ${st.gamesYear} ${st.gamesYear === 1 ? 'juego' : 'juegos'} · sesión media ${T(st.avgSession)}${st.longest ? ` · la más larga: ${T(st.longest.min)} en ${st.longest.name}` : ''}`
    : 'Sin sesiones registradas este año.');
  const monthCard = card('Por mes', sel, cols, yearInfo);
  monthCard.classList.add('wide');
  if (!st.hasSessions) monthCard.append(note('Comptus empezó a apuntar las sesiones desde esta versión: este gráfico se irá llenando solo cada vez que juegues desde Comptus.'));

  // Últimos 14 días
  const maxD = Math.max(1, ...st.days.map((d) => d.min));
  const dcols = el('div', 'sx-col-chart small');
  for (const d of st.days) {
    const dt = new Date(d.t);
    const c = el('div', 'sx-col'); c.title = `${dt.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' })}: ${T(d.min)}`;
    const bar = el('span', 'sx-col-bar'); bar.style.height = d.min ? Math.max(4, Math.round((d.min / maxD) * 100)) + '%' : '0';
    c.append(bar, el('small', null, String(dt.getDate())));
    dcols.append(c);
  }
  const recent = card('Últimos 14 días', dcols, el('p', 'hint', `Esta semana: ${T(st.weekMin)}`));

  // Más jugados del año
  const yTop = el('div', 'sx-bar-list');
  const maxY = st.topYear.length ? st.topYear[0].min : 1;
  st.topYear.forEach((g, i) => {
    const row = el('button', 'sx-bar-row'); row.type = 'button';
    const fill = el('span', 'sx-bar-fill'); fill.style.width = Math.max(3, Math.round((g.min / maxY) * 100)) + '%';
    const label = el('span', 'sx-bar-label'); label.append(el('i', null, String(i + 1)), el('span', 'sx-bar-name', g.name));
    row.append(fill, label, el('span', 'sx-bar-val', T(g.min)));
    if (state.games.some((x) => x.id === g.id)) row.onclick = () => openDetail(g.id);
    yTop.append(row);
  });
  if (!st.topYear.length) yTop.append(note('Sin sesiones este año.'));

  // Espacio en disco (todas las tiendas)
  const sized = state.games.filter((g) => g.installed !== false && !g.hidden && Number.isFinite(g.diskBytes) && g.diskBytes > 0).sort((a, b) => b.diskBytes - a.diskBytes);
  const totalB = sized.reduce((n, g) => n + g.diskBytes, 0);
  const diskBody = el('div', 'sx-disk');
  const dTiles = el('div', 'stat-tiles');
  dTiles.append(tile(sized.length ? fmtBytes(totalB) : '—', 'ocupan tus juegos instalados'), tile(String(sized.length), 'juegos medidos'));
  const bySrc = new Map();
  for (const g of sized) bySrc.set(g.source, (bySrc.get(g.source) || 0) + g.diskBytes);
  const srcRows = el('div', 'sx-bar-list');
  const maxS = Math.max(1, ...bySrc.values());
  for (const [s, b] of [...bySrc.entries()].sort((a, b) => b[1] - a[1])) {
    const d = srcDef(s); const row = el('div', 'sx-bar-row static');
    const fill = el('span', 'sx-bar-fill'); fill.style.width = Math.max(3, Math.round((b / maxS) * 100)) + '%';
    if (d && d.color) fill.style.background = `color-mix(in srgb, ${d.color} 55%, var(--text) 45%)`; fill.style.opacity = '.55';
    row.append(fill, el('span', 'sx-bar-label', (d ? d.name : s)), el('span', 'sx-bar-val', `${fmtBytes(b)} · ${Math.round((b / totalB) * 100)}%`));
    srcRows.append(row);
  }
  const topRows = el('div', 'sx-bar-list');
  sized.slice(0, 15).forEach((g, i) => {
    const row = el('button', 'sx-bar-row'); row.type = 'button'; row.title = 'Abrir la página del juego';
    const fill = el('span', 'sx-bar-fill'); fill.style.width = Math.max(3, Math.round((g.diskBytes / sized[0].diskBytes) * 100)) + '%';
    const label = el('span', 'sx-bar-label'); label.append(el('i', null, String(i + 1)), el('span', 'sx-bar-name', g.name));
    row.append(fill, label, el('span', 'sx-bar-val', fmtBytes(g.diskBytes)));
    row.onclick = () => openDetail(g.id);
    topRows.append(row);
  });
  const rescan = el('button', null, diskScanning ? 'Midiendo…' : 'Recalcular tamaños'); rescan.type = 'button'; rescan.disabled = diskScanning;
  rescan.onclick = () => { diskScanning = true; window.api.diskScan(true); renderStats(); };
  diskBody.append(dTiles, srcRows, el('div', 'section-label', 'Los que más ocupan'), topRows, rescan);
  if (!sized.length) diskBody.append(note(diskScanning ? 'Midiendo las carpetas de tus juegos… puede tardar unos minutos la primera vez.' : 'Aún no hay tamaños medidos: Comptus los calcula en segundo plano unos segundos después de abrir.'));
  const diskCard = card('Espacio en disco', diskBody); diskCard.classList.add('wide');
  const grid2 = el('div', 'stats-grid');
  grid2.append(card('Más jugados de siempre', topBody), card(`Más jugados en ${st.year}`, yTop), monthCard, recent, card('Por tienda', srcBody), card('Mis estados', stBody), diskCard);
  box.replaceChildren(head, tiles, grid2);
  box.scrollTop = 0;
}
window.api.onChanged && window.api.onChanged(() => { statsLoaded = false; });

// ---------- Juegos gratis ----------
let freeData = null, freeLoading = false, freeCountrySel = '';
const freeCount = () => (freeData ? [...freeData.epic, ...freeData.steam, ...(freeData.other || [])].filter((x) => x.status === 'now' && !x.owned && x.kind !== 'dlc' && x.kind !== 'extra').length : 0);
async function loadFree(force) {
  if (!window.api.freeGet || freeLoading) return;
  freeLoading = true; if (state.filter === 'free') renderFree();
  try { freeData = await window.api.freeGet(!!force); } catch { /* sin conexión */ }
  freeLoading = false;
  updateCounts();
  if (state.filter === 'free' && !state.detailId) renderFree();
}
function freeWhen(it) {
  const f = (t) => new Date(t).toLocaleString('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  if (it.status === 'soon') return it.start ? `Gratis desde el ${f(it.start)}` : 'Próximamente';
  if (!it.end) return 'Gratis por tiempo limitado';
  const ms = it.end - Date.now(), h = Math.floor(ms / 3600000);
  const left = h >= 48 ? `${Math.floor(h / 24)} días` : h >= 1 ? `${h} h` : 'menos de 1 h';
  return `Gratis hasta el ${f(it.end)} (quedan ${left})`;
}
function renderFree() {
  const box = $('#freePage');
  const head = el('div', 'fr-head');
  const reload = el('button', null, freeLoading ? 'Actualizando…' : 'Actualizar'); reload.type = 'button'; reload.disabled = freeLoading; reload.onclick = () => loadFree(true);
  const sel = el('select'); sel.title = 'País de las ofertas y los precios';
  const COUNTRIES = [['CO', 'Colombia'], ['MX', 'México'], ['AR', 'Argentina'], ['CL', 'Chile'], ['PE', 'Perú'], ['EC', 'Ecuador'], ['UY', 'Uruguay'], ['VE', 'Venezuela'], ['BO', 'Bolivia'], ['PY', 'Paraguay'], ['PA', 'Panamá'], ['CR', 'Costa Rica'], ['GT', 'Guatemala'], ['DO', 'Rep. Dominicana'], ['BR', 'Brasil'], ['ES', 'España'], ['US', 'Estados Unidos'], ['GB', 'Reino Unido'], ['DE', 'Alemania'], ['FR', 'Francia'], ['CA', 'Canadá']];
  const detected = freeData && freeData.country;
  sel.append(Object.assign(document.createElement('option'), { value: '', textContent: 'País: automático' + (detected && freeData.auto ? ` (${(COUNTRIES.find((c) => c[0] === detected) || [0, detected])[1]})` : '') }));
  for (const [code, name] of COUNTRIES) sel.append(Object.assign(document.createElement('option'), { value: code, textContent: name }));
  sel.value = freeCountrySel;
  sel.onchange = () => { freeCountrySel = sel.value; window.api.setSettings({ freeCountry: sel.value || null }).then(() => loadFree(true)); };
  head.append(el('h1', null, 'Juegos gratis'), el('span', 'fr-fill'), sel, reload);
  head.children[1].style.flex = '1';
  const info = el('p', 'hint', freeData && freeData.updated ? `Ofertas temporales de Epic Games y Steam (los precios salen en la moneda que cada tienda use para el país elegido) · actualizado ${new Date(freeData.updated).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}. Para conservarlos hay que reclamarlos en la tienda antes de que termine la oferta.` : 'Ofertas temporales de Epic Games y Steam.');
  const STORE_COLOR = { steam: '#66c0f4', epic: '#e8e8e8', ubisoft: '#4a9bff', xbox: '#52b043', ea: '#ff4747', battlenet: '#00aeff', itch: '#fa5c5c', prime: '#00a8e1', rockstar: '#fcaf17', other: '#9aa0b4' };
  const sec = (title, items, empty, icon) => {
    const s = el('section', 'fr-sec'); const h2 = el('h2'); if (icon) { const ic = sourceIcon(icon, 20); ic.style.color = STORE_COLOR[icon] || ''; h2.append(ic); } h2.append(document.createTextNode(title)); s.append(h2);
    if (!items.length) { s.append(el('p', 'hint', empty)); return s; }
    const g = el('div', 'fr-grid');
    for (const it of items) {
      const c = el('div', 'fr-card'); const img = el('div', 'fr-img');
      if (it.image) img.style.backgroundImage = `url("${it.image}")`;
      const tag = el('span', 'chip fr-tag', it.store === 'epic' ? 'Epic Games' : it.store === 'steam' ? 'Steam' : (it.storeName || 'Otra tienda'));
      const kindLbl = it.kind === 'dlc' ? 'DLC' : it.kind === 'extra' ? 'Contenido extra' : it.kind === 'game' ? 'Juego' : it.store === 'steam' ? 'Tipo sin confirmar' : '';
      const kt = kindLbl ? el('span', 'chip fr-tag fr-kind ' + (it.kind === 'game' ? 'game' : it.kind ? 'dlc' : 'unk'), kindLbl) : null;
      { const ic = sourceIcon(it.store, 13); ic.style.color = STORE_COLOR[it.store] || ''; tag.prepend(ic); }
      const tags = el('div', 'fr-tags'); tags.append(tag); if (kt) tags.append(kt); img.append(tags);
      const body = el('div', 'fr-body');
      body.append(el('div', 'fr-title', it.title));
      if (it.base) body.append(el('div', 'fr-meta', 'Necesita el juego «' + it.base + '»'));
      const when = el('div', 'fr-meta', freeWhen(it));
      if (it.price) when.append(document.createTextNode(' · '), Object.assign(document.createElement('s'), { textContent: it.price }));
      body.append(when);
      const act = el('div', 'fr-actions');
      if (it.owned) act.append(el('span', 'fr-owned', '✓ Ya la tienes'));
      const b = el('button', it.owned ? 'ghost' : 'primary', it.status === 'soon' ? 'Ver en la tienda' : it.store === 'epic' ? 'Reclamar en Epic' : it.store === 'steam' ? 'Ver en Steam' : 'Reclamar'); b.type = 'button';
      b.onclick = () => window.api.freeOpen(it.url, it.app);
      act.append(b); body.append(act); c.append(img, body); g.append(c);
    }
    s.append(g); return s;
  };
  const otherSecs = () => {
    const by = new Map();
    for (const x of freeData.other || []) { if (!by.has(x.store)) by.set(x.store, { name: x.storeName || 'Otra tienda', items: [] }); by.get(x.store).items.push(x); }
    if (!by.size) return [sec('Otras tiendas (Ubisoft, EA, Battle.net, itch.io, Amazon Prime Gaming…)', [], 'Ahora no hay ofertas gratis de otras tiendas en la fuente consultada.', 'other')];
    return [...by.entries()].map(([k, v]) => sec(`${v.name} · gratis ahora`, v.items, '', k));
  };
  const kids = [head, info];
  if (!freeData) kids.push(el('p', 'hint', freeLoading ? 'Buscando ofertas…' : 'No se pudieron cargar las ofertas. Comprueba tu conexión y pulsa «Actualizar».'));
  else {
    const er = freeData.errors || {};
    if (er.epic) kids.push(el('p', 'hint', 'No se pudo consultar Epic Games ahora mismo.'));
    if (er.steam) kids.push(el('p', 'hint', 'No se pudo consultar Steam ahora mismo.'));
    if (er.other) kids.push(el('p', 'hint', 'No se pudieron consultar las otras tiendas ahora mismo.'));
    kids.push(sec('Epic Games · gratis ahora', freeData.epic.filter((x) => x.status === 'now'), 'Ahora no hay juegos gratis en Epic.', 'epic'),
      sec('Epic Games · próximamente', freeData.epic.filter((x) => x.status === 'soon'), 'Aún no hay anunciados.', 'epic'),
      sec('Steam · juegos gratis ahora (ofertas del 100 %)', freeData.steam.filter((x) => x.kind !== 'dlc' && x.kind !== 'extra'), 'Ahora no hay juegos completos con oferta del 100 % destacada en Steam. No incluye juegos que son gratuitos siempre.', 'steam'),
      ...(freeData.steam.some((x) => x.kind === 'dlc' || x.kind === 'extra') ? [sec('Steam · DLC y contenido extra gratis', freeData.steam.filter((x) => x.kind === 'dlc' || x.kind === 'extra'), '', 'steam')] : []),
      ...otherSecs(),
      el('p', 'hint', 'Las ofertas de otras tiendas vienen de GamerPower (gamerpower.com), un servicio de terceros: Comptus no las verifica, así que compruébalas en la tienda antes de reclamarlas.'));
  }
  box.replaceChildren(...kids);
  box.scrollTop = 0;
}
window.api.onChanged && window.api.onChanged(() => { if (freeData) updateCounts(); });


// ---------- Deseados (Steam y Epic) ----------
let wishData = null, wishLoading = false, wishSort = 'off', wishOnlySale = false;
const wishAll = () => (wishData ? [...wishData.steam, ...wishData.epic] : []);
const wishCount = () => wishAll().filter((x) => !x.owned && !x.soon && (x.discount > 0 || x.free)).length;
async function loadWish(force) {
  if (!window.api.wishGet || wishLoading) return;
  wishLoading = true; if (state.filter === 'wish') renderWish();
  try { wishData = await window.api.wishGet(!!force); } catch { /* sin conexión */ }
  wishLoading = false;
  updateCounts();
  if (state.filter === 'wish' && !state.detailId) renderWish();
}
function renderWish() {
  const box = $('#wishPage');
  const head = el('div', 'fr-head');
  const reload = el('button', null, wishLoading ? 'Actualizando…' : 'Actualizar'); reload.type = 'button'; reload.disabled = wishLoading; reload.onclick = () => loadWish(true);
  const sel = el('select'); sel.title = 'Orden';
  for (const [v, t] of [['off', 'Mayor descuento primero'], ['new', 'Añadidos recientemente'], ['name', 'Nombre (A-Z)']]) sel.append(Object.assign(document.createElement('option'), { value: v, textContent: t }));
  sel.value = wishSort; sel.onchange = () => { wishSort = sel.value; renderWish(); };
  const lab = el('label', 'wi-only'); const cb = el('input'); cb.type = 'checkbox'; cb.checked = wishOnlySale; cb.onchange = () => { wishOnlySale = cb.checked; renderWish(); };
  lab.append(cb, document.createTextNode(' Solo en oferta'));
  const fill = el('span', 'fr-fill'); fill.style.flex = '1';
  head.append(el('h1', null, 'Lista de deseados'), fill, lab, sel, reload);
  const info = el('p', 'hint', wishData && wishData.updated ? `Tus listas de deseados de Steam y Epic Games, con el precio actual del país elegido en «Gratis» · actualizado ${new Date(wishData.updated).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}. Se actualizan solas cada hora.` : 'Tus listas de deseados de Steam y Epic Games.');
  const STORE_COLOR = { steam: '#66c0f4', epic: '#e8e8e8' };
  const order = (a) => {
    let l = a.slice(); if (wishOnlySale) l = l.filter((x) => x.free || x.discount > 0);
    const byName = (x, y) => x.title.localeCompare(y.title, 'es');
    if (wishSort === 'name') l.sort(byName);
    else if (wishSort === 'new') l.sort((x, y) => (!!x.owned - !!y.owned) || (y.added || 0) - (x.added || 0) || byName(x, y));
    else l.sort((x, y) => (!!x.owned - !!y.owned) || (y.free ? 100 : y.discount) - (x.free ? 100 : x.discount) || byName(x, y));
    return l;
  };
  const sec = (title, all, icon, empty) => {
    const items = order(all);
    const s = el('section', 'fr-sec'); const h2 = el('h2'); const ic = sourceIcon(icon, 20); ic.style.color = STORE_COLOR[icon] || ''; h2.append(ic, document.createTextNode(`${title} (${all.length})`)); s.append(h2);
    if (!items.length) { s.append(el('p', 'hint', all.length ? 'Ninguno está en oferta ahora mismo.' : empty)); return s; }
    const g = el('div', 'fr-grid');
    for (const it of items) {
      const c = el('div', 'fr-card'); const img = el('div', 'fr-img');
      if (it.image) img.style.backgroundImage = `url("${it.image}")`;
      const tags = el('div', 'fr-tags');
      if (it.free) tags.append(el('span', 'chip fr-tag wi-off', 'Gratis'));
      else if (it.discount > 0) tags.append(el('span', 'chip fr-tag wi-off', `−${it.discount} %`));
      if (it.soon) tags.append(el('span', 'chip fr-tag fr-kind unk', 'Próximamente'));
      img.append(tags);
      const body = el('div', 'fr-body');
      body.append(el('div', 'fr-title', it.title));
      const pr = el('div', 'fr-meta', it.unavailable ? 'No disponible en tu país o retirado de la tienda' : (it.price || (it.soon ? 'Sin precio aún' : '')));
      if (it.orig) pr.append(document.createTextNode(' · '), Object.assign(document.createElement('s'), { textContent: it.orig }));
      body.append(pr);
      const act = el('div', 'fr-actions');
      if (it.owned) act.append(el('span', 'fr-owned', '✓ Ya la tienes'));
      const b = el('button', it.owned ? 'ghost' : (it.free || it.discount > 0) ? 'primary' : 'ghost', it.store === 'epic' ? 'Ver en Epic' : 'Ver en Steam'); b.type = 'button';
      b.onclick = () => window.api.freeOpen(it.url, it.app);
      act.append(b); body.append(act); c.append(img, body); g.append(c);
    }
    s.append(g); return s;
  };
  const kids = [head, info];
  if (!wishData) kids.push(el('p', 'hint', wishLoading ? 'Cargando tus listas…' : 'No se pudieron cargar. Comprueba tu conexión y pulsa «Actualizar».'));
  else {
    const er = wishData.errors || {}, lk = wishData.linked || {};
    if (!lk.steam) kids.push(el('p', 'hint', 'Steam: no se encontró tu SteamID. Escríbelo en Configuración > Steam (o inicia sesión en Steam en este equipo).'));
    else if (er.steam) kids.push(el('p', 'hint', er.steam));
    if (!lk.epic) kids.push(el('p', 'hint', 'Epic Games: inicia sesión en Configuración > Epic Games para ver tu lista.'));
    else if (er.epic) kids.push(el('p', 'hint', er.epic));
    if (er.epicDiag && lk.epic) kids.push(el('p', 'hint', 'Epic respondió con la lista vacía. Detalle técnico: ' + er.epicDiag));
    if (lk.steam) kids.push(sec('Steam', wishData.steam, 'steam', 'No hay juegos en tu lista (o tu perfil y los detalles de juegos no son públicos).'));
    if (lk.epic) kids.push(sec('Epic Games', wishData.epic, 'epic', 'No hay juegos en tu lista de deseados de Epic.'));
    kids.push(el('p', 'hint', 'Ubisoft, Xbox, EA y el resto de tiendas no permiten leer su lista de deseados desde fuera, así que no aparecen aquí. Para que Steam la entregue, tu perfil y los «detalles del juego» deben ser públicos.'));
  }
  box.replaceChildren(...kids);
  box.scrollTop = 0;
}
if (window.api.onOpenWish) window.api.onOpenWish(() => { closeMenu(); state.filter = 'wish'; state.detailId = null; render(); });
window.api.onChanged && window.api.onChanged(() => { if (wishData) updateCounts(); });


// ---------- SteamGridDB ----------
const SGDB_BOXES = [['sgdbCover', 'cover'], ['sgdbBanner', 'banner'], ['sgdbLogo', 'logo'], ['sgdbIcon', 'icon']];
const SGDB_REP = [['sgdbRepCover', 'cover'], ['sgdbRepBanner', 'banner'], ['sgdbRepLogo', 'logo']];
function sgdbSaveRep() { window.api.setSettings({ sgdbReplace: SGDB_REP.filter(([id]) => $('#' + id).checked).map(([, k]) => k) }); }
for (const [id] of SGDB_REP) $('#' + id).onchange = sgdbSaveRep;
function sgdbSaveKinds() { window.api.setSettings({ sgdbKinds: SGDB_BOXES.filter(([id]) => $('#' + id).checked).map(([, k]) => k) }); }
for (const [id] of SGDB_BOXES) $('#' + id).onchange = sgdbSaveKinds;
$('#sgdbAuto').onchange = (e) => window.api.setSettings({ sgdbAuto: e.target.checked });
$('#sgdbKey').onchange = async (e) => {
  const key = e.target.value.trim(); await window.api.setSettings({ sgdbKey: key });
  const m = $('#sgdbKeyMsg'); if (!key) { m.textContent = ''; return; }
  m.textContent = 'Comprobando la clave…';
  const r = await window.api.sgdbTest(key); m.textContent = r.ok ? '✓ Clave correcta' : (r.error || 'No se pudo comprobar');
};
function sgdbBusy(b) { $('#sgdbBtn').disabled = b; $('#sgdbStop').classList.toggle('hidden', !b); }
$('#sgdbBtn').onclick = async () => {
  await window.api.setSettings({ sgdbKey: $('#sgdbKey').value.trim() }); sgdbSaveKinds(); sgdbSaveRep();
  const r = await window.api.sgdbFill();
  if (!r.ok) { $('#sgdbStatus').textContent = r.error || 'No se pudo iniciar'; return; }
  if (!r.total) { $('#sgdbStatus').textContent = 'No falta ninguna imagen de los tipos elegidos (o ya se intentó hace poco).'; return; }
  $('#sgdbStatus').textContent = `Buscando imágenes para ${r.total} juegos…`; sgdbBusy(true);
};
$('#sgdbStop').onclick = () => window.api.sgdbCancel();
if (window.api.onSgdbProgress) window.api.onSgdbProgress((p) => { $('#sgdbStatus').textContent = `Buscando ${p.done} de ${p.total}: ${p.name} · ${p.added} imágenes nuevas`; });
if (window.api.onSgdbDone) window.api.onSgdbDone(async (r) => {
  sgdbBusy(false);
  const miss = r.missed ? new Set(r.missed.map((m) => m.name)).size : 0;
  $('#sgdbStatus').textContent = r.authError ? 'SteamGridDB rechazó la clave. Compruébala.' : `${r.canceled ? 'Cancelado' : 'Listo'}: ${r.added} imágenes nuevas${miss ? ` · ${miss} juegos sin coincidencia` : ''}.`;
  if (r.added > 0) { await load(); if (!r.silent) toast(`SteamGridDB: ${r.added} imágenes nuevas`, 4000); }
});

// ---------- Barra lateral con ancho ajustable (se arrastra su borde) ----------
{
  const side = document.querySelector('.sidebar'), MIN = 200, MAX = 560, DEF = 250;
  const h = document.createElement('div'); h.className = 'side-resizer'; h.title = 'Arrastra para cambiar el ancho (doble clic: tamaño original)';
  side.append(h);
  let w = DEF, saveT = null;
  const set = (v, save) => {
    w = Math.max(MIN, Math.min(MAX, Math.round(v)));
    document.documentElement.style.setProperty('--side-w', w + 'px');
    if (save) { clearTimeout(saveT); saveT = setTimeout(() => window.api.setSettings({ sidebarWidth: w === DEF ? null : w }), 250); }
  };
  window.__sideSet = (v) => set(v, false);
  h.addEventListener('pointerdown', (e) => {
    e.preventDefault(); h.setPointerCapture(e.pointerId); document.body.classList.add('side-resizing');
    const x0 = e.clientX, w0 = side.getBoundingClientRect().width;
    const move = (ev) => set(w0 + ev.clientX - x0, false);
    const up = () => { h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); document.body.classList.remove('side-resizing'); set(w, true); };
    h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
  });
  h.addEventListener('dblclick', () => set(DEF, true));
}

// ---------- Eventos y rebajas ----------
let evData = null, evLoading = false;
const evLive = () => (evData ? evData.events.filter((e) => e.start <= Date.now() && Date.now() < e.end).length : 0);
async function loadEvents(force) {
  if (!window.api.eventsGet || evLoading) return;
  evLoading = true;
  try { const d = await window.api.eventsGet(!!force); evData = { events: (d && d.events) || [], at: Date.now() }; } catch { /* sin datos */ }
  evLoading = false; updateCounts();
  if (state.filter === 'events' && !state.detailId) renderEvents();
}
function evRel(ms) {
  const m = Math.max(0, Math.round(ms / 60000)), h = Math.floor(m / 60), d = Math.floor(h / 24);
  return d >= 2 ? `${d} días` : h >= 1 ? `${h} h` : `${Math.max(1, m)} min`;
}
function renderEvents() {
  const box = $('#eventsPage'); const now = Date.now();
  const head = el('div', 'fr-head'); head.append(el('h1', null, 'Eventos y rebajas'));
  const info = el('p', 'hint', 'Calendario de rebajas y festivales de Steam y Epic. Las fechas son aproximadas (las horas pueden variar según tu zona): confírmalas siempre en la tienda. Puedes recibir un aviso un día antes y cuando empiecen en Configuración → Sistema → Avisos.');
  const fmt = (t) => new Date(t).toLocaleString('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const card = (e) => {
    const live = e.start <= now && now < e.end;
    const c = el('div', 'ev-card' + (live ? ' live' : ''));
    const top = el('div', 'ev-top');
    top.append(el('span', 'ev-pill ' + (live ? 'live' : ''), live ? 'En curso' : 'Próximamente'));
    if (e.store !== 'all') { const sp = el('span', 'ev-pill ' + e.store); const ic = sourceIcon(e.store, 12); ic.style.color = '#fff'; sp.append(ic, document.createTextNode(e.store === 'epic' ? 'Epic Games' : 'Steam')); top.append(sp); }
    top.append(el('span', 'ev-pill kind', e.kind === 'sale' ? 'Rebaja' : e.kind === 'fest' ? 'Festival' : e.kind === 'free' ? 'Gratis' : 'Evento'));
    c.append(top, el('div', 'ev-name', e.name));
    if (e.desc) c.append(el('div', 'fr-meta', e.desc));
    const when = el('div', 'ev-when', live ? `Termina en ${evRel(e.end - now)} · ${fmt(e.end)}` : `Empieza en ${evRel(e.start - now)} · ${fmt(e.start)} → ${fmt(e.end)}`);
    c.append(when);
    if (live) { const bar = el('div', 'ev-bar'); const p = el('span'); p.style.width = Math.round(((now - e.start) / (e.end - e.start)) * 100) + '%'; bar.append(p); c.append(bar); }
    if (e.url) { const act = el('div', 'fr-actions'); const b = el('button', live ? 'primary' : '', e.store === 'epic' ? 'Abrir en Epic' : 'Abrir en Steam'); b.type = 'button'; b.onclick = () => window.api.eventsOpen(e.url); act.append(b); c.append(act); }
    return c;
  };
  const list = (evData ? evData.events : []).filter((e) => e.end > now);
  const live = list.filter((e) => e.start <= now), soon = list.filter((e) => e.start > now);
  const sec = (title, items, empty) => { const s = el('section', 'fr-sec'); s.append(el('h2', null, title)); if (!items.length) s.append(el('p', 'hint', empty)); else { const g = el('div', 'ev-grid'); for (const e of items) g.append(card(e)); s.append(g); } return s; };
  box.replaceChildren(head, info, sec('En curso', live, evData ? 'Ahora no hay ningún evento en curso.' : 'Cargando…'), sec('Próximos', soon, evData ? 'No hay eventos próximos en el calendario. Si sabes de uno, puedes añadirlo en events.json (ver README).' : ''));
  box.scrollTop = 0;
}
window.api.onOpenEvents && window.api.onOpenEvents(() => { state.filter = 'events'; state.detailId = null; render(); });

// ---------- Comunidad: mi lista de proyectos de GitHub ----------
let cmData = null, cmLoading = false, cmMsg = '', cmReset = false;
const CM_IDEAS = [['HarbourMasters/Shipwright', 'Ship of Harkinian (Zelda OoT)'], ['HarbourMasters/2ship2harkinian', '2 Ship (Majora\'s Mask)'], ['HarbourMasters/Starship', 'Starship (Star Fox 64)'], ['HarbourMasters/SpaghettiKart', 'Spaghetti Kart'], ['Zelda64Recomp/Zelda64Recomp', 'Zelda 64: Recompiled'], ['Eukaryot/sonic3air', 'Sonic 3 A.I.R.'], ['OpenRCT2/OpenRCT2', 'OpenRCT2'], ['OpenTTD/OpenTTD', 'OpenTTD']];
async function loadCommunity(force) {
  if (!window.api.communityList || cmLoading) return;
  cmLoading = true; if (state.filter === 'community') renderCommunity();
  try { const d = await window.api.communityList(!!force); cmData = { items: (d && d.items) || [], at: Date.now() }; } catch { /* sin datos */ }
  cmLoading = false;
  if (state.filter === 'community' && !state.detailId) renderCommunity();
}
async function cmAdd(input) {
  input = String(input || '').trim(); if (!input) return;
  cmMsg = 'Comprobando…'; renderCommunity();
  const r = await window.api.communityAdd(input);
  if (r && r.ok) { cmData = { items: r.items, at: Date.now() }; cmMsg = ''; cmReset = true; toast('Proyecto añadido a tu lista'); }
  else cmMsg = (r && r.error) || 'No se pudo añadir.';
  renderCommunity();
}
function renderCommunity() {
  const box = $('#communityPage');
  const keep = box.querySelector('.cm-in'), typed = keep && !cmReset ? keep.value : '', hadFocus = keep && document.activeElement === keep;
  cmReset = false;
  const head = el('div', 'fr-head'); head.append(el('h1', null, 'Comunidad'));
  const rf = el('button', 'ghost small', cmLoading ? 'Actualizando…' : '[[refresh]] Buscar novedades'); rf.disabled = cmLoading; rf.onclick = () => loadCommunity(true);
  head.append(el('span', 'page-fill'), rf);
  const info = el('p', 'hint', 'Guarda aquí los ports de PC y descompilaciones de la comunidad que te interesan y Comptus te avisa cuando saquen una versión nueva (campana y modo consola). Funciona con GitHub, GitLab, Codeberg, SourceForge, itch.io (avisa de las entradas de devlog del autor, no de cada archivo) y cualquier feed RSS. Comptus no descarga ni incluye juegos ni ROMs: cada proyecto se descarga desde su página y necesita tus propios archivos del juego.');
  const form = el('div', 'cm-form');
  const inp = el('input', 'cm-in'); inp.type = 'text'; inp.placeholder = 'Enlace del proyecto: GitHub, itch.io, GitLab, Codeberg, SourceForge o un feed RSS'; inp.value = typed;
  const add = el('button', 'primary', '[[plus]] Añadir'); add.type = 'button';
  add.onclick = () => cmAdd(inp.value); inp.onkeydown = (e) => { if (e.key === 'Enter') cmAdd(inp.value); };
  form.append(inp, add);
  const msg = el('p', 'hint cm-msg', cmMsg);
  const items = cmData ? cmData.items : [];
  const fmt = (t) => (t ? new Date(t).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '');
  const grid = el('div', 'ev-grid');
  for (const e of items) {
    const c = el('div', 'ev-card cm-card');
    const top = el('div', 'ev-top');
    if (e.gameId) top.append(el('span', 'ev-pill live', 'En tu biblioteca'));
    top.append(el('span', 'ev-pill kind', e.label || e.repo));
    c.append(top, el('div', 'ev-name', e.name));
    const rel = e.release;
    c.append(el('div', 'ev-when', rel ? `${e.kind === 'github' || e.kind === 'gitea' || e.kind === 'gitlab' ? 'Última versión' : 'Última publicación'}: ${rel.tag}${rel.at ? ' · ' + fmt(rel.at) : ''}` : e.state === 'norelease' ? 'Todavía sin versiones publicadas.' : e.state === 'nofeed' || e.state === 'notfeed' ? 'Esta página no ofrece avisos de novedades.' : e.state === 'missing' ? 'No se encontró el repositorio (puede haber cambiado de nombre).' : cmLoading ? 'Comprobando…' : 'No se pudo comprobar la última versión.'));
    const act = el('div', 'fr-actions');
    const open = el('button', 'primary', 'Abrir página'); open.type = 'button'; open.onclick = () => window.api.communityOpen((rel && rel.url) || e.page || `https://github.com/${e.repo}`);
    act.append(open);
    if (e.gameId) {
      const g = state.games.find((x) => x.id === e.gameId);
      if (g) { const go = el('button', '', 'Ver en la biblioteca'); go.type = 'button'; go.onclick = () => { state.filter = 'all'; state.detailId = g.id; render(); }; act.append(go); }
    } else {
      const lk = el('button', '', '[[plus]] Añadir a la biblioteca'); lk.type = 'button'; lk.title = 'Elige el ejecutable que ya descargaste';
      lk.onclick = async () => { const g = await window.api.communityLink(e.id); if (!g) return; await load(); toast(`«${g.name}» añadido a la biblioteca`); loadCommunity(true); };
      act.append(lk);
    }
    const rm = el('button', 'ghost', '[[trash]] Quitar'); rm.type = 'button';
    rm.onclick = async () => { if (!confirm(`¿Quitar «${e.name}» de tu lista?`)) return; const r = await window.api.communityRemove(e.id); if (r && r.ok) { cmData = { items: r.items, at: Date.now() }; renderCommunity(); } };
    act.append(rm);
    c.append(act); grid.append(c);
  }
  const sec = el('section', 'fr-sec');
  if (items.length) sec.append(grid); else sec.append(el('p', 'hint', cmData ? 'Todavía no has guardado ningún proyecto. Pega un enlace de GitHub arriba o elige una de las ideas.' : 'Cargando…'));
  const ideas = el('section', 'fr-sec'); ideas.append(el('h2', null, 'Ideas para empezar'));
  const chips = el('div', 'ach-tabs');
  for (const [repo, label] of CM_IDEAS) { if (items.some((i) => i.repo.toLowerCase() === repo.toLowerCase())) continue; const b = el('button', 'ghost small', label); b.type = 'button'; b.title = 'github.com/' + repo; b.onclick = () => cmAdd(repo); chips.append(b); }
  ideas.append(chips, el('p', 'hint', 'Son proyectos conocidos de listas públicas de la comunidad; Comptus comprueba que existan al añadirlos.'));
  box.replaceChildren(head, info, form, msg, sec, chips.children.length ? ideas : el('span'));
  if (hadFocus) { const n = box.querySelector('.cm-in'); if (n) { n.focus(); try { n.setSelectionRange(typed.length, typed.length); } catch {} } }
}
window.api.onOpenCommunity && window.api.onOpenCommunity(() => { state.filter = 'community'; state.detailId = null; render(); });

// ---------- Render ----------
// Portadas ya vistas: se guardan las cargadas (para que al volver a una biblioteca salgan al instante, sin el blanco de la
// carga diferida) y las que fallaron (para poner la letra directamente sin volver a pedirlas por internet)
const covLoaded = new Map(); // dirección -> imagen ya cargada (se conserva a propósito)
const covBad = new Map(); // dirección -> cuándo falló (se olvida a los 10 min, por si fue un corte de internet)
const COV_MAX = 2500;
const covKey = (u) => { try { return new URL(u, document.baseURI).href; } catch { return String(u); } };
const isBad = (u) => { const t = covBad.get(covKey(u)); if (t && Date.now() - t < 600000) return true; covBad.delete(covKey(u)); return false; };
function makeCover(g, full = false) {
  const wrap = el('div');
  wrap.style.cssText = 'width:100%;height:100%';
  const showPlaceholder = () => {
    wrap.replaceChildren();
    wrap.style.background = '';
    const ph = el('div', 'placeholder', (g.name[0] || '?').toUpperCase());
    ph.style.background = colorFor(g.name);
    wrap.append(ph);
  };
  let src = full && g.cover && g.coverAnim ? imgUrl(g.cover) : coverSrc(g); // la ficha usa el original solo si es animada; si no, la versión ligera (un PNG grande de OneDrive tardaba en leerse y decodificarse)
  if (src && isBad(src)) { // ya sabemos que esta no carga: se usa la alternativa o la letra sin esperar
    const fb = g.coverFallback ? imgUrl(g.coverFallback) : null;
    src = fb && !isBad(fb) ? fb : null;
  }
  // portadas horizontales: se usa el banner (sin banner no se usa la portada vertical)
  const wideList = !full && cardShape === 'wide' ? [g.compCard || g.bannerCard || g.bannerSm || g.banner, g.bannerFallback].filter(Boolean).map(imgUrl).filter((u) => !isBad(u)) : null;
  if (wideList) src = wideList.length ? wideList.shift() : null; // en horizontal solo el banner (sin banner: letra y nombre)
  if (!src) { showPlaceholder(); return wrap; }

  const known = covLoaded.has(covKey(src));
  const img = new Image();
  img.alt = g.name;
  img.loading = known ? 'eager' : 'lazy'; img.decoding = known ? 'sync' : 'async';
  if (!known) wrap.style.background = colorFor(g.name); // mientras llega la imagen se ve el color del juego, no un hueco en blanco
  img.onload = () => {
    wrap.style.background = '';
    if (!covLoaded.has(covKey(img.src))) {
      covLoaded.set(covKey(img.src), img);
      if (covLoaded.size > COV_MAX) covLoaded.delete(covLoaded.keys().next().value);
    }
  };
  img.src = src;
  if (!full && g.coverAnim && !wideList) img.dataset.anim = '1';
  let triedFallback = false;
  img.onerror = () => {
    if (navigator.onLine !== false) covBad.set(covKey(img.src), Date.now());
    if (wideList && wideList.length) img.src = wideList.shift();
    else if (!wideList && g.coverFallback && !triedFallback) { triedFallback = true; img.src = g.coverFallback; }
    else showPlaceholder();
  };
  wrap.append(img);
  return wrap;
}

// ---------- Lista lateral ----------
const exeIconCache = new Map(); // id -> data URL | null
const iconNodes = new Map();    // los iconos ya cargados se reutilizan para no parpadear al redibujar

// Icono del juego: el que elijas -> portada en miniatura -> icono real del .exe -> letra con color
function makeIcon(g) {
  const key = `${g.id}|${g.name}|${g.icon || ''}|${g.cover || ''}|${g.coverAuto ? 1 : 0}`;
  if (iconNodes.has(key)) return iconNodes.get(key);
  const wrap = el('div', 'gicon');
  iconNodes.set(key, wrap);

  const letter = () => {
    wrap.replaceChildren();
    wrap.textContent = (g.name[0] || '?').toUpperCase();
    wrap.style.background = colorFor(g.name);
  };
  const show = (url, onFail) => {
    const img = new Image();
    img.alt = '';
    img.onload = () => { wrap.replaceChildren(img); wrap.style.background = 'none'; };
    img.onerror = onFail;
    img.src = url;
  };
  // Una portada descargada automáticamente solo se usa de icono si no hay nada mejor (como el icono real del .exe)
  const autoUrls = g.coverAuto ? [g.coverStill || g.coverSm || g.cover, g.coverFallback].filter(Boolean).map(imgUrl) : [];
  const fromAuto = (i = 0) => (i >= autoUrls.length ? letter() : show(autoUrls[i], () => fromAuto(i + 1)));
  const fromExe = async () => {
    if (!g.exe) return fromAuto();
    if (!exeIconCache.has(g.id)) exeIconCache.set(g.id, await window.api.getIcon(g.id));
    const url = exeIconCache.get(g.id);
    if (url) show(url, fromAuto); else fromAuto();
  };
  letter(); // mientras carga
  const urls = [g.iconSm || g.icon, ...(g.coverAuto ? [] : [g.coverStill || g.coverSm || g.cover, g.coverFallback])].filter(Boolean).map(imgUrl);
  (function next(i) {
    if (i >= urls.length) return fromExe();
    show(urls[i], () => next(i + 1));
  })(0);
  return wrap;
}

function renderSidebarList() {
  const list = visibleGames();
  $('#listCount').textContent = list.length;
  const box = $('#gameList');
  if (!list.length) {
    box.replaceChildren(el('div', 'list-empty', state.loading ? 'Cargando…' : 'Sin juegos para mostrar'));
    return;
  }
  box.replaceChildren(...list.map((g) => {
    const row = el('div', 'gitem' + (g.id === state.detailId ? ' active' : '') + (g.installed === false ? ' notinstalled' : ''));
    row.title = g.name + ' · clic derecho para más opciones';
    const def = srcDef(g.source);
    const src = sourceIcon(g.source, 14);
    src.classList.add('gsrc');
    src.style.color = def.color;
    src.title = def.name;
    row.append(makeIcon(g), el('span', 'gname', g.name), src);
    const play = el('button', 'gplay', g.installed === false ? '[[download]]' : '[[play]]');
    play.title = g.installed === false ? 'Instalar' : 'Jugar';
    play.onclick = () => launch(g);
    row.append(play);
    row.onclick = (e) => { if (!e.target.closest('button')) openDetail(g.id); };
    row.oncontextmenu = (e) => {
      e.preventDefault();
      showMenu({ x: e.clientX, y: e.clientY }, gameMenuItems(g, g.id === state.detailId));
    };
    return row;
  }));
}

let trophyN = 0;
const trophySvg = () => { const id = 'gold' + (++trophyN); return TROPHY.replace(/id="gold"/, `id="${id}"`).replace('url(#gold)', `url(#${id})`); };
const isComplete = (g) => !!(g.achievements && g.achievements.total && g.achievements.unlocked >= g.achievements.total);
function makeCard(g) {
  const card = el('article', 'card' + (g.installed === false ? ' notinstalled' : '') + (selected.has(g.id) ? ' selected' : ''));
  const check = el('span', 'sel-check', '[[check]]');
  card.dataset.id = g.id;
  if (hideNames) card.title = g.name;
  card.append(makeCover(g));
  if (cardShape === 'wide' && wideLogos && g.logo && !g.logoOff && !g.compCard) { // logotipo del juego centrado sobre el banner
    const lg = new Image(); lg.className = 'card-logo'; lg.alt = ''; lg.decoding = 'async'; lg.loading = 'eager'; card.classList.add('has-logo'); // se marca ya: así no cambia el estilo de la tarjeta cuando termina de cargar el logo
    let triedLogoFb = false;
    lg.onerror = () => { // a algunos juegos de Steam les falta el logo principal: se prueba el alternativo antes de quitarlo
      if (!triedLogoFb && g.logoFallback) { triedLogoFb = true; lg.src = imgUrl(g.logoFallback); return; }
      lg.remove(); card.classList.remove('has-logo');
    };
    lg.src = imgUrl(g.logoCard || g.logoSm || g.logo); card.append(lg);
  }
  if (g.coverAnim && cardShape !== 'wide') wireAnim(card, g.coverAnim); // en horizontal no se anima la portada
  const def = srcDef(g.source);
  const badge = el('span', 'badge');
  badge.style.color = def.color;
  badge.append(sourceIcon(g.source, 12), document.createTextNode(def.name));
  if (g.alsoIn && g.alsoIn.length) {
    const also = el('span', 'also');
    also.title = 'También en: ' + g.alsoIn.map((x) => srcDef(x).name).join(', ');
    for (const x of g.alsoIn) { const ic = sourceIcon(x, 11); ic.style.color = srcDef(x).color; also.append(ic); }
    badge.append(also);
  }
  card.append(badge);
  const sd = statusDef(g.status);
  if (sd) {
    const sp = el('span', 'st-pill');
    sp.style.setProperty('--sc', sd.color);
    sp.append(el('i', 'st-dot'), document.createTextNode(sd.label));
    sp.title = 'Mi seguimiento: ' + sd.label;
    card.append(sp);
  }

  const fav = el('button', 'fav', g.favorite ? '[[starFill]]' : '[[star]]');
  fav.title = g.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos';
  fav.onclick = () => toggleFav(g);
  card.append(fav);
  if (isComplete(g)) {
    card.classList.add('complete');
    const t = el('span', 'card-trophy'); t.innerHTML = trophySvg(); t.title = '¡100 % de logros conseguidos!';
    const sh = el('span', 'card-shine');
    // estrellitas que titilan por el borde de la portada
    [[6, 4, 14, 0], [50, -2, 10, 1.1], [94, 10, 16, .5], [100, 46, 10, 1.9], [92, 94, 14, 1.4], [58, 101, 10, .2], [10, 96, 16, 2.2], [-2, 60, 10, .8], [0, 26, 14, 1.7], [30, 0, 9, 2.6], [75, 100, 9, 2.9], [100, 74, 9, 3.2]].forEach(([x, y, s, d]) => {
      const st = el('i', 'cstar'); st.style.cssText = `left:${x}%;top:${y}%;width:${Math.round(s * 1.7)}px;height:${Math.round(s * 1.7)}px;animation-delay:${d}s`; sh.append(st);
    });
    card.append(sh, t);
  }

  const overlay = el('div', 'overlay');
  overlay.append(el('div', 'title', g.name));
  const info = [formatLastPlayed(g.lastPlayed), formatPlayTime(g.playTime)].filter(Boolean).join(' · ');
  overlay.append(el('div', 'meta', info));

  const actions = el('div', 'actions');
  const play = el('button', 'play', g.installed === false ? '[[download]] Instalar' : '[[play]] Jugar');
  play.onclick = () => launch(g);
  actions.append(play);

  if (g.source === 'local') {
    const edit = el('button', 'icon', '[[pencil]]');
    edit.title = 'Editar';
    edit.onclick = () => openEdit(g);
    const del = el('button', 'icon', '[[trash]]');
    del.title = 'Quitar de la biblioteca (no borra el juego)';
    del.onclick = () => removeLocalGame(g);
    actions.append(edit, del);
  } else {
    const hide = el('button', 'icon', g.hidden ? '[[eye]]' : '[[eyeOff]]');
    hide.title = g.hidden ? 'Volver a mostrar' : 'Ocultar de la biblioteca';
    hide.onclick = async () => { await window.api.toggleHidden(g.id); await load(); };
    actions.append(hide);
  }
  overlay.append(actions);
  card.append(overlay);
  // Clic en la portada = abrir la página del juego (los botones tienen su propia acción)
  card.append(check);
  card.onclick = (e) => {
    if (selecting || e.ctrlKey || e.metaKey || e.shiftKey) {
      e.preventDefault();
      if (!selecting) setSelecting(true);
      if (e.shiftKey && anchorId && anchorId !== g.id) selectRange(anchorId, g.id);
      else toggleSelected(g.id, card);
      return;
    }
    if (!e.target.closest('button')) openDetail(g.id);
  };
  card.oncontextmenu = (e) => {
    e.preventDefault();
    showMenu({ x: e.clientX, y: e.clientY }, gameMenuItems(g));
  };
  return card;
}

function render() {
  try { if (window.Couch) Couch.onRender(); } catch {}
  try { if (window.DeskFx) DeskFx.onRender(); } catch {}
  syncCollBg();
  updateFilterBtn();
  updateCounts();
  renderSidebarList();
  updateSelBar();

  // Si hay una página de juego abierta, se muestra en lugar de la grilla
  if (state.detailId && !state.games.some((x) => x.id === state.detailId)) state.detailId = null;
  const inDetail = !!state.detailId;
  const inStats = state.filter === 'stats' && !inDetail;
  const inFree = state.filter === 'free' && !inDetail;
  const inEvents = state.filter === 'events' && !inDetail;
  const inWish = state.filter === 'wish' && !inDetail;
  const inCommunity = state.filter === 'community' && !inDetail;
  { // transición suave al entrar a otro apartado
    const key = `${state.filter}|${state.detailId || ''}`;
    if (key !== lastViewKey) {
      const first = lastViewKey === null; lastViewKey = key;
      if (!first) playIn(inDetail ? '#detail' : inStats ? '#statsPage' : inFree ? '#freePage' : inWish ? '#wishPage' : inEvents ? '#eventsPage' : inCommunity ? '#communityPage' : '#grid');
    }
  }
  $('#statsPage').classList.toggle('hidden', !inStats);
  $('#freePage').classList.toggle('hidden', !inFree);
  $('#eventsPage').classList.toggle('hidden', !inEvents);
  $('#wishPage').classList.toggle('hidden', !inWish);
  $('#communityPage').classList.toggle('hidden', !inCommunity);
  updatePageTitle(inDetail || inStats || inFree || inEvents || inWish || inCommunity);
  if (!inDetail) destroyTrailer();
  document.querySelector('.toolbar').classList.toggle('hidden', inDetail || inFree || inEvents || inWish || inCommunity);
  document.querySelector('.toolbar').classList.toggle('stats-mode', inStats);
  $('#statsBtn').classList.toggle('on', inStats);
  $('#detail').classList.toggle('hidden', !inDetail);
  if (inStats) { grid.classList.add('hidden'); $('#empty').classList.add('hidden'); renderStats(); return; }
  if (inCommunity) { grid.classList.add('hidden'); $('#empty').classList.add('hidden'); renderCommunity(); if (!cmLoading && (!cmData || Date.now() - cmData.at > 600000)) loadCommunity(false); return; }
  if (inEvents) { grid.classList.add('hidden'); $('#empty').classList.add('hidden'); renderEvents(); if (!evLoading && (!evData || Date.now() - evData.at > 3600000)) loadEvents(false); return; }
  if (inWish) { grid.classList.add('hidden'); $('#empty').classList.add('hidden'); renderWish(); if (!wishLoading && (!wishData || Date.now() - wishData.updated > 3600000)) loadWish(false); return; }
  if (inFree) { grid.classList.add('hidden'); $('#empty').classList.add('hidden'); renderFree(); if (!freeLoading && (!freeData || Date.now() - freeData.updated > 3600000)) loadFree(false); return; }
  if (inDetail) {
    grid.classList.add('hidden');
    $('#empty').classList.add('hidden');
    { const t0 = performance.now(); renderDetail(); perf.detail.push({ id: state.detailId, ms: Math.round(performance.now() - t0) }); perf.detail = perf.detail.slice(-30); }
    return;
  }

  const inColls = state.filter === 'collections';
  document.querySelector('.toolbar').classList.toggle('coll-mode', inColls);
  grid.classList.toggle('coll-grid', inColls);
  applyShape();
  layoutGrid();
  if (inColls) { renderCollectionsPage(); return; }

  const list = visibleGames();
  // las primeras tarjetas se dibujan ya; el resto, en tandas cuando el programa está libre (evita el tirón al abrir con cientos de juegos)
  const keepScroll = grid.scrollTop > 0; // si ya estabas más abajo, se dibuja todo de golpe para no perder la posición
  const FIRST = keepScroll ? list.length : 60, CHUNK = 60, tokR = ++renderToken;
  grid.replaceChildren(...list.slice(0, FIRST).map(makeCard));
  if (list.length > FIRST) {
    let at = FIRST;
    const more = () => {
      if (tokR !== renderToken) return;
      if (state.smallPending) { state.smallPending.then(() => setTimeout(more, 0)); return; } // esperan a que estén las versiones ligeras
      grid.append(...list.slice(at, at + CHUNK).map(makeCard)); at += CHUNK;
      if (at < list.length) (window.requestIdleCallback ? requestIdleCallback(more, { timeout: 250 }) : setTimeout(more, 60)); else warmGrid();
    };
    (window.requestIdleCallback ? requestIdleCallback(more, { timeout: 250 }) : setTimeout(more, 60));
  } else warmGrid();

  const empty = $('#empty');
  empty.classList.toggle('hidden', list.length > 0);
  grid.classList.toggle('hidden', list.length === 0);
  if (!list.length) {
    empty.textContent = state.loading
      ? 'Cargando biblioteca…'
      : state.games.length === 0
        ? 'Aún no hay juegos. Instala un launcher, activa sus bibliotecas en Configuración o agrega un juego local con el botón de la izquierda.'
        : 'No hay juegos que coincidan con este filtro.';
  }
}

// ---------- Página de colecciones ----------
// Tarjeta de una colección: collage con las portadas de sus juegos (o su icono si está vacía)
function collCollage(c, games, art) {
  art.replaceChildren();
  art.classList.remove('empty');
  const shown = games.filter((g) => coverSrc(g)).slice(0, 4);
  if (shown.length) {
    art.dataset.n = String(shown.length);
    shown.forEach((g) => { const cell = el('div', 'coll-cell'); cell.append(makeCover(g)); art.append(cell); });
  } else {
    delete art.dataset.n;
    art.classList.add('empty');
    const big = collIcon(c);
    big.classList.add('coll-big');
    art.append(big);
  }
}
// Elegir o quitar la portada propia de una colección
async function pickCollCover(c) {
  const p = await window.api.pickImage('collection', 'Colección ' + (c.name || ''));
  if (!p) return;
  c.cover = p; const s = await smallImage(p, 640); c.coverSm = s.url; c.coverAnim = s.anim; saveCollections(); render();
}
function collCoverItems(c) {
  const items = [{ icon: 'image', label: c.cover ? 'Cambiar portada…' : 'Elegir portada…', run: () => pickCollCover(c) }];
  if (c.cover) items.push({ icon: 'undo', label: 'Quitar portada (usar collage)', run: () => { c.cover = ''; saveCollections(); render(); } });
  return items;
}
// Fondo propio de una colección (imagen o vídeo): se ve al abrirla; sin él se usa el fondo general
async function pickCollBg(c) {
  const p = await window.api.pickBackground();
  if (!p) return;
  c.bg = { path: p }; saveCollections(); lastCollBg = ''; render();
  toast(`Fondo de «${c.name}» puesto. Se ve al abrir la colección`);
}
function collBgItems(c) {
  const items = [{ icon: 'image', label: c.bg && c.bg.path ? 'Cambiar el fondo de esta colección…' : 'Fondo propio para esta colección…', run: () => pickCollBg(c) }];
  if (c.bg && c.bg.path) items.push({ icon: 'undo', label: 'Quitar el fondo de esta colección', run: () => { delete c.bg; saveCollections(); lastCollBg = ''; render(); } });
  return items;
}
const collMenuItems = (c) => [
  { icon: 'pencil', label: 'Editar nombre e icono…', run: () => openCollName(c) },
  ...collCoverItems(c),
  ...collBgItems(c),
  { icon: 'trash', label: 'Eliminar colección', run: () => deleteCollection(c) },
];
// Tarjeta horizontal de una colección: tu portada o, si no hay, un collage con las de sus juegos
function makeCollCard(c) {
  const games = state.games.filter((g) => !g.hidden && !g.dupOf && inColl(c, g))
    .sort((a, z) => a.name.localeCompare(z.name, 'es', { sensitivity: 'base', numeric: true }));
  const card = el('article', 'card coll-card');
  const art = el('div', 'coll-art');
  if (c.cover) {
    const im = el('img'); im.alt = ''; im.src = imgUrl(c.coverSm || c.cover);
    if (c.coverAnim) im.dataset.anim = '1';
    im.onerror = () => collCollage(c, games, art);
    art.dataset.n = '1';
    art.append(im);
  } else collCollage(c, games, art);
  card.append(art);
  if (c.coverAnim) wireAnim(card, c.coverAnim);
  const over = el('div', 'overlay coll-over');
  const title = el('div', 'title');
  title.append(collIcon(c), document.createTextNode(' ' + c.name));
  over.append(title, el('div', 'meta', `${games.length} ${games.length === 1 ? 'juego' : 'juegos'}`));
  card.append(over);
  card.title = c.name;
  card.onclick = () => { openNav('col:' + c.id, true); state.filter = 'col:' + c.id; state.detailId = null; render(); };
  card.oncontextmenu = (e) => { e.preventDefault(); showMenu({ x: e.clientX, y: e.clientY }, collMenuItems(c)); };
  return card;
}
// Cabecera con el nombre de la colección (o «Colecciones») sobre la barra de búsqueda
function updatePageTitle(hide) {
  const box = $('#pageTitle');
  const c = collections.find((x) => 'col:' + x.id === state.filter);
  if (hide || (!c && state.filter !== 'collections')) { box.classList.add('hidden'); return; }
  const kids = [];
  if (c) {
    const n = state.games.filter((g) => !g.hidden && !g.dupOf && inColl(c, g)).length;
    const ico = collIcon(c); ico.classList.add('page-ico');
    kids.push(ico, el('h1', null, c.name), el('span', 'hint', `${n} ${n === 1 ? 'juego' : 'juegos'}`), el('span', 'page-fill'));
    const edit = el('button', 'ghost small', '[[pencil]] Editar');
    edit.onclick = () => openCollName(c);
    const cover = el('button', 'ghost small', '[[image]] Portada');
    cover.title = 'Portada de la colección (solo imágenes)';
    cover.onclick = () => showMenu(cover, collCoverItems(c));
    const bgb = el('button', 'ghost small', '[[image]] Fondo');
    bgb.title = 'Fondo propio de esta colección (imagen o vídeo)';
    bgb.onclick = () => showMenu(bgb, collBgItems(c));
    kids.push(edit, cover, bgb);
  } else {
    kids.push(el('h1', null, 'Colecciones'), el('span', 'hint', `${collections.length}`));
  }
  box.replaceChildren(...kids);
  box.classList.remove('hidden');
}
function renderCollectionsPage() {
  const q = state.query.trim().toLowerCase();
  const list = sortedCollections().filter((c) => !q || c.name.toLowerCase().includes(q));
  const add = el('article', 'card coll-card coll-new');
  add.append(el('div', 'coll-newbody', '[[plus]]'), el('div', 'coll-newlabel', 'Nueva colección'));
  add.onclick = () => openCollName(null);
  grid.replaceChildren(...list.map(makeCollCard), add);
  const empty = $('#empty');
  empty.classList.add('hidden');
  grid.classList.remove('hidden');
}

// ---------- Acciones ----------
let firstPainted = false;
async function load() {
  state.games = await window.api.getLibrary();
  Dupes.applyGroups(state.games, { enabled: mergeDupes });
  if (!firstPainted && state.games.length > 90) {
    // Primera carga con muchos juegos: primero las versiones ligeras de lo que se ve al abrir (así se muestra enseguida);
    // las del resto se hacen después y las tarjetas de más abajo se dibujan cuando están listas
    firstPainted = true;
    const head = new Set(visibleGames().slice(0, 70));
    await smallifyLibrary(state.games.filter((g) => head.has(g)));
    const rest = state.games.filter((g) => !head.has(g));
    state.smallPending = smallifyLibrary(rest).catch(() => {}).then(() => { state.smallPending = null; renderSidebarList(); });
    state.loading = false;
    render();
    if (cardShape === 'wide') setTimeout(() => compBackground(state.games), 1500);
    return;
  }
  await smallifyLibrary(state.games);
  state.loading = false;
  render();
  if (cardShape === 'wide') setTimeout(() => compBackground(state.games), 1500);
}

// Al terminar de guardar en disco las imágenes de las tiendas, se recarga una vez para usarlas desde ahí
if (window.api.onImgRemoteDone) { let imgT; window.api.onImgRemoteDone(() => { clearTimeout(imgT); imgT = setTimeout(() => { if (!state.detailId) load(); }, 1500); }); }

// ---- Estado del juego en ejecución (lo informa el programa principal) ----
let runState = null;          // { id, state: 'starting' | 'running' | 'stopping' } | null
let stopArm = null;           // temporizador del "¿Detener? clic otra vez"
let stopArmId = null;
function paintPlay(btn, g) {
  if (!btn || g.installed === false) return;
  const st = runStateFor(g) ? runStateFor(g).state : null;
  const armed = stopArmId === g.id && st === 'running';
  btn.className = 'primary big' + (st ? ' state-' + st : '') + (armed ? ' state-confirm' : '');
  const withDot = (txt) => { btn.textContent = ''; const d = document.createElement('span'); d.className = 'pdot'; btn.append(d, document.createTextNode(txt)); };
  if (st === 'starting') { withDot('Iniciando…'); btn.title = 'Esperando a que el juego abra'; }
  else if (st === 'stopping') { withDot('Deteniendo…'); btn.title = ''; }
  else if (st === 'running') {
    if (armed) rich(btn, '[[x]] ¿Detener? Clic otra vez'); else withDot('Jugando');
    btn.title = 'Clic para detener el juego';
  } else { rich(btn, '[[play]] Jugar'); btn.title = ''; }
  if (st === 'starting' || st === 'stopping') btn.disabled = true; else btn.disabled = false;
}
function askStop(g) {
  if (stopArmId === g.id) { clearTimeout(stopArm); stopArmId = null; stopGame(g); return; }
  stopArmId = g.id;
  paintPlay($('#playBtn'), g);
  clearTimeout(stopArm);
  stopArm = setTimeout(() => { stopArmId = null; const b = $('#playBtn'); if (b && state.detailId === g.id) paintPlay(b, g); }, 3500);
}
async function stopGame(g) {
  const rs = runStateFor(g);
  const res = await window.api.stopGame(rs ? rs.id : g.id);
  if (!res.ok) toast(res.error || 'No se pudo detener el juego');
}
function applyRunState(s) {
  runState = s && s.state ? s : null;
  try { if (window.Couch) Couch.onRun(); } catch {}
  try { if (window.DeskPlus) DeskPlus.onRun(); } catch {}
  syncBgVideo();
  stopArmId = null;
  const b = $('#playBtn');
  const g = state.detailId && state.games.find((x) => x.id === state.detailId);
  if (b && g) paintPlay(b, g);
}

async function launch(g) {
  if (g.viaStore) { // vinculado desde otra tienda: se juega con la copia de esa tienda
    const sib = state.games.find((x) => groupIds(g).includes(x.id) && x.id !== g.id && !x.viaStore);
    if (sib) return launch(sib);
  }
  const res = await window.api.launch(g.id);
  if (res.ok) toast(res.installing ? `Abriendo la instalación de ${g.name}…` : `Abriendo ${g.name}…`);
  else { toast(res.error || 'No se pudo abrir el juego'); try { if (window.Couch && Couch.launchFailed) Couch.launchFailed(); } catch {} }
  setTimeout(load, 500);
}

function openEdit(g) {
  editing = g;
  editCover = g.cover;
  $('#editName').value = g.name;
  $('#editExe').value = g.exe;
  $('#editArgs').value = g.args || '';
  updateCoverPreview();
  $('#modal').classList.remove('hidden');
}
$('#pickExe').onclick = async () => { const p = await window.api.pickExe(); if (p) $('#editExe').value = p; };
function closeEdit() { $('#modal').classList.add('hidden'); editing = null; }
function updateCoverPreview() {
  const img = $('#editCoverPreview');
  if (editCover) { img.src = imgUrl(editCover); img.style.visibility = 'visible'; }
  else { img.removeAttribute('src'); img.style.visibility = 'hidden'; }
}

// ---------- Menú de cada juego (clic derecho en tarjetas y lista, y botón ⋯ en su página) ----------
const hasLocation = (g) => !!(g.installPath || g.exe);
const RESET_ALL = { icon: null, cover: null, banner: null, logo: null, logoOff: null, logoPos: null, logoSize: null, logoX: null, logoY: null, accent: null, colorMode: null };

async function pickImageFor(g, key) {
  const p = await window.api.pickImage(key, g.name);
  if (p) await saveCustom(g, key === 'logo' ? { logo: p, logoOff: null } : { [key]: p });
}

async function openLocation(g) {
  const res = await window.api.openLocation(g.id);
  if (!res.ok) toast(res.error || 'No se pudo abrir la carpeta');
}

async function openLauncher(def) {
  const res = await window.api.openLauncher(def.id);
  if (!res.ok) toast(res.error || `No se pudo abrir ${def.name}`);
}

async function removeLocalGame(g) {
  if (!confirm(`¿Quitar "${g.name}" de la biblioteca?\nNo se borra el juego de tu PC.`)) return;
  await window.api.removeLocal(g.id);
  await load();
}

// No se borra nada desde aquí: se abre el desinstalador oficial y allí confirmas
async function uninstallGame(g) {
  if (!confirm(`¿Desinstalar "${g.name}"?\n\nSe abrirá el desinstalador oficial y allí podrás confirmar o cancelar.`)) return;
  const res = await window.api.uninstall(g.id);
  toast(res.ok ? res.message : res.error || 'No se pudo desinstalar', 7000);
}

function gameMenuItems(g, fromPage = false) {
  const def = srcDef(g.source);
  const items = [{ icon: g.installed === false ? 'download' : 'play', label: g.installed === false ? 'Instalar' : 'Jugar', run: () => launch(g) }];
  if (!fromPage) items.push({ icon: 'file', label: 'Abrir página del juego', run: () => openDetail(g.id) });
  if (hasLocation(g)) items.push({ icon: 'folderOpen', label: 'Abrir ubicación del juego', run: () => openLocation(g) });
  if (def.canOpen) items.push({ icon: 'rocket', label: `Abrir ${def.name}`, run: () => openLauncher(def) });
  items.push(
    { sep: true },
    { icon: 'diamond', label: 'Cambiar icono…', run: () => pickImageFor(g, 'icon') },
    { icon: 'card', label: 'Cambiar portada…', run: () => pickImageFor(g, 'cover') },
    { icon: 'image', label: 'Cambiar banner…', run: () => pickImageFor(g, 'banner') },
    { icon: 'type', label: 'Cambiar logotipo…', run: () => pickImageFor(g, 'logo') },
    { icon: 'undo', label: 'Restablecer personalización', run: () => saveCustom(g, RESET_ALL) },
    { sep: true },
    { icon: g.favorite ? 'starFill' : 'star', label: g.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos',
      run: () => toggleFav(g) },
    { icon: g.hidden ? 'eye' : 'eyeOff', label: g.hidden ? 'Mostrar en la biblioteca' : 'Ocultar de la biblioteca',
      run: async () => { await window.api.toggleHidden(g.id); await load(); } },
    { sep: true },
    { icon: 'folder', label: 'Añadir a colección…', run: () => openCollPick([g.id]) },
    { icon: 'link', label: 'Unir con otro juego…', run: () => openMergePicker(g) },
  );
  const cur = state.filter.startsWith('col:') ? collections.find((c) => 'col:' + c.id === state.filter) : null;
  if (cur && cur.games.includes(g.id)) items.push({ icon: 'minus', label: `Quitar de «${cur.name}»`, run: () => setInCollection(cur, [g.id], false) });
  if (g.source === 'local') {
    items.push(
      { icon: 'pencil', label: 'Editar nombre y argumentos…', run: () => openEdit(g) },
      { icon: 'trash', label: 'Quitar de la biblioteca', run: () => removeLocalGame(g) },
    );
  } else {
    if (g.installed !== false) items.push({ icon: 'trash', label: 'Desinstalar…', run: () => uninstallGame(g) });
  }
  return items;
}

// Panel «Disponible en»: las versiones del mismo juego en cada biblioteca (solo si se unieron varias)
function dupPanel(g) {
  const ids = groupIds(g);
  if (ids.length < 2) {
    if (!g.noMerge) return null;
    const p = el('div', 'panel dup');
    p.append(el('h3', null, 'Separado de otras bibliotecas'), el('p', 'hint', 'Este juego no se une con sus repetidos de otras bibliotecas.'));
    const b = el('button', 'small', '[[undo]] Volver a unir'); b.type = 'button'; b.style.alignSelf = 'flex-start';
    b.onclick = () => saveCustom(g, { noMerge: null });
    p.append(b); return p;
  }
  const members = ids.map((id) => state.games.find((x) => x.id === id)).filter(Boolean);
  const panel = el('div', 'panel dup');
  panel.append(el('h3', null, 'Disponible en'), el('p', 'hint', 'Es el mismo juego en varias bibliotecas. Con la marcada se juega por defecto (botón Jugar).'));
  for (const m of members) {
    const def = srcDef(m.source);
    const row = el('div', 'dup-row' + (m.id === ids[0] ? ' main' : ''));
    const ic = sourceIcon(m.source, 18); ic.style.color = def.color;
    const own = 'ownPlayTime' in m ? m.ownPlayTime : m.playTime;
    const info = el('div', 'dup-info');
    info.append(el('strong', null, def.name), el('span', 'hint', [m.installed === false ? 'No instalado' : 'Instalado', formatPlayTime(own)].filter(Boolean).join(' · ')));
    if (m.viaStore) {
      info.lastChild.textContent = 'Vinculado a tu cuenta de Ubisoft · se juega desde la otra tienda';
      row.append(ic, info);
      const sep2 = el('button', 'small ghost', 'Separar'); sep2.type = 'button'; sep2.onclick = () => saveCustom(m, { noMerge: true, mergeWith: null });
      row.append(sep2);
      if (m.id !== g.id) { const open2 = el('button', 'small ghost', 'Ver ficha'); open2.type = 'button'; open2.onclick = () => openDetail(m.id); row.append(open2); }
      panel.append(row);
      continue;
    }
    const play = el('button', 'small', m.installed === false ? '[[download]] Instalar' : '[[play]] Jugar'); play.type = 'button';
    play.onclick = () => launch(m);
    const pref = el('button', 'small ghost dup-pref' + (m.id === ids[0] ? ' on' : ''), m.id === ids[0] ? '[[check]] Por defecto' : 'Usar por defecto'); pref.type = 'button';
    pref.disabled = m.id === ids[0];
    pref.onclick = async () => { for (const x of members) await window.api.setCustom(x.id, { prefer: x === m ? true : null }); await load(); };
    const sep = el('button', 'small ghost', 'Separar'); sep.type = 'button'; sep.title = 'Mostrar esta versión como un juego aparte';
    sep.onclick = () => saveCustom(m, { noMerge: true, mergeWith: null });
    row.append(ic, info, play, pref, sep);
    if (m.id !== g.id) { const open = el('button', 'small ghost', 'Ver ficha'); open.type = 'button'; open.onclick = () => openDetail(m.id); row.append(open); }
    panel.append(row);
  }
  const more = el('button', 'small ghost', '[[link]] Unir con otro juego…'); more.type = 'button'; more.style.alignSelf = 'flex-start';
  more.onclick = () => openMergePicker(g);
  panel.append(more);
  return panel;
}

// Selector para unir a mano un juego con otro (nombres distintos entre tiendas)
function openMergePicker(g) {
  const ov = el('div', 'modal');
  const box = el('div', 'modal-box merge-box');
  box.append(el('h2', null, 'Unir «' + g.name + '» con…'));
  box.append(el('p', 'hint', 'Elige el mismo juego en otra biblioteca. Los dos quedarán en una sola ficha (podrás separarlos después).'));
  const q = el('input'); q.id = 'mergeSearch'; q.placeholder = 'Buscar por nombre…'; q.autocomplete = 'off';
  const list = el('div', 'merge-list');
  const ids = groupIds(g);
  const cands = state.games.filter((x) => !x.hidden && !ids.includes(x.id));
  const close = () => ov.remove();
  const paint = () => {
    const t = q.value.trim().toLowerCase();
    let rows = cands.filter((x) => !t || x.name.toLowerCase().includes(t) || Dupes.norm(x.name).includes(Dupes.norm(t)));
    const near = (x) => (Dupes.related(g, x) ? 0 : 1);
    rows = rows.sort((a, b) => near(a) - near(b) || (a.source === g.source) - (b.source === g.source) || a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })).slice(0, 60);
    if (!rows.length) { list.replaceChildren(el('div', 'list-empty', 'Sin resultados')); return; }
    list.replaceChildren(...rows.map((x) => {
      const b = el('button', 'merge-row' + (!t && near(x) === 0 ? ' near' : '')); b.type = 'button';
      const ic = sourceIcon(x.source, 16); ic.style.color = srcDef(x.source).color;
      b.append(ic, el('span', 'merge-name'), el('span', 'hint', srcDef(x.source).name));
      b.children[1].textContent = x.name;
      b.onclick = async () => { close(); await saveCustom(g, { mergeWith: x.id, noMerge: null }); toast(`Unidos: ${g.name} + ${x.name}`); };
      return b;
    }));
  };
  q.oninput = paint;
  const actions = el('div', 'modal-actions'); const cancel = el('button', 'ghost', 'Cancelar'); cancel.type = 'button'; cancel.onclick = close; actions.append(cancel);
  box.append(q, list, actions); ov.append(box); document.body.append(ov);
  ov.onclick = (e) => { if (e.target === ov) close(); };
  q.onkeydown = (e) => { if (e.key === 'Escape') close(); };
  paint(); q.focus();
}
// Informe de repetidos (se copia al portapapeles)
function dupesReport() {
  const by = new Map();
  for (const g of state.games) if (g.group) { if (!by.has(g.group[0])) by.set(g.group[0], g.group); }
  const lines = [`Repetidos — ${by.size} ficha(s) unidas${mergeDupes ? '' : ' (la unión está apagada)'}`];
  for (const ids of by.values()) {
    const ms = ids.map((id) => state.games.find((x) => x.id === id)).filter(Boolean);
    lines.push(`  • ${ms[0].name}: ${ms.map((m) => `${srcDef(m.source).name}${m.name !== ms[0].name ? ` («${m.name}»)` : ''}`).join(' + ')}`);
  }
  const sug = Dupes.suggestions(state.games);
  lines.push('', `Parecidos sin unir: ${sug.length}`);
  for (const [a, b] of sug.slice(0, 80)) lines.push(`  ~ «${a.name}» [${srcDef(a.source).name}]  ↔  «${b.name}» [${srcDef(b.source).name}]`);
  if (sug.length > 80) lines.push(`  … y ${sug.length - 80} más`);
  lines.push('', 'Para unir uno a mano: clic derecho sobre el juego → «Unir con otro juego…».');
  return lines.join('\n');
}

let refocusTag = false;
// Estado y etiquetas se guardan en todas las copias de una ficha unida, así no se pierden si cambia la principal
async function saveTrack(g, patch) {
  for (const id of groupIds(g)) await window.api.setCustom(id, patch);
  await load();
}
// Panel «Mi seguimiento»: estado (un clic para elegir, otro para quitar) y etiquetas propias
function trackPanel(g) {
  const panel = el('div', 'panel track');
  panel.append(el('h3', null, 'Mi seguimiento'));
  const chips = el('div', 'st-chips');
  chips.setAttribute('role', 'radiogroup');
  for (const x of PLAY_STATUS) {
    const b = el('button', 'st-chip' + (g.status === x.id ? ' on' : ''), x.label);
    b.type = 'button'; b.style.setProperty('--sc', x.color);
    b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', g.status === x.id ? 'true' : 'false');
    b.dataset.status = x.id;
    b.onclick = () => saveTrack(g, { status: g.status === x.id ? null : x.id });
    chips.append(b);
  }
  panel.append(chips);

  const tags = el('div', 'tag-row');
  for (const t of gameTags(g)) {
    const c = el('span', 'tag-chip'); c.append(document.createTextNode(t));
    const rm = el('button', 'tag-x', '[[x]]'); rm.type = 'button'; rm.title = 'Quitar la etiqueta «' + t + '»';
    rm.onclick = () => saveTrack(g, { tags: gameTags(g).filter((y) => y !== t) });
    c.append(rm); tags.append(c);
  }
  const inp = el('input', 'tag-input');
  inp.id = 'tagInput'; inp.placeholder = gameTags(g).length ? 'Añadir etiqueta…' : 'Etiquetas: coop, para el sofá, con amigos…';
  inp.maxLength = 24; inp.setAttribute('list', 'tagSuggest');
  const dl = document.getElementById('tagSuggest') || Object.assign(document.createElement('datalist'), { id: 'tagSuggest' });
  const known = new Set(); for (const x of state.games) for (const t of gameTags(x)) known.add(t);
  dl.replaceChildren(...[...known].filter((t) => !gameTags(g).includes(t)).map((t) => Object.assign(document.createElement('option'), { value: t })));
  if (!dl.parentNode) document.body.append(dl);
  const add = () => {
    const v = inp.value.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
    if (!v) return;
    inp.value = ''; refocusTag = true;
    saveTrack(g, { tags: [...gameTags(g), v] });
  };
  inp.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } else if (e.key === 'Backspace' && !inp.value && gameTags(g).length) saveTrack(g, { tags: gameTags(g).slice(0, -1) }); };
  inp.onchange = add;
  tags.append(inp);
  panel.append(tags);
  if (refocusTag) { refocusTag = false; setTimeout(() => inp.focus(), 0); }
  return panel;
}

// ---------- Página de cada juego ----------
function openDetail(id) {
  state.detailId = id;
  render();
  $('#detail').scrollTop = 0;
}

// Fondo de la página de un juego: su banner, muy oscurecido, detrás de todo el contenido (opción en Configuración > Fondo)
let gameBg = true;
function applyGameBg(box, g) {
  const urls = [g.bannerSm || g.banner, g.bannerFallback].filter(Boolean).map(imgUrl);
  box.classList.remove('has-gbg'); box.style.removeProperty('--gbg');
  if (!gameBg || !urls.length) return;
  const tok = g.id; box.dataset.gbgFor = tok;
  (function next(i) {
    if (i >= urls.length) return;
    const im = new Image();
    im.onload = () => { if (box.dataset.gbgFor !== tok || box.dataset.gid !== tok) return; box.style.setProperty('--gbg', `url("${urls[i]}")`); box.classList.add('has-gbg'); };
    im.onerror = () => next(i + 1);
    im.src = urls[i];
  })(0);
}

function closeDetail() {
  state.detailId = null;
  destroyTrailer();
  const box = $('#detail');
  for (const v of PAGE_VARS) box.style.removeProperty(v);
  box.classList.remove('has-gbg'); box.style.removeProperty('--gbg'); delete box.dataset.gbgFor;
  delete box.dataset.gid;
  render();
}

// Pone una imagen de fondo probando varias URLs; mientras carga (o si todas fallan) usa un degradado
function setBackground(node, urls, fallbackBg) {
  node.style.background = fallbackBg;
  (function next(i) {
    if (i >= urls.length) return;
    const im = new Image();
    im.onload = () => { node.style.background = `url("${urls[i]}") center top / cover no-repeat`; };
    im.onerror = () => next(i + 1);
    im.src = urls[i];
  })(0);
}

// Variables que la página de un juego redefine (colores propios de ese juego)
const PAGE_VARS = ['--accent', '--accent-2', '--on-accent', '--bg', '--panel'];
const DEFAULT_LOGO = 130;
const LOGO_MAX = 600;

function applyPageAccent(box, color) {
  if (!color) {
    for (const v of ['--accent', '--accent-2', '--on-accent']) box.style.removeProperty(v);
    return;
  }
  box.style.setProperty('--accent', color);
  box.style.setProperty('--accent-2', `color-mix(in srgb, ${color}, white 28%)`);
  box.style.setProperty('--on-accent', onAccent(color, color));
}

async function saveCustom(g, patch) {
  await window.api.setCustom(g.id, patch);
  await load(); // recarga la biblioteca para que los valores por defecto (p. ej. banner de Steam) vuelvan solos
}

// ----- Colores de la página según la portada y el banner -----
const paletteCache = new Map(); // clave de imágenes -> { colors, avg }
const paletteKey = (g) => `${g.banner || g.bannerFallback || ''}|${g.cover || g.coverFallback || ''}`;

// Convierte la miniatura (data URL, así el canvas no se "contamina") en píxeles RGBA
function decodePixels(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = c.height = 48;
        const ctx = c.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, 48, 48);
        resolve(ctx.getImageData(0, 0, 48, 48).data);
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

async function paletteOf(...srcs) {
  for (const src of srcs.filter(Boolean)) {
    const url = await window.api.getThumb(src);
    const px = url && (await decodePixels(url));
    if (px) return computePalette(px, 48, 48);
  }
  return null;
}

async function loadPalette(g) {
  const [banner, cover] = await Promise.all([paletteOf(g.bannerSm || g.banner, g.bannerFallback), paletteOf(g.coverStill || g.coverSm || g.cover, g.coverFallback)]);
  return combinePalettes(banner, cover);
}

// Prioridad: color que tú elegiste > colores de las imágenes (automático) > color del tema
function applyPageStyle(box, g, pal) {
  PAGE_VARS.forEach((v) => box.style.removeProperty(v));
  if (g.accent) return applyPageAccent(box, g.accent);
  if (g.colorMode === 'theme' || !pal || !pal.colors.length) return;
  const [a, b] = pal.colors;
  box.style.setProperty('--accent', a);
  box.style.setProperty('--accent-2', b);
  box.style.setProperty('--on-accent', onAccent(a, b));
  if (pal.avg) { // tiñe un poco el fondo y los paneles con el color medio de las imágenes
    box.style.setProperty('--bg', `color-mix(in srgb, ${theme.bg}, ${pal.avg} 14%)`);
    box.style.setProperty('--panel', `color-mix(in srgb, ${theme.panel}, ${pal.avg} 14%)`);
  }
}

// Reaplica los colores sin reconstruir la página (p. ej. al cambiar de tema)
function refreshPageStyle() {
  const g = state.games.find((x) => x.id === state.detailId);
  if (g) applyPageStyle($('#detail'), g, paletteCache.get(paletteKey(g)));
}

function ensurePalette(g) {
  const key = paletteKey(g);
  if (g.accent || g.colorMode === 'theme' || paletteCache.has(key)) return;
  paletteCache.set(key, null); // marca "cargando" para no pedirla dos veces
  const t0 = performance.now();
  loadPalette(g)
    .catch(() => ({ colors: [], avg: null }))
    .then((pal) => { paletteCache.set(key, pal); perf.palette.push({ ms: Math.round(performance.now() - t0), key: g.name }); refreshPageStyle(); });
}

// Botón de icono con menú "Elegir imagen… / Restablecer"
function imageTool(g, { icon, title, key, pick, reset }) {
  const b = el('button', 'tool', `[[${icon}]]`);
  b.title = title;
  b.onclick = () => showMenu(b, [
    { icon, label: pick, run: () => pickImageFor(g, key) },
    { icon: 'undo', label: reset, run: () => saveCustom(g, { [key]: null }) },
  ]);
  return b;
}

// Coloca el logotipo (o el nombre). Con posición libre (X/Y en %), el punto elegido es donde queda el logo;
// sin ella se conserva la disposición anterior (a la izquierda/centro/derecha, abajo).
function placeLogo(info, node, g) {
  const free = g.logoX != null && g.logoY != null;
  info.classList.toggle('free', free);
  if (free) {
    node.style.left = g.logoX + '%';
    node.style.top = g.logoY + '%';
    node.style.transform = `translate(-${g.logoX}%, -${g.logoY}%)`;
  } else {
    for (const p of ['left', 'top', 'transform']) node.style.removeProperty(p);
  }
}
const LEGACY_XY = { left: [28, 88], center: [58, 88], right: [90, 88] };

// Controles de posición y tamaño del logotipo (se ven en vivo y el menú queda abierto)
function logoControls(g) {
  const wrap = el('div', 'logo-controls');
  const info = () => $('#detail .hero-info');
  const target = () => $('#detail .hero-info > *');

  wrap.append(el('div', 'lc-label', 'Posición (arrastra el punto)'));
  const pad = el('div', 'lc-pad');
  const dot = el('div', 'lc-dot');
  pad.append(dot);
  const cur = () => (g.logoX != null && g.logoY != null ? [g.logoX, g.logoY] : LEGACY_XY[g.logoPos || 'left']);
  const paint = () => { const [x, y] = cur(); dot.style.left = x + '%'; dot.style.top = y + '%'; };
  paint();
  let saveT;
  const setXY = (x, y) => {
    g.logoX = x; g.logoY = y;
    paint();
    if (info() && target()) placeLogo(info(), target(), g);
    clearTimeout(saveT);
    saveT = setTimeout(() => window.api.setCustom(g.id, { logoX: x, logoY: y }), 250);
  };
  const move = (e) => {
    const r = pad.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const pct = (v, size) => Math.min(100, Math.max(0, Math.round((v / size) * 100)));
    setXY(pct(e.clientX - r.left, r.width), pct(e.clientY - r.top, r.height));
  };
  let dragging = false;
  pad.addEventListener('pointerdown', (e) => { dragging = true; if (pad.setPointerCapture && e.pointerId != null) { try { pad.setPointerCapture(e.pointerId); } catch { /* ignorar */ } } move(e); });
  pad.addEventListener('pointermove', (e) => { if (dragging) move(e); });
  const stop = () => { dragging = false; };
  pad.addEventListener('pointerup', stop);
  pad.addEventListener('pointercancel', stop);
  wrap.append(pad);
  const center = el('button', 'small', '[[target]] Centrar');
  center.onclick = () => setXY(50, 50);
  wrap.append(center);

  wrap.append(el('div', 'lc-label', 'Tamaño'));
  const range = el('input');
  range.type = 'range';
  range.min = 40; range.max = LOGO_MAX; range.step = 10;
  range.value = g.logoSize || DEFAULT_LOGO;
  let t;
  range.oninput = () => {
    const v = parseInt(range.value, 10);
    g.logoSize = v;
    const logo = $('#detail .hero-info .logo');
    if (logo) logo.style.height = v + 'px';
    clearTimeout(t);
    t = setTimeout(() => window.api.setCustom(g.id, { logoSize: v }), 250);
  };
  wrap.append(range);

  const reset = el('button', 'ghost small', 'Restablecer posición y tamaño');
  reset.onclick = () => { closeMenu(); saveCustom(g, { logoPos: null, logoSize: null, logoX: null, logoY: null }); };
  wrap.append(reset);
  return wrap;
}


function renderDetail() {
  const box = $('#detail');
  const g = state.games.find((x) => x.id === state.detailId);

  // No reconstruir la página mientras se escriben notas (se perdería el foco)
  const active = document.activeElement;
  if (active && active.id === 'detailNotes' && box.dataset.gid === g.id) return;
  if (trailerCache && trailerCache.gameId === g.id) trailerCache.wasPaused = trailerCache.video.paused;
  else destroyTrailer();
  box.dataset.gid = g.id;
  applyPageStyle(box, g, paletteCache.get(paletteKey(g)));
  ensurePalette(g);
  applyGameBg(box, g);

  // --- Cabecera con banner ---
  const hero = el('div', 'hero');
  setBackground(hero, [g.bannerAnim || g.bannerSm || g.banner, g.bannerFallback].filter(Boolean).map(imgUrl), colorFor(g.name));
  hero.oncontextmenu = (e) => {
    if (e.target.closest('.tools') || e.target.closest('textarea')) return;
    e.preventDefault();
    showMenu({ x: e.clientX, y: e.clientY }, gameMenuItems(g, true));
  };

  const back = el('button', 'back', '[[arrowLeft]] Volver');
  back.onclick = closeDetail;

  // Botones de personalización (solo iconos; cada uno abre un pequeño menú)
  const tools = el('div', 'tools');
  const colorInput = el('input', 'color-hidden');
  colorInput.type = 'color';
  colorInput.value = g.accent || theme.accent;
  colorInput.oninput = () => applyPageAccent(box, colorInput.value); // vista previa en vivo
  colorInput.onchange = () => saveCustom(g, { accent: colorInput.value, colorMode: null });

  const mode = g.accent ? 'custom' : g.colorMode === 'theme' ? 'theme' : 'auto';
  const colorTool = el('button', 'tool', '[[palette]]');
  colorTool.title = 'Color de esta página';
  colorTool.onclick = () => showMenu(colorTool, [
    { icon: mode === 'auto' ? 'check' : '', label: 'Colores de la portada y el banner (automático)', run: () => saveCustom(g, { accent: null, colorMode: null }) },
    { icon: mode === 'custom' ? 'check' : '', label: 'Elegir color…', run: () => colorInput.click() },
    { icon: mode === 'theme' ? 'check' : '', label: 'Usar el color del tema', run: () => saveCustom(g, { accent: null, colorMode: 'theme' }) },
  ]);

  const logoTool = el('button', 'tool', '[[type]]');
  logoTool.title = 'Logotipo';
  logoTool.onclick = () => showMenu(logoTool, [
    { icon: 'type', label: 'Elegir logotipo…', run: () => pickImageFor(g, 'logo') },
    { node: logoControls(g) },
    g.logoOff
      ? { icon: 'undo', label: 'Usar el logotipo de Steam', run: () => saveCustom(g, { logoOff: null }) }
      : { icon: 'x', label: 'Quitar logotipo (mostrar nombre)', run: () => saveCustom(g, { logo: null, logoOff: true }) },
  ]);

  const moreTool = el('button', 'tool', '[[more]]');
  moreTool.title = 'Más opciones';
  moreTool.onclick = () => showMenu(moreTool, gameMenuItems(g, true));

  tools.append(
    imageTool(g, { icon: 'image', title: 'Banner', key: 'banner', pick: 'Elegir banner…', reset: 'Restablecer banner' }),
    imageTool(g, { icon: 'card', title: 'Portada', key: 'cover', pick: 'Elegir portada…', reset: 'Restablecer portada' }),
    imageTool(g, { icon: 'diamond', title: 'Icono', key: 'icon', pick: 'Elegir icono…', reset: 'Restablecer icono' }),
    logoTool, colorTool, moreTool, colorInput,
  );

  const poster = el('div', 'poster');
  poster.append(makeCover(g, true));

  // El logotipo (o el nombre) es lo único que cambia de posición con la opción de logo
  const info = el('div', 'hero-info');
  info.dataset.pos = g.logoPos || 'left';
  if (g.logo) {
    // Logotipo en lugar del nombre; si el archivo ya no existe, vuelve el nombre
    const logo = el('img', 'logo');
    logo.alt = g.name;
    logo.style.height = (g.logoSize || DEFAULT_LOGO) + 'px'; // altura fija: también agranda logos pequeños
    let triedFb = false;
    logo.onerror = () => {
      if (g.logoFallback && !triedFb) { triedFb = true; logo.src = imgUrl(g.logoFallback); return; }
      const h = el('h2', null, g.name); placeLogo(info, h, g); logo.replaceWith(h);
    };
    logo.src = imgUrl(g.logoSm || g.logo);
    placeLogo(info, logo, g);
    info.append(logo);
  } else {
    const h = el('h2', null, g.name);
    placeLogo(info, h, g);
    info.append(h);
  }
  hero.append(back, tools, poster, info);

  // --- Información descargada (si hay y está activado) ---
  // Una sola vez por juego y sesión: si algo falla, nunca se reintenta en bucle
  if (autoInfo && !g.info && !g.infoEdit && (!g.infoTried || g.epicInfo) && !fetchingInfo.has(g.id) && !autoTried.has(g.id)) { autoTried.add(g.id); downloadInfo(g, null, true); }
  // La información descargada antes de que existieran los tráilers se completa una vez
  if (autoInfo && g.info && g.info.source !== 'rawg' && g.info.appid && g.info.movies === undefined && !fetchingInfo.has(g.id) && !autoTried.has(g.id)) {
    autoTried.add(g.id);
    downloadInfo(g, g.info.appid, true).then((r) => { if (!r.ok) { trailerErr.set(g.id, r.error || 'No se pudo consultar Steam.'); if (state.detailId === g.id) render(); } });
  }
  const inf = infoOf(g);

  // --- Barra de acción fija, con la estructura de Steam ---
  const def = srcDef(g.source);
  const bar = el('div', 'action-bar');
  const play = el('button', 'primary big', g.installed === false ? '[[download]] Instalar' : '[[play]] Jugar');
  play.id = 'playBtn';
  play.onclick = () => (g.installed !== false && runStateFor(g) && runStateFor(g).state === 'running' ? askStop(g) : launch(g));
  paintPlay(play, g);
  const stat = (label, node) => {
    const s = el('div', 'stat');
    s.append(el('div', 'stat-label', label), node);
    return s;
  };
  const srcVal = el('div', 'stat-value stat-src');
  const srcLogo = sourceIcon(g.source, 16);
  srcLogo.style.color = def.color;
  srcVal.append(srcLogo, document.createTextNode(def.name));
  bar.append(
    play,
    stat('Biblioteca', srcVal),
    stat('Última sesión', el('div', 'stat-value', formatLastSession(g.lastPlayed))),
    stat('Tiempo de juego', el('div', 'stat-value', formatHoursStat(g.playTime))),
    ...(Number.isFinite(g.diskBytes) && g.installed !== false ? [stat('En disco', el('div', 'stat-value', fmtBytes(g.diskBytes)))] : []),
    el('div', 'bar-spacer'),
  );
  // Logros en la barra (juegos de Steam con datos): «12 / 40», y la insignia dorada al completarlos todos
  if ((g.source === 'steam' && g.appid) || (g.source === 'epic' && g.epicNs) || (g.source === 'xbox' && g.xboxTitleId)) {
    const achStat = el('div', 'stat ach-stat hidden');
    achStat.id = 'achStat';
    bar.insertBefore(achStat, bar.querySelector('.bar-spacer'));
    updateAchStat(g);
  }
  const barBtn = (glyph, title, run, on) => {
    const b = el('button', 'bar-btn' + (on ? ' on' : ''), glyph);
    b.title = title;
    b.onclick = run;
    return b;
  };
  const icons = el('div', 'bar-icons');
  icons.append(barBtn(g.favorite ? '[[starFill]]' : '[[star]]', g.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos',
    () => toggleFav(g), g.favorite));
  if (hasLocation(g)) icons.append(barBtn('[[folderOpen]]', 'Abrir ubicación del juego', () => openLocation(g)));
  if (g.source === 'local') icons.append(barBtn('[[pencil]]', 'Editar nombre y argumentos', () => openEdit(g)));
  icons.append(barBtn('[[info]]', 'Información del juego…', () => openInfo(g)));
  bar.append(icons);

  // --- Cuerpo: columna principal + columna de detalles ---
  const body = el('div', 'detail-body');
  const mainCol = el('div', 'col');
  const sideCol = el('div', 'col');
  mainCol.append(trackPanel(g));
  { const dp = dupPanel(g); if (dp) mainCol.append(dp); }

  const about = el('div', 'panel');
  about.append(el('h3', null, 'Acerca de este juego'));
  if (inf && inf.description) {
    about.append(el('p', 'about', inf.description));
    if (g.info && g.info.lang === 'en' && !(g.infoEdit && g.infoEdit.description)) {
      const tr = el('div', 'tr-row');
      if (g.info.descriptionEs) {
        const showing = !showOriginal.has(g.id);
        tr.append(el('p', 'hint', showing ? 'Traducido automáticamente del inglés.' : 'Texto original, en inglés.'));
        const t = el('button', 'ghost small', showing ? 'Ver original' : 'Ver traducción');
        t.onclick = () => { if (showing) showOriginal.add(g.id); else showOriginal.delete(g.id); render(); };
        tr.append(t);
      } else {
        const t = el('button', 'small', '[[globe]] Traducir al español');
        t.onclick = async () => {
          t.disabled = true; t.textContent = 'Traduciendo…';
          const r = await window.api.translateInfo(g.id);
          if (!r.ok) toast(r.error || 'No se pudo traducir');
          await load();
        };
        tr.append(el('p', 'hint', 'Esta descripción está en inglés.'), t);
      }
      about.append(tr);
    }
  } else if (fetchingInfo.has(g.id)) {
    about.append(el('p', 'hint', 'Descargando información…'));
  } else {
    about.append(el('p', 'hint', g.infoErr ? `No se encontró información automáticamente. ${g.infoErr}` : 'Todavía no hay información de este juego.'));
    const find = el('button', 'small', '[[search]] Buscar información');
    find.style.alignSelf = 'flex-start';
    find.onclick = () => openInfo(g);
    about.append(find);
  }
  mainCol.append(about);

  // --- Logros (juegos de Steam, Epic y Xbox) ---
  if ((g.source === 'steam' && g.appid) || (g.source === 'epic' && g.epicNs) || (g.source === 'xbox' && g.xboxTitleId)) {
    const ach = el('div', 'panel');
    ach.append(el('h3', null, 'Logros'));
    const achBody = el('div', 'ach-body');
    ach.append(achBody);
    mainCol.append(ach);
    fillAchievements(g, achBody);
  }

  // --- Tráiler + capturas de la tienda (después de los logros) ---
  mainCol.append(trailerPanel(g));

  // --- Mis capturas (las que haces con el atajo mientras juegas) ---
  const mine = el('div', 'panel');
  const mineHead = el('div', 'panel-head');
  mineHead.append(el('h3', null, 'Mis capturas'));
  const openFolder = el('button', 'ghost small', '[[folderOpen]] Abrir carpeta');
  openFolder.onclick = async () => { const r = await window.api.openShotsFolder(g.id); if (!r.ok) toast(r.error || 'No se pudo abrir la carpeta'); };
  mineHead.append(openFolder);
  const mineBody = el('div');
  mine.append(mineHead, mineBody);
  fillMyShots(g, mineBody);

  mainCol.append(savesPanel(g));

  const notesPanel = el('div', 'panel');
  notesPanel.append(el('h3', null, 'Notas'));
  const ta = el('textarea');
  ta.id = 'detailNotes';
  ta.placeholder = 'Trucos, mods instalados, lo que te falta por hacer…';
  ta.value = g.notes || '';
  let t;
  ta.oninput = () => {
    clearTimeout(t);
    t = setTimeout(() => { g.notes = ta.value; window.api.setCustom(g.id, { notes: ta.value }); }, 500);
  };
  ta.onblur = () => { clearTimeout(t); g.notes = ta.value; window.api.setCustom(g.id, { notes: ta.value }); };
  notesPanel.append(ta);
  mainCol.append(notesPanel);

  const details = el('div', 'panel');
  details.append(el('h3', null, 'Detalles'));
  const row = (label, node) => {
    const r = el('div', 'drow');
    r.append(el('div', 'dlabel', label));
    if (typeof node === 'string') r.append(el('div', 'dvalue', node)); else r.append(node);
    details.append(r);
  };
  const list = (arr) => (arr && arr.length ? arr.join(', ') : '');
  if (inf) {
    if (list(inf.developers)) row('Desarrollador', list(inf.developers));
    if (list(inf.publishers)) row('Editor', list(inf.publishers));
    if (inf.releaseDate) row('Lanzamiento', formatDate(inf.releaseDate));
    if (inf.genres && inf.genres.length) {
      const tags = el('div', 'tags');
      inf.genres.forEach((x) => tags.append(el('span', 'tag', x)));
      row('Géneros', tags);
    }
    if (inf.metacritic) row('Metacritic', String(inf.metacritic));
  }
  const where = g.installPath || (g.exe && g.exe.replace(/[\\/][^\\/]*$/, ''));
  if (where) {
    const v = el('div', 'dvalue path', where);
    v.title = where;
    row('Ubicación', v);
  }
  if (!inf && !where) details.append(el('p', 'hint', 'Sin datos todavía.'));
  if (inf && (inf.website || inf.storeUrl)) {
    const links = el('div', 'row');
    if (inf.website) { const b = el('button', 'small', '[[globe]] Sitio web'); b.onclick = () => window.api.openLink(inf.website); links.append(b); }
    if (inf.storeUrl) { const b = el('button', 'small', inf.source === 'rawg' ? '[[gamepad]] Ver en RAWG' : '[[cart]] Tienda de Steam'); b.onclick = () => window.api.openLink(inf.storeUrl); links.append(b); }
    details.append(links);
  }
  if (g.info) {
    details.append(el('p', 'hint', `Información de ${g.info.source === 'rawg' ? 'RAWG' : g.info.source === 'epic' ? 'la tienda de Epic' : 'la tienda de Steam'}${g.info.title ? ` · «${g.info.title}»` : ''}`));
    const refresh = el('button', 'ghost small', '[[refresh]] Actualizar');
    refresh.style.alignSelf = 'flex-start';
    refresh.onclick = async () => {
      const res = await downloadInfo(g, g.info.source === 'rawg' ? `rawg:${g.info.rawgId}` : g.info.appid, false);
      toast(res.ok ? 'Información actualizada' : res.error);
    };
    details.append(refresh);
  }
  sideCol.append(details, mine);

  body.append(mainCol, sideCol);
  box.replaceChildren(hero, bar, body);
}

// ---------- Partidas guardadas ----------
const fmtWhen = (ms) => new Date(ms).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
function savesPanel(g) {
  const panel = el('div', 'panel');
  const head = el('div', 'panel-head');
  head.append(el('h3', null, 'Partidas guardadas'));
  const now = el('button', 'small', '[[download]] Copiar ahora');
  const open = el('button', 'ghost small', '[[folderOpen]] Carpeta de copias');
  open.onclick = async () => { const r = await window.api.savesOpenFolder(g.id); if (!r.ok) toast(r.error || 'No se pudo abrir la carpeta'); };
  head.append(now, open);
  const body = el('div');
  panel.append(head, body);
  let confirmId = null, confirmT;
  const paint = (r) => {
    body.replaceChildren();
    if (!r || !r.ok) { body.append(el('p', 'hint', (r && r.error) || 'No se pudo leer la información de guardados.')); now.disabled = true; return; }
    const known = r.known && r.paths.length;
    now.disabled = !known;
    if (!r.db.ready && !r.known) {
      body.append(el('p', 'hint', r.db.building ? 'Descargando la base de datos de guardados… vuelve en un minuto.' : 'Aún no tengo la base de datos que dice dónde guarda cada juego su progreso. Se descarga sola, o puedes hacerlo ahora.' + (r.db.error ? ' Último intento fallido: ' + r.db.error : '')));
      if (!r.db.building) { const b = el('button', 'small', '[[download]] Descargar ahora'); b.onclick = async () => { b.disabled = true; b.textContent = 'Descargando… (puede tardar un minuto)'; const u = await window.api.savesUpdate(true); toast(u.ok ? 'Base de guardados lista' : u.error, 5000); load(); }; body.append(b); }
    } else if (!r.known) body.append(el('p', 'hint', 'No conozco dónde guarda este juego su progreso. Indícalo tú con «Añadir carpeta» (o «Añadir archivo») y Comptus lo copiará igual que al resto.'));
    else if (!r.paths.length) body.append(el('p', 'hint', `Conozco el juego (${r.name}) pero aún no hay archivos de guardado en tu equipo. Se copiarán cuando juegues.`));
    else {
      body.append(el('p', 'hint', `${r.files} archivo${r.files === 1 ? '' : 's'} de guardado (${fmtBytes(r.bytes)}) en:`));
      for (const p of r.paths.slice(0, 4)) { const row = el('div', 'dvalue path', p); row.title = 'Abrir esta ubicación'; row.style.cursor = 'pointer'; row.onclick = () => window.api.savesOpenPath(p); body.append(row); }
      if (r.paths.length > 4) body.append(el('p', 'hint', `…y ${r.paths.length - 4} más.`));
    }
    const addRow = el('div', 'row');
    const addDir = el('button', 'small ghost', '[[plus]] Añadir carpeta'); addDir.title = 'Indica tú dónde guarda este juego su progreso';
    const addFile = el('button', 'small ghost', '[[plus]] Añadir archivo');
    addDir.onclick = async () => { const x = await window.api.savesAddPath(g.id, 'dir'); if (x && x.error) toast(x.error); load(); };
    addFile.onclick = async () => { const x = await window.api.savesAddPath(g.id, 'file'); if (x && x.error) toast(x.error); load(); };
    const find = el('button', 'small', '[[search]] Buscar guardados');
    find.title = 'Busca carpetas y archivos que parezcan partidas guardadas de este juego';
    const sugBox = el('div', 'saves-list');
    find.onclick = async () => {
      find.disabled = true; find.textContent = 'Buscando…';
      const x = await window.api.savesSuggest(g.id);
      find.disabled = false; rich(find, '[[search]] Buscar guardados');
      sugBox.replaceChildren();
      if (!x.ok) { sugBox.append(el('p', 'hint', x.error)); return; }
      if (!x.list.length) { sugBox.append(el('p', 'hint', 'No encontré nada que parezca una partida guardada. Juega al menos un minuto, guarda la partida y ciérralo: Comptus mirará qué archivos cambiaron y te lo propondrá. Si sabes dónde está, usa «Añadir carpeta».')); return; }
      sugBox.append(el('p', 'hint', 'Esto es lo que encontré. Lo marcado «cambió mientras jugabas» es lo más fiable. Añade solo lo que sea de verdad el progreso del juego:'));
      for (const c of x.list) {
        const row = el('div', 'saves-row'); const t = el('div', 'saves-txt');
        t.append(el('div', 'saves-when', c.path), el('div', 'hint', `${c.dir ? 'Carpeta' : 'Archivo'} · ${c.files} archivo${c.files === 1 ? '' : 's'} · ${fmtBytes(c.bytes)} · modificado ${fmtWhen(c.mtime)} · ${c.why}`));
        const add = el('button', 'small', 'Añadir'); add.onclick = async () => { await window.api.savesAddSuggested(g.id, c.path); load(); };
        const open = el('button', 'small ghost', '[[folderOpen]]'); open.title = 'Ver en el Explorador'; open.onclick = () => window.api.savesOpenPath(c.dir ? c.path : c.path.replace(/[\\/][^\\/]*$/, ''));
        row.append(t, open, add); sugBox.append(row);
      }
    };
    addRow.append(find, addDir, addFile); body.append(addRow, sugBox);
    for (const p of r.custom || []) {
      const row = el('div', 'saves-row'); const t = el('div', 'saves-txt'); t.append(el('div', 'hint', 'Tuya: ' + p)); row.append(t);
      const del = el('button', 'small ghost', '[[x]]'); del.title = 'Quitar esta ruta'; del.onclick = async () => { await window.api.savesRemovePath(g.id, p); load(); };
      row.append(del); body.append(row);
    }
    if (r.backups.length) {
      const list = el('div', 'saves-list');
      for (const b of r.backups) {
        const row = el('div', 'saves-row');
        const txt = el('div', 'saves-txt');
        txt.append(el('div', 'saves-when', fmtWhen(b.date)), el('div', 'hint', `${fmtBytes(b.bytes)} · ${b.files} archivo${b.files === 1 ? '' : 's'}${b.note ? ' · ' + b.note : ''}`));
        row.append(txt);
        const rest = el('button', 'small ghost', 'Restaurar');
        rest.onclick = async () => {
          if (confirmId !== b.id) { confirmId = b.id; clearTimeout(confirmT); confirmT = setTimeout(() => { confirmId = null; rest.textContent = 'Restaurar'; }, 4000); rest.textContent = '¿Seguro? Pulsa otra vez'; return; }
          const res = await window.api.savesRestore(g.id, b.id);
          toast(res.ok ? 'Partida restaurada' + (res.safety ? ' (antes se copió la actual)' : '') : res.error, 4000); load();
        };
        const del = el('button', 'small ghost', '[[x]]'); del.title = 'Borrar esta copia';
        del.onclick = async () => { await window.api.savesRemove(g.id, b.id); load(); };
        row.append(rest, del); list.append(row);
      }
      body.append(list);
    } else if (known) body.append(el('p', 'hint', 'Aún no hay copias. Se hacen solas al cerrar el juego, o pulsa «Copiar ahora».'));
  };
  const load = async () => { try { paint(await window.api.savesInfo(g.id)); } catch { paint(null); } };
  now.onclick = async () => { now.disabled = true; const r = await window.api.savesBackup(g.id); toast(r.ok ? (r.fresh ? 'Copia hecha' : 'Sin cambios desde la última copia') : r.error, 4000); load(); };
  body.append(el('p', 'hint', 'Buscando guardados…'));
  load();
  return panel;
}
window.api.onSavesHint && window.api.onSavesHint((d) => toast(`Detecté dónde guarda «${d.name}» su progreso: míralo en «Partidas guardadas» de su ficha`, 6000));
window.api.onSavesDone && window.api.onSavesDone((d) => toast(`Partida de «${d.name}» copiada`, 3000));

// ---------- Mis capturas ----------
// ---------- Tráiler ----------
const trailerErr = new Map(); // juego -> motivo por el que no se pudo traer el tráiler
let trailerCache = null; // { gameId, panel, video, hls, wasPaused }
function destroyTrailer() {
  if (!trailerCache) return;
  try { trailerCache.video.pause(); } catch { /* ya no está */ }
  if (trailerCache.hls) { try { trailerCache.hls.destroy(); } catch { /* ya estaba cerrado */ } }
  trailerCache = null;
}
// Carga un tráiler en el reproductor: mp4/webm directo o, como entrega Steam, un flujo HLS con hls.js
function loadTrailer(tc, m, autoplay, onFail) {
  const v = tc.video;
  if (tc.hls) { try { tc.hls.destroy(); } catch { /* nada */ } tc.hls = null; }
  v.removeAttribute('src');
  v.poster = m.thumb || '';
  const play = () => { if (autoplay) v.play().catch(() => {}); };
  const direct = m.mp4 || m.webm;
  if (direct) { v.onerror = onFail; v.src = direct; play(); return; }
  if (window.Hls && window.Hls.isSupported()) {
    const hls = new window.Hls({ enableWorker: false });
    tc.hls = hls;
    hls.on(window.Hls.Events.MANIFEST_PARSED, play);
    hls.on(window.Hls.Events.ERROR, (_e, d) => { if (d && d.fatal) { try { hls.destroy(); } catch { /* nada */ } tc.hls = null; onFail(); } });
    hls.loadSource(m.hls);
    hls.attachMedia(v);
  } else if (v.canPlayType('application/vnd.apple.mpegurl')) { v.onerror = onFail; v.src = m.hls; play(); }
  else onFail();
}
async function setCustomTrailer(g, value) {
  await window.api.setCustom(g.id, { customTrailer: value });
  if (value) g.customTrailer = value; else delete g.customTrailer;
  render();
}
// Panel «Tráiler»: vídeos de Steam + el tuyo propio, y debajo las capturas de la tienda
function trailerPanel(g) {
  const ct = g.customTrailer || null;
  const movies = ((g.info && g.info.movies) || []).filter((m) => m.mp4 || m.webm || m.hls);
  if (ct && ct.kind === 'file') movies.unshift({ id: 'custom', name: 'Mi tráiler', mp4: fileUrl(ct.path), thumb: '' });
  const inf = g.info;
  const shots = (inf && inf.screenshots) || [];
  const sig = `${g.id}|${movies.map((m) => m.id).join(',')}|${ct ? (ct.path || ct.url) : ''}|${shots.length}`;
  // Si la página se reconstruye (p. ej. al marcar favorito) se conserva el mismo reproductor y sigue donde iba
  if (movies.length && trailerCache && trailerCache.gameId === g.id && trailerCache.sig === sig) {
    const tc = trailerCache;
    setTimeout(() => { if (trailerCache === tc && !tc.wasPaused) tc.video.play().catch(() => {}); }, 0);
    return tc.panel;
  }
  destroyTrailer();
  const panel = el('div', 'panel trailer-panel');
  const head = el('div', 'panel-head');
  head.append(el('h3', null, 'Tráiler'));
  const title = el('span', 'hint', movies.length ? movies[0].name : '');
  head.append(title);
  panel.append(head);
  let player = null;

  if (movies.length) {
    const video = el('video', 'trailer');
    video.controls = true; video.muted = true; video.playsInline = true; video.preload = 'metadata';
    video.setAttribute('playsinline', '');
    const msg = el('p', 'hint hidden');
    const tc = trailerCache = { gameId: g.id, sig, panel, video, hls: null, wasPaused: false };
    const fail = () => {
      msg.replaceChildren(document.createTextNode('No se pudo reproducir el tráiler aquí. '));
      if (inf && inf.storeUrl && inf.source !== 'rawg') { const a = el('button', 'ghost small', 'Ver en la tienda de Steam'); a.onclick = () => window.api.openLink(inf.storeUrl); msg.append(a); }
      msg.classList.remove('hidden');
    };
    panel.append(video, msg);
    player = { tc, msg, fail };
    loadTrailer(tc, movies[0], autoTrailer, fail);
  } else if (inf && inf.source !== 'rawg' && inf.appid && !(ct && ct.kind === 'link')) {
    // Juego de Steam sin tráiler a la vista (la información más antigua no guardaba el origen: es de Steam)
    if (fetchingInfo.has(g.id)) panel.append(el('p', 'hint', 'Buscando el tráiler en Steam…'));
    else {
      const why = trailerErr.get(g.id);
      const never = inf.movies === undefined;
      panel.append(el('p', 'hint', why ? `No se pudo traer el tráiler: ${why}`
        : never ? 'Todavía no se ha consultado el tráiler de este juego.'
        : 'Steam no devolvió ningún tráiler para este juego.'));
      const b = el('button', 'small', never ? '[[film]] Buscar tráiler' : '[[refresh]] Volver a buscar');
      b.style.alignSelf = 'flex-start';
      b.onclick = async () => {
        trailerErr.delete(g.id);
        const r = await downloadInfo(g, inf.appid, false);
        if (!r.ok) { trailerErr.set(g.id, r.error || 'No se pudo consultar Steam.'); render(); }
      };
      panel.append(b);
    }
  } else if (!(ct && ct.kind === 'link')) {
    panel.append(el('p', 'hint', 'Este juego no tiene tráiler. Puedes añadir el tuyo.'));
  }

  // Una sola tira: miniaturas de los vídeos y, a continuación, las capturas de la tienda
  if (movies.length > 1 || shots.length) {
    const strip = el('div', 'trailer-strip');
    if (movies.length > 1) {
      movies.forEach((m, i) => {
        const b = el('button', 'tthumb' + (i === 0 ? ' on' : '') + (m.thumb ? '' : ' nothumb'));
        b.type = 'button'; b.title = m.name;
        if (m.thumb) { const im = el('img'); im.loading = 'lazy'; im.alt = ''; im.src = m.thumb; b.append(im); }
        else b.append(iconEl('folder'));
        b.onclick = () => {
          strip.querySelectorAll('.tthumb.vid').forEach((x) => x.classList.toggle('on', x === b));
          title.textContent = m.name; player.msg.classList.add('hidden');
          loadTrailer(player.tc, m, true, player.fail);
        };
        b.classList.add('vid');
        strip.append(b);
      });
    }
    shots.forEach((sh, i) => {
      const b = el('button', 'tthumb shot');
      b.type = 'button'; b.title = `Captura ${i + 1}`;
      const im = el('img'); im.loading = 'lazy'; im.alt = `Captura ${i + 1}`; im.src = sh.thumb; b.append(im);
      b.onclick = () => openLightbox(shots, i);
      strip.append(b);
    });
    panel.append(strip);
  }

  // Tráiler propio por enlace (YouTube u otro): se abre en el navegador
  if (ct && ct.kind === 'link') {
    const row = el('div', 'row');
    const open = el('button', 'small', '[[play]] Ver tráiler en el navegador');
    open.onclick = () => window.api.openLink(ct.url);
    const url = el('span', 'hint trailer-url', ct.url);
    url.title = ct.url;
    row.append(open, url);
    panel.append(row);
  }

  // Botones para poner tu propio tráiler
  const actions = el('div', 'row trailer-actions');
  const file = el('button', 'ghost small', '[[folder]] Añadir vídeo de mi PC');
  file.onclick = async () => {
    const p = await window.api.pickVideo();
    if (p) setCustomTrailer(g, { kind: 'file', path: p });
  };
  const link = el('button', 'ghost small', '[[link]] Añadir enlace');
  const linkRow = el('div', 'row hidden');
  const inp = el('input'); inp.type = 'text'; inp.placeholder = 'https://www.youtube.com/watch?v=…';
  const ok = el('button', 'small', 'Guardar');
  const save = () => {
    const v = inp.value.trim();
    if (!/^https?:\/\//i.test(v)) { toast('Escribe un enlace que empiece por http:// o https://'); return; }
    setCustomTrailer(g, { kind: 'link', url: v });
  };
  ok.onclick = save;
  inp.onkeydown = (e) => { if (e.key === 'Enter') save(); };
  linkRow.append(inp, ok);
  link.onclick = () => { linkRow.classList.toggle('hidden'); if (!linkRow.classList.contains('hidden')) inp.focus(); };
  actions.append(file, link);
  if (ct) { const rm = el('button', 'ghost small', '[[trash]] Quitar el mío'); rm.onclick = () => setCustomTrailer(g, null); actions.append(rm); }
  panel.append(actions, linkRow);

  return panel;
}

// ---------- Logros ----------
const TROPHY = '<svg viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2a8"/><stop offset=".5" stop-color="#f5b82e"/><stop offset="1" stop-color="#c77d0a"/></linearGradient></defs><circle cx="24" cy="24" r="22" fill="url(#gold)" stroke="#fff2a8" stroke-width="1.5"/><circle cx="24" cy="24" r="17.5" fill="none" stroke="#8a5300" stroke-opacity=".45" stroke-width="1.2"/><path d="M15 12h18v7a9 9 0 0 1-18 0z" fill="#7a4a00"/><path d="M15 14h-4c0 5 2 8 5 9M33 14h4c0 5-2 8-5 9" fill="none" stroke="#7a4a00" stroke-width="2" stroke-linecap="round"/><rect x="22" y="27" width="4" height="6" fill="#7a4a00"/><rect x="17" y="33" width="14" height="3.5" rx="1" fill="#7a4a00"/></svg>';
// Pone en la barra el avance de logros del juego (se llama al abrir la página y al llegar datos nuevos)
function updateAchStat(g) {
  const box = document.getElementById('achStat');
  const a = g.achievements;
  if (!box) return;
  if (!a || !a.total) { box.classList.add('hidden'); return; }
  const done = a.unlocked === a.total;
  box.className = 'stat ach-stat' + (done ? ' complete' : '');
  box.title = done ? '¡Todos los logros conseguidos!' : `${a.unlocked} de ${a.total} logros`;
  box.replaceChildren(el('div', 'stat-label', 'Logros'));
  const val = el('div', 'stat-value ach-val');
  if (done) { const b = el('span', 'ach-badge'); b.innerHTML = TROPHY; val.append(b, document.createTextNode('100 %')); }
  else val.textContent = `${a.unlocked} / ${a.total}`;
  box.append(val);
}

const achFilter = { mode: 'all', expanded: false };
const ACH_RARE = 10; // % global por debajo del cual un logro se considera raro
function renderAchievements(g, box, data, note) {
  box.replaceChildren();
  g.achievements = data; updateAchStat(g);
  const pctDone = data.total ? Math.round((data.unlocked / data.total) * 100) : 0;
  const head = el('div', 'ach-head');
  head.append(el('strong', null, `${data.unlocked} de ${data.total} (${pctDone}%)`));
  const refresh = el('button', 'ghost small', '[[refresh]] Refrescar');
  refresh.onclick = () => { refresh.disabled = true; refresh.textContent = 'Refrescando…'; fillAchievements(g, box, true); };
  head.append(refresh);
  const bar = el('div', 'bar'); const fill = el('div', 'bar-fill'); fill.style.width = pctDone + '%'; bar.append(fill);
  box.append(head, bar);
  if (note) box.append(el('p', 'hint', note));

  const tabs = el('div', 'ach-tabs');
  for (const [mode, label] of [['all', 'Todos'], ['yes', 'Desbloqueados'], ['no', 'Bloqueados']]) {
    const b = el('button', 'ghost small' + (achFilter.mode === mode ? ' on' : ''), label);
    b.onclick = () => { achFilter.mode = mode; achFilter.expanded = false; renderAchievements(g, box, data, note); };
    tabs.append(b);
  }
  box.append(tabs);

  // desbloqueados primero (los más recientes arriba); bloqueados del más fácil al más raro
  let list = data.list.filter((a) => achFilter.mode === 'all' || (achFilter.mode === 'yes') === a.achieved);
  list = list.slice().sort((a, b) => (a.achieved !== b.achieved ? (a.achieved ? -1 : 1) : a.achieved ? b.unlockTime - a.unlockTime : (b.percent ?? -1) - (a.percent ?? -1)));
  const LIMIT = 8;
  const shown = achFilter.expanded ? list : list.slice(0, LIMIT);
  const rows = el('div', 'ach-list');
  for (const a of shown) {
    const row = el('div', 'ach' + (a.achieved ? ' got' : ''));
    const ic = el('img'); ic.loading = 'lazy'; ic.alt = ''; ic.src = (a.achieved ? a.icon : a.iconGray) || '';
    const txt = el('div', 'ach-txt');
    txt.append(el('div', 'ach-name', a.name));
    const desc = a.description || (a.hidden && !a.achieved ? 'Logro oculto' : '');
    if (desc) txt.append(el('div', 'ach-desc', desc));
    const meta = el('div', 'ach-meta');
    if (a.percent != null) {
      const rare = a.percent < ACH_RARE;
      meta.append(el('span', rare ? 'rare' : null, `${rare ? '[[gem]] ' : ''}${a.percent.toLocaleString('es', { maximumFractionDigits: 1 })}%`));
    }
    if (a.achieved && a.unlockTime) meta.append(el('span', null, new Date(a.unlockTime).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })));
    row.append(ic, txt, meta);
    rows.append(row);
  }
  box.append(rows);
  if (!list.length) box.append(el('p', 'hint', 'No hay logros en esta categoría.'));
  if (list.length > LIMIT) {
    const more = el('button', 'ghost small', achFilter.expanded ? 'Ver menos' : `Ver los ${list.length}`);
    more.onclick = () => { achFilter.expanded = !achFilter.expanded; renderAchievements(g, box, data, note); };
    box.append(more);
  }
}
async function fillAchievements(g, box, force) {
  if (g.source === 'steam' && !steamKey) {
    box.replaceChildren(el('p', 'hint', 'Para ver tus logros agrega tu clave gratuita de Steam Web API en Configuración > Steam.'));
    return;
  }
  if (g.achievements) renderAchievements(g, box, g.achievements);
  else box.replaceChildren(el('p', 'hint', 'Cargando logros…'));
  const r = await window.api.getAchievements(g.id, force);
  if (state.detailId !== g.id) return; // ya cambió de página
  if (r.ok) { g.achievements = r.data; renderAchievements(g, box, r.data); return; }
  if (r.code === 'none') { box.replaceChildren(el('p', 'hint', r.error)); return; }
  if (r.data) { renderAchievements(g, box, r.data, `No se pudieron actualizar: ${r.error}`); return; }
  const retry = el('button', 'ghost small', '[[refresh]] Reintentar');
  retry.style.alignSelf = 'flex-start';
  retry.onclick = () => fillAchievements(g, box, true);
  box.replaceChildren(el('p', 'hint', r.error || 'No se pudieron cargar los logros.'), retry);
}

async function fillMyShots(g, box) {
  let list = [];
  try { list = await window.api.listShots(g.id); } catch { /* sin capturas */ }
  if (state.detailId !== g.id) return;
  if (!list.length) {
    const p = el('p', 'hint');
    p.append(document.createTextNode(overlayOn ? 'Todavía no hay capturas. Mientras juegas pulsa ' : 'Las capturas están desactivadas (actívalas en Configuración > Overlay y capturas). Atajo: '));
    p.append(el('span', 'kbd', hotkeys.shot));
    p.append(document.createTextNode('.'));
    box.replaceChildren(p);
    return;
  }
  const grid = el('div', 'mine');
  const viewer = list.map((x) => ({ full: fileUrl(x.path), thumb: fileUrl(x.path) }));
  list.forEach((x, i) => {
    const cell = el('div', 'shot');
    const im = el('img');
    im.loading = 'lazy';
    im.alt = `Captura ${i + 1}`;
    im.src = fileUrl(x.path);
    im.onclick = () => openLightbox(viewer, i);
    const del = el('button', 'del', '[[x]]');
    del.title = 'Borrar captura';
    del.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm('¿Borrar esta captura?')) return;
      await window.api.deleteShot(x.path);
      fillMyShots(g, box);
    };
    cell.append(im, del);
    grid.append(cell);
  });
  box.replaceChildren(grid);
}

// Convierte una pulsación de teclas en un atajo de Electron (p. ej. "Ctrl+Shift+P")
function accelFromEvent(e) {
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return null;
  const named = { ' ': 'Space', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right', Enter: 'Return',
    Backspace: 'Backspace', Delete: 'Delete', Tab: 'Tab', Insert: 'Insert', Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown' };
  const key = e.key in named ? named[e.key] : e.key.length === 1 ? e.key.toUpperCase() : /^F\d{1,2}$/.test(e.key) ? e.key : null;
  if (!key) return null;
  const mods = [];
  if (e.ctrlKey) mods.push('Ctrl');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  if (e.metaKey) mods.push('Super');
  return [...mods, key].join('+');
}

function bindHotkeyInput(input, name) {
  input.onfocus = () => { input.value = 'Pulsa las teclas…'; };
  input.onblur = () => { input.value = hotkeys[name]; };
  input.onkeydown = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') return input.blur();
    const accel = accelFromEvent(e);
    if (!accel) return;
    const res = await window.api.setHotkeys({ [name]: accel });
    hotkeys = res.hotkeys;
    if (res.failed && res.failed[name]) toast('Ese atajo ya lo usa otro programa; prueba con otro');
    else toast(`Atajo guardado: ${hotkeys[name]}`);
    input.blur();
    render();
  };
}

// ---------- Información de los juegos ----------
const fetchingInfo = new Set();
const autoTried = new Set();
let autoInfo = true;
let autoBackground = true;
let overlayOn = true;
let padOverlay = 'selstart', padBtns = [], overlayAny = false;
const PAD_NAMES = { 0: 'A', 1: 'B', 2: 'X', 3: 'Y', 4: 'LB', 5: 'RB', 6: 'LT', 7: 'RT', 8: 'Select', 9: 'Start', 10: 'L3', 11: 'R3', 12: '↑', 13: '↓', 14: '←', 15: '→', 16: 'Guía' };
const padLabel = (l) => (l && l.length ? l.map((i) => PAD_NAMES[i] || 'Botón ' + i).join(' + ') : 'sin asignar');
const PAD_MODES = ['selstart', 'sela', 'l3r3', 'guide', 'custom', 'off'];
let rawgKey = '';
let steamKey = '', itchKey = '';
let steamId = '';
let showOwned = true;
// (mergeDupes se declara junto a las funciones de grupos)
let autoTrailer = true;
let onlyInstalled = true; // la biblioteca muestra solo lo que se puede jugar ahora
let collections = []; // [{ id, name, games: [ids] }]
let navOpen = {};
let navCollapsed = {}; // secciones de la barra lateral minimizadas      // bibliotecas desplegadas en la barra lateral
const selected = new Set();
let selecting = false;
let anchorId = null; // última portada marcada, para el rango con Shift
let autoTranslate = true;
let deeplKey = '';
let hotkeys = { overlay: 'Ctrl+Shift+O', shot: 'Ctrl+Shift+P', search: 'Ctrl+Alt+Space' };

// Lo descargado + lo que escribiste a mano (lo tuyo manda)
const showOriginal = new Set(); // juegos cuya descripción se está viendo en el idioma original
function baseInfo(g, ignoreToggle) {
  if (!g.info) return {};
  const useEs = g.info.descriptionEs && (ignoreToggle || !showOriginal.has(g.id));
  return { ...g.info, description: useEs ? g.info.descriptionEs : g.info.description };
}
function infoOf(g) {
  if (!g.info && !g.infoEdit) return null;
  return { ...baseInfo(g), ...(g.infoEdit || {}) };
}
// "2006-02-24" -> "24 de febrero de 2006" (RAWG da la fecha en formato ISO)
function formatDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return s;
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function downloadInfo(g, term, auto) {
  if (fetchingInfo.has(g.id)) return { ok: false, error: 'Ya se está descargando.' };
  fetchingInfo.add(g.id);
  let res;
  try { res = await window.api.fetchInfo(g.id, term, auto); } catch { res = { ok: false, error: 'No se pudo descargar la información.' }; }
  fetchingInfo.delete(g.id);
  await load();
  if (res.ok && res.translateError && !auto) toast(`Información descargada, pero no se tradujo: ${res.translateError}`, 5000);
  return res;
}

let infoGame = null;
const listText = (a) => (a || []).join(', ');
function openInfo(g) {
  infoGame = g;
  const inf = { ...baseInfo(g, true), ...(g.infoEdit || {}) };
  $('#infoTerm').value = '';
  $('#infoHint').textContent = 'Útil si no se encontró el juego o se emparejó con otro.';
  $('#infoDesc').value = inf.description || '';
  $('#infoDev').value = listText(inf.developers);
  $('#infoPub').value = listText(inf.publishers);
  $('#infoDate').value = inf.releaseDate || '';
  $('#infoGenres').value = listText(inf.genres);
  $('#infoModal').classList.remove('hidden');
}
function closeInfo() {
  infoGame = null;
  $('#infoModal').classList.add('hidden');
}

// ---------- Descarga en lote ----------
let batchRunning = false;
function openBatchModal() { $('#batchModal').classList.remove('hidden'); }
function setBatchUi(running) {
  batchRunning = running;
  $('#batchCancel').classList.toggle('hidden', !running);
  $('#batchClose').textContent = running ? 'Ocultar' : 'Cerrar';
}
async function startBatch() {
  $('#themeModal').classList.add('hidden');
  const res = await window.api.startInfoBatch();
  if (!res.ok) { toast(res.error || 'No se pudo iniciar la descarga'); return; }
  if (!res.total) { toast('Todos los juegos ya tienen su información'); return; }
  $('#batchResult').replaceChildren();
  $('#batchBar').style.width = '0%';
  $('#batchStatus').textContent = `Preparando ${res.total} juegos…`;
  setBatchUi(true);
  openBatchModal();
}
window.api.onInfoProgress((p) => {
  $('#batchStatus').textContent = `Buscando ${p.done + 1} de ${p.total}: ${p.name}`;
  $('#batchBar').style.width = `${Math.round((p.done / p.total) * 100)}%`;
});
window.api.onInfoDone((r) => {
  setBatchUi(false);
  $('#batchBar').style.width = '100%';
  $('#batchStatus').textContent = r.canceled
    ? `Descarga cancelada: ${r.found} de ${r.done} encontrados.`
    : `Listo: información de ${r.found} de ${r.total} juegos.`;
  const box = $('#batchResult');
  box.replaceChildren();
  if (r.quotaHit) box.append(el('div', null, 'Se acabó el límite diario del traductor gratuito: algunas descripciones quedaron en inglés. Puedes traducirlas otro día con el botón «Traducir al español» de cada juego, o agregar una clave de DeepL en Configuración > Información.'));
  if (r.missed.length) {
    box.append(el('div', null, `No se encontró información de ${r.missed.length}. Revisa su nombre o búscalos a mano con el botón «i» de su página:`));
    const ul = el('ul');
    r.missed.forEach((m) => ul.append(el('li', null, m.name)));
    box.append(ul);
  }
  if ($('#batchModal').classList.contains('hidden')) toast(`Información descargada: ${r.found} de ${r.total} juegos${r.missed.length ? ` (${r.missed.length} sin encontrar)` : ''}`, 5000);
});

// ---------- Visor de capturas ----------
let lightboxEl = null, lightboxGo = null;
function closeLightbox() {
  if (lightboxEl) { lightboxEl.remove(); lightboxEl = null; lightboxGo = null; }
}
function openLightbox(shots, start) {
  closeLightbox();
  let i = start;
  const box = el('div', 'lightbox');
  const img = el('img');
  const go = (n) => { i = (n + shots.length) % shots.length; img.src = shots[i].full; };
  const mk = (cls, txt, fn) => { const b = el('button', 'lb-btn ' + cls, txt); b.onclick = (e) => { e.stopPropagation(); fn(); }; return b; };
  box.append(img, mk('lb-close', '[[x]]', closeLightbox));
  if (shots.length > 1) box.append(mk('lb-prev', '‹', () => go(i - 1)), mk('lb-next', '›', () => go(i + 1)));
  box.onclick = (e) => { if (e.target === box) closeLightbox(); };
  document.body.append(box);
  lightboxEl = box;
  lightboxGo = (d) => go(i + d);
  go(i);
}

// ---------- Fondo de la biblioteca ----------
let bg = { path: null, art: null, dim: 55, blur: 0 };
const isVideoPath = (p) => /\.(mp4|webm|m4v|mov|ogv)$/i.test(String(p || '').split('?')[0]);
let bgVideo = null;
// El vídeo de fondo se pausa cuando no se ve (ventana oculta o minimizada) y mientras hay un juego en marcha
// Opciones de ahorro del vídeo de fondo
let vidPauseBlur = true, vidPauseBattery = true, vidNoBlur = false;
let winFocused = typeof document.hasFocus === 'function' ? document.hasFocus() : true, battery = null;
function syncBgVideo() {
  document.querySelector('main').classList.toggle('vid-noblur', !!(bgVideo && vidNoBlur)); // el desenfoque sobre un vídeo gasta mucha gráfica
  if (!bgVideo) return;
  const onBattery = !!(battery && !battery.charging);
  const stop = document.hidden || !!state.detailId || (runState && runState.state && runState.state !== 'stopping' && bgPauseGame)
    || (vidPauseBlur && !winFocused) || (vidPauseBattery && onBattery);
  if (stop) bgVideo.pause(); else bgVideo.play().catch(() => {});
}
let bgPauseGame = true;
addEventListener('focus', () => { winFocused = true; syncBgVideo(); });
addEventListener('blur', () => { winFocused = false; syncBgVideo(); });
try { if (navigator.getBattery) navigator.getBattery().then((b) => { battery = b; b.addEventListener('chargingchange', syncBgVideo); syncBgVideo(); }).catch(() => {}); } catch { /* sin API de batería */ }
document.addEventListener('visibilitychange', syncBgVideo);
// Fondo propio de la colección que se está viendo (si no tiene, se usa el general)
let autoCollBg = false, collBgAuto = false;
// Banner del juego más jugado de la colección (con él se rellenan las colecciones sin fondo propio)
function autoCollBanner(c) {
  const games = state.games.filter((g) => !g.dupOf && inColl(c, g) && (g.banner || g.bannerFallback));
  if (!games.length) return null;
  games.sort((a, b) => (b.playTime || 0) - (a.playTime || 0) || a.name.localeCompare(b.name));
  return games[0].banner || games[0].bannerFallback;
}
function collBgPath() {
  if (state.detailId || !String(state.filter).startsWith('col:')) return null;
  const c = collections.find((x) => 'col:' + x.id === state.filter);
  if (!c) return null;
  if (c.bg && c.bg.path && !badBg.has(c.bg.path)) { collBgAuto = false; return c.bg.path; }
  const a = autoCollBg ? autoCollBanner(c) : null; collBgAuto = !!a;
  return a;
}
let lastCollBg = '';
// Fondos cuyo archivo no se pudo cargar (borrado, movido o formato no compatible): se saltan y se usa el siguiente
const badBg = new Set();
function bgMissing(p) {
  if (!p || badBg.has(p)) return;
  badBg.add(p);
  const c = collections.find((x) => x.bg && x.bg.path === p);
  const nm = String(p).split(/[\\/]/).pop();
  toast(c ? `No se pudo cargar el fondo de «${c.name}» (${nm}): ¿se borró o movió el archivo? Se usa el fondo general. Con el botón Fondo puedes cambiarlo o quitarlo.` : `No se pudo cargar el fondo (${nm}). ¿Se borró o movió el archivo?`, 7000);
  lastCollBg = '\u0000'; syncCollBg(); applyBackground();
}
function syncCollBg() { const k = collBgPath() || ''; if (k !== lastCollBg) { lastCollBg = k; applyBackground(); } else syncBgVideo(); }
function applyBackground() {
  const layer = $('#bgLayer'), main = document.querySelector('main');
  main.style.setProperty('--bg-dim', bg.dim);
  layer.style.imageRendering = '';
  const cb = collBgPath();
  const auto = !!cb && collBgAuto; // banner automático: apaisado y de baja resolución
  main.style.setProperty('--bg-blur', Math.max(bg.blur, auto ? 6 : 0) + 'px'); const P = cb || (badBg.has(bg.path) ? null : bg.path), A = cb ? null : bg.art; // dentro de una colección con fondo propio se usa ese
  const vid = P && isVideoPath(P);
  layer.classList.toggle('wide', !!auto && !vid && !!P);
  if (!vid && bgVideo) { bgVideo.pause(); bgVideo.removeAttribute('src'); bgVideo.load(); bgVideo.remove(); bgVideo = null; }
  if (vid) {
    layer.style.backgroundImage = '';
    const url = imgUrl(P);
    if (!bgVideo) { bgVideo = document.createElement('video'); bgVideo.muted = true; bgVideo.loop = true; bgVideo.playsInline = true; bgVideo.autoplay = true; bgVideo.disablePictureInPicture = true; bgVideo.setAttribute('aria-hidden', 'true'); bgVideo.onerror = () => bgMissing(bgVideo.dataset.p); layer.prepend(bgVideo); }
    bgVideo.dataset.p = P;
    if (bgVideo.dataset.src !== url) { bgVideo.dataset.src = url; bgVideo.src = url; }
    main.classList.add('has-bg');
    syncBgVideo();
  } else if (P) {
    layer.style.backgroundImage = `url("${imgUrl(P)}")`;
    if (!/^https?:/.test(P)) { const pr = new Image(); pr.onerror = () => { if (collBgPath() === P || bg.path === P) bgMissing(P); }; pr.src = imgUrl(P); }
    if (auto) { // el banner se muestra a todo el ancho, con su forma natural, y se funde con el fondo hacia abajo
      const u = imgUrl(P); layer.dataset.wideFor = u;
      const im = new Image(); im.onload = () => { if (layer.dataset.wideFor === u && im.naturalWidth) layer.style.setProperty('--wide-ratio', (im.naturalWidth / im.naturalHeight).toFixed(3)); }; im.src = u;
    }
    main.classList.add('has-bg');
  } else if (A && window.THEME_ART.get(A)) {
    layer.style.backgroundImage = window.THEME_ART.get(A);
    layer.style.imageRendering = window.THEME_ART.pixel(A) ? 'pixelated' : '';
    main.classList.add('has-bg');
  } else {
    layer.style.backgroundImage = '';
    main.classList.remove('has-bg');
  }
  const thumb = $('#bgThumb');
  thumb.querySelectorAll('video').forEach((v) => v.remove());
  const vidG = bg.path && isVideoPath(bg.path); // la muestra de Configuración enseña siempre el fondo general
  thumb.style.backgroundImage = bg.path && !vidG ? `url("${imgUrl(bg.path)}")` : (!bg.path && bg.art ? window.THEME_ART.thumb(bg.art) : '');
  if (vidG) { const v = document.createElement('video'); v.muted = true; v.preload = 'metadata'; v.src = imgUrl(bg.path) + '#t=0.5'; v.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:7px;pointer-events:none'; thumb.textContent = ''; thumb.append(v); }
  else thumb.textContent = bg.path || bg.art ? '' : 'Sin fondo';
}
// ---------- Colores del tema a partir del fondo ----------
let autoBgColors = true;
const hsl = (h, s, l) => toHex(...hslToRgb(h, s, l));
// Tema oscuro teñido con el color medio del fondo + acentos con los colores más vivos
function themeFromPalette(pal) {
  const [h, s0] = rgbToHsl(...hexToRgb(pal.avg || '#0f1115'));
  const s = Math.min(0.4, s0);
  const out = { bg: hsl(h, s, 0.07), panel: hsl(h, s, 0.115), text: hsl(h, Math.min(0.25, s), 0.93) };
  if (pal.colors && pal.colors.length) {
    out.accent = pal.colors[0];
    out.accent2 = pal.colors[1] || shiftHue(pal.colors[0], 28);
  } else { // fondo casi sin color (blanco y negro): se conservan los acentos actuales
    out.accent = theme.accent; out.accent2 = theme.accent2;
  }
  return out;
}
// Saca una miniatura de lo que se ve de fondo (imagen o fotograma del vídeo)
async function sampleBackground() {
  const main = document.querySelector('main');
  if (!bg.path && !bg.art) return null;
  if (bg.path && !isVideoPath(bg.path)) { const u = await window.api.getThumb(bg.path); if (u) return u; }
  if (bgVideo && bgVideo.readyState < 2) await new Promise((res) => { bgVideo.addEventListener('loadeddata', res, { once: true }); setTimeout(res, 2000); });
  const rect = main.getBoundingClientRect();
  document.body.classList.add('bg-sampling');
  await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(res, 60))));
  const u = await window.api.grabBackground({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
  document.body.classList.remove('bg-sampling');
  return u;
}
async function adaptThemeToBackground(quiet) {
  const url = await sampleBackground();
  const px = url && (await decodePixels(url));
  if (!px) { if (!quiet) toast('No se pudieron sacar los colores del fondo'); return false; }
  const t = themeFromPalette(computePalette(px, 48, 48));
  theme = { ...theme, ...t, id: 'custom', name: 'Personalizado', preset: 'custom' };
  applyTheme(theme); syncThemeModal(); saveTheme(); refreshPageStyle();
  toast('Colores adaptados al fondo. Si te gustan, ponle nombre y guárdalo como tema');
  return true;
}
$('#gameBg').onchange = (e) => { gameBg = e.target.checked; window.api.setSettings({ gameBg }); const g = state.games.find((x) => x.id === state.detailId); if (g) applyGameBg($('#detail'), g); };
// Diagnóstico del fondo de colecciones: qué ve Comptus ahora mismo (para ajustar si no se aplica)
function collBgDiag() {
  const c = collections.find((x) => 'col:' + x.id === state.filter);
  const layer = $('#bgLayer'), main = document.querySelector('main');
  const cs = getComputedStyle(layer);
  return [
    `interfaz: ${document.title || ''}`,
    `vista (filtro): ${state.filter} · página de juego abierta: ${state.detailId || 'no'}`,
    `colección encontrada: ${c ? c.name + ' (' + c.games.length + ' juegos)' : 'no'}`,
    `fondo propio guardado: ${c && c.bg ? c.bg.path : '(ninguno)'}`,
    `casilla «banner del juego más jugado»: ${autoCollBg ? 'activada' : 'desactivada'}`,
    `banner automático elegido: ${c ? autoCollBanner(c) || '(ningún juego con banner)' : '-'}`,
    `fondo que se aplicaría: ${collBgPath() || '(el general)'}`,
    `fondo general: ${bg.path || bg.art || '(ninguno)'}`,
    `capa de fondo: display=${cs.display}, imagen=${(layer.style.backgroundImage || '(ninguna)').slice(0, 160)}, vídeo=${layer.querySelector('video') ? 'sí' : 'no'}, clase has-bg=${main.classList.contains('has-bg')}`,
    `colecciones: ${collections.map((x) => x.name + (x.bg ? ' [con fondo]' : '')).join(', ')}`,
  ].join('\n');
}
$('#collBgDiag').onclick = async () => { const t = collBgDiag(); try { await navigator.clipboard.writeText(t); toast('Diagnóstico copiado: pégalo en el chat'); } catch { toast(t.slice(0, 200)); } };
$('#vidPauseBlur').onchange = (e) => { vidPauseBlur = e.target.checked; window.api.setSettings({ vidPauseBlur }); syncBgVideo(); };
$('#vidPauseBattery').onchange = (e) => { vidPauseBattery = e.target.checked; window.api.setSettings({ vidPauseBattery }); syncBgVideo(); };
$('#vidNoBlur').onchange = (e) => { vidNoBlur = e.target.checked; window.api.setSettings({ vidNoBlur }); syncBgVideo(); };
$('#autoCollBg').onchange = (e) => { autoCollBg = e.target.checked; window.api.setSettings({ autoCollBg }); lastCollBg = '\u0000'; syncCollBg(); };
$('#adaptBg').onclick = () => adaptThemeToBackground(false);
$('#autoBgColors').onchange = (e) => { autoBgColors = e.target.checked; window.api.setSettings({ autoBgColors }); };

let saveBgTimer;
function saveBackground() {
  clearTimeout(saveBgTimer);
  saveBgTimer = setTimeout(() => window.api.setSettings({ background: bg }), 300);
}

// ---------- Temas de color ----------
const PRESETS = [
  { id: 'midnight', name: 'Medianoche', bg: '#0f1115', panel: '#171a21', text: '#e8eaf0', accent: '#6c8cff', accent2: '#8f6cff' },
  { id: 'emerald',  name: 'Esmeralda',  bg: '#0c1311', panel: '#131d1a', text: '#e6f2ee', accent: '#34d399', accent2: '#22a6b3' },
  { id: 'sunset',   name: 'Atardecer',  bg: '#15100f', panel: '#1e1715', text: '#f4e9e4', accent: '#ff7a59', accent2: '#ffb347' },
  { id: 'neon',     name: 'Rosa neón',  bg: '#120d16', panel: '#1b1422', text: '#f3e8f8', accent: '#ff4fa3', accent2: '#b44fff' },
  { id: 'charcoal', name: 'Carbón',     bg: '#0b0b0b', panel: '#151515', text: '#eeeeee', accent: '#e5e5e5', accent2: '#9a9a9a' },
  { id: 'light',    name: 'Claro',      bg: '#f3f4f8', panel: '#ffffff', text: '#1c2030', accent: '#4f6cff', accent2: '#8a5cff' },
];
const ART_PRESETS = window.ART_THEMES || [];
const IMG_PRESETS = window.IMG_THEMES || [];
const THEME_KEYS = { cBg: 'bg', cPanel: 'panel', cText: 'text', cAccent: 'accent', cAccent2: 'accent2' };
let theme = { ...PRESETS[0], preset: 'midnight' };
let cardSize = 170;
let cardShape = 'tall', hideNames = false, wideLogos = true; // forma de las portadas (vertical/horizontal) y si se ocultan los nombres
const CARD_MIN = 90, CARD_MAX = 480;

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
// Texto oscuro o claro encima de botones de acento, según qué tan claro sea el color
function onAccent(a, b) {
  return (luminance(a) + luminance(b)) / 2 > 0.35 ? '#111111' : '#ffffff';
}

function applyTheme(t) {
  const root = document.documentElement.style;
  root.setProperty('--bg', t.bg);
  root.setProperty('--panel', t.panel);
  root.setProperty('--text', t.text);
  root.setProperty('--accent', t.accent);
  root.setProperty('--accent-2', t.accent2);
  root.setProperty('--on-accent', onAccent(t.accent, t.accent2));
  root.colorScheme = luminance(t.bg) > 0.4 ? 'light' : 'dark';
}
// Reparte el ancho disponible: el tamaño elegido es el MÍNIMO de cada portada; se calcula cuántas caben
// y se ensanchan lo justo para llenar la fila (sin huecos a la derecha y sin que se monten unas sobre otras).
// Precarga en segundo plano las imágenes de las tarjetas que aún no se ven (en tandas pequeñas, cuando el programa está libre),
// para que al desplazarte ya estén listas y no aparezcan de golpe.
let warmToken = 0, lastScroll = 0, renderToken = 0;
addEventListener('scroll', () => { lastScroll = Date.now(); }, { capture: true, passive: true });
function warmGrid() {
  const tok = ++warmToken;
  const imgs = [...$('#grid').querySelectorAll('img[loading="lazy"]')];
  let i = 0;
  const step = () => {
    if (tok !== warmToken || document.hidden) return;
    if (Date.now() - lastScroll < 400) { setTimeout(step, 300); return; } // no mientras estás desplazándote
    for (let n = 0; n < 6 && i < imgs.length; n++, i++) { const im = imgs[i]; if (im.isConnected && im.loading === 'lazy') im.loading = 'eager'; }
    if (i < imgs.length) (window.requestIdleCallback ? requestIdleCallback(step, { timeout: 400 }) : setTimeout(step, 150));
  };
  setTimeout(() => { if (tok === warmToken) step(); }, 1200);
}
function layoutGrid() {
  const grid = $('#grid');
  if (!grid.clientWidth) return; // oculto (p. ej. con la página de un juego abierta)
  const cs = getComputedStyle(grid);
  const avail = grid.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
  const gap = parseFloat(cs.columnGap) || 0;
  const wide = grid.classList.contains('coll-grid') || grid.classList.contains('wide-cards'); // tarjetas horizontales en la página de colecciones
  const minW = wide ? Math.round(cardSize * 1.9) : cardSize;
  const n = Math.max(1, Math.floor((avail + gap) / (minW + gap)));
  let w = Math.max(40, Math.floor(((avail - gap * (n - 1)) / n) * 100) / 100);
  if (n === 1) w = Math.min(w, Math.round(minW * 1.4)); // una sola columna: que no ocupe todo el ancho
  grid.style.setProperty('--card-w', w + 'px');
  grid.style.gridTemplateColumns = `repeat(${n}, ${w}px)`;
}
if (typeof ResizeObserver !== 'undefined') new ResizeObserver(layoutGrid).observe($('#grid'));

function applyShape() {
  const g = $('#grid'); if (!g) return;
  g.classList.toggle('wide-cards', cardShape === 'wide');
  g.classList.toggle('no-names', !!hideNames);
}
function applyCardSize() {
  applyShape();
  document.documentElement.style.setProperty('--card-min', cardSize + 'px');
  layoutGrid();
  $('#grid').classList.toggle('compact', cardSize < 140); // con portadas pequeñas se ocultan los textos largos
}
// Un solo lugar para cambiar el tamaño: sincroniza los dos controles y guarda
function setCardSize(v) {
  cardSize = Math.min(CARD_MAX, Math.max(CARD_MIN, Math.round(v)));
  applyCardSize();
  $('#cardSize').value = cardSize;
  $('#sizeQuick').value = cardSize;
  saveTheme();
}

let saveThemeTimer;
function saveTheme() {
  clearTimeout(saveThemeTimer);
  saveThemeTimer = setTimeout(() => window.api.setSettings({ theme, cardSize }), 300);
}

function syncThemeModal() {
  $('#bgDim').value = bg.dim;
  $('#bgBlur').value = bg.blur;
  $('#autoInfo').checked = autoInfo;
  $('#autoBackground').checked = autoBackground;
  $('#autoBgColors').checked = autoBgColors;
  $('#gameBg').checked = gameBg;
  $('#autoCollBg').checked = autoCollBg;
  $('#vidPauseBlur').checked = vidPauseBlur; $('#vidPauseBattery').checked = vidPauseBattery; $('#vidNoBlur').checked = vidNoBlur;
  $('#transitions').checked = transitions;
  $('#sysPad').checked = padOn; $('#couchStart').checked = couchStart;
  $('#saveAuto').checked = saveAuto; $('#saveKeep').value = saveKeep; showSaveDb();
  $('#autoTrailer').checked = autoTrailer;
  $('#animMode').value = animMode;
  $('#rawgKey').value = rawgKey;
  $('#steamKey').value = steamKey;
  $('#itchKey').value = itchKey;
  $('#steamId').value = steamId;
  $('#showOwned').checked = showOwned;
  $('#mergeDupes').checked = mergeDupes;
  $('#ubiVia').checked = ubiVia;
  $('#autoTranslate').checked = autoTranslate;
  $('#deeplKey').value = deeplKey;
  $('#overlayOn').checked = overlayOn;
  $('#ovAny').checked = overlayAny; $('#ovPad').value = padOverlay; $('#ovPadCustom').classList.toggle('hidden', padOverlay !== 'custom'); $('#ovPadLbl').textContent = padLabel(padBtns);
  $('#hkOverlay').value = hotkeys.overlay;
  $('#hkShot').value = hotkeys.shot;
  $('#hkSearch').value = hotkeys.search || 'Ctrl+Alt+Space';
  for (const [id, key] of Object.entries(THEME_KEYS)) $('#' + id).value = theme[key];
  $('#cardSize').value = cardSize;
  $('#sizeQuick').value = cardSize;
  document.querySelectorAll('.preset').forEach((b) => b.classList.toggle('active', b.dataset.id === theme.preset));
}


// ---------- Tema automático (por hora o según el modo claro/oscuro de Windows) ----------
let autoTheme = { mode: 'off', day: '', night: '', from: '07:00', to: '19:00' }, autoPeriod = null, autoTimer = null;
const allThemes = () => [...PRESETS, ...IMG_PRESETS, ...myThemes];
function autoIsDay() {
  if (autoTheme.mode === 'system') return !(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  const toMin = (t) => { const [h, m] = String(t || '').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const now = new Date(), cur = now.getHours() * 60 + now.getMinutes(), a = toMin(autoTheme.from), b = toMin(autoTheme.to);
  return a <= b ? cur >= a && cur < b : cur >= a || cur < b;
}
// force: aplica aunque el periodo no haya cambiado (al abrir, o al activar la opción)
function autoThemeTick(force) {
  if (autoTheme.mode === 'off') return;
  const day = autoIsDay();
  if (!force && autoPeriod === day) return; // si elegiste otro tema a mano, se respeta hasta el siguiente cambio de periodo
  autoPeriod = day;
  const id = day ? autoTheme.day : autoTheme.night;
  const p = allThemes().find((t) => t.id === id);
  if (p && theme.preset !== p.id) chooseTheme(p);
}
function fillAutoThemeSelects() {
  for (const [sel, cur] of [['#autoDay', autoTheme.day], ['#autoNight', autoTheme.night]]) {
    const el2 = $(sel); el2.replaceChildren();
    const add = (label, list) => { if (!list.length) return; const g = document.createElement('optgroup'); g.label = label; for (const t of list) { const o = document.createElement('option'); o.value = t.id; o.textContent = t.name; g.append(o); } el2.append(g); };
    add('Temas', PRESETS); add('Con ilustración', IMG_PRESETS); add('Mis temas', myThemes);
    el2.value = cur || '';
  }
  $('#autoMode').value = autoTheme.mode; $('#autoFrom').value = autoTheme.from; $('#autoTo').value = autoTheme.to;
  $('#autoThemeOpts').classList.toggle('hidden', autoTheme.mode === 'off');
  $('#autoHours').classList.toggle('hidden', autoTheme.mode !== 'time');
}
function saveAutoTheme() { window.api.setSettings({ autoTheme }); }
function startAutoTheme() {
  clearInterval(autoTimer);
  if (autoTheme.mode !== 'off') autoTimer = setInterval(() => autoThemeTick(false), 30000);
}
$('#autoMode').onchange = (e) => {
  autoTheme.mode = ['time', 'system'].includes(e.target.value) ? e.target.value : 'off';
  if (autoTheme.mode !== 'off') {
    if (!autoTheme.day) autoTheme.day = (PRESETS.find((t) => luminance(t.bg) > 0.4) || PRESETS[0]).id;
    if (!autoTheme.night) autoTheme.night = PRESETS[0].id;
  }
  fillAutoThemeSelects(); saveAutoTheme(); startAutoTheme(); autoPeriod = null; autoThemeTick(true);
};
for (const [id, key] of [['#autoDay', 'day'], ['#autoNight', 'night'], ['#autoFrom', 'from'], ['#autoTo', 'to']]) {
  $(id).onchange = (e) => { autoTheme[key] = e.target.value; saveAutoTheme(); autoPeriod = null; autoThemeTick(true); };
}
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => autoThemeTick(false)); } catch {}
let myThemes = []; // temas propios: { id, name, bg, panel, text, accent, accent2 }
function chooseTheme(p) {
    theme = { id: p.id, name: p.name, bg: p.bg, panel: p.panel, text: p.text, accent: p.accent, accent2: p.accent2, preset: p.id };
    // los temas con fondo lo ponen; uno sin fondo solo quita el fondo de un tema anterior (tu imagen propia se respeta)
    if (p.bgCfg) { // tema propio con fondo incluido: pone la imagen (o el dibujo), el oscurecido y el desenfoque guardados
      bg = { ...bg, path: p.bgCfg.path || null, art: p.bgCfg.path ? null : (p.bgCfg.art || null), dim: p.bgCfg.dim != null ? p.bgCfg.dim : bg.dim, blur: p.bgCfg.blur != null ? p.bgCfg.blur : bg.blur };
      applyBackground(); saveBackground(); syncThemeModal();
    } else if (p.art) { bg.path = null; bg.art = p.art; applyBackground(); saveBackground(); syncThemeModal(); }
    else if (bg.art) { bg.art = null; applyBackground(); saveBackground(); }
    applyTheme(theme);
    syncThemeModal();
    saveTheme();
    refreshPageStyle();
}
function themeButton(p, mine) {
  const b = el('button', 'preset' + (mine ? ' mine' : ''));
  b.dataset.id = p.id;
  const sw = el('div', 'swatch');
  const bar = `linear-gradient(90deg, ${p.bg} 0 30%, ${p.panel} 30% 55%, ${p.accent} 55% 78%, ${p.accent2} 78%)`;
  const cfg = p.bgCfg || null;
  const art = cfg ? (cfg.path ? `url("${imgUrl(cfg.path)}")` : (cfg.art && window.THEME_ART.thumb(cfg.art))) : (p.art && window.THEME_ART.thumb(p.art));
  const vidPath = cfg && cfg.path && isVideoPath(cfg.path) ? cfg.path : null;
  sw.style.background = art && !vidPath ? `${bar} bottom / 100% 32% no-repeat, ${art} center / cover` : bar;
  if (vidPath) { // tema con vídeo de fondo: se ve un fotograma y una marca de «vídeo»
    sw.style.position = 'relative';
    const v = document.createElement('video'); v.muted = true; v.preload = 'metadata'; v.src = imgUrl(vidPath) + '#t=0.5';
    v.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:68%;object-fit:cover;pointer-events:none;border-radius:inherit';
    const tag = el('span', null, '▶'); tag.style.cssText = 'position:absolute;right:4px;top:3px;font-size:9px;line-height:1;padding:2px 4px;border-radius:4px;background:rgba(0,0,0,.6);color:#fff';
    sw.append(v, tag);
  }
  b.append(sw, el('span', null, p.name));
  b.onclick = () => chooseTheme(p);
  if (mine) {
    const del = el('span', 'preset-del', '[[x]]');
    del.title = 'Borrar este tema';
    del.onclick = (e) => {
      e.stopPropagation();
      myThemes = myThemes.filter((t) => t.id !== p.id);
      if (theme.preset === p.id) theme.preset = 'custom';
      window.api.setSettings({ myThemes });
      saveTheme();
      buildPresets(); syncThemeModal();
    };
    b.append(del);
  }
  return b;
}
function buildPresets() {
  $('#presets').replaceChildren(...PRESETS.map((p) => themeButton(p, false)));
  $('#imgPresets').replaceChildren(...IMG_PRESETS.map((p) => themeButton(p, false)));
  $('#myThemes').replaceChildren(...myThemes.map((p) => themeButton(p, true)));
  $('#myThemes').classList.toggle('hidden', !myThemes.length);
  $('#myThemesEmpty').classList.toggle('hidden', myThemes.length > 0);
  if (typeof fillAutoThemeSelects === 'function') fillAutoThemeSelects();
}
// Guarda los colores que tienes puestos ahora como un tema propio (si el nombre ya existe, lo reemplaza)
function saveMyTheme() {
  const name = $('#themeName').value.trim().slice(0, 30);
  if (!name) { toast('Escribe un nombre para el tema'); $('#themeName').focus(); return; }
  const found = myThemes.find((t) => t.name.toLowerCase() === name.toLowerCase());
  const id = found ? found.id : 'my:' + Date.now().toString(36);
  const withBg = $('#themeWithBg').checked;
  const t = { id, name, bg: theme.bg, panel: theme.panel, text: theme.text, accent: theme.accent, accent2: theme.accent2,
    ...(withBg ? { bgCfg: { path: bg.path || null, art: bg.path ? null : (bg.art || null), dim: bg.dim, blur: bg.blur } } : {}) };
  myThemes = found ? myThemes.map((x) => (x.id === id ? t : x)) : [...myThemes, t];
  theme.preset = id;
  window.api.setSettings({ myThemes });
  saveTheme();
  $('#themeName').value = '';
  buildPresets(); syncThemeModal();
  toast((found ? `Tema «${name}» actualizado` : `Tema «${name}» guardado`) + (withBg && (t.bgCfg.path || t.bgCfg.art) ? (t.bgCfg.path && isVideoPath(t.bgCfg.path) ? ' (con su fondo de vídeo)' : ' (con su fondo)') : ''));
}

$('#exportThemes').onclick = async () => {
  const res = await window.api.exportThemes(myThemes);
  if (res.canceled) return;
  toast(res.ok ? `${res.count} tema${res.count === 1 ? '' : 's'} exportado${res.count === 1 ? '' : 's'} (una carpeta por tema)` : (res.error || 'No se pudo exportar'));
};
$('#importThemes').onclick = async () => {
  const res = await window.api.importThemes();
  if (res.canceled) return;
  if (!res.ok) { toast(res.error || 'No se pudo importar'); return; }
  let missing = 0;
  for (const t of res.themes) {
    if (t.missingBg) missing++;
    const found = myThemes.find((x) => x.name.toLowerCase() === t.name.toLowerCase());
    const { missingBg, ...clean } = t;
    const id = found ? found.id : 'my:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    const nt = { id, ...clean };
    myThemes = found ? myThemes.map((x) => (x.id === id ? nt : x)) : [...myThemes, nt];
  }
  window.api.setSettings({ myThemes });
  buildPresets(); syncThemeModal();
  toast(`${res.themes.length} tema${res.themes.length === 1 ? '' : 's'} importado${res.themes.length === 1 ? '' : 's'}` + (missing ? ` (${missing} sin su fondo: falta el archivo junto al tema.json)` : '') + (res.bad ? `; ${res.bad} no válido${res.bad === 1 ? '' : 's'}` : ''));
};

// Transparencia de los recuadros (0 = opacos; hasta 70 %). Con transparencia se desenfoca lo que queda detrás para que el texto se lea bien
let boxTransp = 0;
function applyBoxTransp() {
  const root = document.documentElement.style;
  root.setProperty('--box-op', (100 - boxTransp) + '%');
  root.setProperty('--box-blur', boxTransp ? '8px' : '0px');
  const v = $('#boxTranspVal'); if (v) v.textContent = boxTransp ? boxTransp + ' %' : 'opacos';
  const s = $('#boxTransp'); if (s && +s.value !== boxTransp) s.value = boxTransp;
}
$('#boxTransp').oninput = (e) => { boxTransp = Math.max(0, Math.min(70, parseInt(e.target.value, 10) || 0)); applyBoxTransp(); clearTimeout(applyBoxTransp.t); applyBoxTransp.t = setTimeout(() => window.api.setSettings({ boxTransp }), 300); };

// ---------- Bibliotecas activas ----------
function buildLibraries() {
  $('#libraries').replaceChildren(...SOURCES.filter((s) => s.id !== 'local').map((s) => {
    const label = el('label', 'lib');
    const cb = el('input');
    cb.type = 'checkbox';
    cb.checked = isEnabled(s);
    cb.onchange = async () => {
      sourceEnabled = { ...sourceEnabled, [s.id]: cb.checked };
      await window.api.setSettings({ sources: sourceEnabled });
      toast('Actualizando biblioteca…');
      await load();
    };
    const logo = sourceIcon(s.id, 16);
    logo.style.color = s.color;
    label.append(cb, logo, el('span', null, s.name));
    return label;
  }));
}

// ---------- Colecciones propias y selección múltiple ----------
const saveCollections = () => window.api.setSettings({ collections: collections.map(({ coverSm, coverAnim, ...c }) => c) }); // coverSm/coverAnim son solo de caché
function setSelecting(on) {
  selecting = on;
  if (!on) { selected.clear(); anchorId = null; }
  $('#selectBtn').classList.toggle('on', on);
  grid.classList.toggle('selecting', on);
  updateSelBar();
  if (!on) render();
}
function updateSelBar() {
  const bar = $('#selBar');
  bar.classList.toggle('hidden', !selecting || !!state.detailId);
  $('#selCount').textContent = selected.size === 1 ? '1 seleccionado' : `${selected.size} seleccionados`;
  $('#selAdd').disabled = !selected.size;
  const cur = state.filter.startsWith('col:') ? collections.find((c) => 'col:' + c.id === state.filter) : null;
  const rm = $('#selRemove');
  rm.classList.toggle('hidden', !cur);
  if (cur) { rm.textContent = `Quitar de «${cur.name}»`; rm.disabled = !selected.size; }
}
function paintSelection() {
  document.querySelectorAll('#grid .card').forEach((c) => c.classList.toggle('selected', selected.has(c.dataset.id)));
  updateSelBar();
}
function toggleSelected(id, card) {
  if (selected.has(id)) selected.delete(id); else selected.add(id);
  anchorId = id;
  if (card) card.classList.toggle('selected', selected.has(id));
  updateSelBar();
}
// Shift + clic: marca todo lo que hay entre la última portada marcada y esta, en el orden que ves
function selectRange(fromId, toId) {
  const ids = visibleGames().map((g) => g.id);
  const a = ids.indexOf(fromId), b = ids.indexOf(toId);
  if (a < 0 || b < 0) { toggleSelected(toId); return; }
  for (const id of ids.slice(Math.min(a, b), Math.max(a, b) + 1)) selected.add(id);
  anchorId = toId;
  paintSelection();
}
function setInCollection(c, ids, add) {
  const set = new Set(c.games);
  for (const id of ids) { if (add) set.add(id); else set.delete(id); }
  c.games = [...set];
  saveCollections();
  render();
}
const EMOJIS = ['📁','🔫','🎯','⚔️','🛡️','🏹','💣','🧟','👾','🕹️','🎮','🚀','🛸','🏎️','🚗','✈️','⚽','🏀','🥊','🏆','⭐','❤️','🔥','🌙','☀️','🏰','🐉','👑','🧩','🎲','🧠','🔧','🌍','🎵','👥','🍕','📚','🕵️','🌲','🌊'];
// Icono de una colección: emoji o imagen propia (por defecto 📁)
function collIcon(c) {
  const sp = el('span', 'coll-ico');
  if (c.iconImage) { const im = el('img'); im.src = imgUrl(c.iconImage); im.alt = ''; sp.append(im); }
  else if (c.icon) sp.textContent = c.icon; else sp.append(iconEl('folder'));
  return sp;
}
function createCollection(name, ids = [], icon = {}) {
  const clean = String(name || '').trim().slice(0, 40);
  if (!clean) return null;
  const dup = collections.find((c) => c.name.toLowerCase() === clean.toLowerCase());
  if (dup) { if (ids.length) setInCollection(dup, ids, true); return dup; }
  const c = { id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: clean, games: [...new Set(ids)], ...icon };
  collections.push(c);
  saveCollections();
  render();
  return c;
}
function deleteCollection(c) {
  if (!confirm(`¿Eliminar la colección «${c.name}»?\nLos juegos no se borran, solo se quita el grupo.`)) return;
  collections = collections.filter((x) => x.id !== c.id);
  saveCollections();
  if (state.filter === 'col:' + c.id) state.filter = 'all';
  render();
}
let renaming = null;
let pendingIds = [];
let draftIcon = { icon: '', iconImage: '' };
function paintDraftIcon() {
  const prev = $('#collIconPreview');
  prev.replaceChildren(collIcon(draftIcon));
  $('#collIconInput').value = draftIcon.icon || '';
}
function openCollName(c, ids = []) {
  renaming = c || null;
  pendingIds = ids;
  draftIcon = { icon: (c && c.icon) || '', iconImage: (c && c.iconImage) || '' };
  $('#collNameTitle').textContent = c ? 'Editar colección' : 'Nueva colección';
  $('#collNameInput').value = c ? c.name : '';
  const grid = $('#collEmojis');
  if (!grid.childElementCount) {
    for (const e of EMOJIS) {
      const b = el('button', 'emoji', e); b.type = 'button';
      b.onclick = () => { draftIcon = { icon: e, iconImage: '' }; paintDraftIcon(); };
      grid.append(b);
    }
  }
  paintDraftIcon();
  $('#collNameModal').classList.remove('hidden');
  $('#collNameInput').focus();
}
const closeCollName = () => { $('#collNameModal').classList.add('hidden'); renaming = null; pendingIds = []; };
let pickIds = [];
let pickFromSelection = false;
function renderCollPick() {
  const box = $('#collPickList');
  if (!collections.length) { box.replaceChildren(el('p', 'hint', 'Todavía no tienes colecciones. Crea la primera abajo.')); return; }
  box.replaceChildren(...sortedCollections().map((c) => {
    const n = pickIds.filter((id) => c.games.includes(id)).length;
    const all = n === pickIds.length;
    const b = el('button', 'pick-row' + (all ? ' on' : ''));
    b.type = 'button';
    b.append(el('span', 'pick-mark', all ? '[[check]]' : n ? '[[minus]]' : ''), collIcon(c), el('span', 'pick-name', c.name), el('span', 'count', String(c.games.length)));
    b.onclick = () => {
      setInCollection(c, pickIds, !all);
      toast(all ? `Quitados de «${c.name}»` : `Añadidos a «${c.name}»`);
      finishPick();
    };
    return b;
  }));
}
// Al terminar de elegir: se cierra el panel y se suelta la selección
function finishPick() {
  $('#collPickModal').classList.add('hidden');
  if (pickFromSelection) setSelecting(false);
}
function openCollPick(ids, fromSelection = false) {
  pickIds = ids;
  pickFromSelection = fromSelection;
  $('#collPickTitle').textContent = ids.length === 1 ? 'Añadir a colección' : `Añadir ${ids.length} juegos a una colección`;
  $('#collPickNew').value = '';
  renderCollPick();
  $('#collPickModal').classList.remove('hidden');
}
const closeCollPick = () => $('#collPickModal').classList.add('hidden');

// ---------- Secciones de la barra lateral ----------
const SECTION_BODY = { sources: '#sourceFilters', colls: '#collList', games: '#gameList' };
function applyCollapsed() {
  document.querySelectorAll('.nav-title.collapsible').forEach((t) => {
    const off = !!navCollapsed[t.dataset.sec];
    document.querySelector(SECTION_BODY[t.dataset.sec]).classList.toggle('hidden', off);
    t.classList.toggle('collapsed', off);
    rich(t.querySelector('.sec-chev'), off ? '[[chevR]]' : '[[chevD]]');
  });
  document.querySelector('.sidebar').classList.toggle('games-off', !!navCollapsed.games); // sin la lista de juegos, el resto usa todo el espacio
}
document.querySelector('.sidebar').addEventListener('click', (e) => {
  const t = e.target.closest('.nav-title.collapsible');
  if (!t || e.target.closest('button')) return; // el botón ＋ tiene su propia acción
  if (e.target.closest('.nav-link')) { // «Colecciones»: abre la página con todas las colecciones
    navCollapsed.colls = false;
    window.api.setSettings({ navCollapsed });
    applyCollapsed();
    state.filter = 'collections'; state.detailId = null;
    render();
    return;
  }
  navCollapsed[t.dataset.sec] = !navCollapsed[t.dataset.sec];
  window.api.setSettings({ navCollapsed });
  applyCollapsed();
});

// ---------- Eventos ----------
$('#newColl').onclick = () => openCollName(null);
$('#collNameCancel').onclick = closeCollName;
$('#collIconInput').oninput = (e) => { draftIcon = { icon: e.target.value.trim(), iconImage: '' }; $('#collIconPreview').replaceChildren(collIcon(draftIcon)); };
$('#collIconClear').onclick = () => { draftIcon = { icon: '', iconImage: '' }; paintDraftIcon(); };
$('#collIconImg').onclick = async () => {
  const p = await window.api.pickImage('icon', 'Icono colección');
  if (p) { draftIcon = { icon: '', iconImage: p }; paintDraftIcon(); }
};
$('#collNameModal').onclick = (e) => { if (e.target.id === 'collNameModal') closeCollName(); };
$('#collNameForm').onsubmit = (e) => {
  e.preventDefault();
  const name = $('#collNameInput').value.trim();
  if (!name) return;
  if (renaming) { renaming.name = name.slice(0, 40); renaming.icon = draftIcon.icon; renaming.iconImage = draftIcon.iconImage; saveCollections(); render(); }
  else {
    const c = createCollection(name, pendingIds, { ...draftIcon });
    if (c && pendingIds.length) { toast(`Añadidos a «${c.name}»`); setSelecting(false); }
    else if (c) { state.filter = 'col:' + c.id; state.detailId = null; render(); }
  }
  closeCollName();
};
$('#collPickClose').onclick = closeCollPick;
$('#collPickModal').onclick = (e) => { if (e.target.id === 'collPickModal') closeCollPick(); };
$('#collPickForm').onsubmit = (e) => { e.preventDefault(); $('#collPickCreate').click(); };
$('#collPickCreate').onclick = () => {
  const c = createCollection($('#collPickNew').value, pickIds);
  if (!c) return;
  toast(`Añadidos a «${c.name}»`);
  finishPick();
};
function updateOnlyTitle() { $('#onlyInstalled').title = `Solo juegos instalados (los locales siempre se ven): ${onlyInstalled ? 'activado' : 'desactivado'}`; }
$('#onlyInstalled').onclick = () => {
  onlyInstalled = !onlyInstalled;
  $('#onlyInstalled').classList.toggle('on', onlyInstalled);
  updateOnlyTitle();
  window.api.setSettings({ onlyInstalled });
  render();
};
grid.addEventListener('mousedown', (e) => { if (e.shiftKey) e.preventDefault(); });
$('#selectBtn').onclick = () => setSelecting(!selecting);
$('#selCancel').onclick = () => setSelecting(false);
$('#selAll').onclick = () => { visibleGames().forEach((g) => selected.add(g.id)); render(); updateSelBar(); };
// «Añadir a colección ▾»: elegir una del desplegable las añade todas de una vez
function addSelectedTo(c) {
  const n = selected.size;
  setInCollection(c, [...selected], true);
  toast(`${n === 1 ? 'Añadido' : `Añadidos ${n} juegos`} a «${c.name}»`);
  setSelecting(false);
}
$('#selAdd').onclick = () => {
  if (!selected.size) return;
  const items = sortedCollections().map((c) => ({ icon: c.icon || 'folder', label: c.name, run: () => addSelectedTo(c) }));
  if (items.length) items.push({ sep: true });
  items.push({ icon: '＋', label: 'Nueva colección…', run: () => openCollName(null, [...selected]) });
  showMenu($('#selAdd'), items);
};
$('#selRemove').onclick = () => {
  const cur = collections.find((c) => 'col:' + c.id === state.filter);
  if (cur && selected.size) { setInCollection(cur, [...selected], false); selected.clear(); updateSelBar(); render(); }
};

// Solo una lista desplegable abierta a la vez: al abrir una, se cierran las demás
function openNav(key, open) {
  if (open) for (const k of Object.keys(navOpen)) navOpen[k] = false;
  navOpen[key] = open;
  window.api.setSettings({ navOpen });
}
$('#filters').onclick = (e) => {
  const cg = e.target.closest('.cgame');
  if (cg) { openDetail(cg.dataset.gid); return; }
  const chev = e.target.closest('.chev');
  if (chev) { openNav(chev.dataset.chev, !navOpen[chev.dataset.chev]); render(); return; }
  const b = e.target.closest('.filter');
  if (!b) return;
  // Una fila con lista desplegable (biblioteca con «No instalados» o colección): el clic la abre;
  // si ya era la que estabas viendo, la cierra
  const key = b.dataset.filter;
  const row = b.closest('.src-row');
  if (row && row.querySelector('.chev') && !b.classList.contains('sub')) {
    const same = state.filter === key && !state.detailId;
    openNav(key, same ? !navOpen[key] : true);
  }
  state.filter = key;
  state.detailId = null;
  render();
};
$('#search').oninput = (e) => { state.query = e.target.value; render(); syncSearchBox(); };
// La búsqueda es un icono que se despliega al pulsarlo; se pliega sola si pierde el foco y está vacía
function setSearchOpen(open) {
  $('#searchBox').classList.toggle('open', open);
  if (open) $('#search').focus();
}
function syncSearchBox() {
  const has = !!state.query;
  $('#searchBtn').classList.toggle('on', has);
  if (has) $('#searchBox').classList.add('open');
}
$('#searchBtn').onmousedown = (e) => e.preventDefault(); // no quitarle el foco a la búsqueda al pulsar el icono
$('#searchBtn').onclick = () => {
  const box = $('#searchBox');
  if (box.classList.contains('open') && !state.query) setSearchOpen(false); else setSearchOpen(true);
};
$('#search').onblur = () => { if (!state.query) $('#searchBox').classList.remove('open'); };
$('#search').onkeydown = (e) => {
  if (e.key !== 'Escape') return;
  e.stopPropagation();
  state.query = ''; $('#search').value = ''; render(); syncSearchBox();
  $('#searchBox').classList.remove('open'); $('#search').blur();
};
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f' && !state.detailId && !$('.toolbar').classList.contains('hidden')) { e.preventDefault(); setSearchOpen(true); }
});
$('#sort').onchange = (e) => { state.sort = e.target.value; render(); };

let refreshing = false;
const refreshLibrary = async () => { if (refreshing) return; refreshing = true; $('#refresh').classList.add('spin'); try { await load(); toast('Biblioteca actualizada'); } finally { refreshing = false; $('#refresh').classList.remove('spin'); } };
$('#refresh').onclick = refreshLibrary;
document.addEventListener('keydown', (e) => { if (e.key === 'F5' && !e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); refreshLibrary(); } }); // F5 = actualizar biblioteca (no recarga la página)

$('#addLocal').onclick = async () => {
  const g = await window.api.addLocal();
  if (!g) return;
  if (g.duplicate) return toast('Ese juego ya está en tu biblioteca');
  await load();
  const added = state.games.find((x) => x.id === g.id);
  if (added) openEdit(added); // permite ponerle nombre y portada de inmediato
};

$('#pickCover').onclick = async () => {
  const p = await window.api.pickImage('cover', ($('#editName') && $('#editName').value) || '');
  if (p) { editCover = p; updateCoverPreview(); }
};
$('#clearCover').onclick = () => { editCover = null; updateCoverPreview(); };
$('#cancelEdit').onclick = closeEdit;
$('#modal').onclick = (e) => { if (e.target.id === 'modal') closeEdit(); };
document.addEventListener('keydown', (e) => {
  if (lightboxEl) {
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft' && lightboxGo) lightboxGo(-1);
    else if (e.key === 'ArrowRight' && lightboxGo) lightboxGo(1);
    return;
  }
  if (e.key !== 'Escape') return;
  if (menuEl) closeMenu();
  else if (filterPanelEl) closeFilter();
  else if (!$('#collPickModal').classList.contains('hidden')) closeCollPick();
  else if (!$('#collNameModal').classList.contains('hidden')) closeCollName();
  else if (selecting && !state.detailId) setSelecting(false);
  else if (infoGame) closeInfo();
  else if (!$('#batchModal').classList.contains('hidden')) $('#batchModal').classList.add('hidden');
  else if (editing) closeEdit();
  else if (!$('#themeModal').classList.contains('hidden')) $('#themeModal').classList.add('hidden');
  else if (state.detailId) closeDetail();
});

// Ventana de personalización
$('#perfCopy').onclick = async () => { const t = perfReport(); try { await navigator.clipboard.writeText(t); $('#perfMsg').textContent = 'Copiado al portapapeles. Pégalo en el chat.'; } catch { $('#perfMsg').textContent = t; } };
if (window.api.getVersion) window.api.getVersion().then((v) => { $('#appVersion').textContent = `Versión ${v} · con tráilers, colecciones, logros y juegos sin instalar`; }).catch(() => {});
// Pestañas de la ventana de configuración (recuerda la última abierta mientras la app esté abierta)
let settingsTab = 'libs';
function showSettingsTab(t) {
  settingsTab = t;
  document.querySelectorAll('.settings-nav button').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
  document.querySelectorAll('.settings-page').forEach((p) => p.classList.toggle('hidden', p.dataset.page !== t));
  const pages = document.querySelector('.settings-pages'); if (pages) pages.scrollTop = 0;
  playIn(document.querySelector(`.settings-page[data-page="${t}"]`));
}
document.querySelector('.settings-nav').onclick = (e) => { const b = e.target.closest('button[data-tab]'); if (b) showSettingsTab(b.dataset.tab); };
$('#openTheme').onclick = () => { refreshEpicState(); refreshXboxState(); refreshSystem(); syncThemeModal(); buildLibraries(); showSettingsTab(settingsTab); $('#themeModal').classList.remove('hidden'); };
// Copias de seguridad
{
  const bkMsg = (t, bad) => { const m = $('#bkMsg'); m.textContent = t; m.style.color = bad ? '#ff7b7b' : ''; };
  $('#bkExport').onclick = async () => {
    const r = await window.api.backupExport();
    if (r.canceled) return;
    bkMsg(r.ok ? `Copia guardada (${r.games} juego(s) propios, datos de ${r.notes} juego(s)): ${r.file}` : (r.error || 'No se pudo guardar.'), !r.ok);
  };
  $('#bkImport').onclick = async () => {
    const r = await window.api.backupImport();
    if (r.canceled) return;
    bkMsg(r.ok ? 'Copia restaurada. Recargando…' : (r.error || 'No se pudo restaurar.'), !r.ok);
  };
  const mdMsg = (t, bad) => { const m = $('#mdMsg'); if (m) { m.textContent = t; m.style.color = bad ? '#ff7b7b' : ''; } };
  const mdShow = async () => { const d = await window.api.mediaGetDir(); $('#mdDir').textContent = d.dir; return d; };
  mdShow().catch(() => {});
  $('#mdMove').onclick = async () => { const r = await window.api.mediaSetDir(null); if (r.canceled) return; mdMsg(r.ok ? `Listo: ${r.dir} (${r.copied} archivo(s) copiados; los originales de la carpeta anterior no se borran).` : (r.error || 'No se pudo.'), !r.ok); if (r.ok) { mdShow(); setTimeout(() => location.reload(), 1200); } };
  $('#mdOpen').onclick = async () => { const r = await window.api.mediaOpenFolder(); mdMsg(r.ok ? 'Carpeta: ' + r.dir : (r.error || 'No se pudo abrir la carpeta.'), !r.ok); };
  $('#mdImport').onclick = async () => {
    const r = await window.api.mediaImport();
    mdMsg(r.moved || r.missing ? `Listo: ${r.moved} imagen(es) copiadas a la carpeta` + (r.missing ? `; ${r.missing} no se encontraron en su ruta antigua.` : '.') : 'No había imágenes sueltas que traer.');
    if (r.moved) setTimeout(() => location.reload(), 1200);
  };
  $('#bkFolder').onclick = async () => {
    const n = await window.api.backupFolder();
    bkMsg(n ? `Hay ${n} copia(s) automática(s) en esa carpeta.` : 'Aún no hay copias automáticas: se crea la primera la próxima vez que abras Comptus.');
  };
}
$('#closeTheme').onclick = () => $('#themeModal').classList.add('hidden');
$('#themeModal').onclick = (e) => { if (e.target.id === 'themeModal') $('#themeModal').classList.add('hidden'); };
for (const [id, key] of Object.entries(THEME_KEYS)) {
  $('#' + id).oninput = (e) => {
    theme[key] = e.target.value;
    theme.preset = 'custom';
    applyTheme(theme);
    document.querySelectorAll('.preset').forEach((b) => b.classList.remove('active'));
    saveTheme();
    refreshPageStyle();
  };
}
$('#cardShape').onchange = (e) => { cardShape = e.target.value === 'wide' ? 'wide' : 'tall'; window.api.setSettings({ cardShape }); applyShape(); layoutGrid(); load(); };
$('#wideLogos').onchange = (e) => { wideLogos = e.target.checked; window.api.setSettings({ wideLogos }); load(); };
$('#hideNames').onchange = (e) => { hideNames = e.target.checked; window.api.setSettings({ hideNames }); applyShape(); load(); };
$('#cardSize').oninput = (e) => setCardSize(parseInt(e.target.value, 10));
$('#sizeQuick').oninput = (e) => setCardSize(parseInt(e.target.value, 10));
// Ctrl + rueda sobre la biblioteca: acerca o aleja las portadas
$('#grid').addEventListener('wheel', (e) => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  setCardSize(cardSize + (e.deltaY < 0 ? 10 : -10));
}, { passive: false });
$('#saveMyTheme').onclick = saveMyTheme;
$('#themeName').onkeydown = (e) => { if (e.key === 'Enter') saveMyTheme(); };
$('#resetTheme').onclick = () => {
  theme = { ...PRESETS[0], preset: 'midnight' };
  cardSize = 170;
  if (bg.art) { bg.art = null; applyBackground(); saveBackground(); }
  applyTheme(theme);
  applyCardSize();
  syncThemeModal();
  saveTheme();
  refreshPageStyle();
};

// Fondo y descarga de información (en Configuración)
$('#pickBg').onclick = async () => {
  const p = await window.api.pickBackground();
  if (!p) return;
  if (isVideoPath(p)) {
    const probe = document.createElement('video'); probe.muted = true; probe.preload = 'metadata';
    probe.onloadedmetadata = () => { bg.path = p; bg.art = null; applyBackground(); saveBackground(); if (autoBgColors) setTimeout(() => adaptThemeToBackground(true), 400); if (probe.videoWidth > 2000 || probe.duration > 600) toast('Vídeo grande: si notas tirones, usa uno de 1080p y 30 fps'); };
    probe.onerror = () => toast('No se pudo cargar ese vídeo. Prueba con MP4 (H.264) o WebM');
    probe.src = imgUrl(p); return;
  }
  const probe = new Image();
  probe.onload = () => { bg.path = p; bg.art = null; applyBackground(); saveBackground(); if (autoBgColors) adaptThemeToBackground(true); };
  probe.onerror = () => toast('No se pudo cargar esa imagen');
  probe.src = imgUrl(p);
};
$('#clearBg').onclick = () => { bg.path = null; bg.art = null; applyBackground(); saveBackground(); };
$('#bgDim').oninput = (e) => { bg.dim = parseInt(e.target.value, 10); applyBackground(); saveBackground(); };
$('#bgBlur').oninput = (e) => { bg.blur = parseInt(e.target.value, 10); applyBackground(); saveBackground(); };
$('#animMode').onchange = async (e) => { animMode = e.target.value; window.api.setSettings({ animMode }); await load(); };
$('#autoTrailer').onchange = (e) => { autoTrailer = e.target.checked; window.api.setSettings({ autoTrailer }); };
$('#couchBtn').onclick = () => Couch.toggle();
$('#couchStart').onchange = (e) => window.api.setSettings({ couchStart: e.target.checked });
document.addEventListener('keydown', (e) => { if (e.key === 'F10' && !e.ctrlKey && !e.altKey) { e.preventDefault(); Couch.toggle(); } });
$('#saveAuto').onchange = (e) => window.api.setSettings({ saveAuto: e.target.checked });
$('#saveKeep').onchange = (e) => { const v = Math.max(1, Math.min(30, parseInt(e.target.value, 10) || 5)); e.target.value = v; window.api.setSettings({ saveKeep: v }); };
async function showSaveDb() { try { const d = await window.api.savesDb(); $('#saveDbMsg').textContent = d.ready ? `Base de guardados: ${d.count} juegos · actualizada el ${new Date(d.built).toLocaleDateString()}. Las copias van a «Comptus Media > Partidas guardadas»; es una copia local, no toca la nube de ninguna tienda.` : (d.building ? 'Descargando la base de guardados…' : 'La base de guardados aún no está descargada (se descarga sola, o pulsa el botón).'); } catch {} }
$('#saveDb').onclick = async () => { const b = $('#saveDb'); b.disabled = true; $('#saveDbMsg').textContent = 'Descargando… puede tardar uno o dos minutos.'; const r = await window.api.savesUpdate(true); b.disabled = false; if (!r.ok) $('#saveDbMsg').textContent = r.error; else showSaveDb(); };
$('#sysPad').onchange = (e) => { padOn = e.target.checked; window.api.setSettings({ gamepad: e.target.checked }); if (window.Pad) window.Pad.setEnabled(e.target.checked); };
$('#transitions').onchange = (e) => { transitions = e.target.checked; window.api.setSettings({ transitions }); if (transitions) playIn('#grid'); };
$('#autoBackground').onchange = (e) => { autoBackground = e.target.checked; window.api.setSettings({ autoBackground }); toast(autoBackground ? 'Se completará en segundo plano al abrir el lanzador' : 'Descarga en segundo plano desactivada'); };
$('#autoInfo').onchange = (e) => { autoInfo = e.target.checked; window.api.setSettings({ autoInfo }); render(); };

$('#steamKey').onchange = (e) => { steamKey = e.target.value.trim(); window.api.setSettings({ steamKey }); toast(steamKey ? 'Clave de Steam guardada' : 'Clave de Steam quitada'); if (state.detailId) render(); };
$('#steamId').onchange = (e) => {
  const v = e.target.value.trim();
  if (v && !/^\d{17}$/.test(v)) { toast('El SteamID son 17 dígitos (empieza por 7656…)'); e.target.value = steamId; return; }
  steamId = v; window.api.setSettings({ steamId }); toast(v ? 'SteamID guardado' : 'Se detectará automáticamente');
};
$('#ubiVia').onchange = (e) => { ubiVia = e.target.checked; window.api.setSettings({ ubisoftViaStore: ubiVia }).then(load); };
$('#mergeDupes').onchange = (e) => { mergeDupes = e.target.checked; window.api.setSettings({ mergeDupes }); Dupes.applyGroups(state.games, { enabled: mergeDupes }); render(); };
$('#showOwned').onchange = (e) => { showOwned = e.target.checked; window.api.setSettings({ showOwned }).then(load); };
$('#itchKey').onchange = async (e) => { itchKey = e.target.value.trim(); await window.api.setSettings({ itchKey }); toast(itchKey ? 'Clave de itch.io guardada' : 'Clave de itch.io quitada'); if (itchKey) $('#itchSync').click(); };
$('#itchSync').onclick = async () => {
  const b = $('#itchSync'), out = $('#itchMsg');
  b.disabled = true; out.textContent = 'Sincronizando…';
  const r = await window.api.syncOwned();
  b.disabled = false;
  out.textContent = r.itch ? `Listo: ${r.itch.total} juegos en tu cuenta de itch.io (${r.itch.added} nuevos).` + (r.error ? ' ' + r.error : '') : (r.error || 'No se pudo sincronizar.');
  if (r.ok) await load();
};
$('#syncOwned').onclick = async () => {
  const b = $('#syncOwned'), out = $('#syncOwnedMsg');
  b.disabled = true; b.textContent = 'Sincronizando…'; out.textContent = '';
  const r = await window.api.syncOwned();
  b.disabled = false; rich(b, '[[refresh]] Sincronizar mis juegos de Steam');
  const parts = [];
  if (r.steam) parts.push(`${r.steam.total} juegos en Steam (${r.steam.added} nuevos)`);
  if (r.epic) parts.push(`${r.epic.total} en Epic (${r.epic.added} nuevos)`);
  if (r.xbox) parts.push(`${r.xbox.total} en Xbox (${r.xbox.added} nuevos)`);
  if (r.itch) parts.push(`${r.itch.total} en itch.io (${r.itch.added} nuevos)`);
  out.textContent = r.ok ? `Listo: ${parts.join(' y ')}.${r.error ? ' ' + r.error : ''}` : (r.error || 'No se pudo sincronizar.');
  if (r.ok) await load();
  refreshEpicState();
};
// ----- Cuenta de Epic -----
async function refreshEpicState() {
  const s = await window.api.epicStatus();
  $('#epicState').textContent = s.loggedIn ? `Sesión iniciada${s.name ? ' como ' + s.name : ''}.` : 'Sin sesión iniciada.';
  $('#epicLogin').classList.toggle('hidden', s.loggedIn);
  $('#epicSync').classList.toggle('hidden', !s.loggedIn);
  $('#epicLogout').classList.toggle('hidden', !s.loggedIn);
}
async function epicDone(r) {
  const m = $('#epicMsg');
  if (r.cancelled) { m.textContent = 'Inicio de sesión cancelado.'; }
  else if (!r.ok) { m.textContent = r.error || 'No se pudo iniciar sesión.'; }
  else { m.textContent = r.epic ? `Listo: ${r.epic.total} ${r.epic.total === 1 ? "juego" : "juegos"} en tu cuenta de Epic.` : ('Sesión iniciada. ' + (r.error || '')); await load(); }
  refreshEpicState();
}
$('#epicLogin').onclick = async () => { $('#epicMsg').textContent = 'Esperando el inicio de sesión…'; epicDone(await window.api.epicLogin()); };
$('#epicOpenBrowser').onclick = () => window.api.epicLoginUrl();
$('#epicCodeGo').onclick = async () => { $('#epicMsg').textContent = 'Comprobando…'; const r = await window.api.epicLoginCode($('#epicCode').value); if (r.ok) $('#epicCode').value = ''; epicDone(r); };
$('#epicSync').onclick = async () => {
  const b = $('#epicSync'); b.disabled = true; $('#epicMsg').textContent = 'Sincronizando…';
  const r = await window.api.syncOwned(); b.disabled = false;
  $('#epicMsg').textContent = r.epic ? `Listo: ${r.epic.total} juegos en tu cuenta de Epic (${r.epic.added} nuevos).` : (r.error || 'No se pudo sincronizar.');
  if (r.ok) await load();
  refreshEpicState();
};
$('#epicLogout').onclick = async () => { await window.api.epicLogout(); $('#epicMsg').textContent = 'Sesión cerrada. Se quitaron los juegos sin instalar de Epic.'; await load(); refreshEpicState(); };
// ----- Cuenta de Xbox -----
async function refreshXboxState() {
  const s = await window.api.xboxStatus();
  $('#xboxState').textContent = s.loggedIn ? `Sesión iniciada${s.name ? ' como ' + s.name : ''}.` : 'Sin sesión iniciada.';
  $('#xboxLogin').classList.toggle('hidden', s.loggedIn || s.pending);
  $('#xboxSync').classList.toggle('hidden', !s.loggedIn);
  $('#xboxLogout').classList.toggle('hidden', !s.loggedIn);
  $('#xboxCancel').classList.toggle('hidden', !s.pending);
  if (!s.pending) $('#xboxCodeBox').classList.add('hidden');
}
$('#xboxLogin').onclick = async () => {
  const m = $('#xboxMsg');
  m.textContent = 'Pidiendo el código a Microsoft…';
  const r = await window.api.xboxLogin();
  if (!r.ok) { m.textContent = r.error || 'No se pudo iniciar sesión.'; return; }
  $('#xboxCode').textContent = r.userCode;
  $('#xboxCodeBox').classList.remove('hidden');
  m.textContent = 'Esperando a que escribas el código en la página de Microsoft…';
  refreshXboxState();
};
$('#xboxCancel').onclick = async () => { await window.api.xboxCancel(); $('#xboxMsg').textContent = 'Inicio de sesión cancelado.'; refreshXboxState(); };
window.api.onXboxLogin(async (r) => {
  const m = $('#xboxMsg');
  if (!r.ok) m.textContent = r.error || 'No se pudo iniciar sesión.';
  else { m.textContent = r.xbox ? `Listo: ${r.xbox.total} ${r.xbox.total === 1 ? 'juego' : 'juegos'} de PC en tu cuenta de Xbox.` : ('Sesión iniciada. ' + (r.error || '')); await load(); }
  refreshXboxState();
});
$('#xboxSync').onclick = async () => {
  const b = $('#xboxSync'); b.disabled = true; $('#xboxMsg').textContent = 'Sincronizando…';
  const r = await window.api.syncOwned(); b.disabled = false;
  $('#xboxMsg').textContent = r.xbox ? `Listo: ${r.xbox.total} juegos de PC en tu cuenta de Xbox (${r.xbox.added} nuevos).` : (r.error || 'No se pudo sincronizar.');
  if (r.ok) await load();
  refreshXboxState();
};
$('#xboxLogout').onclick = async () => { await window.api.xboxLogout(); $('#xboxMsg').textContent = 'Sesión cerrada. Se quitaron los juegos sin instalar de Xbox.'; await load(); refreshXboxState(); };
$('#diagUbi').onclick = async () => {
  const m = $('#diagMsg'); m.textContent = 'Revisando…';
  const t = await window.api.diagUbisoft();
  try { await navigator.clipboard.writeText(t); m.textContent = `Copiado al portapapeles. ${t.split('\n')[0]}`; } catch { m.textContent = t; }
};
$('#diagDupes').onclick = async () => {
  const m = $('#diagMsg'); const t = dupesReport();
  try { await navigator.clipboard.writeText(t); m.textContent = `Copiado al portapapeles. ${t.split('\n')[0]}`; } catch { m.textContent = t; }
};
$('#rawgKey').onchange = (e) => { rawgKey = e.target.value.trim(); window.api.setSettings({ rawgKey }); toast(rawgKey ? 'Clave de RAWG guardada' : 'Clave de RAWG quitada'); };
$('#autoTranslate').onchange = (e) => { autoTranslate = e.target.checked; window.api.setSettings({ autoTranslate }); };
$('#deeplKey').onchange = (e) => { deeplKey = e.target.value.trim(); window.api.setSettings({ deeplKey }); toast(deeplKey ? 'Clave de DeepL guardada' : 'Clave de DeepL quitada'); };
$('#batchBtn').onclick = startBatch;
$('#batchCancel').onclick = () => { window.api.cancelInfoBatch(); $('#batchStatus').textContent = 'Cancelando…'; };
$('#batchClose').onclick = () => $('#batchModal').classList.add('hidden');
$('#ovAny').onchange = (e) => { overlayAny = e.target.checked; window.api.setSettings({ overlayAny }); };
$('#ovDiag').onclick = async () => { const o = $('#ovDiagOut'); o.textContent = await window.api.overlayDiag(); o.classList.remove('hidden'); };
$('#ovPad').onchange = (e) => { padOverlay = e.target.value; window.api.setSettings({ padOverlay }); $('#ovPadCustom').classList.toggle('hidden', padOverlay !== 'custom'); };
// Asignar botones del mando: se pulsan a la vez los que se quieran (hasta 3) y se sueltan
let recPad = false;
$('#ovPadRec').onclick = () => {
  if (recPad) return; recPad = true; window.__padRecording = true; // mientras tanto el mando no navega ni cierra nada
  const lbl = $('#ovPadLbl'), btn = $('#ovPadRec'); btn.disabled = true; lbl.textContent = 'Suelta todos los botones del mando…';
  const pressed = () => { const s = new Set(); for (const p of [...(navigator.getGamepads ? navigator.getGamepads() : [])].filter(Boolean)) p.buttons.forEach((b, i) => { if (b && (b.pressed || b.value > 0.6)) s.add(i); }); return s; };
  let phase = 'wait', got = new Set(), t0 = performance.now(), freeSince = 0, lastPress = 0;
  const end = (save) => {
    recPad = false; btn.disabled = false;
    if (save && got.size) { padBtns = [...got].slice(0, 3); window.api.setSettings({ padOverlayBtns: padBtns }); }
    lbl.textContent = padLabel(padBtns);
    setTimeout(() => { window.__padRecording = false; }, 600); // que el último botón soltado no active nada en el lanzador
    if (!save) toast('No se detectó ningún botón. Conecta el mando, pulsa un botón y vuelve a intentarlo');
  };
  const loop = (now) => {
    const cur = pressed();
    if (phase === 'wait') { // primero hay que soltar el botón con el que se pulsó «Asignar»
      if (!cur.size) { if (!freeSince) freeSince = now; if (now - freeSince > 300) { phase = 'rec'; t0 = now; lbl.textContent = 'Pulsa los botones (a la vez, hasta 3) y suéltalos…'; } } else freeSince = 0;
    } else {
      if (cur.size) { cur.forEach((i) => got.add(i)); lastPress = now; lbl.textContent = padLabel([...got].slice(0, 3)) + '…'; }
      else if (got.size && now - lastPress > 350) return end(true); // todo soltado un momento: fin
      if (!got.size && now - t0 > 10000) return end(false);
    }
    if (phase === 'wait' && now - t0 > 15000) return end(false);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};
$('#overlayOn').onchange = (e) => { overlayOn = e.target.checked; window.api.setSettings({ overlay: overlayOn }); render(); };
bindHotkeyInput($('#hkOverlay'), 'overlay');
bindHotkeyInput($('#hkShot'), 'shot');
bindHotkeyInput($('#hkSearch'), 'search');
// Sistema: bandeja, inicio con Windows, búsqueda rápida
async function refreshSystem() {
  try {
    const st = await window.api.systemGet();
    $('#sysSplash').checked = st.splash !== false; $('#sysStart').checked = !!st.startWithWindows; $('#sysHidden').checked = !!st.startHidden;
    $('#sysTray').checked = !!st.closeToTray; $('#sysSearch').checked = st.quickSearch !== false;
    $('#sysHidden').disabled = !st.startWithWindows;
    $('#updAuto').checked = st.autoUpdate !== false;
    $('#sysEvent').checked = st.eventNotify !== false; $('#sysWish').checked = st.wishNotify !== false; $('#sysMusic').checked = st.nowPlaying !== false; $('#sysFree').checked = st.freeNotify !== false; $('#sysFreeDlc').checked = !!st.freeNotifyDlc; $('#sysFreeDlc').disabled = st.freeNotify === false;
    if (window.api.updateState) window.api.updateState().then(paintUpdate).catch(() => {});
    $('#sysStart').title = st.packaged ? '' : 'Solo funciona en la versión instalada o portable (no al ejecutar desde el código)';
  } catch { /* sin acceso */ }
}
for (const [id, key] of [['sysStart', 'startWithWindows'], ['sysSplash', 'splash'], ['sysHidden', 'startHidden'], ['sysTray', 'closeToTray'], ['sysSearch', 'quickSearch'], ['sysFree', 'freeNotify'], ['sysFreeDlc', 'freeNotifyDlc'], ['sysEvent', 'eventNotify'], ['sysWish', 'wishNotify'], ['sysMusic', 'nowPlaying']]) {
  $('#' + id).onchange = async (e) => { await window.api.systemSet({ [key]: e.target.checked }); refreshSystem(); };
}
// Actualizaciones
function paintUpdate(u) {
  if (!u) return;
  const msg = { idle: '', checking: 'Buscando…', none: `Estás al día (versión ${u.current}).`, available: `Hay una versión nueva: ${u.version}.`,
    downloading: `Descargando ${u.version || ''}… ${u.percent || 0} %`, ready: `La versión ${u.version} está lista. Se instalará al reiniciar (o al cerrar Comptus).`,
    error: u.message || 'No se pudo comprobar.', unsupported: u.message || u.why || '' }[u.phase] || '';
  $('#updMsg').textContent = msg;
  $('#updDownload').classList.toggle('hidden', u.phase !== 'available');
  $('#updInstall').classList.toggle('hidden', u.phase !== 'ready');
  $('#updCheck').disabled = u.phase === 'checking' || u.phase === 'downloading';
  $('#updDownload').disabled = false;
}
let lastUpdPhase = '';
// Ventana de actualización: avisa de una versión nueva, la descarga con barra de progreso y ofrece reiniciar para instalarla
let updShownFor = '';
const updSkipped = () => { try { return localStorage.getItem('updSkip') || ''; } catch { return ''; } };
function paintUpdModal(u, manual) {
  const m = $('#updModal'); if (!m) return;
  const open = !m.classList.contains('hidden');
  if (!open) {
    if (u.phase !== 'available' && u.phase !== 'ready') return;
    if (!manual && (updShownFor === u.version || updSkipped() === u.version)) return;
    updShownFor = u.version; m.classList.remove('hidden');
  }
  $('#updmVer').textContent = `Tienes la versión ${u.current || ''} y está disponible la ${u.version || ''}.`;
  const notes = (u.notes || '').trim(); $('#updmNotes').textContent = notes; $('#updmNotes').classList.toggle('hidden', !notes);
  const go = $('#updmGo'), later = $('#updmLater'), skip = $('#updmSkip');
  $('#updmBar').classList.toggle('hidden', u.phase !== 'downloading');
  $('#updmFill').style.width = (u.percent || 0) + '%';
  $('#updmMsg').textContent = u.phase === 'downloading' ? `Descargando… ${u.percent || 0} %` : u.phase === 'ready' ? 'Descarga lista. Al reiniciar se instala y Comptus vuelve a abrirse.' : u.phase === 'error' ? (u.message || 'No se pudo descargar.') : '';
  go.disabled = u.phase === 'downloading';
  go.textContent = u.phase === 'ready' ? 'Reiniciar e instalar' : u.phase === 'error' ? 'Reintentar' : 'Actualizar ahora';
  go.dataset.phase = u.phase;
  skip.classList.toggle('hidden', u.phase !== 'available');
  later.textContent = u.phase === 'ready' ? 'Instalar al cerrar' : 'Más tarde';
}
if (window.api.onUpdateStatus) window.api.onUpdateStatus((u) => {
  paintUpdate(u);
  paintUpdModal(u, u.phase === 'ready' && lastUpdPhase !== 'ready'); // al terminar la descarga se vuelve a mostrar aunque se haya cerrado
  lastUpdPhase = u.phase;
});
$('#updmLater').onclick = () => $('#updModal').classList.add('hidden');
$('#updmSkip').onclick = () => { try { localStorage.setItem('updSkip', updShownFor); } catch {} $('#updModal').classList.add('hidden'); };
$('#updmGo').onclick = () => { const ph = $('#updmGo').dataset.phase; if (ph === 'ready') { $('#updmGo').disabled = true; $('#updmLater').disabled = true; $('#updmMsg').textContent = 'Abriendo el instalador…'; window.api.updateInstall(); } else if (ph === 'error') window.api.updateCheck(); else { $('#updmGo').disabled = true; window.api.updateDownload(); } };
$('#updAuto').onchange = (e) => window.api.systemSet({ autoUpdate: e.target.checked });
$('#updCheck').onclick = () => window.api.updateCheck();
$('#updDownload').onclick = () => { $('#updDownload').disabled = true; window.api.updateDownload(); };
$('#updInstall').onclick = () => window.api.updateInstall();
if (window.api.onOpenGame) window.api.onOpenGame((id) => { if (state.games.some((g) => g.id === id)) { closeMenu(); openDetail(id); } });
if (window.api.onOpenFree) window.api.onOpenFree(() => { closeMenu(); state.filter = 'free'; state.detailId = null; render(); });
window.api.onShotsChanged(() => { if (state.detailId) render(); });

// Ventana de información del juego
$('#infoCancel').onclick = closeInfo;
$('#infoModal').onclick = (e) => { if (e.target.id === 'infoModal') closeInfo(); };
$('#infoSearch').onclick = async () => {
  const g = infoGame;
  const term = $('#infoTerm').value.trim();
  if (!g) return;
  if (!term) { $('#infoHint').textContent = 'Escribe un nombre, un número o el enlace de la tienda.'; return; }
  $('#infoHint').textContent = 'Buscando…';
  const res = await downloadInfo(g, term, false);
  if (res.ok) { closeInfo(); toast(`Información descargada: ${res.info.title}`); }
  else if (infoGame === g) $('#infoHint').textContent = res.error;
};
$('#infoTerm').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); $('#infoSearch').click(); } };
$('#infoClear').onclick = async () => {
  const g = infoGame;
  if (!g) return;
  await window.api.clearInfo(g.id);
  closeInfo();
  await load();
  toast('Información quitada');
};
$('#infoForm').onsubmit = async (e) => {
  e.preventDefault();
  const g = infoGame;
  if (!g) return;
  // Solo se guardan como "tuyos" los campos que cambiaste respecto a lo descargado
  const base = baseInfo(g, true);
  const patch = {};
  const vals = {
    description: $('#infoDesc').value.trim(),
    developers: $('#infoDev').value, publishers: $('#infoPub').value,
    releaseDate: $('#infoDate').value.trim(), genres: $('#infoGenres').value,
  };
  const norm = (v) => (Array.isArray(v) ? v.join(', ') : String(v || '')).trim();
  for (const [k, v] of Object.entries(vals)) if (norm(v) !== norm(base[k])) patch[k] = v;
  await window.api.editInfo(g.id, patch);
  closeInfo();
  await load();
  toast('Información guardada');
};

$('#editForm').onsubmit = async (e) => {
  e.preventDefault();
  const r = await window.api.editLocal(editing.id, {
    exe: $('#editExe').value.trim(),
    name: $('#editName').value.trim() || editing.name,
    args: $('#editArgs').value.trim(),
    cover: editCover,
  });
  if (r && r.duplicate) { toast('Ya tienes otro juego con ese ejecutable'); return; }
  closeEdit();
  await load();
};

window.api.onChanged(load);
setTimeout(() => loadFree(false), 3500);
setTimeout(() => loadWish(false), 5000);
setTimeout(() => loadEvents(false), 4000);
window.api.diskSizes && window.api.diskSizes().then((d) => { if (d) { diskScanning = !!d.scanning; applyDisk(d.sizes); } }).catch(() => {});
// Primera vez: ofrecer crear la carpeta «Comptus Media»
(async () => {
  try {
    const d = await window.api.mediaGetDir();
    if (!d || !d.dir || d.configured || d.declined) return;
    $('#mediaSuggest').textContent = d.suggested;
    const m = $('#mediaModal'); m.classList.remove('hidden');
    const done = () => m.classList.add('hidden');
    $('#mediaNo').onclick = async () => { await window.api.mediaDecline(); done(); };
    $('#mediaYes').onclick = async () => { const r = await window.api.mediaSetDir('suggested'); if (r.ok) { done(); toast('Carpeta creada: ' + r.dir); setTimeout(() => location.reload(), 800); } else toast(r.error || 'No se pudo crear la carpeta'); };
    $('#mediaPick').onclick = async () => { const r = await window.api.mediaSetDir(null); if (r.canceled) return; if (r.ok) { done(); toast('Carpeta creada: ' + r.dir); setTimeout(() => location.reload(), 800); } else toast(r.error || 'No se pudo crear la carpeta'); };
  } catch { /* sin asistente */ }
})();
window.api.onGameState(applyRunState);
try { window.api.onAchUnlocked((p) => { try { if (window.Couch && Couch.achUnlocked) Couch.achUnlocked(p); } catch {} try { toast('🏆 Logro desbloqueado: ' + (p.list[0] ? p.list[0].name : '') + ' — ' + p.game); } catch {} }); } catch {}
window.api.gameState().then(applyRunState).catch(() => {});

(async () => {
  // Primero ajustes y tema guardados, para que no parpadee con los colores por defecto
  const [s, sources] = await Promise.all([window.api.getSettings(), window.api.getSources()]);
  SOURCES = sources || [];
  sourceEnabled = (s && s.sources) || {};
  if (s && s.theme) theme = { ...PRESETS[0], ...s.theme };
  myThemes = Array.isArray(s && s.myThemes) ? s.myThemes.filter((t) => t && t.id && t.name) : [];
  if (s && s.cardSize) cardSize = s.cardSize;
  if (s && s.autoTheme) autoTheme = { ...autoTheme, ...s.autoTheme };
  cardShape = s && s.cardShape === 'wide' ? 'wide' : 'tall'; hideNames = !!(s && s.hideNames); wideLogos = !(s && s.wideLogos === false);
  $('#wideLogos').checked = wideLogos;
  $('#cardShape').value = cardShape; $('#hideNames').checked = hideNames; applyShape();
  if (s && s.background) bg = { ...bg, ...s.background };
  if (window.__diceRestore) window.__diceRestore(s);
  freeCountrySel = (s && s.freeCountry) || '';
  if (s && Number.isFinite(s.sidebarWidth) && window.__sideSet) window.__sideSet(s.sidebarWidth);
  autoInfo = !(s && s.autoInfo === false);
  autoBackground = !(s && s.autoBackground === false);
  transitions = !(s && s.transitions === false);
  autoBgColors = !(s && s.autoBgColors === false);
  gameBg = !(s && s.gameBg === false);
  autoCollBg = !!(s && s.autoCollBg);
  vidPauseBlur = !(s && s.vidPauseBlur === false); vidPauseBattery = !(s && s.vidPauseBattery === false); vidNoBlur = !!(s && s.vidNoBlur);
  boxTransp = Math.max(0, Math.min(70, parseInt(s && s.boxTransp, 10) || 0)); applyBoxTransp();
  saveAuto = !(s && s.saveAuto === false); saveKeep = (s && parseInt(s.saveKeep, 10)) || 5;
  couchStart = !!(s && s.couchStart);
  window.__couchCfg = (s && s.couch) || null; // couch.js puede cargarse después de esto: lo recoge al iniciar
  if (window.Couch) Couch.configure(window.__couchCfg);
  padOn = !(s && s.gamepad === false); if (window.Pad) window.Pad.setEnabled(padOn);
  autoTrailer = !(s && s.autoTrailer === false);
  animMode = ['all', 'few', 'hover'].includes(s && s.animMode) ? s.animMode : 'hover';
  overlayOn = !(s && s.overlay === false);
  overlayAny = !!(s && s.overlayAny);
  padOverlay = PAD_MODES.includes(s && s.padOverlay) ? s.padOverlay : 'selstart';
  padBtns = Array.isArray(s && s.padOverlayBtns) ? s.padOverlayBtns.filter((n) => Number.isInteger(n) && n >= 0 && n < 32).slice(0, 3) : [];
  rawgKey = (s && s.rawgKey) || '';
  steamKey = (s && s.steamKey) || '';
  itchKey = (s && s.itchKey) || '';
  steamId = (s && s.steamId) || '';
  showOwned = !(s && s.showOwned === false);
  mergeDupes = !(s && s.mergeDupes === false);
  ubiVia = !(s && s.ubisoftViaStore === false);
  onlyInstalled = !(s && s.onlyInstalled === false);
  $('#onlyInstalled').classList.toggle('on', onlyInstalled);
  updateOnlyTitle();
  collections = Array.isArray(s && s.collections) ? s.collections.filter((c) => c && c.id && c.name).map((c) => ({ id: String(c.id), name: String(c.name), games: Array.isArray(c.games) ? c.games : [], icon: c.icon || '', iconImage: c.iconImage || '', cover: c.cover || '', ...(c.bg && typeof c.bg.path === 'string' && c.bg.path ? { bg: { path: c.bg.path } } : {}) })) : [];
  navOpen = (s && s.navOpen) || {};
  navCollapsed = (s && s.navCollapsed) || {};
  if (s && s.filterOpen && !filterPanelEl) openFilter();
  applyCollapsed();
  autoTranslate = !(s && s.autoTranslate === false);
  deeplKey = (s && s.deeplKey) || '';
  $('#sgdbKey').value = (s && s.sgdbKey) || ''; $('#sgdbAuto').checked = !(s && s.sgdbAuto === false);
  { const rp = (s && Array.isArray(s.sgdbReplace)) ? s.sgdbReplace : []; for (const [id, kind] of SGDB_REP) $('#' + id).checked = rp.includes(kind); }
  { const k = (s && Array.isArray(s.sgdbKinds)) ? s.sgdbKinds : ['cover', 'banner', 'logo']; for (const [id, kind] of SGDB_BOXES) $('#' + id).checked = k.includes(kind); }
  try { hotkeys = await window.api.getHotkeys(); } catch { /* valores por defecto */ }
  buildPresets(); startAutoTheme(); autoThemeTick(true);
  buildLibraries();
  applyTheme(theme);
  applyCardSize();
  $('#sizeQuick').value = cardSize;
  applyBackground();
  if (bg.path) { // si el archivo ya no existe, se quita el fondo en silencio
    const probe = isVideoPath(bg.path) ? document.createElement('video') : new Image(); // un vídeo no se puede comprobar como imagen
    probe.onerror = () => { bg.path = null; applyBackground(); };
    if (probe.tagName === 'VIDEO') probe.preload = 'metadata';
    probe.src = imgUrl(bg.path);
  }
  render(); // muestra "Cargando…" mientras se escanean las bibliotecas
  await load();
  if (window.api.appReady) window.api.appReady(); // la pantalla de inicio se cierra y se muestra el lanzador
  if (couchStart) { const goCouch = (n) => { if (window.Couch) Couch.enter(); else if (n < 40) setTimeout(() => goCouch(n + 1), 150); }; setTimeout(() => goCouch(0), 400); }
})();
