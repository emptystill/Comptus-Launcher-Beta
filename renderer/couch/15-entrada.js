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

