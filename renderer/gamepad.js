// Modo mando: navega por Comptus con un gamepad (Xbox, PlayStation, etc.).
//   Cruceta / palanca izquierda: mover el foco      A: abrir / pulsar      B: atrás / cerrar
//   X: jugar (o instalar)                            Y: menú del juego      LB / RB: sección anterior / siguiente
//   LT / RT o palanca derecha: desplazarse           Start: ajustes         Select: ¿Qué juego hoy?
// Solo actúa mientras la ventana de Comptus tiene el foco (al abrir un juego deja de responder).
(function (root) {
  const CAND = 'button, input:not([type=hidden]):not([type=color]):not([type=file]), select, textarea, a[href], [tabindex]:not([tabindex="-1"]), #grid .card, .coll-card, .coll-new';
  const DEAD = 0.5;           // zona muerta de las palancas
  const FIRST = 380, EVERY = 120; // repetición al mantener (ms)

  const q = (s, r) => (r || document).querySelector(s);
  const rectOf = (el) => el.getBoundingClientRect();

  function visible(el) {
    if (!el || !el.isConnected || !el.getClientRects().length) return false;
    if (el.closest('.hidden, [aria-hidden="true"], [inert]')) return false;
    if (el.disabled) return false;
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.pointerEvents !== 'none';
  }

  // La capa que está encima (menú, visor de imagen, ventana, panel de filtros) o todo el documento
  function layer() {
    const menu = q('.ctx-menu'); if (menu) return menu;
    const lb = q('.lightbox'); if (lb) return lb;
    const modals = [...document.querySelectorAll('.modal:not(.hidden)')];
    if (modals.length) return modals[modals.length - 1];
    const fs = q('#filterSide.open'); if (fs) return fs;
    return document.body;
  }

  function candidates(scope) {
    return [...scope.querySelectorAll(CAND)].filter((el) => {
      if (!visible(el)) return false;
      const card = el.closest('#grid .card, .cgame');
      if (card && card !== el) return false; // los botones internos de una tarjeta no se eligen
      return true;
    });
  }

  // Elemento más cercano en la dirección dada (dir: 'up' | 'down' | 'left' | 'right')
  function pick(cur, dir, cands) {
    const r = rectOf(cur), cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
    let best = null, bs = Infinity;
    for (const c of cands) {
      if (c === cur || cur.contains(c) || c.contains(cur)) continue;
      const b = rectOf(c), bx = (b.left + b.right) / 2, by = (b.top + b.bottom) / 2;
      const dx = bx - cx, dy = by - cy;
      let gap, off;
      if (dir === 'right') { if (dx <= 1) continue; gap = Math.max(0, b.left - r.right); off = Math.abs(dy); }
      else if (dir === 'left') { if (dx >= -1) continue; gap = Math.max(0, r.left - b.right); off = Math.abs(dy); }
      else if (dir === 'down') { if (dy <= 1) continue; gap = Math.max(0, b.top - r.bottom); off = Math.abs(dx); }
      else { if (dy >= -1) continue; gap = Math.max(0, r.top - b.bottom); off = Math.abs(dx); }
      const s = gap + off * 2 + (Math.abs(dx) + Math.abs(dy)) * 0.05;
      if (s < bs) { bs = s; best = c; }
    }
    return best;
  }

  function scroller(el) {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const o = getComputedStyle(n).overflowY;
      if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight + 2) return n;
    }
    return null;
  }

  let lastBase = null, lastId = null, active = false;
  const state = { enabled: true, prev: [], held: {}, hints: null };

  function setFocus(el) {
    if (!el) return;
    if (!el.hasAttribute('tabindex') && !/^(BUTTON|INPUT|SELECT|TEXTAREA|A)$/.test(el.tagName)) el.tabIndex = -1; // las tarjetas no son enfocables de serie
    el.focus({ preventScroll: true });
    try { if (el.closest && el.closest('#couch')) return; el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch {}
    if (layer() === document.body && !el.closest('#detail')) { lastBase = el; lastId = el.dataset ? (el.dataset.id || null) : null; } // al cerrar la ficha se vuelve a su tarjeta
  }

  // Asegura que el foco esté dentro de la capa visible; si no, lo lleva a un sitio sensato
  function ensureFocus() {
    const L = layer(), cur = document.activeElement;
    if (cur && cur !== document.body && L.contains(cur) && visible(cur)) return cur;
    let target = null;
    const det = q('#detail');
    if (L === document.body && det && visible(det)) target = q('#playBtn', det) || candidates(det)[0];
    else if (L === document.body) {
      const again = lastId && [...document.querySelectorAll('#grid .card')].find((c) => c.dataset.id === lastId); // la grilla se redibuja: se busca la misma tarjeta
      if (lastBase && visible(lastBase)) target = lastBase;
      else if (again && visible(again)) target = again;
      else target = candidates(q('#grid') || L)[0] || candidates(q('main') || L)[0] || candidates(L)[0];
    } else target = candidates(L)[0];
    setFocus(target);
    return target;
  }

  function move(dir) {
    const cur = ensureFocus(); if (!cur) return;
    if (cur.type === 'range' && (dir === 'left' || dir === 'right')) { // los deslizadores se ajustan en vez de mover el foco
      const step = Number(cur.step) || 1; cur.value = String(Number(cur.value) + (dir === 'right' ? step : -step));
      cur.dispatchEvent(new Event('input', { bubbles: true })); cur.dispatchEvent(new Event('change', { bubbles: true })); return;
    }
    const next = pick(cur, dir, candidates(layer()));
    if (next) setFocus(next);
  }

  function activate() {
    const cur = ensureFocus(); if (!cur) return;
    if (cur.tagName === 'SELECT') { try { cur.showPicker(); } catch { cur.click(); } return; }
    if (cur.tagName === 'INPUT' && /^(text|search|password|number|url|email)$/.test(cur.type)) { cur.focus(); cur.select && cur.select(); return; }
    cur.click();
  }

  function back() {
    const ev = { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true };
    (document.activeElement && document.activeElement !== document.body ? document.activeElement : document).dispatchEvent(new KeyboardEvent('keydown', ev));
    setTimeout(() => { if (active) ensureFocus(); }, 120); // tras cerrar algo, el foco vuelve a donde estabas
  }

  function playIt() {
    const cur = ensureFocus(); if (!cur) return;
    const card = cur.closest('#grid .card'), inDetail = cur.closest('#detail');
    const btn = (card && card.querySelector('.play')) || (inDetail && q('#playBtn')) || (cur.closest('.free-card, .wish-card') && cur.closest('.free-card, .wish-card').querySelector('button.primary'));
    if (btn) btn.click();
    else if (cur.closest('.cgame')) cur.click(); // en la lista lateral abre la ficha
  }

  function menu() {
    const cur = ensureFocus(); if (!cur) return;
    const r = rectOf(cur);
    cur.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: r.left + Math.min(40, r.width / 2), clientY: r.top + Math.min(40, r.height / 2) }));
  }

  function section(delta) {
    if (layer() !== document.body) return;
    const btns = [...document.querySelectorAll('#filters .filter')].filter(visible);
    if (!btns.length) return;
    let i = btns.findIndex((b) => b.classList.contains('active'));
    if (i < 0) i = 0;
    const next = btns[(i + delta + btns.length) % btns.length];
    next.click();
    lastBase = null;
    setTimeout(() => { if (layer() === document.body) { const c = candidates(q('#grid') || document.body)[0]; if (c) setFocus(c); else setFocus(next); } }, 220);
  }

  function scrollBy(dy) {
    const cur = document.activeElement && document.activeElement !== document.body ? document.activeElement : q('#grid');
    const s = scroller(cur) || scroller(q('#grid')) || scroller(q('#detail'));
    if (s) s.scrollTop += dy;
  }

  function paintPadHints() {
    if (!state.hints) return;
    state.hints.innerHTML = [['A', 'Abrir'], ['B', 'Atrás'], ['X', 'Jugar'], ['Y', 'Menú'], ['LB RB', 'Sección'], ['Start', 'Ajustes']].map(([k, t]) => `<span><i class="pk">${window.PadIcons ? PadIcons.html(k) : k}</i>${t}</span>`).join('');
  }
  if (window.PadIcons) PadIcons.onChange(paintPadHints);
  function setPadMode(on) {
    if (on === active) return;
    active = on;
    document.body.classList.toggle('pad-mode', on);
    if (window.Couch) Couch.hints(on ? 'pad' : 'kb');
    if (on && !state.hints) {
      const h = document.createElement('div'); h.id = 'padHints'; h.setAttribute('aria-hidden', 'true');
      document.body.append(h); state.hints = h; paintPadHints();
    }
  }

  const DIRS = { 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
  const go = (d) => { if (window.Couch && Couch.captures()) Couch.nav(d); else move(d); };
  function press(i) {
    setPadMode(true);
    if (i === 16) { if (window.Couch) Couch.toggle(); return; } // botón Guía: entra o sale del modo consola
    if (window.Couch && Couch.captures()) { Couch.btn(i); return; } // en modo consola lo lleva todo couch.js
    if (i === 0) activate(); else if (i === 1) back(); else if (i === 2) playIt(); else if (i === 3) menu();
    else if (i === 4) section(-1); else if (i === 5) section(1);
    else if (i === 9) { if (layer() === document.body) { const b = q('#openTheme'); if (b) b.click(); } else back(); }
    else if (i === 8) { if (layer() === document.body) { const b = q('#diceBtn'); if (b) b.click(); } }
    setTimeout(() => { if (active) ensureFocus(); }, 100); // si se abrió un menú o una ventana, el foco entra en ella
  }

  function poll(now) {
    if (!state.enabled || window.__padRecording || window.__overlayOpen || !document.hasFocus()) { state.prev = []; state.held = {}; return; }
    const pads = (navigator.getGamepads ? [...navigator.getGamepads()] : []).filter(Boolean);
    for (const gp of pads) {
      const key = gp.index, prev = state.prev[key] || { b: [], first: true };
      const b = gp.buttons.map((x) => !!(x && (x.pressed || x.value > 0.6)));
      const ax = gp.axes || [];
      const dirs = new Set();
      for (const k of [12, 13, 14, 15]) if (b[k]) dirs.add(DIRS[k]);
      if ((ax[0] || 0) < -DEAD) dirs.add('left'); if ((ax[0] || 0) > DEAD) dirs.add('right');
      if ((ax[1] || 0) < -DEAD) dirs.add('up'); if ((ax[1] || 0) > DEAD) dirs.add('down');
      if (!prev.first) {
        if (window.PadIcons && b.some((x, i) => x && !prev.b[i])) PadIcons.seen(gp.id); // el último mando usado decide los iconos
        for (let i = 0; i < b.length; i++) if (b[i] && !prev.b[i] && !DIRS[i] && i !== 6 && i !== 7) {
          if (i === 8 || i === 9) setTimeout(() => { const c = state.prev[key]; if (!(c && c.b[8] && c.b[9])) press(i); }, 150); // Select + Start juntos abren el overlay: no son «ajustes» ni «dado»
          else press(i);
        }
        for (const d of ['up', 'down', 'left', 'right']) {
          const h = state.held[d];
          if (dirs.has(d)) {
            if (!h) { state.held[d] = { t: now }; setPadMode(true); go(d); }
            else if (now - h.t > (h.rep ? EVERY : FIRST)) { h.t = now; h.rep = true; go(d); }
          } else delete state.held[d];
        }
        const sy = (b[7] ? 1 : 0) - (b[6] ? 1 : 0), ry = Math.abs(ax[3] || 0) > DEAD ? ax[3] : 0;
        if (sy || ry) { setPadMode(true); if (window.Couch && Couch.captures()) Couch.axis(sy || ry); else scrollBy(sy ? sy * 28 : ry * 28); }
      }
      state.prev[key] = { b, first: false };
    }
  }

  let raf = null;
  function loop(now) { try { poll(now); } catch {} raf = requestAnimationFrame(loop); }
  function start() { if (raf == null && state.enabled) raf = requestAnimationFrame(loop); }
  function stop() { if (raf != null) cancelAnimationFrame(raf); raf = null; state.prev = []; state.held = {}; setPadMode(false); }

  window.addEventListener('gamepadconnected', () => start());
  window.addEventListener('gamepaddisconnected', () => { if (!(navigator.getGamepads ? [...navigator.getGamepads()] : []).some(Boolean)) stop(); });
  // Con el ratón o el teclado se vuelve a la vista normal (sin anillo de foco ni ayuda de botones)
  window.addEventListener('mousemove', (e) => { if (e.isTrusted && (e.movementX || e.movementY)) setPadMode(false); }, true);
  window.addEventListener('keydown', (e) => { if (e.isTrusted) setPadMode(false); }, true);
  window.addEventListener('pointerdown', (e) => { if (e.isTrusted) setPadMode(false); }, true);
  // La grilla se vuelve a dibujar a menudo (filtros, cierre de la ficha…): si el foco se pierde, vuelve a la misma tarjeta
  document.addEventListener('DOMContentLoaded', () => {
    const grid = q('#grid'); if (!grid || !window.MutationObserver) return;
    let t = null;
    new MutationObserver(() => {
      if (!active) return;
      clearTimeout(t);
      t = setTimeout(() => { const a = document.activeElement; if (!a || a === document.body || !a.isConnected) ensureFocus(); }, 90);
    }).observe(grid, { childList: true });
  });
  if (navigator.getGamepads && [...navigator.getGamepads()].some(Boolean)) start();

  root.Pad = {
    setEnabled(on) { state.enabled = !!on; if (!on) stop(); else if (navigator.getGamepads && [...navigator.getGamepads()].some(Boolean)) start(); },
    pick, candidates, _poll: poll, _dbg: () => ({ lastId, active }), _ens: ensureFocus,
  };
})(window);
