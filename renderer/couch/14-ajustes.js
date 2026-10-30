  // ---------- Ajustes del modo consola ----------
  const CATS = ['Apariencia', 'Distribución', 'Texto y pantalla', 'Sonido', 'General'];
  const catRows = () => setRows().filter((r) => r.cat === S.cat);
  function setRows() {
    const th = THEMES.find((x) => x.id === cfg.theme) || THEMES[0];
    const cyc = (key, list) => (d) => { const i = list.findIndex((o) => o[0] === cfg[key]); cfg[key] = list[(i + d + list.length) % list.length][0]; };
    const lbl = (key, list) => (list.find((o) => o[0] === cfg[key]) || list[0])[1];
    const TH = THEMES.map((t) => [t.id, t.name]), BG = [['game', 'Banner del juego'], ['art', 'Ilustración del tema'], ['plain', 'Color liso']], TL = [['xs', 'Muy pequeñas'], ['s', 'Pequeñas'], ['m', 'Medianas'], ['l', 'Grandes'], ['xl', 'Muy grandes']], BN = [['side', 'Lateral con degradado'], ['full', 'Pantalla completa']], GP = [['s', 'Pegadas'], ['m', 'Normal'], ['l', 'Separadas']], RP = [['high', 'Alta'], ['mid', 'Media'], ['low', 'Baja']], SV = [['s', 'Bajo'], ['m', 'Medio'], ['l', 'Alto']], LY = [['auto', 'Automática (según la pantalla)'], ['row', 'Fila horizontal'], ['grid', 'Cuadrícula vertical']], BD = [['none', 'Sin borde'], ['thin', 'Fino'], ['normal', 'Normal']], RD = [['s', 'Rectas'], ['m', 'Redondeadas'], ['l', 'Muy redondeadas']], YN = [[true, 'Sí'], [false, 'No']], HB = [['game', 'Según el juego enfocado'], ['custom', 'Imagen propia'], ['plain', 'Color liso']], PI = [['auto', 'Automático'], ['xbox', 'Xbox'], ['ps', 'PlayStation'], ['nintendo', 'Nintendo'], ['generic', 'Genérico']], SF = [[0, 'Ninguno'], [2, '2 %'], [4, '4 %'], [6, '6 %'], [8, '8 %'], [10, '10 %']], TP = [['top', 'Arriba (texto)'], ['left', 'Izquierda (iconos)'], ['right', 'Derecha (iconos)']], OP = [['keep', 'Mantener el modo consola'], ['min', 'Minimizar el modo consola']], FN = [['s', 'Pequeña'], ['m', 'Normal'], ['l', 'Grande']], NM = [['focus', 'Solo el enfocado'], ['all', 'Todos']];
    const UIS = [['default', 'Clásico de Comptus'], ['x360', 'Xbox 360 (panel moderno)'], ['deck', 'Steam Big Picture (oscuro)']];
    const CAT_OF = { 'Estilo de interfaz': 0, 'Tarjeta del juego en ejecución': 1, 'Margen de pantalla (televisor)': 1, 'Tema de colores': 0, 'Colores según el juego': 0, 'Fondo de Inicio': 0, 'Elegir imagen para Inicio…': 0, 'Fondo': 0, 'Posición del banner': 0, 'Desenfocar el fondo': 0, 'Oscurecer el fondo': 0, 'Posición de las secciones': 1, 'Distribución': 1, 'Tamaño de las portadas': 1, 'Separación entre portadas': 1, 'Altura de la fila horizontal': 1, 'Esquinas de las portadas': 1, 'Borde de selección': 1, 'Mostrar título e información': 1, 'Mostrar nombres': 1, 'Tamaño de la letra': 2, 'Reloj y batería': 2, 'Sonidos': 3, 'Volumen de los sonidos': 3 };
    const X3B = [['grey', 'Gris Xbox 360'], ['game', 'Banner del juego'], ['custom', 'Imagen propia']], X3T = [['s', 'Pequeñas'], ['m', 'Medianas'], ['l', 'Grandes']];
    Object.assign(CAT_OF, { 'Fondo de pantalla': 0, 'Elegir imagen de fondo…': 0, 'Tamaño de las tarjetas': 1, 'Sonidos del menú Xbox 360': 3, 'Vibración del mando (Xbox 360)': 3, 'Vibración al cambiar de sección (Xbox 360)': 3, 'Oscurecer el fondo (Xbox 360)': 0, 'Fondo en movimiento (Xbox 360)': 0, 'Desenfocar el fondo (Xbox 360)': 0, 'Imagen solo para Inicio': 0, 'Elegir imagen para Inicio (Xbox 360)…': 0, 'Nombre del perfil (Xbox 360)': 4, 'Elegir una imagen propia…': 4, 'Foto de perfil': 4, 'Quitar la foto de perfil': 4 });
    const X3_ONLY = ['Vibración al cambiar de sección (Xbox 360)', 'Vibración del mando (Xbox 360)', 'Fondo en movimiento (Xbox 360)', 'Foto de perfil', 'Elegir una imagen propia…', 'Quitar la foto de perfil', 'Nombre del perfil (Xbox 360)', 'Imagen solo para Inicio', 'Elegir imagen para Inicio (Xbox 360)…', 'Oscurecer el fondo (Xbox 360)', 'Desenfocar el fondo (Xbox 360)', 'Fondo de pantalla', 'Elegir imagen de fondo…', 'Tamaño de las tarjetas', 'Sonidos del menú Xbox 360'];
    const CLASSIC_ONLY = ['Tema de colores', 'Colores según el juego', 'Fondo', 'Fondo de Inicio', 'Elegir imagen para Inicio…', 'Posición del banner', 'Posición de las secciones', 'Distribución', 'Desenfocar el fondo', 'Oscurecer el fondo', 'Tamaño de las portadas', 'Separación entre portadas', 'Altura de la fila horizontal', 'Borde de selección', 'Esquinas de las portadas', 'Mostrar título e información', 'Mostrar nombres'];
    const x3 = cfg.ui === 'x360', dk = cfg.ui === 'deck', DK_HIDE = ['Tema de colores', 'Colores según el juego', 'Posición de las secciones', 'Distribución'], DK_KEEP = ['Foto de perfil', 'Elegir una imagen propia…', 'Quitar la foto de perfil', 'Nombre del perfil (Xbox 360)'];
    return [
      { name: 'Fondo de pantalla', val: lbl('x3Bg', X3B) + (cfg.x3Bg === 'custom' && !cfg.x3BgPath ? ' (elige una imagen)' : ''), change: cyc('x3Bg', X3B) },
      { name: 'Elegir imagen de fondo…', val: cfg.x3BgPath ? cfg.x3BgPath.split(/[\\/]/).pop() : '', action: async () => {
        try { const p = await window.api.pickBackground(); if (!p) return; if (typeof isVideoPath === 'function' && isVideoPath(p)) { toast('Elige una imagen (no un vídeo)'); return; } cfg.x3BgPath = p; cfg.x3Bg = 'custom'; applyCfg(); save(); if (active) paintSettings(); toast('Fondo puesto ✓'); } catch { toast('No se pudo elegir la imagen'); }
      } },
      { name: 'Foto de perfil', val: /^perfiles\//.test(cfg.x3Pic || '') ? PICS[picIdx()][1] : (cfg.x3Pic ? 'Mi imagen' : 'Ninguna'), action: () => openPicBox() },
      { name: 'Elegir una imagen propia…', val: cfg.x3Pic && !/^perfiles\//.test(cfg.x3Pic) ? cfg.x3Pic.split(/[\\/]/).pop() : '', action: () => pickOwnPic() },
      ...(cfg.x3Pic ? [{ name: 'Quitar la foto de perfil', val: '', action: () => { cfg.x3Pic = ''; applyCfg(); save(); if (active) paintSettings(); toast('Foto de perfil quitada'); } }] : []),
      { name: 'Nombre del perfil (Xbox 360)', val: cfg.x3Name || S.uname || 'Jugador', action: () => openNameBox() },
      { name: 'Imagen solo para Inicio', val: cfg.x3HomeBg === 'custom' ? (cfg.x3HomePath ? 'Sí' : 'Sí (elige una imagen)') : 'No', change: () => { cfg.x3HomeBg = cfg.x3HomeBg === 'custom' ? 'off' : 'custom'; } },
      { name: 'Elegir imagen para Inicio (Xbox 360)…', val: cfg.x3HomePath ? cfg.x3HomePath.split(/[\\/]/).pop() : '', action: async () => {
        try { const p = await window.api.pickBackground(); if (!p) return; if (typeof isVideoPath === 'function' && isVideoPath(p)) { toast('Elige una imagen (no un vídeo)'); return; } cfg.x3HomePath = p; cfg.x3HomeBg = 'custom'; applyCfg(); save(); if (active) paintSettings(); toast('Imagen de Inicio puesta ✓'); } catch { toast('No se pudo elegir la imagen'); }
      } },
      { name: 'Oscurecer el fondo (Xbox 360)', val: (cfg.x3Dim || 0) ? cfg.x3Dim + ' %' : 'No', change: (d) => { cfg.x3Dim = Math.max(0, Math.min(90, (+cfg.x3Dim || 0) + d * 10)); } },
      { name: 'Fondo en movimiento (Xbox 360)', val: cfg.x3Move ? 'Sí' : 'No', change: () => { cfg.x3Move = !cfg.x3Move; } },
      { name: 'Desenfocar el fondo (Xbox 360)', val: cfg.x3Blur ? cfg.x3Blur + ' px' : 'No', change: (d) => { cfg.x3Blur = Math.max(0, Math.min(30, (+cfg.x3Blur || 0) + d * 5)); } },
      { name: 'Tamaño de las tarjetas', val: lbl('x3Tile', X3T), change: cyc('x3Tile', X3T) },
      { name: 'Vibración del mando (Xbox 360)', val: cfg.x3Rumble === false ? 'No' : 'Sí', change: () => { cfg.x3Rumble = cfg.x3Rumble === false; if (cfg.x3Rumble) rumble(false); } },
      { name: 'Vibración al cambiar de sección (Xbox 360)', val: cfg.x3Tick === false ? 'No' : 'Sí', change: () => { cfg.x3Tick = cfg.x3Tick === false; if (cfg.x3Tick) rumble('tick'); } },
      { name: 'Sonidos del menú Xbox 360', val: cfg.x3Snd === false ? 'No' : 'Sí', change: () => { cfg.x3Snd = cfg.x3Snd === false; } },
      { name: 'Estilo de interfaz', val: lbl('ui', UIS), change: (d) => { cyc('ui', UIS)(d); const want = cfg.ui === 'x360' ? 'x360m' : cfg.ui === 'x360b' ? 'x360d' : cfg.ui === 'deck' ? 'deck' : null; if (want) { if (!/^(x360|deck)/.test(cfg.theme)) cfg.prevTheme = cfg.theme; if (cfg.ui === 'deck' || !/^x360/.test(cfg.theme)) cfg.theme = want; } else if (/^(x360|deck)/.test(cfg.theme)) cfg.theme = cfg.prevTheme && !/^(x360|deck)/.test(cfg.prevTheme) ? cfg.prevTheme : 'midnight'; } },
      { name: 'Tema de colores', val: th.name, change: cyc('theme', TH), swatch: th },
      { name: 'Colores según el juego', val: lbl('adapt', YN), change: cyc('adapt', YN) },
      { name: 'Tarjeta del juego en ejecución', val: lbl('nowCard', YN), change: cyc('nowCard', YN) },
      { name: 'Margen de pantalla (televisor)', val: lbl('safe', SF), change: cyc('safe', SF) },
      { name: 'Fondo', val: lbl('bgMode', BG), change: cyc('bgMode', BG) },
      { name: 'Fondo de Inicio', val: lbl('homeBg', HB) + (cfg.homeBg === 'custom' && !cfg.homeBgPath ? ' (elige una imagen)' : ''), change: cyc('homeBg', HB) },
      { name: 'Elegir imagen para Inicio…', val: cfg.homeBgPath ? cfg.homeBgPath.split(/[\\/]/).pop() : '', action: async () => {
        try { const p = await window.api.pickBackground(); if (!p) return; if (typeof isVideoPath === 'function' && isVideoPath(p)) { toast('Para Inicio elige una imagen (no un vídeo)'); return; } cfg.homeBgPath = p; cfg.homeBg = 'custom'; applyCfg(); save(); if (active) paintSettings(); toast('Fondo de Inicio puesto ✓'); } catch { toast('No se pudo elegir la imagen'); }
      } },
      { name: 'Posición del banner', val: lbl('banner', BN), change: cyc('banner', BN) },
      { name: 'Posición de las secciones', val: lbl('tabsPos', TP), change: cyc('tabsPos', TP) },
      { name: 'Distribución', val: lbl('layout', LY), change: cyc('layout', LY) },
      { name: 'Desenfocar el fondo', val: cfg.blur ? cfg.blur + ' px' : 'No', change: (d) => { cfg.blur = Math.max(0, Math.min(30, (cfg.blur || 0) + d * 5)); } },
      { name: 'Oscurecer el fondo', val: cfg.dim + ' %', change: (d) => { cfg.dim = Math.max(20, Math.min(90, cfg.dim + d * 10)); } },
      { name: 'Tamaño de las portadas', val: lbl('tile', TL), change: cyc('tile', TL) },
      { name: 'Separación entre portadas', val: lbl('gap', GP), change: cyc('gap', GP) },
      { name: 'Altura de la fila horizontal', val: lbl('rowPos', RP), change: cyc('rowPos', RP) },
      { name: 'Sonidos', val: cfg.sound ? 'Sí' : 'No', change: () => { cfg.sound = !cfg.sound; } },
      { name: 'Volumen de los sonidos', val: lbl('vol', SV), change: cyc('vol', SV) },
      { name: 'Tamaño de la letra', val: lbl('font', FN), change: cyc('font', FN) },
      { name: 'Borde de selección', val: lbl('border', BD), change: cyc('border', BD) },
      { name: 'Esquinas de las portadas', val: lbl('radius', RD), change: cyc('radius', RD) },
      { name: 'Mostrar título e información', val: cfg.info === false ? 'No' : 'Sí', change: () => { cfg.info = cfg.info === false; } },
      { name: 'Mostrar nombres', val: lbl('names', NM), change: cyc('names', NM) },
      { name: 'Reloj y batería', val: cfg.clock ? 'Sí' : 'No', change: () => { cfg.clock = !cfg.clock; } },
      { name: 'Abrir Comptus en modo consola', val: couchStart ? 'Sí' : 'No', change: () => { couchStart = !couchStart; window.api.setSettings({ couchStart }); const c = document.getElementById('couchStart'); if (c) c.checked = couchStart; }, noSave: true },
      { name: 'Iconos del mando', val: lbl('padIcons', PI) + (cfg.padIcons === 'auto' && window.PadIcons ? ' (' + PadIcons.TYPES[PadIcons.cur()] + ')' : ''), change: cyc('padIcons', PI) },
      { name: 'Al iniciar un juego', val: lbl('onPlay', OP), change: cyc('onPlay', OP) },
      { name: 'Actualizar la biblioteca', val: '', action: () => { refreshLibrary(); } },
      { name: 'Restablecer estos ajustes', val: '', action: () => { cfg = { ...DEF }; } },
      { name: 'Ajustes cargados desde', val: '', info: loadSrc, action: () => {} },
      { name: 'Salir del modo consola', val: '', action: () => exit() },
      { name: 'Guardar ajustes ahora', val: '', action: () => saveNow() },
    ].filter((r) => x3 ? !CLASSIC_ONLY.includes(r.name) : dk ? (!X3_ONLY.includes(r.name) || DK_KEEP.includes(r.name)) && !DK_HIDE.includes(r.name) : !X3_ONLY.includes(r.name)).sort((a, b) => (b.name === 'Estilo de interfaz') - (a.name === 'Estilo de interfaz')).map((r) => ({ ...r, cat: CAT_OF[r.name] ?? 4 }));
  }
  function paintSettings() {
    const page = $c('.cc-settings'); page.replaceChildren();
    const side = el2('div', 'cc-s-cats'); side.append(el2('h1', 'cc-s-title', 'Ajustes'));
    CATS.forEach((n, i) => { const b = el2('div', 'cc-s-cat' + (i === S.cat ? ' on' : '') + (i === S.cat && S.col === 'cat' ? ' sel' : ''), n); b.onclick = () => { S.cat = i; S.col = 'cat'; S.set = 0; SND.move(); paintSettings(); }; side.append(b); });
    const wrap = el2('div', 'cc-s-wrap' + (S.col === 'rows' ? ' focus' : ''));
    const rows = catRows(); if (S.set >= rows.length) S.set = Math.max(0, rows.length - 1);
    rows.forEach((r, i) => {
      const row = el2('div', 'cc-s-row' + (i === S.set && S.col === 'rows' ? ' sel' : '') + (r.action ? ' act' : '')); row.dataset.i = i;
      row.append(el2('span', 'cc-s-name', r.name));
      if (r.swatch) { const sw = el2('span', 'cc-sw'); sw.style.background = `linear-gradient(90deg, ${r.swatch.bg} 0 34%, ${r.swatch.panel} 34% 60%, ${r.swatch.accent} 60% 82%, ${r.swatch.accent2} 82%)`; row.append(sw); }
      if (r.info) row.append(el2('span', 'cc-s-info', r.info));
      if (!r.action && cfg.ui === 'deck' && /^(Sí|No)( |$)/.test(r.val)) { const on = r.val.startsWith('Sí'), t = el2('span', 'dk-sw' + (on ? ' on' : '')); t.append(el2('i')); row.append(t); if (r.val.length > 3) row.append(el2('span', 'cc-s-info', r.val.slice(3))); }
      else if (!r.action) { const v = el2('span', 'cc-s-val'); v.append(el2('i', null, '‹'), document.createTextNode(' ' + r.val + ' '), el2('i', null, '›')); row.append(v); }
      row.onmouseenter = () => { if (padActive() || (S.col === 'rows' && S.set === i)) return; S.col = 'rows'; S.set = i; page.querySelectorAll('.cc-s-row').forEach((e, k) => e.classList.toggle('sel', k === i)); page.querySelectorAll('.cc-s-cat').forEach((e) => e.classList.remove('sel')); wrap.classList.add('focus'); hints(); };
      row.onclick = () => { S.col = 'rows'; S.set = i; settingsAct(0, true); };
      wrap.append(row);
    });
    page.append(side, wrap);
    const sel = wrap.querySelector('.sel'); if (sel) wrap.scrollTop = Math.max(0, sel.offsetTop - wrap.clientHeight / 2);
  }

  function settingsAct(d, fromA) {
    const rows = catRows(), r = rows[S.set]; if (!r) return;
    if (r.action) { if (fromA) { SND.open(); r.action(); if (r.name.startsWith('Restablecer')) { applyCfg(); save(); } if (active) paintSettings(); } return; }
    r.change(d || 1); SND.change(); applyCfg(); if (!r.noSave) save(); paintSettings(); mark(true); paintHero();
  }

