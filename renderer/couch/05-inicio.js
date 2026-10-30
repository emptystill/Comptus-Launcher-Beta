  // ---------- Inicio: novedades, gratis, eventos y rebajas ----------
  const HM = { r: 0, c: [], rows: [], data: { free: null, events: null, wish: null }, at: 0, loading: false, failed: false };
  const dayFmt = (ms) => new Date(ms).toLocaleDateString([], { day: 'numeric', month: 'short' });
  const leftTxt = (end) => { const d = Math.ceil((end - Date.now()) / 86400000); return d <= 0 ? 'Termina hoy' : d === 1 ? 'Termina mañana' : `Termina en ${d} días`; };
  const homeCard = () => { const row = HM.rows[HM.r]; return row ? row.items[HM.c[HM.r] || 0] : null; };
  async function loadHome(force) {
    try { loadFriends(false); } catch { /* sin amigos */ }
    if (HM.loading || (!force && HM.at && Date.now() - HM.at < 5 * 60 * 1000)) return;
    HM.loading = true; HM.failed = false;
    const ask = (fn) => { try { return typeof fn === 'function' ? Promise.resolve(fn(!!force)).catch(() => null) : Promise.resolve(null); } catch { return Promise.resolve(null); } };
    const [free, ev, wish] = await Promise.all([ask(window.api.freeGet), ask(window.api.eventsGet), ask(window.api.wishGet)]);
    HM.data = { free, events: ev, wish }; HM.at = Date.now(); HM.loading = false; HM.failed = !free && !ev && !wish;
    if (active && isHome() && S.view === 'list' && !S.menu) paintHome(true);
  }
  // Amigos de Steam (solo Big Picture): se piden al abrir el Inicio y de nuevo al entrar en la pestaña Amigos si pasaron > 2 min
  async function loadFriends(force) {
    if (cfg.ui !== 'deck' || typeof window.api.friendsGet !== 'function') return;
    if (HM.frBusy || (!force && HM.fr && Date.now() - HM.frAt < 2 * 60 * 1000)) return;
    HM.frBusy = true;
    let r = null; try { r = await window.api.friendsGet(!!force); } catch { r = null; }
    HM.frBusy = false; HM.fr = r || { ok: false, code: 'net', error: 'No se pudo consultar a Steam.' }; HM.frAt = Date.now();
    if (active && isHome() && S.view === 'list' && !S.menu && S.dkSrHome !== true) paintHome(true);
  }
  const frLabel = (f) => f.game ? 'Jugando a ' + f.game : f.state === 1 ? 'En línea' : f.state === 2 ? 'Ocupado' : f.state === 3 ? 'Ausente' : f.state === 4 ? 'Dormido' : f.state > 4 ? 'En línea' : f.lastOff ? 'Visto ' + fmtAgo(f.lastOff * 1000) : 'Desconectado';
  function fmtAgo(t) { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); if (m < 60) return 'hace ' + m + ' min'; const h = Math.round(m / 60); if (h < 24) return 'hace ' + h + ' h'; const d = Math.round(h / 24); return d < 30 ? 'hace ' + d + (d === 1 ? ' día' : ' días') : 'hace mucho'; }
  function dkFriendRows() {
    const r = HM.fr;
    if (!r) return [{ id: 'dkfr', title: 'Amigos', items: [{ kind: 'info', title: 'Cargando amigos…', sub: 'Consultando a Steam' }] }];
    if (!r.ok) return [{ id: 'dkfr', title: 'Amigos', items: [{ kind: 'info', title: r.code === 'nokey' ? 'Falta la clave de Steam' : r.code === 'private' ? 'No se pudo ver tu lista de amigos' : 'No se pudo cargar a tus amigos', sub: r.code === 'nokey' ? 'Pega tu clave de la API en Ajustes' : r.code === 'private' ? 'Pon tu lista de amigos en público en tu perfil de Steam' : (r.error || 'Revisa tu conexión') }] }];
    const fr = r.friends || [], mk = (f) => ({ kind: 'friend', title: f.name, sub: frLabel(f), img: f.avatar ? [f.avatar] : [], url: f.url, f });
    const play = fr.filter((f) => f.game), on = fr.filter((f) => !f.game && f.state > 0), off = fr.filter((f) => !f.game && f.state === 0).slice(0, 24);
    const out = [];
    if (play.length) out.push({ id: 'dkfp', title: 'Jugando ahora', items: play.map(mk) });
    if (on.length) out.push({ id: 'dkfo', title: 'En línea', items: on.map(mk) });
    if (off.length) out.push({ id: 'dkff', title: 'Desconectados', items: off.map(mk) });
    if (!out.length) out.push({ id: 'dkfr', title: 'Amigos', items: [{ kind: 'info', title: 'Aún no tienes amigos en Steam', sub: 'Cuando los agregues aparecerán aquí' }] });
    return out;
  }
  // Ficha de un amigo (panel lateral): estado, nivel, «amigos desde», juegos recientes y acciones
  function dkFriendProfile(f) {
    const hrsF = (m) => m >= 60 ? (m / 60).toFixed(1).replace('.', ',') + ' h' : Math.round(m) + ' min', no = () => {};
    const base = () => [
      { label: 'Estado', value: frLabel(f), run: no },
      ...(f.since ? [{ label: 'Amigos desde', value: new Date(f.since * 1000).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, ''), run: no }] : []),
    ];
    const tail = [{ sep: true }, { label: 'Enviar mensaje (abre Steam)', run: () => { if (window.api.friendsChat) window.api.friendsChat(f.id); toast('Abriendo el chat en Steam…'); } }, { label: 'Ver perfil en Steam', run: () => { if (f.url && window.api.friendsOpen) { window.api.friendsOpen(f.url); toast('Abriendo el perfil…'); } } }];
    const items = [...base(), { label: 'Cargando datos del perfil…', run: no }, ...tail];
    cmenu(f.name, items, { side: true, right: true });
    if (!window.api.friendsDetail) return; const m0 = S.menu;
    window.api.friendsDetail(f.id).then((r) => {
      if (!S.menu || S.menu !== m0) return;
      const mid = [];
      if (r && r.ok) {
        if (r.level != null) mid.push({ label: 'Nivel de Steam', value: String(r.level), run: no });
        if (r.recent && r.recent.length) { mid.push({ sep: true }, { label: 'Jugado recientemente', value: '2 semanas', run: no }); r.recent.forEach((g) => mid.push({ label: g.name, value: hrsF(g.min2w), run: no })); }
        else if (r.recentOk) mid.push({ label: 'Sin partidas en las últimas 2 semanas', run: no }); else mid.push({ label: 'Sus juegos son privados', run: no });
      } else mid.push({ label: 'No se pudo leer su perfil', run: no });
      m0.items = [...base(), ...mid, ...tail]; if (m0.idx >= m0.items.length) m0.idx = 0; paintMenu(false);
    }).catch(() => {});
  }
  // Tarjeta flotante del juego en ejecución (se ve en cualquier sección)
  function updNowCard() {
    if (!box) return; let c = $c('.cc-nowcard'), d = $c('.cc-nowdim');
    const rg = runState ? state.games.find((g) => runStateFor(g)) : null;
    const x3 = true; // sin tarjeta de «en ejecución»: la pantalla se difumina a negro al pulsar Jugar (como la Xbox 360)
    const on = !!(active && cfg.ui !== 'deck' && (rg || (S.x3launch && Date.now() - S.x3launch < 12000)));
    if (!d) { d = el2('div', 'cc-nowdim'); box.append(d); }
    d.classList.toggle('on', on); d.classList.toggle('x3', x3);
    if (x3) { if (c) c.classList.add('hidden'); return; }
    if (!on) { if (c) c.classList.add('hidden'); return; }
    if (!c) { c = el2('div', 'cc-nowcard hidden'); box.append(c); }
    if (c.dataset.id !== rg.id) {
      c.dataset.id = rg.id; c.replaceChildren();
      const cv = el2('div', 'cc-nc-cv'), urls = [rg.coverSm, rg.cover, rg.coverFallback, rg.bannerSm, rg.banner].filter(Boolean).map(imgUrl);
      (function next(i) { if (i >= urls.length) { cv.classList.add('none'); cv.style.background = colorFor(rg.name); return; } const im = new Image(); im.alt = ''; im.draggable = false; im.onload = () => cv.append(im); im.onerror = () => next(i + 1); im.src = urls[i]; })(0);
      const b = el2('div', 'cc-nc-body'); b.append(el2('div', 'cc-nc-st', 'EN EJECUCIÓN'), el2('div', 'cc-nc-name', rg.name), el2('div', 'cc-nc-time', ''));
      c.append(cv, b);
    }
    const rs = runStateFor(rg), t = c.querySelector('.cc-nc-time');
    t.textContent = !rs || rs.state === 'starting' ? 'Iniciando…' : rs.state === 'stopping' ? 'Cerrando…' : 'Jugando · ' + clockOf(S.play ? Date.now() - S.play.t : 0);
    c.classList.remove('hidden');
  }
  function clockOf(ms) { const m = Math.floor(ms / 60000); return m < 1 ? 'menos de 1 min' : m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min'; }
  function sessMin() { return S.play ? Math.max(0, Math.floor((Date.now() - S.play.t) / 60000)) : 0; }
  function nowSub(g) { const rs = runStateFor(g); if (!rs || rs.state === 'starting') return 'Iniciando…'; if (rs.state === 'stopping') return 'Cerrando…'; const m = sessMin(); return 'Esta sesión: ' + (m < 1 ? 'menos de 1 min' : m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'); }
  // Rotación: cada 6 horas se elige otro grupo de juegos (estable mientras tanto, para que la fila no cambie al repintar)
  const hashStr = (t) => { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rotate = (arr, n, salt) => { const b = Math.floor(Date.now() / 21600000) + salt; return arr.map((g) => [hashStr(g.id + ':' + b), g]).sort((x, y) => x[0] - y[0]).slice(0, n).map((x) => x[1]); };
  function homeRows() {
    const rows = [], list = state.games.filter(playable), D = HM.data;
    const G = (g, sub, badge) => ({ kind: 'game', g, title: g.name, sub, badge, img: [g.bannerSm, g.banner, g.bannerFallback, g.coverSm, g.cover, g.coverFallback].filter(Boolean).map(imgUrl) });
    const rg = runState ? list.find((g) => runStateFor(g)) || state.games.find((g) => runStateFor(g)) : null;
    if (rg) rows.push({ id: 'now', title: 'Jugando ahora', items: [{ ...G(rg, nowSub(rg), 'EN EJECUCIÓN'), now: true }] });
    const rec = list.filter((g) => g.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed).slice(0, 12);
    if (rec.length) rows.push({ id: 'cont', title: 'Continuar jugando', items: rec.map((g) => G(g, fmtLast(g.lastPlayed) + (cfg.ui === 'deck' && g.playTime > 0 ? ' · ' + (g.playTime >= 60 ? ((g.playTime / 60) >= 10 ? Math.round(g.playTime / 60) : (g.playTime / 60).toFixed(1).replace(/\.0$/, '').replace('.', ',')) + ' h' : Math.round(g.playTime) + ' min') : ''), g.installed === false ? 'No instalado' : ''))});
    const hrs = (g) => { const h = (g.playTime || 0) / 60; return (h >= 10 ? Math.round(h) : h.toFixed(1).replace(/\.0$/, '')) + ' h jugadas'; };
    const favs = list.filter((g) => g.favorite).sort((a, b) => (b.installed !== false) - (a.installed !== false) || byName(a, b)).slice(0, 14);
    if (favs.length) rows.push({ id: 'fav', title: 'Tus favoritos', items: favs.map((g) => G(g, g.lastPlayed ? fmtLast(g.lastPlayed) : 'Favorito', g.installed === false ? 'No instalado' : '')) });
    const top = list.filter((g) => g.playTime > 0).sort((a, b) => b.playTime - a.playTime).slice(0, 12);
    if (top.length >= 3) rows.push({ id: 'top', title: 'Los que más has jugado', items: top.map((g) => G(g, hrs(g), g.installed === false ? 'No instalado' : '')) });
    const fr = D.free ? [...(D.free.epic || []), ...(D.free.steam || []), ...(D.free.other || [])] : [];
    const st = (x) => x.store === 'epic' ? 'Epic Games' : x.store === 'steam' ? 'Steam' : (x.storeName || 'Tienda');
    fr.sort((a, b) => (a.status === 'soon') - (b.status === 'soon') || (!!a.owned - !!b.owned) || (a.end || 9e15) - (b.end || 9e15));
    if (fr.length) rows.push({ id: 'free', title: 'Gratis ahora', items: fr.slice(0, 14).map((x) => ({ kind: 'link', url: x.url, app: x.app, title: x.title, img: x.image ? [x.image] : [], badge: x.status === 'soon' ? 'PRÓXIMAMENTE' : 'GRATIS', tag: st(x), sub: x.owned ? '✓ Ya la tienes' : x.status === 'soon' ? (x.start ? 'Desde el ' + dayFmt(x.start) : 'Muy pronto') : x.end ? leftTxt(x.end) : 'Por tiempo limitado', done: !!x.owned })) });
    const now = Date.now(), evs = D.events && D.events.events ? D.events.events.filter((e) => (e.status === 'live' || (e.status === 'soon' && e.start < now + 45 * 86400000))).slice(0, 12) : [];
    if (evs.length) rows.push({ id: 'ev', title: 'Eventos y rebajas', items: evs.map((e) => ({ kind: 'event', store: e.store, url: e.url, title: e.name, img: [], tag: e.store === 'steam' ? 'Steam' : e.store === 'epic' ? 'Epic Games' : 'Tiendas', badge: e.status === 'live' ? 'EN CURSO' : 'PRÓXIMO', sub: e.status === 'live' ? leftTxt(e.end) : 'Empieza el ' + dayFmt(e.start) })) });
    const wl = D.wish ? [...(D.wish.steam || []), ...(D.wish.epic || [])].filter((x) => !x.owned && !x.soon && (x.free || x.discount > 0)).sort((a, b) => (b.free ? 100 : b.discount) - (a.free ? 100 : a.discount)).slice(0, 14) : [];
    if (wl.length) rows.push({ id: 'wish', title: 'En oferta de tu lista de deseados', items: wl.map((x) => ({ kind: 'link', url: x.url, app: x.app, title: x.title, img: x.image ? [x.image] : [], badge: x.free ? 'GRATIS' : '−' + x.discount + ' %', tag: st(x), sub: [x.price, x.orig && 'antes ' + x.orig].filter(Boolean).join(' · ') })) });
    const near = list.filter((g) => g.achievements && g.achievements.total > 0 && g.achievements.unlocked < g.achievements.total && g.achievements.unlocked / g.achievements.total >= 0.5).sort((a, b) => b.achievements.unlocked / b.achievements.total - a.achievements.unlocked / a.achievements.total).slice(0, 12);
    if (near.length) rows.push({ id: 'near', title: 'Casi completados', items: near.map((g) => G(g, `${g.achievements.unlocked}/${g.achievements.total} logros · ${Math.round(100 * g.achievements.unlocked / g.achievements.total)} %`, '')) });
    const oldT = Date.now() - 45 * 86400000;
    const old = list.filter((g) => g.playTime > 0 && (!g.lastPlayed || g.lastPlayed < oldT));
    const oldR = rotate(old, 14, 'old');
    if (old.length >= 2) rows.push({ id: 'old', title: 'Hace tiempo que no juegas', items: oldR.map((g) => G(g, g.lastPlayed ? fmtLast(g.lastPlayed) + ' · ' + hrs(g) : hrs(g), g.installed === false ? 'No instalado' : '')) });
    const best = list.filter((g) => g.info && g.info.metacritic >= 85);
    const bestR = rotate(best, 12, 'best');
    if (best.length >= 3) rows.push({ id: 'best', title: 'Los mejor valorados de tu biblioteca', items: bestR.map((g) => G(g, 'Metacritic ' + g.info.metacritic, g.installed === false ? 'No instalado' : '')) });
    const fresh = list.filter((g) => g.installed !== false && !g.lastPlayed && !(g.playTime > 0));
    const freshR = rotate(fresh, 12, 'new');
    if (fresh.length) rows.push({ id: 'new', title: 'Para estrenar', items: freshR.map((g) => G(g, 'Sin jugar', '')) });
    return rows;
  }
  const homeOk = new Map(); // imagen ya cargada: al repintar no vuelve a verse el color de relleno
  // Resplandor del color de la portada alrededor de la ficha enfocada (tema Steam): promedio ponderado por saturación de la miniatura
  const dkCol = new Map();
  function dkGlow(el, g) {
    if (cfg.ui !== 'deck' || !el || !g) return;
    const src = g.coverSm || g.cover || g.bannerSm || g.banner; if (!src) return;
    const tint = (col) => { try { const sc = el.closest('.cc-h-scroll'); if (sc && el.classList.contains('sel')) sc.style.setProperty('--dk-tint', col); } catch {} };
    if (dkCol.has(src)) { el.style.setProperty('--glow', dkCol.get(src)); tint(dkCol.get(src)); return; }
    if (el._glowBusy) return; el._glowBusy = true;
    Promise.resolve(window.api.getThumb(src)).then((u) => new Promise((ok) => { if (!u || typeof u !== 'string') return ok(null); const im = new Image(); im.onload = () => { try { const c = document.createElement('canvas'); c.width = c.height = 24; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, 24, 24); ok(x.getImageData(0, 0, 24, 24).data); } catch { ok(null); } }; im.onerror = () => ok(null); im.src = u; })).then((d) => {
      el._glowBusy = false; if (!d) return; let r = 0, g2 = 0, b = 0, w = 0;
      for (let i = 0; i < d.length; i += 4) { const R = d[i], G = d[i + 1], B = d[i + 2], mx = Math.max(R, G, B), mn = Math.min(R, G, B), sat = mx ? (mx - mn) / mx : 0, wt = 0.15 + sat * sat * (mx / 255); r += R * wt; g2 += G * wt; b += B * wt; w += wt; }
      if (!w) return; r /= w; g2 /= w; b /= w; const m = Math.max(r, g2, b) || 1, k = Math.min(1.6, 215 / m); const col = `rgba(${Math.min(255, Math.round(r * k))},${Math.min(255, Math.round(g2 * k))},${Math.min(255, Math.round(b * k))},.55)`;
      dkCol.set(src, col); el.style.setProperty('--glow', col); tint(col);
    }).catch(() => { el._glowBusy = false; });
  }
  function homeImg(div, c) {
    const urls = c.img || [], k = urls.length ? c.title + '|' + urls[0] : '', known = k && homeOk.get(k);
    if (known) { div.style.background = `url("${known}") center / cover no-repeat`; return; }
    div.style.background = colorFor(c.title);
    (function next(i) { if (i >= urls.length) return; const im = new Image(); im.onload = () => { if (k) homeOk.set(k, urls[i]); div.style.background = `url("${urls[i]}") center / cover no-repeat`; }; im.onerror = () => next(i + 1); im.src = urls[i]; })(0);
  }
  // ---- Inicio estilo Xbox 360: mosaico de losetas (verdes de acceso y de arte de juego) ----
  function x3Pick(list, i, dir) { // loseta vecina en esa dirección (por posición en pantalla)
    const a = list[i].el, acx = a.offsetLeft + a.offsetWidth / 2, acy = a.offsetTop + a.offsetHeight / 2; let best = -1, bs = 1e9;
    list.forEach((t, j) => {
      if (j === i) return; const e = t.el, dx = e.offsetLeft + e.offsetWidth / 2 - acx, dy = e.offsetTop + e.offsetHeight / 2 - acy;
      const ok = dir === 'right' ? dx > 4 : dir === 'left' ? dx < -4 : dir === 'down' ? dy > 4 : dy < -4; if (!ok) return;
      const sc = dir === 'left' || dir === 'right' ? Math.abs(dx) + 2.5 * Math.abs(dy) : Math.abs(dy) + 2.5 * Math.abs(dx); if (sc < bs) { bs = sc; best = j; }
    });
    return best;
  }
  function paintHomeX3(keep) {
    const h = $c('.cc-home'); if (!h) return;
    const prevKey = keep && HM.x3 && HM.x3[HM.x3i] ? HM.x3[HM.x3i].key : null;
    HM.rows = homeRows(); h.replaceChildren();
    const sc = el2('div', 'x3-home'); h.append(sc);
    const order = ['now', 'cont', 'free', 'top', 'near', 'ev', 'fav', 'wish', 'old', 'best', 'new'], seen = new Set(), cand = [];
    const per = []; // reparto por turnos: una de cada fila, luego la segunda de cada una… para que el mosaico sea variado
    HM.rows.forEach((row, ri) => per.push({ row, ri, pri: order.includes(row.id) ? order.indexOf(row.id) : 99 }));
    per.sort((x, y) => x.pri - y.pri);
    for (let round = 0; round < 6; round++) per.forEach(({ row, ri }) => { const off = row.id === 'cont' || row.id === 'now' ? 0 : (HM.rot || 0), c = row.items.length > round ? row.items[(round + off) % row.items.length] : null; if (!c) return; const key = c.g ? c.g.id : (c.url || c.title); if (seen.has(key)) return; seen.add(key); cand.push({ c, ri, ci: (round + off) % row.items.length, key, rid: row.id }); });
    const T = []; let k = 0; const nx = () => cand[k++];
    const art = (e, col, row, cs, rs) => { if (e) T.push({ art: e, key: e.key, col, row, cs: cs || 1, rs: rs || 1 }); };
    const CAT = { now: 'Jugando ahora', cont: 'Continuar', top: 'Más jugado', fav: 'Favorito', near: 'Casi completado', old: 'Vuelve a jugar', best: 'Mejor valorado', new: 'Para estrenar', free: 'Gratis', ev: 'Evento', wish: 'Oferta' };
    const fn = (tab, label, col, row) => { if (S.tabs.some((t) => t.id === tab)) T.push({ tab, key: 'tab:' + tab, label, col, row, cs: 1, rs: 1 }); };
    // distribución como el panel de la consola: columna estrecha | tarjeta destacada 2×2 + dos anchas | columna estrecha; cada «página» sigue el mismo patrón
    const nxImg = () => { const j = cand.findIndex((e, i) => i >= k && e.c.img && e.c.img.length); if (j < 0) return nx(); const [e] = cand.splice(j, 1); cand.splice(k, 0, e); return cand[k++]; };
    const fns = [['all', 'Biblioteca'], ['recent', 'Recientes'], ['fav', 'Favoritos'], ['search', 'Buscar'], ['settings', 'Ajustes']].filter(([id]) => S.tabs.some((t) => t.id === id)); let fi = 0;
    const fput = (c, r) => { if (fi < fns.length) { fn(fns[fi][0], fns[fi][1], c, r); fi++; } else art(nx(), c, r); };
    let pages = 0;
    for (let p = 0; p < 2; p++) {
      if (p >= 1 && k >= cand.length) break;
      const o = p * 4; pages++;
      if (p === 0) { art(nx(), o + 1, 1); fput(o + 1, 2); fput(o + 1, 3); }
      else { fput(o + 1, 1); fput(o + 1, 2); fput(o + 1, 3); }
      art(nxImg(), o + 2, 1, 2, 2); art(nx(), o + 2, 3); art(nx(), o + 3, 3);
      if (p === 0) { art(nx(), o + 4, 1); art(nx(), o + 4, 2); art(nx(), o + 4, 3); }
    }
    const NAR = 'calc(var(--r) * 1.3)', WID = 'calc(var(--r) * 1.73)';
    sc.style.gridTemplateColumns = [NAR, WID, WID, NAR, ...(pages > 1 ? [NAR, WID, WID] : [])].join(' ');
    if (!T.length) { sc.append(el2('div', 'cc-empty', HM.loading ? 'Cargando novedades…' : 'Aún no hay nada que mostrar.')); HM.x3 = []; return; }
    T.forEach((t, i) => {
      const d = el2('div', 'x3t ' + (t.tab ? 'fn' : 'art') + (t.cs > 1 ? ' big' : '')); d.style.gridColumn = `${t.col} / span ${t.cs}`; d.style.gridRow = `${t.row} / span ${t.rs}`;
      if (t.tab) { const ic = el2('div', 'x3t-ic'); ic.innerHTML = tabIcon(t.tab); d.append(ic, el2('div', 'x3t-lab', t.label)); }
      else {
        const c = t.art.c; const im = el2('div', 'x3t-img'); homeImg(im, c); d.append(im);
        const lab = el2('div', 'x3t-lab', c.kind === 'game' && i === 0 ? 'Jugar ' + c.title : c.title); d.append(lab);
        const cat = c.badge && /GRATIS|−|EN CURSO|PRÓXIMO/.test(c.badge) ? c.badge : (CAT[t.art.rid] || ''); if (cat) d.append(el2('span', 'x3t-badge', cat));
        if (c.kind === 'game') d.dataset.gid = c.g.id;
      }
      d.style.setProperty('--i', i);
      d.onmouseenter = () => { if (padActive()) return; if (HM.x3i !== i) { HM.x3i = i; x3HomeMark(false); } };
      d.onclick = () => { HM.x3i = i; x3HomeMark(false); homeAccept(); };
      t.el = d; sc.append(d);
    });
    HM.x3 = T; const pi = prevKey ? T.findIndex((t) => t.key === prevKey) : -1; HM.x3i = pi >= 0 ? pi : Math.min(HM.x3i || 0, T.length - 1);
    x3HomeMark(true);
  }
  function x3HomeMark(instant) {
    const T = HM.x3 || []; if (!T.length) return; T.forEach((t) => t.el.classList.remove('sel')); const t = T[HM.x3i]; if (!t) return; t.el.classList.add('sel');
    const sc = t.el.parentNode, l = t.el.offsetLeft, r = l + t.el.offsetWidth, vw = sc.clientWidth, beh = instant ? 'instant' : 'smooth';
    if (l < sc.scrollLeft + 8) sc.scrollTo({ left: Math.max(0, l - 24), behavior: beh }); else if (r > sc.scrollLeft + vw - 90) sc.scrollTo({ left: r - vw + 140, behavior: beh });
    if (t.art) { HM.r = t.art.ri; HM.c[t.art.ri] = t.art.ci; }
  }
  function x3HomeNav(dir) {
    const T = HM.x3 || []; if (!T.length) return;
    const j = x3Pick(T, HM.x3i, dir);
    if (j < 0) return;
    SND.move(); HM.x3i = j; x3HomeMark(false);
  }
  function deckHomeRows(rows) { // Big Picture: fila de juegos · pestañas Novedades/Amigos/Recomendados · contenido de la pestaña
    const fg = rows.findIndex((r) => r.items.some((c) => c.kind === 'game')); if (fg < 0) return rows;
    const first = rows[fg]; if (!first.items.some((c) => c.kind === 'more')) first.items.push({ kind: 'more', title: 'Ver más en la biblioteca', sub: '' });
    const rest = rows.filter((_, i) => i !== fg), tab = HM.tab || 0;
    const pills = { id: 'dkpills', title: '', items: ['Novedades', 'Amigos', 'Recomendados'].map((t) => ({ kind: 'pill', title: t })) };
    let body;
    if (tab === 0) body = rest.filter((r) => r.items.every((c) => c.kind !== 'game'));
    else if (tab === 1) body = [...dkFriendRows(), { id: 'dkact', title: 'Tu actividad reciente', items: first.items.filter((c) => c.kind === 'game') }];
    else body = [...rest.filter((r) => r.items.some((c) => c.kind === 'game')), { id: 'dkdisc', title: 'Explora tu lista de descubrimientos', items: [{ kind: 'more', title: 'Ver más en la biblioteca', sub: '' }] }];
    return [first, pills, ...body];
  }
  function paintHome(keep) {
    if (cfg.ui === 'x360') return paintHomeX3(keep);
    const h = $c('.cc-home'); if (!h) return;
    const prevId = keep && homeCard() ? (homeCard().g ? homeCard().g.id : homeCard().url || homeCard().title) : null, prevR = HM.rows[HM.r] && HM.rows[HM.r].id;
    HM.rows = homeRows(); h.replaceChildren();
    if (cfg.ui === 'deck') HM.rows = deckHomeRows(HM.rows);
    const sc = el2('div', 'cc-h-scroll' + (HM.tabAnim ? ' dk-rowin' : '')); h.append(sc); HM.tabAnim = false;
    if (cfg.ui === 'deck') sc.addEventListener('scroll', () => { const r = sc.querySelector('.dk-hpills'); const on = !!r && r.getBoundingClientRect().top <= sc.getBoundingClientRect().top + 3; sc.classList.toggle('dk-eng', on); box.classList.toggle('dk-engb', on); if (on) { const bh = r.getBoundingClientRect().bottom; sc.querySelectorAll('.cc-h-title').forEach((t) => { const rr = t.getBoundingClientRect(); t.classList.toggle('dk-tbh', rr.top < bh - 2); }); } else sc.querySelectorAll('.dk-tbh').forEach((t) => t.classList.remove('dk-tbh')); if (on) { const h = Math.round(r.getBoundingClientRect().bottom); if (h > 40 && box._bh !== h) { box._bh = h; box.style.setProperty('--dk-bandh', h + 'px'); } } }, { passive: true });
    if (!HM.rows.length) sc.append(el2('div', 'cc-empty', HM.loading ? 'Cargando novedades…' : HM.failed ? 'No se pudieron cargar las novedades. Revisa tu conexión.' : 'Aún no hay novedades que mostrar.'));
    const firstGame = cfg.ui === 'deck' ? HM.rows.findIndex((r) => r.items.some((c) => c.kind === 'game')) : -1;
    HM.rows.forEach((row, ri) => {
      if (cfg.ui === 'deck' && row.id === 'dkpills') { const pr = el2('div', 'cc-h-row dk-hpills'), ps = el2('div', 'cc-h-strip'); row.items.forEach((c, ci) => { const b = el2('div', 'cc-hc dk-hp' + (ci === (HM.tab || 0) ? ' on' : ''), c.title); if (ci === 1 && HM.fr && HM.fr.ok) { const n = (HM.fr.friends || []).filter((f) => f.state > 0 || f.game).length; if (n > 0) { const bd = el2('span', 'dk-fcnt'); bd.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="8" r="3.4"/><path d="M2.5 19c0-3.6 2.9-5.6 6.5-5.6s6.5 2 6.5 5.6z"/><circle cx="17" cy="9" r="2.7"/><path d="M16.4 13.6c3 0 5.1 1.7 5.1 4.8h-4.2c0-2-.4-3.3-.9-4.8z"/></svg>' + n; b.append(bd); } } b.onclick = () => { HM.r = ri; HM.c[ri] = ci; if (ci !== (HM.tab || 0)) { SND.tab(); HM.tab = ci; if (ci === 1) loadFriends(false); HM.tabAnim = true; paintHome(true); } }; ps.append(b); }); pr.append(el2('i', 'dk-bl'), el2('i', 'dk-bl'), el2('i', 'dk-bl'), el2('i', 'dk-bl t'), ps); sc.append(pr); return; }
      const dk = cfg.ui === 'deck', gameRow = dk && row.items.some((c) => c.kind === 'game');
      const r = el2('div', 'cc-h-row dk-r-' + row.id + (dk ? (gameRow ? ' dk-games' : ' dk-news') : '')); // Big Picture: juegos como portadas; novedades y ofertas como tarjetas con fecha y pie gris
      if (dk && !gameRow) r.append(el2('h2', 'cc-h-title dk-nt', row.title)); else r.append(el2('h2', 'cc-h-title', dk && row.id === 'cont' ? 'Jugados recientemente' : row.title));
      const strip = el2('div', 'cc-h-strip');
      row.items.forEach((c, ci) => {
        if (c.kind === 'more') { const m = el2('div', 'cc-hc dk-cov dk-more'); m.append(el2('div', 'dk-more-t', c.title)); m.onclick = () => { HM.r = ri; HM.c[ri] = ci; homeMark(); homeAccept(); }; strip.append(m); return; }
        const frd = dk && c.kind === 'friend', cov = dk && c.kind === 'game', nws = dk && !cov && !frd, hero = cov && ri === firstGame && ci === 0 && !!(c.g.bannerSm || c.g.banner);
        const d = el2('div', 'cc-hc' + (c.done ? ' done' : '') + (c.now ? ' now' : '') + (cov ? ' dk-cov' : '') + (hero ? ' dk-hero' : '') + (nws ? ' dk-new' : '') + (frd ? ' dk-fr' + (c.f && c.f.game ? ' play' : c.f && c.f.state > 0 ? ' on' : '') : '')), im = el2('div', 'cc-hc-img'); homeImg(im, cov ? { ...c, img: (hero ? [c.g.bannerSm, c.g.banner, c.g.bannerFallback, c.g.coverSm, c.g.cover] : [c.g.coverSm, c.g.cover, c.g.coverFallback, c.g.bannerSm, c.g.banner, c.g.bannerFallback]).filter(Boolean).map(imgUrl) } : c); if (c.kind === 'game') { d.dataset.gid = c.g.id; if (INST.prog[c.g.id]) setTimeout(() => instMark(d, c.g.id), 0); }
        if (c.kind === 'event') { im.classList.add('ev', 'ev-' + (c.store || 'all')); im.style.background = ''; const ic = el2('span', 'cc-hc-evic'); try { ic.append(sourceIcon(c.store === 'steam' ? 'steam' : c.store === 'epic' ? 'epic' : 'local', 64)); } catch {} im.append(ic); }
        if (c.kind === 'game' && cfg.ui !== 'x360') { const lg = c.g.logoSm || c.g.logo; if (lg && !c.g.logoOff) { const li = new Image(); li.className = 'cc-hc-logo'; li.alt = ''; li.draggable = false; li.onload = () => im.classList.add('has-logo'); li.onerror = () => li.remove(); li.src = imgUrl(lg); im.append(li); } }
        if (cov && HM.fr && HM.fr.ok && c.g.appid) { const nf = (HM.fr.friends || []).filter((f) => f.appid && f.appid === Number(c.g.appid)).length; if (nf > 0) im.append(el2('span', 'dk-frb', String(nf))); } // amigos jugando a este juego ahora
        if (c.badge) im.append(el2('span', 'cc-hc-badge' + (/GRATIS|−/.test(c.badge) ? ' hot' : ''), c.badge));
        if (c.tag) im.append(el2('span', 'cc-hc-tag', c.tag));
        const b = el2('div', 'cc-hc-body'); b.append(el2('div', 'cc-hc-name', c.title), el2('div', 'cc-hc-sub', c.sub || ''));
        if (nws && c.kind !== 'more' && c.kind !== 'info') { const pv = el2('div', 'dk-prev'); pv.append(el2('span', 'dk-pv-k', (c.tag || c.badge || 'Noticias').toUpperCase()), el2('p', 'dk-pv-t', c.sub || c.title)); im.append(pv); }
        if (nws) { const when = [c.badge, c.tag].filter(Boolean).join(' · '); d.append(el2('div', 'dk-when', when || ' '), im, b); } else d.append(im, b);
        d.onclick = () => { HM.r = ri; HM.c[ri] = ci; homeMark(); homeAccept(); };
        if (cfg.ui === 'deck') dkHov(d);
        strip.append(d);
      });
      r.style.setProperty('--i', ri); r.append(strip); sc.append(r);
    });
    if (HM.loading && HM.rows.length) sc.append(el2('div', 'cc-h-load', 'Buscando novedades…'));
    let ri = prevR ? HM.rows.findIndex((x) => x.id === prevR) : -1; HM.r = ri >= 0 ? ri : Math.min(HM.r, Math.max(0, HM.rows.length - 1));
    if (prevId) { const ci = HM.rows[HM.r] ? HM.rows[HM.r].items.findIndex((c) => (c.g ? c.g.id : c.url || c.title) === prevId) : -1; if (ci >= 0) HM.c[HM.r] = ci; }
    homeMark(true);
  }
  function dkGlide(el, to, instant) { // desplazamiento en «cinta»: la fila se desliza con frenado suave (≈ 0,38 s)
    if (el._gl) cancelAnimationFrame(el._gl);
    if (instant) { el.scrollLeft = to; return; }
    const from = el.scrollLeft, d = to - from; if (Math.abs(d) < 2) return; const t0 = performance.now(), T = 430;
    const step = (t) => { const k = Math.min(1, (t - t0) / T), e = 1 - Math.pow(1 - k, 4); el.scrollLeft = from + d * e; if (k < 1) el._gl = requestAnimationFrame(step); else el._gl = 0; };
    el._gl = requestAnimationFrame(step);
  }
  function homeMark(instant, hov) {
    if (cfg.ui === 'x360') return x3HomeMark(instant);
    const h = $c('.cc-home'), rows = h.querySelectorAll('.cc-h-row'); h.querySelectorAll('.cc-hc.sel').forEach((e) => e.classList.remove('sel'));
    const row = rows[HM.r]; if (!row) { setBg(null); return; }
    const c = Math.max(0, Math.min((HM.rows[HM.r].items.length || 1) - 1, HM.c[HM.r] || 0)); HM.c[HM.r] = c;
    const card = row.querySelectorAll('.cc-hc')[c]; if (!card) return; card.classList.add('sel'); { const _it = HM.rows[HM.r].items[c]; if (cfg.ui === 'deck' && _it && _it.g) dkGlow(card, _it.g); }
    const strip = row.querySelector('.cc-h-strip'), sc = h.querySelector('.cc-h-scroll'), beh = instant ? 'instant' : 'smooth';
    if (cfg.ui === 'deck') { const pi = HM.rows.findIndex((x) => x.id === 'dkpills'); sc.classList.toggle('dk-stuck', pi >= 0 && HM.r > pi); }
    if (hov) { /* ratón: solo se enfoca la tarjeta, la cinta no se mueve */ } else if (cfg.ui === 'deck') dkGlide(strip, Math.max(0, card.offsetLeft - strip.clientWidth * 0.36 - (card.offsetWidth ? 0 : 0)), instant); else strip.scrollTo({ left: Math.max(0, card.offsetLeft - (strip.clientWidth - card.offsetWidth) / 2), behavior: beh });
    if (!hov) {
      let off = sc.clientHeight * 0.12, extra = 0;
      if (cfg.ui === 'deck') { // con la banda de pestañas fija arriba, el título de la fila enfocada queda justo debajo de ella (sin taparlo)
        const pr = sc.querySelector('.dk-hpills'), pi = HM.rows.findIndex((x) => x.id === 'dkpills');
        if (row.classList.contains('dk-hpills')) extra = sc.clientHeight * 0.12 + 4;
        else if (pr && pi >= 0 && HM.r > pi) off = pr.offsetHeight + sc.clientHeight * 0.012;
      }
      sc.scrollTo({ top: Math.max(0, row.offsetTop - sc.offsetTop - off) + extra, behavior: beh });
    }
    const it = HM.rows[HM.r].items[c]; if (cfg.ui === 'deck') { const its = HM.rows[HM.r].items; for (const d of [1, -1, 2, -2, 3]) { const o = its[c + d]; if (o && o.g) preBg(o.g); } } if (cfg.ui === 'deck' && !it.g) { setBg(null); return; } setBg(it.g || (it.img && it.img[0] ? { id: 'home:' + it.title, banner: it.img[0] } : null));
  }
  function homeNav(dir) {
    if (cfg.ui === 'x360') return x3HomeNav(dir);
    if (!HM.rows.length) return;
    const cr = HM.rows[HM.r];
    if (cfg.ui === 'deck' && cr && cr.id === 'dkpills' && (dir === 'left' || dir === 'right')) { const n = Math.max(0, Math.min(2, (HM.tab || 0) + (dir === 'right' ? 1 : -1))); if (n === (HM.tab || 0)) return; SND.tab(); HM.tab = n; if (n === 1) loadFriends(false); HM.c[HM.r] = n; HM.tabAnim = true; paintHome(true); return; }
    if (dir === 'up' || dir === 'down') { const r = Math.max(0, Math.min(HM.rows.length - 1, HM.r + (dir === 'down' ? 1 : -1))); if (r === HM.r) return; SND.movev(); HM.r = r; if (HM.rows[r].id === 'dkpills') HM.c[r] = HM.tab || 0; }
    else { const n = HM.rows[HM.r].items.length, c = Math.max(0, Math.min(n - 1, (HM.c[HM.r] || 0) + (dir === 'right' ? 1 : -1))); if (c === (HM.c[HM.r] || 0)) return; SND.move(); HM.c[HM.r] = c; }
    homeMark(false);
  }
  function homeAccept() {
    if (cfg.ui === 'x360') { const t = (HM.x3 || [])[HM.x3i]; if (!t) return; if (t.tab) { const ti = S.tabs.findIndex((x) => x.id === t.tab); if (ti >= 0) gotoTab(ti); return; } HM.r = t.art.ri; HM.c[t.art.ri] = t.art.ci; }
    const xt = cfg.ui === 'x360' && HM.x3 ? HM.x3[HM.x3i] : null, c = xt && xt.art ? xt.art.c : homeCard(); if (!c) return;
    if (c.kind === 'pill') return;
    if (c.kind === 'info') { SND.open(); toast(c.title); return; }
    if (c.kind === 'more') { SND.open(); deckGo('all'); return; } // en Xbox 360 se abre exactamente la tarjeta marcada
    if (c.kind === 'game') return openDetail(c.g.id);
    if (c.kind === 'friend') { SND.open(); if (c.f) dkFriendProfile(c.f); else if (c.url && window.api.friendsOpen) { window.api.friendsOpen(c.url); toast('Abriendo el perfil…'); } return; }
    SND.open();
    if (!c.url) { toast('Este evento no tiene página propia'); return; }
    if (c.kind === 'event') { if (window.api.eventsOpen) window.api.eventsOpen(c.url); } else if (window.api.freeOpen) window.api.freeOpen(c.url, c.app);
    toast('Abriendo en la tienda…');
  }

