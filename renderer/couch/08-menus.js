  // ---------- Menús propios (con el estilo del modo consola) ----------
  function cmenu(title, items, opt) {
    SND.menu(); S.menu = { title, items: items.filter(Boolean), idx: 0, side: !!(opt && opt.side), right: !!(opt && opt.right) };
    let ov = $c('.cc-menu-ov'); if (!ov) { ov = el2('div', 'cc-menu-ov'); box.append(ov); }
    paintMenu(true); animIn($c('.cc-menu-ov')); hints();
  }
  function paintMenu(fresh) {
    const ov = $c('.cc-menu-ov'); if (!ov || !S.menu) return; ov.replaceChildren(); ov.classList.remove('hidden');
    ov.onclick = (e) => { if (e.target === ov) closeCMenu(); };
    if (S.menu.guide) { paintGuide(ov); return; }
    if (S.menu.prof) { paintProf(ov); return; }
    ov.classList.toggle('dk-side', !!S.menu.side); ov.classList.toggle('dk-right', !!S.menu.right);
    const p = el2('div', 'cc-menu' + (fresh ? ' dk-fresh' : '') + (S.menu.side ? ' dk-side' : '') + (S.menu.right ? ' dk-right' : '')); if (!S.menu.side) p.append(el2('div', 'cc-menu-title', S.menu.title)); else if (S.menu.right) p.append(el2('div', 'dk-ptitle', S.menu.title));
    S.menu.items.forEach((it, i) => {
      if (it.sep) { p.append(el2('div', 'cc-menu-sep')); return; }
      const r = el2('div', 'cc-menu-it' + (i === S.menu.idx ? ' sel' : '') + (it.danger ? ' danger' : '')); r.dataset.i = i;
      if (it.ic) { const ic = el2('i', 'cc-menu-ic'); ic.innerHTML = tabIcon(it.ic); r.append(ic); }
      r.append(el2('span', null, it.label)); if (it.value) r.append(el2('b', null, it.value));
      r.onmouseenter = () => { if (padActive() || !S.menu || S.menu.idx === i) return; S.menu.idx = i; p.querySelectorAll('.cc-menu-it').forEach((e) => e.classList.toggle('sel', +e.dataset.i === i)); };
      r.onclick = () => { S.menu.idx = i; runMenu(); };
      p.append(r);
    });
    ov.append(p);
  }
  function closeCMenu() { S.menu = null; const ov = $c('.cc-menu-ov'); if (ov) ov.classList.add('hidden'); hints(); }
  function runMenu() { const it = S.menu && S.menu.items[S.menu.idx]; if (!it || it.sep) return; closeCMenu(); SND.open(); try { it.run(); } catch {} }
  function menuMove(d) { if (!S.menu) return; const n = S.menu.items.length; let i = S.menu.idx; do { i = (i + d + n) % n; } while (S.menu.items[i].sep); S.menu.idx = i; SND.move(); if (S.menu.guide) document.querySelectorAll('.gd-list .cc-menu-it').forEach((e, k) => e.classList.toggle('sel', k === i)); else { const its = document.querySelectorAll('.cc-menu-ov .cc-menu-it'); if (its.length) its.forEach((e) => e.classList.toggle('sel', +e.dataset.i === i)); else paintMenu(); } const sel = $c('.cc-menu-it.sel'); if (sel) sel.scrollIntoView({ block: 'nearest' }); }
  function confirmUninstall(g) { // confirmación propia (el cuadro nativo no se maneja con el mando)
    cmenu('¿Desinstalar «' + g.name + '»?', [
      { label: 'Cancelar', run: () => {} },
      { label: 'Sí, desinstalar', run: async () => {
        let res; try { res = await window.api.uninstall(g.id); } catch { res = null; }
        toast(res && res.ok ? (res.message || 'Se abrió el desinstalador') : (res && res.error) || 'No se pudo desinstalar', 7000);
      } },
    ]);
  }
  function menu() { // opciones del juego enfocado
    const g = curGame(); if (!g) return;
    const skip = /^(Cambiar |Restablecer personalización|Unir con|Editar nombre|Quitar de la biblioteca|Abrir página)/;
    const items = []; let lastSep = true;
    const base = [{ label: 'Ficha del juego', run: () => { if (S.view !== 'detail') openDetail(g.id); } }];
    for (const it of [...base, ...gameMenuItems(g)]) {
      if (it.node) continue;
      if (it.sep) { if (!lastSep) { items.push({ sep: true }); lastSep = true; } continue; }
      if (skip.test(it.label)) continue;
      if (/^Desinstalar/.test(it.label)) { if (!lastSep) items.push({ sep: true }); items.push({ label: 'Desinstalar…', run: () => confirmUninstall(g) }); lastSep = false; continue; }
      items.push({ label: it.label, run: /^(Jugar|Instalar)$/.test(it.label) ? () => play(g) : it.run }); lastSep = false;
    }
    while (items.length && items[items.length - 1].sep) items.pop();
    cmenu(g.name, items);
  }
