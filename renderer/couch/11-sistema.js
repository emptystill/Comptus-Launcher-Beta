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

