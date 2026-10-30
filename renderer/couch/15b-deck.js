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
