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
