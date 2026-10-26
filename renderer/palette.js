// Extracción de colores de una imagen (portada o banner) para que la página del juego se adapte.
// Son funciones puras: reciben los píxeles RGBA ya leídos y devuelven colores.

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rgb;
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  return rgb.map((v) => Math.round((v + m) * 255));
}

function toHex(r, g, b) {
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hexToHue(hex) {
  return rgbToHsl(...hexToRgb(hex))[0];
}
function hueDiff(a, b) {
  const d = Math.abs(hexToHue(a) - hexToHue(b)) % 360;
  return d > 180 ? 360 - d : d;
}
function shiftHue(hex, deg) {
  const [h, s, l] = rgbToHsl(...hexToRgb(hex));
  return toHex(...hslToRgb((h + deg + 360) % 360, s, l));
}

// Ajusta un color para que se vea bien como acento sobre fondos oscuros o claros
function normalizeAccent(r, g, b) {
  let [h, s, l] = rgbToHsl(r, g, b);
  s = Math.max(0.55, Math.min(0.95, s));
  l = Math.max(0.52, Math.min(0.68, l));
  return toHex(...hslToRgb(h, s, l));
}

// px: píxeles RGBA (como los da canvas.getImageData). Devuelve:
//   colors: hasta 3 colores vivos y distintos entre sí, del más al menos dominante
//   avg:    color medio de toda la imagen (sirve para teñir el fondo)
function computePalette(px, w, h) {
  const B = 12; // cubos de 30° de tono
  const mk = () => Array.from({ length: B }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
  const buckets = mk(), soft = mk(); // soft: segunda pasada más permisiva para imágenes oscuras o apagadas
  let totalS = 0;
  let sr = 0, sg = 0, sb = 0, n = 0, totalW = 0;

  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    if (px[o + 3] < 128) continue; // transparente
    const r = px[o], g = px[o + 1], b = px[o + 2];
    sr += r; sg += g; sb += b; n++;

    const [hue, s, l] = rgbToHsl(r, g, b);
    if (l >= 0.05 && l <= 0.93 && s >= 0.14) {
      const ws = (s + 0.1) * (1 - Math.abs(2 * l - 1)) + 0.02, ks = Math.floor(hue / 30) % B;
      soft[ks].w += ws; soft[ks].r += r * ws; soft[ks].g += g * ws; soft[ks].b += b * ws; totalS += ws;
    }
    if (l < 0.14 || l > 0.9 || s < 0.25) continue; // ignora negros, blancos y grises
    const wt = s * (1 - Math.abs(2 * l - 1));       // cuanto más vivo, más pesa
    const k = Math.floor(hue / 30) % B;
    buckets[k].w += wt;
    buckets[k].r += r * wt; buckets[k].g += g * wt; buckets[k].b += b * wt;
    totalW += wt;
  }
  if (!n) return { colors: [], avg: null };
  const avg = toHex(Math.round(sr / n), Math.round(sg / n), Math.round(sb / n));
  let use = buckets, tw = totalW;
  if (totalW < n * 0.02) { // sin colores vivos: se intenta con los apagados/oscuros
    if (totalS < n * 0.02) return { colors: [], avg }; // imagen casi sin color (blanco y negro)
    use = soft; tw = totalS;
  }

  const colors = [];
  const ranked = use.filter((b) => b.w >= tw * 0.06).sort((a, b) => b.w - a.w);
  for (const b of ranked) {
    const c = normalizeAccent(Math.round(b.r / b.w), Math.round(b.g / b.w), Math.round(b.b / b.w));
    if (colors.every((x) => hueDiff(x, c) >= 35)) colors.push(c); // evita dos tonos casi iguales
    if (colors.length === 3) break;
  }
  return { colors, avg };
}

// Une la paleta del banner y la de la portada en dos acentos (principal y secundario)
function combinePalettes(banner, cover) {
  const avg = (banner && banner.avg) || (cover && cover.avg) || null;
  const colors = [...((banner && banner.colors) || []), ...((cover && cover.colors) || [])];
  if (!colors.length) return { colors: [], avg };
  const first = colors[0];
  const second = colors.slice(1).find((c) => hueDiff(c, first) >= 40) || shiftHue(first, 28);
  return { colors: [first, second], avg };
}

if (typeof module !== 'undefined') {
  module.exports = { computePalette, combinePalettes, hueDiff, hexToHue, rgbToHsl };
}
