// Estadísticas de juego: solo cálculo (sin interfaz). UMD: `module.exports` en Node, `window.Stats` en el navegador.
// games    = lista de la biblioteca (ya con los repetidos unidos: el principal trae el tiempo sumado en playTime y el suyo en ownPlayTime)
// sessions = [{ id, s: inicio en ms, m: minutos }] que Comptus apunta desde que se activó el registro
(function (root) {
  const DAY = 86400000;
  const own = (g) => (g.ownPlayTime != null ? g.ownPlayTime : (g.playTime || 0));

  function fmtTime(min) {
    min = Math.max(0, Math.round(min || 0));
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60), m = min % 60;
    if (h >= 100) return `${h.toLocaleString('es')} h`;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  function compute(games, sessions, opts) {
    const now = (opts && opts.now) || Date.now();
    const sess = Array.isArray(sessions) ? sessions.filter((x) => x && Number.isFinite(x.s) && Number.isFinite(x.m)) : [];
    const years = [...new Set(sess.map((x) => new Date(x.s).getFullYear()))];
    const thisYear = new Date(now).getFullYear();
    if (!years.includes(thisYear)) years.push(thisYear);
    years.sort((a, b) => b - a);
    const year = opts && opts.year && years.includes(opts.year) ? opts.year : thisYear;

    const all = games.filter((g) => !g.hidden);           // todas las fichas (cada tienda cuenta lo suyo)
    const main = all.filter((g) => !g.dupOf);             // una por juego
    const totalMin = all.reduce((t, g) => t + own(g), 0);
    const played = main.filter((g) => (g.playTime || 0) > 0).length;

    const top = main.filter((g) => (g.playTime || 0) > 0).sort((a, b) => b.playTime - a.playTime || String(a.name).localeCompare(String(b.name))).slice(0, 10)
      .map((g) => ({ id: g.id, name: g.name, min: g.playTime, source: g.source }));

    const srcMap = new Map();
    for (const g of all) { const m = own(g); if (m > 0) srcMap.set(g.source, (srcMap.get(g.source) || 0) + m); }
    const bySource = [...srcMap].map(([source, min]) => ({ source, min })).sort((a, b) => b.min - a.min);

    const status = {};
    for (const g of main) if (g.status) status[g.status] = (status[g.status] || 0) + 1;
    const backlog = main.filter((g) => g.installed !== false && !(g.playTime > 0) && g.status !== 'done' && g.status !== 'dropped').length;
    const finished = main.filter((g) => g.status === 'done').length;

    // Sesiones
    const inYear = sess.filter((x) => new Date(x.s).getFullYear() === year);
    const months = Array(12).fill(0);
    for (const x of inYear) months[new Date(x.s).getMonth()] += x.m;
    const yearMin = months.reduce((t, v) => t + v, 0);
    const days = [];
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) days.push({ t: today.getTime() - i * DAY, min: 0 });
    for (const x of sess) { const k = days.find((d) => x.s >= d.t && x.s < d.t + DAY); if (k) k.min += x.m; }
    const weekMin = days.slice(7).reduce((t, d) => t + d.min, 0);
    const gameName = new Map(games.map((g) => [g.id, g.name]));
    const longest = inYear.slice().sort((a, b) => b.m - a.m)[0] || null;
    const yearTop = new Map();
    for (const x of inYear) yearTop.set(x.id, (yearTop.get(x.id) || 0) + x.m);
    const topYear = [...yearTop].map(([id, min]) => ({ id, name: gameName.get(id) || id, min })).sort((a, b) => b.min - a.min).slice(0, 5);
    const gamesYear = yearTop.size;
    const firstSession = sess.length ? Math.min(...sess.map((x) => x.s)) : null;

    return { totals: { min: totalMin, library: main.length, played, backlog, finished, installed: main.filter((g) => g.installed !== false).length },
      top, bySource, status, years, year, months, yearMin, sessionsYear: inYear.length, gamesYear, avgSession: inYear.length ? Math.round(yearMin / inYear.length) : 0,
      days, weekMin, longest: longest ? { name: gameName.get(longest.id) || longest.id, min: longest.m, s: longest.s } : null, topYear, firstSession, hasSessions: sess.length > 0 };
  }

  const api = { compute, fmtTime };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Stats = api;
})(typeof window !== 'undefined' ? window : globalThis);
