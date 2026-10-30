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

