// Modo escritorio: funciones traídas del modo consola que sí tienen sentido en el escritorio
//  · Jugando ahora (barra superior)  · Avisos (campana)  · Volumen y energía
(function (root) {
  const ICONS = {
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 21h4"/>',
    volume: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5zM15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"/>',
  };
  Object.keys(ICONS).forEach((k) => { if (!UI_ICONS[k]) UI_ICONS[k] = ICONS[k]; });
  const $ = (s) => document.querySelector(s);

  // ---------- Avisos (historial en la app) ----------
  const KEY = 'comptus.notes', KSEEN = 'comptus.notes.seen';
  let notes = []; try { notes = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch {}
  if (!Array.isArray(notes)) notes = [];
  let seenAt = 0; try { seenAt = +localStorage.getItem(KSEEN) || 0; } catch {}
  const saveNotes = () => { try { localStorage.setItem(KEY, JSON.stringify(notes.slice(0, 30))); } catch {} };
  let bell = null, badge = null;
  function paintBell() {
    if (!badge) return; const n = notes.filter((x) => x.at > seenAt).length;
    badge.textContent = n > 9 ? '9+' : String(n); badge.classList.toggle('hidden', !n);
  }
  function note(n) {
    if (!n || !n.title) return;
    notes.unshift({ kind: n.kind || 'info', title: n.title, body: n.body || '', open: n.open || '', at: Date.now() }); notes.length = Math.min(notes.length, 30);
    saveNotes(); paintBell();
  }
  const ago = (t) => { const m = Math.floor((Date.now() - t) / 60000); return m < 1 ? 'ahora' : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.floor(m / 60)} h` : `hace ${Math.floor(m / 1440)} d`; };
  const NIC = { wish: '🏷', events: '🎉', free: '🎁', inst: '✅', uninst: '🗑' };
  function openNote(n) {
    const f = { wish: 'wish', events: 'events', free: 'free' }[n.kind] || (/^open:/.test(n.open || '') ? n.open.slice(5) : '');
    if (f) { state.filter = f; state.detailId = null; render(); }
  }
  function bellMenu() {
    seenAt = Date.now(); try { localStorage.setItem(KSEEN, String(seenAt)); } catch {} paintBell();
    const items = notes.length
      ? [...notes.slice(0, 14).map((n) => ({ icon: NIC[n.kind] || '🔔', label: `${n.title}${n.body ? ' — ' + n.body : ''}  ·  ${ago(n.at)}`, run: () => openNote(n) })), { sep: true }, { icon: 'trash', label: 'Borrar avisos', run: () => { notes = []; saveNotes(); paintBell(); } }]
      : [{ icon: '🔔', label: 'No hay avisos por ahora', run: () => {} }];
    showMenu(bell, items);
  }
  try { if (window.api.onAppNotice) window.api.onAppNotice((n) => note(n)); } catch {}

  // ---------- Volumen y energía ----------
  function powerMenu() {
    const say = (m) => toast(m);
    const vol = (dir, n, m) => { try { Promise.resolve(window.api.systemVolume(dir, n)).then((r) => { if (r && r.ok === false) say('El volumen del equipo solo se puede cambiar en Windows'); }); } catch {} say(m); };
    const sure = (action, txt) => { if (confirm(txt)) { say('Un momento…'); try { Promise.resolve(window.api.systemPower(action)).then((r) => { if (r && r.ok === false) say('Esto solo funciona en Windows'); }); } catch {} } };
    const row = el('div', 'pm-vol');
    const b = (ic, tip, fn) => { const x = el('button', 'pm-b'); x.type = 'button'; x.title = tip; x.append(iconEl(ic)); x.onclick = (e) => { e.stopPropagation(); fn(); }; return x; };
    row.append(el('span', 'pm-t', 'Volumen'), b('minus', 'Bajar', () => vol('down', 4, 'Volumen −')), b('volume', 'Silenciar / activar', () => vol('mute', 1, 'Sonido silenciado / activado')), b('plus', 'Subir', () => vol('up', 4, 'Volumen +')));
    showMenu(root.__pwrBtn, [
      { node: row }, { sep: true },
      { icon: 'monitor', label: 'Bloquear', run: () => { try { window.api.systemPower('lock'); } catch {} } },
      { icon: 'clock', label: 'Suspender', run: () => sure('sleep', '¿Suspender el equipo?') },
      { icon: 'refresh', label: 'Reiniciar…', run: () => sure('restart', '¿Reiniciar el equipo ahora?') },
      { icon: 'power', label: 'Apagar…', run: () => sure('shutdown', '¿Apagar el equipo ahora?') },
    ]);
  }

  // ---------- Jugando ahora ----------
  let pill = null, play = null, armT = null, armed = false;
  const clock = (ms) => { const m = Math.floor(ms / 60000); return m < 1 ? '<1 min' : m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min'; };
  function paintPill() {
    if (!pill) return;
    const rg = runState ? state.games.find((g) => runStateFor(g)) : null;
    if (!rg) { pill.classList.add('hidden'); play = null; return; }
    if (!play || play.id !== rg.id) play = { id: rg.id, t: Date.now() };
    const rs = runStateFor(rg);
    pill.classList.remove('hidden');
    pill.querySelector('.np-n').textContent = rg.name;
    pill.querySelector('.np-s').textContent = !rs || rs.state === 'starting' ? 'Iniciando…' : rs.state === 'stopping' ? 'Cerrando…' : 'Jugando · ' + clock(Date.now() - play.t);
    const im = pill.querySelector('.np-i'), u = rg.coverSm || rg.cover || rg.coverFallback; if (im.dataset.u !== String(u)) { im.dataset.u = String(u); im.style.background = u ? `url("${imgUrl(u)}") center / cover` : colorFor(rg.name); }
    const x = pill.querySelector('.np-x'); x.disabled = !!rs && rs.state === 'stopping'; x.classList.toggle('arm', armed); x.textContent = armed ? '¿Cerrar?' : ''; if (!armed) x.append(iconEl('x'));
    pill.dataset.id = rg.id;
  }
  function onRun() { paintPill(); }
  setInterval(paintPill, 30000);

  // ---------- Montaje en la interfaz ----------
  function mount() {
    const tb = document.querySelector('.toolbar'), couchBtn = $('#couchBtn'); if (!tb || !couchBtn) return;
    // Jugando ahora (a la derecha de la búsqueda)
    pill = el('div', 'now-pill hidden'); pill.id = 'nowPill';
    const im = el('div', 'np-i'), tx = el('div', 'np-t'); tx.append(el('div', 'np-n'), el('div', 'np-s'));
    const x = el('button', 'np-x'); x.type = 'button'; x.title = 'Cerrar el juego';
    pill.append(im, tx, x);
    pill.onclick = (e) => { if (e.target.closest('.np-x')) return; if (pill.dataset.id) openDetail(pill.dataset.id); };
    x.onclick = () => {
      const g = state.games.find((q) => q.id === pill.dataset.id); if (!g) return;
      if (armed) { armed = false; clearTimeout(armT); paintPill(); stopGame(g); return; }
      armed = true; paintPill(); clearTimeout(armT); armT = setTimeout(() => { armed = false; paintPill(); }, 3500);
    };
    const cfg = $('#openTheme'); if (cfg) cfg.before(pill); else tb.prepend(pill); // en la barra lateral, justo encima de «Configuración»
    mountMusic(pill);
    // Campana de avisos y menú de energía (antes del botón de modo consola)
    bell = el('button', 'icon-btn'); bell.id = 'bellBtn'; bell.type = 'button'; bell.title = 'Avisos'; bell.append(iconEl('bell'));
    badge = el('span', 'fbadge hidden'); bell.append(badge); bell.onclick = bellMenu;
    const pw = el('button', 'icon-btn'); pw.id = 'powerBtn'; pw.type = 'button'; pw.title = 'Volumen y energía del equipo'; pw.append(iconEl('power')); pw.onclick = powerMenu; root.__pwrBtn = pw;
    couchBtn.before(bell, pw); paintBell();
    // Barra para cambiar el tamaño de las portadas: abajo a la derecha de la ventana
    const sz = $('#sizeQuick'); if (sz) { sz.classList.add('size-corner'); document.body.append(sz); }
    paintPill();
  }
  // ---------- Música (lo que suena en Windows) ----------
  let mp = null;
  function paintMusic(s) {
    if (!mp) return;
    mp.classList.toggle('hidden', !(s && s.has));
    if (!s || !s.has) return;
    mp.querySelector('.mp-n').textContent = s.title || 'Sin título';
    mp.querySelector('.mp-s').textContent = [s.artist, s.app].filter(Boolean).join(' · ');
    const im = mp.querySelector('.mp-i'), t = s.thumb ? `url("${s.thumb}")` : ''; if (im.dataset.t !== t) { im.dataset.t = t; im.style.backgroundImage = t; }
    const pb = mp.querySelector('.mp-play'); const want = s.playing ? 'pause' : 'play'; if (pb.dataset.k !== want) { pb.dataset.k = want; pb.replaceChildren(iconEl(want)); }
  }
  function mountMusic(before) {
    if (!window.api.mediaGet) return;
    mp = el('div', 'music-pill hidden'); mp.id = 'musicPill';
    const im = el('div', 'mp-i'), tx = el('div', 'mp-t'); tx.append(el('div', 'mp-n'), el('div', 'mp-s'));
    const bt = el('div', 'mp-b');
    for (const [k, ic, tt] of [['prev', 'skipPrev', 'Anterior'], ['toggle', 'pause', 'Pausa / reanudar'], ['next', 'skipNext', 'Siguiente']]) {
      const b = el('button'); b.type = 'button'; b.title = tt; b.append(iconEl(ic)); if (k === 'toggle') b.classList.add('mp-play'); b.onclick = () => window.api.mediaCmd(k); bt.append(b);
    }
    mp.append(im, tx, bt);
    before.before(mp);
    try { window.api.onMediaState(paintMusic); window.api.mediaGet().then(paintMusic).catch(() => {}); } catch {}
  }
  root.DeskPlus = { onRun, note };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})(window);
