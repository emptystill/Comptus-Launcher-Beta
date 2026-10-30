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
