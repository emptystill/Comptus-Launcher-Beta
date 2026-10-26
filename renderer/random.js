// «¿Qué juego hoy?»: elige un juego al azar entre los que cumplen un criterio (UMD: window.Random / module.exports)
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.Random = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  const MODES = [
    { id: 'any', label: 'Cualquier instalado' },
    { id: 'backlog', label: 'Pendientes' },
    { id: 'unplayed', label: 'Sin estrenar' },
    { id: 'favorites', label: 'Favoritos' },
    { id: 'playing', label: 'Los que estoy jugando' },
    { id: 'all', label: 'Toda la biblioteca' },
  ];
  // Juegos que no se proponen nunca: ocultos y los vinculados que ya salen en otra tienda
  const eligible = (g) => !g.hidden && !(g.dupOf && g.viaStore);
  const isNew = (g) => !g.playTime && !g.lastPlayed;
  function pool(games, mode, opts) {
    const skipDone = !opts || opts.skipDone !== false; // por defecto, no propone completados ni abandonados
    return (games || []).filter((g) => {
      if (!eligible(g)) return false;
      if (mode !== 'all' && g.installed === false) return false;
      if (skipDone && mode !== 'all' && (g.status === 'done' || g.status === 'dropped')) return false;
      switch (mode) {
        case 'backlog': return g.status === 'backlog';
        case 'unplayed': return isNew(g);
        case 'favorites': return !!g.favorite;
        case 'playing': return g.status === 'playing';
        default: return true;
      }
    });
  }
  // Elige uno; evita repetir el anterior y los ya propuestos mientras queden otros (`seen`: ids)
  function pick(list, seen, rng) {
    if (!list.length) return null;
    const r = rng || Math.random;
    let fresh = list.filter((g) => !(seen || []).includes(g.id));
    if (!fresh.length) fresh = list.length > 1 ? list.filter((g) => g.id !== (seen || [])[(seen || []).length - 1]) : list;
    return fresh[Math.min(fresh.length - 1, Math.floor(r() * fresh.length))];
  }
  return { MODES, pool, pick };
});
