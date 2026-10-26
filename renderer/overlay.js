const $ = (s) => document.querySelector(s);
let confirming = false, confirmTimer;

function imgUrl(p) {
  if (/^https?:/.test(p)) return p;
  return encodeURI('file:///' + p.replace(/\\/g, '/')).replace(/#/g, '%23').replace(/\?/g, '%3F');
}

function resetExit() {
  confirming = false;
  clearTimeout(confirmTimer);
  $('#bExit').classList.remove('confirm');
  rich($('#bExit'), '[[power]] Cerrar el juego');
}

function draw(st) {
  resetExit();
  if (st.accent) document.documentElement.style.setProperty('--accent', st.accent);
  const g = st.game;
  $('#name').textContent = g ? g.name : 'Ningún juego detectado';
  const status = $('#status');
  status.textContent = g ? 'En ejecución' : 'Los juegos que abras desde el lanzador aparecen aquí';
  status.classList.toggle('on', !!g);
  $('#cover').style.backgroundImage = g && g.cover ? `url("${imgUrl(g.cover)}")` : '';
  $('#bExit').disabled = !g;
  rich($('#bExit'), '[[power]] Cerrar el juego');
  $('#msg').textContent = '';
}

// Reloj, cronómetro de la sesión, tiempo total jugado y batería
let tickT = null, sess = null, totalMin = 0;
const fmtDur = (ms) => { const m = Math.floor(ms / 60000); return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')} min` : `${m} min`; };
function tick() {
  $('#iClock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const run = sess ? Date.now() - sess : 0;
  $('#iSession').textContent = sess ? fmtDur(run) : '—';
  $('#iTotal').textContent = sess || totalMin ? fmtDur(totalMin * 60000 + run) : '—';
}
function startTick() { clearInterval(tickT); tick(); tickT = setInterval(tick, 1000); }
try { if (navigator.getBattery) navigator.getBattery().then((b) => { const f = () => { $('#iBatBox').classList.remove('hidden'); $('#iBat').textContent = Math.round(b.level * 100) + '%' + (b.charging ? ' ⚡' : ''); }; f(); b.addEventListener('levelchange', f); b.addEventListener('chargingchange', f); }).catch(() => {}); } catch {}

// Mezclador: barras de volumen general y por aplicación (el juego primero)
let mixRows = [], mixBusy = false;
function mixIcon(r) { return r.mute ? '🔇' : r.vol < 34 ? '🔈' : r.vol < 67 ? '🔉' : '🔊'; }
function drawMix(items) {
  const box = $('#mixer');
  const master = items.find((x) => x.pid === -1);
  const seen = new Set();
  const apps = items.filter((x) => x.pid > 0 && !/sonidos del sistema|system sounds/i.test(x.name) && !seen.has(x.name) && seen.add(x.name)).sort((a, b) => (b.game - a.game) || (b.active - a.active) || a.name.localeCompare(b.name)).slice(0, 3);
  const list = [master, ...apps].filter(Boolean);
  box.innerHTML = ''; mixRows = [];
  for (const it of list) {
    const row = document.createElement('div');
    row.className = 'mixrow' + (it.game ? ' game' : '') + (it.mute ? ' muted' : '');
    row.dataset.pid = it.pid;
    row.innerHTML = '<div class="mn"></div><input type="range" min="0" max="100" step="1"><span class="mv"></span><button class="mm" tabindex="-1"></button>';
    row.querySelector('.mn').textContent = it.pid === -1 ? 'Volumen general' : it.name;
    const rng = row.querySelector('input'), mv = row.querySelector('.mv'), mm = row.querySelector('.mm');
    const st = { pid: it.pid, vol: Math.round(it.vol), mute: !!it.mute, row, rng, mv, mm, t: 0, last: 0 };
    const paint = () => { rng.value = st.vol; mv.textContent = st.vol + '%'; mm.textContent = mixIcon(st); row.classList.toggle('muted', st.mute); };
    st.paint = paint;
    st.setVol = (v) => {
      st.vol = Math.max(0, Math.min(100, Math.round(v))); paint();
      const now = Date.now(), send = () => { st.last = Date.now(); window.overlay.mixSet(st.pid, st.vol); };
      clearTimeout(st.t);
      if (now - st.last > 80) send(); else st.t = setTimeout(send, 80);
    };
    st.toggle = async () => { const r = await window.overlay.mixMute(st.pid); if (r && r.ok !== false) { st.mute = !st.mute; paint(); } };
    rng.oninput = () => st.setVol(+rng.value);
    mm.onclick = st.toggle;
    paint(); box.appendChild(row); mixRows.push(st);
  }
  box.classList.toggle('hidden', !list.length);
}
function fit() {
  try { const p = $('#panel'); if (!p.classList.contains('hidden')) window.overlay.resize(p.offsetHeight + 24); } catch {}
}
async function loadMixer() {
  if (mixBusy) return; mixBusy = true;
  try {
    const r = window.overlay.mixList ? await window.overlay.mixList() : { ok: false };
    if (r && r.ok && r.items.length) { drawMix(r.items); $('#volFallback').classList.add('hidden'); }
    else { $('#mixer').classList.add('hidden'); $('#volFallback').classList.remove('hidden'); if (r && r.error) $('#msg').textContent = 'Mezclador no disponible: ' + r.error; }
  } catch { $('#mixer').classList.add('hidden'); $('#volFallback').classList.remove('hidden'); }
  mixBusy = false;
  window.dispatchEvent(new Event('mixready'));
  fit();
}

async function showPanel() {
  $('#toast').classList.add('hidden');
  $('#panel').classList.remove('hidden');
  const st = await window.overlay.getState();
  sess = st.sessionStart || null; totalMin = st.playTime || 0;
  draw(st);
  startTick();
  fit();
  loadMixer();
}

function showToast(text) {
  clearInterval(tickT);
  $('#panel').classList.add('hidden');
  const t = $('#toast'); t.replaceChildren();
  const parts = String(text).split('\n');
  if (parts.length > 1) { const a = document.createElement('div'), b = document.createElement('div'); a.className = 'tt'; b.className = 'tb'; a.textContent = parts[0]; b.textContent = parts.slice(1).join(' '); t.append(a, b); } else t.textContent = text;
  $('#toast').classList.remove('hidden');
}

window.overlay.onMode((mode, payload) => (mode === 'toast' ? showToast(payload) : showPanel()));

$('#bShot').onclick = () => window.overlay.shot();
$('#bLauncher').onclick = () => window.overlay.showLauncher();
$('#bHide').onclick = () => window.overlay.hide();
for (const [id, dir] of [['#bVolDown', 'down'], ['#bVolUp', 'up'], ['#bMute', 'mute']]) {
  $(id).onclick = async () => { $('#msg').textContent = ''; const r = await window.overlay.volume(dir); if (!r.ok) $('#msg').textContent = r.error || 'No se pudo cambiar el volumen.'; };
}
// Cerrar el juego pide una segunda pulsación para evitar accidentes
$('#bExit').onclick = async () => {
  if (!confirming) {
    confirming = true;
    $('#bExit').classList.add('confirm');
    $('#bExit').textContent = '¿Seguro? Pulsa otra vez para cerrar';
    confirmTimer = setTimeout(resetExit, 4000);
    return;
  }
  resetExit();
  $('#msg').textContent = 'Cerrando el juego…';
  const res = await window.overlay.exit();
  if (!res.ok) $('#msg').textContent = res.error || 'No se pudo cerrar el juego.';
};
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.overlay.hide(); });

// Mando: el overlay recibe arriba / abajo / A / B desde Comptus (que lee el mando aunque el juego tenga el foco)
(function () {
  let idx = 0;
  const btns = () => [...document.querySelectorAll('#panel .mixrow, #panel .buttons button')].filter((b) => !b.disabled && b.offsetParent !== null);
  function mark() { const l = btns(); document.querySelectorAll('#panel .mixrow, #panel .buttons button').forEach((b) => b.classList.remove('padsel')); if (l.length) { idx = (idx + l.length) % l.length; l[idx].classList.add('padsel'); } }
  window.overlay.onNav((d) => {
    if ($('#panel').classList.contains('hidden')) return;
    const l = btns();
    if (d === 'up') { idx--; mark(); } else if (d === 'down') { idx++; mark(); }
    else if (d === 'left' || d === 'right') {
      const st = l[idx] && mixRows.find((m) => m.row === l[idx]);
      if (st) st.setVol(st.vol + (d === 'right' ? 5 : -5));
    }
    else if (d === 'a') { const st = l[idx] && mixRows.find((m) => m.row === l[idx]); if (st) st.toggle(); else if (l[idx]) l[idx].click(); }
    else if (d === 'b') window.overlay.hide();
  });
  window.overlay.onMode((mode) => { if (mode !== 'toast') { idx = 0; setTimeout(mark, 60); } });
  window.addEventListener('mixready', () => { idx = 0; mark(); });
  setTimeout(mark, 100);
})();
