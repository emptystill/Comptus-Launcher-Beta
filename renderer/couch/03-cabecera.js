  // ---------- Cabecera, fondo y pie ----------
  const TAB_IC = {
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    home: '<path d="M3.5 11.5L12 4l8.5 7.5M6 10v9.5h4.5V14h3v5.5H18V10"/>',
    all: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
    inst: '<path d="M12 3v12M7 10.5l5 5 5-5M4.5 20h15"/>',
    recent: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
    fav: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9L3.5 9.7l5.9-.8z"/>',
    most: '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>',
    ach: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    colls: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>',
    store: '<path d="M3.5 12.5L12 4h7.5v7.5L11 20zM15.5 8.5h.01"/>', shots: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 16l5-5 4 4 3-3 5 5"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>', save: '<path d="M5 3.5h11l3.5 3.5v13.5H5zM8 3.5v5h7v-5M8 20.5v-6h8v6"/>', bell: '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4"/>',
    music: '<path d="M9 18V5l11-2v13M9 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3zM20 16a3 3 0 1 1-3-3 3 3 0 0 1 3 3z"/>', sound: '<path d="M4 9.5h4L13 5v14l-5-4.5H4zM16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>', power: '<path d="M12 3v9M6.5 6.5a8 8 0 1 0 11 0"/>', exit: '<path d="M10 4.5H5v15h5M15 8l4 4-4 4M19 12H9"/>', stop: '<rect x="5.5" y="5.5" width="13" height="13" rx="2"/>',
    settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  };
  const tabIcon = (id) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TAB_IC[id] || TAB_IC.all}</svg>`;
  const DK_LIB = ['all', 'inst', 'colls', 'fav', 'recent', 'most']; // secciones que Big Picture agrupa como pestañas de la biblioteca
  function paintTabs() {
    const nav = $c('.cc-tabs'); nav.replaceChildren();
    box.style.setProperty('--bl-b', String(S.tab)); box.style.setProperty('--bl-a', String(Math.max(0, S.tabs.length - 1 - S.tab)));
    const side = !/^(x360|deck)/.test(cfg.ui || '') && (cfg.tabsPos === 'left' || cfg.tabsPos === 'right');
    if (side && window.PadIcons) { const l = el2('span', 'cc-rail-pad'); l.innerHTML = PadIcons.chip('LB'); nav.append(l); }
    const dk = cfg.ui === 'deck', inLib = dk && !!S.tabs[S.tab] && DK_LIB.includes(S.tabs[S.tab].id);
    if (box) box.classList.toggle('dk-lib', inLib);
    S.tabs.forEach((t, i) => {
      const b = el2('button', 'cc-tab' + (i === S.tab ? ' on' : '') + (side ? ' ico' : '') + (dk && !DK_LIB.includes(t.id) ? ' dk-off' : ''));
      if (dk && DK_LIB.includes(t.id)) { b.innerHTML = ''; b.append(el2('span', null, t.id === 'all' ? 'Todos los juegos' : t.title)); let n = 0; try { n = t.id === 'settings' ? 0 : tabItems(t.id).length; } catch {} if (n) b.append(el2('i', 'dk-n', String(n))); }
      else if (side) { b.innerHTML = tabIcon(t.id); b.title = t.title; b.setAttribute('aria-label', t.title); } else b.textContent = t.title;
      b.tabIndex = -1; b.onclick = () => gotoTab(i); nav.append(b);
    });
    if (side && window.PadIcons) { const r = el2('span', 'cc-rail-pad'); r.innerHTML = PadIcons.chip('RB'); nav.append(r); }
    { const o = nav.querySelector('.cc-tab.on'); if (dk && o) { o.classList.add('hot'); clearTimeout(paintTabs._hot); paintTabs._hot = setTimeout(() => { try { o.classList.remove('hot'); } catch {} }, 1700); } }
    const on = nav.querySelector('.cc-tab.on'); if (on && !side) try { if (cfg.ui === 'x360') nav.scrollTo({ left: on.offsetLeft - nav.offsetLeft - 2, behavior: 'smooth' }); else nav.scrollLeft = on.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2; } catch {}
  }
  function paintMe() { // foto y nombre del perfil junto al reloj (Xbox 360)
    const me = box && $c('.cc-me'); if (!me) return; const sp = cfg.ui === 'deck' && S.prof && S.prof.ok && S.prof.avatar ? S.prof : null, nm = (sp && sp.name) || cfg.x3Name || S.uname || 'Jugador', key = nm + '|' + (cfg.x3Pic || '') + '|' + (sp ? sp.avatar : '');
    if (me._k === key) return; me._k = key; me.replaceChildren();
    const pic = sp ? sp.avatar : cfg.x3Pic ? picSrc(cfg.x3Pic) : '';
    const av = el2('div', 'me-av' + (pic ? ' pic' : ''), pic ? '' : nm.charAt(0).toUpperCase()); if (pic) av.style.backgroundImage = `url("${pic}")`;
    me.append(av, el2('div', 'me-nm', nm));
    if (cfg.ui === 'deck') { me.style.cursor = 'pointer'; me.onclick = () => { if (!S.menu) dkProfile(); }; }
  }
  function tick() { paintMe(); if (box) $c('.cc-clock').textContent = cfg.ui === 'deck' ? new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?([ap])\.?\s?m\.?$/i, ' $1.m.').toLowerCase() : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  const hk = (a) => (hintMode === 'pad' && window.PadIcons ? `<i class="pk">${PadIcons.html(a)}</i>` : `<b>${a}</b>`);
  function hintHtml(arr) { // en el estilo Big Picture: «Menú» a la izquierda, el resto a la derecha, con los nombres de Steam
    if (cfg.ui !== 'deck') return arr.map(([a, t]) => `<span>${hk(a)}${t}</span>`).join('');
    const RN = { Abrir: 'Seleccionar', Elegir: 'Seleccionar', Aceptar: 'Seleccionar', Volver: 'Atrás', Cerrar: 'Atrás', Cancelar: 'Atrás' }, KN = { Enter: 'Intro', F2: 'F1' };
    const one = ([a, t]) => `<span>${hk(KN[a] || a)}${RN[t] || t}</span>`;
    const seen = {}, ded = (l) => l.filter((x) => { const k = RN[x[1]] || x[1]; if (seen[k]) return false; seen[k] = 1; return true; });
    return ded(arr.filter((x) => x[1] === 'Menú')).map(one).join('') + '<i class="dk-sp"></i>' + ded(arr.filter((x) => x[1] !== 'Menú')).map(one).join('');
  }
  function hints() {
    const pads = { achs: [['↑ ↓', 'Elegir logro'], ['B', 'Volver']], media: [['◀ ▶', 'Cambiar'], ['A', 'Pausa / Ampliar'], ['B', 'Volver']], list: [['A', 'Abrir'], ['X', 'Jugar'], ['Y', 'Opciones'], ['LB RB', 'Sección'], ['LT RT', 'Saltar'], ['Select + X', 'Menú']], detail: [['A', 'Elegir'], ['X', 'Jugar'], ['Y', 'Opciones'], ['↑ ↓', 'Leer'], ['B', 'Volver']], settings: [['↑ ↓', 'Opción'], ['← →', 'Cambiar'], ['A', 'Aceptar'], ['B', 'Volver']], search: [['A', 'Escribir'], ['B', 'Borrar'], ['Y', 'Espacio'], ['↓ →', 'Resultados'], ['LB RB', 'Sección']], searchRes: [['A', 'Abrir'], ['X', 'Jugar'], ['Y', 'Tienda'], ['↑ ←', 'Teclado'], ['LB RB', 'Sección']], home: [['A', 'Abrir'], ['X', 'Jugar'], ['↑ ↓', 'Fila'], ['← →', 'Elegir'], ['LB RB', 'Sección'], ['Select + X', 'Menú']], settingsCat: [['↑ ↓', 'Categoría'], ['→ / A', 'Entrar'], ['LB RB', 'Sección'], ['B', 'Salir']] };
    const kbs = { search: [['Enter', 'Escribir'], ['Borrar', 'Retroceso'], ['↓ →', 'Resultados'], ['Av Pág / Re Pág', 'Sección']], searchRes: [['Enter', 'Abrir'], ['P', 'Jugar'], ['Tab', 'Tienda'], ['↑ ←', 'Teclado']], home: [['↑ ↓', 'Fila'], ['← →', 'Elegir'], ['Enter', 'Abrir'], ['P', 'Jugar'], ['Q / E', 'Sección'], ['F2', 'Menú']],  achs: [['↑ ↓', 'Elegir logro'], ['Esc', 'Volver']], media: [['← →', 'Cambiar'], ['Enter', 'Pausa / Ampliar'], ['Esc', 'Volver']], list: [['← →', 'Moverse'], ['Enter', 'Abrir'], ['P', 'Jugar'], ['M', 'Opciones'], ['F', 'Favorito'], ['Q / E', 'Sección'], ['F2', 'Menú']], detail: [['← →', 'Elegir'], ['Enter', 'Aceptar'], ['P', 'Jugar'], ['↑ ↓', 'Leer'], ['Esc', 'Volver']], settings: [['↑ ↓', 'Opción'], ['← →', 'Cambiar'], ['Enter', 'Aceptar'], ['Esc', 'Volver']], settingsCat: [['↑ ↓', 'Categoría'], ['→ / Enter', 'Entrar'], ['Q / E', 'Sección'], ['Esc', 'Salir']] };
    const nmH = { pad: [['← ↑ ↓ →', 'Mover'], ['A', 'Escribir'], ['X', 'Borrar'], ['Y', 'Espacio'], ['B', 'Cancelar']], kb: [['Teclear', 'Escribir'], ['← ↑ ↓ →', 'Mover'], ['Enter', 'Elegir / Guardar'], ['Esc', 'Cancelar']] };
    if (S.pp) { $c('.cc-hints').innerHTML = hintHtml((hintMode === 'pad' ? [['← ↑ ↓ →', 'Mover'], ['A', 'Elegir'], ['B', 'Volver']] : [['← ↑ ↓ →', 'Mover'], ['Enter', 'Elegir'], ['Esc', 'Volver']])); return; }
    if (S.nm) { $c('.cc-hints').innerHTML = hintHtml(nmH[hintMode === 'pad' ? 'pad' : 'kb']); return; }
    const menuH = { pad: [['↑ ↓', 'Opción'], ['A', 'Aceptar'], ['B', 'Cerrar']], kb: [['↑ ↓', 'Opción'], ['Enter', 'Aceptar'], ['Esc', 'Cerrar']] };
    if (S.menu) { $c('.cc-hints').innerHTML = hintHtml(menuH[hintMode === 'pad' ? 'pad' : 'kb']); return; }
    const k = S.view === 'detail' && S.det.afocus ? 'achs' : S.view === 'detail' && S.det.mfocus ? 'media' : S.view === 'detail' ? 'detail' : isSettings() ? (S.col === 'cat' ? 'settingsCat' : 'settings') : isHome() ? 'home' : isSearch() ? (SR.zone === 'res' ? 'searchRes' : 'search') : 'list';
    if (cfg.ui === 'deck' && hintMode !== 'pad' && (k === 'search' || k === 'searchRes')) { $c('.cc-hints').innerHTML = hintHtml([['F2', 'Menú'], ['F4', 'Borrar'], ['Enter', 'Seleccionar'], ['Esc', 'Atrás']]); return; }
    $c('.cc-hints').innerHTML = hintHtml((hintMode === 'pad' ? pads : kbs)[k]);
  }
  const BGK = new Map(); // arte de tarjetas vecinas ya decodificado (Steam: el fondo cambia sin tirones)
  function preBg(g) {
    if (!g || cfg.ui !== 'deck') return;
    const u = [g.bannerSm, g.banner, g.bannerFallback, g.coverSm, g.cover, g.coverFallback].filter(Boolean).map(imgUrl)[0]; if (!u || BGK.has(u)) return;
    const im = new Image(); im.decoding = 'async'; im.src = u; if (im.decode) im.decode().catch(() => {}); BGK.set(u, im); if (BGK.size > 16) BGK.delete(BGK.keys().next().value);
  }
  function setBg(g) {
    adaptColors(g);
    const bg = $c('.cc-bg'); const id = ++imgSeq;
    if (cfg.ui === 'deck') { // Big Picture: el arte del juego enfocado, siempre
      const urls = g ? [g.bannerSm, g.banner, g.bannerFallback, g.coverSm, g.cover, g.coverFallback].filter(Boolean).map(imgUrl) : []; bg.style.imageRendering = ''; /* primero la copia fija (bannerSm): un banner webp animado enorme como fondo lagueaba */
      (function nxd(i) {
        if (i >= urls.length) { if (id === imgSeq) { const pu = bg.dataset.u; if (pu) { bg.style.setProperty('--prev', `url("${pu}")`); bg.classList.remove('swap'); void bg.offsetWidth; bg.classList.add('swap'); } bg.style.backgroundImage = ''; bg.dataset.u = ''; $c('.cc-shade').style.removeProperty('--dk-art'); } return; }
        const im = new Image(); im.onload = () => { const go = () => { if (id === imgSeq) { if (bg.dataset.u === urls[i]) return; const prevU = bg.dataset.u; if (prevU) bg.style.setProperty('--prev', `url("${prevU}")`); else bg.style.removeProperty('--prev'); bg.style.setProperty('--pan', '-' + ((Date.now() / 1000) % 52).toFixed(2) + 's'); bg.dataset.u = urls[i]; $c('.cc-shade').style.setProperty('--dk-art', `url("${urls[i]}")`); bg.style.backgroundImage = `url("${urls[i]}")`; bg.classList.remove('swap'); void bg.offsetWidth; bg.classList.add('swap'); } }; if (im.decode) im.decode().then(go, go); else go(); }; // se decodifica ANTES de cambiar el fondo: así no hay tirón al pintar
        im.onerror = () => nxd(i + 1); im.src = urls[i];
      })(0); return;
    }
    if (cfg.ui === 'x360') { // fondo propio del estilo Xbox 360
      const md = cfg.x3Bg || 'grey', det = S.view === 'detail';
      let urls = []; bg.style.imageRendering = '';
      if (isHome() && !det && cfg.x3HomeBg === 'custom' && cfg.x3HomePath) urls = [imgUrl(cfg.x3HomePath)]; else if (md === 'custom' && cfg.x3BgPath) urls = [imgUrl(cfg.x3BgPath)]; else if ((md === 'game' || det) && g) urls = [g.banner, g.bannerSm, g.bannerFallback, g.cover, g.coverFallback].filter(Boolean).map(imgUrl);
      (function nx3(i) {
        if (i >= urls.length) { if (id === imgSeq) { bg.style.backgroundImage = ''; bg.dataset.u = ''; } return; }
        const im = new Image(); im.onload = () => { if (id === imgSeq) { if (bg.dataset.u === urls[i]) return; bg.dataset.u = urls[i]; bg.style.backgroundImage = `url("${urls[i]}")`; bg.classList.remove('swap'); void bg.offsetWidth; bg.classList.add('swap'); } };
        im.onerror = () => nx3(i + 1); im.src = urls[i];
      })(0); return;
    }
    if (isHome() && S.view === 'list' && (cfg.homeBg === 'custom' || cfg.homeBg === 'plain')) { // fondo exclusivo de Inicio
      bg.style.imageRendering = ''; box.classList.toggle('home-bg', cfg.homeBg === 'custom' && !!cfg.homeBgPath);
      const u = cfg.homeBg === 'custom' && cfg.homeBgPath ? imgUrl(cfg.homeBgPath) : '';
      if (!u) { bg.style.backgroundImage = ''; bg.dataset.u = ''; return; }
      const im = new Image(); im.onload = () => { if (id === imgSeq && bg.dataset.u !== u) { bg.dataset.u = u; bg.style.backgroundImage = `url("${u}")`; bg.classList.remove('swap'); void bg.offsetWidth; bg.classList.add('swap'); } }; im.onerror = () => { if (id === imgSeq) { bg.style.backgroundImage = ''; bg.dataset.u = ''; } }; im.src = u; return;
    }
    const th0 = cfg.bgMode === 'art' ? THEMES.find((x) => x.id === cfg.theme) : null, key = th0 && th0.art, u0 = key && window.THEME_ART ? window.THEME_ART.get(key) : '';
    if (u0) { bg.dataset.u = ''; bg.style.backgroundImage = u0; bg.style.imageRendering = window.THEME_ART.pixel(key) ? 'pixelated' : ''; return; } // sin ilustración en el tema elegido se usa el banner del juego
    bg.style.imageRendering = '';
    if (!g || cfg.bgMode === 'plain') { bg.style.backgroundImage = ''; bg.dataset.u = ''; return; }
    const urls = [g.banner, g.bannerSm, g.bannerFallback, g.cover, g.coverFallback].filter(Boolean).map(imgUrl);
    (function next(i) {
      if (i >= urls.length) { if (id === imgSeq) bg.style.backgroundImage = ''; return; }
      const im = new Image(); im.onload = () => { if (id === imgSeq) { if (bg.dataset.u === urls[i]) return; bg.dataset.u = urls[i]; bg.style.backgroundImage = `url("${urls[i]}")`; bg.classList.remove('swap'); void bg.offsetWidth; bg.classList.add('swap'); } };
      im.onerror = () => next(i + 1); im.src = urls[i];
    })(0);
  }

  const fmtPlay = (m) => (!m ? 'Sin jugar' : m >= 60 ? (m >= 600 ? Math.round(m / 60) : (m / 60).toFixed(1)) + ' h jugadas' : Math.round(m) + ' min jugados');
  function fmtLast(ms) { if (!ms) return 'Nunca jugado'; const d = Math.floor((Date.now() - ms) / 86400000); return d <= 0 ? 'Jugado hoy' : d === 1 ? 'Jugado ayer' : d < 30 ? `Jugado hace ${d} días` : 'Jugado el ' + new Date(ms).toLocaleDateString(); }
  function metaOf(g) {
    const st = statusDef(g.status), a = g.achievements;
    return [fmtPlay(g.playTime), fmtLast(g.lastPlayed), st && st.label, a && a.total ? (isComplete(g) ? `🏆 Completado al 100 % (${a.total} logros)` : `Logros ${a.unlocked}/${a.total} (${Math.round(a.unlocked / a.total * 100)} %)`) : '', g.favorite && '★ Favorito'].filter(Boolean).join('   ·   ');
  }
  function titleInto(t, g) {
    t.replaceChildren();
    const logo = g.logoSm || g.logo;
    if (logo && !g.logoOff) { const im = new Image(); im.alt = g.name; im.onerror = () => { t.textContent = g.name; }; im.src = imgUrl(logo); t.append(im); } else t.textContent = g.name;
  }
  function paintHero() {
    const it = cur()[curIdx()], hero = $c('.cc-hero');
    if (!it) { hero.classList.add('empty'); setBg(null); if (box.classList.contains('ach-view')) achPane(null); return; }
    hero.classList.remove('empty'); if (box.classList.contains('ach-view')) achPane(it);
    { let n = hero.querySelector('.cc-x3n'); if (!n) { n = el2('div', 'cc-x3n'); hero.append(n); } n.textContent = cur().length ? `${curIdx() + 1} de ${cur().length}` : ''; }
    if (it.type === 'game') {
      S.focusId = it.g.id; $c('.cc-src').textContent = srcDef(it.g.source).name; titleInto($c('.cc-title'), it.g); $c('.cc-meta').textContent = metaOf(it.g); setBg(it.g);
    } else {
      const name = it.type === 'coll' ? it.c.name : it.s.name;
      $c('.cc-src').textContent = it.type === 'coll' ? 'Colección' : 'Tienda'; $c('.cc-title').textContent = name;
      $c('.cc-meta').textContent = `${it.games.length} juego${it.games.length === 1 ? '' : 's'}`; setBg(it.games[0]);
    }
  }

