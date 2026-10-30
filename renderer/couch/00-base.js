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

