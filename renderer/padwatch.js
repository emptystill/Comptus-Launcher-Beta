// Escucha el mando mientras juegas (la ventana del juego tiene el foco, así que el lanzador no lo ve).
// Avisa a Comptus cuando se pulsa la combinación elegida, para abrir / cerrar el overlay.
(function () {
  const mode = new URLSearchParams(location.search).get('m') || 'selstart';
  // Índices del mando estándar: 8 Select, 9 Start, 10 L3, 11 R3, 16 Guía
  const COMBOS = { selstart: [8, 9], sela: [8, 0], l3r3: [10, 11], guide: [16] };
  const custom = (new URLSearchParams(location.search).get('b') || '').split(',').filter(Boolean).map(Number).filter(Number.isInteger);
  const need = mode === 'custom' ? custom : COMBOS[mode];
  if (!need || !need.length) return;
  let down = false;
  function poll() {
    let on = false;
    try { for (const p of navigator.getGamepads()) if (p && p.connected && need.every((i) => p.buttons[i] && p.buttons[i].pressed)) on = true; } catch {}
    if (on && !down && window.padwatch) window.padwatch.combo();
    down = on;
  }
  setInterval(poll, 60); // un temporizador sigue vivo aunque la ventana no se redibuje
})();
