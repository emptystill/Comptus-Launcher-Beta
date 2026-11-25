// Perfil de Comptus: solo cálculo (sin interfaz). Reúne lo que Comptus sabe de ti: tiempo, logros, estados, colecciones,
// tiendas y sesiones, y lo convierte en un nivel, insignias y escaparates. UMD: `module.exports` en Node, `window.Profile` en el navegador.
// games      = biblioteca (con los repetidos unidos: el principal trae el tiempo sumado en playTime)
// sessions   = [{ id, s: inicio en ms, m: minutos }] que apunta Comptus
// ctx        = { collections: [{ id, name, games: [ids] }], now }
(function (root) {
  const DAY = 86400000;
  const own = (g) => (g.ownPlayTime != null ? g.ownPlayTime : (g.playTime || 0));
  const ach = (g) => (g.achievements && g.achievements.total ? g.achievements : null);
  const isPerfect = (g) => { const a = ach(g); return !!(a && a.unlocked >= a.total); };

  // Experiencia: lo que haces en Comptus suma. Nivel n necesita 50·n·(n+1) XP en total (cada nivel cuesta un poco más).
  const XP = { hour: 10, achievement: 5, perfect: 150, finished: 60, played: 15, collection: 20 };
  function levelFor(xp) {
    let n = Math.floor((-1 + Math.sqrt(1 + (8 * xp) / 100)) / 2);
    if (n < 0) n = 0;
    const cur = 50 * n * (n + 1), next = 50 * (n + 1) * (n + 2);
    return { level: n, xp, cur, next, pct: next > cur ? (xp - cur) / (next - cur) : 0 };
  }

  // Insignias por niveles (bronce → diamante). value = cuánto llevas; goals = lo que pide cada nivel.
  const TIERS = ['Bronce', 'Plata', 'Oro', 'Platino', 'Diamante'];
  const BADGES = [
    { id: 'hours',     name: 'Horas de juego',     icon: 'clock',    unit: 'h',          goals: [10, 100, 500, 1000, 2500] },
    { id: 'library',   name: 'Biblioteca',         icon: 'gamepad',  unit: 'juegos',     goals: [25, 100, 250, 500, 1000] },
    { id: 'explorer',  name: 'Explorador',         icon: 'target',   unit: 'jugados',    goals: [10, 50, 100, 250, 500] },
    { id: 'finished',  name: 'Lo terminé',         icon: 'flag',     unit: 'terminados', goals: [1, 10, 25, 50, 100] },
    { id: 'perfect',   name: 'Completista',        icon: 'trophy',   unit: 'al 100 %',   goals: [1, 5, 10, 25, 50] },
    { id: 'ach',       name: 'Cazador de logros',  icon: 'gem',      unit: 'logros',     goals: [50, 250, 1000, 2500, 5000] },
    { id: 'collector', name: 'Coleccionista',      icon: 'folder',   unit: 'colecciones', goals: [3, 10, 25, 50, 100] },
    { id: 'stores',    name: 'Multitienda',        icon: 'layers',   unit: 'tiendas',    goals: [2, 3, 4, 5, 6] },
    { id: 'marathon',  name: 'Maratón',            icon: 'flame',    unit: 'h seguidas', goals: [2, 4, 6, 8, 12] },
    { id: 'night',     name: 'Noctámbulo',         icon: 'moon',     unit: 'sesiones de madrugada', goals: [5, 25, 100, 250, 500] },
  ];
  function badge(def, value) {
    let tier = -1;
    def.goals.forEach((g, i) => { if (value >= g) tier = i; });
    const nextGoal = def.goals[tier + 1];
    const prevGoal = tier >= 0 ? def.goals[tier] : 0;
    return { ...def, value, tier, tierName: tier >= 0 ? TIERS[tier] : '', earned: tier >= 0, max: tier === def.goals.length - 1,
      nextGoal: nextGoal || null, pct: nextGoal ? Math.max(0, Math.min(1, (value - prevGoal) / (nextGoal - prevGoal))) : 1 };
  }

  function compute(games, sessions, ctx = {}) {
    const now = ctx.now || Date.now();
    const sess = Array.isArray(sessions) ? sessions.filter((x) => x && Number.isFinite(x.s) && Number.isFinite(x.m)) : [];
    const all = (games || []).filter((g) => !g.hidden);
    const main = all.filter((g) => !g.dupOf);
    const byId = new Map(all.map((g) => [g.id, g]));
    const colls = Array.isArray(ctx.collections) ? ctx.collections : [];

    const totalMin = all.reduce((t, g) => t + own(g), 0);
    const played = main.filter((g) => (g.playTime || 0) > 0);
    const finished = main.filter((g) => g.status === 'done');
    const perfect = main.filter(isPerfect).sort((a, b) => (b.playTime || 0) - (a.playTime || 0));
    let achUnlocked = 0, achTotal = 0;
    for (const g of all) { const a = ach(g); if (a) { achUnlocked += a.unlocked || 0; achTotal += a.total || 0; } }

    const stores = new Map();
    for (const g of main) stores.set(g.source, (stores.get(g.source) || 0) + 1);
    const storeList = [...stores].map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);
    const realStores = storeList.filter((s) => s.source !== 'local').length;

    // Sesiones: la más larga, las de madrugada (empiezan entre las 0 y las 5) y lo jugado en las últimas 2 semanas
    const longest = sess.reduce((m, x) => (x.m > m ? x.m : m), 0);
    const night = sess.filter((x) => { const h = new Date(x.s).getHours(); return h >= 0 && h < 5; }).length;
    const recentMap = new Map();
    for (const x of sess) if (now - x.s < 14 * DAY) recentMap.set(x.id, (recentMap.get(x.id) || 0) + x.m);

    // Actividad reciente: los últimos jugados, con lo que llevas en las últimas 2 semanas
    const recent = main.filter((g) => g.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed).slice(0, 4)
      .map((g) => ({ id: g.id, name: g.name, lastPlayed: g.lastPlayed, min: g.playTime || 0, twoWeeks: recentMap.get(g.id) || 0, ach: ach(g) }));

    // Escaparate: el juego al que más horas le has dedicado
    const fav = played.slice().sort((a, b) => (b.playTime || 0) - (a.playTime || 0))[0] || null;

    // Logros: los más raros que tienes y los últimos que conseguiste (de los juegos con datos de logros)
    const unlockedList = [];
    for (const g of main) { const a = ach(g); if (!a || !Array.isArray(a.list)) continue; for (const x of a.list) if (x.achieved) unlockedList.push({ gameId: g.id, game: g.name, name: x.name, icon: x.icon, percent: x.percent, at: x.unlockTime || 0 }); }
    const rare = unlockedList.filter((x) => x.percent != null).sort((a, b) => a.percent - b.percent).slice(0, 6);
    const lastAch = unlockedList.filter((x) => x.at).sort((a, b) => b.at - a.at).slice(0, 6);

    // Colecciones más grandes
    const topColls = colls.map((c) => ({ id: c.id, name: c.name, icon: c.icon, count: (c.games || []).filter((id) => byId.has(id)).length }))
      .filter((c) => c.count).sort((a, b) => b.count - a.count).slice(0, 6);

    const hours = Math.floor(totalMin / 60);
    const xpParts = {
      hours: hours * XP.hour, achievements: achUnlocked * XP.achievement, perfect: perfect.length * XP.perfect,
      finished: finished.length * XP.finished, played: played.length * XP.played, collections: Math.min(colls.length, 50) * XP.collection,
    };
    const xp = Object.values(xpParts).reduce((t, v) => t + v, 0);

    const values = { hours, library: main.length, explorer: played.length, finished: finished.length, perfect: perfect.length, ach: achUnlocked,
      collector: colls.length, stores: realStores + (stores.has('local') ? 1 : 0), marathon: Math.floor(longest / 60), night };
    const badges = BADGES.map((d) => badge(d, values[d.id] || 0));

    const firstPlayed = Math.min(...[...sess.map((x) => x.s), ...main.map((g) => g.lastPlayed).filter(Boolean)].filter(Number.isFinite), now);

    return {
      level: levelFor(xp), xpParts,
      totals: { min: totalMin, library: main.length, played: played.length, finished: finished.length, perfect: perfect.length,
        achUnlocked, achTotal, favorites: main.filter((g) => g.favorite).length, collections: colls.length, stores: storeList.length,
        sessions: sess.length, twoWeeksMin: [...recentMap.values()].reduce((t, v) => t + v, 0) },
      stores: storeList, recent, fav: fav ? { id: fav.id, name: fav.name, min: fav.playTime || 0, ach: ach(fav), status: fav.status || null } : null,
      perfect: perfect.slice(0, 8).map((g) => ({ id: g.id, name: g.name })), rare, lastAch, topColls, badges,
      earnedBadges: badges.filter((b) => b.earned).length, since: firstPlayed < now ? firstPlayed : null,
    };
  }

  const api = { compute, levelFor, BADGES, TIERS, XP };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Profile = api;
})(typeof window !== 'undefined' ? window : globalThis);
