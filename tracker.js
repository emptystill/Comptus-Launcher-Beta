// Seguimiento del juego en ejecución (para el overlay): detecta sus procesos por la carpeta del juego
// y puede cerrarlos. Solo Windows. Nunca toca procesos fuera de la carpeta del juego.
const path = require('path');
const { execFile } = require('child_process');

// WMI (en vez de Get-Process) da la ruta también de los procesos protegidos (anti-trampas, administrador)
const LIST_SCRIPT =
  '[Console]::OutputEncoding=[Text.Encoding]::UTF8;' +
  "$ProgressPreference='SilentlyContinue';" +
  '$r=@(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.ExecutablePath } | ForEach-Object { [pscustomobject]@{Id=[int]$_.ProcessId;ProcessName=$_.Name;Path=$_.ExecutablePath} });' +
  'if(-not $r.Count){ $r=@(Get-Process | Where-Object { $_.Path } | Select-Object Id,ProcessName,Path) };' +
  'ConvertTo-Json -Compress -InputObject $r';

function powershell(script) {
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script],
      { windowsHide: true, maxBuffer: 16 * 1024 * 1024, timeout: 20000 }, (err, out) => (err ? reject(err) : resolve(out)));
  });
}

async function listProcesses() {
  const out = (await powershell(LIST_SCRIPT)).trim();
  if (!out) return [];
  const data = JSON.parse(out);
  return (Array.isArray(data) ? data : [data]).map((p) => ({ pid: p.Id, name: p.ProcessName, path: p.Path }));
}

function killPid(pid, force) {
  return new Promise((resolve) => {
    execFile('taskkill', ['/PID', String(pid), '/T', ...(force ? ['/F'] : [])], { windowsHide: true }, () => resolve());
  });
}

// Carpetas demasiado amplias (raíz de un disco, Windows, Archivos de programa…) nunca se usan para
// reconocer procesos: cerraríamos programas que no son el juego.
function safeDir(dir) {
  if (!dir) return false;
  const n = path.win32.normalize(String(dir)).replace(/[\\/]+$/, '');
  const parts = n.split(/[\\/]/).filter(Boolean); // ['C:', 'Games', 'Juego']
  if (parts.length < 3) return false;
  const first = parts[1].toLowerCase();
  if (['windows', 'programdata'].includes(first)) return false;
  if (first === 'users' && parts.length <= 3) return false;
  if (/^program files( \(x86\))?$/.test(first) && parts.length <= 2) return false;
  if (parts[parts.length - 1].toLowerCase() === 'common' && /steamapps/i.test(parts[parts.length - 2])) return false;
  return true;
}

function under(dir, file) {
  if (!dir || !file) return false;
  const d = path.win32.normalize(dir).replace(/[\\/]+$/, '').toLowerCase() + '\\';
  return path.win32.normalize(file).toLowerCase().startsWith(d);
}

// Carpeta donde vive el juego (para reconocer sus procesos)
function gameDir(g) {
  const dir = g.installPath || (g.exe && path.win32.dirname(g.exe)) || null;
  return dir && safeDir(dir) ? dir : null;
}

function alive(pid) { try { process.kill(pid, 0); return true; } catch (e) { return !!(e && e.code === 'EPERM'); } }

function createTracker({ list = listProcesses, kill = killPid, onEnd = () => {}, onSeen = () => {}, interval = 5000,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)), now = Date.now, selfPid = process.pid,
  startTimeout = 10 * 60 * 1000 } = {}) {
  let active = null;
  let timer = null;

  const stop = () => { clearInterval(timer); timer = null; };

  async function matching() {
    const procs = await list();
    const out = procs.filter((p) => p.pid !== selfPid && (active.extra.has(p.pid) || under(active.dir, p.path)));
    for (const pid of active.pids) { // procesos vistos con la ventana en primer plano: aunque la lista no dé su ruta (protegidos), si siguen vivos cuentan
      if (out.some((p) => p.pid === pid)) continue;
      if (alive(pid)) out.push({ pid, name: '?', path: null }); else active.pids.delete(pid);
    }
    return out;
  }

  async function tick() {
    if (!active) return;
    let found;
    try { found = await matching(); } catch { return; } // si falla la consulta, no contamos nada
    if (!active) return;
    active.procs = found;
    if (found.length) {
      if (!active.seen) { active.seen = true; onSeen(active); }
      active.misses = 0; return;
    }
    if (active.seen) {
      if (++active.misses >= 2) end();           // dos comprobaciones seguidas sin procesos: terminó
    } else if (now() - active.startedAt > startTimeout) {
      end();                                      // nunca llegó a abrirse
    }
  }

  function end() {
    const g = active;
    active = null;
    stop();
    if (g) onEnd(g);
  }

  function track(game, pid) {
    const dir = gameDir(game);
    if (!dir && !pid) return false;
    if (active) end();
    active = { id: game.id, name: game.name, dir, extra: new Set(pid ? [pid] : []), pids: new Set(), startedAt: now(), seen: false, misses: 0, procs: [] };
    if (interval > 0) timer = setInterval(tick, interval);
    return true;
  }

  // Primero se pide cerrar con calma; lo que siga abierto tras unos segundos se fuerza
  async function closeGame() {
    if (!active) return { ok: false, error: 'No hay ningún juego en ejecución.' };
    let procs;
    try { procs = await matching(); } catch { return { ok: false, error: 'No se pudo consultar los procesos.' }; }
    if (!procs.length) return { ok: false, error: 'No se encontró el proceso del juego.' };
    for (const p of procs) await kill(p.pid, false);
    await sleep(4000);
    let left = [];
    try { left = active ? await matching() : []; } catch { /* sigue */ }
    for (const p of left) await kill(p.pid, true);
    return { ok: true, count: procs.length, forced: left.length };
  }

  function addPid(pid) { if (active && Number.isInteger(pid) && pid > 0 && pid !== selfPid) active.pids.add(pid); }

  return { track, addPid, tick, closeGame, stop, get active() { return active; } };
}

module.exports = { createTracker, safeDir, under, gameDir, listProcesses };
