  // ---------- Ficha del juego ----------
  function openDetail(id, tab) {
    const g = byId(id); if (!g) return;
    SND.open(); S.view = 'detail'; S.det = { id, tab: tab || 'ov', btn: 0, scrollAch: false, mi: 0, mfocus: false, afocus: tab === 'ach', asel: 0 }; showView(); paintDetail(); hints(); animIn($c('.cc-detail'));
  }
  // ---------- Tráilers y capturas ----------
  function mediaOf(g) {
    const inf = infoOf(g) || {}, ct = g.customTrailer || null;
    const movies = ((g.info && g.info.movies) || []).filter((m) => m.mp4 || m.webm || m.hls).map((m) => ({ kind: 'video', m, thumb: m.thumb || '', name: m.name || 'Tráiler' }));
    if (ct && ct.kind === 'file' && ct.path) movies.unshift({ kind: 'video', m: { id: 'custom', name: 'Mi tráiler', mp4: fileUrl(ct.path), thumb: '' }, thumb: '', name: 'Mi tráiler' });
    const shots = ((inf && inf.screenshots) || []).map((sh) => (typeof sh === 'string' ? { thumb: sh, full: sh } : sh && { thumb: sh.thumb || sh.full || sh.url, full: sh.full || sh.url || sh.thumb })).filter((x) => x && x.full).slice(0, 40).map((x, i) => ({ kind: 'shot', thumb: x.thumb, full: x.full, name: `Captura ${i + 1}` }));
    return { movies, shots, all: [...movies, ...shots] };
  }
  function viewerStop() { const v = S.viewer; if (v && v.tc) { try { v.tc.video.pause(); } catch {} if (v.tc.hls) { try { v.tc.hls.destroy(); } catch {} } v.tc = null; } }
  function viewerShow() {
    const v = S.viewer, ov = $c('.cc-viewer'), it = v.items[v.i];
    viewerStop();
    const st = ov.querySelector('.cc-v-stage'); st.replaceChildren();
    ov.querySelector('.cc-v-cap').textContent = `${it.name}  ·  ${v.i + 1} / ${v.items.length}`;
    if (it.kind === 'shot') { const im = new Image(); im.alt = ''; im.src = imgUrl(it.full); st.append(im); return; }
    const video = el2('video'); video.controls = false; video.playsInline = true; st.append(video);
    const msg = el2('div', 'cc-v-msg hidden', 'No se pudo reproducir este tráiler aquí.'); st.append(msg);
    const tc = v.tc = { video, hls: null };
    loadTrailer(tc, it.m, true, () => msg.classList.remove('hidden'));
  }
  function openViewer(items, i) {
    if (!items.length) return; closeViewer(true); inlineStop();
    let ov = $c('.cc-viewer'); if (!ov) { ov = el2('div', 'cc-viewer'); ov.innerHTML = '<div class="cc-v-stage"></div><div class="cc-v-cap"></div><div class="cc-v-hint"></div>'; box.append(ov); }
    ov.classList.remove('hidden'); S.viewer = { items, i, tc: null }; SND.open();
    ov.querySelector('.cc-v-hint').textContent = hintMode === 'pad' ? '◀ ▶ Cambiar   A Pausa   B Cerrar' : '← → Cambiar   Enter Pausa   Esc Cerrar';
    viewerShow();
  }
  function closeViewer(quiet) {
    if (!S.viewer) return;
    viewerStop(); S.viewer = null; if (!quiet && S.view === 'detail') setTimeout(() => showMedia(S.det.mi || 0, false), 0); const ov = $c('.cc-viewer'); if (ov) { ov.classList.add('hidden'); ov.querySelector('.cc-v-stage').replaceChildren(); }
    if (!quiet) SND.back();
  }
  function viewerMove(d) { const v = S.viewer; if (!v || v.items.length < 2) return; v.i = (v.i + d + v.items.length) % v.items.length; SND.move(); viewerShow(); }
  function viewerToggle() { const v = S.viewer; if (v && v.tc) { const e = v.tc.video; if (e.paused) e.play().catch(() => {}); else e.pause(); } else viewerMove(1); }
  function inlineStop() { const tc = S.det && S.det.tc; if (tc) { try { tc.video.pause(); } catch {} if (tc.hls) { try { tc.hls.destroy(); } catch {} } S.det.tc = null; } }
  function mediaPanel(g) {
    const md = mediaOf(g); if (!md.all.length) return null;
    const p = el2('div', 'cc-d-media' + (S.det.mfocus ? ' focus' : ''));
    p.append(el2('div', 'cc-m-stage'), el2('div', 'cc-m-cap'));
    const th = el2('div', 'cc-m-thumbs');
    md.all.forEach((x, k) => { const b = el2('button', 'cc-mthumb' + (x.kind === 'video' ? ' vid' : '')); b.tabIndex = -1; if (x.thumb) { const im = new Image(); im.loading = 'lazy'; im.alt = ''; im.src = imgUrl(x.thumb); b.append(im); } if (x.kind === 'video') b.append(el2('span', 'cc-play', '▶')); b.onclick = () => { if (cfg.ui === 'x360' && X3_TABS && S.det.tab !== 'gal') { x3Tab('gal', k, true); return; } S.det.mfocus = true; showMedia(k, true); }; th.append(b); });
    p.append(th);
    S.det.tc = null; setTimeout(() => showMedia(Math.min(S.det.mi || 0, md.all.length - 1), false), 0);
    return p;
  }
  function showMedia(i, play) {
    const g = byId(S.det.id), p = $c('.cc-d-media'); if (!g || !p) return;
    const md = mediaOf(g), it = md.all[i]; if (!it) return;
    inlineStop(); S.det.mi = i; p.classList.toggle('focus', !!S.det.mfocus);
    const st = p.querySelector('.cc-m-stage'); st.replaceChildren();
    p.querySelector('.cc-m-cap').textContent = `${it.name}  ·  ${i + 1} / ${md.all.length}` + (S.det.mfocus ? (it.kind === 'video' ? '   (A pausa · ◀ ▶ cambia · B sale)' : '   (A pantalla completa · ◀ ▶ cambia · B sale)') : '');
    p.querySelectorAll('.cc-mthumb').forEach((b, k) => b.classList.toggle('on', k === i));
    const on = p.querySelectorAll('.cc-mthumb')[i]; const th = p.querySelector('.cc-m-thumbs'); if (on) th.scrollTo({ left: on.offsetLeft - (th.clientWidth - on.offsetWidth) / 2, behavior: 'smooth' });
    if (it.kind === 'shot') { const im = new Image(); im.alt = ''; im.src = imgUrl(it.full); st.append(im); return; }
    const video = el2('video'); video.controls = false; video.playsInline = true; st.append(video);
    const msg = el2('div', 'cc-v-msg hidden', 'No se pudo reproducir este tráiler aquí.'); st.append(msg);
    const tc = S.det.tc = { video, hls: null };
    if (play) loadTrailer(tc, it.m, true, () => msg.classList.remove('hidden'));
    else { video.poster = it.thumb ? imgUrl(it.thumb) : ''; st.append(el2('span', 'cc-m-big', '▶')); }
  }
  function mediaAccept() {
    const g = byId(S.det.id); if (!g) return; const md = mediaOf(g), it = md.all[S.det.mi || 0]; if (!it) return;
    const tc = S.det.tc;
    if (it.kind === 'shot') openViewer(md.all, S.det.mi);
    else if (!tc || !tc.video.src && !tc.hls) showMedia(S.det.mi, true);
    else { if (tc.video.paused) tc.video.play().catch(() => {}); else tc.video.pause(); }
  }
  function mediaMove(d) { const g = byId(S.det.id); if (!g) return; const n = mediaOf(g).all.length; if (n < 2) return; SND.move(); showMedia(((S.det.mi || 0) + d + n) % n, true); }
  function mediaLeave() { S.det.mfocus = false; const p = $c('.cc-d-media'); if (p) p.classList.remove('focus'); showMedia(S.det.mi || 0, false); hints(); }
  function detailButtons(g) {
    const md = mediaOf(g);
    const rs = runStateFor(g);
    return [
      { label: rs ? (rs.state === 'stopping' ? 'Cerrando…' : 'Cerrar el juego') : '▶  Jugar', primary: true, run: () => { if (rs) { stopGame(g); } else play(g); } },
      ...(md.movies.length ? [{ label: '🎬 Tráiler', run: () => { S.det.mfocus = true; SND.open(); showMedia(0, true); hints(); } }] : []),
      ...(md.shots.length ? [{ label: '🖼 Capturas', run: () => { S.det.mfocus = true; SND.open(); showMedia(md.movies.length, false); hints(); } }] : []),
      ...(g.achievements && g.achievements.total > 0 ? [{ label: '🏆 Logros', run: () => detAchEnter() }] : []),
      { label: g.favorite ? '★ Quitar de favoritos' : '☆ Favorito', run: () => favorite() },
      { label: '⋯ Más opciones', run: () => menu() },
      { label: '‹ Volver', run: () => backDetail() },
    ];
  }
  function paintDetail() {
    setTimeout(instPaint, 0);
    const g = byId(S.det.id), page = $c('.cc-detail'); if (!g) { backDetail(); return; }
    setBg(g); page.replaceChildren();
    if (cfg.ui === 'deck') { paintDetailDeck(g, page); return; }
    if (cfg.ui === 'x360' && X3_TABS) { paintDetailX3(g, page); return; }
    const left = el2('div', 'cc-d-main');
    left.append(el2('div', 'cc-src', srcDef(g.source).name));
    const t = el2('h1', 'cc-title'); titleInto(t, g); left.append(t, el2('div', 'cc-meta', metaOf(g)));
    const row = el2('div', 'cc-det-btns');
    detailButtons(g).forEach((b, i) => { const x = el2('button', 'cc-btn' + (b.primary ? ' primary' : '') + (i === S.det.btn ? ' sel' : ''), b.label); x.tabIndex = -1; x.onclick = () => { S.det.btn = i; b.run(); }; x.onmouseenter = () => { if (padActive()) return; S.det.btn = i; row.querySelectorAll('.cc-btn').forEach((e, k) => e.classList.toggle('sel', k === i)); }; row.append(x); });
    left.append(row);
    const body = el2('div', 'cc-d-body'); body.tabIndex = -1;
    const inf = infoOf(g);
    if (inf && inf.description) body.append(el2('p', 'cc-desc', inf.description));
    else body.append(el2('p', 'cc-desc dim', 'Este juego todavía no tiene información. Ábrelo en el lanzador y pulsa ℹ️ para buscarla.'));
    if (g.achievements && g.achievements.total > 0) { const sec = el2('div', 'cc-achs'); body.append(sec); fillAchs(g, sec); }
    const det = el2('div', 'cc-facts');
    const fact = (k, v) => { if (v) { const d = el2('div', 'cc-fact'); d.append(el2('span', null, k), el2('b', null, v)); det.append(d); } };
    if (inf) {
      fact('Desarrollador', (inf.developers || []).join(', ')); fact('Editor', (inf.publishers || []).join(', '));
      fact('Lanzamiento', inf.releaseDate ? formatDate(inf.releaseDate) : ''); fact('Géneros', (inf.genres || []).join(', ')); fact('Metacritic', inf.metacritic ? String(inf.metacritic) : '');
    }
    fact('Biblioteca', srcDef(g.source).name); fact('En disco', g.diskBytes ? fmtBytes(g.diskBytes) : '');
    if (det.children.length) body.append(det);
    if (cfg.ui === 'x360') { // estilo Xbox 360: título arriba a la derecha, losetas de acción a la izquierda e información a la derecha
      const head = el2('div', 'x3d-head'), t2 = el2('h1', 'cc-title'); titleInto(t2, g); head.append(t2, el2('div', 'cc-meta', metaOf(g)));
      row.querySelectorAll('.cc-btn').forEach((b) => { const m = /^(\S{1,3})\s+(.+)$/.exec(b.textContent); if (m && !/[\p{L}\p{N}]/u.test(m[1])) { b.textContent = ''; b.append(el2('span', 'x3b-ic', m[1]), el2('span', 'x3b-lab', m[2])); } else { const l = b.textContent; b.textContent = ''; b.append(el2('span', 'x3b-lab', l)); } });
      const mp2 = mediaPanel(g), right = el2('div', 'x3d-right'); if (mp2) right.append(mp2); right.append(body);
      const main = el2('div', 'x3d-main'); main.append(row, right); page.append(head, main); body.scrollTop = 0; return;
    }
    left.append(body); page.append(left);
    const mp = mediaPanel(g); if (mp) { if (isPortrait()) left.insertBefore(mp, body); else page.append(mp); }
    body.scrollTop = 0;
  }
