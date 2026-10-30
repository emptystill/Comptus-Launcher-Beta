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
