// Iconos de la interfaz: trazos simples de 24x24 que usan currentColor, así toman el color del tema
// (variable --accent) y cambian solos al personalizar la interfaz.
const UI_ICONS = {
  gamepad: '<line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="13" r="1"/><circle cx="18" cy="11" r="1"/><path d="M17.3 5H6.7a4 4 0 0 0-3.9 3.2l-1.7 8A3 3 0 0 0 4 20c1 0 1.6-.6 2.2-1.4L8 16h8l1.8 2.6c.6.8 1.2 1.4 2.2 1.4a3 3 0 0 0 2.9-3.8l-1.7-8A4 4 0 0 0 17.3 5z"/>',
  star: '<path d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.4L12 17.4l-5.7 3 1.1-6.4L2.8 9.5l6.4-.9z"/>',
  starFill: '<path class="f" d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.4L12 17.4l-5.7 3 1.1-6.4L2.8 9.5l6.4-.9z"/>',
  chart: '<path d="M4 20V11M10 20V4M16 20v-6M22 20H2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 1.5-2.2-.5-1.2.3-2.3 1.6-2.3H17a4 4 0 0 0 4-4c0-5-4-9.5-9-9.5z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7" r="1"/><circle cx="15.5" cy="7.5" r="1"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  checkSquare: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 12.5l3 3 5-6"/>',
  download: '<path d="M12 3v12M7 10.5l5 5 5-5M4 20h16"/>',
  upload: '<path d="M12 15V3M7 7.5l5-5 5 5M4 20h16"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.5L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.5l1.7-2M20 20v-4.5h-4.5"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  folderOpen: '<path d="M3 18V6a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V10"/><path d="M3 18l2.4-7a2 2 0 0 1 1.9-1.4H21a1 1 0 0 1 1 1.3l-2.2 6.6A2 2 0 0 1 17.9 19H5a2 2 0 0 1-2-1z"/>',
  play: '<path class="f" d="M7 4.5v15l12-7.5z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  pencil: '<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19z"/><path d="M14.5 6.5l3 3"/>',
  file: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5"/>',
  rocket: '<path d="M12 3c3.5 1.5 6 5 6 9l-3 3H9l-3-3c0-4 2.5-7.5 6-9z"/><circle cx="12" cy="10" r="1.6"/><path d="M9 15l-2 5 4-2M15 15l2 5-4-2"/>',
  diamond: '<path d="M12 3l9 9-9 9-9-9z"/>',
  card: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M6 15l4-4 3 3 2-2 3 3"/>',
  image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="M3 17l5-4.5 4 3.5 3-2.5 6 4"/>',
  type: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
  undo: '<path d="M4 9h11a5 5 0 0 1 0 10H8M4 9l4-4M4 9l4 4"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevD: '<path d="M6 9l6 6 6-6"/>',
  chevR: '<path d="M9 6l6 6-6 6"/>',
  arrowLeft: '<path d="M20 12H4M10 6l-6 6 6 6"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.6" r=".7" class="f"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3.2 3.2 3.2 14.8 0 18M12 3c-3.2 3.2-3.2 14.8 0 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  cart: '<circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/><path d="M2 3h3l2.5 12h11l2-8H6"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  gem: '<path d="M6 4h12l3 5-9 11L3 9z"/><path d="M3 9h18M9 4L7 9l5 11 5-11-2-5"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  power: '<path d="M12 3v9M6.5 6.5a8 8 0 1 0 11 0"/>',
  monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  more: '<circle class="f" cx="5" cy="12" r="1.5"/><circle class="f" cx="12" cy="12" r="1.5"/><circle class="f" cx="19" cy="12" r="1.5"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M12 14v4M8 20h8"/>',
  settings: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  hdd: '<rect x="3" y="13" width="18" height="7" rx="2"/><path d="M3 13l2.6-7A2 2 0 0 1 7.5 4.700h9A2 2 0 0 1 18.400 6L21 13"/><circle class="f" cx="7" cy="16.500" r="1"/>',
  sort: '<path d="M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4"/>',
  filter: '<path d="M3 5h18l-7 8.500V19l-4 2v-7.500z"/>',
  dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1"/><circle cx="15.5" cy="8.5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="8.5" cy="15.5" r="1"/><circle cx="15.5" cy="15.5" r="1"/>',
  heart: '<path d="M12 20s-7-4.4-9.3-9A5 5 0 0112 6.5 5 5 0 0121.3 11C19 15.6 12 20 12 20z"/>',
  gift: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M12 8v13M5 13v8h14v-8M7.5 8a2.5 2.5 0 010-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 010 5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/>',
};
// <svg> del icono (cadena). Los nombres que no existen se devuelven como texto tal cual.
function iconSvg(name) {
  const body = UI_ICONS[name];
  return body ? `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>` : '';
}
function iconEl(name) {
  const s = document.createElement('span');
  s.className = 'ic-wrap';
  s.innerHTML = iconSvg(name);
  return s.firstChild || document.createTextNode('');
}
// Texto con iconos: «[[play]] Jugar» -> icono + texto
function rich(e, text) {
  e.textContent = '';
  String(text).split(/(\[\[\w+\]\])/).forEach((p) => {
    const m = /^\[\[(\w+)\]\]$/.exec(p);
    if (m && UI_ICONS[m[1]]) e.append(iconEl(m[1]));
    else if (p) e.append(document.createTextNode(p));
  });
  return e;
}
// En el HTML: <i data-ic="gamepad"></i> se sustituye por el icono
function hydrateIcons(root = document) {
  root.querySelectorAll('[data-ic]').forEach((e) => { e.replaceWith(iconEl(e.getAttribute('data-ic'))); });
}
hydrateIcons();
