// ARCHIVO GENERADO: se crea uniendo renderer/couch/*.js. No lo edites a mano: cambia la parte que toque y ejecuta  npm run couch
// Modo consola: vista a pantalla completa para televisor y mando (estilo «Big Picture»), con su propia personalización.
// Pestañas arriba (LB / RB), una sola fila horizontal de juegos, ficha propia del juego y menú de ajustes pensado para el mando.
// Todo el control lo lleva este archivo; gamepad.js solo le pasa los botones mientras está activo.
(function (root) {
  const $c = (s, r) => (r || box).querySelector(s);
  const el2 = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  // ---------- Personalización propia (no depende del tema del lanzador) ----------
  const BASE_THEMES = [
    { id: 'midnight', name: 'Medianoche', bg: '#0b0d12', panel: '#161a23', text: '#eef0f6', accent: '#6c8cff', accent2: '#8f6cff' },
    { id: 'emerald', name: 'Esmeralda', bg: '#08110e', panel: '#12201b', text: '#e8f4ef', accent: '#34d399', accent2: '#22a6b3' },
    { id: 'sunset', name: 'Atardecer', bg: '#140e0c', panel: '#221915', text: '#f6ebe5', accent: '#ff7a59', accent2: '#ffb347' },
    { id: 'neon', name: 'Rosa neón', bg: '#0f0a14', panel: '#1c1426', text: '#f5eaf9', accent: '#ff4fa3', accent2: '#b44fff' },
    { id: 'charcoal', name: 'Carbón', bg: '#080808', panel: '#171717', text: '#f0f0f0', accent: '#e5e5e5', accent2: '#9a9a9a' },
    { id: 'x360', name: 'Xbox 360 (claro)', bg: '#e9ece8', panel: '#ffffff', text: '#1d2a1d', accent: '#6cb33f', accent2: '#2e8b1f' },
    { id: 'x360m', name: 'Xbox 360 (moderno)', bg: '#5a5d5e', panel: '#2d3031', text: '#ffffff', accent: '#119f11', accent2: '#3cc23c' },
    { id: 'x360d', name: 'Xbox 360 (oscuro)', bg: '#0a0f0a', panel: '#161d16', text: '#eef5ea', accent: '#7ac143', accent2: '#3aa02a' },
    { id: 'deck', name: 'Steam Big Picture (oscuro)', bg: '#0b1017', panel: '#1a2330', text: '#e8edf2', accent: '#1a9fff', accent2: '#66c0f4' },
    { id: 'ice', name: 'Hielo', bg: '#e9eef7', panel: '#ffffff', text: '#161b29', accent: '#3b63f5', accent2: '#7a4cf0' },
  ];
  // + los temas del lanzador: con ilustración generada, con imagen y los propios de la persona
  let themesCache = null, themesSig = '';
  function themesAll() {
    let mine = []; try { mine = typeof myThemes !== 'undefined' && Array.isArray(myThemes) ? myThemes : []; } catch {}
    const art = window.ART_THEMES || [], img = window.IMG_THEMES || [];
    const sig = art.length + '|' + img.length + '|' + mine.map((t) => t.id + t.accent + t.bg).join(',');
    if (themesCache && sig === themesSig) return themesCache;
    const used = new Set(BASE_THEMES.map((t) => t.id)), names = new Set(BASE_THEMES.map((t) => t.name));
    const add = (t, pre, tag) => { const id = used.has(t.id) ? pre + t.id : t.id; used.add(id); const name = names.has(t.name) ? `${t.name} (${tag})` : t.name; names.add(name); return { ...t, id, name }; };
    themesCache = [...BASE_THEMES, ...art.map((t) => add(t, 'art:', 'ilustrado')), ...img.map((t) => add(t, 'img:', 'ilustrado')), ...mine.map((t) => add({ ...t, accent2: t.accent2 || t.accent, panel: t.panel || t.bg }, 'my:', 'mío'))];
    themesSig = sig; return themesCache;
  }
  const THEMES = { find: (f) => themesAll().find(f), map: (f) => themesAll().map(f), get 0() { return BASE_THEMES[0]; } };
  const DEF = { theme: 'midnight', bgMode: 'game', dim: 60, blur: 0, tile: 'm', font: 'm', names: 'focus', clock: true, layout: 'auto', border: 'thin', info: true, radius: 'm', banner: 'side', gap: 'm', rowPos: 'mid', sound: true, vol: 'm', onPlay: 'keep', padIcons: 'auto', tabsPos: 'top', adapt: false, nowCard: true, safe: 0, homeBg: 'game', homeBgPath: '', ui: 'default', x3Bg: 'grey', x3BgPath: '', x3Tile: 'm', x3Snd: true, x3Dim: 0, x3Name: '', x3Pic: '', x3Rumble: true, x3Tick: true, x3Move: false, x3Blur: 0, x3HomeBg: 'off', x3HomePath: '' };
  let cfg = { ...DEF };
  const TILE = { xs: 6.2, s: 7.6, m: 9.2, l: 11.5, xl: 14.5 }, GAP = { s: 0.25, m: 1.1, l: 2.2 }, POS = { high: 5.5, mid: 2.6, low: 0.6 }, VOL = { s: 0.04, m: 0.09, l: 0.18 }, FONT = { s: 0.88, m: 1, l: 1.2 };
  const TABS_ALL = [
    { id: 'home', title: 'Inicio' }, { id: 'search', title: 'Buscar' }, { id: 'all', title: 'Biblioteca' }, { id: 'inst', title: 'Instalados' }, { id: 'recent', title: 'Recientes' }, { id: 'fav', title: 'Favoritos' },
    { id: 'most', title: 'Más jugados' }, { id: 'ach', title: 'Logros' }, { id: 'colls', title: 'Colecciones' }, { id: 'settings', title: 'Ajustes' },
  ];

  let box = null, active = false, wasFs = false, clockT = null, idleT = null, hintMode = 'kb', lastAxis = 0, imgSeq = 0;
  const S = { tabs: [], tab: 0, items: [], idx: 0, sub: null, view: 'list', det: { id: null, btn: 0 }, set: 0, cat: 0, col: 'cat', focusId: null, menu: null };
  // La barra de búsqueda llega justo hasta el globo (la lupa queda dentro de ella, a cualquier resolución)
  const sbSync = () => { try { const g = $c('.cc-dic.globe'); if (!g || !box) return; const l = g.getBoundingClientRect().left; if (l > 100) box.style.setProperty('--sbw', Math.round(l - Math.max(6, window.innerWidth * 0.004)) + 'px'); } catch {} };
  // Steam: pasar el ratón por una tarjeta NO la selecciona ni dispara efectos ni sonido; solo hace un pequeño zoom (clase .hov)
  const dkHov = (d) => { d.onmouseenter = () => { if (padActive()) return; d.classList.add('hov'); }; d.onmouseleave = () => d.classList.remove('hov'); };
  const padActive = () => hintMode === 'pad' || (cfg.ui === 'deck' && !S.mouse); // Steam: el ratón no cuenta hasta que lo mueves
  // Vibración del mando (solo estilo Xbox 360): pulsos cortos al desbloquear un logro
  function rumble(strong) {
    if (cfg.ui !== 'x360') return; if (strong === 'tick') { if (cfg.x3Tick === false) return; } else if (cfg.x3Rumble === false) return;
    try {
      const pads = [...navigator.getGamepads()].filter((p) => p && p.connected); if (!pads.length) return;
      const play = (p, delay, dur, a, b) => setTimeout(() => { try { const v = p.vibrationActuator; if (v && v.playEffect) v.playEffect('dual-rumble', { startDelay: 0, duration: dur, weakMagnitude: b, strongMagnitude: a }); else if (p.hapticActuators && p.hapticActuators[0]) p.hapticActuators[0].pulse(a, dur); } catch {} }, delay);
      if (strong === 'tick') { pads.forEach((p) => play(p, 0, 45, .0, .22)); return; }
      pads.forEach((p) => { play(p, 0, 160, strong ? .8 : .5, strong ? .6 : .3); play(p, 260, 160, strong ? .8 : .5, strong ? .6 : .3); if (strong) play(p, 520, 260, 1, .8); });
    } catch {}
  }
  const padHeld = (i) => { try { return [...navigator.getGamepads()].some((p) => p && p.buttons[i] && p.buttons[i].pressed); } catch { return false; } };
  const isPortrait = () => window.innerHeight > window.innerWidth * 1.1;
  const isSearch = () => !!(S.tabs[S.tab] && S.tabs[S.tab].id === 'search');
  const isHome = () => !!(S.tabs[S.tab] && S.tabs[S.tab].id === 'home');
  const isSettings = () => !!(S.tabs[S.tab] && S.tabs[S.tab].id === 'settings');
  const STORE_COL = { steam: '#66c0f4', epic: '#ffffff', ubisoft: '#4a9bff', xbox: '#52b043', ea: '#ff4747', battlenet: '#00aeff', itch: '#fa5c5c', prime: '#00a8e1', rockstar: '#fcaf17', gog: '#b07cf0', local: '#c4c9d6' };

  const playable = (g) => !g.hidden && !g.dupOf; // se muestran también los no instalados (se marcan); el filtro del launcher no interviene
  const byId = (id) => state.games.find((g) => g.id === id);
  const byName = (a, b) => a.name.localeCompare(b.name);
  const gameItems = (gs) => gs.map((g) => ({ type: 'game', g }));
  const cur = () => (S.sub ? S.sub.items : S.items);
  const curIdx = () => (S.sub ? S.sub.idx : S.idx);
  const setIdx = (i) => { if (S.sub) S.sub.idx = i; else S.idx = i; };

  // máximo 10 juegos NO instalados por sección (Biblioteca e Instalados no se limitan)
  const capNi = (arr) => { let n = 0; return arr.filter((g) => g.installed !== false || ++n <= 10); };
  function tabItems(id) {
    const list = state.games.filter(playable);
    switch (id) {
      case 'recent': return gameItems(capNi(list.filter((g) => g.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed)).slice(0, 60));
      case 'fav': return gameItems(capNi(list.filter((g) => g.favorite).sort(byName)));
      case 'most': return gameItems(capNi(list.filter((g) => g.playTime > 0).sort((a, b) => b.playTime - a.playTime)).slice(0, 60));
      case 'ach': return gameItems(list.filter((g) => g.achievements && g.achievements.total > 0).sort((a, b) => (b.achievements.unlocked / b.achievements.total) - (a.achievements.unlocked / a.achievements.total) || b.achievements.unlocked - a.achievements.unlocked || byName(a, b)));
      case 'inst': return gameItems(list.filter((g) => g.installed !== false).sort(byName));
      case 'all': return gameItems(list.sort(byName));
      case 'colls': return collections.map((c) => ({ type: 'coll', c, games: capNi(list.filter((g) => inColl(c, g)).sort(byName)) })).filter((x) => x.games.length);
      default: return [];
    }
  }
  function buildTabs() {
    S.tabs = (cfg.ui === 'x360' ? [TABS_ALL[1], TABS_ALL[0], ...TABS_ALL.slice(2)] : cfg.ui === 'deck' ? ['home', 'all', 'inst', 'colls', 'fav', 'recent', 'most', 'search', 'ach', 'settings'].map((id) => TABS_ALL.find((t) => t.id === id)).filter(Boolean) : TABS_ALL).filter((t) => (t.id === 'settings' || t.id === 'all' || t.id === 'home' || t.id === 'search' || tabItems(t.id).length));
    S._tabsUi = cfg.ui; // con qué estilo se ordenaron las secciones (Xbox 360 pone Buscar primero)
    if (S.tab >= S.tabs.length) S.tab = 0;
  }

  // ---------- Estructura ----------
  const RIBBON = (() => { const g = (id, a, b) => `<linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${a}" stop-opacity="0"/><stop offset=".5" stop-color="${a}" stop-opacity=".5"/><stop offset="1" stop-color="${b}" stop-opacity="0"/></linearGradient>`; return `<svg viewBox="0 0 1600 900" preserveAspectRatio="none"><defs>${g('rb1', '#7ac143', '#2e8b1f')}${g('rb2', '#ffffff', '#9fd67a')}${g('rb3', '#4aa02c', '#bfe8a0')}</defs><path class="r r1" fill="url(#rb1)" d="M-100 640C300 380 700 840 1100 560S1500 320 1700 440L1700 560C1500 460 1300 720 1100 720S300 540 -100 780Z"/><path class="r r2" fill="url(#rb2)" d="M-100 520C250 300 650 700 1000 470S1450 250 1700 330L1700 410C1450 340 1250 600 1000 600S250 420 -100 640Z"/><path class="r r3" fill="url(#rb3)" d="M-100 760C300 620 700 900 1100 720S1500 560 1700 640L1700 720C1500 650 1300 800 1100 830S300 700 -100 860Z"/></svg>`; })();
  function build() {
    box = el2('div'); box.id = 'couch'; box.className = 'hidden';
    box.innerHTML = `
      <div class="cc-ribbon">${RIBBON}</div><div class="cc-bg"></div><div class="cc-shade"></div><div class="dk-bandfix"></div><div class="dk-bandfix"></div><div class="dk-bandfix t"></div>
      <div class="dk-sbar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg></div><header class="cc-top"><span class="cc-lb">LB</span><button class="cc-dfield" tabindex="-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><span>Buscar juegos o perfiles...</span></button><nav class="cc-tabs"></nav><span class="cc-rb">RB</span><div class="cc-sys"><button class="cc-dsearch" tabindex="-1" aria-label="Buscar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg></button><span class="cc-dic bell" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22a2.2 2.2 0 0 0 2.2-2.2h-4.4A2.2 2.2 0 0 0 12 22zm7-6.2v-5a7 7 0 0 0-5.2-6.8V3.2a1.8 1.8 0 0 0-3.6 0V4a7 7 0 0 0-5.2 6.8v5L3.8 18v1h16.4v-1z"/></svg></span><span class="cc-dic globe" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18"/></svg></span><div class="cc-me"></div><div class="cc-music hidden"></div><div class="cc-bat hidden"></div><div class="cc-clock"></div></div></header>
      <section class="cc-hero"><div class="cc-src"></div><h1 class="cc-title"></h1><div class="cc-meta"></div></section>
      <section class="cc-listwrap"><div class="cc-subtitle hidden"></div><div class="cc-strip"></div><div class="cc-achpane"></div></section>
      <section class="cc-home hidden"></section>
      <section class="cc-search hidden"></section>
      <section class="cc-page cc-detail hidden"></section>
      <section class="cc-page cc-settings hidden"></section>
      <footer class="cc-hints"></footer>`;
    document.body.append(box);
    $c('.cc-hints').onclick = (e) => { if (cfg.ui !== 'deck') return; const sp = e.target.closest('span'); if (!sp) return; const t = sp.textContent.trim().toLowerCase(); if (/men[uú]$/.test(t)) sysMenu(); else if (/atrás$/.test(t)) back(); else if (/seleccionar$/.test(t)) accept(); };
    const bl = $c('.cc-dic.bell'), gl = $c('.cc-dic.globe'); if (bl) bl.onclick = () => { if (cfg.ui === 'deck' && !S.menu) deckNotif(); }; if (gl) gl.onclick = () => { if (cfg.ui !== 'deck') return; if (S.menu) { SND.back(); closeCMenu(); return; } if (isSettings()) { SND.back(); deckGo('home'); return; } deckGo('settings'); }; // clic otra vez en el globo = cierra los ajustes (como Esc)
    const openSr = (hov) => { sbSync(); const i = S.tabs.findIndex((t) => t.id === 'search'); if (i >= 0) { S.dkSrHov = !!hov; box.classList.remove('sbar-on'); gotoTab(i); } };
    box.querySelectorAll('.cc-dsearch, .cc-dfield').forEach((ds) => { ds.onclick = () => openSr(false); });
    { // Steam: la barra de búsqueda completa reacciona al pasar el ratón por la lupa (no solo el icono); clic = se abre para escribir
      const sb = $c('.dk-sbar'), ls = $c('.cc-dsearch');
      if (ls) ls.onmouseenter = ls.onmousemove = () => { if (cfg.ui === 'deck' && S.mouse && !S.menu && !isSearch()) { sbSync(); box.classList.add('sbar-on'); } };
      sb.onmouseleave = () => box.classList.remove('sbar-on'); sb.onclick = () => openSr(true);
      // la barra se quita siempre que el cursor sale de ella (mouseleave no llega si el cursor sale antes de que la barra «lo note»)
      box.addEventListener('mousemove', (e) => { if (!box.classList.contains('sbar-on')) return; const inR = (el) => { const r = el.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; }; if (!inR(sb) && !(ls && inR(ls))) box.classList.remove('sbar-on'); }, true);
      document.addEventListener('mouseleave', () => box.classList.remove('sbar-on'));
    }
    box.addEventListener('click', (e) => { // Steam: con la barra de búsqueda vacía, un clic en cualquier otra parte la quita (y ese clic no activa nada)
      if (cfg.ui !== 'deck' || !isSearch() || S.view !== 'list' || SR.q.trim() || S.dkSrC || S.menu) return;
      if (e.target.closest('.cc-sr-q, .cc-sr-kb, .cc-top, .cc-hints')) return;
      e.stopPropagation(); e.preventDefault(); dkSrClose();
    }, true);
    box.addEventListener('mousemove', () => { box.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(() => box && box.classList.add('idle'), 3000); });
    try { if (navigator.getBattery) navigator.getBattery().then((b) => { const f = () => { const e = $c('.cc-bat'); e.classList.remove('hidden'); e.textContent = Math.round(b.level * 100) + '%' + (b.charging ? ' ⚡' : ''); }; f(); b.addEventListener('levelchange', f); b.addEventListener('chargingchange', f); }).catch(() => {}); } catch {}
  }

  // «Colores según el juego»: acentos y tinte del fondo salen de la portada y el banner del juego enfocado
  let adCur = null, adSeq = 0;
  function adaptColors(g) {
    adCur = g; if (!box) return;
    const t = THEMES.find((x) => x.id === cfg.theme) || THEMES[0], st = box.style;
    const put = (bg, panel, a, b) => {
      st.setProperty('--cc-bg', bg); st.setProperty('--cc-panel', panel); st.setProperty('--cc-accent', a); st.setProperty('--cc-accent2', b);
      st.setProperty('--cc-on', typeof onAccent === 'function' ? onAccent(a, b) : '#fff');
    };
    const base = () => put(t.bg, t.panel, t.accent, t.accent2);
    if (cfg.ui === 'x360' || cfg.ui === 'deck' || !cfg.adapt || !g || g.colorMode === 'theme' || typeof loadPalette !== 'function') { base(); return; }
    const use = (pal) => {
      if (g.accent) { put(t.bg, t.panel, g.accent, `color-mix(in srgb, ${g.accent}, white 28%)`); return; }
      if (!pal || !pal.colors || !pal.colors.length) { if (pal && pal.avg) { const m = pal.avg; put(`color-mix(in srgb, ${t.bg}, ${m} 20%)`, `color-mix(in srgb, ${t.panel}, ${m} 22%)`, t.accent, t.accent2); } else base(); return; }
      const [a, b] = pal.colors;
      put(`color-mix(in srgb, ${t.bg}, ${a} 13%)`, `color-mix(in srgb, ${t.panel}, ${a} 16%)`, `color-mix(in srgb, ${a}, black 12%)`, `color-mix(in srgb, ${b}, black 12%)`); // el tinte sale del color dominante, no del promedio (que casi siempre es gris oscuro)
    };
    if (g.accent) { use(null); return; }
    const key = paletteKey(g), hit = paletteCache.get(key);
    if (hit) { use(hit); return; }
    base(); const id = ++adSeq;
    loadPalette(g).then((p) => { paletteCache.set(key, p); if (id === adSeq && adCur === g) use(p); }).catch(() => {});
  }
  function applyCfg() {
    if (!box) return;
    try { paintMe(); } catch {}
    if (active && S.tabs && S.tabs.length && S._tabsUi !== cfg.ui) { // se cambió de estilo con el modo consola abierto: se reordenan las secciones
      const keep = S.tabs[S.tab] && S.tabs[S.tab].id; buildTabs(); const ti = S.tabs.findIndex((t) => t.id === keep); S.tab = ti >= 0 ? ti : 0; try { paintTabs(); } catch {}
    }
    box.classList.toggle('x3-move', cfg.ui === 'x360' && !!cfg.x3Move);
    try { updNowCard(); } catch {}
    { const sf = Math.max(0, Math.min(12, +cfg.safe || 0)); box.style.setProperty('--cc-sx', sf + 'vw'); box.style.setProperty('--cc-sy', sf + 'vh'); }
    const t = THEMES.find((x) => x.id === cfg.theme) || THEMES[0];
    const st = box.style;
    st.setProperty('--cc-text', t.text);
    adaptColors(adCur);
    const por = isPortrait(); box.classList.toggle('portrait', por);
    if (window.PadIcons) { PadIcons.setPref(cfg.padIcons); const l = $c('.cc-lb'), r = $c('.cc-rb'), dk = cfg.ui === 'deck'; if (l) l.innerHTML = (dk ? '<b class="dk-kb">Q</b><span class="dk-pd">' : '') + PadIcons.chip('LB') + (dk ? '</span>' : ''); if (r) r.innerHTML = (dk ? '<b class="dk-kb">E</b><span class="dk-pd">' : '') + PadIcons.chip('RB') + (dk ? '</span>' : ''); }
    const tp = !/^(x360|deck)/.test(cfg.ui || '') && (cfg.tabsPos === 'left' || cfg.tabsPos === 'right') ? cfg.tabsPos : 'top'; // el estilo Xbox 360 siempre lleva las secciones como blades
    if (box.dataset.tp !== tp) { box.dataset.tp = tp; box.classList.toggle('tabs-left', tp === 'left'); box.classList.toggle('tabs-right', tp === 'right'); if (S.tabs && S.tabs.length) paintTabs(); }
    st.setProperty('--cc-tile', ((TILE[cfg.tile] || 9.2) * (por ? 1.75 : 1)) + 'vw'); st.setProperty('--cc-font', String(FONT[cfg.font] || 1));
    st.setProperty('--x3d', String(Math.max(0, Math.min(90, +cfg.x3Dim || 0)) / 100)); st.setProperty('--x3b', (Math.max(0, Math.min(30, +cfg.x3Blur || 0))) + 'px'); st.setProperty('--x3bn', String(Math.max(0, Math.min(30, +cfg.x3Blur || 0))));
    st.setProperty('--cc-dim', String(Math.max(0, Math.min(90, cfg.dim)) / 100)); st.setProperty('--cc-blur', (Math.max(0, Math.min(30, cfg.blur || 0))) + 'px');
    st.setProperty('--cc-bw', ({ none: '0em', thin: '.07em', normal: '.12em' })[cfg.border] || '.07em'); st.setProperty('--cc-rad', ({ s: '.2em', m: '.5em', l: '.9em' })[cfg.radius] || '.5em');
    st.setProperty('--cc-gap', (GAP[cfg.gap] ?? 1.1) + 'vw'); st.setProperty('--cc-pos', (POS[cfg.rowPos] ?? 2.6) + 'vh');
    if (box.dataset.ui !== String(cfg.ui)) { const first = box.dataset.ui === undefined; box.dataset.ui = String(cfg.ui); if (!first && S.tabs && S.tabs.length) setTimeout(() => { try { paintTabs(); if (isHome()) paintHome(false); else if (!isSettings() && !isSearch()) paintList(); } catch {} }, 0); }
    box.classList.toggle('ui-deck', cfg.ui === 'deck'); box.classList.toggle('ui-x360b', cfg.ui === 'x360b'); box.classList.toggle('ui-x360', cfg.ui === 'x360'); box.classList.toggle('x3s', cfg.x3Tile === 's'); box.classList.toggle('x3l', cfg.x3Tile === 'l'); box.classList.toggle('side', cfg.banner !== 'full'); applyLayout(); box.classList.toggle('no-info', cfg.info === false);
    box.classList.toggle('plain', cfg.bgMode === 'plain'); box.classList.toggle('names-all', cfg.names === 'all'); box.classList.toggle('no-clock', !cfg.clock);
  }
  const LS = 'comptus.couch';
  let loadSrc = 'valores por defecto';
  async function saveNow() {
    let ls = 'sí'; try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch { ls = 'no'; }
    try {
      await window.api.setSettings({ couch: cfg });
      const g = await window.api.getSettings(); const ok = !!g && JSON.stringify(g.couch) === JSON.stringify(cfg);
      toast(ok ? 'Ajustes del modo consola guardados ✓' : 'Comptus no confirmó el guardado en su archivo (copia local: ' + ls + ')');
    } catch (e) { toast('No se pudo guardar: ' + (e && e.message ? e.message : e) + ' (copia local: ' + ls + ')'); }
  }
  const save = () => {
    try { localStorage.setItem(LS, JSON.stringify(cfg)); } catch {}
    try {
      Promise.resolve(window.api.setSettings({ couch: cfg })).then((r) => { if (r && JSON.stringify(r.couch) !== JSON.stringify(cfg)) toast('No se pudieron guardar los ajustes del modo consola en el archivo (se guardaron en esta ventana)'); }).catch(() => toast('No se pudieron guardar los ajustes del modo consola'));
    } catch {}
  };

  // ---------- Sonidos (sintetizados, sin archivos) ----------
  let ac = null;
  function beep(freqs, dur = 0.06, type = 'sine') {
    if (!cfg.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
      const v = VOL[cfg.vol] ?? 0.09, t0 = ac.currentTime;
      freqs.forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain(), t = t0 + i * dur * 0.85;
        o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
      });
    } catch {}
  }
  const SND0 = { move: () => beep([760], 0.035), tab: () => beep([520, 700], 0.07), open: () => beep([440, 660, 880], 0.07), back: () => beep([700, 480], 0.07), menu: () => beep([600, 900], 0.06), change: () => beep([660], 0.05, 'triangle'), play: () => beep([523, 659, 784, 1047], 0.09), enter: () => beep([392, 523, 784], 0.09), exit: () => beep([784, 523, 392], 0.09) };
  // sonidos propios del estilo Xbox 360 (sintetizados, inspirados en el panel; no son los originales)
  const SAMP = {}; // nombre -> { a: Audio, bad: bool }
  function samp(name, vol = 1) {
    if (!cfg.sound) return true;
    let s = SAMP[name]; if (s && s.bad) return false;
    try {
      if (!s) { s = SAMP[name] = { a: new Audio('sonidos/x360/' + name + '.mp3'), bad: false }; s.a.preload = 'auto'; s.a.onerror = () => { s.bad = true; }; }
      const k = s.a.cloneNode(); k.volume = Math.max(0, Math.min(1, (VOL[cfg.vol] ?? 0.09) * 10 * vol)); k.play().catch(() => { s.bad = true; });
      return true;
    } catch { return false; }
  }
  const sx = (name, vol, fb) => () => { if (!samp(name, vol)) fb(); };
  const SNDX = {
    move: sx('move', 1, () => beep([1480], 0.025, 'triangle')), tab: () => { if (!samp(box && box.dataset.dir === 'l' ? 'tab_left' : 'tab_right', 1)) beep([740, 1110, 1480], 0.05, 'sine'); }, open: sx('select', 1, () => beep([587, 880, 1175], 0.07, 'triangle')),
    back: sx('back', 1, () => beep([880, 587], 0.06, 'triangle')), menu: sx('menu', 1, () => beep([660, 990, 1320], 0.07, 'sine')), change: sx('move', .7, () => beep([1100], 0.04, 'triangle')),
    play: sx('select_alt', 1, () => beep([523, 784, 1047, 1568], 0.09, 'triangle')), enter: sx('welcome', 1, () => beep([440, 660, 990], 0.09, 'sine')), exit: sx('back', 1, () => beep([990, 660, 440], 0.09, 'sine')),
  };
  // sonidos del estilo Big Picture: recortados del video de referencia
  const SAMD = {};
  function sampD(name, vol = 1) {
    if (!cfg.sound) return true;
    let s = SAMD[name]; if (s && s.bad) return false;
    try {
      if (!s) { s = SAMD[name] = { a: new Audio('sonidos/deck/' + name + '.wav'), bad: false }; s.a.preload = 'auto'; s.a.onerror = () => { s.bad = true; }; }
      const k = s.a.cloneNode(); k.volume = Math.max(0, Math.min(1, (VOL[cfg.vol] ?? 0.09) * 10 * vol)); k.play().catch(() => { s.bad = true; });
      return true;
    } catch { return false; }
  }
  const sd = (name, vol, fb) => () => { if (!sampD(name, vol)) fb(); };
  const SNDD = {
    move: () => { const n = isSettings() ? 'set' : gridNow() ? 'grid' : 'move'; if (!sampD(n, 1)) SND0.move(); },
    tab: sd('tab', 1.2, SND0.tab), open: sd('open', 1, SND0.open), back: sd('back', 1, SND0.back), menu: sd('menu', 1, SND0.menu),
    change: sd('set', 1, SND0.change), play: sd('open', 1, SND0.play || SND0.open), enter: sd('sweep', 1, SND0.open), exit: sd('back', 1, SND0.back),
  };
  const SND = {}; Object.keys(SND0).forEach((k) => { SND[k] = (...a) => (cfg.ui === 'deck' && SNDD[k] ? SNDD : cfg.ui === 'x360' && cfg.x3Snd !== false ? SNDX : SND0)[k](...a); });
SND.movev = () => { if (cfg.ui === 'deck') { if (!sampD('movev', 1)) SNDD.move(); } else SND.move(); };

  // ---------- Cabecera, fondo y pie ----------
  const TAB_IC = {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    home: '<path d="M3.5 11.5L12 4l8.5 7.5M6 10v9.5h4.5V14h3v5.5H18V10"/>',
    all: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    inst: '<path d="M12 3v12M7 10.5l5 5 5-5M4.5 20h15"/>',
    recent: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
    fav: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9L3.5 9.7l5.9-.8z"/>',
    most: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
    ach: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    colls: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>',
    store: '<path d="M3.5 12.5L12 4h7.5v7.5L11 20zM15.5 8.5h.01"/>', shots: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 16l5-5 4 4 3-3 5 5"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>', save: '<path d="M5 3.5h11l3.5 3.5v13.5H5zM8 3.5v5h7v-5M8 20.5v-6h8v6"/>', bell: '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4"/>',
    music: '<path d="M9 18V5l11-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM20 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z"/>', sound: '<path d="M4 9.5h4L13 5v14l-5-4.5H4zM16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>', power: '<path d="M12 3v9M6.5 6.5a8 8 0 1 0 11 0"/>', exit: '<path d="M10 4.5H5v15h5M15 8l4 4-4 4M19 12H9"/>', stop: '<rect x="5.5" y="5.5" width="13" height="13" rx="2"/>',
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  };
  const tabIcon = (id) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TAB_IC[id] || TAB_IC.all}</svg>`;
  const DK_LIB = ['all', 'inst', 'colls', 'fav', 'recent', 'most']; // secciones que Big Picture agrupa como pestañas de la biblioteca
  function paintTabs() {
    const nav = $c('.cc-tabs'); nav.replaceChildren();
    box.style.setProperty('--bl-b', String(S.tab)); box.style.setProperty('--bl-a', String(Math.max(0, S.tabs.length - 1 - S.tab)));
    const side = !/^(x360|deck)/.test(cfg.ui || '') && (cfg.tabsPos === 'left' || cfg.tabsPos === 'right');
    if (side && window.PadIcons) { const l = el2('span', 'cc-rail-pad'); l.innerHTML = PadIcons.chip('LB'); nav.append(l); }
    const dk = cfg.ui === 'deck', inLib = dk && !!S.tabs[S.tab] && DK_LIB.includes(S.tabs[S.tab].id);
    if (box) box.classList.toggle('dk-lib', inLib);
    S.tabs.forEach((t, i) => {
      const b = el2('button', 'cc-tab' + (i === S.tab ? ' on' : '') + (side ? ' ico' : '') + (dk && !DK_LIB.includes(t.id) ? ' dk-off' : ''));
      if (dk && DK_LIB.includes(t.id)) { b.innerHTML = ''; b.append(el2('span', null, t.id === 'all' ? 'Todos los juegos' : t.title)); let n = 0; try { n = t.id === 'settings' ? 0 : tabItems(t.id).length; } catch {} if (n) b.append(el2('i', 'dk-n', String(n))); }
      else if (side) { b.innerHTML = tabIcon(t.id); b.title = t.title; b.setAttribute('aria-label', t.title); } else b.textContent = t.title;
      b.tabIndex = -1; b.onclick = () => gotoTab(i); nav.append(b);
    });
    if (side && window.PadIcons) { const r = el2('span', 'cc-rail-pad'); r.innerHTML = PadIcons.chip('RB'); nav.append(r); }
    { const o = nav.querySelector('.cc-tab.on'); if (dk && o) { o.classList.add('hot'); clearTimeout(paintTabs._hot); paintTabs._hot = setTimeout(() => { try { o.classList.remove('hot'); } catch {} }, 1700); } }
    const on = nav.querySelector('.cc-tab.on'); if (on && !side) try { if (cfg.ui === 'x360') nav.scrollTo({ left: on.offsetLeft - nav.offsetLeft - 2, behavior: 'smooth' }); else nav.scrollLeft = on.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2; } catch {}
  }
  function paintMe() { // foto y nombre del perfil junto al reloj (Xbox 360)
    const me = box && $c('.cc-me'); if (!me) return; const sp = cfg.ui === 'deck' && S.prof && S.prof.ok && S.prof.avatar ? S.prof : null, nm = (sp && sp.name) || cfg.x3Name || S.uname || 'Jugador', key = nm + '|' + (cfg.x3Pic || '') + '|' + (sp ? sp.avatar : '');
    if (me._k === key) return; me._k = key; me.replaceChildren();
    const pic = sp ? sp.avatar : cfg.x3Pic ? picSrc(cfg.x3Pic) : '';
    const av = el2('div', 'me-av' + (pic ? ' pic' : ''), pic ? '' : nm.charAt(0).toUpperCase()); if (pic) av.style.backgroundImage = `url("${pic}")`;
    me.append(av, el2('div', 'me-nm', nm));
    if (cfg.ui === 'deck') { me.style.cursor = 'pointer'; me.onclick = () => { if (!S.menu) dkProfile(); }; }
  }
  function tick() { paintMe(); if (box) $c('.cc-clock').textContent = cfg.ui === 'deck' ? new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?([ap])\.?\s?m\.?$/i, ' $1.m.').toLowerCase() : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  const hk = (a) => (hintMode === 'pad' && window.PadIcons ? `<i class="pk">${PadIcons.html(a)}</i>` : `<b>${a}</b>`);
  function hintHtml(arr) { // en el estilo Big Picture: «Menú» a la izquierda, el resto a la derecha, con los nombres de Steam
    if (cfg.ui !== 'deck') return arr.map(([a, t]) => `<span>${hk(a)}${t}</span>`).join('');
    const RN = { Abrir: 'Seleccionar', Elegir: 'Seleccionar', Aceptar: 'Seleccionar', Volver: 'Atrás', Cerrar: 'Atrás', Cancelar: 'Atrás' }, KN = { Enter: 'Intro', F2: 'F1' };
    const one = ([a, t]) => `<span>${hk(KN[a] || a)}${RN[t] || t}</span>`;
    const seen = {}, ded = (l) => l.filter((x) => { const k = RN[x[1]] || x[1]; if (seen[k]) return false; seen[k] = 1; return true; });
    return ded(arr.filter((x) => x[1] === 'Menú')).map(one).join('') + '<i class="dk-sp"></i>' + ded(arr.filter((x) => x[1] !== 'Menú')).map(one).join('');
  }
  function hints() {
    const pads = { achs: [['↑ ↓', 'Elegir logro'], ['B', 'Volver']], media: [['◀ ▶', 'Cambiar'], ['A', 'Pausa / Ampliar'], ['B', 'Volver']], list: [['A', 'Abrir'], ['X', 'Jugar'], ['Y', 'Opciones'], ['LB RB', 'Sección'], ['LT RT', 'Saltar'], ['Select + X', 'Menú']], detail: [['A', 'Elegir'], ['X', 'Jugar'], ['Y', 'Opciones'], ['↑ ↓', 'Leer'], ['B', 'Volver']], settings: [['↑ ↓', 'Opción'], ['← →', 'Cambiar'], ['A', 'Aceptar'], ['B', 'Volver']], search: [['A', 'Escribir'], ['B', 'Borrar'], ['Y', 'Espacio'], ['↓ →', 'Resultados'], ['LB RB', 'Sección']], searchRes: [['A', 'Abrir'], ['X', 'Jugar'], ['Y', 'Tienda'], ['↑ ←', 'Teclado'], ['LB RB', 'Sección']], home: [['A', 'Abrir'], ['X', 'Jugar'], ['↑ ↓', 'Fila'], ['← →', 'Elegir'], ['LB RB', 'Sección'], ['Select + X', 'Menú']], settingsCat: [['↑ ↓', 'Categoría'], ['→ / A', 'Entrar'], ['LB RB', 'Sección'], ['B', 'Salir']] };
    const kbs = { search: [['Enter', 'Escribir'], ['Borrar', 'Retroceso'], ['↓ →', 'Resultados'], ['Av Pág / Re Pág', 'Sección']], searchRes: [['Enter', 'Abrir'], ['P', 'Jugar'], ['Tab', 'Tienda'], ['↑ ←', 'Teclado']], home: [['↑ ↓', 'Fila'], ['← →', 'Elegir'], ['Enter', 'Abrir'], ['P', 'Jugar'], ['Q / E', 'Sección'], ['F2', 'Menú']],  achs: [['↑ ↓', 'Elegir logro'], ['Esc', 'Volver']], media: [['← →', 'Cambiar'], ['Enter', 'Pausa / Ampliar'], ['Esc', 'Volver']], list: [['← →', 'Moverse'], ['Enter', 'Abrir'], ['P', 'Jugar'], ['M', 'Opciones'], ['F', 'Favorito'], ['Q / E', 'Sección'], ['F2', 'Menú']], detail: [['← →', 'Elegir'], ['Enter', 'Aceptar'], ['P', 'Jugar'], ['↑ ↓', 'Leer'], ['Esc', 'Volver']], settings: [['↑ ↓', 'Opción'], ['← →', 'Cambiar'], ['Enter', 'Aceptar'], ['Esc', 'Volver']], settingsCat: [['↑ ↓', 'Categoría'], ['→ / Enter', 'Entrar'], ['Q / E', 'Sección'], ['Esc', 'Salir']] };
    const nmH = { pad: [['← ↑ ↓ →', 'Mover'], ['A', 'Escribir'], ['X', 'Borrar'], ['Y', 'Espacio'], ['B', 'Cancelar']], kb: [['Teclear', 'Escribir'], ['← ↑ ↓ →', 'Mover'], ['Enter', 'Elegir / Guardar'], ['Esc', 'Cancelar']] };
    if (S.pp) { $c('.cc-hints').innerHTML = hintHtml((hintMode === 'pad' ? [['← ↑ ↓ →', 'Mover'], ['A', 'Elegir'], ['B', 'Volver']] : [['← ↑ ↓ →', 'Mover'], ['Enter', 'Elegir'], ['Esc', 'Volver']])); return; }
    if (S.nm) { $c('.cc-hints').innerHTML = hintHtml(nmH[hintMode === 'pad' ? 'pad' : 'kb']); return; }
    const menuH = { pad: [['↑ ↓', 'Opción'], ['A', 'Aceptar'], ['B', 'Cerrar']], kb: [['↑ ↓', 'Opción'], ['Enter', 'Aceptar'], ['Esc', 'Cerrar']] };
    if (S.menu) { $c('.cc-hints').innerHTML = hintHtml(menuH[hintMode === 'pad' ? 'pad' : 'kb']); return; }
    const k = S.view === 'detail' && S.det.afocus ? 'achs' : S.view === 'detail' && S.det.mfocus ? 'media' : S.view === 'detail' ? 'detail' : isSettings() ? (S.col === 'cat' ? 'settingsCat' : 'settings') : isHome() ? 'home' : isSearch() ? (SR.zone === 'res' ? 'searchRes' : 'search') : 'list';
    if (cfg.ui === 'deck' && hintMode !== 'pad' && (k === 'search' || k === 'searchRes')) { $c('.cc-hints').innerHTML = hintHtml([['F2', 'Menú'], ['F4', 'Borrar'], ['Enter', 'Seleccionar'], ['Esc', 'Atrás']]); return; }
    $c('.cc-hints').innerHTML = hintHtml((hintMode === 'pad' ? pads : kbs)[k]);
  }
  const BGK = new Map(); // arte de tarjetas vecinas ya decodificado (Steam: el fondo cambia sin tirones)
  function preBg(g) {
    if (!g || cfg.ui !== 'deck') return;
    const u = [g.bannerSm, g.banner, g.bannerFallback, g.coverSm, g.cover, g.coverFallback].filter(Boolean).map(imgUrl)[0]; if (!u || BGK.has(u)) return;
    const im = new Image(); im.decoding = 'async'; im.src = u; if (im.decode) im.decode().catch(() => {}); BGK.set(u, im); if (BGK.size > 16) BGK.delete(BGK.keys().next().value);
  }
  function setBg(g) {
    adaptColors(g);
    const bg = $c('.cc-bg'); const id = ++imgSeq;
    if (cfg.ui === 'deck') { // Big Picture: el arte del juego enfocado, siempre
      const urls = g ? [g.bannerSm, g.banner, g.bannerFallback, g.coverSm, g.cover, g.coverFallback].filter(Boolean).map(imgUrl) : []; bg.style.imageRendering = ''; /* primero la copia fija (bannerSm): un banner webp animado enorme como fondo lagueaba */
      (function nxd(i) {
        if (i >= urls.length) { if (id === imgSeq) { const pu = bg.dataset.u; if (pu) { bg.style.setProperty('--prev', `url("${pu}")`); bg.classList.remove('swap'); void bg.offsetWidth; bg.classList.add('swap'); } bg.style.backgroundImage = ''; bg.dataset.u = ''; $c('.cc-shade').style.removeProperty('--dk-art'); } return; }
        const im = new Image(); im.onload = () => { const go = () => { if (id === imgSeq) { if (bg.dataset.u === urls[i]) return; const prevU = bg.dataset.u; if (prevU) bg.style.setProperty('--prev', `url("${prevU}")`); else bg.style.removeProperty('--prev'); bg.style.setProperty('--pan', '-' + ((Date.now() / 1000) % 52).toFixed(2) + 's'); bg.dataset.u = urls[i]; $c('.cc-shade').style.setProperty('--dk-art', `url("${urls[i]}")`); bg.style.backgroundImage = `url("${urls[i]}")`; bg.classList.remove('swap'); void bg.offsetWidth; bg.classList.add('swap'); } }; if (im.decode) im.decode().then(go, go); else go(); }; // se decodifica ANTES de cambiar el fondo: así no hay tirón al pintar
        im.onerror = () => nxd(i + 1); im.src = urls[i];
      })(0); return;
    }
    if (cfg.ui === 'x360') { // fondo propio del estilo Xbox 360
      const md = cfg.x3Bg || 'grey', det = S.view === 'detail';
      let urls = []; bg.style.imageRendering = '';
      if (isHome() && !det && cfg.x3HomeBg === 'custom' && cfg.x3HomePath) urls = [imgUrl(cfg.x3HomePath)]; else if (md === 'custom' && cfg.x3BgPath) urls = [imgUrl(cfg.x3BgPath)]; else if ((md === 'game' || det) && g) urls = [g.banner, g.bannerSm, g.bannerFallback, g.cover, g.coverFallback].filter(Boolean).map(imgUrl);
      (function nx3(i) {
        if (i >= urls.length) { if (id === imgSeq) { bg.style.backgroundImage = ''; bg.dataset.u = ''; } return; }
        const im = new Image(); im.onload = () => { if (id === imgSeq) { if (bg.dataset.u === urls[i]) return; bg.dataset.u = urls[i]; bg.style.backgroundImage = `url("${urls[i]}")`; bg.classList.remove('swap'); void bg.offsetWidth; bg.classList.add('swap'); } };
        im.onerror = () => nx3(i + 1); im.src = urls[i];
      })(0); return;
    }
    if (isHome() && S.view === 'list' && (cfg.homeBg === 'custom' || cfg.homeBg === 'plain')) { // fondo exclusivo de Inicio
      bg.style.imageRendering = ''; box.classList.toggle('home-bg', cfg.homeBg === 'custom' && !!cfg.homeBgPath);
      const u = cfg.homeBg === 'custom' && cfg.homeBgPath ? imgUrl(cfg.homeBgPath) : '';
      if (!u) { bg.style.backgroundImage = ''; bg.dataset.u = ''; return; }
      const im = new Image(); im.onload = () => { if (id === imgSeq && bg.dataset.u !== u) { bg.dataset.u = u; bg.style.backgroundImage = `url("${u}")`; bg.classList.remove('swap'); void bg.offsetWidth; bg.classList.add('swap'); } }; im.onerror = () => { if (id === imgSeq) { bg.style.backgroundImage = ''; bg.dataset.u = ''; } }; im.src = u; return;
    }
    const th0 = cfg.bgMode === 'art' ? THEMES.find((x) => x.id === cfg.theme) : null, key = th0 && th0.art, u0 = key && window.THEME_ART ? window.THEME_ART.get(key) : '';
    if (u0) { bg.dataset.u = ''; bg.style.backgroundImage = u0; bg.style.imageRendering = window.THEME_ART.pixel(key) ? 'pixelated' : ''; return; } // sin ilustración en el tema elegido se usa el banner del juego
    bg.style.imageRendering = '';
    if (!g || cfg.bgMode === 'plain') { bg.style.backgroundImage = ''; bg.dataset.u = ''; return; }
    const urls = [g.banner, g.bannerSm, g.bannerFallback, g.cover, g.coverFallback].filter(Boolean).map(imgUrl);
    (function next(i) {
      if (i >= urls.length) { if (id === imgSeq) bg.style.backgroundImage = ''; return; }
      const im = new Image(); im.onload = () => { if (id === imgSeq) { if (bg.dataset.u === urls[i]) return; bg.dataset.u = urls[i]; bg.style.backgroundImage = `url("${urls[i]}")`; bg.classList.remove('swap'); void bg.offsetWidth; bg.classList.add('swap'); } };
      im.onerror = () => next(i + 1); im.src = urls[i];
    })(0);
  }

  const fmtPlay = (m) => (!m ? 'Sin jugar' : m >= 60 ? (m >= 600 ? Math.round(m / 60) : (m / 60).toFixed(1)) + ' h jugadas' : Math.round(m) + ' min jugados');
  function fmtLast(ms) { if (!ms) return 'Nunca jugado'; const d = Math.floor((Date.now() - ms) / 86400000); return d <= 0 ? 'Jugado hoy' : d === 1 ? 'Jugado ayer' : d < 30 ? `Jugado hace ${d} días` : 'Jugado el ' + new Date(ms).toLocaleDateString(); }
  function metaOf(g) {
    const st = statusDef(g.status), a = g.achievements;
    return [fmtPlay(g.playTime), fmtLast(g.lastPlayed), st && st.label, a && a.total ? (isComplete(g) ? `🏆 Completado al 100 % (${a.total} logros)` : `Logros ${a.unlocked}/${a.total} (${Math.round(a.unlocked / a.total * 100)} %)`) : '', g.favorite && '★ Favorito'].filter(Boolean).join('   ·   ');
  }
  function titleInto(t, g) {
    t.replaceChildren();
    const logo = g.logoSm || g.logo;
    if (logo && !g.logoOff) { const im = new Image(); im.alt = g.name; im.onerror = () => { t.textContent = g.name; }; im.src = imgUrl(logo); t.append(im); } else t.textContent = g.name;
  }
  function paintHero() {
    const it = cur()[curIdx()], hero = $c('.cc-hero');
    if (!it) { hero.classList.add('empty'); setBg(null); if (box.classList.contains('ach-view')) achPane(null); return; }
    hero.classList.remove('empty'); if (box.classList.contains('ach-view')) achPane(it);
    { let n = hero.querySelector('.cc-x3n'); if (!n) { n = el2('div', 'cc-x3n'); hero.append(n); } n.textContent = cur().length ? `${curIdx() + 1} de ${cur().length}` : ''; }
    if (it.type === 'game') {
      S.focusId = it.g.id; $c('.cc-src').textContent = srcDef(it.g.source).name; titleInto($c('.cc-title'), it.g); $c('.cc-meta').textContent = metaOf(it.g); setBg(it.g);
    } else {
      const name = it.type === 'coll' ? it.c.name : it.s.name;
      $c('.cc-src').textContent = it.type === 'coll' ? 'Colección' : 'Tienda'; $c('.cc-title').textContent = name;
      $c('.cc-meta').textContent = `${it.games.length} juego${it.games.length === 1 ? '' : 's'}`; setBg(it.games[0]);
    }
  }

  // ---------- Lista ----------
  const x3Cards = () => cfg.ui === 'x360' && S.view !== 'detail' && !isHome() && !isSearch() && !isSettings() && !(S.tabs[S.tab] && S.tabs[S.tab].id === 'ach');
  const gridNow = () => cfg.ui === 'deck' ? !isSettings() : cfg.ui === 'x360' ? false : cfg.ui === 'x360b' ? !!(!isSettings() && S.tabs[S.tab] && S.tabs[S.tab].id === 'colls') : cfg.layout === 'grid' || (cfg.layout === 'auto' && isPortrait()) || (isSettings() ? false : S.tabs[S.tab] && S.tabs[S.tab].id === 'colls');
  const blRows = () => cfg.ui === 'x360b' && S.view !== 'detail' && !isHome() && !isSearch() && !isSettings() && !gridNow() && !(S.tabs[S.tab] && S.tabs[S.tab].id === 'ach');
  function applyLayout() { if (!box) return; box.classList.toggle('dk-home', cfg.ui === 'deck' && isHome() && S.view === 'list'); box.classList.toggle('home-bg', isHome() && S.view === 'list' && cfg.homeBg === 'custom' && !!cfg.homeBgPath); box.classList.toggle('x3-cards', x3Cards()); box.classList.toggle('x3-bg', cfg.ui === 'x360' && ((isHome() && S.view === 'list' && cfg.x3HomeBg === 'custom' && !!cfg.x3HomePath) || cfg.x3Bg === 'custom' || cfg.x3Bg === 'game') && !(cfg.x3Bg === 'custom' && !cfg.x3BgPath)); box.classList.toggle('grid', gridNow()); box.classList.toggle('ach-view', !!(S.tabs[S.tab] && S.tabs[S.tab].id === 'ach')); box.classList.toggle('bl-rows', blRows()); box.classList.toggle('colls-view', !!(S.tabs[S.tab] && S.tabs[S.tab].id === 'colls' && !S.sub)); box.classList.toggle('x3-colls', cfg.ui === 'x360' && !!(S.tabs[S.tab] && S.tabs[S.tab].id === 'colls' && !S.sub)); box.classList.toggle('x3-dim', cfg.ui === 'x360' && S.view === 'detail' && !!S.det && S.det.tab === 'ach'); }
  const decImg = new Map(); // imágenes ya decodificadas que se mantienen vivas (al cambiar de sección no «parpadean» las portadas)
  const coverOk = new Map(); // juego -> portada ya cargada (al repintar no vuelve a verse el color de relleno)
  function loadCover(cv, g) {
    const known = coverOk.get(g.id); if (known) { cv.style.background = `url("${known}") center top / cover no-repeat`; return; }
    cv.style.background = colorFor(g.name);
    const urls = [g.coverSm, g.cover, g.coverFallback].filter(Boolean).map(imgUrl);
    (function next(i) { if (i >= urls.length) return; const im = new Image(); im.onload = () => { coverOk.set(g.id, urls[i]); decImg.set(g.id, im); cv.style.background = `url("${urls[i]}") center top / cover no-repeat`; }; im.onerror = () => next(i + 1); im.src = urls[i]; })(0);
  }
  function tileFor(it) {
    const t = el2('div', 'cc-tile' + (it.type !== 'game' ? ' group' : ''));
    const cv = el2('div', 'cc-cover' + (it.type === 'coll' ? ' coll' : '')); t.append(cv);
    const g = it.type === 'game' ? it.g : it.games[0];
    try { cv.dataset.src = it.type === 'game' ? srcDef(g.source).name : it.type === 'coll' ? 'Colección' : 'Tienda'; } catch {}
    if (it.type === 'game') { t.dataset.gid = g.id; if (INST.prog[g.id]) setTimeout(() => instMark(t, g.id), 0); }
    if (it.type === 'coll') {
      if (cfg.ui === 'deck') t.style.setProperty('--h', hueOf(it.c.name));
      const art = el2('div', 'coll-art'); cv.append(art);
      t._load = () => {
        if (t._done) return; t._done = true;
        const collage = () => { try { collCollage(it.c, it.games, art); } catch { art.textContent = ''; } };
        if (it.c.cover) {
          const im = new Image(); im.alt = ''; im.className = 'cc-collimg';
          const still = imgUrl(it.c.coverSm || it.c.cover), full = imgUrl(it.c.cover);
          im.onerror = () => { if (im.dataset.fb) return collage(); im.dataset.fb = '1'; im.src = still; };
          im.src = it.c.coverAnim ? still : full; art.append(im);
          if (it.c.coverAnim) t._anim = (on) => { const want = on ? full : still; if (im.dataset.cur !== want) { im.dataset.cur = want; im.src = want; } }; // la animada solo en la colección enfocada
          } else collage();
      };
      t.append(el2('div', 'cc-coll-over', it.c.name)); t.append(el2('span', 'cc-count', String(it.games.length)));
      t.onmouseenter = () => { if (padActive()) return; if (curIdx() !== +t.dataset.i) select(+t.dataset.i, true); }; t.onclick = () => { select(+t.dataset.i, true); open(); }; if (cfg.ui === 'deck') dkHov(t);
      return t;
    }
    t._load = () => { if (t._done) return; t._done = true; loadCover(cv, g); };
    if (!g.cover && !g.coverFallback) { cv.style.background = colorFor(g.name); cv.textContent = (g.name[0] || '?').toUpperCase(); t._done = true; }
    const label = it.type === 'game' ? g.name : (it.type === 'coll' ? it.c.name : it.s.name);
    t.append(el2('div', 'cc-name', label));
    if (it.type === 'game') t.append(el2('div', 'cc-sub', fmtPlay(g.playTime)));
    if (it.type === 'game') { const sc = el2('span', 'cc-store'); sc.style.color = STORE_COL[g.source] || '#fff'; try { sc.append(sourceIcon(g.source, 15)); } catch {} t.append(sc); }
    if (it.type === 'game' && g.achievements && g.achievements.total > 0) {
      const done = isComplete(g), pr = el2('div', 'cc-prog'), bar = el2('i'); bar.style.width = Math.round(g.achievements.unlocked / g.achievements.total * 100) + '%';
      t.append(el2('span', 'cc-ptxt', `${g.achievements.unlocked}/${g.achievements.total} · ${Math.round(g.achievements.unlocked / g.achievements.total * 100)} %`)); pr.append(el2('span', null, `${g.achievements.unlocked}/${g.achievements.total}`), el2('div', 'cc-prog-bar')); pr.lastChild.append(bar); cv.append(pr);
      if (done) { t.classList.add('done'); const tr = el2('span', 'cc-trophy'); tr.innerHTML = trophySvg(); cv.append(tr); }
    }
    if (it.type !== 'game') t.append(el2('span', 'cc-count', String(it.games.length)));
    else if (runStateFor(g)) t.append(el2('span', 'cc-run', 'En ejecución'));
    else if (g.installed === false) { t.classList.add('ni'); t.append(el2('span', 'cc-ni', 'No instalado')); }
    t.onmouseenter = () => { if (padActive()) return; if (curIdx() !== +t.dataset.i) { select(+t.dataset.i, true); } };
    t.onclick = () => { select(+t.dataset.i, true); open(); }; if (cfg.ui === 'deck') dkHov(t);
    t.oncontextmenu = (e) => { e.preventDefault(); select(+t.dataset.i, true); menu(e.clientX, e.clientY); };
    return t;
  }
  function paintList(keepId) {
    applyLayout();
    const strip = $c('.cc-strip'); strip.replaceChildren();
    const items = cur();
    items.forEach((it, i) => { const t = tileFor(it); t.dataset.i = i; t.style.setProperty('--i', Math.min(i, 16)); strip.append(t); });
    if (keepId) { const k = items.findIndex((x) => x.type === 'game' && x.g.id === keepId); if (k >= 0) setIdx(k); }
    if (curIdx() >= items.length) setIdx(Math.max(0, items.length - 1));
    const sub = $c('.cc-subtitle'); sub.classList.toggle('hidden', !S.sub); if (S.sub) sub.textContent = '‹  ' + S.sub.title;
    $c('.cc-empty') && $c('.cc-empty').remove();
    if (!items.length) { strip.append(el2('div', 'cc-empty', 'No hay juegos en esta sección todavía.')); }
    mark(true); paintHero();
  }
  function animSel() { document.querySelectorAll('#couch .cc-strip .cc-tile').forEach((t) => { if (t._anim) t._anim(t.classList.contains('sel')); }); }
  function ensureImgs() {
    const strip = $c('.cc-strip'), i = curIdx();
    for (let k = Math.max(0, i - 24); k <= Math.min(strip.children.length - 1, i + (gridNow() ? 60 : 30)); k++) { const t = strip.children[k]; if (t && t._load) t._load(); }
  }
  function mark(instant) {
    const strip = $c('.cc-strip'); strip.querySelectorAll('.sel').forEach((e) => e.classList.remove('sel'));
    const t = strip.children[curIdx()]; if (!t || !t.dataset) return; t.classList.add('sel'); if (cfg.ui === 'deck' && t.dataset.gid) dkGlow(t.querySelector('.cc-cover'), byId(t.dataset.gid)); ensureImgs(); animSel();
    if (box.classList.contains('bl-rows')) { const top = t.offsetTop - (strip.clientHeight - t.offsetHeight) / 2; strip.scrollTo({ top: Math.max(0, top), behavior: instant ? 'instant' : 'smooth' }); return; }
    if (box.classList.contains('ach-view')) { const top = t.offsetTop - (strip.clientHeight - t.offsetHeight) / 2; strip.scrollTo({ top: Math.max(0, top), behavior: instant ? 'instant' : 'smooth' }); return; }
    if (gridNow()) { const top = t.offsetTop - (strip.clientHeight - t.offsetHeight) / 2; strip.scrollTo({ top: Math.max(0, top), behavior: instant ? 'instant' : 'smooth' }); return; }
    const left = t.offsetLeft - (strip.clientWidth - t.offsetWidth) / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: instant ? 'instant' : 'smooth' }); // sin scrollIntoView: no mueve nada más que la fila
  }
  function select(i, fromMouse) {
    const n = cur().length; if (!n) return; i = Math.max(0, Math.min(n - 1, i)); if (i === curIdx() && !fromMouse) return;
    if (!fromMouse || i !== curIdx()) SND.move(); setIdx(i); const strip = $c('.cc-strip'); strip.querySelectorAll('.sel').forEach((e) => e.classList.remove('sel')); const t = strip.children[i]; if (t) { t.classList.add('sel'); if (cfg.ui === 'deck' && t.dataset.gid) dkGlow(t.querySelector('.cc-cover'), byId(t.dataset.gid)); }
    ensureImgs(); animSel(); if (!fromMouse) mark(); paintHero();
  }


  // ---------- Inicio: novedades, gratis, eventos y rebajas ----------
  const HM = { r: 0, c: [], rows: [], data: { free: null, events: null, wish: null }, at: 0, loading: false, failed: false };
  const dayFmt = (ms) => new Date(ms).toLocaleDateString([], { day: 'numeric', month: 'short' });
  const leftTxt = (end) => { const d = Math.ceil((end - Date.now()) / 86400000); return d <= 0 ? 'Termina hoy' : d === 1 ? 'Termina mañana' : `Termina en ${d} días`; };
  const homeCard = () => { const row = HM.rows[HM.r]; return row ? row.items[HM.c[HM.r] || 0] : null; };
  async function loadHome(force) {
    try { loadFriends(false); } catch { /* sin amigos */ }
    if (HM.loading || (!force && HM.at && Date.now() - HM.at < 5 * 60 * 1000)) return;
    HM.loading = true; HM.failed = false;
    const ask = (fn) => { try { return typeof fn === 'function' ? Promise.resolve(fn(!!force)).catch(() => null) : Promise.resolve(null); } catch { return Promise.resolve(null); } };
    const [free, ev, wish] = await Promise.all([ask(window.api.freeGet), ask(window.api.eventsGet), ask(window.api.wishGet)]);
    HM.data = { free, events: ev, wish }; HM.at = Date.now(); HM.loading = false; HM.failed = !free && !ev && !wish;
    if (active && isHome() && S.view === 'list' && !S.menu) paintHome(true);
  }
  // Amigos de Steam (solo Big Picture): se piden al abrir el Inicio y de nuevo al entrar en la pestaña Amigos si pasaron > 2 min
  async function loadFriends(force) {
    if (cfg.ui !== 'deck' || typeof window.api.friendsGet !== 'function') return;
    if (HM.frBusy || (!force && HM.fr && Date.now() - HM.frAt < 2 * 60 * 1000)) return;
    HM.frBusy = true;
    let r = null; try { r = await window.api.friendsGet(!!force); } catch { r = null; }
    HM.frBusy = false; HM.fr = r || { ok: false, code: 'net', error: 'No se pudo consultar a Steam.' }; HM.frAt = Date.now();
    if (active && isHome() && S.view === 'list' && !S.menu && S.dkSrHome !== true) paintHome(true);
  }
  const frLabel = (f) => f.game ? 'Jugando a ' + f.game : f.state === 1 ? 'En línea' : f.state === 2 ? 'Ocupado' : f.state === 3 ? 'Ausente' : f.state === 4 ? 'Dormido' : f.state > 4 ? 'En línea' : f.lastOff ? 'Visto ' + fmtAgo(f.lastOff * 1000) : 'Desconectado';
  function fmtAgo(t) { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); if (m < 60) return 'hace ' + m + ' min'; const h = Math.round(m / 60); if (h < 24) return 'hace ' + h + ' h'; const d = Math.round(h / 24); return d < 30 ? 'hace ' + d + (d === 1 ? ' día' : ' días') : 'hace mucho'; }
  function dkFriendRows() {
    const r = HM.fr;
    if (!r) return [{ id: 'dkfr', title: 'Amigos', items: [{ kind: 'info', title: 'Cargando amigos…', sub: 'Consultando a Steam' }] }];
    if (!r.ok) return [{ id: 'dkfr', title: 'Amigos', items: [{ kind: 'info', title: r.code === 'nokey' ? 'Falta la clave de Steam' : r.code === 'private' ? 'No se pudo ver tu lista de amigos' : 'No se pudo cargar a tus amigos', sub: r.code === 'nokey' ? 'Pega tu clave de la API en Ajustes' : r.code === 'private' ? 'Pon tu lista de amigos en público en tu perfil de Steam' : (r.error || 'Revisa tu conexión') }] }];
    const fr = r.friends || [], mk = (f) => ({ kind: 'friend', title: f.name, sub: frLabel(f), img: f.avatar ? [f.avatar] : [], url: f.url, f });
    const play = fr.filter((f) => f.game), on = fr.filter((f) => !f.game && f.state > 0), off = fr.filter((f) => !f.game && f.state === 0).slice(0, 24);
    const out = [];
    if (play.length) out.push({ id: 'dkfp', title: 'Jugando ahora', items: play.map(mk) });
    if (on.length) out.push({ id: 'dkfo', title: 'En línea', items: on.map(mk) });
    if (off.length) out.push({ id: 'dkff', title: 'Desconectados', items: off.map(mk) });
    if (!out.length) out.push({ id: 'dkfr', title: 'Amigos', items: [{ kind: 'info', title: 'Aún no tienes amigos en Steam', sub: 'Cuando los agregues aparecerán aquí' }] });
    return out;
  }
  // Ficha de un amigo (panel lateral): estado, nivel, «amigos desde», juegos recientes y acciones
  function dkFriendProfile(f) {
    const hrsF = (m) => m >= 60 ? (m / 60).toFixed(1).replace('.', ',') + ' h' : Math.round(m) + ' min', no = () => {};
    const base = () => [
      { label: 'Estado', value: frLabel(f), run: no },
      ...(f.since ? [{ label: 'Amigos desde', value: new Date(f.since * 1000).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, ''), run: no }] : []),
    ];
    const tail = [{ sep: true }, { label: 'Enviar mensaje (abre Steam)', run: () => { if (window.api.friendsChat) window.api.friendsChat(f.id); toast('Abriendo el chat en Steam…'); } }, { label: 'Ver perfil en Steam', run: () => { if (f.url && window.api.friendsOpen) { window.api.friendsOpen(f.url); toast('Abriendo el perfil…'); } } }];
    const items = [...base(), { label: 'Cargando datos del perfil…', run: no }, ...tail];
    cmenu(f.name, items, { side: true, right: true });
    if (!window.api.friendsDetail) return; const m0 = S.menu;
    window.api.friendsDetail(f.id).then((r) => {
      if (!S.menu || S.menu !== m0) return;
      const mid = [];
      if (r && r.ok) {
        if (r.level != null) mid.push({ label: 'Nivel de Steam', value: String(r.level), run: no });
        if (r.recent && r.recent.length) { mid.push({ sep: true }, { label: 'Jugado recientemente', value: '2 semanas', run: no }); r.recent.forEach((g) => mid.push({ label: g.name, value: hrsF(g.min2w), run: no })); }
        else if (r.recentOk) mid.push({ label: 'Sin partidas en las últimas 2 semanas', run: no }); else mid.push({ label: 'Sus juegos son privados', run: no });
      } else mid.push({ label: 'No se pudo leer su perfil', run: no });
      m0.items = [...base(), ...mid, ...tail]; if (m0.idx >= m0.items.length) m0.idx = 0; paintMenu(false);
    }).catch(() => {});
  }
  // Tarjeta flotante del juego en ejecución (se ve en cualquier sección)
  function updNowCard() {
    if (!box) return; let c = $c('.cc-nowcard'), d = $c('.cc-nowdim');
    const rg = runState ? state.games.find((g) => runStateFor(g)) : null;
    const x3 = true; // sin tarjeta de «en ejecución»: la pantalla se difumina a negro al pulsar Jugar (como la Xbox 360)
    const on = !!(active && cfg.ui !== 'deck' && (rg || (S.x3launch && Date.now() - S.x3launch < 12000)));
    if (!d) { d = el2('div', 'cc-nowdim'); box.append(d); }
    d.classList.toggle('on', on); d.classList.toggle('x3', x3);
    if (x3) { if (c) c.classList.add('hidden'); return; }
    if (!on) { if (c) c.classList.add('hidden'); return; }
    if (!c) { c = el2('div', 'cc-nowcard hidden'); box.append(c); }
    if (c.dataset.id !== rg.id) {
      c.dataset.id = rg.id; c.replaceChildren();
      const cv = el2('div', 'cc-nc-cv'), urls = [rg.coverSm, rg.cover, rg.coverFallback, rg.bannerSm, rg.banner].filter(Boolean).map(imgUrl);
      (function next(i) { if (i >= urls.length) { cv.classList.add('none'); cv.style.background = colorFor(rg.name); return; } const im = new Image(); im.alt = ''; im.draggable = false; im.onload = () => cv.append(im); im.onerror = () => next(i + 1); im.src = urls[i]; })(0);
      const b = el2('div', 'cc-nc-body'); b.append(el2('div', 'cc-nc-st', 'EN EJECUCIÓN'), el2('div', 'cc-nc-name', rg.name), el2('div', 'cc-nc-time', ''));
      c.append(cv, b);
    }
    const rs = runStateFor(rg), t = c.querySelector('.cc-nc-time');
    t.textContent = !rs || rs.state === 'starting' ? 'Iniciando…' : rs.state === 'stopping' ? 'Cerrando…' : 'Jugando · ' + clockOf(S.play ? Date.now() - S.play.t : 0);
    c.classList.remove('hidden');
  }
  function clockOf(ms) { const m = Math.floor(ms / 60000); return m < 1 ? 'menos de 1 min' : m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min'; }
  function sessMin() { return S.play ? Math.max(0, Math.floor((Date.now() - S.play.t) / 60000)) : 0; }
  function nowSub(g) { const rs = runStateFor(g); if (!rs || rs.state === 'starting') return 'Iniciando…'; if (rs.state === 'stopping') return 'Cerrando…'; const m = sessMin(); return 'Esta sesión: ' + (m < 1 ? 'menos de 1 min' : m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'); }
  // Rotación: cada 6 horas se elige otro grupo de juegos (estable mientras tanto, para que la fila no cambie al repintar)
  const hashStr = (t) => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rotate = (arr, n, salt) => { const b = Math.floor(Date.now() / 21600000) + salt; return arr.map((g) => [hashStr(g.id + ':' + b), g]).sort((x, y) => x[0] - y[0]).slice(0, n).map((x) => x[1]); };
  function homeRows() {
    const rows = [], list = state.games.filter(playable), D = HM.data;
    const G = (g, sub, badge) => ({ kind: 'game', g, title: g.name, sub, badge, img: [g.bannerSm, g.banner, g.bannerFallback, g.coverSm, g.cover, g.coverFallback].filter(Boolean).map(imgUrl) });
    const rg = runState ? list.find((g) => runStateFor(g)) || state.games.find((g) => runStateFor(g)) : null;
    if (rg) rows.push({ id: 'now', title: 'Jugando ahora', items: [{ ...G(rg, nowSub(rg), 'EN EJECUCIÓN'), now: true }] });
    const rec = list.filter((g) => g.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed).slice(0, 12);
    if (rec.length) rows.push({ id: 'cont', title: 'Continuar jugando', items: rec.map((g) => G(g, fmtLast(g.lastPlayed) + (cfg.ui === 'deck' && g.playTime > 0 ? ' · ' + (g.playTime >= 60 ? ((g.playTime / 60) >= 10 ? Math.round(g.playTime / 60) : (g.playTime / 60).toFixed(1).replace(/\.0$/, '').replace('.', ',')) + ' h' : Math.round(g.playTime) + ' min') : ''), g.installed === false ? 'No instalado' : ''))});
    const hrs = (g) => { const h = (g.playTime || 0) / 60; return (h >= 10 ? Math.round(h) : h.toFixed(1).replace(/\.0$/, '')) + ' h jugadas'; };
    const favs = list.filter((g) => g.favorite).sort((a, b) => (b.installed !== false) - (a.installed !== false) || byName(a, b)).slice(0, 14);
    if (favs.length) rows.push({ id: 'fav', title: 'Tus favoritos', items: favs.map((g) => G(g, g.lastPlayed ? fmtLast(g.lastPlayed) : 'Favorito', g.installed === false ? 'No instalado' : '')) });
    const top = list.filter((g) => g.playTime > 0).sort((a, b) => b.playTime - a.playTime).slice(0, 12);
    if (top.length >= 3) rows.push({ id: 'top', title: 'Los que más has jugado', items: top.map((g) => G(g, hrs(g), g.installed === false ? 'No instalado' : '')) });
    const fr = D.free ? [...(D.free.epic || []), ...(D.free.steam || []), ...(D.free.other || [])] : [];
    const st = (x) => x.store === 'epic' ? 'Epic Games' : x.store === 'steam' ? 'Steam' : (x.storeName || 'Tienda');
    fr.sort((a, b) => (a.status === 'soon') - (b.status === 'soon') || (!!a.owned - !!b.owned) || (a.end || 9e15) - (b.end || 9e15));
    if (fr.length) rows.push({ id: 'free', title: 'Gratis ahora', items: fr.slice(0, 14).map((x) => ({ kind: 'link', url: x.url, app: x.app, title: x.title, img: x.image ? [x.image] : [], badge: x.status === 'soon' ? 'PRÓXIMAMENTE' : 'GRATIS', tag: st(x), sub: x.owned ? '✓ Ya la tienes' : x.status === 'soon' ? (x.start ? 'Desde el ' + dayFmt(x.start) : 'Muy pronto') : x.end ? leftTxt(x.end) : 'Por tiempo limitado', done: !!x.owned })) });
    const now = Date.now(), evs = D.events && D.events.events ? D.events.events.filter((e) => (e.status === 'live' || (e.status === 'soon' && e.start < now + 45 * 86400000))).slice(0, 12) : [];
    if (evs.length) rows.push({ id: 'ev', title: 'Eventos y rebajas', items: evs.map((e) => ({ kind: 'event', store: e.store, url: e.url, title: e.name, img: [], tag: e.store === 'steam' ? 'Steam' : e.store === 'epic' ? 'Epic Games' : 'Tiendas', badge: e.status === 'live' ? 'EN CURSO' : 'PRÓXIMO', sub: e.status === 'live' ? leftTxt(e.end) : 'Empieza el ' + dayFmt(e.start) })) });
    const wl = D.wish ? [...(D.wish.steam || []), ...(D.wish.epic || [])].filter((x) => !x.owned && !x.soon && (x.free || x.discount > 0)).sort((a, b) => (b.free ? 100 : b.discount) - (a.free ? 100 : a.discount)).slice(0, 14) : [];
    if (wl.length) rows.push({ id: 'wish', title: 'En oferta de tu lista de deseados', items: wl.map((x) => ({ kind: 'link', url: x.url, app: x.app, title: x.title, img: x.image ? [x.image] : [], badge: x.free ? 'GRATIS' : '−' + x.discount + ' %', tag: st(x), sub: [x.price, x.orig && 'antes ' + x.orig].filter(Boolean).join(' · ') })) });
    const near = list.filter((g) => g.achievements && g.achievements.total > 0 && g.achievements.unlocked < g.achievements.total && g.achievements.unlocked / g.achievements.total >= 0.5).sort((a, b) => b.achievements.unlocked / b.achievements.total - a.achievements.unlocked / a.achievements.total).slice(0, 12);
    if (near.length) rows.push({ id: 'near', title: 'Casi completados', items: near.map((g) => G(g, `${g.achievements.unlocked}/${g.achievements.total} logros · ${Math.round(100 * g.achievements.unlocked / g.achievements.total)} %`, '')) });
    const oldT = Date.now() - 45 * 86400000;
    const old = list.filter((g) => g.playTime > 0 && (!g.lastPlayed || g.lastPlayed < oldT));
    const oldR = rotate(old, 14, 'old');
    if (old.length >= 2) rows.push({ id: 'old', title: 'Hace tiempo que no juegas', items: oldR.map((g) => G(g, g.lastPlayed ? fmtLast(g.lastPlayed) + ' · ' + hrs(g) : hrs(g), g.installed === false ? 'No instalado' : '')) });
    const best = list.filter((g) => g.info && g.info.metacritic >= 85);
    const bestR = rotate(best, 12, 'best');
    if (best.length >= 3) rows.push({ id: 'best', title: 'Los mejor valorados de tu biblioteca', items: bestR.map((g) => G(g, 'Metacritic ' + g.info.metacritic, g.installed === false ? 'No instalado' : '')) });
    const fresh = list.filter((g) => g.installed !== false && !g.lastPlayed && !(g.playTime > 0));
    const freshR = rotate(fresh, 12, 'new');
    if (fresh.length) rows.push({ id: 'new', title: 'Para estrenar', items: freshR.map((g) => G(g, 'Sin jugar', '')) });
    return rows;
  }
  const homeOk = new Map(); // imagen ya cargada: al repintar no vuelve a verse el color de relleno
  // Resplandor del color de la portada alrededor de la ficha enfocada (tema Steam): promedio ponderado por saturación de la miniatura
  const dkCol = new Map();
  function dkGlow(el, g) {
    if (cfg.ui !== 'deck' || !el || !g) return;
    const src = g.coverSm || g.cover || g.bannerSm || g.banner; if (!src) return;
    const tint = (col) => { try { const sc = el.closest('.cc-h-scroll'); if (sc && el.classList.contains('sel')) sc.style.setProperty('--dk-tint', col); } catch {} };
    if (dkCol.has(src)) { el.style.setProperty('--glow', dkCol.get(src)); tint(dkCol.get(src)); return; }
    if (el._glowBusy) return; el._glowBusy = true;
    Promise.resolve(window.api.getThumb(src)).then((u) => new Promise((ok) => { if (!u || typeof u !== 'string') return ok(null); const im = new Image(); im.onload = () => { try { const c = document.createElement('canvas'); c.width = c.height = 24; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, 24, 24); ok(x.getImageData(0, 0, 24, 24).data); } catch { ok(null); } }; im.onerror = () => ok(null); im.src = u; })).then((d) => {
      el._glowBusy = false; if (!d) return; let r = 0, g2 = 0, b = 0, w = 0;
      for (let i = 0; i < d.length; i += 4) { const R = d[i], G = d[i + 1], B = d[i + 2], mx = Math.max(R, G, B), mn = Math.min(R, G, B), sat = mx ? (mx - mn) / mx : 0, wt = 0.15 + sat * sat * (mx / 255); r += R * wt; g2 += G * wt; b += B * wt; w += wt; }
      if (!w) return; r /= w; g2 /= w; b /= w; const m = Math.max(r, g2, b) || 1, k = Math.min(1.6, 215 / m); const col = `rgba(${Math.min(255, Math.round(r * k))},${Math.min(255, Math.round(g2 * k))},${Math.min(255, Math.round(b * k))},.55)`;
      dkCol.set(src, col); el.style.setProperty('--glow', col); tint(col);
    }).catch(() => { el._glowBusy = false; });
  }
  function homeImg(div, c) {
    const urls = c.img || [], k = urls.length ? c.title + '|' + urls[0] : '', known = k && homeOk.get(k);
    if (known) { div.style.background = `url("${known}") center / cover no-repeat`; return; }
    div.style.background = colorFor(c.title);
    (function next(i) { if (i >= urls.length) return; const im = new Image(); im.onload = () => { if (k) homeOk.set(k, urls[i]); div.style.background = `url("${urls[i]}") center / cover no-repeat`; }; im.onerror = () => next(i + 1); im.src = urls[i]; })(0);
  }
  // ---- Inicio estilo Xbox 360: mosaico de losetas (verdes de acceso y de arte de juego) ----
  function x3Pick(list, i, dir) { // loseta vecina en esa dirección (por posición en pantalla)
    const a = list[i].el, acx = a.offsetLeft + a.offsetWidth / 2, acy = a.offsetTop + a.offsetHeight / 2; let best = -1, bs = 1e9;
    list.forEach((t, j) => {
      if (j === i) return; const e = t.el, dx = e.offsetLeft + e.offsetWidth / 2 - acx, dy = e.offsetTop + e.offsetHeight / 2 - acy;
      const ok = dir === 'right' ? dx > 4 : dir === 'left' ? dx < -4 : dir === 'down' ? dy > 4 : dy < -4; if (!ok) return;
      const sc = dir === 'left' || dir === 'right' ? Math.abs(dx) + 2.5 * Math.abs(dy) : Math.abs(dy) + 2.5 * Math.abs(dx); if (sc < bs) { bs = sc; best = j; }
    });
    return best;
  }
  function paintHomeX3(keep) {
    const h = $c('.cc-home'); if (!h) return;
    const prevKey = keep && HM.x3 && HM.x3[HM.x3i] ? HM.x3[HM.x3i].key : null;
    HM.rows = homeRows(); h.replaceChildren();
    const sc = el2('div', 'x3-home'); h.append(sc);
    const order = ['now', 'cont', 'free', 'top', 'near', 'ev', 'fav', 'wish', 'old', 'best', 'new'], seen = new Set(), cand = [];
    const per = []; // reparto por turnos: una de cada fila, luego la segunda de cada una… para que el mosaico sea variado
    HM.rows.forEach((row, ri) => per.push({ row, ri, pri: order.includes(row.id) ? order.indexOf(row.id) : 99 }));
    per.sort((x, y) => x.pri - y.pri);
    for (let round = 0; round < 6; round++) per.forEach(({ row, ri }) => { const off = row.id === 'cont' || row.id === 'now' ? 0 : (HM.rot || 0), c = row.items.length > round ? row.items[(round + off) % row.items.length] : null; if (!c) return; const key = c.g ? c.g.id : (c.url || c.title); if (seen.has(key)) return; seen.add(key); cand.push({ c, ri, ci: (round + off) % row.items.length, key, rid: row.id }); });
    const T = []; let k = 0; const nx = () => cand[k++];
    const art = (e, col, row, cs, rs) => { if (e) T.push({ art: e, key: e.key, col, row, cs: cs || 1, rs: rs || 1 }); };
    const CAT = { now: 'Jugando ahora', cont: 'Continuar', top: 'Más jugado', fav: 'Favorito', near: 'Casi completado', old: 'Vuelve a jugar', best: 'Mejor valorado', new: 'Para estrenar', free: 'Gratis', ev: 'Evento', wish: 'Oferta' };
    const fn = (tab, label, col, row) => { if (S.tabs.some((t) => t.id === tab)) T.push({ tab, key: 'tab:' + tab, label, col, row, cs: 1, rs: 1 }); };
    // distribución como el panel de la consola: columna estrecha | tarjeta destacada 2×2 + dos anchas | columna estrecha; cada «página» sigue el mismo patrón
    const nxImg = () => { const j = cand.findIndex((e, i) => i >= k && e.c.img && e.c.img.length); if (j < 0) return nx(); const [e] = cand.splice(j, 1); cand.splice(k, 0, e); return cand[k++]; };
    const fns = [['all', 'Biblioteca'], ['recent', 'Recientes'], ['fav', 'Favoritos'], ['search', 'Buscar'], ['settings', 'Ajustes']].filter(([id]) => S.tabs.some((t) => t.id === id)); let fi = 0;
    const fput = (c, r) => { if (fi < fns.length) { fn(fns[fi][0], fns[fi][1], c, r); fi++; } else art(nx(), c, r); };
    let pages = 0;
    for (let p = 0; p < 2; p++) {
      if (p >= 1 && k >= cand.length) break;
      const o = p * 4; pages++;
      if (p === 0) { art(nx(), o + 1, 1); fput(o + 1, 2); fput(o + 1, 3); }
      else { fput(o + 1, 1); fput(o + 1, 2); fput(o + 1, 3); }
      art(nxImg(), o + 2, 1, 2, 2); art(nx(), o + 2, 3); art(nx(), o + 3, 3);
      if (p === 0) { art(nx(), o + 4, 1); art(nx(), o + 4, 2); art(nx(), o + 4, 3); }
    }
    const NAR = 'calc(var(--r) * 1.3)', WID = 'calc(var(--r) * 1.73)';
    sc.style.gridTemplateColumns = [NAR, WID, WID, NAR, ...(pages > 1 ? [NAR, WID, WID] : [])].join(' ');
    if (!T.length) { sc.append(el2('div', 'cc-empty', HM.loading ? 'Cargando novedades…' : 'Aún no hay nada que mostrar.')); HM.x3 = []; return; }
    T.forEach((t, i) => {
      const d = el2('div', 'x3t ' + (t.tab ? 'fn' : 'art') + (t.cs > 1 ? ' big' : '')); d.style.gridColumn = `${t.col} / span ${t.cs}`; d.style.gridRow = `${t.row} / span ${t.rs}`;
      if (t.tab) { const ic = el2('div', 'x3t-ic'); ic.innerHTML = tabIcon(t.tab); d.append(ic, el2('div', 'x3t-lab', t.label)); }
      else {
        const c = t.art.c; const im = el2('div', 'x3t-img'); homeImg(im, c); d.append(im);
        const lab = el2('div', 'x3t-lab', c.kind === 'game' && i === 0 ? 'Jugar ' + c.title : c.title); d.append(lab);
        const cat = c.badge && /GRATIS|−|EN CURSO|PRÓXIMO/.test(c.badge) ? c.badge : (CAT[t.art.rid] || ''); if (cat) d.append(el2('span', 'x3t-badge', cat));
        if (c.kind === 'game') d.dataset.gid = c.g.id;
      }
      d.style.setProperty('--i', i);
      d.onmouseenter = () => { if (padActive()) return; if (HM.x3i !== i) { HM.x3i = i; x3HomeMark(false); } };
      d.onclick = () => { HM.x3i = i; x3HomeMark(false); homeAccept(); };
      t.el = d; sc.append(d);
    });
    HM.x3 = T; const pi = prevKey ? T.findIndex((t) => t.key === prevKey) : -1; HM.x3i = pi >= 0 ? pi : Math.min(HM.x3i || 0, T.length - 1);
    x3HomeMark(true);
  }
  function x3HomeMark(instant) {
    const T = HM.x3 || []; if (!T.length) return; T.forEach((t) => t.el.classList.remove('sel')); const t = T[HM.x3i]; if (!t) return; t.el.classList.add('sel');
    const sc = t.el.parentNode, l = t.el.offsetLeft, r = l + t.el.offsetWidth, vw = sc.clientWidth, beh = instant ? 'instant' : 'smooth';
    if (l < sc.scrollLeft + 8) sc.scrollTo({ left: Math.max(0, l - 24), behavior: beh }); else if (r > sc.scrollLeft + vw - 90) sc.scrollTo({ left: r - vw + 140, behavior: beh });
    if (t.art) { HM.r = t.art.ri; HM.c[t.art.ri] = t.art.ci; }
  }
  function x3HomeNav(dir) {
    const T = HM.x3 || []; if (!T.length) return;
    const j = x3Pick(T, HM.x3i, dir);
    if (j < 0) return;
    SND.move(); HM.x3i = j; x3HomeMark(false);
  }
  function deckHomeRows(rows) { // Big Picture: fila de juegos · pestañas Novedades/Amigos/Recomendados · contenido de la pestaña
    const fg = rows.findIndex((r) => r.items.some((c) => c.kind === 'game')); if (fg < 0) return rows;
    const first = rows[fg]; if (!first.items.some((c) => c.kind === 'more')) first.items.push({ kind: 'more', title: 'Ver más en la biblioteca', sub: '' });
    const rest = rows.filter((_, i) => i !== fg), tab = HM.tab || 0;
    const pills = { id: 'dkpills', title: '', items: ['Novedades', 'Amigos', 'Recomendados'].map((t) => ({ kind: 'pill', title: t })) };
    let body;
    if (tab === 0) body = rest.filter((r) => r.items.every((c) => c.kind !== 'game'));
    else if (tab === 1) body = [...dkFriendRows(), { id: 'dkact', title: 'Tu actividad reciente', items: first.items.filter((c) => c.kind === 'game') }];
    else body = [...rest.filter((r) => r.items.some((c) => c.kind === 'game')), { id: 'dkdisc', title: 'Explora tu lista de descubrimientos', items: [{ kind: 'more', title: 'Ver más en la biblioteca', sub: '' }] }];
    return [first, pills, ...body];
  }
  function paintHome(keep) {
    if (cfg.ui === 'x360') return paintHomeX3(keep);
    const h = $c('.cc-home'); if (!h) return;
    const prevId = keep && homeCard() ? (homeCard().g ? homeCard().g.id : homeCard().url || homeCard().title) : null, prevR = HM.rows[HM.r] && HM.rows[HM.r].id;
    HM.rows = homeRows(); h.replaceChildren();
    if (cfg.ui === 'deck') HM.rows = deckHomeRows(HM.rows);
    const sc = el2('div', 'cc-h-scroll' + (HM.tabAnim ? ' dk-rowin' : '')); h.append(sc); HM.tabAnim = false;
    if (cfg.ui === 'deck') sc.addEventListener('scroll', () => { const r = sc.querySelector('.dk-hpills'); const on = !!r && r.getBoundingClientRect().top <= sc.getBoundingClientRect().top + 3; sc.classList.toggle('dk-eng', on); box.classList.toggle('dk-engb', on); if (on) { const bh = r.getBoundingClientRect().bottom; sc.querySelectorAll('.cc-h-title').forEach((t) => { const rr = t.getBoundingClientRect(); t.classList.toggle('dk-tbh', rr.top < bh - 2); }); } else sc.querySelectorAll('.dk-tbh').forEach((t) => t.classList.remove('dk-tbh')); if (on) { const h = Math.round(r.getBoundingClientRect().bottom); if (h > 40 && box._bh !== h) { box._bh = h; box.style.setProperty('--dk-bandh', h + 'px'); } } }, { passive: true });
    if (!HM.rows.length) sc.append(el2('div', 'cc-empty', HM.loading ? 'Cargando novedades…' : HM.failed ? 'No se pudieron cargar las novedades. Revisa tu conexión.' : 'Aún no hay novedades que mostrar.'));
    const firstGame = cfg.ui === 'deck' ? HM.rows.findIndex((r) => r.items.some((c) => c.kind === 'game')) : -1;
    HM.rows.forEach((row, ri) => {
      if (cfg.ui === 'deck' && row.id === 'dkpills') { const pr = el2('div', 'cc-h-row dk-hpills'), ps = el2('div', 'cc-h-strip'); row.items.forEach((c, ci) => { const b = el2('div', 'cc-hc dk-hp' + (ci === (HM.tab || 0) ? ' on' : ''), c.title); if (ci === 1 && HM.fr && HM.fr.ok) { const n = (HM.fr.friends || []).filter((f) => f.state > 0 || f.game).length; if (n > 0) { const bd = el2('span', 'dk-fcnt'); bd.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="8" r="3.4"/><path d="M2.5 19c0-3.6 2.9-5.6 6.5-5.6s6.5 2 6.5 5.6z"/><circle cx="17" cy="9" r="2.7"/><path d="M16.4 13.6c3 0 5.1 1.7 5.1 4.8h-4.2c0-2-.4-3.3-.9-4.8z"/></svg>' + n; b.append(bd); } } b.onclick = () => { HM.r = ri; HM.c[ri] = ci; if (ci !== (HM.tab || 0)) { SND.tab(); HM.tab = ci; if (ci === 1) loadFriends(false); HM.tabAnim = true; paintHome(true); } }; ps.append(b); }); pr.append(el2('i', 'dk-bl'), el2('i', 'dk-bl'), el2('i', 'dk-bl'), el2('i', 'dk-bl t'), ps); sc.append(pr); return; }
      const dk = cfg.ui === 'deck', gameRow = dk && row.items.some((c) => c.kind === 'game');
      const r = el2('div', 'cc-h-row dk-r-' + row.id + (dk ? (gameRow ? ' dk-games' : ' dk-news') : '')); // Big Picture: juegos como portadas; novedades y ofertas como tarjetas con fecha y pie gris
      if (dk && !gameRow) r.append(el2('h2', 'cc-h-title dk-nt', row.title)); else r.append(el2('h2', 'cc-h-title', dk && row.id === 'cont' ? 'Jugados recientemente' : row.title));
      const strip = el2('div', 'cc-h-strip');
      row.items.forEach((c, ci) => {
        if (c.kind === 'more') { const m = el2('div', 'cc-hc dk-cov dk-more'); m.append(el2('div', 'dk-more-t', c.title)); m.onclick = () => { HM.r = ri; HM.c[ri] = ci; homeMark(); homeAccept(); }; strip.append(m); return; }
        const frd = dk && c.kind === 'friend', cov = dk && c.kind === 'game', nws = dk && !cov && !frd, hero = cov && ri === firstGame && ci === 0 && !!(c.g.bannerSm || c.g.banner);
        const d = el2('div', 'cc-hc' + (c.done ? ' done' : '') + (c.now ? ' now' : '') + (cov ? ' dk-cov' : '') + (hero ? ' dk-hero' : '') + (nws ? ' dk-new' : '') + (frd ? ' dk-fr' + (c.f && c.f.game ? ' play' : c.f && c.f.state > 0 ? ' on' : '') : '')), im = el2('div', 'cc-hc-img'); homeImg(im, cov ? { ...c, img: (hero ? [c.g.bannerSm, c.g.banner, c.g.bannerFallback, c.g.coverSm, c.g.cover] : [c.g.coverSm, c.g.cover, c.g.coverFallback, c.g.bannerSm, c.g.banner, c.g.bannerFallback]).filter(Boolean).map(imgUrl) } : c); if (c.kind === 'game') { d.dataset.gid = c.g.id; if (INST.prog[c.g.id]) setTimeout(() => instMark(d, c.g.id), 0); }
        if (c.kind === 'event') { im.classList.add('ev', 'ev-' + (c.store || 'all')); im.style.background = ''; const ic = el2('span', 'cc-hc-evic'); try { ic.append(sourceIcon(c.store === 'steam' ? 'steam' : c.store === 'epic' ? 'epic' : 'local', 64)); } catch {} im.append(ic); }
        if (c.kind === 'game' && cfg.ui !== 'x360') { const lg = c.g.logoSm || c.g.logo; if (lg && !c.g.logoOff) { const li = new Image(); li.className = 'cc-hc-logo'; li.alt = ''; li.draggable = false; li.onload = () => im.classList.add('has-logo'); li.onerror = () => li.remove(); li.src = imgUrl(lg); im.append(li); } }
        if (cov && HM.fr && HM.fr.ok && c.g.appid) { const nf = (HM.fr.friends || []).filter((f) => f.appid && f.appid === Number(c.g.appid)).length; if (nf > 0) im.append(el2('span', 'dk-frb', String(nf))); } // amigos jugando a este juego ahora
        if (c.badge) im.append(el2('span', 'cc-hc-badge' + (/GRATIS|−/.test(c.badge) ? ' hot' : ''), c.badge));
        if (c.tag) im.append(el2('span', 'cc-hc-tag', c.tag));
        const b = el2('div', 'cc-hc-body'); b.append(el2('div', 'cc-hc-name', c.title), el2('div', 'cc-hc-sub', c.sub || ''));
        if (nws && c.kind !== 'more' && c.kind !== 'info') { const pv = el2('div', 'dk-prev'); pv.append(el2('span', 'dk-pv-k', (c.tag || c.badge || 'Noticias').toUpperCase()), el2('p', 'dk-pv-t', c.sub || c.title)); im.append(pv); }
        if (nws) { const when = [c.badge, c.tag].filter(Boolean).join(' · '); d.append(el2('div', 'dk-when', when || ' '), im, b); } else d.append(im, b);
        d.onclick = () => { HM.r = ri; HM.c[ri] = ci; homeMark(); homeAccept(); };
        if (cfg.ui === 'deck') dkHov(d);
        strip.append(d);
      });
      r.style.setProperty('--i', ri); r.append(strip); sc.append(r);
    });
    if (HM.loading && HM.rows.length) sc.append(el2('div', 'cc-h-load', 'Buscando novedades…'));
    let ri = prevR ? HM.rows.findIndex((x) => x.id === prevR) : -1; HM.r = ri >= 0 ? ri : Math.min(HM.r, Math.max(0, HM.rows.length - 1));
    if (prevId) { const ci = HM.rows[HM.r] ? HM.rows[HM.r].items.findIndex((c) => (c.g ? c.g.id : c.url || c.title) === prevId) : -1; if (ci >= 0) HM.c[HM.r] = ci; }
    homeMark(true);
  }
  function dkGlide(el, to, instant) { // desplazamiento en «cinta»: la fila se desliza con frenado suave (≈ 0,38 s)
    if (el._gl) cancelAnimationFrame(el._gl);
    if (instant) { el.scrollLeft = to; return; }
    const from = el.scrollLeft, d = to - from; if (Math.abs(d) < 2) return; const t0 = performance.now(), T = 430;
    const step = (t) => { const k = Math.min(1, (t - t0) / T), e = 1 - Math.pow(1 - k, 4); el.scrollLeft = from + d * e; if (k < 1) el._gl = requestAnimationFrame(step); else el._gl = 0; };
    el._gl = requestAnimationFrame(step);
  }
  function homeMark(instant, hov) {
    if (cfg.ui === 'x360') return x3HomeMark(instant);
    const h = $c('.cc-home'), rows = h.querySelectorAll('.cc-h-row'); h.querySelectorAll('.cc-hc.sel').forEach((e) => e.classList.remove('sel'));
    const row = rows[HM.r]; if (!row) { setBg(null); return; }
    const c = Math.max(0, Math.min((HM.rows[HM.r].items.length || 1) - 1, HM.c[HM.r] || 0)); HM.c[HM.r] = c;
    const card = row.querySelectorAll('.cc-hc')[c]; if (!card) return; card.classList.add('sel'); { const _it = HM.rows[HM.r].items[c]; if (cfg.ui === 'deck' && _it && _it.g) dkGlow(card, _it.g); }
    const strip = row.querySelector('.cc-h-strip'), sc = h.querySelector('.cc-h-scroll'), beh = instant ? 'instant' : 'smooth';
    if (cfg.ui === 'deck') { const pi = HM.rows.findIndex((x) => x.id === 'dkpills'); sc.classList.toggle('dk-stuck', pi >= 0 && HM.r > pi); }
    if (hov) { /* ratón: solo se enfoca la tarjeta, la cinta no se mueve */ } else if (cfg.ui === 'deck') dkGlide(strip, Math.max(0, card.offsetLeft - strip.clientWidth * 0.36 - (card.offsetWidth ? 0 : 0)), instant); else strip.scrollTo({ left: Math.max(0, card.offsetLeft - (strip.clientWidth - card.offsetWidth) / 2), behavior: beh });
    if (!hov) {
      let off = sc.clientHeight * 0.12, extra = 0;
      if (cfg.ui === 'deck') { // con la banda de pestañas fija arriba, el título de la fila enfocada queda justo debajo de ella (sin taparlo)
        const pr = sc.querySelector('.dk-hpills'), pi = HM.rows.findIndex((x) => x.id === 'dkpills');
        if (row.classList.contains('dk-hpills')) extra = sc.clientHeight * 0.12 + 4;
        else if (pr && pi >= 0 && HM.r > pi) off = pr.offsetHeight + sc.clientHeight * 0.012;
      }
      sc.scrollTo({ top: Math.max(0, row.offsetTop - sc.offsetTop - off) + extra, behavior: beh });
    }
    const it = HM.rows[HM.r].items[c]; if (cfg.ui === 'deck') { const its = HM.rows[HM.r].items; for (const d of [1, -1, 2, -2, 3]) { const o = its[c + d]; if (o && o.g) preBg(o.g); } } if (cfg.ui === 'deck' && !it.g) { setBg(null); return; } setBg(it.g || (it.img && it.img[0] ? { id: 'home:' + it.title, banner: it.img[0] } : null));
  }
  function homeNav(dir) {
    if (cfg.ui === 'x360') return x3HomeNav(dir);
    if (!HM.rows.length) return;
    const cr = HM.rows[HM.r];
    if (cfg.ui === 'deck' && cr && cr.id === 'dkpills' && (dir === 'left' || dir === 'right')) { const n = Math.max(0, Math.min(2, (HM.tab || 0) + (dir === 'right' ? 1 : -1))); if (n === (HM.tab || 0)) return; SND.tab(); HM.tab = n; if (n === 1) loadFriends(false); HM.c[HM.r] = n; HM.tabAnim = true; paintHome(true); return; }
    if (dir === 'up' || dir === 'down') { const r = Math.max(0, Math.min(HM.rows.length - 1, HM.r + (dir === 'down' ? 1 : -1))); if (r === HM.r) return; SND.movev(); HM.r = r; if (HM.rows[r].id === 'dkpills') HM.c[r] = HM.tab || 0; }
    else { const n = HM.rows[HM.r].items.length, c = Math.max(0, Math.min(n - 1, (HM.c[HM.r] || 0) + (dir === 'right' ? 1 : -1))); if (c === (HM.c[HM.r] || 0)) return; SND.move(); HM.c[HM.r] = c; }
    homeMark(false);
  }
  function homeAccept() {
    if (cfg.ui === 'x360') { const t = (HM.x3 || [])[HM.x3i]; if (!t) return; if (t.tab) { const ti = S.tabs.findIndex((x) => x.id === t.tab); if (ti >= 0) gotoTab(ti); return; } HM.r = t.art.ri; HM.c[t.art.ri] = t.art.ci; }
    const xt = cfg.ui === 'x360' && HM.x3 ? HM.x3[HM.x3i] : null, c = xt && xt.art ? xt.art.c : homeCard(); if (!c) return;
    if (c.kind === 'pill') return;
    if (c.kind === 'info') { SND.open(); toast(c.title); return; }
    if (c.kind === 'more') { SND.open(); deckGo('all'); return; } // en Xbox 360 se abre exactamente la tarjeta marcada
    if (c.kind === 'game') return openDetail(c.g.id);
    if (c.kind === 'friend') { SND.open(); if (c.f) dkFriendProfile(c.f); else if (c.url && window.api.friendsOpen) { window.api.friendsOpen(c.url); toast('Abriendo el perfil…'); } return; }
    SND.open();
    if (!c.url) { toast('Este evento no tiene página propia'); return; }
    if (c.kind === 'event') { if (window.api.eventsOpen) window.api.eventsOpen(c.url); } else if (window.api.freeOpen) window.api.freeOpen(c.url, c.app);
    toast('Abriendo en la tienda…');
  }

  // ---------- Buscar: teclado en pantalla y resultados ----------
  const SR = { q: '', zone: 'kb', kr: 0, kc: 0, ri: 0, store: 'all', res: [] };
  const KB = ['ABCDEFGHIJ', 'KLMNOPQRST', 'UVWXYZÑ012', '3456789␣⌫✕'].map((r) => [...r]);
  const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const srStores = () => [...new Set(state.games.filter(playable).map((g) => g.source))];
  function srFind() {
    const toks = norm(SR.q).split(/\s+/).filter(Boolean);
    let l = state.games.filter(playable); if (SR.store !== 'all') l = l.filter((g) => g.source === SR.store);
    if (!toks.length) return [];
    l = l.filter((g) => { const n = norm(g.name); return toks.every((t) => n.includes(t)); });
    const q0 = norm(SR.q).trim();
    return l.sort((a, b) => (norm(b.name).startsWith(q0) - norm(a.name).startsWith(q0)) || byName(a, b)).slice(0, 80);
  }
  function paintSearch() {
    sbSync();
    const h = $c('.cc-search'); if (!h) return;
    SR.res = srFind(); SR.ri = Math.min(SR.ri, Math.max(0, SR.res.length - 1)); if (SR.zone === 'res' && !SR.res.length) SR.zone = 'kb';
    h.replaceChildren();
    const left = el2('div', 'cc-sr-left'), q = el2('div', 'cc-sr-q'); q.append(el2('span', 'cc-sr-text', SR.q), el2('span', 'cc-sr-caret'));
    if (!SR.q) q.classList.add('empty'); q.dataset.ph = cfg.ui === 'deck' ? 'Buscar juegos o perfiles...' : 'Escribe un juego…';
    const kb = el2('div', 'cc-sr-kb');
    KB.forEach((row, r) => row.forEach((k, c) => { const b = el2('button', 'cc-sr-key' + (k === '␣' || k === '⌫' || k === '✕' ? ' sp' : ''), k === '␣' ? 'Espacio' : k === '✕' ? 'Limpiar' : k); b.tabIndex = -1; b.dataset.r = r; b.dataset.c = c; b.onclick = () => { SR.zone = 'kb'; SR.kr = r; SR.kc = c; searchMark(); searchAccept(); }; kb.append(b); }));
    const st = el2('div', 'cc-sr-store', 'Tienda: ' + (SR.store === 'all' ? 'todas' : srcDef(SR.store).name));
    left.append(q, kb, st);
    const right = el2('div', 'cc-sr-right'), head = el2('div', 'cc-sr-head', SR.q.trim() ? (SR.res.length ? `${SR.res.length} resultado${SR.res.length === 1 ? '' : 's'}` : 'Sin resultados') : 'Escribe para buscar entre tus juegos');
    if (cfg.ui === 'deck') { // Big Picture: filtros arriba (Todos + una por tienda) con su cantidad
      head.className = 'cc-sr-head dk-sp-row'; head.textContent = '';
      const toks = norm(SR.q).split(/\s+/).filter(Boolean), base = state.games.filter(playable).filter((g) => toks.every((t) => norm(g.name).includes(t)));
      [['all', 'Todos', base.length], ...srStores().map((s) => [s, srcDef(s).name, base.filter((g) => g.source === s).length])].forEach(([id, lab, n]) => { const b = el2('button', 'dk-sp-p' + (SR.store === id ? ' on' : '')); b.tabIndex = -1; b.append(document.createTextNode(lab), el2('sup', '', String(n))); b.onclick = () => { SR.store = id; SR.ri = 0; SND.change(); paintSearch(); }; head.append(b); });
    }
    const grid = el2('div', 'cc-sr-grid');
    SR.res.forEach((g, i) => { const t = el2('div', 'cc-sr-t'), cv = el2('div', 'cc-sr-cv'); loadCover(cv, g); if (g.installed === false) t.classList.add('ni'); t.append(cv, el2('div', 'cc-sr-n', g.name)); t.onclick = () => { SR.zone = 'res'; SR.ri = i; searchMark(); searchAccept(); }; grid.append(t); });
    right.append(head, grid);
    if (cfg.ui === 'deck') { // sin texto no se muestra nada (Inicio sigue a la vista, si se venía de él); con texto, la página de resultados
      const empty = !SR.q.trim(), keep = empty && !!S.dkSrHome, hm = $c('.cc-home');
      h.classList.toggle('dk-srempty', empty); hm.classList.toggle('hidden', !keep); box.classList.toggle('dk-home', keep);
      h.append(left); if (!empty) h.append(right); searchMark(true); return;
    }
    h.append(left, right); searchMark(true);
  }
  function dkSrClose(cb, fast) { // Big Picture: Esc cierra la búsqueda de golpe, con un fundido, y vuelve a Inicio
    const se = $c('.cc-search'); if (!se || S.dkSrC) return; S.dkSrC = true; SND.back(); se.classList.remove('dk-sropen'); se.classList.add('dk-srclosing'); { const hm = $c('.cc-home'); hm.classList.remove('hidden'); box.classList.add('dk-home'); S.dkNoIn = true; }
    setTimeout(() => { S.dkSrC = false; SR.q = ''; SR.store = 'all'; SR.zone = 'kb'; se.classList.remove('dk-srclosing'); deckGo('home'); if (cb) cb(); }, fast ? 0 : 230);
  }
  function searchMark(instant) {
    const h = $c('.cc-search'); if (!h) return;
    h.querySelectorAll('.sel').forEach((e) => e.classList.remove('sel')); h.classList.toggle('zone-res', SR.zone === 'res');
    const key = h.querySelector(`.cc-sr-key[data-r="${SR.kr}"][data-c="${SR.kc}"]`); if (key && SR.zone === 'kb') key.classList.add('sel');
    const t = h.querySelectorAll('.cc-sr-t')[SR.ri]; if (t && SR.zone === 'res') { t.classList.add('sel'); const gr = h.querySelector('.cc-sr-grid'); gr.scrollTo({ top: Math.max(0, t.offsetTop - gr.clientHeight / 2 + t.offsetHeight / 2), behavior: instant ? 'instant' : 'smooth' }); }
    if (cfg.ui === 'deck' && !SR.q.trim() && S.dkSrHome) return;
    const g = SR.zone === 'res' ? SR.res[SR.ri] : SR.res[0]; setBg(g || null);
  }
  function srCols() { const k = [...$c('.cc-search').querySelectorAll('.cc-sr-t')]; if (!k.length) return 1; const n = k.findIndex((t) => t.offsetTop > k[0].offsetTop + 4); return n < 0 ? k.length : n; }
  function searchType(ch) { SR.q = (SR.q + ch).slice(0, 40); SR.ri = 0; SND.move(); paintSearch(); }
  function searchBack() { if (!SR.q) return; SR.q = SR.q.slice(0, -1); SR.ri = 0; SND.back(); paintSearch(); }
  function searchStore() { const l = ['all', ...srStores()]; SR.store = l[(l.indexOf(SR.store) + 1) % l.length]; SR.ri = 0; SND.change(); paintSearch(); }
  function searchBtn(i) { // X (2) y Y (3) del mando
    if (SR.zone === 'res') { if (i === 2) play(SR.res[SR.ri]); else searchStore(); return; }
    if (i === 2) searchBack(); else searchType(' ');
  }
  function searchNav(dir) {
    if (cfg.ui === 'deck' && hintMode !== 'pad' && SR.zone === 'kb') { if ((dir === 'down' || dir === 'right') && SR.res.length) { SR.zone = 'res'; SR.ri = 0; SND.open(); searchMark(); hints(); } return; } // sin teclado en pantalla: abajo/derecha pasan a los resultados
    if (SR.zone === 'kb') {
      if (dir === 'up') SR.kr = Math.max(0, SR.kr - 1); else if (dir === 'down') { if (SR.kr >= KB.length - 1) { if (SR.res.length) { SR.zone = 'res'; SR.ri = 0; SND.open(); searchMark(); hints(); } return; } SR.kr++; }
      else if (dir === 'left') SR.kc = Math.max(0, SR.kc - 1);
      else if (SR.kc >= KB[0].length - 1) { if (SR.res.length) { SR.zone = 'res'; SND.open(); searchMark(); hints(); } return; } else SR.kc++;
      SND.move(); searchMark(); return;
    }
    const n = SR.res.length, cols = srCols();
    if (dir === 'left') { if (SR.ri % cols === 0) { SR.zone = 'kb'; SND.back(); searchMark(); hints(); return; } SR.ri--; }
    else if (dir === 'right') SR.ri = Math.min(n - 1, SR.ri + 1);
    else if (dir === 'down') SR.ri = Math.min(n - 1, SR.ri + cols); else { if (SR.ri < cols) { SR.zone = 'kb'; SND.back(); searchMark(); hints(); return; } SR.ri -= cols; }
    SND.move(); searchMark();
  }
  function searchAccept() {
    if (SR.zone === 'res') { const g = SR.res[SR.ri]; if (g) openDetail(g.id); return; }
    const k = KB[SR.kr][SR.kc]; if (k === '␣') searchType(' '); else if (k === '⌫') searchBack(); else if (k === '✕') { SR.q = ''; SR.ri = 0; SND.back(); paintSearch(); } else searchType(k.toLowerCase());
  }

  // ---------- Acciones ----------
  // Cambio de sección estilo Xbox 360: las dos secciones se mueven a la vez, como una sola cinta.
  // La que sale se pinta en una copia del contenedor con las clases de ANTES, así no cambia de estilo a mitad del movimiento.
  function x3Warm(id) { // prepara (decodifica) las primeras portadas de la sección de destino para que entren ya pintadas
    try {
      if (!id || id === 'home' || id === 'search' || id === 'settings' || id === 'ach') return Promise.resolve();
      const jobs = [];
      for (const it of tabItems(id).slice(0, 16)) {
        const g = it.type === 'game' ? it.g : it.games && it.games[0]; if (!g || !(g.coverSm || g.cover)) continue;
        let im = decImg.get(g.id);
        if (!im) { im = new Image(); im.src = imgUrl(coverOk.get(g.id) || g.coverSm || g.cover); decImg.set(g.id, im); }
        jobs.push(im.decode ? im.decode().catch(() => {}) : Promise.resolve());
      }
      return Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, 220))]);
    } catch { return Promise.resolve(); }
  }
  function stepTab(d) { // Big Picture: con las pestañas de la biblioteca a la vista, Q/E (LB/RB) solo pasan entre ellas
    if (cfg.ui === 'deck' && S.tabs[S.tab] && DK_LIB.includes(S.tabs[S.tab].id)) {
      let i = S.tab; for (let n = 0; n < S.tabs.length; n++) { i = (i + d + S.tabs.length) % S.tabs.length; if (DK_LIB.includes(S.tabs[i].id)) return gotoTab(i); }
      return;
    }
    if (cfg.ui === 'deck') { // fuera de la biblioteca (Inicio, Logros, Ajustes): sin dar la vuelta, y Ajustes solo se abre con el globo / su botón
      const cur = S.tabs[S.tab] && S.tabs[S.tab].id;
      for (let i = S.tab + d; i >= 0 && i < S.tabs.length; i += d) { const id = S.tabs[i].id; if (id === 'search' || (id === 'settings' && cur !== 'settings')) continue; if (id === 'settings') return; return gotoTab(i); }
      return;
    }
    gotoTab(S.tab + d);
  }
  function gotoTab(i) {
    if (cfg.ui !== 'x360' || S.menu || !active || S.view !== 'list') return gotoTabNow(i);
    const n = S.tabs.length;
    if (S._swTo != null) { S._swTo += i - S.tab; return; } // pulsaciones seguidas: se suman y se va directo a la sección final
    if (((i % n) + n) % n === S.tab && !S.sub) return;
    S._swTo = i;
    setTimeout(() => { // si aún se está moviendo la cinta, se espera a que termine (sin apilar copias)
      const to0 = S._swTo; if (to0 == null) return;
      x3Warm(S.tabs[(((to0 % n) + n) % n)].id).then(() => {
        const to = S._swTo; S._swTo = null; if (!active) return;
        document.querySelectorAll('.x3-gh-host').forEach((e) => e.remove());
        S._swBusy = Date.now() + 360; gotoTabGhost(to);
      });
    }, Math.max(0, (S._swBusy || 0) - Date.now()));
  }
  function gotoTabGhost(i) {
    const n = S.tabs.length, ni = (i + n) % n; if (ni === S.tab && !S.sub) return;
    rumble('tick');
    let gh = null;
    try {
      const old = [...box.querySelectorAll(':scope > .cc-home, :scope > .cc-listwrap, :scope > .cc-search')].find((e) => e.offsetParent !== null && !e.classList.contains('hidden'));
      if (old) {
        const r = old.getBoundingClientRect(), b = box.getBoundingClientRect(), host = box.cloneNode(false), c = old.cloneNode(true);
        host.removeAttribute('tabindex'); host.classList.add('x3-gh-host'); host.dataset.dir = i >= S.tab ? 'r' : 'l';
        host.style.cssText += ';position:fixed;inset:0;z-index:31;background:none;pointer-events:none;overflow:visible;display:block;';
        c.classList.remove('in'); c.classList.add('x3-gh');
        c.style.cssText += `;position:absolute !important;left:${r.left - b.left}px;top:${r.top - b.top}px;width:${r.width}px;height:${r.height}px;margin:0;`;
        host.append(c); gh = host;
      }
    } catch {}
    box.classList.add('x3-sw'); clearTimeout(box._swT); box._swT = setTimeout(() => box.classList.remove('x3-sw'), 1900);
    gotoTabNow(i);
    if (gh) { box.parentNode.insertBefore(gh, box.nextSibling); setTimeout(() => gh.remove(), 420); }
  }
  function gotoTabNow(i) {
    if (S.menu) return;
    S._wasHome = isHome() && S.view === 'list';
    if (i === S.tab && S.view === 'list' && !S.sub) return;
    if (!isSettings() && S.tabs[(i + S.tabs.length) % S.tabs.length].id === 'settings') S.prev = { id: S.tabs[S.tab].id, sub: S.sub ? S.sub.title : null, focus: S.focusId }; // para volver al mismo punto
    S.achPane = false; $c('.cc-achpane').classList.remove('focus'); achFor = null;
    box.dataset.dir = i >= S.tab ? 'r' : 'l';
    SND.tab(); S.tab = (i + S.tabs.length) % S.tabs.length; S.sub = null; S.view = 'list';
    const id = S.tabs[S.tab].id; S.items = tabItems(id === 'settings' ? 'all' : id); S.idx = id === 'settings' ? S.idx : 0;
    if (id === 'settings') { S.col = 'cat'; }
    if (cfg.ui === 'deck' && id === 'search') { S.dkSrHome = !!S._wasHome; SR.q = ''; SR.store = 'all'; SR.ri = 0; } // Inicio se queda a la vista (sin parpadeo) mientras la barra está vacía
    paintTabs(); showView(); hints();
    paintList(id === 'settings' ? S.focusId : undefined); if (id === 'settings') paintSettings(); else if (id === 'home') { if (!S.dkNoIn) { loadHome(false); paintHome(true); animIn($c('.cc-home')); } S.dkNoIn = false; } else if (id === 'search') { SR.zone = 'kb'; if (cfg.ui === 'deck') { SR.q = ''; SR.store = 'all'; SR.ri = 0; const se = $c('.cc-search'); se.classList.remove('dk-srclosing'); se.classList.toggle('dk-srhov', !!S.dkSrHov); S.dkSrHome = !!S._wasHome; S.dkSrHov = false; se.classList.add('dk-sropen'); clearTimeout(S.dkSrT); S.dkSrT = setTimeout(() => se.classList.remove('dk-sropen'), 900); } paintSearch(); if (!(cfg.ui === 'deck' && S.dkSrHome)) animIn($c('.cc-search')); } else animIn($c('.cc-listwrap'));
  }

  function animIn(el) { el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); clearTimeout(el._inT); el._inT = setTimeout(() => el.classList.remove('in'), 1600); } // se quita al acabar: si luego se repinta (p. ej. al volver de un juego) no se repite la animación
  function showView() {
    try { updNowCard(); } catch {}
    const isSet = isSettings(), isDet = S.view === 'detail', isHm = isHome(), isSr = isSearch();
    $c('.cc-hero').classList.toggle('hidden', isDet || isHm || isSr); $c('.cc-listwrap').classList.toggle('hidden', isDet || isHm || isSr); $c('.cc-search').classList.toggle('hidden', !isSr || isDet); const keepHm = cfg.ui === 'deck' && isSr && !isDet && !!S.dkSrHome && !SR.q.trim(); $c('.cc-home').classList.toggle('hidden', (!isHm && !keepHm) || isDet);
    $c('.cc-detail').classList.toggle('hidden', !isDet); $c('.cc-settings').classList.toggle('hidden', !isSet || isDet);
    box.classList.toggle('dk-det', cfg.ui === 'deck' && isDet); if (cfg.ui === 'deck' && !isDet && box.classList.contains('dk-engb')) { box.classList.remove('dk-engb'); setTimeout(() => { const h = box.querySelector('.cc-h-scroll'); if (h) h.dispatchEvent(new Event('scroll')); }, 80); } box.classList.toggle('dk-home', cfg.ui === 'deck' && (isHm || keepHm) && !isDet && S.view === 'list'); box.classList.toggle('setmode', isSet && !isDet); box.classList.toggle('bl-det', isDet); box.classList.toggle('bl-rows', blRows()); box.classList.toggle('x3-cards', x3Cards()); box.classList.toggle('x3-dim', cfg.ui === 'x360' && isDet && !!S.det && S.det.tab === 'ach');
  }

  function open() {
    const it = cur()[curIdx()]; if (!it) return;
    if (it.type === 'game' && cfg.ui === 'x360' && X3_TABS && box.classList.contains('ach-view')) { openDetail(it.g.id, 'ach'); return; }
    if (it.type === 'game' && cfg.ui === 'deck' && S.tabs[S.tab] && S.tabs[S.tab].id === 'ach') { // en Logros no se abre la ficha (quedaba detrás): Intro / clic pasa a la lista de logros del juego, igual que →
      const pane = $c('.cc-achpane'); if (pane && !S.achPane) { S.achPane = true; S.achSel = 0; pane.classList.add('focus'); SND.open(); achMark(); hints(); } return;
    }
    if (it.type === 'game') return openDetail(it.g.id);
    SND.open(); S.sub = { title: it.type === 'coll' ? it.c.name : it.s.name, items: gameItems(it.games), idx: 0, parent: S.idx };
    paintList(); animIn($c('.cc-listwrap'));
  }
  function play(g) { if (!g) return; SND.play(); S.x3launch = Date.now(); try { updNowCard(); } catch {} if (runStateFor(g)) { toast('Ese juego ya está en ejecución'); return; } S.dkL = { id: g.id, t: Date.now() }; if (cfg.onPlay === 'min') S.minFor = { id: g.id, t: Date.now() }; launch(g); }
  function curGame() { if (isSettings() && S.view !== 'detail') return null; if (S.view === 'detail') return byId(S.det.id); if (isSearch()) return SR.zone === 'res' && SR.res[SR.ri] ? SR.res[SR.ri] : null;
    if (isHome()) { const c = homeCard(); return c && c.kind === 'game' ? c.g : null; } const it = cur()[curIdx()]; return it && it.type === 'game' ? it.g : null; }
  // ---------- Menús propios (con el estilo del modo consola) ----------
  function cmenu(title, items, opt) {
    SND.menu(); S.menu = { title, items: items.filter(Boolean), idx: 0, side: !!(opt && opt.side), right: !!(opt && opt.right) };
    let ov = $c('.cc-menu-ov'); if (!ov) { ov = el2('div', 'cc-menu-ov'); box.append(ov); }
    paintMenu(true); animIn($c('.cc-menu-ov')); hints();
  }
  function paintMenu(fresh) {
    const ov = $c('.cc-menu-ov'); if (!ov || !S.menu) return; ov.replaceChildren(); ov.classList.remove('hidden');
    ov.onclick = (e) => { if (e.target === ov) closeCMenu(); };
    if (S.menu.guide) { paintGuide(ov); return; }
    if (S.menu.prof) { paintProf(ov); return; }
    ov.classList.toggle('dk-side', !!S.menu.side); ov.classList.toggle('dk-right', !!S.menu.right);
    const p = el2('div', 'cc-menu' + (fresh ? ' dk-fresh' : '') + (S.menu.side ? ' dk-side' : '') + (S.menu.right ? ' dk-right' : '')); if (!S.menu.side) p.append(el2('div', 'cc-menu-title', S.menu.title)); else if (S.menu.right) p.append(el2('div', 'dk-ptitle', S.menu.title));
    S.menu.items.forEach((it, i) => {
      if (it.sep) { p.append(el2('div', 'cc-menu-sep')); return; }
      const r = el2('div', 'cc-menu-it' + (i === S.menu.idx ? ' sel' : '') + (it.danger ? ' danger' : '')); r.dataset.i = i;
      if (it.ic) { const ic = el2('i', 'cc-menu-ic'); ic.innerHTML = tabIcon(it.ic); r.append(ic); }
      r.append(el2('span', null, it.label)); if (it.value) r.append(el2('b', null, it.value));
      r.onmouseenter = () => { if (padActive() || !S.menu || S.menu.idx === i) return; S.menu.idx = i; p.querySelectorAll('.cc-menu-it').forEach((e) => e.classList.toggle('sel', +e.dataset.i === i)); };
      r.onclick = () => { S.menu.idx = i; runMenu(); };
      p.append(r);
    });
    ov.append(p);
  }
  function closeCMenu() { S.menu = null; const ov = $c('.cc-menu-ov'); if (ov) ov.classList.add('hidden'); hints(); }
  function runMenu() { const it = S.menu && S.menu.items[S.menu.idx]; if (!it || it.sep) return; closeCMenu(); SND.open(); try { it.run(); } catch {} }
  function menuMove(d) { if (!S.menu) return; const n = S.menu.items.length; let i = S.menu.idx; do { i = (i + d + n) % n; } while (S.menu.items[i].sep); S.menu.idx = i; SND.move(); if (S.menu.guide) document.querySelectorAll('.gd-list .cc-menu-it').forEach((e, k) => e.classList.toggle('sel', k === i)); else { const its = document.querySelectorAll('.cc-menu-ov .cc-menu-it'); if (its.length) its.forEach((e) => e.classList.toggle('sel', +e.dataset.i === i)); else paintMenu(); } const sel = $c('.cc-menu-it.sel'); if (sel) sel.scrollIntoView({ block: 'nearest' }); }
  function confirmUninstall(g) { // confirmación propia (el cuadro nativo no se maneja con el mando)
    cmenu('¿Desinstalar «' + g.name + '»?', [
      { label: 'Cancelar', run: () => {} },
      { label: 'Sí, desinstalar', run: async () => {
        let res; try { res = await window.api.uninstall(g.id); } catch { res = null; }
        toast(res && res.ok ? (res.message || 'Se abrió el desinstalador') : (res && res.error) || 'No se pudo desinstalar', 7000);
      } },
    ]);
  }
  function menu() { // opciones del juego enfocado
    const g = curGame(); if (!g) return;
    const skip = /^(Cambiar |Restablecer personalización|Unir con|Editar nombre|Quitar de la biblioteca|Abrir página)/;
    const items = []; let lastSep = true;
    const base = [{ label: 'Ficha del juego', run: () => { if (S.view !== 'detail') openDetail(g.id); } }];
    for (const it of [...base, ...gameMenuItems(g)]) {
      if (it.node) continue;
      if (it.sep) { if (!lastSep) { items.push({ sep: true }); lastSep = true; } continue; }
      if (skip.test(it.label)) continue;
      if (/^Desinstalar/.test(it.label)) { if (!lastSep) items.push({ sep: true }); items.push({ label: 'Desinstalar…', run: () => confirmUninstall(g) }); lastSep = false; continue; }
      items.push({ label: it.label, run: /^(Jugar|Instalar)$/.test(it.label) ? () => play(g) : it.run }); lastSep = false;
    }
    while (items.length && items[items.length - 1].sep) items.pop();
    cmenu(g.name, items);
  }
  // Guía de Xbox (botón central del mando / F2) para el estilo Xbox 360: casi todo el modo consola cuelga de aquí
  function guideMenu() {
    const goId = (id) => () => { const i = S.tabs.findIndex((t) => t.id === id); if (i >= 0) gotoTab(i); };
    const covers = (id) => { try { return tabItems(id).filter((x) => x.type === 'game').slice(0, 4).map((x) => x.g).filter((g) => g.coverSm || g.cover).map((g) => imgUrl(coverOk.get(g.id) || g.coverSm || g.cover)); } catch { return []; } };
    const countOf = (id) => { try { if (id === 'home' || id === 'search') return ''; const n = tabItems(id).length; return n + (n === 1 ? ' elemento' : ' elementos'); } catch { return ''; } };
    const DESC = { home: 'Tu panel principal con lo que sigue y lo recomendado.', all: 'Todos tus juegos de todas las tiendas.', inst: 'Lo que ya tienes instalado y listo para jugar.', recent: 'Lo último que has jugado.', fav: 'Los juegos que marcaste con estrella.', most: 'Ordenados por horas de juego.', ach: 'Tu progreso de logros por juego.', colls: 'Tus colecciones y etiquetas.', search: 'Escribe para encontrar un juego.' };
    const tabRow = (id, label) => S.tabs.some((t) => t.id === id) ? { label, ic: id, run: goId(id), prev: { covers: covers(id), title: label, sub: countOf(id), desc: DESC[id] } } : null;
    const rg = runState ? state.games.find((g) => runStateFor(g)) : null;
    const withAch = state.games.filter((g) => g.achievements && g.achievements.total > 0);
    S.gscore = withAch.reduce((n, g) => n + (g.achievements.unlocked || 0), 0); S.gdone = withAch.filter((g) => g.achievements.unlocked >= g.achievements.total).length;
    const recent = []; withAch.forEach((g) => { if (Array.isArray(g.achievements.list)) g.achievements.list.forEach((a) => { if (a.achieved && a.unlockTime) recent.push({ name: a.name, game: g.name, gid: g.id, t: a.unlockTime, icon: a.icon, desc: a.description, pct: a.percent }); }); });
    recent.sort((a, b) => b.t - a.t); recent.length = Math.min(recent.length, 8);
    const blades = [
      { title: 'Juegos y apps', items: [tabRow('home', 'Inicio'), tabRow('all', 'Biblioteca'), tabRow('inst', 'Instalados'), tabRow('recent', 'Recientes'), tabRow('fav', 'Favoritos'), tabRow('most', 'Más jugados'), tabRow('ach', 'Logros'), tabRow('colls', 'Colecciones'), tabRow('search', 'Buscar')].filter(Boolean) },
      { title: 'Mi perfil', visual: true, items: (() => {
        const nm = cfg.x3Name || S.uname || 'Jugador', mins = state.games.reduce((n, g) => n + (g.playTime || 0), 0), last = state.games.filter((g) => g.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed)[0], totAch = withAch.reduce((n, g) => n + (g.achievements.total || 0), 0);
        const hrs = mins >= 60 ? Math.round(mins / 60).toLocaleString('es') + ' h' : Math.round(mins) + ' min', pr = (title, sub, desc) => ({ avatar: true, title, sub, desc });
        return [
          { label: nm, sub: 'Gamerscore  G ' + S.gscore.toLocaleString('es'), ic: 'home', prev: pr(nm, 'G ' + S.gscore.toLocaleString('es') + ' · ' + S.gdone + ' juegos al 100 %', 'Tu perfil de Comptus. Aquí se resume lo que has jugado y conseguido.'), run: () => {} },
          { label: 'Logros', sub: S.gscore.toLocaleString('es') + (totAch ? ' de ' + totAch.toLocaleString('es') : ''), ic: 'ach', prev: pr(nm, S.gscore.toLocaleString('es') + (totAch ? ' de ' + totAch.toLocaleString('es') + ' logros' : ' logros'), 'Suma de los logros que has desbloqueado en todos tus juegos.'), run: () => goId('ach')() },
          { label: 'Al 100 %', sub: S.gdone + (S.gdone === 1 ? ' juego al 100 %' : ' juegos al 100 %'), ic: 'fav', prev: pr(nm, S.gdone + ' al 100 %', 'Juegos en los que ya tienes todos los logros.'), run: () => goId('ach')() },
          { label: 'Tiempo', sub: hrs + ' en total', ic: 'recent', prev: pr(nm, hrs + ' jugadas', 'Tiempo total registrado entre todas tus tiendas.'), run: () => goId('most')() },
          { label: 'Biblioteca', sub: state.games.length.toLocaleString('es') + ' juegos', ic: 'all', prev: pr(nm, state.games.length.toLocaleString('es') + ' juegos', 'Juegos de todas tus tiendas reunidos en Comptus.'), run: () => goId('all')() },
          ...(last ? [{ label: 'Última partida', sub: last.name, ic: 'recent', prev: { covers: [last.coverSm || last.cover].filter(Boolean).map(imgUrl), title: last.name, sub: fmtLast(last.lastPlayed), desc: 'El último juego que abriste.' }, run: () => goId('recent')() }] : []),
          { label: 'Cambiar foto…', sub: 'Elige una imagen', ic: 'save', prev: pr(nm, '', 'Abre el selector con las imágenes predeterminadas o tu propia foto.'), run: () => openPicBox() },
          { label: 'Cambiar nombre', sub: nm, ic: 'settings', prev: pr(nm, '', 'Escribe el nombre que se muestra en la Guía y junto al reloj.'), run: () => openNameBox() },
        ].filter(Boolean);
      })() },
      { title: 'Logros', visual: true, items: [
        ...recent.map((a) => ({ label: a.name, sub: a.game, img: /^https:/.test(a.icon || '') ? a.icon : '', prev: { title: a.name, sub: a.game + ' · ' + new Date(a.t).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) + (a.pct != null ? ' · ' + a.pct.toLocaleString('es', { maximumFractionDigits: 1 }) + ' % de jugadores' : ''), desc: a.desc || '' }, run: () => { const g = byId(a.gid); if (g) { gotoTab(S.tabs.findIndex((t) => t.id === 'ach')); } } })),
        ...(recent.length ? [] : [{ label: 'Aún no hay logros recientes guardados', run: () => {} }]),
        tabRow('ach', 'Ver todos los logros'),
      ].filter(Boolean) },
      { title: 'Comptus', items: [
        ...(rg ? [{ label: 'Cerrar «' + rg.name + '»', ic: 'stop', danger: true, prev: { covers: [rg.coverSm || rg.cover].filter(Boolean).map(imgUrl), title: rg.name, sub: 'En ejecución', desc: 'Cierra el juego que está abierto.' }, run: () => cmenu('¿Cerrar «' + rg.name + '»?', [{ label: 'No, volver', run: () => {} }, { label: 'Sí, cerrar el juego', danger: true, run: () => stopGame(rg) }]) }] : []),
        { label: 'Actualizar la biblioteca', ic: 'refresh', prev: { title: 'Actualizar la biblioteca', desc: 'Busca juegos nuevos en todas tus tiendas.' }, run: () => refreshLibrary() },
        { label: 'Guardar ajustes', ic: 'save', prev: { title: 'Guardar ajustes', desc: 'Guarda ahora la configuración del modo consola.' }, run: () => saveNow() },
        ...(S.notes.length ? [{ label: 'Avisos', ic: 'bell', value: String(S.notes.length), run: () => noticesMenu() }] : []),
      ] },
      { title: 'Multimedia', items: [
        ...(music.has ? [{ label: 'Música', ic: 'music', value: (music.playing ? '♪ ' : '❚❚ ') + (music.title || ''), run: () => musicMenu() }] : [{ label: 'No hay nada sonando', run: () => {} }]),
        { label: 'Sonidos', ic: 'sound', value: cfg.sound ? 'Sí' : 'No', prev: { title: 'Sonidos', desc: 'Activa o apaga los sonidos de la interfaz.' }, run: () => { cfg.sound = !cfg.sound; applyCfg(); save(); toast('Sonidos ' + (cfg.sound ? 'activados' : 'desactivados')); } },
        { label: 'Volumen y energía del equipo…', ic: 'power', prev: { title: 'Volumen y energía', desc: 'Volumen del equipo, suspender, reiniciar o apagar.' }, run: () => powerMenu() },
      ] },
      { title: 'Ajustes', items: [
        { label: 'Ajustes del modo consola', ic: 'settings', prev: { title: 'Ajustes del modo consola', desc: 'Estilo, fondos, sonidos, animaciones y más.' }, run: goId('settings') },
        { label: 'Cerrar el modo consola', ic: 'exit', prev: { title: 'Cerrar el modo consola', desc: 'Vuelve a la ventana normal de Comptus.' }, run: () => exit() },
        { label: 'Salir de Comptus por completo', ic: 'power', prev: { title: 'Salir de Comptus', desc: 'Cierra el launcher por completo.' }, danger: true, run: () => { saveNow(); try { window.api.quitApp(); } catch {} } },
      ] },
    ];
    SND.menu(); S.menu = { title: 'Guía de Comptus', guide: { blades, b: 0 }, items: blades[0].items, idx: 0, anim: 'open' };
    let ov = $c('.cc-menu-ov'); if (!ov) { ov = el2('div', 'cc-menu-ov'); box.append(ov); }
    paintMenu(); animIn($c('.cc-menu-ov')); hints();
  }
  function guideMove(d) { const g = S.menu && S.menu.guide; if (!g) return; const n = g.blades.length, nb = Math.max(0, Math.min(n - 1, g.b + d)); if (nb === g.b) return; g.b = nb; S.menu.items = g.blades[nb].items; S.menu.idx = 0; S.menu.anim = d > 0 ? 'r' : 'l'; SND.tab(); paintMenu(); }
  // Panel de vista previa de la Guía (derecha): portadas, icono grande del logro, descripción…
  function guidePrev(main, it) {
    const pv = main.querySelector('.gd-prev'); if (!pv) return; pv.replaceChildren(); if (!it) return;
    const p = it.prev || {};
    if (p.avatar) {
      const nm = cfg.x3Name || S.uname || 'Jugador', av = el2('div', 'gd-bigav' + (cfg.x3Pic ? ' pic' : ''), cfg.x3Pic ? '' : nm.charAt(0).toUpperCase()); if (cfg.x3Pic) av.style.backgroundImage = `url("${picSrc(cfg.x3Pic)}")`; pv.append(av);
    } else if (p.covers && p.covers.length) {
      const grid = el2('div', 'gd-cov n' + Math.min(4, p.covers.length)); p.covers.slice(0, 4).forEach((u) => { const c = el2('div', 'gd-cv'); c.style.backgroundImage = `url("${u}")`; grid.append(c); }); pv.append(grid);
    } else if (it.img || p.img) {
      const big = el2('div', 'gd-big'); const im = new Image(); im.alt = ''; im.src = p.img || it.img; im.onerror = () => { im.remove(); big.innerHTML = tabIcon('ach'); }; big.append(im); pv.append(big);
    } else { const big = el2('div', 'gd-big ic'); big.innerHTML = tabIcon(it.ic || 'all'); pv.append(big); }
    pv.append(el2('div', 'gd-pt', p.title || it.label)); if (p.sub) pv.append(el2('div', 'gd-ps', p.sub)); if (p.desc) pv.append(el2('div', 'gd-pd', p.desc));
  }
  function paintGuide(ov) {
    const g = S.menu.guide, an = S.menu.anim || ''; S.menu.anim = ''; const wrap = el2('div', 'cc-guide' + (an ? ' an-' + an : '')), top = el2('div', 'gd-top');
    const bat = $c('.cc-bat'), clk = $c('.cc-clock'), side = el2('div', 'gd-sys');
    if (bat && !bat.classList.contains('hidden')) side.append(el2('span', 'gd-bat', bat.textContent)); side.append(el2('span', 'gd-clk', clk ? clk.textContent : ''));
    const tt = el2('div', 'gd-title', 'Guía de Comptus'); if (S.gscore != null) tt.append(el2('small', 'gd-score', `G ${S.gscore.toLocaleString('es')} logros · ${S.gdone} juegos al 100 %`));
    const nm = (cfg.x3Name || S.uname || 'Jugador'), av = el2('div', 'gd-av' + (cfg.x3Pic ? ' pic' : ''), cfg.x3Pic ? '' : nm.charAt(0).toUpperCase()), pf = el2('div', 'gd-pf'); if (cfg.x3Pic) av.style.backgroundImage = `url("${picSrc(cfg.x3Pic)}")`; pf.append(av, el2('div', 'gd-nm', nm));
    top.append(tt, pf, side); wrap.append(top);
    if (S.uname == null) { S.uname = ''; try { window.api.userName().then((u) => { S.uname = (u || '').trim(); if (S.menu && S.menu.guide && S.uname) paintMenu(); }); } catch {} }
    const pan = el2('div', 'gd-panel');
    g.blades.forEach((b, bi) => {
      if (bi !== g.b) { const bl = el2('div', 'gd-blade' + (bi < g.b ? ' l' : ' r'), b.title); bl.onclick = () => { guideMove(bi - g.b); }; pan.append(bl); return; }
      const main = el2('div', 'gd-main'), list = el2('div', 'gd-list');
      b.items.forEach((it, i) => {
        const r = el2('div', 'cc-menu-it' + (i === S.menu.idx ? ' sel' : '') + (it.danger ? ' danger' : '')); r.dataset.i = i; r.style.setProperty('--i', i);
        if (!b.visual) { r.append(el2('span', null, it.label)); if (it.value) r.append(el2('b', null, it.value)); } else {
        const ib = el2('span', 'gd-ic' + (it.img ? ' img' : '')); if (it.img) { const im = new Image(); im.alt = ''; im.src = it.img; im.onerror = () => { im.remove(); ib.innerHTML = tabIcon('ach'); }; ib.append(im); } else ib.innerHTML = tabIcon(it.ic || 'all');
        const tx = el2('span', 'gd-tx'); tx.append(el2('span', 'gd-l1', it.label)); if (it.sub) tx.append(el2('span', 'gd-l2', it.sub)); r.append(ib, tx); if (it.value) r.append(el2('b', null, it.value)); }
        r.onmouseenter = () => { if (padActive() || !S.menu || S.menu.idx === i) return; S.menu.idx = i; list.querySelectorAll('.cc-menu-it').forEach((e) => e.classList.toggle('sel', +e.dataset.i === i)); if (b.visual) guidePrev(main, b.items[i]); };
        r.onclick = () => { S.menu.idx = i; runMenu(); };
        list.append(r);
      });
      main.append(list); if (b.visual) { main.classList.add('vis'); const pv = el2('div', 'gd-prev'); main.append(pv); } pan.append(main); if (b.visual) guidePrev(main, b.items[S.menu.idx] || b.items[0]);
    });
    wrap.append(pan);
    const pad = hintMode === 'pad', ft = el2('div', 'gd-hints');
    ft.innerHTML = `<span><i class="gd-c a">${pad ? 'A' : '↵'}</i>Seleccionar</span><span><i class="gd-c b">${pad ? 'B' : 'Esc'}</i>Atrás</span><span><i class="gd-c x">◀▶</i>Sección</span>`;
    wrap.append(ft); ov.append(wrap);
  }
  const PICS = [['', 'Ninguna'], ['01', 'Xbox'], ['02', 'Pirata'], ['03', 'Robot'], ['04', 'Soldado'], ['05', 'Dragón'], ['06', 'Calavera roja'], ['08', 'Ondas verdes'], ['09', 'Mono'], ['10', 'Sonrisa'], ['11', 'Calavera naranja'], ['12', 'Perro'], ['13', 'Chica gato'], ['14', 'Panda'], ['15', 'Soldado azul'], ['16', 'Encapuchado']];
  const picSrc = (p) => (/^perfiles\//.test(p) ? p : imgUrl(p));
  const picIdx = () => Math.max(0, PICS.findIndex((x) => x[0] && cfg.x3Pic === 'perfiles/' + x[0] + '.png'));
  // Selector de foto de perfil: cuadrícula como la de logros
  const PP_COLS = 8;
  const ppItems = () => [...PICS.map((x) => ({ k: x[0], n: x[1] })), { k: '@own', n: 'Mi imagen…' }];
  function openPicBox() {
    const its = ppItems(), cur = /^perfiles\//.test(cfg.x3Pic || '') ? PICS.findIndex((x) => x[0] && cfg.x3Pic === 'perfiles/' + x[0] + '.png') : 0;
    S.pp = { i: Math.max(0, cur) }; let ov = $c('.cc-picbox'); if (!ov) { ov = el2('div', 'cc-picbox'); box.append(ov); } ov.classList.remove('hidden'); paintPicBox(); hints();
    void its;
  }
  function paintPicBox() {
    const ov = $c('.cc-picbox'), n = S.pp; if (!ov || !n) return; ov.replaceChildren();
    const its = ppItems(), card = el2('div', 'pp-card'), head = el2('div', 'pp-head'), grid = el2('div', 'pp-grid'), foot = el2('div', 'pp-foot');
    const nm = (cfg.x3Name || S.uname || 'Jugador');
    its.forEach((it, i) => {
      const t = el2('div', 'pp-t' + (i === n.i ? ' sel' : '') + (it.k === '@own' ? ' own' : '') + (it.k === '' ? ' none' : ''));
      if (it.k === '') t.textContent = nm.charAt(0).toUpperCase(); else if (it.k === '@own') t.textContent = '＋'; else t.style.backgroundImage = `url("perfiles/${it.k}.png")`;
      if (/^perfiles\//.test(cfg.x3Pic || '') ? cfg.x3Pic === 'perfiles/' + it.k + '.png' : (!cfg.x3Pic && it.k === '')) t.classList.add('cur');
      t.onclick = () => { n.i = i; ppPress(); }; t.onmouseenter = () => { if (n.i !== i) { n.i = i; ppUpdate(); } };
      grid.append(t);
    });
    head.append(el2('div', 'pp-nm', 'Foto de perfil'), el2('div', 'pp-sub'), el2('div', 'pp-ds'));
    ov.append(card); card.append(head, grid, foot); ppUpdate();
  }
  function ppUpdate() {
    const ov = $c('.cc-picbox'), n = S.pp; if (!ov || !n) return; const its = ppItems(), it = its[n.i];
    ov.querySelectorAll('.pp-t').forEach((t, i) => t.classList.toggle('sel', i === n.i));
    const sub = ov.querySelector('.pp-sub'), ds = ov.querySelector('.pp-ds'), ft = ov.querySelector('.pp-foot');
    if (sub) sub.textContent = it.k === '' ? 'Sin foto (tu inicial)' : it.k === '@own' ? 'Elegir una imagen de tu PC' : it.n;
    if (ds) ds.textContent = it.k === '@own' ? 'Usa cualquier imagen guardada en tu equipo.' : 'Pulsa A para usarla como tu foto de perfil.';
    if (ft) ft.textContent = (n.i + 1) + ' de ' + its.length;
  }
  function ppMove(dir) {
    const n = S.pp; if (!n) return; const len = ppItems().length; let i = n.i;
    if (dir === 'left') i = (i - 1 + len) % len; else if (dir === 'right') i = (i + 1) % len; else if (dir === 'up') i = i - PP_COLS >= 0 ? i - PP_COLS : i; else if (dir === 'down') i = i + PP_COLS < len ? i + PP_COLS : i;
    if (i !== n.i) { n.i = i; SND.move(); ppUpdate(); }
  }
  function ppClose() { S.pp = null; const ov = $c('.cc-picbox'); if (ov) { ov.classList.add('hidden'); ov.replaceChildren(); } hints(); if (isSettings()) paintSettings(); }
  function ppPress() {
    const n = S.pp; if (!n) return; const it = ppItems()[n.i];
    if (it.k === '@own') { ppClose(); SND.open(); return pickOwnPic(); }
    cfg.x3Pic = it.k ? 'perfiles/' + it.k + '.png' : ''; applyCfg(); save(); SND.open(); toast(it.k ? 'Foto de perfil: ' + it.n : 'Foto de perfil quitada'); ppClose();
  }
  async function pickOwnPic() {
    try { const p = await window.api.pickBackground(); if (!p) return; if (typeof isVideoPath === 'function' && isVideoPath(p)) { toast('Elige una imagen (no un vídeo)'); return; } cfg.x3Pic = p; applyCfg(); save(); if (active) paintSettings(); toast('Foto de perfil puesta ✓'); } catch { toast('No se pudo elegir la imagen'); }
  }
  // Cuadro para escribir el nombre del perfil, con teclado en pantalla (mando) y teclado físico
  const NM_KB = [[...'ABCDEFGHIJ'], [...'KLMNOPQRST'], [...'UVWXYZÑ012'], [...'3456789._-'], ['␣', '⌫', 'Aa', 'Guardar', 'Cancelar']];
  function openNameBox() {
    S.nm = { t: (cfg.x3Name || '').slice(0, 20), r: 0, c: 0, lower: false };
    let ov = $c('.cc-namebox'); if (!ov) { ov = el2('div', 'cc-namebox'); box.append(ov); } ov.classList.remove('hidden'); paintNameBox(); hints();
  }
  function paintNameBox() {
    const ov = $c('.cc-namebox'), n = S.nm; if (!ov || !n) return; ov.replaceChildren();
    const card = el2('div', 'nm-card'), q = el2('div', 'nm-q'); q.append(el2('span', 'nm-t', n.t), el2('span', 'cc-sr-caret'));
    if (!n.t) q.classList.add('empty'); q.dataset.ph = 'Escribe tu nombre…';
    const kb = el2('div', 'nm-kb');
    NM_KB.forEach((row, ri) => { const rw = el2('div', 'nm-row r' + ri); row.forEach((k, ci) => { const lab = k === '␣' ? 'Espacio' : (/^[A-ZÑ]$/.test(k) && n.lower ? k.toLowerCase() : k), b = el2('button', 'nm-key' + (ri === 4 ? ' sp' : '') + (n.r === ri && n.c === ci ? ' sel' : ''), lab); b.tabIndex = -1; b.onclick = () => { n.r = ri; n.c = ci; nmPress(); }; rw.append(b); }); kb.append(rw); });
    card.append(el2('div', 'nm-title', 'Nombre del perfil'), q, kb, el2('div', 'nm-hint', 'Es el nombre que se muestra en la Guía. Si lo dejas vacío se usa el de tu usuario de Windows.')); ov.append(card);
  }
  function nmUpdate() { // actualiza solo el texto y la tecla marcada (sin redibujar el cuadro: evita el parpadeo)
    const ov = $c('.cc-namebox'), n = S.nm; if (!ov || !n) return;
    const t = ov.querySelector('.nm-t'), q = ov.querySelector('.nm-q'); if (t) t.textContent = n.t; if (q) q.classList.toggle('empty', !n.t);
    ov.querySelectorAll('.nm-row').forEach((rw, ri) => rw.querySelectorAll('.nm-key').forEach((b, ci) => { b.classList.toggle('sel', n.r === ri && n.c === ci); const k = NM_KB[ri][ci]; if (/^[A-ZÑ]$/.test(k)) b.textContent = n.lower ? k.toLowerCase() : k; }));
  }
  function nmMove(dir) {
    const n = S.nm; if (!n) return; n.phys = false; const rows = NM_KB.length;
    if (dir === 'up') n.r = (n.r - 1 + rows) % rows; else if (dir === 'down') n.r = (n.r + 1) % rows;
    else if (dir === 'left') n.c = (n.c - 1 + NM_KB[n.r].length) % NM_KB[n.r].length; else if (dir === 'right') n.c = (n.c + 1) % NM_KB[n.r].length;
    n.c = Math.min(n.c, NM_KB[n.r].length - 1); SND.move(); nmUpdate();
  }
  function nmSelKey(k) { const n = S.nm; if (!n) return; for (let r = 0; r < NM_KB.length; r++) { const c = NM_KB[r].indexOf(k); if (c >= 0) { n.r = r; n.c = c; return; } } }
  function nmType(ch) { const n = S.nm; if (!n || n.t.length >= 20) return; n.t += ch; nmUpdate(); }
  function nmPress() {
    const n = S.nm; if (!n) return; const k = NM_KB[n.r][n.c];
    if (k === 'Guardar') return nmClose(true); if (k === 'Cancelar') return nmClose(false);
    SND.open();
    if (k === '⌫') { n.t = n.t.slice(0, -1); nmUpdate(); } else if (k === 'Aa') { n.lower = !n.lower; nmUpdate(); }
    else if (k === '␣') nmType(' '); else nmType(/^[A-ZÑ]$/.test(k) && n.lower ? k.toLowerCase() : k);
  }
  function nmClose(ok) {
    const n = S.nm; S.nm = null; const ov = $c('.cc-namebox'); if (ov) { ov.classList.add('hidden'); ov.replaceChildren(); }
    if (ok && n) { cfg.x3Name = n.t.trim(); applyCfg(); save(); toast(cfg.x3Name ? 'Nombre: ' + cfg.x3Name : 'Se usará el nombre de tu usuario de Windows'); }
    else SND.back();
    hints(); if (isSettings()) paintSettings();
  }
  function sysMenu() {
    if (S.menu) return;
    if (cfg.ui === 'x360') return guideMenu();
    if (cfg.ui === 'deck') return deckMenu();
    cmenu('Modo consola', [
      { label: 'Ajustes del modo consola', run: () => gotoTab(S.tabs.length - 1) },
      { label: 'Vista de la lista', value: gridNow() ? 'Vertical (cuadrícula)' : 'Horizontal (fila)', run: () => { cfg.layout = gridNow() ? 'row' : 'grid'; applyCfg(); save(); toast('Vista ' + (cfg.layout === 'grid' ? 'vertical' : 'horizontal')); if (S.view === 'detail') backDetail(); else if (isSettings()) paintSettings(); else { applyLayout(); paintList(S.focusId); } } },
      { label: 'Sonidos', value: cfg.sound ? 'Sí' : 'No', run: () => { cfg.sound = !cfg.sound; applyCfg(); save(); toast('Sonidos ' + (cfg.sound ? 'activados' : 'desactivados')); } },
      ...(() => { const rg = runState ? state.games.find((g) => runStateFor(g)) : null; return rg ? [{ label: 'Cerrar «' + rg.name + '»', danger: true, run: () => cmenu('¿Cerrar «' + rg.name + '»?', [{ label: 'No, volver', run: () => {} }, { label: 'Sí, cerrar el juego', danger: true, run: () => stopGame(rg) }]) }] : []; })(),
      { label: 'Actualizar la biblioteca', run: () => refreshLibrary() },
      { label: 'Guardar ajustes', run: () => saveNow() },
      { sep: true },
      ...(S.notes.length ? [{ label: 'Avisos', value: String(S.notes.length), run: () => noticesMenu() }] : []),
      ...(music.has ? [{ label: 'Música', value: (music.playing ? '♪ ' : '❚❚ ') + (music.title || ''), run: () => musicMenu() }] : []),
      { label: 'Volumen y energía del equipo…', run: () => powerMenu() },
      { label: 'Cerrar el modo consola', run: () => exit() },
      { label: 'Salir de Comptus por completo', danger: true, run: () => { saveNow(); try { window.api.quitApp(); } catch {} } },
    ]);
  }

  // Volumen del equipo y energía (apagar, reiniciar, suspender, bloquear)
  function vol(dir, n, msg, i) { try { Promise.resolve(window.api.systemVolume(dir, n)).then((r) => { if (r && r.ok === false) toast('El volumen del equipo solo se puede cambiar en Windows'); }); } catch {} toast(msg); powerMenu(i); }
  function confirmPower(action, title) {
    cmenu(title, [{ label: 'No, volver', run: () => powerMenu() }, { label: 'Sí, continuar', danger: true, run: () => { toast('Un momento…'); try { Promise.resolve(window.api.systemPower(action)).then((r) => { if (r && r.ok === false) toast('Esto solo funciona en Windows'); }); } catch {} } }]);
  }
  function powerMenu(idx) {
    cmenu('Equipo', [
      { label: 'Subir volumen', run: () => vol('up', 5, 'Volumen +', 0) },
      { label: 'Bajar volumen', run: () => vol('down', 5, 'Volumen −', 1) },
      { label: 'Silenciar / activar sonido', run: () => vol('mute', 1, 'Sonido alternado', 2) },
      { sep: true },
      { label: 'Bloquear', run: () => { try { window.api.systemPower('lock'); } catch {} } },
      { label: 'Suspender', run: () => confirmPower('sleep', '¿Suspender el equipo?') },
      { label: 'Reiniciar', danger: true, run: () => confirmPower('restart', '¿Reiniciar el equipo?') },
      { label: 'Apagar', danger: true, run: () => confirmPower('shutdown', '¿Apagar el equipo?') },
    ]);
    if (S.menu && idx) { S.menu.idx = idx; paintMenu(true); }
  }

  setInterval(() => { try { updNowCard(); if (!active || !S.play || !isHome() || S.view === 'detail') return; const g = byId(S.play.id), el = document.querySelector('#couch .cc-hc.now .cc-hc-sub'); if (g && el) el.textContent = nowSub(g); } catch {} }, 20000);

  // Animación al instalar / desinstalar: se detecta cuando un juego cambia de estado al recargarse la biblioteca
  const INST = { snap: null, fx: {}, prog: {}, pt: null };
  // Progreso de instalaciones en curso (Steam con porcentaje real, Epic solo «instalando»)
  function instMark(e, id) {
    const p = INST.prog[id], host = e.classList.contains('cc-hc') ? e.querySelector('.cc-hc-img') : e.querySelector('.cc-cover'); if (!host) return;
    let ov = host.querySelector(':scope > .cc-inst');
    if (!p) { if (ov) ov.remove(); e.classList.remove('cc-installing'); return; }
    if (!ov) { ov = el2('div', 'cc-inst'); ov.append(el2('span', 'cc-inst-sp'), el2('span', 'cc-inst-tx')); host.append(ov); }
    e.classList.add('cc-installing'); ov.classList.toggle('paused', !!p.paused);
    ov.querySelector('.cc-inst-tx').textContent = p.fin ? 'Terminando…' : p.paused ? 'En pausa' : 'Instalando…';
  }
  function instPaint() {
    if (!box) return;
    box.querySelectorAll('[data-gid]').forEach((e) => instMark(e, e.dataset.gid));
    const m = S.view === 'detail' && S.det ? $c('.cc-detail .cc-d-main') : null, p = m && INST.prog[S.det.id]; let ln = m && m.querySelector('.cc-inst-line');
    if (!p) { if (ln) ln.remove(); return; }
    if (!ln) { ln = el2('div', 'cc-inst-line'); ln.append(el2('span', 'cc-inst-sp'), el2('span', 'cc-inst-tx')); const meta = m.querySelector('.cc-meta'); if (meta) meta.after(ln); else m.append(ln); }
    ln.classList.toggle('paused', !!p.paused);
    ln.querySelector('.cc-inst-tx').textContent = p.fin ? 'Terminando la instalación…' : p.paused ? 'Instalación en pausa' : 'Instalando…';
  }
  async function instPoll() {
    if (!active || !window.api.installsGet) return;
    let list; try { list = await window.api.installsGet(); } catch { return; } if (!Array.isArray(list)) return;
    const seen = new Set(list.map((x) => x.id)), before = JSON.stringify(INST.prog);
    list.forEach((x) => { INST.prog[x.id] = { paused: x.paused }; });
    Object.keys(INST.prog).forEach((id) => { if (seen.has(id)) return; const p = INST.prog[id]; if (!p.fin) p.fin = Date.now(); else if (Date.now() - p.fin > 12000) delete INST.prog[id]; });
    if (JSON.stringify(INST.prog) !== before) instPaint();
  }

  function instDiff() {
    const now = new Map((state.games || []).map((g) => [g.id, g.installed !== false])), old = INST.snap; INST.snap = now;
    if (!old) return;
    const ch = []; now.forEach((v, id) => { if (old.has(id) && old.get(id) !== v) ch.push([id, v]); });
    if (!ch.length || ch.length > 3) return; // un cambio masivo (cerrar sesión, volver a analizar) no se anima
    ch.forEach(([id, v]) => { INST.fx[id] = v ? 'in' : 'out'; delete INST.prog[id]; const g = byId(id); if (g) noticeIn({ kind: v ? 'inst' : 'uninst', title: v ? `«${g.name}» instalado` : `«${g.name}» desinstalado`, body: v ? 'Ya puedes jugar' : 'Sigue en tu biblioteca' }); });
  }
  function instApply() {
    instPaint(); const ids = Object.keys(INST.fx); if (!ids.length || !box) return;
    ids.forEach((id) => {
      const kind = INST.fx[id], cls = kind === 'in' ? 'cc-fx-in' : 'cc-fx-out';
      box.querySelectorAll('[data-gid]').forEach((e) => { if (e.dataset.gid !== id) return; e.classList.remove('cc-fx-in', 'cc-fx-out'); void e.offsetWidth; e.classList.add(cls); setTimeout(() => e.classList.remove(cls), 1800); });
      if (S.view === 'detail' && S.det && S.det.id === id) { const m = $c('.cc-detail'); if (m) { m.classList.remove('cc-fx-in', 'cc-fx-out'); void m.offsetWidth; m.classList.add(cls); setTimeout(() => m.classList.remove(cls), 1800); } }
      if (kind === 'in') SND.play(); else SND.exit();
      delete INST.fx[id];
    });
  }

  // Avisos dentro del modo consola (juegos gratis, eventos y ofertas de la lista de deseados)
  const NT = { q: [], cur: null, t: null };
  S.notes = S.notes || [];
  function bellSync() { try { const b = $c('.cc-dic.bell'); if (!b) return; const n = S.notes.filter((x) => !x.read).length; b.classList.toggle('has', n > 0); b.dataset.n = n > 9 ? '9+' : String(n); } catch {} }
  function noticeIn(n, act) {
    if (!n || !n.title) return;
    S.notes.unshift({ kind: n.kind, title: n.title, body: n.body || '', at: Date.now(), read: false, act: typeof act === 'function' ? act : null }); S.notes.length = Math.min(S.notes.length, 20); bellSync();
    NT.q.push(n); if (!NT.cur) noticeNext();
  }
  // Amigos de Steam: cada pocos minutos se compara su estado y se avisa de quién se conecta o empieza a jugar (la primera consulta solo fija la referencia)
  const FW = { t: null, snap: null };
  async function friendWatch() {
    if (!active || cfg.ui !== 'deck' || typeof window.api.friendsGet !== 'function') return;
    let r = null; try { r = await window.api.friendsGet(false); } catch { r = null; }
    if (!r || !r.ok) return; HM.fr = r; HM.frAt = Date.now();
    const cur = new Map((r.friends || []).map((f) => [f.id, f]));
    if (FW.snap) {
      let k = 0;
      for (const f of r.friends || []) {
        if (k >= 3) break; const o = FW.snap.get(f.id); if (!o) continue;
        if (f.game && f.game !== o.game) { const mine = f.appid && (state.games || []).find((g) => g.appid && Number(g.appid) === f.appid); noticeIn({ kind: 'friend', title: f.name + ' está jugando a ' + f.game, body: mine ? 'Lo tienes en tu biblioteca' : '' }, () => dkFriendProfile(f)); k++; }
        else if (!f.game && f.state > 0 && o.state === 0) { noticeIn({ kind: 'friend', title: f.name + ' se ha conectado', body: '' }, () => dkFriendProfile(f)); k++; }
      }
    }
    FW.snap = cur;
  }
  function friendWatchStart() { clearInterval(FW.t); FW.snap = null; if (cfg.ui !== 'deck') return; FW.t = setInterval(friendWatch, 150000); setTimeout(friendWatch, 4000); }
  function noticeNext() {
    const n = NT.q.shift(); const old = $c('.cc-notice');
    if (!n || !box) { NT.cur = null; if (old) old.classList.remove('on'); return; }
    NT.cur = n; let el = old; if (!el) { el = el2('div', 'cc-notice'); box.append(el); }
    el.replaceChildren(el2('div', 'cc-ntc-ic', n.kind === 'friend' ? '👥' : n.kind === 'ach' ? '🏆' : n.kind === 'wish' ? '🏷' : n.kind === 'events' ? '🎉' : n.kind === 'inst' ? '✅' : n.kind === 'uninst' ? '🗑' : '🎁'), (() => { const b = el2('div', 'cc-ntc-tx'); b.append(el2('div', 'cc-ntc-t', n.title), el2('div', 'cc-ntc-b', n.body || '')); return b; })());
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); SND.open();
    clearTimeout(NT.t); NT.t = setTimeout(() => { const e = $c('.cc-notice'); if (e) e.classList.remove('on'); NT.t = setTimeout(noticeNext, 500); }, 7000);
  }
  // Música (lo que suena en Windows): chip arriba y entradas en el menú del sistema
  let music = { has: false };
  function paintMusic(s) {
    music = s || { has: false };
    if (!box) return;
    const m = $c('.cc-music'); if (!m) return;
    m.classList.add('hidden'); // la barra de «reproduciendo» ya no se muestra en ningún modo consola; los controles siguen en el menú del sistema
    if (music.has) { m.textContent = (music.playing ? '♪ ' : '❚❚ ') + [music.title, music.artist].filter(Boolean).join(' — '); m.title = music.app || ''; }
  }
  function musicCmd(c, idx) { try { window.api.mediaCmd(c); } catch {} setTimeout(() => { if (!S.menu) musicMenu(idx); }, 550); }
  function musicMenu(idx) {
    if (!music.has) { toast('No hay nada sonando'); return; }
    cmenu('♪ ' + (music.title || 'Música'), [
      { label: music.playing ? 'Pausar' : 'Reanudar', run: () => musicCmd('toggle', 0) },
      { label: 'Siguiente', run: () => musicCmd('next', 1) },
      { label: 'Anterior', run: () => musicCmd('prev', 2) },
    ]);
    if (S.menu && idx) { S.menu.idx = idx; paintMenu(true); }
  }
  try { if (window.api.onMediaState) window.api.onMediaState(paintMusic); } catch {}
  function noticesMenu() {
    if (!S.notes.length) { toast('No hay avisos'); return; }
    const hm = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    cmenu('Avisos', S.notes.map((n) => ({ label: n.title, value: hm(n.at), run: () => { n.read = true; bellSync(); if (n.act) n.act(); else { const i = S.tabs.findIndex((t) => t.id === 'home'); if (i >= 0) gotoTab(i); } } })));
  }
  try { if (window.api.onCouchNotice) window.api.onCouchNotice(noticeIn); } catch {}
  try { if (window.api.onOverlayState) window.api.onOverlayState((v) => { window.__overlayOpen = !!v; }); } catch {}

  async function favorite() { const g = curGame(); if (g) { await toggleFav(g); } }

  // ---------- Ficha del juego ----------
  function openDetail(id, tab) {
    const g = byId(id); if (!g) return;
    SND.open(); S.view = 'detail'; S.det = { id, tab: tab || 'ov', btn: 0, scrollAch: false, mi: 0, mfocus: false, afocus: tab === 'ach', asel: 0 }; showView(); paintDetail(); hints(); animIn($c('.cc-detail'));
  }
  // ---------- Tráilers y capturas ----------
  function mediaOf(g) {
    const inf = infoOf(g) || {}, ct = g.customTrailer || null;
    const movies = ((g.info && g.info.movies) || []).filter((m) => m.mp4 || m.webm || m.hls).map((m) => ({ kind: 'video', m, thumb: m.thumb || '', name: m.name || 'Tráiler' }));
    if (ct && ct.kind === 'file' && ct.path) movies.unshift({ kind: 'video', m: { id: 'custom', name: 'Mi tráiler', mp4: fileUrl(ct.path), thumb: '' }, thumb: '', name: 'Mi tráiler' });
    const shots = ((inf && inf.screenshots) || []).map((sh) => (typeof sh === 'string' ? { thumb: sh, full: sh } : sh && { thumb: sh.thumb || sh.full || sh.url, full: sh.full || sh.url || sh.thumb })).filter((x) => x && x.full).slice(0, 40).map((x, i) => ({ kind: 'shot', thumb: x.thumb, full: x.full, name: `Captura ${i + 1}` }));
    return { movies, shots, all: [...movies, ...shots] };
  }
  function viewerStop() { const v = S.viewer; if (v && v.tc) { try { v.tc.video.pause(); } catch {} if (v.tc.hls) { try { v.tc.hls.destroy(); } catch {} } v.tc = null; } }
  function viewerShow() {
    const v = S.viewer, ov = $c('.cc-viewer'), it = v.items[v.i];
    viewerStop();
    const st = ov.querySelector('.cc-v-stage'); st.replaceChildren();
    ov.querySelector('.cc-v-cap').textContent = `${it.name}  ·  ${v.i + 1} / ${v.items.length}`;
    if (it.kind === 'shot') { const im = new Image(); im.alt = ''; im.src = imgUrl(it.full); st.append(im); return; }
    const video = el2('video'); video.controls = false; video.playsInline = true; st.append(video);
    const msg = el2('div', 'cc-v-msg hidden', 'No se pudo reproducir este tráiler aquí.'); st.append(msg);
    const tc = v.tc = { video, hls: null };
    loadTrailer(tc, it.m, true, () => msg.classList.remove('hidden'));
  }
  function openViewer(items, i) {
    if (!items.length) return; closeViewer(true); inlineStop();
    let ov = $c('.cc-viewer'); if (!ov) { ov = el2('div', 'cc-viewer'); ov.innerHTML = '<div class="cc-v-stage"></div><div class="cc-v-cap"></div><div class="cc-v-hint"></div>'; box.append(ov); }
    ov.classList.remove('hidden'); S.viewer = { items, i, tc: null }; SND.open();
    ov.querySelector('.cc-v-hint').textContent = hintMode === 'pad' ? '◀ ▶ Cambiar   A Pausa   B Cerrar' : '← → Cambiar   Enter Pausa   Esc Cerrar';
    viewerShow();
  }
  function closeViewer(quiet) {
    if (!S.viewer) return;
    viewerStop(); S.viewer = null; if (!quiet && S.view === 'detail') setTimeout(() => showMedia(S.det.mi || 0, false), 0); const ov = $c('.cc-viewer'); if (ov) { ov.classList.add('hidden'); ov.querySelector('.cc-v-stage').replaceChildren(); }
    if (!quiet) SND.back();
  }
  function viewerMove(d) { const v = S.viewer; if (!v || v.items.length < 2) return; v.i = (v.i + d + v.items.length) % v.items.length; SND.move(); viewerShow(); }
  function viewerToggle() { const v = S.viewer; if (v && v.tc) { const e = v.tc.video; if (e.paused) e.play().catch(() => {}); else e.pause(); } else viewerMove(1); }
  function inlineStop() { const tc = S.det && S.det.tc; if (tc) { try { tc.video.pause(); } catch {} if (tc.hls) { try { tc.hls.destroy(); } catch {} } S.det.tc = null; } }
  function mediaPanel(g) {
    const md = mediaOf(g); if (!md.all.length) return null;
    const p = el2('div', 'cc-d-media' + (S.det.mfocus ? ' focus' : ''));
    p.append(el2('div', 'cc-m-stage'), el2('div', 'cc-m-cap'));
    const th = el2('div', 'cc-m-thumbs');
    md.all.forEach((x, k) => { const b = el2('button', 'cc-mthumb' + (x.kind === 'video' ? ' vid' : '')); b.tabIndex = -1; if (x.thumb) { const im = new Image(); im.loading = 'lazy'; im.alt = ''; im.src = imgUrl(x.thumb); b.append(im); } if (x.kind === 'video') b.append(el2('span', 'cc-play', '▶')); b.onclick = () => { if (cfg.ui === 'x360' && X3_TABS && S.det.tab !== 'gal') { x3Tab('gal', k, true); return; } S.det.mfocus = true; showMedia(k, true); }; th.append(b); });
    p.append(th);
    S.det.tc = null; setTimeout(() => showMedia(Math.min(S.det.mi || 0, md.all.length - 1), false), 0);
    return p;
  }
  function showMedia(i, play) {
    const g = byId(S.det.id), p = $c('.cc-d-media'); if (!g || !p) return;
    const md = mediaOf(g), it = md.all[i]; if (!it) return;
    inlineStop(); S.det.mi = i; p.classList.toggle('focus', !!S.det.mfocus);
    const st = p.querySelector('.cc-m-stage'); st.replaceChildren();
    p.querySelector('.cc-m-cap').textContent = `${it.name}  ·  ${i + 1} / ${md.all.length}` + (S.det.mfocus ? (it.kind === 'video' ? '   (A pausa · ◀ ▶ cambia · B sale)' : '   (A pantalla completa · ◀ ▶ cambia · B sale)') : '');
    p.querySelectorAll('.cc-mthumb').forEach((b, k) => b.classList.toggle('on', k === i));
    const on = p.querySelectorAll('.cc-mthumb')[i]; const th = p.querySelector('.cc-m-thumbs'); if (on) th.scrollTo({ left: on.offsetLeft - (th.clientWidth - on.offsetWidth) / 2, behavior: 'smooth' });
    if (it.kind === 'shot') { const im = new Image(); im.alt = ''; im.src = imgUrl(it.full); st.append(im); return; }
    const video = el2('video'); video.controls = false; video.playsInline = true; st.append(video);
    const msg = el2('div', 'cc-v-msg hidden', 'No se pudo reproducir este tráiler aquí.'); st.append(msg);
    const tc = S.det.tc = { video, hls: null };
    if (play) loadTrailer(tc, it.m, true, () => msg.classList.remove('hidden'));
    else { video.poster = it.thumb ? imgUrl(it.thumb) : ''; st.append(el2('span', 'cc-m-big', '▶')); }
  }
  function mediaAccept() {
    const g = byId(S.det.id); if (!g) return; const md = mediaOf(g), it = md.all[S.det.mi || 0]; if (!it) return;
    const tc = S.det.tc;
    if (it.kind === 'shot') openViewer(md.all, S.det.mi);
    else if (!tc || !tc.video.src && !tc.hls) showMedia(S.det.mi, true);
    else { if (tc.video.paused) tc.video.play().catch(() => {}); else tc.video.pause(); }
  }
  function mediaMove(d) { const g = byId(S.det.id); if (!g) return; const n = mediaOf(g).all.length; if (n < 2) return; SND.move(); showMedia(((S.det.mi || 0) + d + n) % n, true); }
  function mediaLeave() { S.det.mfocus = false; const p = $c('.cc-d-media'); if (p) p.classList.remove('focus'); showMedia(S.det.mi || 0, false); hints(); }
  function detailButtons(g) {
    const md = mediaOf(g);
    const rs = runStateFor(g);
    return [
      { label: rs ? (rs.state === 'stopping' ? 'Cerrando…' : 'Cerrar el juego') : '▶  Jugar', primary: true, run: () => { if (rs) { stopGame(g); } else play(g); } },
      ...(md.movies.length ? [{ label: '🎬 Tráiler', run: () => { S.det.mfocus = true; SND.open(); showMedia(0, true); hints(); } }] : []),
      ...(md.shots.length ? [{ label: '🖼 Capturas', run: () => { S.det.mfocus = true; SND.open(); showMedia(md.movies.length, false); hints(); } }] : []),
      ...(g.achievements && g.achievements.total > 0 ? [{ label: '🏆 Logros', run: () => detAchEnter() }] : []),
      { label: g.favorite ? '★ Quitar de favoritos' : '☆ Favorito', run: () => favorite() },
      { label: '⋯ Más opciones', run: () => menu() },
      { label: '‹ Volver', run: () => backDetail() },
    ];
  }
  function paintDetail() {
    setTimeout(instPaint, 0);
    const g = byId(S.det.id), page = $c('.cc-detail'); if (!g) { backDetail(); return; }
    setBg(g); page.replaceChildren();
    if (cfg.ui === 'deck') { paintDetailDeck(g, page); return; }
    if (cfg.ui === 'x360' && X3_TABS) { paintDetailX3(g, page); return; }
    const left = el2('div', 'cc-d-main');
    left.append(el2('div', 'cc-src', srcDef(g.source).name));
    const t = el2('h1', 'cc-title'); titleInto(t, g); left.append(t, el2('div', 'cc-meta', metaOf(g)));
    const row = el2('div', 'cc-det-btns');
    detailButtons(g).forEach((b, i) => { const x = el2('button', 'cc-btn' + (b.primary ? ' primary' : '') + (i === S.det.btn ? ' sel' : ''), b.label); x.tabIndex = -1; x.onclick = () => { S.det.btn = i; b.run(); }; x.onmouseenter = () => { if (padActive()) return; S.det.btn = i; row.querySelectorAll('.cc-btn').forEach((e, k) => e.classList.toggle('sel', k === i)); }; row.append(x); });
    left.append(row);
    const body = el2('div', 'cc-d-body'); body.tabIndex = -1;
    const inf = infoOf(g);
    if (inf && inf.description) body.append(el2('p', 'cc-desc', inf.description));
    else body.append(el2('p', 'cc-desc dim', 'Este juego todavía no tiene información. Ábrelo en el lanzador y pulsa ℹ️ para buscarla.'));
    if (g.achievements && g.achievements.total > 0) { const sec = el2('div', 'cc-achs'); body.append(sec); fillAchs(g, sec); }
    const det = el2('div', 'cc-facts');
    const fact = (k, v) => { if (v) { const d = el2('div', 'cc-fact'); d.append(el2('span', null, k), el2('b', null, v)); det.append(d); } };
    if (inf) {
      fact('Desarrollador', (inf.developers || []).join(', ')); fact('Editor', (inf.publishers || []).join(', '));
      fact('Lanzamiento', inf.releaseDate ? formatDate(inf.releaseDate) : ''); fact('Géneros', (inf.genres || []).join(', ')); fact('Metacritic', inf.metacritic ? String(inf.metacritic) : '');
    }
    fact('Biblioteca', srcDef(g.source).name); fact('En disco', g.diskBytes ? fmtBytes(g.diskBytes) : '');
    if (det.children.length) body.append(det);
    if (cfg.ui === 'x360') { // estilo Xbox 360: título arriba a la derecha, losetas de acción a la izquierda e información a la derecha
      const head = el2('div', 'x3d-head'), t2 = el2('h1', 'cc-title'); titleInto(t2, g); head.append(t2, el2('div', 'cc-meta', metaOf(g)));
      row.querySelectorAll('.cc-btn').forEach((b) => { const m = /^(\S{1,3})\s+(.+)$/.exec(b.textContent); if (m && !/[\p{L}\p{N}]/u.test(m[1])) { b.textContent = ''; b.append(el2('span', 'x3b-ic', m[1]), el2('span', 'x3b-lab', m[2])); } else { const l = b.textContent; b.textContent = ''; b.append(el2('span', 'x3b-lab', l)); } });
      const mp2 = mediaPanel(g), right = el2('div', 'x3d-right'); if (mp2) right.append(mp2); right.append(body);
      const main = el2('div', 'x3d-main'); main.append(row, right); page.append(head, main); body.scrollTop = 0; return;
    }
    left.append(body); page.append(left);
    const mp = mediaPanel(g); if (mp) { if (isPortrait()) left.insertBefore(mp, body); else page.append(mp); }
    body.scrollTop = 0;
  }
  // ---------- Página del juego, estilo Xbox 360: resumen / detalles / logros / galería ----------
  const X3_TABS = true; // pestañas resumen/detalles/logros/galería en la página del juego (estilo Xbox 360)
  function x3Tabs(g) { const md = mediaOf(g); return [['ov', 'resumen'], ['det', 'detalles'], ...(g.achievements && g.achievements.total > 0 ? [['ach', 'logros']] : []), ...(md.all.length ? [['gal', 'galería']] : [])]; }
  function x3Tiles(g) {
    const md = mediaOf(g), rs = runStateFor(g);
    return [
      { label: rs ? (rs.state === 'stopping' ? 'Cerrando…' : 'Cerrar el juego') : '▶  Jugar', primary: true, run: () => { if (rs) stopGame(g); else play(g); } },
      { label: g.favorite ? '★ Quitar de favoritos' : '☆ Favorito', run: () => favorite() },
      ...(md.movies.length ? [{ label: '🎬 Tráiler', run: () => x3Tab('gal', 0, true) }] : []),
      ...(md.shots.length ? [{ label: '🖼 Capturas', run: () => x3Tab('gal', md.movies.length, false) }] : []),
      { label: '⋯ Más opciones', run: () => menu() },
    ];
  }
  // Globo verde de «Logro desbloqueado» (estilo Xbox 360): sube desde abajo, se queda un momento y se esconde
  function x3Notify(a, game, i) {
    setTimeout(() => {
      if (!box) return;
      let host = box.querySelector('.x3-notes'); if (!host) { host = el2('div', 'x3-notes'); box.append(host); }
      const n = el2('div', 'x3-note'), ic = el2('div', 'x3-note-ic');
      if (a && a.icon && /^https:/.test(a.icon)) { const im = new Image(); im.alt = ''; im.src = a.icon; im.onerror = () => { im.remove(); ic.textContent = '🏆'; }; ic.append(im); } else ic.textContent = '🏆';
      n.append(ic, el2('div', 'x3-note-tx'));
      const tx = n.lastChild; tx.append(el2('div', 'x3-note-l1', 'Logro desbloqueado'), el2('div', 'x3-note-l2', (a && a.name) || game || ''));
      host.append(n);
      requestAnimationFrame(() => requestAnimationFrame(() => n.classList.add('in')));
      setTimeout(() => { n.classList.remove('in'); n.classList.add('out'); setTimeout(() => n.remove(), 600); }, 5200);
    }, i * 5600);
  }
  function x3Tab(id, mi, play) {
    const g = byId(S.det.id); if (!g) return; inlineStop(); closeViewer(true);
    { const ts = x3Tabs(g).map((t) => t[0]), a0 = ts.indexOf(S.det.tab), a1 = ts.indexOf(id); S.det.slide = a1 >= a0 ? 'r' : 'l'; }
    S.det.tab = id; S.det.afocus = id === 'ach'; S.det.mfocus = id === 'gal'; S.det.asel = 0; if (mi != null) S.det.mi = mi;
    SND.tab(); paintDetail(); hints();
    if (id === 'gal' && play) setTimeout(() => showMedia(S.det.mi || 0, true), 30);
  }
  async function x3AchGrid(g, wrap) {
    const data0 = g.achievements; if (!data0 || !data0.total) return;
    const COLS = 8;
    const draw = (d) => {
      if (!wrap.isConnected) return; wrap.replaceChildren();
      const list = Array.isArray(d.list) ? d.list.slice().sort((a, b) => (a.achieved !== b.achieved ? (a.achieved ? -1 : 1) : a.achieved ? b.unlockTime - a.unlockTime : (b.percent ?? -1) - (a.percent ?? -1))) : [];
      S.det.alist = list;
      const head = el2('div', 'x3g-head'), grid = el2('div', 'x3g-grid'), foot = el2('div', 'x3g-foot', `${d.unlocked} de ${d.total} desbloqueados`);
      if (!list.length) { head.append(el2('div', 'x3g-l1', g.name), el2('div', 'x3g-l2', 'Cargando la lista de logros…')); wrap.append(head, grid, foot); return; }
      list.forEach((a, i) => {
        const c = el2('div', 'x3g-c'); c.dataset.i = i; c.style.setProperty('--d', (Math.floor(i / COLS) * 45 + (i % COLS) * 18) + 'ms'); const im = new Image(); im.alt = ''; im.loading = 'lazy'; const iu = (a.achieved ? a.icon : a.iconGray || a.icon) || ''; if (iu) im.src = iu; im.onerror = () => { im.style.visibility = 'hidden'; };
        const b = el2('div', 'x3g-i' + (a.achieved ? '' : ' lock')); b.append(im); c.append(b);
        c.onclick = () => { S.det.asel = i; x3AchSel(); }; grid.append(c);
      });
      wrap.append(head, grid, foot); S.det.asel = Math.max(0, Math.min(list.length - 1, S.det.asel || 0)); x3AchSel();
    };
    draw(data0);
    if (!Array.isArray(data0.list)) { try { const r = await window.api.getAchievements(g.id, false); if (r && r.data && wrap.isConnected) { g.achievements = r.data; draw(r.data); } } catch (e) { console.error('logros', e); } }
  }
  function x3AchSel() {
    const wrap = $c('.x3g'), list = S.det && S.det.alist; if (!wrap || !list || !list.length) return;
    const i = Math.max(0, Math.min(list.length - 1, S.det.asel || 0)), a = list[i], head = wrap.querySelector('.x3g-head'); S.det.asel = i;
    wrap.querySelectorAll('.x3g-c').forEach((c, k) => c.classList.toggle('sel', k === i));
    const g = byId(S.det.id), desc = a.description || (a.hidden && !a.achieved ? 'Logro secreto: Steam no publica su descripción hasta que se desbloquea.' : '');
    head.replaceChildren(el2('div', 'x3g-l1', (g ? g.name : '')), el2('div', 'x3g-l2', a.name || ''), el2('div', 'x3g-l3', desc));
    const rt = el2('div', 'x3g-rt'); if (a.percent != null) rt.append(el2('div', null, a.percent.toLocaleString('es', { maximumFractionDigits: 1 }) + ' %')); rt.append(el2('div', null, a.achieved && a.unlockTime ? new Date(a.unlockTime).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : (a.achieved ? 'Desbloqueado' : 'Bloqueado'))); head.append(rt);
    const c = wrap.querySelectorAll('.x3g-c')[i]; if (c) c.scrollIntoView({ block: 'nearest' });
  }
  function x3AchMove(dir) {
    const list = S.det.alist || [], n = list.length, COLS = 8; if (!n) { if (dir === 'left') x3DetStep(-1); return; }
    const i = S.det.asel || 0; let k = i;
    if (dir === 'left') { if (i % COLS === 0) { x3DetStep(-1); return; } k = i - 1; }
    else if (dir === 'right') { if (i + 1 < n) k = i + 1; }
    else if (dir === 'up') { if (i - COLS >= 0) k = i - COLS; }
    else if (i + COLS < n) k = i + COLS; else if (Math.floor(i / COLS) < Math.floor((n - 1) / COLS)) k = n - 1;
    if (k !== i) { S.det.asel = k; SND.move(); x3AchSel(); }
  }
  function x3DetStep(d) { const g = byId(S.det.id); if (!g) return; const tabs = x3Tabs(g), i = tabs.findIndex((t) => t[0] === S.det.tab), ni = i + d; if (ni < 0 || ni >= tabs.length) return; x3Tab(tabs[ni][0]); }
  function paintDetailX3(g, page) {
    const tabs = x3Tabs(g); if (!tabs.some((t) => t[0] === S.det.tab)) S.det.tab = 'ov'; const tab = S.det.tab;
    const head = el2('div', 'x3d-head'), t2 = el2('h1', 'cc-title'); titleInto(t2, g); head.append(t2, el2('div', 'cc-meta', metaOf(g)));
    const bar = el2('div', 'x3v-tabs'); tabs.forEach(([id, lab]) => { const b = el2('span', 'x3v-tab' + (id === tab ? ' on' : ''), lab); b.onclick = () => { if (id !== tab) x3Tab(id); }; bar.append(b); });
    const body = el2('div', 'x3v-body x3v-' + tab); const inf = infoOf(g); box.classList.toggle('x3-dim', tab === 'ach'); if (S.det.slide) { body.classList.add('sl-' + S.det.slide); S.det.slide = ''; }
    if (tab === 'ov') {
      const row = el2('div', 'cc-det-btns');
      x3Tiles(g).forEach((b, i) => {
        const x = el2('button', 'cc-btn' + (b.primary ? ' primary' : '') + (i === S.det.btn ? ' sel' : '')); x.tabIndex = -1; x.style.setProperty('--k', i);
        const m = /^(\S{1,3})\s+(.+)$/.exec(b.label); if (m && !/[\p{L}\p{N}]/u.test(m[1])) x.append(el2('span', 'x3b-ic', m[1]), el2('span', 'x3b-lab', m[2])); else x.append(el2('span', 'x3b-lab', b.label));
        x.onclick = () => { S.det.btn = i; b.run(); }; x.onmouseenter = () => { if (padActive()) return; S.det.btn = i; row.querySelectorAll('.cc-btn').forEach((e, k) => e.classList.toggle('sel', k === i)); }; row.append(x);
      });
      const mid = el2('div', 'x3v-mid'), info = el2('div', 'x3v-info'), center = el2('div', 'x3v-center'); const cu = g.cover || g.coverFallback;
      if (cu) { const im = new Image(); im.alt = ''; im.onerror = () => im.remove(); im.src = imgUrl(cu); const bx = el2('div', 'x3v-box'); bx.append(im); info.append(bx); }
      const st = statusDef(g.status), a = g.achievements, ln = (t) => el2('div', 'x3v-ln', t);
      mid.append(ln(srcDef(g.source).name + ' · ' + fmtPlay(g.playTime)), ...((inf && inf.genres && inf.genres.length) ? [ln(inf.genres.join(', '))] : []), ...(inf && inf.metacritic ? [ln('Metacritic ' + inf.metacritic)] : []), ...(a && a.total ? [ln(`Logros ${a.unlocked} de ${a.total}`)] : []), ...(st ? [ln(st.label)] : []));
      info.append(mid); const mp = mediaPanel(g); if (mp) center.append(mp); center.append(info);
      body.append(row, center);
    } else if (tab === 'det') {
      const c1 = el2('div', 'x3v-c'), c2 = el2('div', 'x3v-c'), c3 = el2('div', 'x3v-c wide');
      const kv = (c, k, v) => { if (v) { c.append(el2('div', 'x3v-k', k), el2('div', 'x3v-v', v)); } };
      kv(c1, 'Desarrollador', inf && (inf.developers || []).join(', ')); kv(c1, 'Editor', inf && (inf.publishers || []).join(', ')); kv(c1, 'Género', inf && (inf.genres || []).join(', ')); kv(c1, 'Lanzamiento', inf && inf.releaseDate ? formatDate(inf.releaseDate) : ''); kv(c1, 'Metacritic', inf && inf.metacritic ? String(inf.metacritic) : '');
      c2.append(el2('div', 'x3v-h g', 'En tu biblioteca')); kv(c2, 'Origen', srcDef(g.source).name); kv(c2, 'Tiempo de juego', fmtPlay(g.playTime)); kv(c2, 'Última vez', fmtLast(g.lastPlayed)); kv(c2, 'En disco', g.diskBytes ? fmtBytes(g.diskBytes) : '');
      c3.append(el2('p', 'cc-desc' + (inf && inf.description ? '' : ' dim'), inf && inf.description ? inf.description : 'Este juego todavía no tiene información. Ábrelo en el lanzador y pulsa ℹ️ para buscarla.'));
      body.append(c1, c2, c3);
    } else if (tab === 'ach') {
      const wrap = el2('div', 'x3g'); body.append(wrap); setTimeout(() => x3AchGrid(g, wrap), 0);
    } else if (tab === 'gal') {
      const mp = mediaPanel(g); if (mp) body.append(mp);
    }
    page.append(head, bar, body);
  }
  function backDetail() { closeViewer(true); inlineStop(); if (S.det) { S.det.mfocus = false; S.det.afocus = false; } S.view = 'list'; showView(); hints(); paintList(S.det.id); if (isHome()) paintHome(true); if (isSearch()) paintSearch(); }
  function detAchMark() {
    const b = $c('.cc-d-body'); if (!b) return;
    const rows = [...b.querySelectorAll('.cc-ach')]; rows.forEach((r) => r.classList.remove('sel'));
    if (!S.det.afocus || !rows.length) return;
    S.det.asel = Math.max(0, Math.min(rows.length - 1, S.det.asel || 0));
    const r = rows[S.det.asel]; r.classList.add('sel');
    const br = b.getBoundingClientRect(), rr = r.getBoundingClientRect();
    b.scrollTo({ top: Math.max(0, b.scrollTop + (rr.top - br.top) - (b.clientHeight - rr.height) / 2), behavior: 'smooth' });
  }
  function detAchEnter() {
    const b = $c('.cc-d-body'); if (!b || !b.querySelector('.cc-ach')) { scrollAch(); return; }
    S.det.afocus = true; S.det.asel = 0; SND.open(); detAchMark(); hints();
  }
  function detAchLeave() { S.det.afocus = false; detAchMark(); hints(); }
  function scrollAch() { const b = $c('.cc-d-body'), sec = $c('.cc-d-body .cc-achs'); if (b && sec) b.scrollTo({ top: Math.max(0, sec.offsetTop - b.offsetTop - 8), behavior: 'smooth' }); }
  function achMark() {
    const pane = $c('.cc-achpane'); if (!pane) return;
    const rows = [...pane.querySelectorAll('.cc-ach')]; rows.forEach((r) => r.classList.remove('sel'));
    if (!S.achPane || !rows.length) return;
    S.achSel = Math.max(0, Math.min(rows.length - 1, S.achSel || 0));
    const r = rows[S.achSel]; r.classList.add('sel');
    const top = r.offsetTop - pane.offsetTop - (pane.clientHeight - r.offsetHeight) / 2;
    pane.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }
  function achStep(d) {
    const n = $c('.cc-achpane').querySelectorAll('.cc-ach').length; if (!n) return;
    const k = Math.max(0, Math.min(n - 1, (S.achSel || 0) + d)); if (k === S.achSel) return;
    S.achSel = k; SND.move(); achMark();
  }
  let achT = 0, achFor = null;
  function achPane(it) {
    const pane = $c('.cc-achpane'); clearTimeout(achT);
    const g = it && it.type === 'game' ? it.g : null;
    if (!g) { pane.replaceChildren(el2('p', 'cc-desc dim', 'No hay juegos con logros todavía.')); achFor = null; return; }
    if (achFor === g.id && pane.firstChild) return; achFor = g.id; pane.scrollTop = 0;
    const head = el2('div', 'cc-pane-head'); head.append(el2('h2', null, g.name));
    const sec = el2('div', 'cc-achs'); pane.replaceChildren(head, sec);
    achT = setTimeout(() => fillAchs(g, sec), 140); // al correr la lista no se piden todos los juegos
  }
  async function fillAchs(g, sec) {
    const data0 = g.achievements; if (!data0 || !data0.total) return;
    const draw = (d) => {
      if (!sec.isConnected) return; sec.replaceChildren();
      const pct = d.total ? Math.round(d.unlocked / d.total * 100) : 0;
      const h = el2('div', 'cc-ach-head'); h.append(el2('b', null, `Logros · ${d.unlocked} de ${d.total} (${pct} %)`));
      if (d.unlocked >= d.total) { const tr = el2('span', 'cc-trophy sm'); tr.innerHTML = trophySvg(); h.prepend(tr); }
      const bar = el2('div', 'cc-prog-bar big'); const f = el2('i'); f.style.width = pct + '%'; bar.append(f); sec.append(h, bar);
      if (!Array.isArray(d.list)) { sec.append(el2('p', 'cc-desc dim', 'Cargando la lista de logros…')); return; }
      const list = d.list.slice().sort((a, b) => (a.achieved !== b.achieved ? (a.achieved ? -1 : 1) : a.achieved ? b.unlockTime - a.unlockTime : (b.percent ?? -1) - (a.percent ?? -1)));
      const rows = el2('div', 'cc-ach-list');
      for (const a of list) {
        const r = el2('div', 'cc-ach' + (a.achieved ? ' got' : ''));
        const im = new Image(); im.alt = ''; im.loading = 'lazy'; const iu = (a.achieved ? a.icon : a.iconGray || a.icon) || ''; if (iu) im.src = iu; else im.style.visibility = 'hidden'; im.onerror = () => { im.style.visibility = 'hidden'; };
        const tx = el2('div', 'cc-ach-tx'); tx.append(el2('div', 'cc-ach-name', a.name));
        const desc = a.description || (a.hidden && !a.achieved ? 'Logro oculto' : ''); if (desc) tx.append(el2('div', 'cc-ach-desc', desc));
        const meta = el2('div', 'cc-ach-meta');
        if (a.percent != null) meta.append(el2('span', a.percent < 10 ? 'rare' : null, (a.percent < 10 ? '💎 ' : '') + a.percent.toLocaleString('es', { maximumFractionDigits: 1 }) + ' %'));
        if (a.achieved && a.unlockTime) meta.append(el2('span', null, new Date(a.unlockTime).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })));
        r.append(im, tx, meta); rows.append(r);
      }
      sec.append(rows); if (S.achPane && sec.closest('.cc-achpane')) achMark(); else if (S.view === 'detail' && S.det && S.det.afocus && sec.closest('.cc-d-body')) detAchMark();
    };
    setTimeout(() => { if (!sec.dataset.full) draw(data0); }, 0);
    if (!Array.isArray(data0.list)) {
      try { const r = await window.api.getAchievements(g.id, false); if (r && r.data && sec.isConnected) { g.achievements = r.data; sec.dataset.full = '1'; draw(r.data); if (S.det && S.det.scrollAch) { S.det.scrollAch = false; scrollAch(); } } else if (sec.isConnected) sec.querySelector('.cc-desc') && (sec.querySelector('.cc-desc').textContent = (r && r.error) || 'No se pudo cargar la lista.'); } catch (e) { console.error('logros', e); }
    } else if (S.det && S.det.scrollAch) { S.det.scrollAch = false; setTimeout(scrollAch, 60); }
  }
  function detBtns() { const g = byId(S.det.id); return g ? (cfg.ui === 'deck' ? dkBtns(g) : cfg.ui === 'x360' && X3_TABS ? x3Tiles(g) : detailButtons(g)) : []; }

  // ---------- Ajustes del modo consola ----------
  const CATS = ['Apariencia', 'Distribución', 'Texto y pantalla', 'Sonido', 'General'];
  const catRows = () => setRows().filter((r) => r.cat === S.cat);
  function setRows() {
    const th = THEMES.find((x) => x.id === cfg.theme) || THEMES[0];
    const cyc = (key, list) => (d) => { const i = list.findIndex((o) => o[0] === cfg[key]); cfg[key] = list[(i + d + list.length) % list.length][0]; };
    const lbl = (key, list) => (list.find((o) => o[0] === cfg[key]) || list[0])[1];
    const TH = THEMES.map((t) => [t.id, t.name]), BG = [['game', 'Banner del juego'], ['art', 'Ilustración del tema'], ['plain', 'Color liso']], TL = [['xs', 'Muy pequeñas'], ['s', 'Pequeñas'], ['m', 'Medianas'], ['l', 'Grandes'], ['xl', 'Muy grandes']], BN = [['side', 'Lateral con degradado'], ['full', 'Pantalla completa']], GP = [['s', 'Pegadas'], ['m', 'Normal'], ['l', 'Separadas']], RP = [['high', 'Alta'], ['mid', 'Media'], ['low', 'Baja']], SV = [['s', 'Bajo'], ['m', 'Medio'], ['l', 'Alto']], LY = [['auto', 'Automática (según la pantalla)'], ['row', 'Fila horizontal'], ['grid', 'Cuadrícula vertical']], BD = [['none', 'Sin borde'], ['thin', 'Fino'], ['normal', 'Normal']], RD = [['s', 'Rectas'], ['m', 'Redondeadas'], ['l', 'Muy redondeadas']], YN = [[true, 'Sí'], [false, 'No']], HB = [['game', 'Según el juego enfocado'], ['custom', 'Imagen propia'], ['plain', 'Color liso']], PI = [['auto', 'Automático'], ['xbox', 'Xbox'], ['ps', 'PlayStation'], ['nintendo', 'Nintendo'], ['generic', 'Genérico']], SF = [[0, 'Ninguno'], [2, '2 %'], [4, '4 %'], [6, '6 %'], [8, '8 %'], [10, '10 %']], TP = [['top', 'Arriba (texto)'], ['left', 'Izquierda (iconos)'], ['right', 'Derecha (iconos)']], OP = [['keep', 'Mantener el modo consola'], ['min', 'Minimizar el modo consola']], FN = [['s', 'Pequeña'], ['m', 'Normal'], ['l', 'Grande']], NM = [['focus', 'Solo el enfocado'], ['all', 'Todos']];
    const UIS = [['default', 'Clásico de Comptus'], ['x360', 'Xbox 360 (panel moderno)'], ['deck', 'Steam Big Picture (oscuro)']];
    const CAT_OF = { 'Estilo de interfaz': 0, 'Tarjeta del juego en ejecución': 1, 'Margen de pantalla (televisor)': 1, 'Tema de colores': 0, 'Colores según el juego': 0, 'Fondo de Inicio': 0, 'Elegir imagen para Inicio…': 0, 'Fondo': 0, 'Posición del banner': 0, 'Desenfocar el fondo': 0, 'Oscurecer el fondo': 0, 'Posición de las secciones': 1, 'Distribución': 1, 'Tamaño de las portadas': 1, 'Separación entre portadas': 1, 'Altura de la fila horizontal': 1, 'Esquinas de las portadas': 1, 'Borde de selección': 1, 'Mostrar título e información': 1, 'Mostrar nombres': 1, 'Tamaño de la letra': 2, 'Reloj y batería': 2, 'Sonidos': 3, 'Volumen de los sonidos': 3 };
    const X3B = [['grey', 'Gris Xbox 360'], ['game', 'Banner del juego'], ['custom', 'Imagen propia']], X3T = [['s', 'Pequeñas'], ['m', 'Medianas'], ['l', 'Grandes']];
    Object.assign(CAT_OF, { 'Fondo de pantalla': 0, 'Elegir imagen de fondo…': 0, 'Tamaño de las tarjetas': 1, 'Sonidos del menú Xbox 360': 3, 'Vibración del mando (Xbox 360)': 3, 'Vibración al cambiar de sección (Xbox 360)': 3, 'Oscurecer el fondo (Xbox 360)': 0, 'Fondo en movimiento (Xbox 360)': 0, 'Desenfocar el fondo (Xbox 360)': 0, 'Imagen solo para Inicio': 0, 'Elegir imagen para Inicio (Xbox 360)…': 0, 'Nombre del perfil (Xbox 360)': 4, 'Elegir una imagen propia…': 4, 'Foto de perfil': 4, 'Quitar la foto de perfil': 4 });
    const X3_ONLY = ['Vibración al cambiar de sección (Xbox 360)', 'Vibración del mando (Xbox 360)', 'Fondo en movimiento (Xbox 360)', 'Foto de perfil', 'Elegir una imagen propia…', 'Quitar la foto de perfil', 'Nombre del perfil (Xbox 360)', 'Imagen solo para Inicio', 'Elegir imagen para Inicio (Xbox 360)…', 'Oscurecer el fondo (Xbox 360)', 'Desenfocar el fondo (Xbox 360)', 'Fondo de pantalla', 'Elegir imagen de fondo…', 'Tamaño de las tarjetas', 'Sonidos del menú Xbox 360'];
    const CLASSIC_ONLY = ['Tema de colores', 'Colores según el juego', 'Fondo', 'Fondo de Inicio', 'Elegir imagen para Inicio…', 'Posición del banner', 'Posición de las secciones', 'Distribución', 'Desenfocar el fondo', 'Oscurecer el fondo', 'Tamaño de las portadas', 'Separación entre portadas', 'Altura de la fila horizontal', 'Borde de selección', 'Esquinas de las portadas', 'Mostrar título e información', 'Mostrar nombres'];
    const x3 = cfg.ui === 'x360', dk = cfg.ui === 'deck', DK_HIDE = ['Tema de colores', 'Colores según el juego', 'Posición de las secciones', 'Distribución'], DK_KEEP = ['Foto de perfil', 'Elegir una imagen propia…', 'Quitar la foto de perfil', 'Nombre del perfil (Xbox 360)'];
    return [
      { name: 'Fondo de pantalla', val: lbl('x3Bg', X3B) + (cfg.x3Bg === 'custom' && !cfg.x3BgPath ? ' (elige una imagen)' : ''), change: cyc('x3Bg', X3B) },
      { name: 'Elegir imagen de fondo…', val: cfg.x3BgPath ? cfg.x3BgPath.split(/[\\/]/).pop() : '', action: async () => {
        try { const p = await window.api.pickBackground(); if (!p) return; if (typeof isVideoPath === 'function' && isVideoPath(p)) { toast('Elige una imagen (no un vídeo)'); return; } cfg.x3BgPath = p; cfg.x3Bg = 'custom'; applyCfg(); save(); if (active) paintSettings(); toast('Fondo puesto ✓'); } catch { toast('No se pudo elegir la imagen'); }
      } },
      { name: 'Foto de perfil', val: /^perfiles\//.test(cfg.x3Pic || '') ? PICS[picIdx()][1] : (cfg.x3Pic ? 'Mi imagen' : 'Ninguna'), action: () => openPicBox() },
      { name: 'Elegir una imagen propia…', val: cfg.x3Pic && !/^perfiles\//.test(cfg.x3Pic) ? cfg.x3Pic.split(/[\\/]/).pop() : '', action: () => pickOwnPic() },
      ...(cfg.x3Pic ? [{ name: 'Quitar la foto de perfil', val: '', action: () => { cfg.x3Pic = ''; applyCfg(); save(); if (active) paintSettings(); toast('Foto de perfil quitada'); } }] : []),
      { name: 'Nombre del perfil (Xbox 360)', val: cfg.x3Name || S.uname || 'Jugador', action: () => openNameBox() },
      { name: 'Imagen solo para Inicio', val: cfg.x3HomeBg === 'custom' ? (cfg.x3HomePath ? 'Sí' : 'Sí (elige una imagen)') : 'No', change: () => { cfg.x3HomeBg = cfg.x3HomeBg === 'custom' ? 'off' : 'custom'; } },
      { name: 'Elegir imagen para Inicio (Xbox 360)…', val: cfg.x3HomePath ? cfg.x3HomePath.split(/[\\/]/).pop() : '', action: async () => {
        try { const p = await window.api.pickBackground(); if (!p) return; if (typeof isVideoPath === 'function' && isVideoPath(p)) { toast('Elige una imagen (no un vídeo)'); return; } cfg.x3HomePath = p; cfg.x3HomeBg = 'custom'; applyCfg(); save(); if (active) paintSettings(); toast('Imagen de Inicio puesta ✓'); } catch { toast('No se pudo elegir la imagen'); }
      } },
      { name: 'Oscurecer el fondo (Xbox 360)', val: (cfg.x3Dim || 0) ? cfg.x3Dim + ' %' : 'No', change: (d) => { cfg.x3Dim = Math.max(0, Math.min(90, (+cfg.x3Dim || 0) + d * 10)); } },
      { name: 'Fondo en movimiento (Xbox 360)', val: cfg.x3Move ? 'Sí' : 'No', change: () => { cfg.x3Move = !cfg.x3Move; } },
      { name: 'Desenfocar el fondo (Xbox 360)', val: cfg.x3Blur ? cfg.x3Blur + ' px' : 'No', change: (d) => { cfg.x3Blur = Math.max(0, Math.min(30, (+cfg.x3Blur || 0) + d * 5)); } },
      { name: 'Tamaño de las tarjetas', val: lbl('x3Tile', X3T), change: cyc('x3Tile', X3T) },
      { name: 'Vibración del mando (Xbox 360)', val: cfg.x3Rumble === false ? 'No' : 'Sí', change: () => { cfg.x3Rumble = cfg.x3Rumble === false; if (cfg.x3Rumble) rumble(false); } },
      { name: 'Vibración al cambiar de sección (Xbox 360)', val: cfg.x3Tick === false ? 'No' : 'Sí', change: () => { cfg.x3Tick = cfg.x3Tick === false; if (cfg.x3Tick) rumble('tick'); } },
      { name: 'Sonidos del menú Xbox 360', val: cfg.x3Snd === false ? 'No' : 'Sí', change: () => { cfg.x3Snd = cfg.x3Snd === false; } },
      { name: 'Estilo de interfaz', val: lbl('ui', UIS), change: (d) => { cyc('ui', UIS)(d); const want = cfg.ui === 'x360' ? 'x360m' : cfg.ui === 'x360b' ? 'x360d' : cfg.ui === 'deck' ? 'deck' : null; if (want) { if (!/^(x360|deck)/.test(cfg.theme)) cfg.prevTheme = cfg.theme; if (cfg.ui === 'deck' || !/^x360/.test(cfg.theme)) cfg.theme = want; } else if (/^(x360|deck)/.test(cfg.theme)) cfg.theme = cfg.prevTheme && !/^(x360|deck)/.test(cfg.prevTheme) ? cfg.prevTheme : 'midnight'; } },
      { name: 'Tema de colores', val: th.name, change: cyc('theme', TH), swatch: th },
      { name: 'Colores según el juego', val: lbl('adapt', YN), change: cyc('adapt', YN) },
      { name: 'Tarjeta del juego en ejecución', val: lbl('nowCard', YN), change: cyc('nowCard', YN) },
      { name: 'Margen de pantalla (televisor)', val: lbl('safe', SF), change: cyc('safe', SF) },
      { name: 'Fondo', val: lbl('bgMode', BG), change: cyc('bgMode', BG) },
      { name: 'Fondo de Inicio', val: lbl('homeBg', HB) + (cfg.homeBg === 'custom' && !cfg.homeBgPath ? ' (elige una imagen)' : ''), change: cyc('homeBg', HB) },
      { name: 'Elegir imagen para Inicio…', val: cfg.homeBgPath ? cfg.homeBgPath.split(/[\\/]/).pop() : '', action: async () => {
        try { const p = await window.api.pickBackground(); if (!p) return; if (typeof isVideoPath === 'function' && isVideoPath(p)) { toast('Para Inicio elige una imagen (no un vídeo)'); return; } cfg.homeBgPath = p; cfg.homeBg = 'custom'; applyCfg(); save(); if (active) paintSettings(); toast('Fondo de Inicio puesto ✓'); } catch { toast('No se pudo elegir la imagen'); }
      } },
      { name: 'Posición del banner', val: lbl('banner', BN), change: cyc('banner', BN) },
      { name: 'Posición de las secciones', val: lbl('tabsPos', TP), change: cyc('tabsPos', TP) },
      { name: 'Distribución', val: lbl('layout', LY), change: cyc('layout', LY) },
      { name: 'Desenfocar el fondo', val: cfg.blur ? cfg.blur + ' px' : 'No', change: (d) => { cfg.blur = Math.max(0, Math.min(30, (cfg.blur || 0) + d * 5)); } },
      { name: 'Oscurecer el fondo', val: cfg.dim + ' %', change: (d) => { cfg.dim = Math.max(20, Math.min(90, cfg.dim + d * 10)); } },
      { name: 'Tamaño de las portadas', val: lbl('tile', TL), change: cyc('tile', TL) },
      { name: 'Separación entre portadas', val: lbl('gap', GP), change: cyc('gap', GP) },
      { name: 'Altura de la fila horizontal', val: lbl('rowPos', RP), change: cyc('rowPos', RP) },
      { name: 'Sonidos', val: cfg.sound ? 'Sí' : 'No', change: () => { cfg.sound = !cfg.sound; } },
      { name: 'Volumen de los sonidos', val: lbl('vol', SV), change: cyc('vol', SV) },
      { name: 'Tamaño de la letra', val: lbl('font', FN), change: cyc('font', FN) },
      { name: 'Borde de selección', val: lbl('border', BD), change: cyc('border', BD) },
      { name: 'Esquinas de las portadas', val: lbl('radius', RD), change: cyc('radius', RD) },
      { name: 'Mostrar título e información', val: cfg.info === false ? 'No' : 'Sí', change: () => { cfg.info = cfg.info === false; } },
      { name: 'Mostrar nombres', val: lbl('names', NM), change: cyc('names', NM) },
      { name: 'Reloj y batería', val: cfg.clock ? 'Sí' : 'No', change: () => { cfg.clock = !cfg.clock; } },
      { name: 'Abrir Comptus en modo consola', val: couchStart ? 'Sí' : 'No', change: () => { couchStart = !couchStart; window.api.setSettings({ couchStart }); const c = document.getElementById('couchStart'); if (c) c.checked = couchStart; }, noSave: true },
      { name: 'Iconos del mando', val: lbl('padIcons', PI) + (cfg.padIcons === 'auto' && window.PadIcons ? ' (' + PadIcons.TYPES[PadIcons.cur()] + ')' : ''), change: cyc('padIcons', PI) },
      { name: 'Al iniciar un juego', val: lbl('onPlay', OP), change: cyc('onPlay', OP) },
      { name: 'Actualizar la biblioteca', val: '', action: () => { refreshLibrary(); } },
      { name: 'Restablecer estos ajustes', val: '', action: () => { cfg = { ...DEF }; } },
      { name: 'Ajustes cargados desde', val: '', info: loadSrc, action: () => {} },
      { name: 'Salir del modo consola', val: '', action: () => exit() },
      { name: 'Guardar ajustes ahora', val: '', action: () => saveNow() },
    ].filter((r) => x3 ? !CLASSIC_ONLY.includes(r.name) : dk ? (!X3_ONLY.includes(r.name) || DK_KEEP.includes(r.name)) && !DK_HIDE.includes(r.name) : !X3_ONLY.includes(r.name)).sort((a, b) => (b.name === 'Estilo de interfaz') - (a.name === 'Estilo de interfaz')).map((r) => ({ ...r, cat: CAT_OF[r.name] ?? 4 }));
  }
  function paintSettings() {
    const page = $c('.cc-settings'); page.replaceChildren();
    const side = el2('div', 'cc-s-cats'); side.append(el2('h1', 'cc-s-title', 'Ajustes'));
    CATS.forEach((n, i) => { const b = el2('div', 'cc-s-cat' + (i === S.cat ? ' on' : '') + (i === S.cat && S.col === 'cat' ? ' sel' : ''), n); b.onclick = () => { S.cat = i; S.col = 'cat'; S.set = 0; SND.move(); paintSettings(); }; side.append(b); });
    const wrap = el2('div', 'cc-s-wrap' + (S.col === 'rows' ? ' focus' : ''));
    const rows = catRows(); if (S.set >= rows.length) S.set = Math.max(0, rows.length - 1);
    rows.forEach((r, i) => {
      const row = el2('div', 'cc-s-row' + (i === S.set && S.col === 'rows' ? ' sel' : '') + (r.action ? ' act' : '')); row.dataset.i = i;
      row.append(el2('span', 'cc-s-name', r.name));
      if (r.swatch) { const sw = el2('span', 'cc-sw'); sw.style.background = `linear-gradient(90deg, ${r.swatch.bg} 0 34%, ${r.swatch.panel} 34% 60%, ${r.swatch.accent} 60% 82%, ${r.swatch.accent2} 82%)`; row.append(sw); }
      if (r.info) row.append(el2('span', 'cc-s-info', r.info));
      if (!r.action && cfg.ui === 'deck' && /^(Sí|No)( |$)/.test(r.val)) { const on = r.val.startsWith('Sí'), t = el2('span', 'dk-sw' + (on ? ' on' : '')); t.append(el2('i')); row.append(t); if (r.val.length > 3) row.append(el2('span', 'cc-s-info', r.val.slice(3))); }
      else if (!r.action) { const v = el2('span', 'cc-s-val'); v.append(el2('i', null, '‹'), document.createTextNode(' ' + r.val + ' '), el2('i', null, '›')); row.append(v); }
      row.onmouseenter = () => { if (padActive() || (S.col === 'rows' && S.set === i)) return; S.col = 'rows'; S.set = i; page.querySelectorAll('.cc-s-row').forEach((e, k) => e.classList.toggle('sel', k === i)); page.querySelectorAll('.cc-s-cat').forEach((e) => e.classList.remove('sel')); wrap.classList.add('focus'); hints(); };
      row.onclick = () => { S.col = 'rows'; S.set = i; settingsAct(0, true); };
      wrap.append(row);
    });
    page.append(side, wrap);
    const sel = wrap.querySelector('.sel'); if (sel) wrap.scrollTop = Math.max(0, sel.offsetTop - wrap.clientHeight / 2);
  }

  function settingsAct(d, fromA) {
    const rows = catRows(), r = rows[S.set]; if (!r) return;
    if (r.action) { if (fromA) { SND.open(); r.action(); if (r.name.startsWith('Restablecer')) { applyCfg(); save(); } if (active) paintSettings(); } return; }
    r.change(d || 1); SND.change(); applyCfg(); if (!r.noSave) save(); paintSettings(); mark(true); paintHero();
  }

  // ---------- Entrada (mando, teclado) ----------
  const captures = () => active && !document.querySelector('.ctx-menu') && !document.querySelector('.modal:not(.hidden)') && !document.querySelector('.lightbox');
  function x3DetNav(dir) {
    const g = byId(S.det.id); if (!g) return; const tab = S.det.tab || 'ov', lr = dir === 'left' || dir === 'right', d = dir === 'right' || dir === 'down' ? 1 : -1;
    const setBtn = (k) => { S.det.btn = k; SND.move(); const r = $c('.cc-det-btns'); if (r) r.querySelectorAll('.cc-btn').forEach((e, i) => e.classList.toggle('sel', i === k)); };
    if (tab === 'ov') {
      const n = detBtns().length, b = S.det.btn, col = b % 2;
      if (dir === 'right') { if (col === 0 && b + 1 < n) setBtn(b + 1); else x3DetStep(1); }
      else if (dir === 'left') { if (col === 1) setBtn(b - 1); else x3DetStep(-1); }
      else { const nb = b + (dir === 'down' ? 2 : -2); if (nb >= 0 && nb < n) setBtn(nb); else if (dir === 'down' && b + 1 < n && b % 2 === 0 && nb >= n) setBtn(n - 1); }
    } else if (tab === 'det') { if (lr) x3DetStep(d); else { const c = $c('.x3v-det'); if (c) c.scrollBy({ top: d * 140, behavior: 'smooth' }); } }
    else if (tab === 'ach') x3AchMove(dir);
    else if (tab === 'gal') { if (lr) { const n = mediaOf(g).all.length, i = (S.det.mi || 0) + d; if (i < 0 || i >= n) x3DetStep(d); else { SND.move(); showMedia(i, true); } } }
  }
  function nav(dir) {
    if (!captures()) return;
    if (S.pp) { ppMove(dir); return; }
    if (S.nm) { nmMove(dir); return; }
    if (S.viewer) { if (dir === 'left') viewerMove(-1); else if (dir === 'right') viewerMove(1); return; }
    if (S.view === 'detail' && cfg.ui === 'deck' && !S.menu) { dkDetNav(dir); return; }
    if (S.view === 'detail' && cfg.ui === 'x360' && X3_TABS && !S.menu) { x3DetNav(dir); return; }
    if (S.view === 'detail' && S.det.afocus) { if (dir === 'up' || dir === 'down') { const n = $c('.cc-d-body').querySelectorAll('.cc-ach').length, k = Math.max(0, Math.min(n - 1, (S.det.asel || 0) + (dir === 'down' ? 1 : -1))); if (k !== S.det.asel) { S.det.asel = k; SND.move(); detAchMark(); } } else if (dir === 'left') { SND.back(); detAchLeave(); } return; }
    if (S.view === 'detail' && S.det.mfocus) { if (dir === 'left') mediaMove(-1); else if (dir === 'right') mediaMove(1); return; }
    if (S.menu) { if (dir === 'up') menuMove(-1); else if (dir === 'down') menuMove(1); else if (S.menu.guide) guideMove(dir === 'left' ? -1 : 1); return; }
    if (S.view === 'detail') {
      if (dir === 'left' || dir === 'right') { const n = detBtns().length; S.det.btn = Math.max(0, Math.min(n - 1, S.det.btn + (dir === 'right' ? 1 : -1))); $c('.cc-det-btns').querySelectorAll('.cc-btn').forEach((e, k) => e.classList.toggle('sel', k === S.det.btn)); }
      else if (cfg.ui === 'x360') { const n = detBtns().length, nb = S.det.btn + (dir === 'down' ? 2 : -2); if (nb >= 0 && nb < n) { S.det.btn = nb; $c('.cc-det-btns').querySelectorAll('.cc-btn').forEach((e, k) => e.classList.toggle('sel', k === S.det.btn)); } else $c('.cc-d-body').scrollTop += dir === 'down' ? 140 : -140; }
      else $c('.cc-d-body').scrollTop += dir === 'down' ? 140 : -140;
      return;
    }
    if (isHome()) { homeNav(dir); return; }
    if (isSearch()) { if (cfg.ui === 'deck' && S.view === 'list' && !SR.q.trim()) { dkSrClose(() => nav(dir), true); return; } searchNav(dir); return; } // Steam: con la barra vacía, moverte a otro elemento la quita
    if (S.tabs[S.tab].id === 'settings') {
      if (S.col === 'cat') {
        if (dir === 'up' || dir === 'down') { S.cat = Math.max(0, Math.min(CATS.length - 1, S.cat + (dir === 'down' ? 1 : -1))); S.set = 0; SND.move(); paintSettings(); }
        else if (dir === 'right') { S.col = 'rows'; SND.open(); paintSettings(); hints(); }
        return;
      }
      const n = catRows().length;
      if (dir === 'up' || dir === 'down') { S.set = Math.max(0, Math.min(n - 1, S.set + (dir === 'down' ? 1 : -1))); SND.move(); paintSettings(); }
      else if ((catRows()[S.set] || {}).action) { if (dir === 'left') { S.col = 'cat'; SND.back(); paintSettings(); hints(); } }
      else settingsAct(dir === 'right' ? 1 : -1, false);
      return;
    }
    if (box.classList.contains('ach-view')) {
      const pane = $c('.cc-achpane');
      if (dir === 'right') { if (!S.achPane) { S.achPane = true; S.achSel = 0; pane.classList.add('focus'); SND.open(); achMark(); hints(); } }
      else if (dir === 'left') { if (S.achPane) { S.achPane = false; pane.classList.remove('focus'); SND.back(); achMark(); hints(); } }
      else if (S.achPane) achStep(dir === 'down' ? 1 : -1);
      else select(curIdx() + (dir === 'down' ? 1 : -1));
      return;
    }
    if (box.classList.contains('bl-rows')) { // estilo Xbox 360: ↑↓ eligen juego y ◀▶ cambian de «blade»
      if (dir === 'up' || dir === 'down') select(curIdx() + (dir === 'down' ? 1 : -1)); else if (!S.sub) gotoTab(S.tab + (dir === 'right' ? 1 : -1)); else if (dir === 'left') back();
      return;
    }
    if (box.classList.contains('x3-colls')) { // colecciones como el Inicio: mosaico, se mueve por posición
      const L = [...$c('.cc-strip').children].filter((t) => t.dataset && t.dataset.i != null).map((el) => ({ el })), j = L.length ? x3Pick(L, Math.min(curIdx(), L.length - 1), dir) : -1;
      if (j >= 0) select(j);
      return;
    }
    if (dir === 'left') select(curIdx() - 1); else if (dir === 'right') select(curIdx() + 1);
    else if ((dir === 'up' || dir === 'down') && gridNow()) select(curIdx() + (dir === 'down' ? 1 : -1) * gridCols());
  }
  function gridCols() { const k = [...$c('.cc-strip').children]; if (!k.length) return 1; const n = k.findIndex((t) => t.offsetTop > k[0].offsetTop + 4); return n < 0 ? k.length : n; }
  function leaveSettings() {
    const p = S.prev, ti = p ? S.tabs.findIndex((t) => t.id === p.id) : -1;
    gotoTab(ti >= 0 ? ti : S.tabs.findIndex((t) => t.id === 'all'));
    if (ti < 0) return;
    if (p.sub) { const it = S.items.find((x) => (x.type === 'coll' ? x.c.name : x.s && x.s.name) === p.sub); if (it) S.sub = { title: p.sub, items: gameItems(it.games), idx: 0, parent: S.idx }; }
    paintList(p.focus);
  }
  function back() {
    if (!captures()) return;
    if (S.pp) { SND.back(); ppClose(); return; }
    if (S.nm) { nmClose(false); return; }
    if (S.viewer) { closeViewer(); return; }
    if (S.view === 'detail' && cfg.ui === 'deck' && !S.menu) { SND.back(); return dkBack(); }
    if (S.view === 'detail' && cfg.ui === 'x360' && X3_TABS && !S.menu) { SND.back(); return backDetail(); }
    if (S.view === 'detail' && S.det.afocus) { SND.back(); detAchLeave(); return; }
    if (S.view === 'detail' && S.det.mfocus) { SND.back(); mediaLeave(); return; }
    if (S.menu) { SND.back(); closeCMenu(); return; }
    if (S.achPane && S.view !== 'detail') { S.achPane = false; $c('.cc-achpane').classList.remove('focus'); SND.back(); achMark(); hints(); return; }
    if (S.view === 'detail' || S.sub) SND.back();
    if (S.view === 'detail') return backDetail();
    if (S.sub) { S.sub = null; paintList(); return; }
    if (cfg.ui === 'deck' && isSearch() && S.view === 'list') { dkSrClose(); return; }
    if (isSearch() && S.view === 'list') { if (SR.zone === 'res') { SR.zone = 'kb'; SND.back(); searchMark(); hints(); } else searchBack(); return; }
    if (isSettings()) { if (S.col === 'rows') { S.col = 'cat'; SND.back(); paintSettings(); hints(); return; } if (cfg.ui === 'deck') { SND.back(); deckGo('home'); return; } leaveSettings(); return; }
    if (cfg.ui === 'deck' && !isHome()) { SND.back(); deckGo('home'); return; }
    /* en las pantallas principales B no cierra: se sale con Select + X (menú) */
  }
  function accept() {
    if (!captures()) return;
    if (S.pp) { ppPress(); return; }
    if (S.nm) { nmPress(); return; }
    if (S.viewer) { viewerToggle(); return; }
    if (S.view === 'detail' && cfg.ui === 'deck' && !S.menu) { dkDetAccept(); return; }
    if (S.view === 'detail' && S.det.afocus) return;
    if (S.view === 'detail' && S.det.mfocus) { mediaAccept(); return; }
    if (S.menu) { runMenu(); return; }
    if (S.view === 'detail') { const b = detBtns()[S.det.btn]; if (b) b.run(); return; }
    if (isSettings()) { if (S.col === 'cat') { S.col = 'rows'; SND.open(); paintSettings(); hints(); return; } return settingsAct(0, true); }
    if (isHome()) { homeAccept(); return; }
    if (isSearch()) { if (cfg.ui === 'deck' && hintMode !== 'pad' && SR.zone === 'kb') { if (SR.res.length) { SR.zone = 'res'; SR.ri = 0; SND.open(); searchMark(); hints(); } return; } searchAccept(); return; }
    open();
  }
  function btn(i) { // numeración estándar del mando
    if (!captures()) return;
    if (S.pp) { if (i === 0) accept(); else if (i === 1) back(); return; }
    if (S.nm) { if (i === 0) accept(); else if (i === 1) back(); else if (i === 2) { S.nm.t = S.nm.t.slice(0, -1); nmUpdate(); } else if (i === 3) nmType(' '); return; }
    if (S.viewer || S.menu) { if (i === 0) accept(); else if (i === 1) back(); return; }
    if (isSearch() && S.view === 'list' && (i === 2 || i === 3) && !padHeld(8)) { searchBtn(i); return; }
    if (i === 0) accept(); else if (i === 1) back();
    else if (i === 2) { if (padHeld(8)) sysMenu(); else play(curGame()); } else if (i === 3) menu();
    else if (i === 4) (S.view === 'detail' && cfg.ui === 'deck' ? dkStep(-1) : S.view === 'detail' && cfg.ui === 'x360' && X3_TABS ? x3DetStep(-1) : stepTab(-1)); else if (i === 5) (S.view === 'detail' && cfg.ui === 'deck' ? dkStep(1) : S.view === 'detail' && cfg.ui === 'x360' && X3_TABS ? x3DetStep(1) : stepTab(1));
    else if (i === 9) gotoTab(S.tabs.length - 1);
  }
  function axis(v) { // LT / RT / palanca derecha
    if (!captures() || !v || S.menu) return;
    if (S.view === 'detail') { $c('.cc-d-body').scrollTop += v * 28; return; }
    if (isSettings() || isHome() || isSearch()) return;
    const now = Date.now(); if (now - lastAxis < 160) return; lastAxis = now;
    select(curIdx() + (v > 0 ? 1 : -1) * (gridNow() ? gridCols() * 3 : 8));
  }
  function onKey(e) {
    if (window.__overlayOpen) return;
    if (!active || e.ctrlKey || e.altKey || e.metaKey) return;
    if (document.querySelector('.ctx-menu') || document.querySelector('.modal:not(.hidden)') || document.querySelector('.lightbox')) return;
    const k = e.key, map = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    if (isSearch() && S.view === 'list' && !S.menu && !S.viewer) {
      if (cfg.ui === 'deck' && k === 'F4') { SR.q = ''; SR.ri = 0; SR.zone = 'kb'; SND.back(); paintSearch(); hints(); e.preventDefault(); e.stopPropagation(); return; }
      if (k === 'Backspace') { if (cfg.ui === 'deck' && SR.zone === 'res') SR.zone = 'kb'; searchBack(); e.preventDefault(); e.stopPropagation(); return; }
      if (k === 'Tab') { e.preventDefault(); e.stopPropagation(); if (SR.zone === 'res') searchStore(); return; }
      if ((SR.zone === 'kb' || cfg.ui === 'deck') && k.length === 1 && /[\p{L}\p{N} .'&:\-]/u.test(k) && !(cfg.ui !== 'deck' && !SR.q && /^[qe]$/i.test(k))) { if (SR.zone !== 'kb') { SR.zone = 'kb'; hints(); } searchType(k); e.preventDefault(); e.stopPropagation(); return; }
    }
    if (S.nm) {
      if (k === 'Enter' && S.nm.phys) { nmClose(true); e.preventDefault(); e.stopPropagation(); return; }
      if (k === 'Backspace') { S.nm.phys = true; S.nm.t = S.nm.t.slice(0, -1); nmSelKey('⌫'); nmUpdate(); e.preventDefault(); e.stopPropagation(); return; }
      if (k.length === 1 && /[\p{L}\p{N} ._\-]/u.test(k)) { S.nm.phys = true; nmSelKey(k === ' ' ? '␣' : k.toUpperCase()); nmType(k); e.preventDefault(); e.stopPropagation(); return; }
    }
    let h = true;
    if (map[k]) nav(map[k]); else if (k === 'Enter') accept(); else if (k === 'Escape' || k === 'Backspace') back();
    else if (k === 'PageDown' || (k.toLowerCase() === 'e' && !(isSearch() && SR.zone === 'kb' && S.view === 'list' && SR.q))) (S.view === 'detail' && cfg.ui === 'deck' ? dkStep(1) : S.view === 'detail' && cfg.ui === 'x360' && X3_TABS ? x3DetStep(1) : stepTab(1)); else if (k === 'PageUp' || (k.toLowerCase() === 'q' && !(isSearch() && SR.zone === 'kb' && S.view === 'list' && SR.q))) (S.view === 'detail' && cfg.ui === 'deck' ? dkStep(-1) : S.view === 'detail' && cfg.ui === 'x360' && X3_TABS ? x3DetStep(-1) : stepTab(-1));
    else if (S.menu || S.viewer) {} else if (k === 'Home') select(0); else if (k === 'End') select(cur().length - 1);
    else if (k === 'F2') sysMenu();
    else if (S.menu || S.viewer) { /* con un menú abierto solo flechas, Enter y Esc */ }
    else if (k.toLowerCase() === 'p') play(curGame()); else if (k.toLowerCase() === 'm') menu(); else if (k.toLowerCase() === 'f') favorite();
    else if (k === 'F1') { if (cfg.ui === 'deck') sysMenu(); else gotoTab(S.tabs.length - 1); }
    else h = false;
    if (h) { e.preventDefault(); e.stopPropagation(); }
  }

  // ---------- Estilo «Steam Big Picture»: menú lateral (F1) y menú de apagado ----------
  function deckGo(id) { const i = S.tabs.findIndex((t) => t.id === id); if (i < 0) return; if (S.view === 'detail') backDetail(); gotoTab(i); }
  function deckMenu() {
    const has = (id) => S.tabs.some((t) => t.id === id);
    cmenu('Menú', [
      { label: 'Inicio', ic: 'home', run: () => deckGo('home') },
      { label: 'Biblioteca', ic: 'all', run: () => deckGo('all') },
      has('search') && { label: 'Buscar', ic: 'search', run: () => deckGo('search') },
      has('ach') && { label: 'Logros', ic: 'ach', run: () => deckGo('ach') },
      { label: 'Colecciones', ic: 'colls', run: () => deckGo('colls') },
      { label: 'Parámetros', ic: 'settings', run: () => deckGo('settings') },
      { label: 'Mi perfil', ic: 'home', run: () => dkProfile() },
      { label: 'Iniciar/Apagar', ic: 'power', run: () => deckPower() },
    ], { side: true });
  }
  function deckPower() {
    const rg = runState ? state.games.find((g) => runStateFor(g)) : null;
    cmenu('Iniciar/Apagar', [
      { label: 'Suspender el sistema', run: () => confirmPower('sleep', '¿Suspender el equipo?') },
      { label: 'Apagar el sistema', run: () => confirmPower('shutdown', '¿Apagar el equipo?') },
      { label: 'Reiniciar el sistema', run: () => confirmPower('restart', '¿Reiniciar el equipo?') },
      { sep: true },
      { label: 'Bloquear', run: () => { try { window.api.systemPower('lock'); } catch {} } },
      { sep: true },
      rg && { label: 'Cerrar «' + rg.name + '»', danger: true, run: () => { try { stopGame(rg); } catch {} } },
      { label: 'Salir del modo consola', danger: true, run: () => exit() },
      { label: 'Salir de Comptus', danger: true, run: () => { saveNow(); try { window.api.quitApp(); } catch {} } },
      { sep: true },
      { label: 'Cancelar', run: () => {} },
    ]);
  }

  // Campana: panel lateral derecho con la actividad reciente
  function deckNotif() {
    const hm = (t) => { const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'ahora' : m < 60 ? m + ' min' : new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); };
    const ic = { friend: '👥 ', ach: '🏆 ', wish: '🏷 ', events: '🎉 ', free: '🎁 ' };
    const items = S.notes.length ? S.notes.map((n) => ({ label: (ic[n.kind] || '') + n.title, value: hm(n.at), run: () => { n.read = true; bellSync(); if (n.act) n.act(); else { const i = S.tabs.findIndex((t) => t.id === 'home'); if (i >= 0) gotoTab(i); } } })) : [{ label: 'No hay notificaciones nuevas', run: () => {} }];
    S.notes.forEach((n) => { n.read = true; }); bellSync();
    cmenu('Notificaciones', items, { side: true, right: true });
  }

  // Perfil de Steam (como la pantalla de perfil de Steam Big Picture): foto, nombre, estado, accesos a Steam y código de amigo
  const PF_ST = [['online', 'Conectado'], ['away', 'Ausente'], ['busy', 'Ocupado'], ['invisible', 'Invisible'], ['offline', 'Desconectado']];
  const pfStLabel = (n) => n === 0 ? 'Desconectado' : n === 2 ? 'Ocupado' : n === 3 || n === 4 ? 'Ausente' : 'Conectado';
  function dkProfile() {
    const items = [];
    const act = (a, msg) => () => { try { window.api.profileAction(a); } catch {} toast(msg); };
    items.push({ pf: 'view', label: 'Ver perfil', run: () => { const P = S.prof; if (P && P.ok && P.url && window.api.friendsOpen) { window.api.friendsOpen(P.url); toast('Abriendo el perfil…'); } else toast('Aún no se pudo leer tu perfil'); } });
    items.push({ pf: 'state', label: 'Tu estado', run: () => cmenu('Tu estado', PF_ST.map(([k, l]) => ({ label: l, run: () => { try { window.api.profileAction('status:' + k); } catch {} S.profSt = k; toast('Estado: ' + l + ' (si Steam está abierto)'); setTimeout(dkProfile, 300); } })), { side: true, right: true }) });
    items.push({ pf: 'tile', ic: 'funds', label: 'Añadir fondos', sub: 'Tienda de Steam', run: act('funds', 'Abriendo Steam…') });
    items.push({ pf: 'tile', ic: 'eye', label: 'Ajustes de privacidad', sub: 'Perfil, juegos, inventario, etc.', run: act('privacy', 'Abriendo Steam…') });
    items.push({ pf: 'tile', ic: 'edit', label: 'Detalles de la cuenta', sub: 'Tienda, seguridad, familia, dispositivos', run: act('account', 'Abriendo Steam…') });
    items.push({ pf: 'add', label: 'Añadir amigos', run: act('addfriend', 'Abriendo Steam…') });
    SND.menu(); S.menu = { title: 'Perfil', items, idx: 0, prof: true };
    let ov = $c('.cc-menu-ov'); if (!ov) { ov = el2('div', 'cc-menu-ov'); box.append(ov); }
    paintMenu(true); animIn($c('.cc-menu-ov')); hints();
    const m0 = S.menu;
    if (window.api.profileGet) window.api.profileGet(false).then((r) => { S.prof = r; if (S.menu === m0) paintMenu(false); }).catch(() => {});
  }
  const PF_IC = { funds: '<rect x="3" y="6" width="18" height="12" rx="1.5" fill="currentColor" stroke="none"/><path d="M3 10h18" stroke="#20242c" stroke-width="2"/><path d="M6 15h5" stroke="#20242c" stroke-width="1.6"/>', eye: '<path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.8"/><path d="M4 20L20 4"/>', edit: '<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z" fill="currentColor"/>' };
  function paintProf(ov) {
    const P = S.prof && S.prof.ok ? S.prof : null, it = S.menu.items, wrap = el2('div', 'dk-prof' + (S.menu.fresh ? '' : '')), mk = (i, cls) => { const e = el2('div', 'cc-menu-it dk-pi ' + cls + (i === S.menu.idx ? ' sel' : '')); e.dataset.i = i; e.onclick = () => { S.menu.idx = i; runMenu(); }; e.onmouseenter = () => { if (padActive() || !S.menu || S.menu.idx === i) return; S.menu.idx = i; wrap.querySelectorAll('.dk-pi').forEach((x) => x.classList.toggle('sel', +x.dataset.i === i)); }; return e; };
    const name = (P && P.name) || cfg.x3Name || S.uname || 'Jugador', st = P ? (S.profSt ? (PF_ST.find((x) => x[0] === S.profSt) || [0, pfStLabel(P.state)])[1] : pfStLabel(P.state)) : 'Cargando…';
    const head = el2('div', 'dk-ph'); const av = el2('div', 'dk-pav'); const au = P && P.avatar ? P.avatar : (cfg.x3Pic ? picSrc(cfg.x3Pic) : ''); if (au) av.style.backgroundImage = `url("${au}")`; else av.textContent = name.charAt(0).toUpperCase();
    const tx = el2('div', 'dk-ptx'); tx.append(el2('div', 'dk-pn', name), el2('div', 'dk-pst', st)); if (P && P.level != null) tx.append(el2('div', 'dk-plv', 'Nivel de Steam ' + P.level)); head.append(av, tx);
    const b0 = mk(0, 'dk-pbtn dk-pview'); b0.textContent = it[0].label; head.append(b0); wrap.append(head);
    if (S.prof && !S.prof.ok) wrap.append(el2('div', 'dk-pnote', S.prof.code === 'nosteam' ? 'No se encontró tu cuenta de Steam. Inicia sesión en Steam o escribe tu SteamID en Ajustes.' : 'No se pudo consultar a Steam. Revisa tu conexión.'));
    else if (P && !P.hasKey) wrap.append(el2('div', 'dk-pnote', 'Pon tu clave de la API de Steam en Ajustes para ver tu foto, estado y nivel.'));
    const r1 = mk(1, 'dk-prow'); const l = el2('div'); l.append(el2('div', 'dk-pt', 'Tu estado'), el2('div', 'dk-ps', 'Cómo te ven otras personas')); const dd = el2('div', 'dk-pdd', st); r1.append(l, dd); wrap.append(r1);
    const tiles = el2('div', 'dk-ptiles'); [2, 3, 4].forEach((i) => { const t = mk(i, 'dk-ptile'); const ic = el2('i'); ic.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${PF_IC[it[i].ic]}</svg>`; t.append(ic, el2('div', 'dk-pt', it[i].label), el2('div', 'dk-ps', it[i].sub)); tiles.append(t); }); wrap.append(tiles);
    const r5 = el2('div', 'dk-prow dk-pfc'); const fc = el2('div', 'dk-pt'); fc.append(document.createTextNode('Código de amigo: '), el2('b', null, P ? P.friendCode : '…')); r5.append(fc); const b5 = mk(5, 'dk-pbtn'); b5.textContent = it[5].label; r5.append(b5); wrap.append(r5);
    if (P && P.account) { const r6 = el2('div', 'dk-prow'); const a = el2('div', 'dk-pt'); a.append(document.createTextNode('Cuenta: '), el2('b', null, P.account)); r6.append(a); wrap.append(r6); }
    ov.append(wrap);
  }
  // ---------- Estilo «Steam Big Picture»: ficha del juego ----------
  function dkBtns(g) {
    const rs = runStateFor(g), inst = g.installed !== false, opt = { id: 'opt', label: 'Opciones', run: () => menu() };
    if (rs && rs.state === 'starting') return [{ id: 'play', label: 'Cancelar', run: () => stopGame(g) }, opt];
    if (rs) return [{ id: 'play', label: rs.state === 'stopping' ? 'Cerrando…' : 'Reanudar', run: () => { if (rs.state !== 'stopping') { dkMin(); } } }, { id: 'stop', label: 'Cerrar el juego', run: () => stopGame(g) }, opt];
    return [{ id: 'play', label: inst ? 'Jugar' : 'Instalar', run: () => play(g) }, opt];
  }
  // «Iniciando…»: el arte de la ficha crece a pantalla casi completa mientras el juego arranca (como en Steam)
  function dkLaunchOn(g) {
    const L = S.dkL, rs = runStateFor(g); if (!L || L.id !== g.id) return false; const age = Date.now() - L.t;
    if (rs && rs.state === 'starting') return age < 90000; if (rs) return age < 2800; return age < 1600;
  }
  const DK_IC = {
    play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor" stroke="none"/>', inst: '<path d="M12 3.5v11M7.5 10.5l4.5 4.5 4.5-4.5M5 19.5h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/>',
    gear: '<path fill="currentColor" stroke="none" d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4.9a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.4-.9-2 3.4 2 1.6a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-.9c.5.4 1.1.7 1.7 1l.4 2.6h4l.4-2.6c.6-.3 1.2-.6 1.7-1l2.4.9 2-3.4zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 .7)"/>',
    medal: '<circle cx="12" cy="9" r="5.5" fill="currentColor" stroke="none"/><path d="M8.5 13.5L6.5 21l5.5-2.8 5.5 2.8-2-7.5" fill="currentColor" stroke="none"/>',
  };
  const dkSvg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${DK_IC[k]}</svg>`;
  function dkDate(ms) { if (!ms) return 'Nunca'; const d = new Date(ms), old = Date.now() - ms > 300 * 86400000; return d.toLocaleDateString('es', old ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' }).replace(/\./g, ''); }
  function dkHours(m) { return !m ? 'Sin jugar' : m >= 60 ? (m / 60).toFixed(1).replace('.', ',') + ' horas' : Math.round(m) + ' min'; }
  function dkChip(k, lbl) { return `<b class="dk-kb">${k}</b><span class="dk-pd">${window.PadIcons ? PadIcons.chip(lbl) : lbl}</span>`; }

  function dkTabs(g) { const md = mediaOf(g); return [['ov', 'actividad'], ...((g.achievements && g.achievements.total > 0) || md.all.length ? [['ach', 'tus cosas']] : []), ['det', 'información sobre el juego']]; }
  function dkTab(id) {
    const g = byId(S.det.id); if (!g || S.det.tabBusy) return; inlineStop(); closeViewer(true);
    const tabs = dkTabs(g), a = tabs.findIndex((t) => t[0] === S.det.tab), b = tabs.findIndex((t) => t[0] === id);
    S.det.tabDir = b >= a ? 1 : -1; S.det.tab = id; S.det.afocus = false; S.det.mfocus = false; S.det.asel = 0; S.det.slide = null;
    SND.tab();
    const old = document.querySelector('.dk-det .dk-body'), st0 = (document.querySelector('.cc-detail .dk-det') || {}).scrollTop || 0, go = () => { S.det.tabBusy = false; paintDetail(); hints(); const w = document.querySelector('.cc-detail .dk-det'); if (w && st0) w.scrollTo({ top: st0, behavior: 'instant' }); };
    if (old) { old.style.setProperty('--dx', (-S.det.tabDir * 5) + 'vw'); old.classList.add('dk-out'); S.det.tabBusy = true; setTimeout(go, 110); } else go();
  }
  function dkStep(d) { const g = byId(S.det.id); if (!g) return; const tabs = dkTabs(g), i = tabs.findIndex((t) => t[0] === S.det.tab), ni = i + d; if (ni < 0 || ni >= tabs.length) return; dkTab(tabs[ni][0]); }
  function dkBack() { backDetail(); }

  function paintDetailDeck(g, page) {
    const tabs = dkTabs(g); if (!tabs.some((t) => t[0] === S.det.tab)) S.det.tab = 'ov'; const tab = S.det.tab;
    if (!S.det.dz) S.det.dz = 'btn';
    const lon = dkLaunchOn(g), lp = S.det.lp || null; let lcls = '';
    if (lon) { lcls = lp ? ' dk-launching dk-lstay' : ' dk-launching dk-lin'; S.det.lp = 'on'; } else if (lp === 'on') { lcls = ' dk-lout'; S.det.lp = null; }
    clearTimeout(S.det.lt); if (lon) { const rs0 = runStateFor(g), age0 = Date.now() - S.dkL.t, left = rs0 && rs0.state === 'starting' ? 0 : (rs0 ? 2800 : 1600) - age0; if (left > 0) S.det.lt = setTimeout(() => { if (S.view === 'detail' && S.det && S.det.id === g.id) paintDetail(); }, left + 40); }
    const wrap = el2('div', 'dk-det' + (S.det.fresh === false ? '' : ' dk-in') + lcls); page.append(wrap); S.det.fresh = false;
    wrap.onscroll = () => { const tb = wrap.querySelector('.dk-tabs'); if (tb) { const on = wrap.scrollTop >= tb.offsetTop - 3; tb.classList.toggle('stuck', on); if (box) { box.classList.toggle('dk-engb', on); if (on) { const h = Math.round(tb.getBoundingClientRect().bottom); if (h > 40 && box._bh !== h) { box._bh = h; box.style.setProperty('--dk-bandh', h + 'px'); } } } } };
    if (box) box.classList.remove('dk-engb');
    // banner con el logo
    const hero = el2('div', 'dk-hero'); wrap.append(hero);
    const urls = [g.bannerSm, g.banner, g.bannerFallback, g.coverSm, g.cover, g.coverFallback].filter(Boolean).map(imgUrl);
    hero.style.background = S.det.heroU && S.det.heroG === g.id ? `url("${S.det.heroU}") center top / cover no-repeat` : colorFor(g.name);
    (function nx(i) { if (i >= urls.length) return; const im = new Image(); im.onload = () => { S.det.heroU = urls[i]; S.det.heroG = g.id; hero.style.background = `url("${urls[i]}") center top / cover no-repeat`; }; im.onerror = () => nx(i + 1); im.src = urls[i]; })(0);
    const logo = g.logoSm || g.logo;
    if (logo && !g.logoOff) { const im = new Image(); im.className = 'dk-logo'; im.alt = g.name; im.onerror = () => { im.replaceWith(el2('h1', 'dk-logo-t', g.name)); }; im.src = imgUrl(logo); hero.append(im); } else hero.append(el2('h1', 'dk-logo-t', g.name));
    if (lon) { const lc = el2('div', 'dk-lc'); if (logo && !g.logoOff) { const li = new Image(); li.alt = g.name; li.onerror = () => li.remove(); li.src = imgUrl(logo); lc.append(li); } else lc.append(el2('h1', 'dk-logo-t2', g.name)); const rs1 = runStateFor(g), lt = el2('div', 'dk-lt'); lt.append(el2('i', 'dk-spin'), el2('span', null, rs1 && rs1.state !== 'starting' ? 'Lanzando ejecutable' : 'Iniciando…')); lc.append(lt); hero.append(lc); }
    // barra: Jugar / datos / opciones
    const bar = el2('div', 'dk-bar'); wrap.append(bar);
    const bts = dkBtns(g), rs = runStateFor(g), inst = g.installed !== false;
    const stt = rs && rs.state === 'starting', fresh = S.dkL && S.dkL.id === g.id && Date.now() - S.dkL.t < 3600;
    const bp = el2('button', 'dk-play' + (stt ? ' starting' : rs ? ' run' + (fresh ? ' fresh' : '') : !inst ? ' inst' : '')); bp.tabIndex = -1; bp.innerHTML = dkSvg(stt ? 'x' : rs ? 'play' : inst ? 'play' : 'inst'); bp.append(el2('span', null, bts[0].label)); bp.onclick = () => { S.det.btn = 0; S.det.dz = 'btn'; bts[0].run(); }; bar.append(bp);
    if (rs && !stt) { const xb = el2('button', 'dk-ib dk-x'); xb.tabIndex = -1; xb.title = 'Cerrar el juego'; xb.innerHTML = dkSvg('x'); xb.onclick = () => { S.det.btn = 1; S.det.dz = 'btn'; bts[1].run(); }; bar.append(xb); }
    const stat = (k, v) => { const d = el2('div', 'dk-stat'); d.append(el2('div', 'dk-k', k), el2('div', 'dk-v', v)); bar.append(d); };
    if (!inst && g.diskBytes) stat('Espacio necesario', fmtBytes(g.diskBytes));
    if (stt) stat('Iniciando', ''); stat('Última sesión', rs ? 'Hoy' : dkDate(g.lastPlayed)); stat('Tiempo de juego', dkHours(g.playTime));
    bar.append(el2('div', 'dk-sp'));
    const gb = el2('button', 'dk-ib'); gb.tabIndex = -1; gb.title = 'Opciones'; gb.innerHTML = dkSvg('gear'); gb.onclick = () => { S.det.btn = bts.length - 1; S.det.dz = 'btn'; bts[bts.length - 1].run(); }; bar.append(gb);
    { const sl = el2('div', 'dk-srcline'); sl.append(el2('i'), el2('span', null, (srcDef(g.source).name + ' · ' + (g.installed === false ? 'no instalado' : 'instalado')).toUpperCase()), el2('i')); wrap.append(sl); }
    if (INST.prog[g.id]) wrap.append(el2('div', 'dk-instline', INST.prog[g.id].paused ? 'Instalación en pausa' : 'Instalando…'));
    // pestañas
    const tb = el2('div', 'dk-tabs'); wrap.append(tb);
    const cl = el2('span', 'dk-chip l'); cl.innerHTML = dkChip('Q', 'LB'); const cr = el2('span', 'dk-chip r'); cr.innerHTML = dkChip('E', 'RB');
    const row = el2('div', 'dk-trow'); tb.append(el2('i', 'dk-bl'), el2('i', 'dk-bl'), el2('i', 'dk-bl'), el2('i', 'dk-bl t'), cl, row, cr);
    tabs.forEach(([id, lab]) => { const b = el2('button', 'dk-tab' + (id === tab ? ' on' : '')); b.tabIndex = -1; b.textContent = lab; b.onclick = () => { S.det.dz = 'tabs'; if (id !== tab) dkTab(id); else dkDetMark(); }; row.append(b); });
    // contenido
    const body = el2('div', 'dk-body dk-b-' + tab); if (S.det.tabDir) { body.classList.add('dk-slin'); body.style.setProperty('--dx', (S.det.tabDir * 7) + 'vw'); S.det.tabDir = 0; } wrap.append(body); const inf = infoOf(g);
    const sec = (t) => body.append(el2('h3', 'dk-h', t));
    const desc = inf && inf.description ? inf.description : '';
    if (tab === 'ov') {
      if (!inst && inf && inf.storeUrl) {
        const c = el2('div', 'dk-card dk-store'); const th = el2('div', 'dk-sthumb'); if (urls[0]) th.style.background = `url("${urls[0]}") center / cover`;
        const tx = el2('div', 'dk-stx'); tx.append(el2('div', 'dk-sk', 'Echa un vistazo al juego completo'), el2('div', 'dk-sn', g.name)); const bt = el2('button', 'dk-btn', 'Visitar la página de la tienda'); bt.tabIndex = -1; bt.onclick = () => { if (window.api.freeOpen) window.api.freeOpen(inf.storeUrl); }; tx.append(bt);
        c.append(th, tx); body.append(c);
      }
      sec('Actividad');
      const tl = el2('div', 'dk-tl'); body.append(tl);
      const evs = []; if (g.lastPlayed) evs.push({ t: g.lastPlayed, k: 'SESIÓN DE JUEGO', n: 'Jugaste ' + g.name, d: 'Tiempo de juego total: ' + fmtPlay(g.playTime) + '. ' + (g.achievements && g.achievements.total ? 'Logros: ' + g.achievements.unlocked + ' de ' + g.achievements.total + '.' : ''), art: true });
      const drawTl = (list) => {
        if (!tl.isConnected) return; tl.replaceChildren();
        const all = evs.concat((list || []).filter((a) => a.achieved && a.unlockTime).map((a) => ({ t: a.unlockTime, k: 'LOGRO DESBLOQUEADO', n: a.name, d: a.description || '', icon: a.icon }))).sort((x, y) => y.t - x.t).slice(0, 14);
        if (!all.length) { tl.append(el2('div', 'dk-card dk-text dim', 'Todavía no hay actividad para este juego.')); return; }
        let last = '';
        all.forEach((e) => { const day = new Date(e.t).toLocaleDateString('es', { day: 'numeric', month: 'long' }).toUpperCase(); if (day !== last) { last = day; const h = el2('div', 'dk-day'); h.append(el2('span', null, day.replace(' DE ', ' DE ')), el2('i')); tl.append(h); }
          const c = el2('div', 'dk-ev'); const th = el2('div', 'dk-evt'); if (e.icon) { const im = new Image(); im.alt = ''; im.onerror = () => im.remove(); im.src = e.icon; th.append(im); th.classList.add('ic'); } else if (urls[0]) th.style.background = `url("${urls[0]}") center / cover`; c.append(th);
          const tx = el2('div', 'dk-evx'); tx.append(el2('div', 'dk-evk', e.k), el2('div', 'dk-evn', e.n), el2('div', 'dk-evd', e.d)); c.append(tx); tl.append(c); });
      };
      drawTl(g.achievements && Array.isArray(g.achievements.list) ? g.achievements.list : []);
      if (g.achievements && g.achievements.total && !Array.isArray(g.achievements.list)) window.api.getAchievements(g.id, false).then((r) => { if (r && r.data) { g.achievements = r.data; drawTl(r.data.list); } }).catch(() => {});
      if (g.source === 'steam' && g.appid && window.api.friendsOwners) {
        const fw = el2('div', 'dk-fw'); fw.append(el2('div', 'dk-fwl dim', 'Buscando amigos con este juego…')); const fh = el2('h3', 'dk-h', 'Amigos'); body.append(fh, fw);
        const frs = (S.fr0 && S.fr0.id === g.id) ? S.fr0 : null;
        (async () => {
          let fl = HM.fr && HM.fr.ok ? HM.fr : null; if (!fl) { try { fl = await window.api.friendsGet(false); } catch { fl = null; } }
          const r = frs ? frs.r : await window.api.friendsOwners(g.appid).catch(() => null); if (!frs) S.fr0 = { id: g.id, r };
          if (!fw.isConnected) return;
          if (!r || !r.ok || !fl || !fl.ok) { fh.remove(); fw.remove(); return; }
          const byId2 = new Map((fl.friends || []).map((f) => [f.id, f])), rows = r.owners.map((o) => ({ o, f: byId2.get(o.id) })).filter((x) => x.f);
          const now = rows.filter((x) => x.f.appid === Number(g.appid)), prev = rows.filter((x) => x.f.appid !== Number(g.appid) && x.o.minutes > 0).sort((a, b) => b.o.minutes - a.o.minutes), own = rows.filter((x) => x.o.minutes === 0);
          fw.replaceChildren(); if (!rows.length) { fh.remove(); fw.remove(); return; }
          const grp = (t, list, sub) => { if (!list.length) return; const col = el2('div', 'dk-fwc'); col.append(el2('div', 'dk-fwl', t)); list.slice(0, 8).forEach((x) => { const it = el2('div', 'dk-fwi'); const av = el2('div', 'dk-fwa'); if (x.f.avatar) av.style.backgroundImage = `url("${x.f.avatar}")`; const tx = el2('div', 'dk-fwt'); tx.append(el2('b', null, x.f.name), el2('span', null, sub(x))); it.append(av, tx); col.append(it); }); fw.append(col); };
          grp('Jugando ahora', now, () => 'Jugando ahora'); grp('Jugado anteriormente', prev, (x) => dkHours(x.o.minutes) + (x.o.last ? ' · ' + dkDate(x.o.last * 1000) : '')); grp('Lo tienen', own, () => 'Sin jugar');
          if (r.hidden) fw.append(el2('div', 'dk-fwn dim', r.hidden + ' amigo' + (r.hidden === 1 ? '' : 's') + ' con los detalles de juego privados'));
        })();
      }
      sec('Descripción'); const dc = el2('div', 'dk-card dk-text'); dc.append(el2('p', desc ? '' : 'dim', desc || 'Este juego todavía no tiene información.')); body.append(dc);
    } else if (tab === 'ach') {
      if (g.achievements && g.achievements.total > 0) dkAchBody(g, body);
      const md = mediaOf(g); if (md.all.length) { sec('Archivos multimedia'); const mp = mediaPanel(g); if (mp) body.append(mp); }
    } else {
      const top = el2('div', 'dk-info'); body.append(top);
      const cu = (g.coverAnim && g.coverSm) || g.cover || g.coverFallback; if (cu) { const im = new Image(); im.className = 'dk-cover'; im.alt = ''; im.onerror = () => im.remove(); im.src = imgUrl(cu); top.append(im); }
      const mid = el2('div', 'dk-mid'); mid.append(el2('p', 'dk-desc' + (desc ? '' : ' dim'), desc || 'Sin descripción.'));
      const kv = el2('div', 'dk-kv'); const put = (k, v) => { if (v) { const r = el2('div'); r.append(el2('span', null, k + ': '), document.createTextNode(v)); kv.append(r); } };
      put('Desarrollador', inf && (inf.developers || []).join(', ')); put('Editor', inf && (inf.publishers || []).join(', ')); put('Género', inf && (inf.genres || []).join(', ')); put('Fecha de lanzamiento', inf && inf.releaseDate ? formatDate(inf.releaseDate) : ''); put('Metacritic', inf && inf.metacritic ? String(inf.metacritic) : ''); put('En disco', g.diskBytes ? fmtBytes(g.diskBytes) : '');
      mid.append(kv); top.append(mid);
      const feat = el2('div', 'dk-feat'); [srcDef(g.source).name, g.achievements && g.achievements.total ? 'Logros' : null, inst ? 'Instalado' : 'No instalado'].filter(Boolean).forEach((f) => feat.append(el2('div', null, f))); top.append(feat);
      if (inf && (inf.storeUrl || inf.website)) { const br = el2('div', 'dk-btns'); [['Página de la tienda', inf.storeUrl], ['Sitio web', inf.website]].filter((x) => x[1]).forEach(([l, u]) => { const b = el2('button', 'dk-btn', l); b.tabIndex = -1; b.onclick = () => { if (window.api.freeOpen) window.api.freeOpen(u); }; br.append(b); }); body.append(br); }
      const cls = (typeof collections !== 'undefined' ? collections : []).filter((c) => inColl(c, g));
      if (cls.length) { sec('Presente en estas colecciones'); const cw = el2('div', 'dk-colls'); cls.slice(0, 6).forEach((c) => { const t = el2('div', 'dk-coll'); t.style.setProperty('--h', hueOf(c.name)); t.append(el2('i'), el2('span', null, c.name)); cw.append(t); }); body.append(cw); }
    }
    setTimeout(() => { wrap.onscroll(); dkDetMark(); }, 0);
  }
  // Al cerrarse un juego: pantalla negra con el logo y un aro azul que gira (como Steam, pero breve: ≈1,2 s)
  function dkCloseEl() {
    const d = el2('div', 'dk-close');
    d.innerHTML = '<svg viewBox="-2 -2 28 28" aria-hidden="true"><circle class="bg" cx="12" cy="12" r="11.6"/><circle class="rg" cx="12" cy="12" r="9.4"/><path class="cc" d="M16.3 8.4A5.2 5.2 0 1 0 16.3 15.6"/><circle class="ar" cx="12" cy="12" r="11.6" pathLength="100"/></svg>';
    return d;
  }
  // «Aparcado»: al minimizar Comptus para jugar se deja puesta la pantalla negra; así, al volver la ventana, el primer fotograma ya es la animación (no la ficha vieja)
  function dkMin() {
    try {
      if (cfg.ui !== 'deck' || !box) return window.api.couchMinimize();
      if (!box.querySelector('.dk-close')) { const d = dkCloseEl(); d.classList.add('park'); box.append(d); }
      setTimeout(() => { try { window.api.couchMinimize(); } catch {} }, 110);
    } catch {}
  }
  function dkUnpark() { const d = box && box.querySelector('.dk-close.park'); if (!d) return; d.classList.add('out'); setTimeout(() => d.remove(), 320); }
  // Con el juego abierto (Comptus pierde el foco) se aparca la pantalla negra: así, cuando el juego se cierra y Windows devuelve la ventana,
  // el primer fotograma ya es la animación y no la ficha vieja. Si no era un cierre (vuelves a mano / el juego no llegó a abrir), se quita sola.
  const dkParkNow = () => { if (cfg.ui === 'deck' && active && box && runState && (runState.state === 'starting' || runState.state === 'running') && !box.querySelector('.dk-close')) { const d = dkCloseEl(); d.classList.add('park'); box.append(d); } };
  const dkBack2 = () => { clearTimeout(S.dkUT); S.dkUT = setTimeout(() => { if (box && box.querySelector('.dk-close.park') && !(runState && runState.state === 'stopping')) dkUnpark(); }, 1500); };
  window.addEventListener('blur', dkParkNow);
  window.addEventListener('focus', dkBack2);
  document.addEventListener('visibilitychange', () => { if (document.hidden) dkParkNow(); else dkBack2(); });
  function dkCloseFx() {
    if (!box) return; let d = box.querySelector('.dk-close'); if (d && !d.classList.contains('park')) return;
    if (d) d.classList.remove('park'); else { d = dkCloseEl(); box.append(d); }
    try { SND.back(); } catch {}
    clearTimeout(S.dkUT); S.dkHold = Date.now() + 60000;
    const end = () => { S.dkHold = 0; clearTimeout(S.dkHT); try { root.Couch.onRun(); } catch {} };
    const arm = () => { setTimeout(() => d.classList.add('out'), 1100); setTimeout(() => { d.remove(); end(); }, 1550); };
    if (document.hidden) { const h = () => { if (!document.hidden) { document.removeEventListener('visibilitychange', h); arm(); } }; document.addEventListener('visibilitychange', h); } else arm();
  }
  const hueOf = (s) => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };

  function dkDetMark() {
    const w = $c('.dk-det'); if (!w || !S.det) return; const dz = S.det.dz || 'btn';
    [...w.querySelectorAll('.dk-play, .dk-ib')].forEach((b, i) => b.classList.toggle('sel', dz === 'btn' && i === (S.det.btn || 0)));
    const tb = w.querySelector('.dk-tabs'); if (tb) tb.classList.toggle('focus', dz === 'tabs');
    if (S.det.tab === 'ach') dkAchSel();
    if (dz === 'btn') w.scrollTo({ top: 0, behavior: 'smooth' });
    else if (tb && w.scrollTop < tb.offsetTop - 4) w.scrollTo({ top: tb.offsetTop, behavior: 'smooth' });
  }
  function dkDetNav(dir) {
    const g = byId(S.det.id); if (!g) return; const dz = S.det.dz || 'btn', lr = dir === 'left' || dir === 'right', d = dir === 'right' || dir === 'down' ? 1 : -1, w = $c('.dk-det');
    if (dz === 'btn') {
      if (lr) { const k = Math.max(0, Math.min(dkBtns(g).length - 1, (S.det.btn || 0) + d)); if (k !== S.det.btn) { S.det.btn = k; SND.move(); dkDetMark(); } }
      else if (dir === 'down') { S.det.dz = 'tabs'; SND.move(); dkDetMark(); }
      return;
    }
    if (dz === 'tabs') {
      if (lr) dkStep(d); else if (dir === 'up') { S.det.dz = 'btn'; SND.move(); dkDetMark(); } else { S.det.dz = S.det.tab === 'ach' && S.det.alist && S.det.alist.length ? 'body' : 'scroll'; SND.move(); dkDetMark(); if (S.det.dz === 'scroll' && w) w.scrollBy({ top: 120, behavior: 'smooth' }); }
      return;
    }
    if (dz === 'media') {
      if (lr) { const n = mediaOf(g).all.length, i = (S.det.mi || 0) + d; if (i >= 0 && i < n) { SND.move(); showMedia(i, false); } }
      else if (dir === 'up') { S.det.dz = S.det.alist && S.det.alist.length ? 'body' : 'tabs'; SND.move(); dkDetMark(); }
      return;
    }
    if (S.det.tab === 'ach' && dz === 'body') {
      if (lr) { dkAchMove(dir); return; }
      if (dir === 'up') { S.det.dz = 'tabs'; SND.move(); dkDetMark(); return; }
      if (mediaOf(g).all.length) { S.det.dz = 'media'; SND.move(); const m = $c('.cc-d-media'); if (m && w) w.scrollTo({ top: m.offsetTop - w.clientHeight * 0.3, behavior: 'smooth' }); } else if (w) w.scrollBy({ top: 160, behavior: 'smooth' });
      return;
    }
    // contenido que solo se desplaza
    const tb = w && w.querySelector('.dk-tabs');
    if (dir === 'up') { if (w && tb && w.scrollTop <= tb.offsetTop + 6) { S.det.dz = 'tabs'; SND.move(); dkDetMark(); } else if (w) w.scrollBy({ top: -180, behavior: 'smooth' }); }
    else if (dir === 'down') { if (w) w.scrollBy({ top: 180, behavior: 'smooth' }); }
    else dkStep(d);
  }
  function dkDetAccept() {
    const g = byId(S.det.id); if (!g) return; const dz = S.det.dz || 'btn';
    if (dz === 'btn') { const b = dkBtns(g)[S.det.btn || 0]; if (b) b.run(); return; }
    if (dz === 'tabs') { S.det.dz = S.det.tab === 'ach' && S.det.alist && S.det.alist.length ? 'body' : 'scroll'; SND.open(); dkDetMark(); return; }
    if (dz === 'media') mediaAccept();
  }

  // ---------- Logros (Big Picture): resumen, logro destacado y fila de iconos ----------
  function dkAchBody(g, body) {
    const wrap = el2('div', 'dk-ach'); body.append(wrap);
    const draw = (d) => {
      if (!wrap.isConnected) return; wrap.replaceChildren();
      const list = Array.isArray(d.list) ? d.list.slice().sort((a, b) => (a.achieved !== b.achieved ? (a.achieved ? -1 : 1) : a.achieved ? b.unlockTime - a.unlockTime : (b.percent ?? -1) - (a.percent ?? -1))) : [];
      S.det.alist = list; const pc = d.total ? Math.round(d.unlocked / d.total * 100) : 0;
      wrap.append(el2('h3', 'dk-h', 'Logros'));
      const sum = el2('div', 'dk-asum'); const md = el2('i', 'dk-amedal'); md.innerHTML = dkSvg('medal'); sum.append(md, el2('span', null, d.unlocked === d.total ? `¡Has desbloqueado todos los logros! ${d.unlocked}/${d.total} (${pc}%)` : `Has desbloqueado ${d.unlocked}/${d.total} (${pc}%)`));
      const pr = el2('div', 'dk-prog'), b2 = el2('i'); b2.style.width = pc + '%'; pr.append(b2); sum.append(pr); wrap.append(sum);
      if (!list.length) { wrap.append(el2('div', 'dk-card dk-text', 'Cargando la lista de logros…')); return; }
      const panel = el2('div', 'dk-card dk-apanel'); wrap.append(panel);
      const arow = el2('div', 'dk-arow'); panel.append(arow);
      arow.append(el2('div', 'dk-afeat'));
      const strip = el2('div', 'dk-astrip'); arow.append(strip);
      const nLock = list.filter((a) => !a.achieved).length, lk = el2('div', 'dk-alock');
      if (nLock && nLock < list.length) panel.append(el2('div', 'dk-alockh', 'Logros bloqueados'), lk); else if (nLock) { strip.classList.add('dk-aall'); }
      list.forEach((a, i) => {
        const c = el2('div', 'dk-ai' + (a.achieved ? '' : ' lock')); c.dataset.i = i; const im = new Image(); im.alt = ''; im.loading = 'lazy'; const iu = (a.achieved ? a.icon : a.iconGray || a.icon) || ''; if (iu) im.src = iu; im.onerror = () => im.remove(); c.append(im);
        c.onclick = () => { S.det.asel = i; S.det.dz = 'body'; dkAchSel(); dkDetMark(); }; (!a.achieved && lk.isConnected ? lk : strip).append(c);
      });
      S.det.asel = Math.max(0, Math.min(list.length - 1, S.det.asel || 0)); dkAchSel();
    };
    const d0 = g.achievements; draw(d0);
    if (!Array.isArray(d0.list)) { window.api.getAchievements(g.id, false).then((r) => { if (r && r.data && wrap.isConnected) { g.achievements = r.data; draw(r.data); } }).catch((e) => console.error('logros', e)); }
  }
  function dkAchSel() {
    const w = $c('.dk-ach'), list = S.det && S.det.alist; if (!w || !list || !list.length) return;
    const i = Math.max(0, Math.min(list.length - 1, S.det.asel || 0)), a = list[i], f = w.querySelector('.dk-afeat'), st = w.querySelector('.dk-astrip'); S.det.asel = i;
    w.querySelectorAll('.dk-ai').forEach((c, k) => c.classList.toggle('sel', k === i && (S.det.dz || 'btn') === 'body'));
    if (f && f._i !== i) {
      f._i = i; f.replaceChildren(); const ic = el2('div', 'dk-aic' + (a.achieved ? '' : ' lock')); const iu = (a.achieved ? a.icon : a.iconGray || a.icon) || ''; if (iu) { const im = new Image(); im.alt = ''; im.src = iu; im.onerror = () => im.remove(); ic.append(im); }
      const tx = el2('div', 'dk-atx'), desc = a.description || (a.hidden && !a.achieved ? 'Logro secreto: su descripción se publica al desbloquearlo.' : '');
      tx.append(el2('div', 'dk-an', a.name || ''), el2('div', 'dk-ad', desc));
      const meta = [a.percent != null ? `El ${a.percent.toLocaleString('es', { maximumFractionDigits: 1 })} % de los jugadores tienen este logro` : '', a.achieved ? (a.unlockTime ? 'Desbloqueado el ' + new Date(a.unlockTime).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Desbloqueado') : 'Bloqueado'].filter(Boolean).join(' · ');
      tx.append(el2('div', 'dk-ap', meta)); f.append(ic, tx);
    }
    const c = w.querySelectorAll('.dk-ai')[i]; if (c && c.parentNode === st) st.scrollTo({ left: c.offsetLeft - (st.clientWidth - c.offsetWidth) / 2, behavior: 'smooth' }); else if (c) c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function dkAchMove(dir) {
    const list = S.det.alist || [], n = list.length; if (!n) return; const i = S.det.asel || 0; const k = dir === 'left' ? Math.max(0, i - 1) : Math.min(n - 1, i + 1);
    if (k !== i) { S.det.asel = k; SND.move(); dkAchSel(); }
  }
  // ---------- Entrar / salir ----------
  let entering = false;
  function showSplash() {
    const th = THEMES.find((x) => x.id === cfg.theme) || THEMES[0];
    const d = el2('div', 'cc-splash'); d.style.cssText = `--sa:${th.accent};--sb:${th.accent2};--sbg:${th.bg};--stx:${th.text}`;
    d.innerHTML = '<div class="cc-sp-in"><svg class="cc-sp-logo" viewBox="0 0 24 24" aria-hidden="true"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="13" r="1"/><circle cx="18" cy="11" r="1"/><path d="M17.3 5H6.7a4 4 0 0 0-3.9 3.2l-1.7 8A3 3 0 0 0 4 20c1 0 1.6-.6 2.2-1.4L8 16h8l1.8 2.6c.6.8 1.2 1.4 2.2 1.4a3 3 0 0 0 2.9-3.8l-1.7-8A4 4 0 0 0 17.3 5z"/></svg><div class="cc-sp-name">Comptus</div><div class="cc-sp-sub">Iniciando el modo consola…</div><div class="cc-sp-bar"><i></i></div></div>';
    if (cfg.ui === 'x360') { // arranque estilo Xbox 360: la esfera de cuatro cuadrantes se enciende, destello verde y el nombre
      d.className = 'cc-splash x3sp';
      d.innerHTML = '<div class="x3sp-orb"><svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="x3spg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8f26a"/><stop offset=".55" stop-color="#3fa513"/><stop offset="1" stop-color="#1d6b08"/></linearGradient></defs><path class="bd" pathLength="1" d="M17.3 5H6.7a4 4 0 0 0-3.9 3.2l-1.7 8A3 3 0 0 0 4 20c1 0 1.6-.6 2.2-1.4L8 16h8l1.8 2.6c.6.8 1.2 1.4 2.2 1.4a3 3 0 0 0 2.9-3.8l-1.7-8A4 4 0 0 0 17.3 5z"/><g class="bt"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/></g><circle class="bt b1" cx="15" cy="13" r="1"/><circle class="bt b2" cx="18" cy="11" r="1"/></svg><b></b></div><div class="x3sp-name">COMPTUS</div><div class="x3sp-sub">modo consola</div>';
    }
    if (cfg.ui === 'deck') { // arranque estilo Big Picture: un mando se dibuja con un trazo de luz, se transforma en anillo con puntos y aparece el emblema
      d.className = 'cc-splash dksp';
      d.innerHTML = '<div class="dksp-dots"></div><div class="dksp-flash"></div><svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="dkg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2f8cff"/><stop offset="1" stop-color="#8a4dff"/></linearGradient></defs>'
        + '<path class="pw" pathLength="1" d="M17.3 5H6.7a4 4 0 0 0-3.9 3.2l-1.7 8A3 3 0 0 0 4 20c1 0 1.6-.6 2.2-1.4L8 16h8l1.8 2.6c.6.8 1.2 1.4 2.2 1.4a3 3 0 0 0 2.9-3.8l-1.7-8A4 4 0 0 0 17.3 5z"/>'
        + '<path class="pc" pathLength="1" d="M17.3 5H6.7a4 4 0 0 0-3.9 3.2l-1.7 8A3 3 0 0 0 4 20c1 0 1.6-.6 2.2-1.4L8 16h8l1.8 2.6c.6.8 1.2 1.4 2.2 1.4a3 3 0 0 0 2.9-3.8l-1.7-8A4 4 0 0 0 17.3 5z"/>'
        + '<circle class="rg" pathLength="1" cx="12" cy="12" r="9.4"/><path class="cc" pathLength="1" d="M16.3 8.4A5.2 5.2 0 1 0 16.3 15.6"/><circle class="ar" cx="12" cy="12" r="10.4" pathLength="1"/></svg><div class="dksp-n">COMPTUS</div>';
    }
    document.body.append(d); return d;
  }
  function x3BootSound() { // jingle de inicio: suena durante el arranque y se apaga suave al terminar
    try {
      if (!cfg.sound) return null;
      const a = new Audio('sonidos/' + (cfg.ui === 'deck' ? 'deck' : 'x360') + '/startup.mp3'), v = Math.min(1, (VOL[cfg.vol] ?? 0.09) * 10); a.volume = v; a.play().catch(() => {});
      return { fade() { let k = 0; const iv = setInterval(() => { k += 1; a.volume = Math.max(0, v * (1 - k / 8)); if (k >= 8) { clearInterval(iv); try { a.pause(); } catch {} } }, 55); } };
    } catch { return null; }
  }
  async function enter() {
    if (active || entering) return;
    HM.rot = ((HM.rot || 0) + 1) % 997;
    if (S.uname == null) { try { window.api.userName().then((u) => { S.uname = (u || '').trim(); }); } catch {} }
    entering = true; const t0 = Date.now(), sp = showSplash(), boot = cfg.ui === 'x360' || cfg.ui === 'deck' ? x3BootSound() : null;
    let skipped = false, spT = null, spDone = null; const spSkip = (e) => { if (!sp.isConnected || sp.classList.contains('out')) { document.removeEventListener('keydown', spSkip, true); return; } document.removeEventListener('keydown', spSkip, true); try { e.stopImmediatePropagation(); e.preventDefault(); } catch {} skipped = true; if (spT) { clearTimeout(spT); spDone(); } };
    if (cfg.ui === 'deck') { document.addEventListener('keydown', spSkip, true); sp.addEventListener('pointerdown', () => spSkip({ stopImmediatePropagation() {}, preventDefault() {} })); }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); // deja que se vea antes del trabajo pesado
    if (!box) build();
    if (cfg.ui === 'deck') { // el cursor se oculta y el ratón se ignora hasta que lo mueves de verdad (aunque haya quedado en otro sitio)
      S.mouse = false; S.mp = null; box.classList.add('nomouse');
      // Solo cuenta un movimiento REAL: se mide en coordenadas de pantalla (el paso a pantalla completa mueve las de la ventana y Chromium lanza mousemove falsos con movimiento 0)
      const act = () => { S.mouse = true; box.classList.remove('nomouse'); document.removeEventListener('mousemove', mm, true); document.removeEventListener('mousedown', md, true); };
      const mm = (e) => { const sx = e.screenX, sy = e.screenY; if (Date.now() < (S.mpT || Infinity) || !S.mp) { S.mp = [sx, sy]; return; } if (!e.movementX && !e.movementY) return; if (Math.hypot(sx - S.mp[0], sy - S.mp[1]) > 6) { act(); try { const t = document.elementFromPoint(e.clientX, e.clientY), c = t && t.closest('#couch .cc-hc, #couch .cc-tile'); if (c && c.onmouseenter) c.onmouseenter(); } catch {} } };
      const md = (e) => { if (Date.now() < (S.mpT || Infinity)) return; act(); };
      S.mpT = Infinity;
      document.addEventListener('mousemove', mm, true); document.addEventListener('mousedown', md, true);
    } else { S.mouse = true; box.classList.remove('nomouse'); }
    try { if (window.api.mediaGet) window.api.mediaGet().then(paintMusic).catch(() => {}); } catch {}
    active = true; INST.snap = null; clearInterval(INST.pt); INST.pt = setInterval(instPoll, 2500); setTimeout(instPoll, 300); friendWatchStart(); bellSync(); if (cfg.ui === 'deck' && window.api.profileGet) window.api.profileGet(false).then((r) => { S.prof = r; paintMe(); }).catch(() => {}); hintMode = document.body.classList.contains('pad-mode') ? 'pad' : 'kb'; applyCfg(); box.classList.toggle('padmode', hintMode === 'pad');
    try { const r = await window.api.setFullscreen(true); wasFs = !!(r && r.was); } catch { wasFs = false; }
    document.body.classList.add('couch-on'); box.classList.remove('hidden'); box.classList.add('idle'); if (cfg.ui === 'deck') { S.mp = null; S.mpT = Date.now() + 1500; }
    tick(); clearInterval(clockT); clockT = setInterval(tick, 20000);
    S.view = 'list'; S.sub = null; buildTabs(); S.tab = Math.min(S.tab, S.tabs.length - 1);
    if (cfg.ui === 'x360') { const hi = S.tabs.findIndex((t) => t.id === 'home'); if (hi >= 0) S.tab = hi; } // el estilo Xbox 360 siempre arranca en Inicio
    S.items = tabItems(isSettings() ? 'all' : S.tabs[S.tab].id); showView(); paintTabs(); hints(); applyCfg();
    paintList(S.focusId); if (isSettings()) paintSettings(); if (isHome()) { loadHome(false); paintHome(true); } if (isSearch()) paintSearch();
    document.addEventListener('keydown', onKey, true);
    entering = false;
    spDone = () => { document.removeEventListener('keydown', spSkip, true); sp.classList.add('out'); if (boot) boot.fade(); setTimeout(() => SND.enter(), boot && cfg.ui === 'x360' ? 300 : 0); setTimeout(() => sp.remove(), boot && cfg.ui === 'x360' ? 650 : 450); };
    spT = setTimeout(spDone, skipped ? 0 : Math.max(0, (cfg.ui === 'x360' ? 3000 : cfg.ui === 'deck' ? 5500 : 1100) - (Date.now() - t0)));
  }
  async function exit() {
    if (!active) return;
    SND.exit(); closeViewer(true); inlineStop(); S.menu = null; active = false; clearInterval(INST.pt); clearInterval(FW.t); document.removeEventListener('keydown', onKey, true); clearInterval(clockT);
    box.classList.add('hidden'); document.body.classList.remove('couch-on');
    try { await window.api.setFullscreen(false, wasFs); } catch {}
  }
  window.addEventListener('resize', () => { if (!active || !box) return; applyCfg(); if (S.view === 'list') { mark(true); } });
  const toggle = () => { if (entering) return; return active ? exit() : enter(); };

  let rt = null;
  root.Couch = {
    launchFailed() { S.x3launch = 0; try { updNowCard(); } catch {} },
    achUnlocked(p) {
      try {
        if (cfg.sound !== false) { const a = new Audio('sonidos/x360/' + (p && p.rare ? 'achievement_rare' : 'achievement') + '.mp3'); a.volume = Math.min(1, (VOL[cfg.vol] ?? 0.09) * 10); a.play().catch(() => {}); }
        rumble(!!(p && p.rare));
        if (!active) return;
        const l = (p && p.list) || [];
        if (cfg.ui === 'deck') { l.slice(0, 3).forEach((a) => noticeIn({ kind: 'ach', title: 'Logro desbloqueado: ' + (a.name || ''), body: (p && p.game) || '' }, () => { if (p && p.id) openDetail(p.id, 'ach'); })); if (!l.length) noticeIn({ kind: 'ach', title: 'Logro desbloqueado', body: (p && p.game) || '' }); return; }
        if (cfg.ui !== 'x360') { toast('🏆 ' + (l[0] ? l[0].name : 'Logro desbloqueado')); return; }
        (l.length ? l.slice(0, 3) : [{}]).forEach((a, i) => x3Notify(a, p && p.game, i));
      } catch {}
    },
    toggle, enter, exit, nav, btn, axis, captures,
    configure(c) {
      let loc = null; try { loc = JSON.parse(localStorage.getItem(LS) || 'null'); } catch {}
      loadSrc = c && typeof c === 'object' && Object.keys(c).length ? 'archivo de Comptus' : loc ? 'copia local' : 'valores por defecto';
      const src = c && typeof c === 'object' && Object.keys(c).length ? c : loc; // el archivo manda; si estuviera vacío se usa la copia local
      cfg = { ...DEF, ...(src || {}) };
      if (cfg.ui === 'x360b') { cfg.ui = 'default'; if (cfg.theme === 'x360d') cfg.theme = cfg.prevTheme && !/^x360/.test(cfg.prevTheme) ? cfg.prevTheme : 'midnight'; } // el estilo «blades clásico» ya no existe
      if (box) applyCfg();
      if (!(c && Object.keys(c).length) && loc) save();
    },
    hints(m) { hintMode = m; if (box) box.classList.toggle('padmode', m === 'pad'); if (active) hints(); },
    get active() { return active; },
    onRender() { // la biblioteca se ha vuelto a cargar: se refresca sin mover tu sitio
      if (!active) return; clearTimeout(rt); instDiff();
      rt = setTimeout(() => { if (S.dkHold > Date.now()) { root.Couch.onRender(); return; } setTimeout(instApply, 120);
        if (!active || S.menu || document.querySelector('.ctx-menu')) return;
        const id = S.view === 'detail' ? S.det.id : S.focusId, keepTab = S.tabs[S.tab] && S.tabs[S.tab].id;
        buildTabs(); const ti = S.tabs.findIndex((t) => t.id === keepTab); S.tab = ti >= 0 ? ti : 0;
        paintTabs();
        const sig = (arr) => arr.map((it) => it.type === 'game' ? [it.g.id, it.g.installed === false, it.g.favorite, it.g.name, it.g.coverSm || it.g.cover].join('~') : [(it.c || it.s).id, it.games.length, it.c && (it.c.coverSm || it.c.cover)].join('~')).join('|');
        const before = sig(S.items), sub = S.sub; S.items = tabItems(isSettings() ? 'all' : S.tabs[S.tab].id);
        if (isHome() && S.view === 'list') { paintHome(true); return; }
        if (isSearch() && S.view === 'list') { paintSearch(); return; }
        if (!sub && S.view === 'list' && sig(S.items) === before) { paintHero(); return; }
        if (sub) { const it = S.items.find((x) => (x.type === 'coll' ? x.c.name : x.s && x.s.name) === sub.title); if (it) S.sub = { ...sub, items: gameItems(it.games) }; else S.sub = null; }
        if (S.view === 'detail') paintDetail(); else paintList(id);
        if (isSettings()) paintSettings();
      }, 200);
    },
    onRun() { if (active) {
      const rg = runState ? state.games.find((g) => runStateFor(g)) : null;
      { const was = S.runSeen; S.runSeen = rg && runState && (runState.state === 'running' || runState.state === 'stopping') ? rg.id : null; if (was && !S.runSeen && !rg && cfg.ui === 'deck') { dkCloseFx(); } }
      if (cfg.ui === 'deck' && runState && runState.state === 'running' && !document.hasFocus()) dkParkNow();
      if (S.dkHold > Date.now()) { clearTimeout(S.dkHT); S.dkHT = setTimeout(() => root.Couch.onRun(), S.dkHold - Date.now() + 40); updNowCard(); return; } // sin rehacer la pantalla mientras suena la animación // Steam: pantalla negra con el logo al cerrarse el juego
      if (rg && runState.state === 'running') { if (!S.play || S.play.id !== rg.id) S.play = { id: rg.id, t: Date.now() }; } else if (!rg) S.play = null;
      updNowCard();
      const fresh = rg && S.nowId !== rg.id; S.nowId = rg ? rg.id : null;
      if (isHome() && S.view !== 'detail') { paintHome(true); if (fresh) { const ni = HM.rows.findIndex((x) => x.id === 'now'); if (ni >= 0) { HM.r = ni; HM.c[ni] = 0; homeMark(false); } } }
      if (S.minFor) { const mg = byId(S.minFor.id); if (Date.now() - S.minFor.t > 25000) S.minFor = null; else if (mg && runStateFor(mg)) { S.minFor = null; setTimeout(() => { dkMin(); }, 1200); } } if (S.view === 'detail') paintDetail(); else document.querySelectorAll('#couch .cc-tile').forEach((t) => { const it = cur()[+t.dataset.i]; if (!it || it.type !== 'game') return; const has = t.querySelector('.cc-run'), run = runStateFor(it.g); if (run && !has) t.append(el2('span', 'cc-run', 'En ejecución')); else if (!run && has) has.remove(); }); } },
  };
  if ('__couchCfg' in window) root.Couch.configure(window.__couchCfg); // renderer.js terminó antes de que cargara este archivo
})(window);
