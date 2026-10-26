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
  const DEF = { theme: 'midnight', bgMode: 'game', dim: 60, blur: 0, tile: 'm', font: 'm', names: 'focus', clock: true, layout: 'auto', border: 'thin', info: true, radius: 'm', banner: 'side', gap: 'm', rowPos: 'mid', sound: true, vol: 'm', onPlay: 'keep', padIcons: 'auto', tabsPos: 'top', adapt: false, nowCard: true, safe: 0, homeBg: 'game', homeBgPath: '' };
  let cfg = { ...DEF };
  const TILE = { xs: 6.2, s: 7.6, m: 9.2, l: 11.5, xl: 14.5 }, GAP = { s: 0.25, m: 1.1, l: 2.2 }, POS = { high: 5.5, mid: 2.6, low: 0.6 }, VOL = { s: 0.04, m: 0.09, l: 0.18 }, FONT = { s: 0.88, m: 1, l: 1.2 };
  const TABS_ALL = [
    { id: 'home', title: 'Inicio' }, { id: 'search', title: 'Buscar' }, { id: 'all', title: 'Biblioteca' }, { id: 'inst', title: 'Instalados' }, { id: 'recent', title: 'Recientes' }, { id: 'fav', title: 'Favoritos' },
    { id: 'most', title: 'Más jugados' }, { id: 'ach', title: 'Logros' }, { id: 'colls', title: 'Colecciones' }, { id: 'settings', title: 'Ajustes' },
  ];

  let box = null, active = false, wasFs = false, clockT = null, idleT = null, hintMode = 'kb', lastAxis = 0, imgSeq = 0;
  const S = { tabs: [], tab: 0, items: [], idx: 0, sub: null, view: 'list', det: { id: null, btn: 0 }, set: 0, cat: 0, col: 'cat', focusId: null, menu: null };
  const padActive = () => hintMode === 'pad';
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
    S.tabs = TABS_ALL.filter((t) => (t.id === 'settings' || t.id === 'all' || t.id === 'home' || t.id === 'search' || tabItems(t.id).length));
    if (S.tab >= S.tabs.length) S.tab = 0;
  }

  // ---------- Estructura ----------
  function build() {
    box = el2('div'); box.id = 'couch'; box.className = 'hidden';
    box.innerHTML = `
      <div class="cc-bg"></div><div class="cc-shade"></div>
      <header class="cc-top"><span class="cc-lb">LB</span><nav class="cc-tabs"></nav><span class="cc-rb">RB</span><div class="cc-sys"><div class="cc-bat hidden"></div><div class="cc-clock"></div></div></header>
      <section class="cc-hero"><div class="cc-src"></div><h1 class="cc-title"></h1><div class="cc-meta"></div></section>
      <section class="cc-listwrap"><div class="cc-subtitle hidden"></div><div class="cc-strip"></div><div class="cc-achpane"></div></section>
      <section class="cc-home hidden"></section>
      <section class="cc-search hidden"></section>
      <section class="cc-page cc-detail hidden"></section>
      <section class="cc-page cc-settings hidden"></section>
      <footer class="cc-hints"></footer>`;
    document.body.append(box);
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
    if (!cfg.adapt || !g || g.colorMode === 'theme' || typeof loadPalette !== 'function') { base(); return; }
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
    try { updNowCard(); } catch {}
    { const sf = Math.max(0, Math.min(12, +cfg.safe || 0)); box.style.setProperty('--cc-sx', sf + 'vw'); box.style.setProperty('--cc-sy', sf + 'vh'); }
    const t = THEMES.find((x) => x.id === cfg.theme) || THEMES[0];
    const st = box.style;
    st.setProperty('--cc-text', t.text);
    adaptColors(adCur);
    const por = isPortrait(); box.classList.toggle('portrait', por);
    if (window.PadIcons) { PadIcons.setPref(cfg.padIcons); const l = $c('.cc-lb'), r = $c('.cc-rb'); if (l) l.innerHTML = PadIcons.chip('LB'); if (r) r.innerHTML = PadIcons.chip('RB'); }
    const tp = cfg.tabsPos === 'left' || cfg.tabsPos === 'right' ? cfg.tabsPos : 'top';
    if (box.dataset.tp !== tp) { box.dataset.tp = tp; box.classList.toggle('tabs-left', tp === 'left'); box.classList.toggle('tabs-right', tp === 'right'); if (S.tabs && S.tabs.length) paintTabs(); }
    st.setProperty('--cc-tile', ((TILE[cfg.tile] || 9.2) * (por ? 1.75 : 1)) + 'vw'); st.setProperty('--cc-font', String(FONT[cfg.font] || 1));
    st.setProperty('--cc-dim', String(Math.max(0, Math.min(90, cfg.dim)) / 100)); st.setProperty('--cc-blur', (Math.max(0, Math.min(30, cfg.blur || 0))) + 'px');
    st.setProperty('--cc-bw', ({ none: '0em', thin: '.07em', normal: '.12em' })[cfg.border] || '.07em'); st.setProperty('--cc-rad', ({ s: '.2em', m: '.5em', l: '.9em' })[cfg.radius] || '.5em');
    st.setProperty('--cc-gap', (GAP[cfg.gap] ?? 1.1) + 'vw'); st.setProperty('--cc-pos', (POS[cfg.rowPos] ?? 2.6) + 'vh');
    box.classList.toggle('side', cfg.banner !== 'full'); applyLayout(); box.classList.toggle('no-info', cfg.info === false);
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
  const SND = { move: () => beep([760], 0.035), tab: () => beep([520, 700], 0.07), open: () => beep([440, 660, 880], 0.07), back: () => beep([700, 480], 0.07), menu: () => beep([600, 900], 0.06), change: () => beep([660], 0.05, 'triangle'), play: () => beep([523, 659, 784, 1047], 0.09), enter: () => beep([392, 523, 784], 0.09), exit: () => beep([784, 523, 392], 0.09) };

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
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  };
  const tabIcon = (id) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TAB_IC[id] || TAB_IC.all}</svg>`;
  function paintTabs() {
    const nav = $c('.cc-tabs'); nav.replaceChildren();
    const side = cfg.tabsPos === 'left' || cfg.tabsPos === 'right';
    if (side && window.PadIcons) { const l = el2('span', 'cc-rail-pad'); l.innerHTML = PadIcons.chip('LB'); nav.append(l); }
    S.tabs.forEach((t, i) => {
      const b = el2('button', 'cc-tab' + (i === S.tab ? ' on' : '') + (side ? ' ico' : ''));
      if (side) { b.innerHTML = tabIcon(t.id); b.title = t.title; b.setAttribute('aria-label', t.title); } else b.textContent = t.title;
      b.tabIndex = -1; b.onclick = () => gotoTab(i); nav.append(b);
    });
    if (side && window.PadIcons) { const r = el2('span', 'cc-rail-pad'); r.innerHTML = PadIcons.chip('RB'); nav.append(r); }
    const on = nav.querySelector('.cc-tab.on'); if (on && !side) try { nav.scrollLeft = on.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2; } catch {}
  }
  function tick() { if (box) $c('.cc-clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  const hk = (a) => (hintMode === 'pad' && window.PadIcons ? `<i class="pk">${PadIcons.html(a)}</i>` : `<b>${a}</b>`);
  function hints() {
    const pads = { achs: [['↑ ↓', 'Elegir logro'], ['B', 'Volver']], media: [['◀ ▶', 'Cambiar'], ['A', 'Pausa / Ampliar'], ['B', 'Volver']], list: [['A', 'Abrir'], ['X', 'Jugar'], ['Y', 'Opciones'], ['LB RB', 'Sección'], ['LT RT', 'Saltar'], ['Select + X', 'Menú']], detail: [['A', 'Elegir'], ['X', 'Jugar'], ['Y', 'Opciones'], ['↑ ↓', 'Leer'], ['B', 'Volver']], settings: [['↑ ↓', 'Opción'], ['← →', 'Cambiar'], ['A', 'Aceptar'], ['B', 'Volver']], search: [['A', 'Escribir'], ['B', 'Borrar'], ['Y', 'Espacio'], ['↓ →', 'Resultados'], ['LB RB', 'Sección']], searchRes: [['A', 'Abrir'], ['X', 'Jugar'], ['Y', 'Tienda'], ['↑ ←', 'Teclado'], ['LB RB', 'Sección']], home: [['A', 'Abrir'], ['X', 'Jugar'], ['↑ ↓', 'Fila'], ['← →', 'Elegir'], ['LB RB', 'Sección'], ['Select + X', 'Menú']], settingsCat: [['↑ ↓', 'Categoría'], ['→ / A', 'Entrar'], ['LB RB', 'Sección'], ['B', 'Salir']] };
    const kbs = { search: [['Enter', 'Escribir'], ['Borrar', 'Retroceso'], ['↓ →', 'Resultados'], ['Av Pág / Re Pág', 'Sección']], searchRes: [['Enter', 'Abrir'], ['P', 'Jugar'], ['Tab', 'Tienda'], ['↑ ←', 'Teclado']], home: [['↑ ↓', 'Fila'], ['← →', 'Elegir'], ['Enter', 'Abrir'], ['P', 'Jugar'], ['Av Pág / Re Pág', 'Sección'], ['F2', 'Menú']],  achs: [['↑ ↓', 'Elegir logro'], ['Esc', 'Volver']], media: [['← →', 'Cambiar'], ['Enter', 'Pausa / Ampliar'], ['Esc', 'Volver']], list: [['← →', 'Moverse'], ['Enter', 'Abrir'], ['P', 'Jugar'], ['M', 'Opciones'], ['F', 'Favorito'], ['Av Pág / Re Pág', 'Sección'], ['F2', 'Menú']], detail: [['← →', 'Elegir'], ['Enter', 'Aceptar'], ['P', 'Jugar'], ['↑ ↓', 'Leer'], ['Esc', 'Volver']], settings: [['↑ ↓', 'Opción'], ['← →', 'Cambiar'], ['Enter', 'Aceptar'], ['Esc', 'Volver']], settingsCat: [['↑ ↓', 'Categoría'], ['→ / Enter', 'Entrar'], ['Av Pág / Re Pág', 'Sección'], ['Esc', 'Salir']] };
    const menuH = { pad: [['↑ ↓', 'Opción'], ['A', 'Aceptar'], ['B', 'Cerrar']], kb: [['↑ ↓', 'Opción'], ['Enter', 'Aceptar'], ['Esc', 'Cerrar']] };
    if (S.menu) { $c('.cc-hints').innerHTML = menuH[hintMode === 'pad' ? 'pad' : 'kb'].map(([a, t]) => `<span>${hk(a)}${t}</span>`).join(''); return; }
    const k = S.view === 'detail' && S.det.afocus ? 'achs' : S.view === 'detail' && S.det.mfocus ? 'media' : S.view === 'detail' ? 'detail' : isSettings() ? (S.col === 'cat' ? 'settingsCat' : 'settings') : isHome() ? 'home' : isSearch() ? (SR.zone === 'res' ? 'searchRes' : 'search') : 'list';
    $c('.cc-hints').innerHTML = (hintMode === 'pad' ? pads : kbs)[k].map(([a, t]) => `<span>${hk(a)}${t}</span>`).join('');
  }
  function setBg(g) {
    adaptColors(g);
    const bg = $c('.cc-bg'); const id = ++imgSeq;
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
    if (it.type === 'game') {
      S.focusId = it.g.id; $c('.cc-src').textContent = srcDef(it.g.source).name; titleInto($c('.cc-title'), it.g); $c('.cc-meta').textContent = metaOf(it.g); setBg(it.g);
    } else {
      const name = it.type === 'coll' ? it.c.name : it.s.name;
      $c('.cc-src').textContent = it.type === 'coll' ? 'Colección' : 'Tienda'; $c('.cc-title').textContent = name;
      $c('.cc-meta').textContent = `${it.games.length} juego${it.games.length === 1 ? '' : 's'}`; setBg(it.games[0]);
    }
  }

  // ---------- Lista ----------
  const gridNow = () => cfg.layout === 'grid' || (cfg.layout === 'auto' && isPortrait()) || (isSettings() ? false : S.tabs[S.tab] && S.tabs[S.tab].id === 'colls');
  function applyLayout() { if (!box) return; box.classList.toggle('home-bg', isHome() && S.view === 'list' && cfg.homeBg === 'custom' && !!cfg.homeBgPath); box.classList.toggle('grid', gridNow()); box.classList.toggle('ach-view', !!(S.tabs[S.tab] && S.tabs[S.tab].id === 'ach')); box.classList.toggle('colls-view', !!(S.tabs[S.tab] && S.tabs[S.tab].id === 'colls' && !S.sub)); }
  const coverOk = new Map(); // juego -> portada ya cargada (al repintar no vuelve a verse el color de relleno)
  function loadCover(cv, g) {
    const known = coverOk.get(g.id); if (known) { cv.style.background = `url("${known}") center top / cover no-repeat`; return; }
    cv.style.background = colorFor(g.name);
    const urls = [g.coverSm, g.cover, g.coverFallback].filter(Boolean).map(imgUrl);
    (function next(i) { if (i >= urls.length) return; const im = new Image(); im.onload = () => { coverOk.set(g.id, urls[i]); cv.style.background = `url("${urls[i]}") center top / cover no-repeat`; }; im.onerror = () => next(i + 1); im.src = urls[i]; })(0);
  }
  function tileFor(it) {
    const t = el2('div', 'cc-tile' + (it.type !== 'game' ? ' group' : ''));
    const cv = el2('div', 'cc-cover' + (it.type === 'coll' ? ' coll' : '')); t.append(cv);
    const g = it.type === 'game' ? it.g : it.games[0];
    if (it.type === 'game') { t.dataset.gid = g.id; if (INST.prog[g.id]) setTimeout(() => instMark(t, g.id), 0); }
    if (it.type === 'coll') {
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
      t.onmouseenter = () => { if (padActive()) return; if (curIdx() !== +t.dataset.i) select(+t.dataset.i, true); }; t.onclick = () => { select(+t.dataset.i, true); open(); };
      return t;
    }
    t._load = () => { if (t._done) return; t._done = true; loadCover(cv, g); };
    if (!g.cover && !g.coverFallback) { cv.style.background = colorFor(g.name); cv.textContent = (g.name[0] || '?').toUpperCase(); t._done = true; }
    const label = it.type === 'game' ? g.name : (it.type === 'coll' ? it.c.name : it.s.name);
    t.append(el2('div', 'cc-name', label));
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
    t.onclick = () => { select(+t.dataset.i, true); open(); };
    t.oncontextmenu = (e) => { e.preventDefault(); select(+t.dataset.i, true); menu(e.clientX, e.clientY); };
    return t;
  }
  function paintList(keepId) {
    applyLayout();
    const strip = $c('.cc-strip'); strip.replaceChildren();
    const items = cur();
    items.forEach((it, i) => { const t = tileFor(it); t.dataset.i = i; strip.append(t); });
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
    const t = strip.children[curIdx()]; if (!t || !t.dataset) return; t.classList.add('sel'); ensureImgs(); animSel();
    if (box.classList.contains('ach-view')) { const top = t.offsetTop - (strip.clientHeight - t.offsetHeight) / 2; strip.scrollTo({ top: Math.max(0, top), behavior: instant ? 'instant' : 'smooth' }); return; }
    if (gridNow()) { const top = t.offsetTop - (strip.clientHeight - t.offsetHeight) / 2; strip.scrollTo({ top: Math.max(0, top), behavior: instant ? 'instant' : 'smooth' }); return; }
    const left = t.offsetLeft - (strip.clientWidth - t.offsetWidth) / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: instant ? 'instant' : 'smooth' }); // sin scrollIntoView: no mueve nada más que la fila
  }
  function select(i, fromMouse) {
    const n = cur().length; if (!n) return; i = Math.max(0, Math.min(n - 1, i)); if (i === curIdx() && !fromMouse) return;
    if (!fromMouse || i !== curIdx()) SND.move(); setIdx(i); const strip = $c('.cc-strip'); strip.querySelectorAll('.sel').forEach((e) => e.classList.remove('sel')); const t = strip.children[i]; if (t) t.classList.add('sel');
    ensureImgs(); animSel(); if (!fromMouse) mark(); paintHero();
  }


  // ---------- Inicio: novedades, gratis, eventos y rebajas ----------
  const HM = { r: 0, c: [], rows: [], data: { free: null, events: null, wish: null }, at: 0, loading: false, failed: false };
  const dayFmt = (ms) => new Date(ms).toLocaleDateString([], { day: 'numeric', month: 'short' });
  const leftTxt = (end) => { const d = Math.ceil((end - Date.now()) / 86400000); return d <= 0 ? 'Termina hoy' : d === 1 ? 'Termina mañana' : `Termina en ${d} días`; };
  const homeCard = () => { const row = HM.rows[HM.r]; return row ? row.items[HM.c[HM.r] || 0] : null; };
  async function loadHome(force) {
    if (HM.loading || (!force && HM.at && Date.now() - HM.at < 5 * 60 * 1000)) return;
    HM.loading = true; HM.failed = false;
    const ask = (fn) => { try { return typeof fn === 'function' ? Promise.resolve(fn(!!force)).catch(() => null) : Promise.resolve(null); } catch { return Promise.resolve(null); } };
    const [free, ev, wish] = await Promise.all([ask(window.api.freeGet), ask(window.api.eventsGet), ask(window.api.wishGet)]);
    HM.data = { free, events: ev, wish }; HM.at = Date.now(); HM.loading = false; HM.failed = !free && !ev && !wish;
    if (active && isHome() && S.view === 'list' && !S.menu) paintHome(true);
  }
  // Tarjeta flotante del juego en ejecución (se ve en cualquier sección)
  function updNowCard() {
    if (!box) return; let c = $c('.cc-nowcard'), d = $c('.cc-nowdim');
    const rg = runState ? state.games.find((g) => runStateFor(g)) : null;
    const on = !!(rg && cfg.nowCard && active);
    if (!d) { d = el2('div', 'cc-nowdim'); box.append(d); }
    d.classList.toggle('on', on);
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
    if (rec.length) rows.push({ id: 'cont', title: 'Continuar jugando', items: rec.map((g) => G(g, fmtLast(g.lastPlayed), g.installed === false ? 'No instalado' : ''))});
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
  function homeImg(div, c) {
    div.style.background = colorFor(c.title);
    const urls = c.img || [];
    (function next(i) { if (i >= urls.length) return; const im = new Image(); im.onload = () => { div.style.background = `url("${urls[i]}") center / cover no-repeat`; }; im.onerror = () => next(i + 1); im.src = urls[i]; })(0);
  }
  function paintHome(keep) {
    const h = $c('.cc-home'); if (!h) return;
    const prevId = keep && homeCard() ? (homeCard().g ? homeCard().g.id : homeCard().url || homeCard().title) : null, prevR = HM.rows[HM.r] && HM.rows[HM.r].id;
    HM.rows = homeRows(); h.replaceChildren();
    const sc = el2('div', 'cc-h-scroll'); h.append(sc);
    if (!HM.rows.length) sc.append(el2('div', 'cc-empty', HM.loading ? 'Cargando novedades…' : HM.failed ? 'No se pudieron cargar las novedades. Revisa tu conexión.' : 'Aún no hay novedades que mostrar.'));
    HM.rows.forEach((row, ri) => {
      const r = el2('div', 'cc-h-row'); r.append(el2('h2', 'cc-h-title', row.title));
      const strip = el2('div', 'cc-h-strip');
      row.items.forEach((c, ci) => {
        const d = el2('div', 'cc-hc' + (c.done ? ' done' : '') + (c.now ? ' now' : '')), im = el2('div', 'cc-hc-img'); homeImg(im, c); if (c.kind === 'game') { d.dataset.gid = c.g.id; if (INST.prog[c.g.id]) setTimeout(() => instMark(d, c.g.id), 0); }
        if (c.kind === 'event') { im.classList.add('ev', 'ev-' + (c.store || 'all')); im.style.background = ''; const ic = el2('span', 'cc-hc-evic'); try { ic.append(sourceIcon(c.store === 'steam' ? 'steam' : c.store === 'epic' ? 'epic' : 'local', 64)); } catch {} im.append(ic); }
        if (c.kind === 'game') { const lg = c.g.logoSm || c.g.logo; if (lg && !c.g.logoOff) { const li = new Image(); li.className = 'cc-hc-logo'; li.alt = ''; li.draggable = false; li.onload = () => im.classList.add('has-logo'); li.onerror = () => li.remove(); li.src = imgUrl(lg); im.append(li); } }
        if (c.badge) im.append(el2('span', 'cc-hc-badge' + (/GRATIS|−/.test(c.badge) ? ' hot' : ''), c.badge));
        if (c.tag) im.append(el2('span', 'cc-hc-tag', c.tag));
        const b = el2('div', 'cc-hc-body'); b.append(el2('div', 'cc-hc-name', c.title), el2('div', 'cc-hc-sub', c.sub || ''));
        d.append(im, b); d.onclick = () => { HM.r = ri; HM.c[ri] = ci; homeMark(); homeAccept(); };
        strip.append(d);
      });
      r.append(strip); sc.append(r);
    });
    if (HM.loading && HM.rows.length) sc.append(el2('div', 'cc-h-load', 'Buscando novedades…'));
    let ri = prevR ? HM.rows.findIndex((x) => x.id === prevR) : -1; HM.r = ri >= 0 ? ri : Math.min(HM.r, Math.max(0, HM.rows.length - 1));
    if (prevId) { const ci = HM.rows[HM.r] ? HM.rows[HM.r].items.findIndex((c) => (c.g ? c.g.id : c.url || c.title) === prevId) : -1; if (ci >= 0) HM.c[HM.r] = ci; }
    homeMark(true);
  }
  function homeMark(instant) {
    const h = $c('.cc-home'), rows = h.querySelectorAll('.cc-h-row'); h.querySelectorAll('.cc-hc.sel').forEach((e) => e.classList.remove('sel'));
    const row = rows[HM.r]; if (!row) { setBg(null); return; }
    const c = Math.max(0, Math.min((HM.rows[HM.r].items.length || 1) - 1, HM.c[HM.r] || 0)); HM.c[HM.r] = c;
    const card = row.querySelectorAll('.cc-hc')[c]; if (!card) return; card.classList.add('sel');
    const strip = row.querySelector('.cc-h-strip'), sc = h.querySelector('.cc-h-scroll'), beh = instant ? 'instant' : 'smooth';
    strip.scrollTo({ left: Math.max(0, card.offsetLeft - (strip.clientWidth - card.offsetWidth) / 2), behavior: beh });
    sc.scrollTo({ top: Math.max(0, row.offsetTop - sc.offsetTop - sc.clientHeight * 0.12), behavior: beh });
    const it = HM.rows[HM.r].items[c]; setBg(it.g || (it.img && it.img[0] ? { id: 'home:' + it.title, banner: it.img[0] } : null));
  }
  function homeNav(dir) {
    if (!HM.rows.length) return;
    if (dir === 'up' || dir === 'down') { const r = Math.max(0, Math.min(HM.rows.length - 1, HM.r + (dir === 'down' ? 1 : -1))); if (r === HM.r) return; SND.move(); HM.r = r; }
    else { const n = HM.rows[HM.r].items.length, c = Math.max(0, Math.min(n - 1, (HM.c[HM.r] || 0) + (dir === 'right' ? 1 : -1))); if (c === (HM.c[HM.r] || 0)) return; SND.move(); HM.c[HM.r] = c; }
    homeMark(false);
  }
  function homeAccept() {
    const c = homeCard(); if (!c) return;
    if (c.kind === 'game') return openDetail(c.g.id);
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
    const h = $c('.cc-search'); if (!h) return;
    SR.res = srFind(); SR.ri = Math.min(SR.ri, Math.max(0, SR.res.length - 1)); if (SR.zone === 'res' && !SR.res.length) SR.zone = 'kb';
    h.replaceChildren();
    const left = el2('div', 'cc-sr-left'), q = el2('div', 'cc-sr-q'); q.append(el2('span', 'cc-sr-text', SR.q), el2('span', 'cc-sr-caret'));
    if (!SR.q) q.classList.add('empty'); q.dataset.ph = 'Escribe un juego…';
    const kb = el2('div', 'cc-sr-kb');
    KB.forEach((row, r) => row.forEach((k, c) => { const b = el2('button', 'cc-sr-key' + (k === '␣' || k === '⌫' || k === '✕' ? ' sp' : ''), k === '␣' ? 'Espacio' : k === '✕' ? 'Limpiar' : k); b.tabIndex = -1; b.dataset.r = r; b.dataset.c = c; b.onclick = () => { SR.zone = 'kb'; SR.kr = r; SR.kc = c; searchMark(); searchAccept(); }; kb.append(b); }));
    const st = el2('div', 'cc-sr-store', 'Tienda: ' + (SR.store === 'all' ? 'todas' : srcDef(SR.store).name));
    left.append(q, kb, st);
    const right = el2('div', 'cc-sr-right'), head = el2('div', 'cc-sr-head', SR.q.trim() ? (SR.res.length ? `${SR.res.length} resultado${SR.res.length === 1 ? '' : 's'}` : 'Sin resultados') : 'Escribe para buscar entre tus juegos');
    const grid = el2('div', 'cc-sr-grid');
    SR.res.forEach((g, i) => { const t = el2('div', 'cc-sr-t'), cv = el2('div', 'cc-sr-cv'); loadCover(cv, g); if (g.installed === false) t.classList.add('ni'); t.append(cv, el2('div', 'cc-sr-n', g.name)); t.onclick = () => { SR.zone = 'res'; SR.ri = i; searchMark(); searchAccept(); }; grid.append(t); });
    right.append(head, grid); h.append(left, right); searchMark(true);
  }
  function searchMark(instant) {
    const h = $c('.cc-search'); if (!h) return;
    h.querySelectorAll('.sel').forEach((e) => e.classList.remove('sel')); h.classList.toggle('zone-res', SR.zone === 'res');
    const key = h.querySelector(`.cc-sr-key[data-r="${SR.kr}"][data-c="${SR.kc}"]`); if (key && SR.zone === 'kb') key.classList.add('sel');
    const t = h.querySelectorAll('.cc-sr-t')[SR.ri]; if (t && SR.zone === 'res') { t.classList.add('sel'); const gr = h.querySelector('.cc-sr-grid'); gr.scrollTo({ top: Math.max(0, t.offsetTop - gr.clientHeight / 2 + t.offsetHeight / 2), behavior: instant ? 'instant' : 'smooth' }); }
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
  function gotoTab(i) {
    if (S.menu) return;
    if (i === S.tab && S.view === 'list' && !S.sub) return;
    if (!isSettings() && S.tabs[(i + S.tabs.length) % S.tabs.length].id === 'settings') S.prev = { id: S.tabs[S.tab].id, sub: S.sub ? S.sub.title : null, focus: S.focusId }; // para volver al mismo punto
    S.achPane = false; $c('.cc-achpane').classList.remove('focus'); achFor = null;
    SND.tab(); S.tab = (i + S.tabs.length) % S.tabs.length; S.sub = null; S.view = 'list';
    const id = S.tabs[S.tab].id; S.items = tabItems(id === 'settings' ? 'all' : id); S.idx = id === 'settings' ? S.idx : 0;
    if (id === 'settings') { S.col = 'cat'; }
    paintTabs(); showView(); hints();
    paintList(id === 'settings' ? S.focusId : undefined); if (id === 'settings') paintSettings(); else if (id === 'home') { loadHome(false); paintHome(true); animIn($c('.cc-home')); } else if (id === 'search') { SR.zone = 'kb'; paintSearch(); animIn($c('.cc-search')); } else animIn($c('.cc-listwrap'));
  }

  function animIn(el) { el.classList.remove('in'); void el.offsetWidth; el.classList.add('in'); }
  function showView() {
    try { updNowCard(); } catch {}
    const isSet = isSettings(), isDet = S.view === 'detail', isHm = isHome(), isSr = isSearch();
    $c('.cc-hero').classList.toggle('hidden', isDet || isHm || isSr); $c('.cc-listwrap').classList.toggle('hidden', isDet || isHm || isSr); $c('.cc-search').classList.toggle('hidden', !isSr || isDet); $c('.cc-home').classList.toggle('hidden', !isHm || isDet);
    $c('.cc-detail').classList.toggle('hidden', !isDet); $c('.cc-settings').classList.toggle('hidden', !isSet || isDet);
    box.classList.toggle('setmode', isSet && !isDet);
  }

  function open() {
    const it = cur()[curIdx()]; if (!it) return;
    if (it.type === 'game') return openDetail(it.g.id);
    SND.open(); S.sub = { title: it.type === 'coll' ? it.c.name : it.s.name, items: gameItems(it.games), idx: 0, parent: S.idx };
    paintList(); animIn($c('.cc-listwrap'));
  }
  function play(g) { if (!g) return; SND.play(); if (runStateFor(g)) { toast('Ese juego ya está en ejecución'); return; } if (cfg.onPlay === 'min') S.minFor = { id: g.id, t: Date.now() }; launch(g); }
  function curGame() { if (isSettings() && S.view !== 'detail') return null; if (S.view === 'detail') return byId(S.det.id); if (isSearch()) return SR.zone === 'res' && SR.res[SR.ri] ? SR.res[SR.ri] : null;
    if (isHome()) { const c = homeCard(); return c && c.kind === 'game' ? c.g : null; } const it = cur()[curIdx()]; return it && it.type === 'game' ? it.g : null; }
  // ---------- Menús propios (con el estilo del modo consola) ----------
  function cmenu(title, items) {
    SND.menu(); S.menu = { title, items: items.filter(Boolean), idx: 0 };
    let ov = $c('.cc-menu-ov'); if (!ov) { ov = el2('div', 'cc-menu-ov'); box.append(ov); }
    paintMenu(); animIn($c('.cc-menu-ov')); hints();
  }
  function paintMenu() {
    const ov = $c('.cc-menu-ov'); if (!ov || !S.menu) return; ov.replaceChildren(); ov.classList.remove('hidden');
    ov.onclick = (e) => { if (e.target === ov) closeCMenu(); };
    const p = el2('div', 'cc-menu'); p.append(el2('div', 'cc-menu-title', S.menu.title));
    S.menu.items.forEach((it, i) => {
      if (it.sep) { p.append(el2('div', 'cc-menu-sep')); return; }
      const r = el2('div', 'cc-menu-it' + (i === S.menu.idx ? ' sel' : '') + (it.danger ? ' danger' : '')); r.dataset.i = i;
      r.append(el2('span', null, it.label)); if (it.value) r.append(el2('b', null, it.value));
      r.onmouseenter = () => { if (padActive() || !S.menu || S.menu.idx === i) return; S.menu.idx = i; p.querySelectorAll('.cc-menu-it').forEach((e) => e.classList.toggle('sel', +e.dataset.i === i)); };
      r.onclick = () => { S.menu.idx = i; runMenu(); };
      p.append(r);
    });
    ov.append(p);
  }
  function closeCMenu() { S.menu = null; const ov = $c('.cc-menu-ov'); if (ov) ov.classList.add('hidden'); hints(); }
  function runMenu() { const it = S.menu && S.menu.items[S.menu.idx]; if (!it || it.sep) return; closeCMenu(); SND.open(); try { it.run(); } catch {} }
  function menuMove(d) { if (!S.menu) return; const n = S.menu.items.length; let i = S.menu.idx; do { i = (i + d + n) % n; } while (S.menu.items[i].sep); S.menu.idx = i; SND.move(); paintMenu(); const sel = $c('.cc-menu-it.sel'); if (sel) sel.scrollIntoView({ block: 'nearest' }); }
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
  function sysMenu() {
    if (S.menu) return;
    cmenu('Modo consola', [
      { label: 'Ajustes del modo consola', run: () => gotoTab(S.tabs.length - 1) },
      { label: 'Vista de la lista', value: gridNow() ? 'Vertical (cuadrícula)' : 'Horizontal (fila)', run: () => { cfg.layout = gridNow() ? 'row' : 'grid'; applyCfg(); save(); toast('Vista ' + (cfg.layout === 'grid' ? 'vertical' : 'horizontal')); if (S.view === 'detail') backDetail(); else if (isSettings()) paintSettings(); else { applyLayout(); paintList(S.focusId); } } },
      { label: 'Sonidos', value: cfg.sound ? 'Sí' : 'No', run: () => { cfg.sound = !cfg.sound; applyCfg(); save(); toast('Sonidos ' + (cfg.sound ? 'activados' : 'desactivados')); } },
      ...(() => { const rg = runState ? state.games.find((g) => runStateFor(g)) : null; return rg ? [{ label: 'Cerrar «' + rg.name + '»', danger: true, run: () => cmenu('¿Cerrar «' + rg.name + '»?', [{ label: 'No, volver', run: () => {} }, { label: 'Sí, cerrar el juego', danger: true, run: () => stopGame(rg) }]) }] : []; })(),
      { label: 'Actualizar la biblioteca', run: () => refreshLibrary() },
      { label: 'Guardar ajustes', run: () => saveNow() },
      { sep: true },
      ...(S.notes.length ? [{ label: 'Avisos', value: String(S.notes.length), run: () => noticesMenu() }] : []),
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
    if (S.menu && idx) { S.menu.idx = idx; paintMenu(); }
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
  function noticeIn(n) {
    if (!n || !n.title) return;
    S.notes.unshift({ kind: n.kind, title: n.title, body: n.body || '', at: Date.now() }); S.notes.length = Math.min(S.notes.length, 15);
    NT.q.push(n); if (!NT.cur) noticeNext();
  }
  function noticeNext() {
    const n = NT.q.shift(); const old = $c('.cc-notice');
    if (!n || !box) { NT.cur = null; if (old) old.classList.remove('on'); return; }
    NT.cur = n; let el = old; if (!el) { el = el2('div', 'cc-notice'); box.append(el); }
    el.replaceChildren(el2('div', 'cc-ntc-ic', n.kind === 'wish' ? '🏷' : n.kind === 'events' ? '🎉' : n.kind === 'inst' ? '✅' : n.kind === 'uninst' ? '🗑' : '🎁'), (() => { const b = el2('div', 'cc-ntc-tx'); b.append(el2('div', 'cc-ntc-t', n.title), el2('div', 'cc-ntc-b', n.body || '')); return b; })());
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); SND.open();
    clearTimeout(NT.t); NT.t = setTimeout(() => { const e = $c('.cc-notice'); if (e) e.classList.remove('on'); NT.t = setTimeout(noticeNext, 500); }, 7000);
  }
  function noticesMenu() {
    if (!S.notes.length) { toast('No hay avisos'); return; }
    const hm = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    cmenu('Avisos', S.notes.map((n) => ({ label: n.title, value: hm(n.at), run: () => { const i = S.tabs.findIndex((t) => t.id === 'home'); if (i >= 0) gotoTab(i); } })));
  }
  try { if (window.api.onCouchNotice) window.api.onCouchNotice(noticeIn); } catch {}
  try { if (window.api.onOverlayState) window.api.onOverlayState((v) => { window.__overlayOpen = !!v; }); } catch {}

  async function favorite() { const g = curGame(); if (g) { await toggleFav(g); } }

  // ---------- Ficha del juego ----------
  function openDetail(id) {
    const g = byId(id); if (!g) return;
    SND.open(); S.view = 'detail'; S.det = { id, btn: 0, scrollAch: false, mi: 0, mfocus: false, afocus: false, asel: 0 }; showView(); paintDetail(); hints(); animIn($c('.cc-detail'));
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
    md.all.forEach((x, k) => { const b = el2('button', 'cc-mthumb' + (x.kind === 'video' ? ' vid' : '')); b.tabIndex = -1; if (x.thumb) { const im = new Image(); im.loading = 'lazy'; im.alt = ''; im.src = imgUrl(x.thumb); b.append(im); } if (x.kind === 'video') b.append(el2('span', 'cc-play', '▶')); b.onclick = () => { S.det.mfocus = true; showMedia(k, true); }; th.append(b); });
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
    left.append(body); page.append(left);
    const mp = mediaPanel(g); if (mp) { if (isPortrait()) left.insertBefore(mp, body); else page.append(mp); }
    body.scrollTop = 0;
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
  function detBtns() { const g = byId(S.det.id); return g ? detailButtons(g) : []; }

  // ---------- Ajustes del modo consola ----------
  const CATS = ['Apariencia', 'Distribución', 'Texto y pantalla', 'Sonido', 'General'];
  const catRows = () => setRows().filter((r) => r.cat === S.cat);
  function setRows() {
    const th = THEMES.find((x) => x.id === cfg.theme) || THEMES[0];
    const cyc = (key, list) => (d) => { const i = list.findIndex((o) => o[0] === cfg[key]); cfg[key] = list[(i + d + list.length) % list.length][0]; };
    const lbl = (key, list) => (list.find((o) => o[0] === cfg[key]) || list[0])[1];
    const TH = THEMES.map((t) => [t.id, t.name]), BG = [['game', 'Banner del juego'], ['art', 'Ilustración del tema'], ['plain', 'Color liso']], TL = [['xs', 'Muy pequeñas'], ['s', 'Pequeñas'], ['m', 'Medianas'], ['l', 'Grandes'], ['xl', 'Muy grandes']], BN = [['side', 'Lateral con degradado'], ['full', 'Pantalla completa']], GP = [['s', 'Pegadas'], ['m', 'Normal'], ['l', 'Separadas']], RP = [['high', 'Alta'], ['mid', 'Media'], ['low', 'Baja']], SV = [['s', 'Bajo'], ['m', 'Medio'], ['l', 'Alto']], LY = [['auto', 'Automática (según la pantalla)'], ['row', 'Fila horizontal'], ['grid', 'Cuadrícula vertical']], BD = [['none', 'Sin borde'], ['thin', 'Fino'], ['normal', 'Normal']], RD = [['s', 'Rectas'], ['m', 'Redondeadas'], ['l', 'Muy redondeadas']], YN = [[true, 'Sí'], [false, 'No']], HB = [['game', 'Según el juego enfocado'], ['custom', 'Imagen propia'], ['plain', 'Color liso']], PI = [['auto', 'Automático'], ['xbox', 'Xbox'], ['ps', 'PlayStation'], ['nintendo', 'Nintendo'], ['generic', 'Genérico']], SF = [[0, 'Ninguno'], [2, '2 %'], [4, '4 %'], [6, '6 %'], [8, '8 %'], [10, '10 %']], TP = [['top', 'Arriba (texto)'], ['left', 'Izquierda (iconos)'], ['right', 'Derecha (iconos)']], OP = [['keep', 'Mantener el modo consola'], ['min', 'Minimizar el modo consola']], FN = [['s', 'Pequeña'], ['m', 'Normal'], ['l', 'Grande']], NM = [['focus', 'Solo el enfocado'], ['all', 'Todos']];
    const CAT_OF = { 'Tarjeta del juego en ejecución': 1, 'Margen de pantalla (televisor)': 1, 'Tema de colores': 0, 'Colores según el juego': 0, 'Fondo de Inicio': 0, 'Elegir imagen para Inicio…': 0, 'Fondo': 0, 'Posición del banner': 0, 'Desenfocar el fondo': 0, 'Oscurecer el fondo': 0, 'Posición de las secciones': 1, 'Distribución': 1, 'Tamaño de las portadas': 1, 'Separación entre portadas': 1, 'Altura de la fila horizontal': 1, 'Esquinas de las portadas': 1, 'Borde de selección': 1, 'Mostrar título e información': 1, 'Mostrar nombres': 1, 'Tamaño de la letra': 2, 'Reloj y batería': 2, 'Sonidos': 3, 'Volumen de los sonidos': 3 };
    return [
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
    ].map((r) => ({ ...r, cat: CAT_OF[r.name] ?? 4 }));
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
      if (!r.action) { const v = el2('span', 'cc-s-val'); v.append(el2('i', null, '‹'), document.createTextNode(' ' + r.val + ' '), el2('i', null, '›')); row.append(v); }
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
  function nav(dir) {
    if (!captures()) return;
    if (S.viewer) { if (dir === 'left') viewerMove(-1); else if (dir === 'right') viewerMove(1); return; }
    if (S.view === 'detail' && S.det.afocus) { if (dir === 'up' || dir === 'down') { const n = $c('.cc-d-body').querySelectorAll('.cc-ach').length, k = Math.max(0, Math.min(n - 1, (S.det.asel || 0) + (dir === 'down' ? 1 : -1))); if (k !== S.det.asel) { S.det.asel = k; SND.move(); detAchMark(); } } else if (dir === 'left') { SND.back(); detAchLeave(); } return; }
    if (S.view === 'detail' && S.det.mfocus) { if (dir === 'left') mediaMove(-1); else if (dir === 'right') mediaMove(1); return; }
    if (S.menu) { if (dir === 'up') menuMove(-1); else if (dir === 'down') menuMove(1); return; }
    if (S.view === 'detail') {
      if (dir === 'left' || dir === 'right') { const n = detBtns().length; S.det.btn = Math.max(0, Math.min(n - 1, S.det.btn + (dir === 'right' ? 1 : -1))); $c('.cc-det-btns').querySelectorAll('.cc-btn').forEach((e, k) => e.classList.toggle('sel', k === S.det.btn)); }
      else $c('.cc-d-body').scrollTop += dir === 'down' ? 140 : -140;
      return;
    }
    if (isHome()) { homeNav(dir); return; }
    if (isSearch()) { searchNav(dir); return; }
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
    if (S.viewer) { closeViewer(); return; }
    if (S.view === 'detail' && S.det.afocus) { SND.back(); detAchLeave(); return; }
    if (S.view === 'detail' && S.det.mfocus) { SND.back(); mediaLeave(); return; }
    if (S.menu) { SND.back(); closeCMenu(); return; }
    if (S.achPane && S.view !== 'detail') { S.achPane = false; $c('.cc-achpane').classList.remove('focus'); SND.back(); achMark(); hints(); return; }
    if (S.view === 'detail' || S.sub) SND.back();
    if (S.view === 'detail') return backDetail();
    if (S.sub) { S.sub = null; paintList(); return; }
    if (isSearch() && S.view === 'list') { if (SR.zone === 'res') { SR.zone = 'kb'; SND.back(); searchMark(); hints(); } else searchBack(); return; }
    if (isSettings()) { if (S.col === 'rows') { S.col = 'cat'; SND.back(); paintSettings(); hints(); return; } leaveSettings(); return; }
    /* en las pantallas principales B no cierra: se sale con Select + X (menú) */
  }
  function accept() {
    if (!captures()) return;
    if (S.viewer) { viewerToggle(); return; }
    if (S.view === 'detail' && S.det.afocus) return;
    if (S.view === 'detail' && S.det.mfocus) { mediaAccept(); return; }
    if (S.menu) { runMenu(); return; }
    if (S.view === 'detail') { const b = detBtns()[S.det.btn]; if (b) b.run(); return; }
    if (isSettings()) { if (S.col === 'cat') { S.col = 'rows'; SND.open(); paintSettings(); hints(); return; } return settingsAct(0, true); }
    if (isHome()) { homeAccept(); return; }
    if (isSearch()) { searchAccept(); return; }
    open();
  }
  function btn(i) { // numeración estándar del mando
    if (!captures()) return;
    if (S.viewer || S.menu) { if (i === 0) accept(); else if (i === 1) back(); return; }
    if (isSearch() && S.view === 'list' && (i === 2 || i === 3) && !padHeld(8)) { searchBtn(i); return; }
    if (i === 0) accept(); else if (i === 1) back();
    else if (i === 2) { if (padHeld(8)) sysMenu(); else play(curGame()); } else if (i === 3) menu();
    else if (i === 4) gotoTab(S.tab - 1); else if (i === 5) gotoTab(S.tab + 1);
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
      if (k === 'Backspace') { searchBack(); e.preventDefault(); e.stopPropagation(); return; }
      if (k === 'Tab') { e.preventDefault(); e.stopPropagation(); if (SR.zone === 'res') searchStore(); return; }
      if (SR.zone === 'kb' && k.length === 1 && /[\p{L}\p{N} .'&:\-]/u.test(k)) { searchType(k); e.preventDefault(); e.stopPropagation(); return; }
    }
    let h = true;
    if (map[k]) nav(map[k]); else if (k === 'Enter') accept(); else if (k === 'Escape' || k === 'Backspace') back();
    else if (k === 'PageDown') gotoTab(S.tab + 1); else if (k === 'PageUp') gotoTab(S.tab - 1);
    else if (S.menu || S.viewer) {} else if (k === 'Home') select(0); else if (k === 'End') select(cur().length - 1);
    else if (k === 'F2') sysMenu();
    else if (S.menu || S.viewer) { /* con un menú abierto solo flechas, Enter y Esc */ }
    else if (k.toLowerCase() === 'p') play(curGame()); else if (k.toLowerCase() === 'm') menu(); else if (k.toLowerCase() === 'f') favorite();
    else if (k === 'F1') gotoTab(S.tabs.length - 1);
    else h = false;
    if (h) { e.preventDefault(); e.stopPropagation(); }
  }

  // ---------- Entrar / salir ----------
  let entering = false;
  function showSplash() {
    const th = THEMES.find((x) => x.id === cfg.theme) || THEMES[0];
    const d = el2('div', 'cc-splash'); d.style.cssText = `--sa:${th.accent};--sb:${th.accent2};--sbg:${th.bg};--stx:${th.text}`;
    d.innerHTML = '<div class="cc-sp-in"><svg class="cc-sp-logo" viewBox="0 0 24 24" aria-hidden="true"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="13" r="1"/><circle cx="18" cy="11" r="1"/><path d="M17.3 5H6.7a4 4 0 0 0-3.9 3.2l-1.7 8A3 3 0 0 0 4 20c1 0 1.6-.6 2.2-1.4L8 16h8l1.8 2.6c.6.8 1.2 1.4 2.2 1.4a3 3 0 0 0 2.9-3.8l-1.7-8A4 4 0 0 0 17.3 5z"/></svg><div class="cc-sp-name">Comptus</div><div class="cc-sp-sub">Iniciando el modo consola…</div><div class="cc-sp-bar"><i></i></div></div>';
    document.body.append(d); return d;
  }
  async function enter() {
    if (active || entering) return;
    entering = true; const t0 = Date.now(), sp = showSplash();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); // deja que se vea antes del trabajo pesado
    if (!box) build();
    active = true; INST.snap = null; clearInterval(INST.pt); INST.pt = setInterval(instPoll, 2500); setTimeout(instPoll, 300); hintMode = document.body.classList.contains('pad-mode') ? 'pad' : 'kb'; applyCfg(); box.classList.toggle('padmode', hintMode === 'pad');
    try { const r = await window.api.setFullscreen(true); wasFs = !!(r && r.was); } catch { wasFs = false; }
    document.body.classList.add('couch-on'); box.classList.remove('hidden'); box.classList.add('idle');
    tick(); clearInterval(clockT); clockT = setInterval(tick, 20000);
    S.view = 'list'; S.sub = null; buildTabs(); S.tab = Math.min(S.tab, S.tabs.length - 1);
    S.items = tabItems(isSettings() ? 'all' : S.tabs[S.tab].id); showView(); paintTabs(); hints(); applyCfg();
    paintList(S.focusId); if (isSettings()) paintSettings(); if (isHome()) { loadHome(false); paintHome(true); } if (isSearch()) paintSearch();
    document.addEventListener('keydown', onKey, true);
    entering = false;
    setTimeout(() => { sp.classList.add('out'); SND.enter(); setTimeout(() => sp.remove(), 450); }, Math.max(0, 1100 - (Date.now() - t0)));
  }
  async function exit() {
    if (!active) return;
    SND.exit(); closeViewer(true); inlineStop(); S.menu = null; active = false; clearInterval(INST.pt); document.removeEventListener('keydown', onKey, true); clearInterval(clockT);
    box.classList.add('hidden'); document.body.classList.remove('couch-on');
    try { await window.api.setFullscreen(false, wasFs); } catch {}
  }
  window.addEventListener('resize', () => { if (!active || !box) return; applyCfg(); if (S.view === 'list') { mark(true); } });
  const toggle = () => { if (entering) return; return active ? exit() : enter(); };

  let rt = null;
  root.Couch = {
    toggle, enter, exit, nav, btn, axis, captures,
    configure(c) {
      let loc = null; try { loc = JSON.parse(localStorage.getItem(LS) || 'null'); } catch {}
      loadSrc = c && typeof c === 'object' && Object.keys(c).length ? 'archivo de Comptus' : loc ? 'copia local' : 'valores por defecto';
      const src = c && typeof c === 'object' && Object.keys(c).length ? c : loc; // el archivo manda; si estuviera vacío se usa la copia local
      cfg = { ...DEF, ...(src || {}) }; if (box) applyCfg();
      if (!(c && Object.keys(c).length) && loc) save();
    },
    hints(m) { hintMode = m; if (box) box.classList.toggle('padmode', m === 'pad'); if (active) hints(); },
    get active() { return active; },
    onRender() { // la biblioteca se ha vuelto a cargar: se refresca sin mover tu sitio
      if (!active) return; clearTimeout(rt); instDiff();
      rt = setTimeout(() => { setTimeout(instApply, 120);
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
      if (rg && runState.state === 'running') { if (!S.play || S.play.id !== rg.id) S.play = { id: rg.id, t: Date.now() }; } else if (!rg) S.play = null;
      updNowCard();
      const fresh = rg && S.nowId !== rg.id; S.nowId = rg ? rg.id : null;
      if (isHome() && S.view !== 'detail') { paintHome(true); if (fresh) { const ni = HM.rows.findIndex((x) => x.id === 'now'); if (ni >= 0) { HM.r = ni; HM.c[ni] = 0; homeMark(false); } } }
      if (S.minFor) { const mg = byId(S.minFor.id); if (Date.now() - S.minFor.t > 25000) S.minFor = null; else if (mg && runStateFor(mg)) { S.minFor = null; setTimeout(() => { try { window.api.couchMinimize(); } catch {} }, 1200); } } if (S.view === 'detail') paintDetail(); else document.querySelectorAll('#couch .cc-tile').forEach((t) => { const it = cur()[+t.dataset.i]; if (!it || it.type !== 'game') return; const has = t.querySelector('.cc-run'), run = runStateFor(it.g); if (run && !has) t.append(el2('span', 'cc-run', 'En ejecución')); else if (!run && has) has.remove(); }); } },
  };
  if ('__couchCfg' in window) root.Couch.configure(window.__couchCfg); // renderer.js terminó antes de que cargara este archivo
})(window);
