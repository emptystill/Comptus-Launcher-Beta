// Unir juegos repetidos: el mismo juego en varias bibliotecas (Steam + Epic, Epic + Ubisoft, local + Steam…)
// se muestra como una sola ficha. Aquí solo se decide quién pertenece a qué grupo; la interfaz decide cómo mostrarlo.
//
// Cada juego del grupo recibe:   group  = ids de todos los miembros (el principal primero)
// Los que no son el principal:   dupOf  = id del principal
// El principal recibe:           alsoIn = fuentes de los demás, y valores combinados
//                                (favorite = alguno es favorito, playTime = suma, lastPlayed = el más reciente,
//                                 status = el primero que tenga, tags = unión). Sus valores propios quedan en own*.
(function (root) {
  const SRC_ORDER = ['steam', 'epic', 'ubisoft', 'ea', 'battlenet', 'rockstar', 'xbox', 'gog', 'prime', 'itch', 'local'];
  const rank = (s) => { const i = SRC_ORDER.indexOf(s); return i < 0 ? 99 : i; };

  // Nombre comparable: sin ™ ® ©, sin acentos, sin «The» ni «Tom Clancy's» iniciales, sin «Edition» de la tienda
  // («Ultimate Edition», «Game of the Year»…), con los números romanos II–X como cifras y sin signos ni espacios
  const ROMAN = { ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10' };
  function norm(name) {
    let s = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/[™®©]/g, '').replace(/&/g, ' and ').replace(/^\s*tom clancy['’`]?s\s+/, '').replace(/^\s*the\s+/, '')
      .replace(/\b(standard|deluxe|ultimate|gold|complete|definitive|premium|digital|collector'?s|special|launch|legendary|anniversary)(\s+(deluxe|ultimate|digital))?\s+edition\b/g, ' ')
      .replace(/\bgame of the year(\s+edition)?\b/g, ' ').replace(/\bgoty(\s+edition)?\b/g, ' ');
    const tokens = s.split(/[^a-z0-9]+/).filter(Boolean).map((t, i) => (i > 0 && ROMAN[t]) || t);
    return tokens.join('');
  }
  // ¿Se parecen lo bastante como para sugerir unirlos? (uno empieza como el otro, o comparten un comienzo largo)
  function related(a, b) {
    const x = norm(a.name), y = norm(b.name);
    if (x.length < 5 || y.length < 5) return false;
    return x.startsWith(y) || y.startsWith(x);
  }

  function clear(g) {
    if (!g.group && !g.dupOf && !g.alsoIn) return;
    if ('ownFavorite' in g) { g.favorite = g.ownFavorite; g.playTime = g.ownPlayTime; g.lastPlayed = g.ownLastPlayed; g.status = g.ownStatus; g.tags = g.ownTags; }
    for (const k of ['group', 'dupOf', 'alsoIn', 'ownFavorite', 'ownPlayTime', 'ownLastPlayed', 'ownStatus', 'ownTags']) delete g[k];
  }

  function pickPrimary(members) {
    const pref = members.find((m) => m.prefer === true && !m.viaStore);
    if (pref) return pref;
    return members.slice().sort((a, b) =>
      (!!a.viaStore - !!b.viaStore) ||
      (a.installed === false) - (b.installed === false) ||
      (b.playTime || 0) - (a.playTime || 0) ||
      rank(a.source) - rank(b.source) ||
      String(a.id).localeCompare(String(b.id)))[0];
  }

  // Devuelve cuántos grupos se formaron. Con enabled=false deja todo como estaba (cada juego por su lado).
  // Se unen: los de igual nombre en bibliotecas distintas, y los que el usuario enlazó a mano (mergeWith).
  function applyGroups(games, opts) {
    for (const g of games) clear(g);
    if (!opts || opts.enabled === false) return 0;
    const byId = new Map(games.map((g) => [g.id, g]));
    const parent = new Map();
    const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
    const union = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
    const ok = (g) => !g.hidden && !g.noMerge;
    for (const g of games) if (ok(g)) parent.set(g.id, g.id);
    const buckets = new Map();
    for (const g of games) {
      if (!ok(g)) continue;
      const k = norm(g.name);
      if (k.length < 3) continue;
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(g);
    }
    for (const members of buckets.values()) {
      if (new Set(members.map((m) => m.source)).size < 2) continue; // dos iguales de la misma tienda no se unen
      for (const m of members) union(m.id, members[0].id);
    }
    for (const g of games) { // enlaces hechos a mano
      const t = g.mergeWith && byId.get(g.mergeWith);
      if (t && ok(g) && ok(t)) union(g.id, t.id);
    }
    const comps = new Map();
    for (const g of games) { if (!parent.has(g.id)) continue; const r = find(g.id); if (!comps.has(r)) comps.set(r, []); comps.get(r).push(g); }
    let n = 0;
    for (const members of comps.values()) {
      if (members.length < 2) continue;
      n++;
      const p = pickPrimary(members);
      const rest = members.filter((m) => m !== p).sort((a, b) => rank(a.source) - rank(b.source) || String(a.id).localeCompare(String(b.id)));
      const ids = [p.id, ...rest.map((m) => m.id)];
      for (const m of members) m.group = ids;
      for (const m of rest) m.dupOf = p.id;
      p.ownFavorite = !!p.favorite; p.ownPlayTime = p.playTime || 0; p.ownLastPlayed = p.lastPlayed || null; p.ownStatus = p.status; p.ownTags = p.tags;
      p.alsoIn = [...new Set(rest.map((m) => m.source))].filter((s) => s !== p.source);
      p.favorite = members.some((m) => !!m.favorite);
      p.playTime = members.reduce((t, m) => t + (m.playTime || 0), 0);
      p.lastPlayed = members.reduce((t, m) => Math.max(t, m.lastPlayed || 0), 0) || null;
      if (!p.status) { const st = rest.find((m) => m.status); if (st) p.status = st.status; }
      const tags = [];
      for (const m of [p, ...rest]) for (const t of (Array.isArray(m.tags) ? m.tags : [])) if (!tags.some((x) => x.toLowerCase() === t.toLowerCase())) tags.push(t);
      if (tags.length) p.tags = tags;
    }
    return n;
  }

  // Parejas de bibliotecas distintas que se parecen pero no están unidas (para el diagnóstico y el selector)
  function suggestions(games) {
    const free = games.filter((g) => !g.hidden && !g.group && !g.noMerge);
    const out = [];
    for (let i = 0; i < free.length; i++) {
      for (let j = i + 1; j < free.length; j++) {
        const a = free[i], b = free[j];
        if (a.source !== b.source && related(a, b)) out.push([a, b]);
      }
    }
    return out;
  }

  const api = { applyGroups, norm, related, suggestions, pickPrimary };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Dupes = api;
})(typeof window !== 'undefined' ? window : globalThis);
