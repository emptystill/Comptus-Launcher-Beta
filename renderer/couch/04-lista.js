  // ---------- Lista ----------
  const x3Cards = () => cfg.ui === 'x360' && S.view !== 'detail' && !isHome() && !isSearch() && !isSettings() && !(S.tabs[S.tab] && S.tabs[S.tab].id === 'ach');
  const gridNow = () => cfg.ui === 'deck' ? !isSettings() : cfg.ui === 'x360' ? false : cfg.ui === 'x360b' ? !!(!isSettings() && S.tabs[S.tab] && S.tabs[S.tab].id === 'colls') : cfg.layout === 'grid' || (cfg.layout === 'auto' && isPortrait()) || (isSettings() ? false : S.tabs[S.tab] && S.tabs[S.tab].id === 'colls');
  const blRows = () => cfg.ui === 'x360b' && S.view !== 'detail' && !isHome() && !isSearch() && !isSettings() && !gridNow() && !(S.tabs[S.tab] && S.tabs[S.tab].id === 'ach');
  function applyLayout() { if (!box) return; box.classList.toggle('dk-home', cfg.ui === 'deck' && isHome() && S.view === 'list'); box.classList.toggle('home-bg', isHome() && S.view === 'list' && cfg.homeBg === 'custom' && !!cfg.homeBgPath); box.classList.toggle('x3-cards', x3Cards()); box.classList.toggle('x3-bg', cfg.ui === 'x360' && ((isHome() && S.view === 'list' && cfg.x3HomeBg === 'custom' && !!cfg.x3HomePath) || cfg.x3Bg === 'custom' || cfg.x3Bg === 'game') && !(cfg.x3Bg === 'custom' && !cfg.x3BgPath)); box.classList.toggle('grid', gridNow()); box.classList.toggle('ach-view', !!(S.tabs[S.tab] && S.tabs[S.tab].id === 'ach')); box.classList.toggle('bl-rows', blRows()); box.classList.toggle('colls-view', !!(S.tabs[S.tab] && S.tabs[S.tab].id === 'colls' && !S.sub)); box.classList.toggle('x3-colls', cfg.ui === 'x360' && !!(S.tabs[S.tab] && S.tabs[S.tab].id === 'colls' && !S.sub)); box.classList.toggle('x3-dim', cfg.ui === 'x360' && S.view === 'detail' && !!S.det && S.det.tab === 'ach'); }
  const decImg = new Map(); // imágenes ya decodificadas que se mantienen vivas (al cambiar de sección no «parpadean» las portadas)
  const coverOk = new Map(); // juego -> portada ya cargada (al repintar no vuelve a verse el color de relleno)
  function loadCover(cv, g) {
    const known = coverOk.get(g.id); if (known) { cv.style.background = `url("${known}") center top / cover no-repeat`; return; }
    cv.style.background = colorFor(g.name);
    const urls = [g.coverSm, g.cover, g.coverFallback].filter(Boolean).map(imgUrl);
    (function next(i) { if (i >= urls.length) return; const im = new Image(); im.onload = () => { coverOk.set(g.id, urls[i]); decImg.set(g.id, im); cv.style.background = `url("${urls[i]}") center top / cover no-repeat`; }; im.onerror = () => next(i + 1); im.src = urls[i]; })(0);
  }
  function tileFor(it) {
    const t = el2('div', 'cc-tile' + (it.type !== 'game' ? ' group' : ''));
    const cv = el2('div', 'cc-cover' + (it.type === 'coll' ? ' coll' : '')); t.append(cv);
    const g = it.type === 'game' ? it.g : it.games[0];
    try { cv.dataset.src = it.type === 'game' ? srcDef(g.source).name : it.type === 'coll' ? 'Colección' : 'Tienda'; } catch {}
    if (it.type === 'game') { t.dataset.gid = g.id; if (INST.prog[g.id]) setTimeout(() => instMark(t, g.id), 0); }
    if (it.type === 'coll') {
      if (cfg.ui === 'deck') t.style.setProperty('--h', hueOf(it.c.name));
      const art = el2('div', 'coll-art'); cv.append(art);
      t._load = () => {
        if (t._done) return; t._done = true;
        const collage = () => { try { collCollage(it.c, it.games, art); } catch { art.textContent = ''; } };
        if (it.c.cover) {
          const im = new Image(); im.alt = ''; im.className = 'cc-collimg';
          const still = imgUrl(it.c.coverSm || it.c.cover), full = imgUrl(it.c.cover);
          im.onerror = () => { if (im.dataset.fb) return collage(); im.dataset.fb = '1'; im.src = still; };
          im.src = it.c.coverAnim ? still : full; art.append(im);
          if (it.c.coverAnim) t._anim = (on) => { const want = on ? full : still; if (im.dataset.cur !== want) { im.dataset.cur = want; im.src = want; } }; // la animada solo en la colección enfocada
          } else collage();
      };
      t.append(el2('div', 'cc-coll-over', it.c.name)); t.append(el2('span', 'cc-count', String(it.games.length)));
      t.onmouseenter = () => { if (padActive()) return; if (curIdx() !== +t.dataset.i) select(+t.dataset.i, true); }; t.onclick = () => { select(+t.dataset.i, true); open(); }; if (cfg.ui === 'deck') dkHov(t);
      return t;
    }
    t._load = () => { if (t._done) return; t._done = true; loadCover(cv, g); };
    if (!g.cover && !g.coverFallback) { cv.style.background = colorFor(g.name); cv.textContent = (g.name[0] || '?').toUpperCase(); t._done = true; }
    const label = it.type === 'game' ? g.name : (it.type === 'coll' ? it.c.name : it.s.name);
    t.append(el2('div', 'cc-name', label));
    if (it.type === 'game') t.append(el2('div', 'cc-sub', fmtPlay(g.playTime)));
    if (it.type === 'game') { const sc = el2('span', 'cc-store'); sc.style.color = STORE_COL[g.source] || '#fff'; try { sc.append(sourceIcon(g.source, 15)); } catch {} t.append(sc); }
    if (it.type === 'game' && g.achievements && g.achievements.total > 0) {
      const done = isComplete(g), pr = el2('div', 'cc-prog'), bar = el2('i'); bar.style.width = Math.round(g.achievements.unlocked / g.achievements.total * 100) + '%';
      t.append(el2('span', 'cc-ptxt', `${g.achievements.unlocked}/${g.achievements.total} · ${Math.round(g.achievements.unlocked / g.achievements.total * 100)} %`)); pr.append(el2('span', null, `${g.achievements.unlocked}/${g.achievements.total}`), el2('div', 'cc-prog-bar')); pr.lastChild.append(bar); cv.append(pr);
      if (done) { t.classList.add('done'); const tr = el2('span', 'cc-trophy'); tr.innerHTML = trophySvg(); cv.append(tr); }
    }
    if (it.type !== 'game') t.append(el2('span', 'cc-count', String(it.games.length)));
    else if (runStateFor(g)) t.append(el2('span', 'cc-run', 'En ejecución'));
    else if (g.installed === false) { t.classList.add('ni'); t.append(el2('span', 'cc-ni', 'No instalado')); }
    t.onmouseenter = () => { if (padActive()) return; if (curIdx() !== +t.dataset.i) { select(+t.dataset.i, true); } };
    t.onclick = () => { select(+t.dataset.i, true); open(); }; if (cfg.ui === 'deck') dkHov(t);
    t.oncontextmenu = (e) => { e.preventDefault(); select(+t.dataset.i, true); menu(e.clientX, e.clientY); };
    return t;
  }
  function paintList(keepId) {
    applyLayout();
    const strip = $c('.cc-strip'); strip.replaceChildren();
    const items = cur();
    items.forEach((it, i) => { const t = tileFor(it); t.dataset.i = i; t.style.setProperty('--i', Math.min(i, 16)); strip.append(t); });
    if (keepId) { const k = items.findIndex((x) => x.type === 'game' && x.g.id === keepId); if (k >= 0) setIdx(k); }
    if (curIdx() >= items.length) setIdx(Math.max(0, items.length - 1));
    const sub = $c('.cc-subtitle'); sub.classList.toggle('hidden', !S.sub); if (S.sub) sub.textContent = '‹  ' + S.sub.title;
    $c('.cc-empty') && $c('.cc-empty').remove();
    if (!items.length) { strip.append(el2('div', 'cc-empty', 'No hay juegos en esta sección todavía.')); }
    mark(true); paintHero();
  }
  function animSel() { document.querySelectorAll('#couch .cc-strip .cc-tile').forEach((t) => { if (t._anim) t._anim(t.classList.contains('sel')); }); }
  function ensureImgs() {
    const strip = $c('.cc-strip'), i = curIdx();
    for (let k = Math.max(0, i - 24); k <= Math.min(strip.children.length - 1, i + (gridNow() ? 60 : 30)); k++) { const t = strip.children[k]; if (t && t._load) t._load(); }
  }
  function mark(instant) {
    const strip = $c('.cc-strip'); strip.querySelectorAll('.sel').forEach((e) => e.classList.remove('sel'));
    const t = strip.children[curIdx()]; if (!t || !t.dataset) return; t.classList.add('sel'); if (cfg.ui === 'deck' && t.dataset.gid) dkGlow(t.querySelector('.cc-cover'), byId(t.dataset.gid)); ensureImgs(); animSel();
    if (box.classList.contains('bl-rows')) { const top = t.offsetTop - (strip.clientHeight - t.offsetHeight) / 2; strip.scrollTo({ top: Math.max(0, top), behavior: instant ? 'instant' : 'smooth' }); return; }
    if (box.classList.contains('ach-view')) { const top = t.offsetTop - (strip.clientHeight - t.offsetHeight) / 2; strip.scrollTo({ top: Math.max(0, top), behavior: instant ? 'instant' : 'smooth' }); return; }
    if (gridNow()) { const top = t.offsetTop - (strip.clientHeight - t.offsetHeight) / 2; strip.scrollTo({ top: Math.max(0, top), behavior: instant ? 'instant' : 'smooth' }); return; }
    const left = t.offsetLeft - (strip.clientWidth - t.offsetWidth) / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: instant ? 'instant' : 'smooth' }); // sin scrollIntoView: no mueve nada más que la fila
  }
  function select(i, fromMouse) {
    const n = cur().length; if (!n) return; i = Math.max(0, Math.min(n - 1, i)); if (i === curIdx() && !fromMouse) return;
    if (!fromMouse || i !== curIdx()) SND.move(); setIdx(i); const strip = $c('.cc-strip'); strip.querySelectorAll('.sel').forEach((e) => e.classList.remove('sel')); const t = strip.children[i]; if (t) { t.classList.add('sel'); if (cfg.ui === 'deck' && t.dataset.gid) dkGlow(t.querySelector('.cc-cover'), byId(t.dataset.gid)); }
    ensureImgs(); animSel(); if (!fromMouse) mark(); paintHero();
  }


