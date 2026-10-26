// Iconos de los botones del mando según su tipo (Xbox, PlayStation, Nintendo o genérico).
// El tipo se detecta del mando que se está usando y se puede fijar a mano en Ajustes del modo consola.
(() => {
  const TYPES = { xbox: 'Xbox', ps: 'PlayStation', nintendo: 'Nintendo', generic: 'Genérico' };
  const detect = (id) => {
    const s = String(id || '').toLowerCase();
    if (/dualshock|dualsense|playstation|ps[345]|054c|wireless controller/.test(s)) return 'ps';
    if (/pro controller|joy-?con|nintendo|switch|057e/.test(s)) return 'nintendo';
    if (/xbox|xinput|microsoft|045e|steam|28de/.test(s)) return 'xbox';
    return 'generic';
  };
  let pref = 'auto', seen = 'xbox', listeners = [];
  const cur = () => (TYPES[pref] ? pref : seen);
  const emit = () => listeners.forEach((f) => { try { f(cur()); } catch { /* nada */ } });
  // etiquetas por posición estándar del mando: 0 abajo, 1 derecha, 2 izquierda, 3 arriba
  const FACE = {
    xbox: [['A', 'pi-g'], ['B', 'pi-r'], ['X', 'pi-b'], ['Y', 'pi-y']],
    ps: [['✕', 'pi-pb'], ['○', 'pi-pr'], ['□', 'pi-pp'], ['△', 'pi-pg']],
    nintendo: [['B', 'pi-n'], ['A', 'pi-n'], ['Y', 'pi-n'], ['X', 'pi-n']],
    generic: [['A', 'pi-n'], ['B', 'pi-n'], ['X', 'pi-n'], ['Y', 'pi-n']],
  };
  const OTHER = {
    xbox: { LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT', Select: 'Ver', Start: 'Menú' },
    ps: { LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2', Select: 'Create', Start: 'Options' },
    nintendo: { LB: 'L', RB: 'R', LT: 'ZL', RT: 'ZR', Select: '−', Start: '+' },
    generic: { LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT', Select: 'Select', Start: 'Start' },
  };
  const IDX = { A: 0, B: 1, X: 2, Y: 3 };
  // imágenes originales (carpeta padicons/); el genérico usa fichas dibujadas
  const IMG = {
    xbox: { face: ['a', 'b', 'x', 'y'], LB: 'lb', RB: 'rb', LT: 'lt', RT: 'rt', Select: 'view', Start: 'menu', p: 'xb' },
    ps: { face: ['cross', 'circle', 'square', 'triangle'], LB: 'l1', RB: 'r1', LT: 'l2', RT: 'r2', Select: 'create', Start: 'options', p: 'ps' },
    nintendo: { face: ['b', 'a', 'y', 'x'], LB: 'l', RB: 'r', LT: 'zl', RT: 'zr', Select: 'minus', Start: 'plus', p: 'nin' },
  };
  // tamaño relativo (1 = botón redondo de la cara) para que todos queden proporcionados
  const K = { 'xb-lb': .66, 'xb-rb': .66, 'xb-lt': .96, 'xb-rt': .96, 'xb-menu': .74, 'xb-view': .74, 'nin-l': .8, 'nin-r': .8, 'nin-zl': .92, 'nin-zr': .92, 'nin-plus': .8, 'nin-minus': .8, 'ps-options': 1.05, 'ps-create': 1.05 };
  const FILE = (tok, type) => {
    const m = IMG[type]; if (!m) return null;
    const n = tok in IDX ? m.face[IDX[tok]] : m[tok];
    return n ? m.p + '-' + n : null;
  };
  const chip = (tok, type) => {
    type = type || cur();
    const f = FILE(tok, type);
    if (f) return `<img class="pg pg-${tok in IDX ? 'f' : 's'}" style="--k:${K[f] || 1}" src="padicons/${f}.png" alt="${tok}" draggable="false">`;
    if (tok in IDX) { const [t, c] = FACE[type][IDX[tok]]; return `<i class="pi ${c}">${t}</i>`; }
    return `<i class="pi pi-s">${(OTHER[type] || OTHER.generic)[tok] || tok}</i>`;
  };
  window.PadIcons = {
    TYPES, detect, cur,
    html: (str, type) => String(str).replace(/\b(LB|RB|LT|RT|Select|Start|A|B|X|Y)\b/g, (m) => chip(m, type)),
    chip,
    setPref(p) { p = TYPES[p] ? p : 'auto'; if (p !== pref) { pref = p; emit(); } },
    pref: () => pref,
    seen(id) { const t = detect(id); if (t !== seen) { seen = t; if (pref === 'auto') emit(); } },
    onChange(f) { listeners.push(f); },
  };
})();
