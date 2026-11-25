// Temas de color con fondo incluido. Los fondos son dibujos vectoriales (SVG) generados aquí mismo:
// no hay archivos de imagen, no pesan y se ven nítidos a cualquier tamaño.
(function () {
  const W = 1600, H = 900;
  let seed = 1;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  const R = (a, b) => a + rnd() * (b - a);
  const svg = (inner, defs) => {
    const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice"><defs>${defs || ''}</defs>${inner}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
  };
  const lg = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`;
  const rg = (id, stops) => `<radialGradient id="${id}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('')}</radialGradient>`;
  const blur = (id, n) => `<filter id="${id}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${n}"/></filter>`;
  const stars = (n, s, color = '#fff', maxY = H) => { seed = s; let o = ''; for (let i = 0; i < n; i++) o += `<circle cx="${R(0, W).toFixed(0)}" cy="${R(0, maxY).toFixed(0)}" r="${R(0.4, 1.6).toFixed(1)}" fill="${color}" opacity="${R(0.25, 0.95).toFixed(2)}"/>`; return o; };
  const ridge = (baseY, amp, step, s, fill, op = 1) => { seed = s; let d = `M0 ${H}L0 ${baseY}`; for (let x = 0; x <= W + step; x += step) d += `L${x} ${(baseY - R(0, amp)).toFixed(0)}`; return `<path d="${d}L${W} ${H}Z" fill="${fill}" opacity="${op}"/>`; };
  const pines = (baseY, count, hMin, hMax, s, fill) => { seed = s; let o = ''; for (let i = 0; i < count; i++) { const x = R(-20, W + 20), h = R(hMin, hMax), w = h * 0.34; o += `<path d="M${x.toFixed(0)} ${baseY - h}L${(x + w).toFixed(0)} ${baseY}L${(x - w).toFixed(0)} ${baseY}Z" fill="${fill}"/>`; } return `<rect y="${baseY - 2}" width="${W}" height="${H}" fill="${fill}"/>` + o; };

  const ART = {
    aurora: () => svg(
      `<rect width="${W}" height="${H}" fill="url(#sky)"/>${stars(140, 11, '#dffcff', 520)}
       <g filter="url(#b1)"><path d="M-100 380C250 120 500 520 820 300S1350 80 1750 330L1750 150C1350 -60 1100 260 800 90S250 -40 -100 200Z" fill="#34d399" opacity=".55"/>
       <path d="M-100 480C300 280 560 600 900 420S1400 240 1750 470L1750 330C1380 150 1100 400 860 250S300 160 -100 330Z" fill="#22d3ee" opacity=".38"/>
       <path d="M200 300C500 120 800 420 1100 220S1500 120 1750 260L1750 120C1500 20 1150 80 900 -40L300 -40Z" fill="#8b5cf6" opacity=".4"/></g>
       ${ridge(760, 90, 80, 5, '#04100f')}${ridge(820, 60, 60, 9, '#020909')}`,
      lg('sky', [[0, '#050b18'], [1, '#0b2230']]) + blur('b1', 40)),
    synth: () => { let grid = ''; for (let i = -16; i <= 16; i++) grid += `<line x1="${800 + i * 60}" y1="560" x2="${800 + i * 260}" y2="${H}" stroke="#ff4fd8" stroke-width="1.6" opacity=".55"/>`; for (let j = 0; j < 12; j++) { const y = 560 + Math.pow(j / 11, 2.2) * 340; grid += `<line x1="0" y1="${y.toFixed(0)}" x2="${W}" y2="${y.toFixed(0)}" stroke="#ff4fd8" stroke-width="1.6" opacity=".5"/>`; }
      let bars = ''; for (let k = 0; k < 7; k++) bars += `<rect x="560" y="${360 + k * 24}" width="480" height="${3 + k * 1.6}" fill="#1a0933"/>`;
      return svg(`<rect width="${W}" height="560" fill="url(#sky)"/><rect y="560" width="${W}" height="340" fill="#12052a"/>${stars(70, 21, '#fff', 380)}<circle cx="800" cy="440" r="210" fill="url(#sun)"/>${bars}<rect y="548" width="${W}" height="12" fill="#ff3d81" opacity=".7" filter="url(#b2)"/>${grid}`,
        lg('sky', [[0, '#12052e'], [0.6, '#4a1068'], [1, '#ff3d81']]) + lg('sun', [[0, '#ffe66d'], [1, '#ff3d81']]) + blur('b2', 6)); },
    forest: () => svg(
      `<rect width="${W}" height="${H}" fill="url(#sky)"/>${stars(90, 31, '#e6fff4', 400)}<circle cx="1180" cy="190" r="70" fill="#e9fff2" opacity=".9"/><circle cx="1180" cy="190" r="170" fill="url(#moon)"/>
       ${ridge(620, 120, 100, 3, '#0a2a20', 0.9)}${pines(700, 70, 110, 220, 4, '#071d16')}<rect y="500" width="${W}" height="260" fill="url(#mist)"/>${pines(790, 60, 160, 320, 6, '#04120d')}${pines(900, 40, 200, 420, 8, '#020a07')}`,
      lg('sky', [[0, '#030c09'], [1, '#0f3a2c']]) + rg('moon', [[0, '#c9ffe4', 0.35], [1, '#c9ffe4', 0]]) + lg('mist', [[0, '#34d399', 0], [1, '#34d399', 0.12]])),
    ocean: () => { let waves = ''; const cols = ['#1d78a8', '#13597f', '#0b3e5e', '#062b45']; for (let i = 0; i < 4; i++) { const y = 380 + i * 120; let d = `M0 ${H}L0 ${y}`; for (let x = 0; x <= W; x += 40) d += `L${x} ${(y + Math.sin(x / (110 + i * 25) + i) * (22 + i * 6)).toFixed(0)}`; waves += `<path d="${d}L${W} ${H}Z" fill="${cols[i]}" opacity="${0.55 + i * 0.12}"/>`; }
      return svg(`<rect width="${W}" height="${H}" fill="url(#sky)"/><circle cx="1300" cy="250" r="120" fill="url(#sun)"/>${stars(60, 41, '#d6f4ff', 260)}${waves}`,
        lg('sky', [[0, '#031526'], [1, '#0d5b86']]) + rg('sun', [[0, '#bff0ff', 0.55], [1, '#bff0ff', 0]])); },
    cyber: () => { seed = 51; let city = '', win = ''; for (let i = 0; i < 38; i++) { const w = R(50, 130), h = R(180, 560), x = R(-20, W); city += `<rect x="${x.toFixed(0)}" y="${(H - h).toFixed(0)}" width="${w.toFixed(0)}" height="${h.toFixed(0)}" fill="#0a0a14" stroke="${i % 3 ? '#00e5ff' : '#ff2a8a'}" stroke-opacity=".5"/>`; for (let k = 0; k < 14; k++) win += `<rect x="${(x + R(6, w - 12)).toFixed(0)}" y="${(H - R(10, h - 10)).toFixed(0)}" width="6" height="8" fill="${rnd() > 0.5 ? '#fcee0a' : '#00e5ff'}" opacity="${R(0.3, 0.9).toFixed(2)}"/>`; }
      return svg(`<rect width="${W}" height="${H}" fill="url(#sky)"/><ellipse cx="400" cy="620" rx="520" ry="220" fill="#ff2a8a" opacity=".35" filter="url(#b3)"/><ellipse cx="1250" cy="560" rx="560" ry="200" fill="#00e5ff" opacity=".3" filter="url(#b3)"/>${city}${win}`,
        lg('sky', [[0, '#07070f'], [1, '#1c0b2e']]) + blur('b3', 60)); },
    sakura: () => { seed = 61; let petals = ''; for (let i = 0; i < 70; i++) { const x = R(0, W), y = R(0, H), s = R(8, 26); petals += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${s.toFixed(1)}" ry="${(s * 0.55).toFixed(1)}" transform="rotate(${R(0, 180).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})" fill="${rnd() > 0.5 ? '#ffb7d5' : '#ff8fbf'}" opacity="${R(0.25, 0.8).toFixed(2)}"${rnd() > 0.7 ? ' filter="url(#b4)"' : ''}/>`; }
      return svg(`<rect width="${W}" height="${H}" fill="url(#sky)"/><circle cx="260" cy="200" r="260" fill="#ff7eb6" opacity=".18" filter="url(#b5)"/><circle cx="1350" cy="700" r="320" fill="#a066ff" opacity=".18" filter="url(#b5)"/>${petals}`,
        lg('sky', [[0, '#1a0d1f'], [1, '#3b1a3d']]) + blur('b4', 3) + blur('b5', 70)); },
    volcano: () => { seed = 71; let embers = ''; for (let i = 0; i < 90; i++) embers += `<circle cx="${R(0, W).toFixed(0)}" cy="${R(120, 780).toFixed(0)}" r="${R(0.8, 2.6).toFixed(1)}" fill="${rnd() > 0.5 ? '#ffb347' : '#ff5a36'}" opacity="${R(0.3, 0.9).toFixed(2)}"/>`;
      return svg(`<rect width="${W}" height="${H}" fill="url(#sky)"/><ellipse cx="800" cy="860" rx="900" ry="360" fill="url(#glow)"/>${embers}<path d="M0 900L0 700L340 560L560 640L800 420L1040 640L1280 540L1600 700L1600 900Z" fill="#150403"/><path d="M800 420L740 560L800 520L860 580Z" fill="#ff5a36" opacity=".85" filter="url(#b6)"/>${ridge(840, 70, 90, 13, '#0a0202')}`,
        lg('sky', [[0, '#0d0202'], [1, '#3b0d05']]) + rg('glow', [[0, '#ff7a1a', 0.75], [1, '#ff7a1a', 0]]) + blur('b6', 10)); },
    galaxy: () => svg(
      `<rect width="${W}" height="${H}" fill="#04020d"/><g filter="url(#b7)"><ellipse cx="420" cy="300" rx="520" ry="200" fill="#5b3cff" opacity=".4" transform="rotate(-18 420 300)"/><ellipse cx="1150" cy="560" rx="620" ry="190" fill="#d946ef" opacity=".32" transform="rotate(14 1150 560)"/><ellipse cx="820" cy="420" rx="380" ry="120" fill="#22d3ee" opacity=".22" transform="rotate(-6 820 420)"/></g>${stars(380, 81, '#ffffff')}${stars(40, 82, '#bfe3ff')}`,
      blur('b7', 55)),
    ice: () => { let hex = ''; const r = 54, dx = r * 1.732, dy = r * 1.5; for (let row = 0; row < 14; row++) for (let col = 0; col < 16; col++) { const cx = col * dx + (row % 2 ? dx / 2 : 0), cy = row * dy; let p = ''; for (let a = 0; a < 6; a++) { const t = Math.PI / 3 * a + Math.PI / 6; p += `${(cx + r * 0.94 * Math.cos(t)).toFixed(0)},${(cy + r * 0.94 * Math.sin(t)).toFixed(0)} `; } hex += `<polygon points="${p}" fill="none" stroke="#9be7ff" stroke-opacity="${(0.06 + ((row * 7 + col * 3) % 5) * 0.025).toFixed(2)}"/>`; }
      return svg(`<rect width="${W}" height="${H}" fill="url(#sky)"/>${hex}<ellipse cx="1200" cy="200" rx="520" ry="260" fill="#8fe3ff" opacity=".22" filter="url(#b8)"/><path d="M0 900L180 640L300 800L520 560L700 820L900 700L1100 860L1300 640L1600 900Z" fill="#cdf3ff" opacity=".13"/>`,
        lg('sky', [[0, '#04121d'], [1, '#0f3a56']]) + blur('b8', 60)); },
    gold: () => { let l = ''; for (let i = -10; i < 30; i++) { l += `<line x1="${i * 90}" y1="0" x2="${i * 90 + 900}" y2="${H}" stroke="#d4a62a" stroke-opacity=".24"/><line x1="${i * 90 + 900}" y1="0" x2="${i * 90}" y2="${H}" stroke="#d4a62a" stroke-opacity=".24"/>`; }
      return svg(`<rect width="${W}" height="${H}" fill="#0a0805"/>${l}<ellipse cx="800" cy="380" rx="760" ry="420" fill="url(#g)"/><rect x="20" y="20" width="${W - 40}" height="${H - 40}" fill="none" stroke="#d4a62a" stroke-opacity=".3" stroke-width="2"/>`, rg('g', [[0, '#d4a62a', 0.32], [1, '#d4a62a', 0]])); },
    matrix: () => { seed = 91; let cols = ''; const ch = 'アイウエオカキクケコサシスセソ0123456789'; for (let c = 0; c < 62; c++) { const x = c * 26 + 6, len = Math.floor(R(8, 26)), top = R(-100, H - 260); let t = ''; for (let k = 0; k < len; k++) t += `<tspan x="${x}" dy="22" opacity="${(0.08 + (k / len) * 0.6).toFixed(2)}">${ch[Math.floor(rnd() * ch.length)]}</tspan>`; cols += `<text y="${top.toFixed(0)}" font-family="monospace" font-size="20" fill="#2bff6a">${t}</text>`; }
      return svg(`<rect width="${W}" height="${H}" fill="#010a03"/>${cols}<rect width="${W}" height="${H}" fill="url(#v)"/>`, rg('v', [[0.3, '#010a03', 0], [1, '#010a03', 0.85]])); },
    dawn: () => svg(
      `<rect width="${W}" height="${H}" fill="url(#sky)"/><circle cx="1180" cy="520" r="190" fill="#fff3d6" opacity=".9"/><circle cx="1180" cy="520" r="360" fill="url(#halo)"/><g filter="url(#b9)" fill="#fff" opacity=".7"><ellipse cx="320" cy="640" rx="360" ry="46"/><ellipse cx="700" cy="720" rx="420" ry="52"/><ellipse cx="1350" cy="760" rx="380" ry="44"/><ellipse cx="520" cy="300" rx="260" ry="34" opacity=".6"/></g>`,
      lg('sky', [[0, '#c3b1ff'], [0.55, '#ffb3c1'], [1, '#ffd7b5']]) + rg('halo', [[0, '#fff3d6', 0.6], [1, '#fff3d6', 0]]) + blur('b9', 14)),
    // ---- Inspirados en otros launchers: solo el ambiente (colores y formas); ningún logotipo ni marca ----
    // Steam: azul pizarra con rayos de luz diagonales y un brillo celeste arriba
    'l-steam': () => { let rays = ''; for (let i = 0; i < 9; i++) rays += `<path d="M${-200 + i * 230} 0L${-60 + i * 230} 0L${520 + i * 230} ${H}L${380 + i * 230} ${H}Z" fill="#66c0f4" opacity="${(0.025 + (i % 3) * 0.012).toFixed(3)}"/>`;
      return svg(`<rect width="${W}" height="${H}" fill="url(#sky)"/>${rays}<ellipse cx="1180" cy="-40" rx="760" ry="330" fill="url(#glow)"/><rect y="${H - 220}" width="${W}" height="220" fill="url(#floor)"/>`,
        lg('sky', [[0, '#1b2838'], [0.55, '#14202d'], [1, '#0e141c']]) + rg('glow', [[0, '#66c0f4', 0.3], [1, '#66c0f4', 0]]) + lg('floor', [[0, '#0e141c', 0], [1, '#0a0f15', 0.9]])); },
    // Epic: monocromo. Negro con planos angulosos en grises (como paneles de cristal inclinados) y una franja de luz vertical
    'l-epic': () => {
      const shards = [
        ['0,0 620,0 380,900 0,900', '#1b1b1f', 1], ['620,0 980,0 700,900 380,900', '#141417', 1], ['980,0 1600,0 1600,420 1180,900 700,900', '#18181c', 1],
        ['1180,900 1600,420 1600,900', '#202025', 1], ['520,0 560,0 330,900 290,900', '#ffffff', 0.05], ['1040,0 1052,0 760,900 748,900', '#ffffff', 0.08],
        ['1300,0 1420,0 1600,250 1600,330', '#ffffff', 0.03],
      ].map(([p, c, o]) => `<polygon points="${p}" fill="${c}" opacity="${o}"/>`).join('');
      return svg(`<rect width="${W}" height="${H}" fill="#0e0e11"/>${shards}<rect x="1010" y="0" width="70" height="${H}" fill="url(#beam)" filter="url(#be1)"/><rect width="${W}" height="${H}" fill="url(#vig)"/>`,
        lg('beam', [[0, '#ffffff', 0.18], [0.6, '#ffffff', 0.05], [1, '#ffffff', 0]]) + rg('vig', [[0.45, '#000000', 0], [1, '#000000', 0.55]]) + blur('be1', 22));
    },
    // Xbox: negro con anillos concéntricos y un resplandor verde
    'l-xbox': () => { let rings = ''; for (let i = 1; i <= 9; i++) rings += `<circle cx="1220" cy="450" r="${i * 95}" fill="none" stroke="#9bf00b" stroke-width="${i % 3 ? 1.2 : 2.4}" opacity="${(0.16 - i * 0.012).toFixed(3)}"/>`;
      return svg(`<rect width="${W}" height="${H}" fill="#0b0d0b"/><circle cx="1220" cy="450" r="520" fill="url(#g)"/>${rings}<ellipse cx="200" cy="${H}" rx="700" ry="240" fill="url(#g2)"/>`,
        rg('g', [[0, '#107c10', 0.5], [1, '#107c10', 0]]) + rg('g2', [[0, '#107c10', 0.22], [1, '#107c10', 0]])); },
    // GOG Galaxy: violeta profundo con nebulosas y estrellas
    'l-gog': () => svg(`<rect width="${W}" height="${H}" fill="url(#sky)"/><g filter="url(#bg1)"><ellipse cx="420" cy="260" rx="560" ry="220" fill="#7b3fe4" opacity=".42" transform="rotate(-14 420 260)"/><ellipse cx="1220" cy="640" rx="620" ry="230" fill="#e05ea8" opacity=".28" transform="rotate(10 1220 640)"/></g>${stars(260, 111, '#f3e9ff')}`,
      lg('sky', [[0, '#120a22'], [1, '#1d1033']]) + blur('bg1', 60)),
    // Ubisoft Connect: azul noche con un remolino de arcos azul y violeta
    'l-ubisoft': () => { let arcs = ''; for (let i = 0; i < 7; i++) { const r = 160 + i * 70; arcs += `<path d="M${800 - r} 450A${r} ${r} 0 1 1 ${800 + r * 0.7} ${450 + r * 0.7}" fill="none" stroke="${i % 2 ? '#8a5cff' : '#2f7bff'}" stroke-width="${10 - i}" stroke-linecap="round" opacity="${(0.42 - i * 0.045).toFixed(2)}" transform="rotate(${i * 24} 800 450)"/>`; }
      return svg(`<rect width="${W}" height="${H}" fill="url(#sky)"/><circle cx="800" cy="450" r="600" fill="url(#g)"/><g filter="url(#bu1)">${arcs}</g>${arcs}`,
        lg('sky', [[0, '#050a1c'], [1, '#0b1638']]) + rg('g', [[0, '#2f7bff', 0.28], [1, '#2f7bff', 0]]) + blur('bu1', 14)); },
    // EA app: grafito con franjas diagonales y un brillo rojo-naranja
    'l-ea': () => { let st = ''; for (let i = -6; i < 14; i++) st += `<path d="M${i * 160} ${H}L${i * 160 + 520} 0L${i * 160 + 560} 0L${i * 160 + 40} ${H}Z" fill="#ff4747" opacity="${(i % 4 === 0 ? 0.08 : 0.025).toFixed(3)}"/>`;
      return svg(`<rect width="${W}" height="${H}" fill="#0b0b10"/>${st}<ellipse cx="300" cy="${H - 60}" rx="760" ry="320" fill="url(#g)"/><ellipse cx="1400" cy="80" rx="520" ry="240" fill="url(#g2)"/>`,
        rg('g', [[0, '#ff4747', 0.32], [1, '#ff4747', 0]]) + rg('g2', [[0, '#ff8a3d', 0.18], [1, '#ff8a3d', 0]])); },
    // Battle.net: azul marino con horizonte brillante y chispas
    'l-battlenet': () => svg(`<rect width="${W}" height="${H}" fill="url(#sky)"/><ellipse cx="800" cy="${H + 40}" rx="1100" ry="380" fill="url(#hz)"/><rect y="${H - 190}" width="${W}" height="2" fill="#00c8ff" opacity=".45" filter="url(#bb1)"/>${stars(160, 121, '#9fdcff', H - 200)}${stars(30, 122, '#ffffff', H - 260)}`,
      lg('sky', [[0, '#070a12'], [1, '#0f1a2e']]) + rg('hz', [[0, '#148eff', 0.5], [1, '#148eff', 0]]) + blur('bb1', 4)),
    // Rockstar: casi negro con franjas amarillas en diagonal y un resplandor ámbar
    'l-rockstar': () => { let st = ''; for (let i = -8; i < 16; i++) st += `<rect x="${i * 120}" y="-200" width="${i % 5 === 0 ? 26 : 8}" height="${H + 400}" fill="#fcaf17" opacity="${i % 5 === 0 ? 0.12 : 0.035}" transform="rotate(28 ${i * 120} ${H / 2})"/>`;
      return svg(`<rect width="${W}" height="${H}" fill="#0c0a06"/>${st}<ellipse cx="1300" cy="${H - 80}" rx="720" ry="340" fill="url(#g)"/>`, rg('g', [[0, '#fcaf17', 0.22], [1, '#fcaf17', 0]])); },
  };

  // Temas inspirados en otros launchers (vienen con Comptus). Solo colores y ambiente: sin logotipos ni marcas.
  const LAUNCHER = [
    { id: 'l-steam',     name: 'Estilo Steam',       bg: '#171d25', panel: '#1b2838', text: '#c7d5e0', accent: '#66c0f4', accent2: '#1a9fff', art: 'l-steam',     dim: 30 },
    { id: 'l-epic',      name: 'Estilo Epic',        bg: '#101013', panel: '#202024', text: '#f5f5f5', accent: '#f2f2f2', accent2: '#8f8f96', art: 'l-epic',      dim: 25 },
    { id: 'l-xbox',      name: 'Estilo Xbox',        bg: '#0d0f0d', panel: '#1a1d1a', text: '#eef3ee', accent: '#45c11f', accent2: '#9bf00b', art: 'l-xbox',      dim: 28 },
    { id: 'l-gog',       name: 'Estilo GOG Galaxy',  bg: '#130c20', panel: '#21163a', text: '#efe8fb', accent: '#a26bf4', accent2: '#e05ea8', art: 'l-gog',       dim: 28 },
    { id: 'l-ubisoft',   name: 'Estilo Ubisoft',     bg: '#070c1e', panel: '#0f1838', text: '#e8eeff', accent: '#3b86ff', accent2: '#9a6bff', art: 'l-ubisoft',   dim: 28 },
    { id: 'l-ea',        name: 'Estilo EA app',      bg: '#0c0c11', panel: '#18181f', text: '#f3f3f7', accent: '#ff4b4b', accent2: '#ff8a3d', art: 'l-ea',        dim: 28 },
    { id: 'l-battlenet', name: 'Estilo Battle.net',  bg: '#090d15', panel: '#121a28', text: '#e6edf7', accent: '#1a92ff', accent2: '#00c8ff', art: 'l-battlenet', dim: 28 },
    { id: 'l-rockstar',  name: 'Estilo Rockstar',    bg: '#0d0b07', panel: '#1a160e', text: '#f6eedb', accent: '#fcaf17', accent2: '#ff7a00', art: 'l-rockstar',  dim: 25 },
  ];

  // dim = cuánto se oscurece el fondo con el color del tema (0-100)
  const THEMES = [
    { id: 'aurora',   name: 'Aurora boreal',  bg: '#071018', panel: '#0e1b26', text: '#e4f6f4', accent: '#34d399', accent2: '#8b5cf6', art: 'aurora', dim: 30 },
    { id: 'synth',    name: 'Synthwave',      bg: '#12052e', panel: '#1d0a40', text: '#fbe9ff', accent: '#ff4fd8', accent2: '#ffb347', art: 'synth',  dim: 28 },
    { id: 'forest',   name: 'Bosque nocturno', bg: '#050f0b', panel: '#0b1c15', text: '#e2f3ea', accent: '#4ade80', accent2: '#a3e635', art: 'forest', dim: 28 },
    { id: 'ocean',    name: 'Océano',         bg: '#041a2c', panel: '#082b44', text: '#e3f4ff', accent: '#38bdf8', accent2: '#2dd4bf', art: 'ocean',  dim: 30 },
    { id: 'cyber',    name: 'Ciudad cyber',   bg: '#09090f', panel: '#12121d', text: '#f2f2ff', accent: '#fcee0a', accent2: '#00e5ff', art: 'cyber',  dim: 32 },
    { id: 'sakura',   name: 'Sakura',         bg: '#1a0d1f', panel: '#2a1530', text: '#ffe9f3', accent: '#ff7eb6', accent2: '#c084fc', art: 'sakura', dim: 28 },
    { id: 'volcano',  name: 'Volcán',         bg: '#0d0302', panel: '#1c0806', text: '#ffeae2', accent: '#ff5a36', accent2: '#ffb347', art: 'volcano', dim: 30 },
    { id: 'galaxy',   name: 'Galaxia',        bg: '#05030f', panel: '#0f0a22', text: '#ece8ff', accent: '#a78bfa', accent2: '#22d3ee', art: 'galaxy', dim: 25 },
    { id: 'ice',      name: 'Hielo',          bg: '#05141f', panel: '#0a2535', text: '#e6f7ff', accent: '#7dd3fc', accent2: '#a5f3fc', art: 'ice',    dim: 20 },
    { id: 'gold',     name: 'Real dorado',    bg: '#0a0805', panel: '#17120a', text: '#f6ecd2', accent: '#e0b53a', accent2: '#f59e0b', art: 'gold',   dim: 18 },
    { id: 'matrix',   name: 'Terminal verde', bg: '#010a03', panel: '#04150a', text: '#c9ffd9', accent: '#2bff6a', accent2: '#00c853', art: 'matrix', dim: 35 },
    { id: 'dawn',     name: 'Amanecer',       bg: '#fff1e8', panel: '#ffffff', text: '#2a2030', accent: '#ff6b6b', accent2: '#a06cff', art: 'dawn',   dim: 55 },
  ];
  // Ilustraciones (pixel art y otras) incluidas en renderer/backgrounds. pixel = se muestran sin suavizar.
  const IMG = [
    { id: 'crimson',   name: 'Luna carmesí',        bg: '#1a0510', panel: '#2a0a1a', text: '#ffe6ea', accent: '#ff2d55', accent2: '#ff8a5c', dim: 40 },
    { id: 'autumn',    name: 'Ruinas de otoño',     bg: '#1a1f12', panel: '#262c1b', text: '#f3efdc', accent: '#e0a526', accent2: '#d9622b', dim: 45 },
    { id: 'retro-tree', name: 'Árbol retro',        bg: '#eef4cf', panel: '#fbffe6', text: '#243019', accent: '#5a9a3a', accent2: '#8cc152', dim: 50 },
    { id: 'moons',     name: 'Noche de lunas',      bg: '#120d10', panel: '#1d151a', text: '#f3e4e6', accent: '#e88a7a', accent2: '#b8567a', dim: 35 },
    { id: 'spiral',    name: 'Espiral galáctica',   bg: '#17101f', panel: '#231830', text: '#f0e8ff', accent: '#d946ef', accent2: '#f59e0b', dim: 38 },
    { id: 'meadow',    name: 'Prado sereno',        bg: '#0b1f12', panel: '#12301c', text: '#e8f6e4', accent: '#8adc42', accent2: '#22b8a8', dim: 42 },
    { id: 'lakecity',  name: 'Ciudad junto al lago', bg: '#0d0a2a', panel: '#171244', text: '#e8e6ff', accent: '#7c5cff', accent2: '#ff9a5c', dim: 38 },
    { id: 'bluestreet', name: 'Calle azul',         bg: '#0e1824', panel: '#162534', text: '#e4eefa', accent: '#5aa0e6', accent2: '#9a8cd9', dim: 45 },
    { id: 'duskforest', name: 'Bosque crepuscular', bg: '#120d14', panel: '#1d1522', text: '#f2e6ec', accent: '#f08a6c', accent2: '#b077e0', dim: 35 },
    { id: 'eclipse',   name: 'Eclipse rosado',      bg: '#2a1a33', panel: '#3a2547', text: '#fff0f4', accent: '#ff9a8b', accent2: '#7f8cf0', dim: 45 },
    { id: 'ramen',     name: 'Ramen neón',          bg: '#170d12', panel: '#251419', text: '#ffeede', accent: '#ff9f43', accent2: '#ff4fa3', dim: 42 },
    { id: 'rainycity', name: 'Ciudad lluviosa',     bg: '#0e1316', panel: '#172026', text: '#e6f0f2', accent: '#ff5c7a', accent2: '#36d6c0', dim: 42 },
    { id: 'studio',    name: 'Atardecer en el estudio', bg: '#1a0f24', panel: '#281638', text: '#fbe9f4', accent: '#ff6b9a', accent2: '#ffa45c', dim: 40 },
    { id: 'geometric', name: 'Verde geométrico',    bg: '#0c2a1a', panel: '#123a25', text: '#e6fff0', accent: '#48cc86', accent2: '#9be26d', dim: 45 },
    { id: 'pagoda',    name: 'Pagoda sakura',       bg: '#14121c', panel: '#1f1b2b', text: '#f2eef6', accent: '#ff5aa5', accent2: '#6bd0a0', dim: 42 },
    { id: 'obsidian',  name: 'Obsidiana roja',      bg: '#0a0508', panel: '#160a10', text: '#f4e6ea', accent: '#e11d48', accent2: '#ff6b6b', dim: 35 },
  ];
  const imgById = Object.fromEntries(IMG.map((t) => [t.id, t]));
  const cache = {};
  window.THEME_ART = {
    get: (id) => (imgById[id] ? `url("backgrounds/${id}.webp")` : ART[id] ? (cache[id] = cache[id] || ART[id]()) : ''),
    thumb: (id) => (imgById[id] ? `url("backgrounds/thumb/${id}.webp")` : window.THEME_ART.get(id)),
    pixel: (id) => !!(imgById[id] && imgById[id].pixel),
    ids: Object.keys(ART).concat(IMG.map((t) => t.id)),
  };
  window.ART_THEMES = THEMES;
  window.LAUNCHER_THEMES = LAUNCHER;
  window.IMG_THEMES = IMG.map((t) => ({ ...t, art: t.id }));
})();
