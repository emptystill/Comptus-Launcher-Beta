// Actualizaciones automáticas (solo instalador de Windows). Se publican en GitHub Releases y Comptus las busca solo.
// Flujo: buscar → avisar → el usuario pulsa «Descargar» → «Reiniciar e instalar» (o se instala al cerrar).
// No funciona con la versión portable ni desde `npm start`.
const CHECK_EVERY = 6 * 60 * 60 * 1000;

function create({ app, logFile = null, findInstaller = () => null, openFile = null, getAuto, send, loadUpdater, isPortable = () => !!process.env.PORTABLE_EXECUTABLE_FILE, beforeInstall = () => {} }) {
  let au = null, timer = null, started = false;
  const state = { phase: 'idle', current: '', version: null, percent: 0, message: '', notes: '' };
  const fs = require('fs');
  const log = (s) => { if (!logFile) return; try { const t = fs.existsSync(logFile) && fs.statSync(logFile).size > 200000 ? 'w' : 'a'; fs.writeFileSync(logFile, `${new Date().toISOString()} ${s}\n`, { flag: t }); } catch { /* sin registro */ } };
  const cur = () => { try { return app.getVersion(); } catch { return ''; } };
  const set = (patch) => { Object.assign(state, { current: cur() }, patch); send('update:status', { ...state }); };

  function supported() {
    if (!app.isPackaged) return 'Solo funciona en la versión instalada (no al ejecutar con npm start).';
    if (isPortable()) return 'La versión portable no se actualiza sola: usa el instalador (npm run dist:instalador).';
    return null;
  }
  function init() {
    if (au) return au;
    try {
      au = loadUpdater();
      au.logger = { info: (m) => log('info ' + m), warn: (m) => log('warn ' + m), error: (m) => log('ERROR ' + m), debug: () => {} }; // registro en updater.log (carpeta de datos de Comptus)
      au.autoDownload = false;
      au.autoInstallOnAppQuit = true;
      au.allowPrerelease = false;
      au.on('update-available', (i) => set({ phase: 'available', version: i && i.version, notes: notesText(i), message: '' }));
      au.on('update-not-available', () => set({ phase: 'none', message: '' }));
      au.on('download-progress', (p) => set({ phase: 'downloading', percent: Math.round((p && p.percent) || 0) }));
      au.on('update-downloaded', (i) => set({ phase: 'ready', version: (i && i.version) || state.version, percent: 100 }));
      au.on('error', (e) => set({ phase: 'error', message: friendly(e) }));
    } catch (e) { au = null; set({ phase: 'error', message: 'No se pudo cargar el actualizador: ' + (e && e.message) }); }
    return au;
  }
  function notesText(i) { // notas de la release de GitHub (HTML o lista) → texto plano
    try {
      let n = i && i.releaseNotes;
      if (Array.isArray(n)) n = n.map((x) => (x && x.note) || '').join('\n');
      return String(n || '').replace(/<\/(p|li|h\d|div|ul|ol)>/gi, '\n').replace(/<li[^>]*>/gi, '• ').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\n{3,}/g, '\n\n').trim().slice(0, 1500);
    } catch { return ''; }
  }
  function friendly(e) {
    const m = String((e && e.message) || e || '');
    if (/404|latest\.yml|Cannot find|HttpError/i.test(m)) return 'No se encontró ninguna versión publicada. Revisa que el repositorio de GitHub esté bien escrito en package.json y que exista una release con el instalador.';
    if (/ENOTFOUND|ECONN|ETIMEDOUT|net::|network/i.test(m)) return 'Sin conexión: no se pudo buscar actualizaciones.';
    return m.slice(0, 200);
  }
  async function check(manual) {
    const why = supported();
    if (why) { set({ phase: 'unsupported', message: why }); return { ok: false, error: why }; }
    if (state.phase === 'checking' || state.phase === 'downloading') return { ok: true };
    if (state.phase === 'ready' || (state.phase === 'available' && !manual)) return { ok: true };
    if (!init()) return { ok: false, error: state.message };
    set({ phase: 'checking', message: '' });
    try { await au.checkForUpdates(); } catch (e) { set({ phase: 'error', message: friendly(e) }); return { ok: false, error: state.message }; }
    return { ok: true };
  }
  async function download() {
    if (state.phase !== 'available' || !init()) return { ok: false };
    set({ phase: 'downloading', percent: 0 });
    try { await au.downloadUpdate(); } catch (e) { set({ phase: 'error', message: friendly(e) }); return { ok: false }; }
    return { ok: true };
  }
  let installing = false;
  function install() {
    if (state.phase !== 'ready' || !au) return { ok: false };
    if (installing) { log('instalar: ya en curso, se ignora la pulsación repetida'); return { ok: true }; }
    installing = true; // una sola vez: una segunda pulsación abriría otro instalador
    log('instalar: pedido por el usuario (versión ' + state.version + ')');
    try { au.autoInstallOnAppQuit = false; } catch {} // si no, al cerrarse Comptus el actualizador lanzaría por su cuenta una instalación silenciosa (/S) que choca con la nuestra
    beforeInstall();
    log('instalar: cierre previo hecho');
    // Camino principal: se abre el instalador ya descargado como lo haría el Explorador (Windows pide permisos con su ventana normal)
    // y Comptus se cierra para que pueda sustituirlo. Si no se encuentra el archivo, se usa el método del actualizador.
    let file = null;
    try { file = findInstaller(state.version); } catch { /* sin archivo */ }
    if (file && openFile) {
      log('instalar: abriendo ' + file);
      Promise.resolve(openFile(file)).then((r) => log('instalar: openPath → ' + (r || 'ok'))).catch((e) => log('ERROR openPath ' + e.message));
      setTimeout(() => { log('instalar: cerrando Comptus'); try { app.quit(); } catch {} }, 1500).unref();
      return { ok: true };
    }
    log('instalar: sin instalador a mano, quitAndInstall');
    setImmediate(() => au.quitAndInstall(false, true));
    setTimeout(() => { log('instalar: sigue abierto a los 6 s, se vuelve a pedir'); try { au.quitAndInstall(false, true); } catch (e) { log('ERROR ' + e.message); } }, 6000).unref();
    return { ok: true };
  }
  function start() { // al abrir: busca a los 20 s y luego cada 6 h (si el usuario lo permite)
    if (started) return; started = true;
    const tick = () => { if (getAuto() && !supported()) check(false); };
    setTimeout(tick, 20000);
    timer = setInterval(tick, CHECK_EVERY);
    if (timer.unref) timer.unref();
  }
  return { state: () => ({ ...state, current: cur(), supported: !supported(), why: supported() }), check, download, install, start };
}
module.exports = { create };
