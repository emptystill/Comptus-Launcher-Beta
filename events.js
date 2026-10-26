// Calendario de eventos y rebajas (Steam / Epic): se lee de events.json (incluido) y, si existe, de una copia en internet
// que se puede actualizar sin publicar una versión nueva. Todo son funciones sencillas para poder probarlas.
const STORES = ['steam', 'epic', 'all'];
const KINDS = ['sale', 'fest', 'free', 'other'];

function clean(list) {
  const out = [];
  for (const e of Array.isArray(list) ? list : []) {
    if (!e || typeof e.id !== 'string' || typeof e.name !== 'string') continue;
    const s = Date.parse(e.start), f = Date.parse(e.end);
    if (!Number.isFinite(s) || !Number.isFinite(f) || f <= s) continue;
    const url = typeof e.url === 'string' && /^https:\/\/(store\.steampowered\.com|store\.epicgames\.com)\//.test(e.url) ? e.url : null;
    out.push({ id: e.id.slice(0, 80), name: e.name.slice(0, 120), store: STORES.includes(e.store) ? e.store : 'all', kind: KINDS.includes(e.kind) ? e.kind : 'other', start: s, end: f, url, desc: typeof e.desc === 'string' ? e.desc.slice(0, 300) : '' });
  }
  return out;
}
// La copia de internet gana sobre la incluida cuando comparten id; se descartan los que terminaron hace más de 3 días
function merge(bundled, remote, now = Date.now()) {
  const m = new Map();
  for (const e of [...clean(bundled), ...clean(remote)]) m.set(e.id, e);
  return [...m.values()].filter((e) => e.end > now - 3 * 86400000).sort((a, b) => a.start - b.start);
}
const status = (e, now = Date.now()) => (e.start <= now && now < e.end ? 'live' : e.start > now ? 'soon' : 'ended');

// Avisos pendientes: «mañana empieza» (24 h antes) y «ya empezó»; devuelve { key, kind, event }
function dueNotices(events, seen, now = Date.now()) {
  const s = seen instanceof Set ? seen : new Set(seen || []);
  const out = [];
  for (const e of events) {
    const st = status(e, now);
    const kPre = `${e.id}|pre`, kStart = `${e.id}|start`;
    if (st === 'soon' && e.start - now <= 24 * 3600000 && !s.has(kPre)) out.push({ key: kPre, type: 'pre', event: e });
    if (st === 'live' && now - e.start <= 24 * 3600000 && !s.has(kStart)) out.push({ key: kStart, type: 'start', event: e });
  }
  return out;
}
function noticeText(n) {
  const e = n.event;
  return n.type === 'pre' ? { title: 'Mañana empieza: ' + e.name, body: e.desc || 'Prepárate para las ofertas.' } : { title: 'Ya empezó: ' + e.name, body: e.desc || 'Ya puedes aprovechar las ofertas.' };
}
module.exports = { clean, merge, status, dueNotices, noticeText };
