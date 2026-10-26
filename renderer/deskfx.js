// Modo escritorio: animación mientras se instala un juego y destello al terminar de instalar / desinstalar.
// (El modo consola tiene la suya en couch.js; si está abierto, esta no hace nada.)
(function (root) {
  const D = { snap: null, prog: {}, fx: {}, pt: null, busy: false };
  const consoleOn = () => { try { return !!(root.Couch && root.Couch.active); } catch { return false; } };
  const mk = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

  function mark(card, id) {
    const p = D.prog[id]; let ov = card.querySelector(':scope > .dx-inst');
    if (!p) { if (ov) ov.remove(); card.classList.remove('dx-installing'); return; }
    if (!ov) { ov = mk('div', 'dx-inst'); ov.append(mk('span', 'dx-sp'), mk('span', 'dx-tx')); card.append(ov); }
    card.classList.add('dx-installing'); ov.classList.toggle('paused', !!p.paused);
    ov.querySelector('.dx-tx').textContent = p.fin ? 'Terminando…' : p.paused ? 'En pausa' : 'Instalando…';
  }
  function paintBtn() {
    const btn = document.getElementById('playBtn'), id = state.detailId; if (!btn) return;
    const p = id && D.prog[id];
    if (p) {
      const t = p.fin ? 'Terminando…' : p.paused ? 'En pausa' : 'Instalando…';
      if (btn.dataset.dxi !== t) { btn.dataset.dxi = t; btn.classList.add('dx-btn'); btn.disabled = true; btn.replaceChildren(mk('span', 'dx-sp'), document.createTextNode(' ' + t)); }
    } else if (btn.dataset.dxi) { delete btn.dataset.dxi; btn.classList.remove('dx-btn'); btn.disabled = false; try { if (typeof renderDetail === 'function' && state.detailId) renderDetail(); } catch {} }
  }
  function paint() {
    document.querySelectorAll('#grid .card[data-id]').forEach((c) => mark(c, c.dataset.id));
    paintBtn();
  }
  async function poll() {
    if (D.busy || document.hidden || consoleOn() || !root.api || !root.api.installsGet) return;
    D.busy = true;
    try {
      const list = await root.api.installsGet(); if (!Array.isArray(list)) return;
      const seen = new Set(list.map((x) => x.id)), before = JSON.stringify(D.prog);
      list.forEach((x) => { D.prog[x.id] = { paused: x.paused }; });
      Object.keys(D.prog).forEach((id) => { if (seen.has(id)) return; const p = D.prog[id]; if (!p.fin) p.fin = Date.now(); else if (Date.now() - p.fin > 12000) delete D.prog[id]; });
      if (JSON.stringify(D.prog) !== before) paint();
    } catch {} finally { D.busy = false; }
  }
  function flash(el, cls) { el.classList.remove('dx-in', 'dx-out'); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 1800); }
  function apply() {
    paint();
    Object.keys(D.fx).forEach((id) => {
      const cls = D.fx[id] === 'in' ? 'dx-in' : 'dx-out';
      document.querySelectorAll('#grid .card[data-id]').forEach((c) => { if (c.dataset.id === id) flash(c, cls); });
      const dt = document.getElementById('detail'); if (dt && !dt.classList.contains('hidden') && state.detailId === id) flash(dt, cls);
      delete D.fx[id];
    });
  }
  // Se llama cada vez que se vuelve a pintar la biblioteca: detecta qué juegos cambiaron de estado
  function onRender() {
    if (consoleOn()) { D.snap = null; return; }
    const now = new Map((state.games || []).map((g) => [g.id, g.installed !== false])), old = D.snap; D.snap = now;
    if (old) {
      const ch = []; now.forEach((v, id) => { if (old.has(id) && old.get(id) !== v) ch.push([id, v]); });
      if (ch.length && ch.length <= 3) ch.forEach(([id, v]) => {
        D.fx[id] = v ? 'in' : 'out'; delete D.prog[id];
        const g = state.games.find((x) => x.id === id);
        if (g && typeof toast === 'function') toast(v ? `✓ «${g.name}» instalado` : `«${g.name}» desinstalado`, 4500);
        if (g && root.DeskPlus) root.DeskPlus.note({ kind: v ? 'inst' : 'uninst', title: v ? `«${g.name}» instalado` : `«${g.name}» desinstalado`, body: v ? 'Ya puedes jugar' : 'Sigue en tu biblioteca', open: 'open:' + (v ? 'all' : 'all') });
      });
    }
    setTimeout(apply, 150);
  }
  let t = null; const later = () => { clearTimeout(t); t = setTimeout(paint, 60); };
  function start() {
    ['#grid', '#detail'].forEach((s) => { const e = document.querySelector(s); if (e) new MutationObserver(later).observe(e, { childList: true }); });
    D.pt = setInterval(poll, 3000); setTimeout(poll, 1500);
  }
  root.DeskFx = { onRender };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window);
