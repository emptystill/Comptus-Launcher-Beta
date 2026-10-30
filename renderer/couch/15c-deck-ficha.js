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
