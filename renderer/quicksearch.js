// Búsqueda rápida de Comptus: una ventanita que se abre con un atajo global, sin abrir la biblioteca
const $ = (s) => document.querySelector(s);
const q = $('#q'), list = $('#list');
let items = [], sel = 0, seq = 0;

function colorFor(name) { let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) % 360; return `hsl(${h} 45% 38%)`; }

function applyTheme(t) {
  if (!t) return;
  const r = document.documentElement.style;
  if (t.panel) r.setProperty('--panel', t.panel);
  if (t.bg) r.setProperty('--bg', t.bg);
  if (t.text) r.setProperty('--text', t.text);
  if (t.accent) r.setProperty('--accent', t.accent);
  if (t.accent2) r.setProperty('--accent-2', t.accent2);
}

function fit() { window.pal.resize(document.getElementById('box').offsetHeight + 16); }

function paint() {
  list.replaceChildren();
  if (!items.length) {
    if (q.value.trim()) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = 'Ningún juego coincide.'; list.append(e); list.style.display = 'flex'; }
    else list.style.display = 'none';
  } else list.style.display = 'flex';
  items.forEach((g, i) => {
    const row = document.createElement('div');
    row.className = 'row' + (i === sel ? ' sel' : ''); row.setAttribute('role', 'option');
    let th;
    if (g.img) { th = document.createElement('img'); th.className = 'thumb'; th.src = g.img; th.alt = ''; th.onerror = () => { const d = document.createElement('div'); d.className = 'thumb'; d.textContent = (g.name[0] || '?').toUpperCase(); d.style.background = colorFor(g.name); th.replaceWith(d); }; }
    else { th = document.createElement('div'); th.className = 'thumb'; th.textContent = (g.name[0] || '?').toUpperCase(); th.style.background = colorFor(g.name); }
    const name = document.createElement('span'); name.className = 'name'; name.textContent = g.name;
    const src = document.createElement('span'); src.className = 'src'; src.textContent = g.source; src.style.color = g.color;
    row.append(th, name);
    if (!g.installed) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = 'No instalado'; row.append(t); }
    row.append(src);
    row.onmouseenter = () => { sel = i; mark(); };
    row.onclick = (e) => choose(e.ctrlKey);
    list.append(row);
  });
  fit();
}
function mark() { [...list.children].forEach((r, i) => r.classList && r.classList.toggle('sel', i === sel)); }

async function run() {
  const my = ++seq;
  const res = await window.pal.query(q.value);
  if (my !== seq) return; // llegó una respuesta vieja
  items = res || []; sel = 0; paint();
}
function choose(openPage) {
  const g = items[sel]; if (!g) return;
  if (openPage) window.pal.open(g.id); else window.pal.launch(g.id);
}

q.addEventListener('input', run);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { e.preventDefault(); window.pal.close(); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); if (items.length) { sel = (sel + 1) % items.length; mark(); } }
  else if (e.key === 'ArrowUp') { e.preventDefault(); if (items.length) { sel = (sel - 1 + items.length) % items.length; mark(); } }
  else if (e.key === 'Enter') { e.preventDefault(); choose(e.ctrlKey); }
});
window.pal.onShow(async () => { applyTheme(await window.pal.theme()); q.value = ''; await run(); q.focus(); q.select(); });
window.pal.theme().then(applyTheme);
run(); q.focus();
