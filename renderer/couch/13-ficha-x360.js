  // ---------- Página del juego, estilo Xbox 360: resumen / detalles / logros / galería ----------
  const X3_TABS = true; // pestañas resumen/detalles/logros/galería en la página del juego (estilo Xbox 360)
  function x3Tabs(g) { const md = mediaOf(g); return [['ov', 'resumen'], ['det', 'detalles'], ...(g.achievements && g.achievements.total > 0 ? [['ach', 'logros']] : []), ...(md.all.length ? [['gal', 'galería']] : [])]; }
  function x3Tiles(g) {
    const md = mediaOf(g), rs = runStateFor(g);
    return [
      { label: rs ? (rs.state === 'stopping' ? 'Cerrando…' : 'Cerrar el juego') : '▶  Jugar', primary: true, run: () => { if (rs) stopGame(g); else play(g); } },
      { label: g.favorite ? '★ Quitar de favoritos' : '☆ Favorito', run: () => favorite() },
      ...(md.movies.length ? [{ label: '🎬 Tráiler', run: () => x3Tab('gal', 0, true) }] : []),
      ...(md.shots.length ? [{ label: '🖼 Capturas', run: () => x3Tab('gal', md.movies.length, false) }] : []),
      { label: '⋯ Más opciones', run: () => menu() },
    ];
  }
  // Globo verde de «Logro desbloqueado» (estilo Xbox 360): sube desde abajo, se queda un momento y se esconde
  function x3Notify(a, game, i) {
    setTimeout(() => {
      if (!box) return;
      let host = box.querySelector('.x3-notes'); if (!host) { host = el2('div', 'x3-notes'); box.append(host); }
      const n = el2('div', 'x3-note'), ic = el2('div', 'x3-note-ic');
      if (a && a.icon && /^https:/.test(a.icon)) { const im = new Image(); im.alt = ''; im.src = a.icon; im.onerror = () => { im.remove(); ic.textContent = '🏆'; }; ic.append(im); } else ic.textContent = '🏆';
      n.append(ic, el2('div', 'x3-note-tx'));
      const tx = n.lastChild; tx.append(el2('div', 'x3-note-l1', 'Logro desbloqueado'), el2('div', 'x3-note-l2', (a && a.name) || game || ''));
      host.append(n);
      requestAnimationFrame(() => requestAnimationFrame(() => n.classList.add('in')));
      setTimeout(() => { n.classList.remove('in'); n.classList.add('out'); setTimeout(() => n.remove(), 600); }, 5200);
    }, i * 5600);
  }
  function x3Tab(id, mi, play) {
    const g = byId(S.det.id); if (!g) return; inlineStop(); closeViewer(true);
    { const ts = x3Tabs(g).map((t) => t[0]), a0 = ts.indexOf(S.det.tab), a1 = ts.indexOf(id); S.det.slide = a1 >= a0 ? 'r' : 'l'; }
    S.det.tab = id; S.det.afocus = id === 'ach'; S.det.mfocus = id === 'gal'; S.det.asel = 0; if (mi != null) S.det.mi = mi;
    SND.tab(); paintDetail(); hints();
    if (id === 'gal' && play) setTimeout(() => showMedia(S.det.mi || 0, true), 30);
  }
  async function x3AchGrid(g, wrap) {
    const data0 = g.achievements; if (!data0 || !data0.total) return;
    const COLS = 8;
    const draw = (d) => {
      if (!wrap.isConnected) return; wrap.replaceChildren();
      const list = Array.isArray(d.list) ? d.list.slice().sort((a, b) => (a.achieved !== b.achieved ? (a.achieved ? -1 : 1) : a.achieved ? b.unlockTime - a.unlockTime : (b.percent ?? -1) - (a.percent ?? -1))) : [];
      S.det.alist = list;
      const head = el2('div', 'x3g-head'), grid = el2('div', 'x3g-grid'), foot = el2('div', 'x3g-foot', `${d.unlocked} de ${d.total} desbloqueados`);
      if (!list.length) { head.append(el2('div', 'x3g-l1', g.name), el2('div', 'x3g-l2', 'Cargando la lista de logros…')); wrap.append(head, grid, foot); return; }
      list.forEach((a, i) => {
        const c = el2('div', 'x3g-c'); c.dataset.i = i; c.style.setProperty('--d', (Math.floor(i / COLS) * 45 + (i % COLS) * 18) + 'ms'); const im = new Image(); im.alt = ''; im.loading = 'lazy'; const iu = (a.achieved ? a.icon : a.iconGray || a.icon) || ''; if (iu) im.src = iu; im.onerror = () => { im.style.visibility = 'hidden'; };
        const b = el2('div', 'x3g-i' + (a.achieved ? '' : ' lock')); b.append(im); c.append(b);
        c.onclick = () => { S.det.asel = i; x3AchSel(); }; grid.append(c);
      });
      wrap.append(head, grid, foot); S.det.asel = Math.max(0, Math.min(list.length - 1, S.det.asel || 0)); x3AchSel();
    };
    draw(data0);
    if (!Array.isArray(data0.list)) { try { const r = await window.api.getAchievements(g.id, false); if (r && r.data && wrap.isConnected) { g.achievements = r.data; draw(r.data); } } catch (e) { console.error('logros', e); } }
  }
  function x3AchSel() {
    const wrap = $c('.x3g'), list = S.det && S.det.alist; if (!wrap || !list || !list.length) return;
    const i = Math.max(0, Math.min(list.length - 1, S.det.asel || 0)), a = list[i], head = wrap.querySelector('.x3g-head'); S.det.asel = i;
    wrap.querySelectorAll('.x3g-c').forEach((c, k) => c.classList.toggle('sel', k === i));
    const g = byId(S.det.id), desc = a.description || (a.hidden && !a.achieved ? 'Logro secreto: Steam no publica su descripción hasta que se desbloquea.' : '');
    head.replaceChildren(el2('div', 'x3g-l1', (g ? g.name : '')), el2('div', 'x3g-l2', a.name || ''), el2('div', 'x3g-l3', desc));
    const rt = el2('div', 'x3g-rt'); if (a.percent != null) rt.append(el2('div', null, a.percent.toLocaleString('es', { maximumFractionDigits: 1 }) + ' %')); rt.append(el2('div', null, a.achieved && a.unlockTime ? new Date(a.unlockTime).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : (a.achieved ? 'Desbloqueado' : 'Bloqueado'))); head.append(rt);
    const c = wrap.querySelectorAll('.x3g-c')[i]; if (c) c.scrollIntoView({ block: 'nearest' });
  }
  function x3AchMove(dir) {
    const list = S.det.alist || [], n = list.length, COLS = 8; if (!n) { if (dir === 'left') x3DetStep(-1); return; }
    const i = S.det.asel || 0; let k = i;
    if (dir === 'left') { if (i % COLS === 0) { x3DetStep(-1); return; } k = i - 1; }
    else if (dir === 'right') { if (i + 1 < n) k = i + 1; }
    else if (dir === 'up') { if (i - COLS >= 0) k = i - COLS; }
    else if (i + COLS < n) k = i + COLS; else if (Math.floor(i / COLS) < Math.floor((n - 1) / COLS)) k = n - 1;
    if (k !== i) { S.det.asel = k; SND.move(); x3AchSel(); }
  }
  function x3DetStep(d) { const g = byId(S.det.id); if (!g) return; const tabs = x3Tabs(g), i = tabs.findIndex((t) => t[0] === S.det.tab), ni = i + d; if (ni < 0 || ni >= tabs.length) return; x3Tab(tabs[ni][0]); }
  function paintDetailX3(g, page) {
    const tabs = x3Tabs(g); if (!tabs.some((t) => t[0] === S.det.tab)) S.det.tab = 'ov'; const tab = S.det.tab;
    const head = el2('div', 'x3d-head'), t2 = el2('h1', 'cc-title'); titleInto(t2, g); head.append(t2, el2('div', 'cc-meta', metaOf(g)));
    const bar = el2('div', 'x3v-tabs'); tabs.forEach(([id, lab]) => { const b = el2('span', 'x3v-tab' + (id === tab ? ' on' : ''), lab); b.onclick = () => { if (id !== tab) x3Tab(id); }; bar.append(b); });
    const body = el2('div', 'x3v-body x3v-' + tab); const inf = infoOf(g); box.classList.toggle('x3-dim', tab === 'ach'); if (S.det.slide) { body.classList.add('sl-' + S.det.slide); S.det.slide = ''; }
    if (tab === 'ov') {
      const row = el2('div', 'cc-det-btns');
      x3Tiles(g).forEach((b, i) => {
        const x = el2('button', 'cc-btn' + (b.primary ? ' primary' : '') + (i === S.det.btn ? ' sel' : '')); x.tabIndex = -1; x.style.setProperty('--k', i);
        const m = /^(\S{1,3})\s+(.+)$/.exec(b.label); if (m && !/[\p{L}\p{N}]/u.test(m[1])) x.append(el2('span', 'x3b-ic', m[1]), el2('span', 'x3b-lab', m[2])); else x.append(el2('span', 'x3b-lab', b.label));
        x.onclick = () => { S.det.btn = i; b.run(); }; x.onmouseenter = () => { if (padActive()) return; S.det.btn = i; row.querySelectorAll('.cc-btn').forEach((e, k) => e.classList.toggle('sel', k === i)); }; row.append(x);
      });
      const mid = el2('div', 'x3v-mid'), info = el2('div', 'x3v-info'), center = el2('div', 'x3v-center'); const cu = g.cover || g.coverFallback;
      if (cu) { const im = new Image(); im.alt = ''; im.onerror = () => im.remove(); im.src = imgUrl(cu); const bx = el2('div', 'x3v-box'); bx.append(im); info.append(bx); }
      const st = statusDef(g.status), a = g.achievements, ln = (t) => el2('div', 'x3v-ln', t);
      mid.append(ln(srcDef(g.source).name + ' · ' + fmtPlay(g.playTime)), ...((inf && inf.genres && inf.genres.length) ? [ln(inf.genres.join(', '))] : []), ...(inf && inf.metacritic ? [ln('Metacritic ' + inf.metacritic)] : []), ...(a && a.total ? [ln(`Logros ${a.unlocked} de ${a.total}`)] : []), ...(st ? [ln(st.label)] : []));
      info.append(mid); const mp = mediaPanel(g); if (mp) center.append(mp); center.append(info);
      body.append(row, center);
    } else if (tab === 'det') {
      const c1 = el2('div', 'x3v-c'), c2 = el2('div', 'x3v-c'), c3 = el2('div', 'x3v-c wide');
      const kv = (c, k, v) => { if (v) { c.append(el2('div', 'x3v-k', k), el2('div', 'x3v-v', v)); } };
      kv(c1, 'Desarrollador', inf && (inf.developers || []).join(', ')); kv(c1, 'Editor', inf && (inf.publishers || []).join(', ')); kv(c1, 'Género', inf && (inf.genres || []).join(', ')); kv(c1, 'Lanzamiento', inf && inf.releaseDate ? formatDate(inf.releaseDate) : ''); kv(c1, 'Metacritic', inf && inf.metacritic ? String(inf.metacritic) : '');
      c2.append(el2('div', 'x3v-h g', 'En tu biblioteca')); kv(c2, 'Origen', srcDef(g.source).name); kv(c2, 'Tiempo de juego', fmtPlay(g.playTime)); kv(c2, 'Última vez', fmtLast(g.lastPlayed)); kv(c2, 'En disco', g.diskBytes ? fmtBytes(g.diskBytes) : '');
      c3.append(el2('p', 'cc-desc' + (inf && inf.description ? '' : ' dim'), inf && inf.description ? inf.description : 'Este juego todavía no tiene información. Ábrelo en el lanzador y pulsa ℹ️ para buscarla.'));
      body.append(c1, c2, c3);
    } else if (tab === 'ach') {
      const wrap = el2('div', 'x3g'); body.append(wrap); setTimeout(() => x3AchGrid(g, wrap), 0);
    } else if (tab === 'gal') {
      const mp = mediaPanel(g); if (mp) body.append(mp);
    }
    page.append(head, bar, body);
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
  function detBtns() { const g = byId(S.det.id); return g ? (cfg.ui === 'deck' ? dkBtns(g) : cfg.ui === 'x360' && X3_TABS ? x3Tiles(g) : detailButtons(g)) : []; }

