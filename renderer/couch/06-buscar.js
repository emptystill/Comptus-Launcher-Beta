  // ---------- Buscar: teclado en pantalla y resultados ----------
  const SR = { q: '', zone: 'kb', kr: 0, kc: 0, ri: 0, store: 'all', res: [] };
  const KB = ['ABCDEFGHIJ', 'KLMNOPQRST', 'UVWXYZÑ012', '3456789␣⌫✕'].map((r) => [...r]);
  const norm = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const srStores = () => [...new Set(state.games.filter(playable).map((g) => g.source))];
  function srFind() {
    const toks = norm(SR.q).split(/\s+/).filter(Boolean);
    let l = state.games.filter(playable); if (SR.store !== 'all') l = l.filter((g) => g.source === SR.store);
    if (!toks.length) return [];
    l = l.filter((g) => { const n = norm(g.name); return toks.every((t) => n.includes(t)); });
    const q0 = norm(SR.q).trim();
    return l.sort((a, b) => (norm(b.name).startsWith(q0) - norm(a.name).startsWith(q0)) || byName(a, b)).slice(0, 80);
  }
  function paintSearch() {
    sbSync();
    const h = $c('.cc-search'); if (!h) return;
    SR.res = srFind(); SR.ri = Math.min(SR.ri, Math.max(0, SR.res.length - 1)); if (SR.zone === 'res' && !SR.res.length) SR.zone = 'kb';
    h.replaceChildren();
    const left = el2('div', 'cc-sr-left'), q = el2('div', 'cc-sr-q'); q.append(el2('span', 'cc-sr-text', SR.q), el2('span', 'cc-sr-caret'));
    if (!SR.q) q.classList.add('empty'); q.dataset.ph = cfg.ui === 'deck' ? 'Buscar juegos o perfiles...' : 'Escribe un juego…';
    const kb = el2('div', 'cc-sr-kb');
    KB.forEach((row, r) => row.forEach((k, c) => { const b = el2('button', 'cc-sr-key' + (k === '␣' || k === '⌫' || k === '✕' ? ' sp' : ''), k === '␣' ? 'Espacio' : k === '✕' ? 'Limpiar' : k); b.tabIndex = -1; b.dataset.r = r; b.dataset.c = c; b.onclick = () => { SR.zone = 'kb'; SR.kr = r; SR.kc = c; searchMark(); searchAccept(); }; kb.append(b); }));
    const st = el2('div', 'cc-sr-store', 'Tienda: ' + (SR.store === 'all' ? 'todas' : srcDef(SR.store).name));
    left.append(q, kb, st);
    const right = el2('div', 'cc-sr-right'), head = el2('div', 'cc-sr-head', SR.q.trim() ? (SR.res.length ? `${SR.res.length} resultado${SR.res.length === 1 ? '' : 's'}` : 'Sin resultados') : 'Escribe para buscar entre tus juegos');
    if (cfg.ui === 'deck') { // Big Picture: filtros arriba (Todos + una por tienda) con su cantidad
      head.className = 'cc-sr-head dk-sp-row'; head.textContent = '';
      const toks = norm(SR.q).split(/\s+/).filter(Boolean), base = state.games.filter(playable).filter((g) => toks.every((t) => norm(g.name).includes(t)));
      [['all', 'Todos', base.length], ...srStores().map((s) => [s, srcDef(s).name, base.filter((g) => g.source === s).length])].forEach(([id, lab, n]) => { const b = el2('button', 'dk-sp-p' + (SR.store === id ? ' on' : '')); b.tabIndex = -1; b.append(document.createTextNode(lab), el2('sup', '', String(n))); b.onclick = () => { SR.store = id; SR.ri = 0; SND.change(); paintSearch(); }; head.append(b); });
    }
    const grid = el2('div', 'cc-sr-grid');
    SR.res.forEach((g, i) => { const t = el2('div', 'cc-sr-t'), cv = el2('div', 'cc-sr-cv'); loadCover(cv, g); if (g.installed === false) t.classList.add('ni'); t.append(cv, el2('div', 'cc-sr-n', g.name)); t.onclick = () => { SR.zone = 'res'; SR.ri = i; searchMark(); searchAccept(); }; grid.append(t); });
    right.append(head, grid);
    if (cfg.ui === 'deck') { // sin texto no se muestra nada (Inicio sigue a la vista, si se venía de él); con texto, la página de resultados
      const empty = !SR.q.trim(), keep = empty && !!S.dkSrHome, hm = $c('.cc-home');
      h.classList.toggle('dk-srempty', empty); hm.classList.toggle('hidden', !keep); box.classList.toggle('dk-home', keep);
      h.append(left); if (!empty) h.append(right); searchMark(true); return;
    }
    h.append(left, right); searchMark(true);
  }
  function dkSrClose(cb, fast) { // Big Picture: Esc cierra la búsqueda de golpe, con un fundido, y vuelve a Inicio
    const se = $c('.cc-search'); if (!se || S.dkSrC) return; S.dkSrC = true; SND.back(); se.classList.remove('dk-sropen'); se.classList.add('dk-srclosing'); { const hm = $c('.cc-home'); hm.classList.remove('hidden'); box.classList.add('dk-home'); S.dkNoIn = true; }
    setTimeout(() => { S.dkSrC = false; SR.q = ''; SR.store = 'all'; SR.zone = 'kb'; se.classList.remove('dk-srclosing'); deckGo('home'); if (cb) cb(); }, fast ? 0 : 230);
  }
  function searchMark(instant) {
    const h = $c('.cc-search'); if (!h) return;
    h.querySelectorAll('.sel').forEach((e) => e.classList.remove('sel')); h.classList.toggle('zone-res', SR.zone === 'res');
    const key = h.querySelector(`.cc-sr-key[data-r="${SR.kr}"][data-c="${SR.kc}"]`); if (key && SR.zone === 'kb') key.classList.add('sel');
    const t = h.querySelectorAll('.cc-sr-t')[SR.ri]; if (t && SR.zone === 'res') { t.classList.add('sel'); const gr = h.querySelector('.cc-sr-grid'); gr.scrollTo({ top: Math.max(0, t.offsetTop - gr.clientHeight / 2 + t.offsetHeight / 2), behavior: instant ? 'instant' : 'smooth' }); }
    if (cfg.ui === 'deck' && !SR.q.trim() && S.dkSrHome) return;
    const g = SR.zone === 'res' ? SR.res[SR.ri] : SR.res[0]; setBg(g || null);
  }
  function srCols() { const k = [...$c('.cc-search').querySelectorAll('.cc-sr-t')]; if (!k.length) return 1; const n = k.findIndex((t) => t.offsetTop > k[0].offsetTop + 4); return n < 0 ? k.length : n; }
  function searchType(ch) { SR.q = (SR.q + ch).slice(0, 40); SR.ri = 0; SND.move(); paintSearch(); }
  function searchBack() { if (!SR.q) return; SR.q = SR.q.slice(0, -1); SR.ri = 0; SND.back(); paintSearch(); }
  function searchStore() { const l = ['all', ...srStores()]; SR.store = l[(l.indexOf(SR.store) + 1) % l.length]; SR.ri = 0; SND.change(); paintSearch(); }
  function searchBtn(i) { // X (2) y Y (3) del mando
    if (SR.zone === 'res') { if (i === 2) play(SR.res[SR.ri]); else searchStore(); return; }
    if (i === 2) searchBack(); else searchType(' ');
  }
  function searchNav(dir) {
    if (cfg.ui === 'deck' && hintMode !== 'pad' && SR.zone === 'kb') { if ((dir === 'down' || dir === 'right') && SR.res.length) { SR.zone = 'res'; SR.ri = 0; SND.open(); searchMark(); hints(); } return; } // sin teclado en pantalla: abajo/derecha pasan a los resultados
    if (SR.zone === 'kb') {
      if (dir === 'up') SR.kr = Math.max(0, SR.kr - 1); else if (dir === 'down') { if (SR.kr >= KB.length - 1) { if (SR.res.length) { SR.zone = 'res'; SR.ri = 0; SND.open(); searchMark(); hints(); } return; } SR.kr++; }
      else if (dir === 'left') SR.kc = Math.max(0, SR.kc - 1);
      else if (SR.kc >= KB[0].length - 1) { if (SR.res.length) { SR.zone = 'res'; SND.open(); searchMark(); hints(); } return; } else SR.kc++;
      SND.move(); searchMark(); return;
    }
    const n = SR.res.length, cols = srCols();
    if (dir === 'left') { if (SR.ri % cols === 0) { SR.zone = 'kb'; SND.back(); searchMark(); hints(); return; } SR.ri--; }
    else if (dir === 'right') SR.ri = Math.min(n - 1, SR.ri + 1);
    else if (dir === 'down') SR.ri = Math.min(n - 1, SR.ri + cols); else { if (SR.ri < cols) { SR.zone = 'kb'; SND.back(); searchMark(); hints(); return; } SR.ri -= cols; }
    SND.move(); searchMark();
  }
  function searchAccept() {
    if (SR.zone === 'res') { const g = SR.res[SR.ri]; if (g) openDetail(g.id); return; }
    const k = KB[SR.kr][SR.kc]; if (k === '␣') searchType(' '); else if (k === '⌫') searchBack(); else if (k === '✕') { SR.q = ''; SR.ri = 0; SND.back(); paintSearch(); } else searchType(k.toLowerCase());
  }

