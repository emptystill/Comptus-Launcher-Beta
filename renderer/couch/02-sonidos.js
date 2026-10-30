  // ---------- Sonidos (sintetizados, sin archivos) ----------
  let ac = null;
  function beep(freqs, dur = 0.06, type = 'sine') {
    if (!cfg.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume();
      const v = VOL[cfg.vol] ?? 0.09, t0 = ac.currentTime;
      freqs.forEach((f, i) => {
        const o = ac.createOscillator(), g = ac.createGain(), t = t0 + i * dur * 0.85;
        o.type = type; o.frequency.setValueAtTime(f, t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
      });
    } catch {}
  }
  const SND0 = { move: () => beep([760], 0.035), tab: () => beep([520, 700], 0.07), open: () => beep([440, 660, 880], 0.07), back: () => beep([700, 480], 0.07), menu: () => beep([600, 900], 0.06), change: () => beep([660], 0.05, 'triangle'), play: () => beep([523, 659, 784, 1047], 0.09), enter: () => beep([392, 523, 784], 0.09), exit: () => beep([784, 523, 392], 0.09) };
  // sonidos propios del estilo Xbox 360 (sintetizados, inspirados en el panel; no son los originales)
  const SAMP = {}; // nombre -> { a: Audio, bad: bool }
  function samp(name, vol = 1) {
    if (!cfg.sound) return true;
    let s = SAMP[name]; if (s && s.bad) return false;
    try {
      if (!s) { s = SAMP[name] = { a: new Audio('sonidos/x360/' + name + '.mp3'), bad: false }; s.a.preload = 'auto'; s.a.onerror = () => { s.bad = true; }; }
      const k = s.a.cloneNode(); k.volume = Math.max(0, Math.min(1, (VOL[cfg.vol] ?? 0.09) * 10 * vol)); k.play().catch(() => { s.bad = true; });
      return true;
    } catch { return false; }
  }
  const sx = (name, vol, fb) => () => { if (!samp(name, vol)) fb(); };
  const SNDX = {
    move: sx('move', 1, () => beep([1480], 0.025, 'triangle')), tab: () => { if (!samp(box && box.dataset.dir === 'l' ? 'tab_left' : 'tab_right', 1)) beep([740, 1110, 1480], 0.05, 'sine'); }, open: sx('select', 1, () => beep([587, 880, 1175], 0.07, 'triangle')),
    back: sx('back', 1, () => beep([880, 587], 0.06, 'triangle')), menu: sx('menu', 1, () => beep([660, 990, 1320], 0.07, 'sine')), change: sx('move', .7, () => beep([1100], 0.04, 'triangle')),
    play: sx('select_alt', 1, () => beep([523, 784, 1047, 1568], 0.09, 'triangle')), enter: sx('welcome', 1, () => beep([440, 660, 990], 0.09, 'sine')), exit: sx('back', 1, () => beep([990, 660, 440], 0.09, 'sine')),
  };
  // sonidos del estilo Big Picture: recortados del video de referencia
  const SAMD = {};
  function sampD(name, vol = 1) {
    if (!cfg.sound) return true;
    let s = SAMD[name]; if (s && s.bad) return false;
    try {
      if (!s) { s = SAMD[name] = { a: new Audio('sonidos/deck/' + name + '.wav'), bad: false }; s.a.preload = 'auto'; s.a.onerror = () => { s.bad = true; }; }
      const k = s.a.cloneNode(); k.volume = Math.max(0, Math.min(1, (VOL[cfg.vol] ?? 0.09) * 10 * vol)); k.play().catch(() => { s.bad = true; });
      return true;
    } catch { return false; }
  }
  const sd = (name, vol, fb) => () => { if (!sampD(name, vol)) fb(); };
  const SNDD = {
    move: () => { const n = isSettings() ? 'set' : gridNow() ? 'grid' : 'move'; if (!sampD(n, 1)) SND0.move(); },
    tab: sd('tab', 1.2, SND0.tab), open: sd('open', 1, SND0.open), back: sd('back', 1, SND0.back), menu: sd('menu', 1, SND0.menu),
    change: sd('set', 1, SND0.change), play: sd('open', 1, SND0.play || SND0.open), enter: sd('sweep', 1, SND0.open), exit: sd('back', 1, SND0.back),
  };
  const SND = {}; Object.keys(SND0).forEach((k) => { SND[k] = (...a) => (cfg.ui === 'deck' && SNDD[k] ? SNDD : cfg.ui === 'x360' && cfg.x3Snd !== false ? SNDX : SND0)[k](...a); });
SND.movev = () => { if (cfg.ui === 'deck') { if (!sampD('movev', 1)) SNDD.move(); } else SND.move(); };

