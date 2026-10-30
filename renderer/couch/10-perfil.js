  const PICS = [['', 'Ninguna'], ['01', 'Xbox'], ['02', 'Pirata'], ['03', 'Robot'], ['04', 'Soldado'], ['05', 'Dragón'], ['06', 'Calavera roja'], ['08', 'Ondas verdes'], ['09', 'Mono'], ['10', 'Sonrisa'], ['11', 'Calavera naranja'], ['12', 'Perro'], ['13', 'Chica gato'], ['14', 'Panda'], ['15', 'Soldado azul'], ['16', 'Encapuchado']];
  const picSrc = (p) => (/^perfiles\//.test(p) ? p : imgUrl(p));
  const picIdx = () => Math.max(0, PICS.findIndex((x) => x[0] && cfg.x3Pic === 'perfiles/' + x[0] + '.png'));
  // Selector de foto de perfil: cuadrícula como la de logros
  const PP_COLS = 8;
  const ppItems = () => [...PICS.map((x) => ({ k: x[0], n: x[1] })), { k: '@own', n: 'Mi imagen…' }];
  function openPicBox() {
    const its = ppItems(), cur = /^perfiles\//.test(cfg.x3Pic || '') ? PICS.findIndex((x) => x[0] && cfg.x3Pic === 'perfiles/' + x[0] + '.png') : 0;
    S.pp = { i: Math.max(0, cur) }; let ov = $c('.cc-picbox'); if (!ov) { ov = el2('div', 'cc-picbox'); box.append(ov); } ov.classList.remove('hidden'); paintPicBox(); hints();
    void its;
  }
  function paintPicBox() {
    const ov = $c('.cc-picbox'), n = S.pp; if (!ov || !n) return; ov.replaceChildren();
    const its = ppItems(), card = el2('div', 'pp-card'), head = el2('div', 'pp-head'), grid = el2('div', 'pp-grid'), foot = el2('div', 'pp-foot');
    const nm = (cfg.x3Name || S.uname || 'Jugador');
    its.forEach((it, i) => {
      const t = el2('div', 'pp-t' + (i === n.i ? ' sel' : '') + (it.k === '@own' ? ' own' : '') + (it.k === '' ? ' none' : ''));
      if (it.k === '') t.textContent = nm.charAt(0).toUpperCase(); else if (it.k === '@own') t.textContent = '＋'; else t.style.backgroundImage = `url("perfiles/${it.k}.png")`;
      if (/^perfiles\//.test(cfg.x3Pic || '') ? cfg.x3Pic === 'perfiles/' + it.k + '.png' : (!cfg.x3Pic && it.k === '')) t.classList.add('cur');
      t.onclick = () => { n.i = i; ppPress(); }; t.onmouseenter = () => { if (n.i !== i) { n.i = i; ppUpdate(); } };
      grid.append(t);
    });
    head.append(el2('div', 'pp-nm', 'Foto de perfil'), el2('div', 'pp-sub'), el2('div', 'pp-ds'));
    ov.append(card); card.append(head, grid, foot); ppUpdate();
  }
  function ppUpdate() {
    const ov = $c('.cc-picbox'), n = S.pp; if (!ov || !n) return; const its = ppItems(), it = its[n.i];
    ov.querySelectorAll('.pp-t').forEach((t, i) => t.classList.toggle('sel', i === n.i));
    const sub = ov.querySelector('.pp-sub'), ds = ov.querySelector('.pp-ds'), ft = ov.querySelector('.pp-foot');
    if (sub) sub.textContent = it.k === '' ? 'Sin foto (tu inicial)' : it.k === '@own' ? 'Elegir una imagen de tu PC' : it.n;
    if (ds) ds.textContent = it.k === '@own' ? 'Usa cualquier imagen guardada en tu equipo.' : 'Pulsa A para usarla como tu foto de perfil.';
    if (ft) ft.textContent = (n.i + 1) + ' de ' + its.length;
  }
  function ppMove(dir) {
    const n = S.pp; if (!n) return; const len = ppItems().length; let i = n.i;
    if (dir === 'left') i = (i - 1 + len) % len; else if (dir === 'right') i = (i + 1) % len; else if (dir === 'up') i = i - PP_COLS >= 0 ? i - PP_COLS : i; else if (dir === 'down') i = i + PP_COLS < len ? i + PP_COLS : i;
    if (i !== n.i) { n.i = i; SND.move(); ppUpdate(); }
  }
  function ppClose() { S.pp = null; const ov = $c('.cc-picbox'); if (ov) { ov.classList.add('hidden'); ov.replaceChildren(); } hints(); if (isSettings()) paintSettings(); }
  function ppPress() {
    const n = S.pp; if (!n) return; const it = ppItems()[n.i];
    if (it.k === '@own') { ppClose(); SND.open(); return pickOwnPic(); }
    cfg.x3Pic = it.k ? 'perfiles/' + it.k + '.png' : ''; applyCfg(); save(); SND.open(); toast(it.k ? 'Foto de perfil: ' + it.n : 'Foto de perfil quitada'); ppClose();
  }
  async function pickOwnPic() {
    try { const p = await window.api.pickBackground(); if (!p) return; if (typeof isVideoPath === 'function' && isVideoPath(p)) { toast('Elige una imagen (no un vídeo)'); return; } cfg.x3Pic = p; applyCfg(); save(); if (active) paintSettings(); toast('Foto de perfil puesta ✓'); } catch { toast('No se pudo elegir la imagen'); }
  }
  // Cuadro para escribir el nombre del perfil, con teclado en pantalla (mando) y teclado físico
  const NM_KB = [[...'ABCDEFGHIJ'], [...'KLMNOPQRST'], [...'UVWXYZÑ012'], [...'3456789._-'], ['␣', '⌫', 'Aa', 'Guardar', 'Cancelar']];
  function openNameBox() {
    S.nm = { t: (cfg.x3Name || '').slice(0, 20), r: 0, c: 0, lower: false };
    let ov = $c('.cc-namebox'); if (!ov) { ov = el2('div', 'cc-namebox'); box.append(ov); } ov.classList.remove('hidden'); paintNameBox(); hints();
  }
  function paintNameBox() {
    const ov = $c('.cc-namebox'), n = S.nm; if (!ov || !n) return; ov.replaceChildren();
    const card = el2('div', 'nm-card'), q = el2('div', 'nm-q'); q.append(el2('span', 'nm-t', n.t), el2('span', 'cc-sr-caret'));
    if (!n.t) q.classList.add('empty'); q.dataset.ph = 'Escribe tu nombre…';
    const kb = el2('div', 'nm-kb');
    NM_KB.forEach((row, ri) => { const rw = el2('div', 'nm-row r' + ri); row.forEach((k, ci) => { const lab = k === '␣' ? 'Espacio' : (/^[A-ZÑ]$/.test(k) && n.lower ? k.toLowerCase() : k), b = el2('button', 'nm-key' + (ri === 4 ? ' sp' : '') + (n.r === ri && n.c === ci ? ' sel' : ''), lab); b.tabIndex = -1; b.onclick = () => { n.r = ri; n.c = ci; nmPress(); }; rw.append(b); }); kb.append(rw); });
    card.append(el2('div', 'nm-title', 'Nombre del perfil'), q, kb, el2('div', 'nm-hint', 'Es el nombre que se muestra en la Guía. Si lo dejas vacío se usa el de tu usuario de Windows.')); ov.append(card);
  }
  function nmUpdate() { // actualiza solo el texto y la tecla marcada (sin redibujar el cuadro: evita el parpadeo)
    const ov = $c('.cc-namebox'), n = S.nm; if (!ov || !n) return;
    const t = ov.querySelector('.nm-t'), q = ov.querySelector('.nm-q'); if (t) t.textContent = n.t; if (q) q.classList.toggle('empty', !n.t);
    ov.querySelectorAll('.nm-row').forEach((rw, ri) => rw.querySelectorAll('.nm-key').forEach((b, ci) => { b.classList.toggle('sel', n.r === ri && n.c === ci); const k = NM_KB[ri][ci]; if (/^[A-ZÑ]$/.test(k)) b.textContent = n.lower ? k.toLowerCase() : k; }));
  }
  function nmMove(dir) {
    const n = S.nm; if (!n) return; n.phys = false; const rows = NM_KB.length;
    if (dir === 'up') n.r = (n.r - 1 + rows) % rows; else if (dir === 'down') n.r = (n.r + 1) % rows;
    else if (dir === 'left') n.c = (n.c - 1 + NM_KB[n.r].length) % NM_KB[n.r].length; else if (dir === 'right') n.c = (n.c + 1) % NM_KB[n.r].length;
    n.c = Math.min(n.c, NM_KB[n.r].length - 1); SND.move(); nmUpdate();
  }
  function nmSelKey(k) { const n = S.nm; if (!n) return; for (let r = 0; r < NM_KB.length; r++) { const c = NM_KB[r].indexOf(k); if (c >= 0) { n.r = r; n.c = c; return; } } }
  function nmType(ch) { const n = S.nm; if (!n || n.t.length >= 20) return; n.t += ch; nmUpdate(); }
  function nmPress() {
    const n = S.nm; if (!n) return; const k = NM_KB[n.r][n.c];
    if (k === 'Guardar') return nmClose(true); if (k === 'Cancelar') return nmClose(false);
    SND.open();
    if (k === '⌫') { n.t = n.t.slice(0, -1); nmUpdate(); } else if (k === 'Aa') { n.lower = !n.lower; nmUpdate(); }
    else if (k === '␣') nmType(' '); else nmType(/^[A-ZÑ]$/.test(k) && n.lower ? k.toLowerCase() : k);
  }
  function nmClose(ok) {
    const n = S.nm; S.nm = null; const ov = $c('.cc-namebox'); if (ov) { ov.classList.add('hidden'); ov.replaceChildren(); }
    if (ok && n) { cfg.x3Name = n.t.trim(); applyCfg(); save(); toast(cfg.x3Name ? 'Nombre: ' + cfg.x3Name : 'Se usará el nombre de tu usuario de Windows'); }
    else SND.back();
    hints(); if (isSettings()) paintSettings();
  }
