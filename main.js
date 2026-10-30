const { app, Notification, BrowserWindow, ipcMain, dialog, shell, net, nativeImage, globalShortcut, desktopCapturer, screen, session, safeStorage, Tray, Menu } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
// Carpeta de datos fija: así cambiar el nombre del programa no "pierde" tu biblioteca.
app.setPath('userData', path.join(app.getPath('appData'), 'mi-lanzador-de-juegos'));
const fs = require('fs');
const { randomUUID, createHash } = require('crypto');
const { spawn, execFile } = require('child_process');
const { scanAll, sourcesInfo, providers } = require('./scanners');
const { findSteamPath, readLibraryFolders } = require('./scanners/steam');
const { defaultManifestsDir: epicManifestsDir } = require('./scanners/epic');
const { fetchInfo, cleanEdit } = require('./metadata');
const { createTracker, gameDir: trackerGameDir, under: trackerUnder } = require('./tracker');
const { translateText, explain } = require('./translate');
const shots = require('./shots');
const backup = require('./backup')
const updaterMod = require('./updater');
const Dupes = require('./renderer/dupes.js');
const { fetchAchievements, detectSteamId } = require('./achievements');
const { fetchOwnedSteam, steamOwnedToGames } = require('./owned');
const epicOwned = require('./epic-owned');
const itchOwned = require('./itch-owned');
const xboxLive = require('./xbox-live');
const { parseVdf, getCI } = require('./scanners/vdf');

let win;
let cache = [];
let quitting = false;
// Juego que abrimos desde el lanzador y sigue en ejecución (para el overlay)
const tracker = createTracker({ onEnd: (g) => onGameEnd(g), onSeen: (g) => sendGameState(g.id, 'running') });
let stopping = false;
// Hay un juego realmente en marcha (visto y con procesos vivos), no solo «a la espera» de abrirse
const gameRunning = () => { const a = tracker.active; return !!(a && a.seen && ((a.procs && a.procs.length) || (a.pids && a.pids.size))); };
function currentGameState() {
  const a = tracker.active;
  return a ? { id: a.id, state: stopping ? 'stopping' : a.seen ? 'running' : 'starting' } : null;
}
function sendGameState(id, state) {
  if (typeof win !== 'undefined' && win && !win.isDestroyed()) win.webContents.send('game:state', { id, state });
}
async function stopActiveGame() {
  const a = tracker.active;
  if (!a) return { ok: false, error: 'No hay ningún juego en ejecución.' };
  stopping = true; sendGameState(a.id, 'stopping');
  const res = await tracker.closeGame();
  if (!res.ok) { stopping = false; sendGameState(a.id, a.seen ? 'running' : 'starting'); }
  return res;
}

// ---------- Persistencia (juegos locales + favoritos, tiempo de juego, etc.) ----------
const media = require('./media');
const { createSaves } = require('./saves');
const disksize = require('./disksize');
const freegames = require('./freegames');
const wishlist = require('./wishlist');
const { fetchFriends, fetchFriendDetail, fetchOwners } = require('./friends');
const sgdb = require('./steamgriddb');
const eventsMod = require('./events');
let diskStoreMem = null;
const diskStore = () => diskStoreMem || (diskStoreMem = disksize.create(path.join(app.getPath('userData'), 'disk-sizes.json')));
const userDir = () => app.getPath('userData');
// La carpeta elegida en el instalador queda en el registro (HKLM\Software\Comptus\MediaDir): la primera vez se adopta sin preguntar de nuevo
function adoptInstallerMediaDir() {
  if (process.platform !== 'win32') return;
  try {
    const st = loadStore().settings;
    if (st.mediaDir && fs.existsSync(st.mediaDir)) return;
    const out = require('child_process').execFileSync('reg', ['query', 'HKLM\\Software\\Comptus', '/v', 'MediaDir', '/reg:64'], { encoding: 'utf8', windowsHide: true, timeout: 4000 });
    const mm = /MediaDir\s+REG_SZ\s+(.+)/.exec(out);
    const dir = mm && mm[1].trim();
    if (!dir || !fs.existsSync(dir) || st.mediaAsked === process.execPath) return;
    const old = media.dirOf(userDir());
    media.setRoot(dir); media.ensure(userDir()); media.copyTree(old, dir);
    const store = loadStore(); store.settings.mediaDir = dir; store.settings.mediaAsked = process.execPath; saveStore(store);
  } catch { /* sin registro: se pregunta dentro de la aplicación */ }
}
function applyMediaRoot() { try { const d = loadStore().settings.mediaDir; media.setRoot(typeof d === 'string' && d ? d : null); } catch {} }
const IMG_KEYS = ['banner', 'cover', 'icon', 'logo'];
// Recorre ajustes/colecciones/temas: rutas dentro de la carpeta de imágenes <-> «media:…» (portátiles)
function walkMedia(v, fn) {
  if (typeof v === 'string') return fn(v);
  if (Array.isArray(v)) return v.map((x) => walkMedia(x, fn));
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) o[k] = walkMedia(v[k], fn); return o; }
  return v;
}
const tokenizeIn = (v) => walkMedia(v, (p) => (path.isAbsolute(p) && media.inside(userDir(), p) ? media.toToken(userDir(), 'cover', p) : p));
const resolveIn = (v) => walkMedia(v, (p) => (p.startsWith('media:') ? (media.resolve(userDir(), p) || '') : p));
const storePath = () => path.join(app.getPath('userData'), 'games.json');

// El almacén vive en memoria: se lee del disco una sola vez y se escribe de forma diferida y sin bloquear.
// (Antes cada cambio releía, reformateaba y reescribía todo el archivo de forma síncrona, lo que congelaba
// la ventana cuando había cientos de juegos con información y logros.)
let storeMem = null;
let saveTimer = null;
let storeDirty = false;
let writing = false;
let storeMtime = 0;
const mtimeOf = () => { try { return fs.statSync(storePath()).mtimeMs; } catch { return 0; } };
let storeBroken = false; // el archivo existe pero no se pudo leer: no se escribe encima para no perder los datos
function readStoreFile() {
  let last;
  for (let i = 0; i < 4; i++) { // reintenta: un antivirus o una copia de seguridad pueden tener el archivo bloqueado un instante
    try { return JSON.parse(fs.readFileSync(storePath(), 'utf8')); }
    catch (e) {
      if (e && e.code === 'ENOENT') return null;
      last = e;
      const t = Date.now(); while (Date.now() - t < 150) { /* espera breve */ }
    }
  }
  throw last;
}
function loadStore() {
  // Si nadie del programa tiene cambios pendientes y el archivo cambió por fuera (editado a mano), se vuelve a leer
  if (storeMem && (storeDirty || writing || storeBroken || mtimeOf() === storeMtime)) return storeMem;
  try {
    const s = readStoreFile();
    storeBroken = false;
    storeMtime = mtimeOf();
    storeMem = s ? { local: s.local || [], meta: s.meta || {}, settings: s.settings || {}, owned: s.owned || {}, sessions: Array.isArray(s.sessions) ? s.sessions : [] }
               : { local: [], meta: {}, settings: {}, owned: {}, sessions: [] };
  } catch (e) {
    storeBroken = true; // no se sobrescribe el archivo; se guarda una copia por si acaso
    try {
      const keep = path.join(path.dirname(storePath()), 'games.ilegible-' + Date.now() + '.json');
      fs.copyFileSync(storePath(), keep);
    } catch {}
    storeMem = { local: [], meta: {}, settings: {}, owned: {}, sessions: [] };
  }
  return storeMem;
}
function saveStore(store) {
  storeMem = store;
  storeDirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => flushStore(false), 1500);
}
function flushStore(sync) {
  clearTimeout(saveTimer);
  if (!storeDirty || !storeMem) return;
  if (storeBroken) { storeDirty = false; return; }
  if (writing && !sync) { saveTimer = setTimeout(() => flushStore(false), 500); return; }
  storeDirty = false;
  const file = storePath();
  const tmp = file + '.tmp';
  try {
    // Una copia del archivo anterior (games.json.bak) por si algo sale mal; solo si el nuevo no es mucho más pequeño
    if (!flushStore.bakDone) { flushStore.bakDone = true; try { if (fs.existsSync(file)) fs.copyFileSync(file, file + '.bak'); } catch {} }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const data = JSON.stringify(storeMem);
    if (sync) { fs.writeFileSync(tmp, data); fs.renameSync(tmp, file); storeMtime = mtimeOf(); return; }
    writing = true;
    fs.promises.writeFile(tmp, data).then(() => fs.promises.rename(tmp, file)).then(() => { storeMtime = mtimeOf(); })
      .catch(() => { storeDirty = true; })
      .finally(() => { writing = false; });
  } catch { storeDirty = true; }
}
function updateMeta(id, patch) {
  const store = loadStore();
  store.meta[id] = { ...(store.meta[id] || {}), ...patch };
  saveStore(store);
  return store.meta[id];
}

// Si el juego no tiene portada o banner propios, usa los de la información descargada (marcados como automáticos)
const STEAM_CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps';
function withAutoImages(g) {
  const out = { ...g };
  const im = g.info && g.info.images;
  if (im) {
    if (!out.cover && im.cover) { out.cover = im.cover; out.coverFallback = out.coverFallback || im.coverFallback; out.coverAuto = true; }
    if (!out.banner && im.banner) { out.banner = im.banner; out.bannerFallback = out.bannerFallback || im.bannerFallback; }
  }
  // Logotipo oficial de Steam en lugar del nombre (juegos de Steam o locales emparejados con uno de Steam).
  // Si el usuario puso el suyo, o lo quitó a propósito (logoOff), no se toca.
  const appid = (g.source === 'steam' && g.appid) || (g.info && g.info.source !== 'rawg' && g.info.appid) || null;
  if (!out.logo && !out.logoOff && appid) {
    out.logo = `${STEAM_CDN}/${appid}/library_logo.png`;
    out.logoFallback = `${STEAM_CDN}/${appid}/logo.png`;
    out.logoAuto = true;
  }
  return out;
}

// ---------- Biblioteca ----------
async function getLibrary() {
  const store = loadStore();
  const scanned = await scanAll(store.settings.sources || {}, { ubisoftViaStore: store.settings.ubisoftViaStore !== false });
  const local = store.local.map((g) => ({ ...g, source: 'local' }));
  // Juegos de tus cuentas que no están instalados (se sincronizan aparte; se pueden ocultar en Configuración)
  const installed = new Set(scanned.filter((g) => g.installed !== false).map((g) => g.id));
  const notInstalled = store.settings.showOwned === false ? [] : [
    ...steamOwnedToGames((store.owned.steam || {}).games, installed),
    ...(store.owned.epicAuth ? epicOwned.epicOwnedToGames((store.owned.epic || {}).games, installed) : []),
    ...(store.owned.xboxAuth ? xboxLive.xboxOwnedToGames((store.owned.xbox || {}).games, installed) : []),
    ...(String(store.settings.itchKey || '').trim() ? itchOwned.itchOwnedToGames((store.owned.itch || {}).games, new Set(scanned.filter((g) => g.source === 'itch' && g.installed !== false).map((g) => itchOwned.slug(g.name)))) : []),
  ];
  // Los datos de la tienda de Epic (descripción, desarrollador) sirven de respaldo para la información
  const epicList = (store.owned.epic || {}).games || [];
  if (store.owned.epicAuth && epicList.length) {
    const byApp = new Map(epicList.map((o) => [`epic:${o.appName}`, o]));
    for (const g of scanned) {
      const o = g.source === 'epic' && byApp.get(g.id);
      if (o) { g.epicNs = o.namespace; if (o.description) g.epicInfo = { description: o.description, developer: o.developer || '' }; }
    }
  }
  // Juegos de Xbox instalados: se les enlaza su título de Xbox (para los logros)
  const xboxList = store.owned.xboxAuth ? (store.owned.xbox || {}).games || [] : [];
  if (xboxList.length) {
    for (const g of scanned) {
      if (g.source !== 'xbox') continue;
      const o = xboxLive.matchInstalled(g, xboxList);
      if (o) { g.xboxTitleId = o.titleId; if (o.lastPlayed) g.lastPlayed = Math.max(g.lastPlayed || 0, o.lastPlayed); }
    }
  }
  // Los juegos sin instalar que ya trae un escáner (p. ej. Ubisoft) también se ocultan con «mostrar los que no están instalados»
  const scannedShown = store.settings.showOwned === false ? scanned.filter((g) => g.installed !== false) : scanned;
  cache = [...scannedShown, ...notInstalled, ...local].map((g) => {
    const meta = store.meta[g.id] || {};
    // Imágenes de la carpeta de Comptus: «media:…» -> ruta real, y las que dejaste con el nombre del juego se usan solas (si no elegiste otra)
    const mi = media.index(userDir());
    const mm = {};
    for (const k of IMG_KEYS) {
      const own = meta[k] || (g.source === 'local' && k === 'cover' ? g[k] : null);
      const auto = !own && media.autoFor(mi, g, k);
      const v = auto || (typeof meta[k] === 'string' ? meta[k] : g[k]);
      if (typeof v === 'string' && v.startsWith('media:')) mm[k] = media.resolve(userDir(), v) || undefined;
      else if (auto) mm[k] = auto;
    }
    return {
      favorite: false,
      hidden: false,
      lastPlayed: null,
      playTime: 0, // minutos: lo que lee Steam o lo que mide el lanzador en los juegos que abre directamente
      ...g,
      ...meta,
      ...Object.fromEntries(Object.entries(mm).filter(([, v]) => v)),
      diskBytes: diskStore().bytes(g.id),
      ...(meta.customTrailer && meta.customTrailer.path && String(meta.customTrailer.path).startsWith('media:') ? { customTrailer: { ...meta.customTrailer, path: media.resolve(userDir(), meta.customTrailer.path) || '' } } : {}),
      // Steam aporta sus propios datos; nos quedamos con el mayor de cada uno
      lastPlayed: Math.max(g.lastPlayed || 0, meta.lastPlayed || 0) || null,
      playTime: Math.max(g.playTime || 0, meta.playTime || 0),
    };
  }).map(withAutoImages);
  scheduleTray();
  return cache;
}

function splitArgs(str) {
  if (!str) return [];
  return (str.match(/"[^"]*"|\S+/g) || []).map((a) => a.replace(/^"|"$/g, ''));
}

// Ejecuta el .exe del juego directamente y mide el tiempo de juego
function runExe(g) {
  if (!fs.existsSync(g.exe)) return { ok: false, error: 'No se encontró el ejecutable. ¿Lo moviste de carpeta?' };

  // Para .exe lanzamos directo; para .bat/.lnk delegamos al sistema
  if (path.extname(g.exe).toLowerCase() !== '.exe') {
    shell.openPath(g.exe);
    return { ok: true };
  }
  const start = Date.now();
  const child = spawn(g.exe, splitArgs(g.args), {
    cwd: g.cwd || path.dirname(g.exe),
    detached: true,
    stdio: 'ignore',
  });
  child.on('error', () => shell.openPath(g.exe)); // p. ej. si pide permisos de administrador
  child.on('exit', () => {
    const mins = Math.round((Date.now() - start) / 60000);
    if (mins > 0) {
      const prev = (loadStore().meta[g.id] || {}).playTime || 0;
      updateMeta(g.id, { playTime: prev + mins });
      win && win.webContents.send('library:changed');
    }
  });
  child.unref();
  return { ok: true, pid: child.pid };
}

function launchGame(id) {
  const g = cache.find((x) => x.id === id);
  if (!g) return { ok: false, error: 'Juego no encontrado' };

  if (g.installed === false) {            // no instalado: se abre la instalación en su tienda
    if (g.viaStore) return { ok: false, error: 'Este juego lo compraste en otra tienda (Steam…): ábrelo desde esa biblioteca' };
    if (!g.installUri) return { ok: false, error: 'No se sabe cómo instalar este juego' };
    shell.openExternal(g.installUri);
    return { ok: true, installing: true };
  }
  let res;
  if (g.launchCmd) {                       // comando (p. ej. Xbox)
    execFile(g.launchCmd[0], g.launchCmd.slice(1), { windowsHide: true }, () => {});
    res = { ok: true };
  } else if (g.launchUri) {                // a través del launcher (Steam, Epic, Ubisoft…)
    shell.openExternal(g.launchUri);
    res = { ok: true };
  } else if (g.exe) {                      // ejecutable directo (locales, GOG…)
    res = runExe(g);
  } else {
    res = { ok: false, error: 'No se sabe cómo abrir este juego' };
  }
  if (res.ok) {
    updateMeta(id, { lastPlayed: Date.now() });
    if (tracker.track(g, res.pid)) { stopping = false; sendGameState(g.id, 'starting'); }
  }
  return { ok: res.ok, error: res.error };
}

// ---------- IPC ----------
ipcMain.handle('diag:ubisoft', async () => { try { return await require('./scanners/ubisoft').diagnoseUbisoft(); } catch (e) { return 'No se pudo hacer el diagnóstico: ' + e.message; } });
// La primera vez que se pide la biblioteca al abrir se responde al instante con la última guardada (sin esperar a escanear
// las tiendas) y se actualiza en segundo plano; si algo cambió, se avisa para volver a dibujarla.
const libCacheFile = () => path.join(app.getPath('userData'), 'library-cache.json');
let libFirstServed = false, libWriteT = null;
function readLibCache() { try { const j = JSON.parse(fs.readFileSync(libCacheFile(), 'utf8')); return Array.isArray(j) && j.length ? j : null; } catch { return null; } }
function writeLibCache(list) {
  clearTimeout(libWriteT);
  libWriteT = setTimeout(() => { try { if (!Array.isArray(list) || !list.length) return; const f = libCacheFile(), tmp = f + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(list)); fs.renameSync(tmp, f); } catch { /* no es crítico */ } }, 1500);
}

// ---------- Biblioteca al día sola ----------
// Al instalar o desinstalar un juego la biblioteca se actualiza sin pulsar nada: se vigilan las carpetas donde Steam y Epic
// apuntan lo instalado y, para el resto de tiendas (que no se pueden vigilar), se vuelve a mirar al volver a Comptus tras un rato.
let libFresh = null, libRefreshing = false, libLastRefresh = Date.now(), libWatchT = null;
const libWatchers = [];
async function refreshLibrary() {
  if (libRefreshing) return;
  libRefreshing = true;
  try {
    const before = JSON.stringify(readLibCache() || cache);
    const fresh = await getLibrary();
    libLastRefresh = Date.now();
    libFresh = { t: Date.now(), lib: fresh };
    writeLibCache(fresh);
    if (JSON.stringify(fresh) !== before) sendWin('library:changed');
  } catch (e) { if (process.env.COMPTUS_DEBUG) console.error(e); }
  finally { libRefreshing = false; }
}
function libraryTouched() { // varios cambios seguidos (una instalación escribe muchos archivos) se juntan en una sola actualización
  clearTimeout(libWatchT);
  libWatchT = setTimeout(() => refreshLibrary(), 5000);
}
async function startLibraryWatch() {
  const dirs = new Set();
  try { dirs.add(epicManifestsDir()); } catch {}
  try { const sp = await findSteamPath(); if (sp) for (const lib of readLibraryFolders(sp)) dirs.add(path.join(lib, 'steamapps')); } catch {}
  for (const d of dirs) {
    try { if (!fs.existsSync(d)) continue; const w = fs.watch(d, { persistent: false }, (_ev, f) => { if (!f || /\.(acf|item)$/i.test(f) || /appmanifest/i.test(f)) libraryTouched(); }); w.on('error', () => {}); libWatchers.push(w); } catch { /* no se puede vigilar esa carpeta */ }
  }
}
function stopLibraryWatch() { for (const w of libWatchers.splice(0)) { try { w.close(); } catch {} } clearTimeout(libWatchT); }

ipcMain.handle('library:get', async () => {
  if (!libFirstServed) {
    libFirstServed = true;
    const old = readLibCache();
    if (old) {
      if (!cache || !cache.length) cache = old; // mientras tanto se pueden abrir juegos con lo guardado
      const before = JSON.stringify(old);
      getLibrary().then((fresh) => { writeLibCache(fresh); if (JSON.stringify(fresh) !== before) sendWin('library:changed'); }).catch((e) => { if (process.env.COMPTUS_DEBUG) console.error(e); });
      return old;
    }
  }
  if (libFresh && Date.now() - libFresh.t < 8000) return libFresh.lib; // acaba de actualizarse sola: no se escanea otra vez
  const lib = await getLibrary(); libLastRefresh = Date.now(); writeLibCache(lib); return lib;
});
ipcMain.handle('sources:get', () => sourcesInfo());
ipcMain.handle('game:launch', (_e, id) => launchGame(id));
ipcMain.handle('game:state', () => currentGameState());
ipcMain.handle('game:stop', (_e, id) => (tracker.active && tracker.active.id === id ? stopActiveGame() : { ok: false, error: 'Ese juego no está en ejecución.' }));
ipcMain.handle('game:toggleFavorite', (_e, id) => {
  const cur = (loadStore().meta[id] || {}).favorite || false;
  return updateMeta(id, { favorite: !cur });
});
ipcMain.handle('game:toggleHidden', (_e, id) => {
  const cur = (loadStore().meta[id] || {}).hidden || false;
  return updateMeta(id, { hidden: !cur });
});

// Personalización de cada juego: banner, portada, icono, logotipo, color de acento y notas.
// Para juegos de Steam/Epic se guarda en meta (y pisa la portada por defecto);
// la portada de un juego local vive en el propio juego.
ipcMain.handle('game:setCustom', (_e, id, patch) => {
  const allowed = ['banner', 'cover', 'icon', 'logo', 'logoPos', 'logoSize', 'logoX', 'logoY', 'colorMode', 'notes', 'accent', 'customTrailer', 'logoOff', 'status', 'tags', 'prefer', 'noMerge', 'mergeWith'];
  const store = loadStore();
  const meta = { ...(store.meta[id] || {}) };
  const local = store.local.find((x) => x.id === id);
  const gname = (local && local.name) || ((cache || []).find((x) => x.id === id) || {}).name || id;
  for (const k of allowed) {
    if (!(k in patch)) continue;
    let v = patch[k];
    if (k === 'logoPos' && !['left', 'center', 'right'].includes(v)) v = null;
    if (k === 'colorMode' && v !== 'theme') v = null;
    if (k === 'logoSize') v = Number.isFinite(v) ? Math.min(700, Math.max(40, Math.round(v))) : null;
    if (k === 'logoX' || k === 'logoY') v = Number.isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : null;
    if (k === 'customTrailer') { // tráiler propio: { kind:'file', path } (vídeo del PC) o { kind:'link', url }
      if (v && v.kind === 'file' && typeof v.path === 'string' && /\.(mp4|webm|m4v|mov|ogv)$/i.test(v.path)) v = { kind: 'file', path: media.toToken(userDir(), 'trailer', v.path, gname) };
      else if (v && v.kind === 'link' && /^https?:\/\//i.test(String(v.url || ''))) v = { kind: 'link', url: String(v.url).trim() };
      else v = null;
    }
    if (k === 'logoOff') v = v === true ? true : null;
    if (k === 'prefer' || k === 'noMerge') v = v === true ? true : null;
    if (k === 'mergeWith') v = typeof v === 'string' && v && v.length < 300 && v !== id ? v : null;
    if (k === 'status') v = ['backlog', 'playing', 'done', 'dropped'].includes(v) ? v : null;
    if (k === 'tags') { // etiquetas propias: texto corto, sin repetir (sin distinguir mayúsculas), hasta 12
      const seen = new Set(), out = [];
      for (const t of Array.isArray(v) ? v : []) {
        const x = String(t || '').replace(/\s+/g, ' ').trim().slice(0, 24);
        if (x && !seen.has(x.toLowerCase())) { seen.add(x.toLowerCase()); out.push(x); }
      }
      v = out.length ? out.slice(0, 12) : null;
    }
    if (IMG_KEYS.includes(k) && typeof v === 'string') v = media.toToken(userDir(), k, v, gname);
    if (k === 'cover' && local) { local.cover = v || null; continue; }
    if (v === null || v === '') delete meta[k]; // vuelve al valor por defecto
    else meta[k] = v;
  }
  store.meta[id] = meta;
  saveStore(store);
  return true;
});

// Icono real del ejecutable (para juegos locales y de Epic que no tienen portada)
const iconCache = new Map();
ipcMain.handle('game:icon', async (_e, id) => {
  const g = cache.find((x) => x.id === id);
  if (!g || !g.exe || !fs.existsSync(g.exe)) return null;
  if (iconCache.has(g.exe)) return iconCache.get(g.exe);
  try {
    const img = await app.getFileIcon(g.exe, { size: 'large' });
    const url = img.isEmpty() ? null : img.toDataURL();
    iconCache.set(g.exe, url);
    return url;
  } catch {
    return null;
  }
});

// ---------- Juegos gratis (Epic y Steam) ----------
const FREE_TTL = 60 * 60 * 1000;
let freeMem = null, freeBusy = null;
const freeFile = () => path.join(app.getPath('userData'), 'free-games.json');
async function netJson(url) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await net.fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 Comptus', 'Accept-Language': 'es' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
function freeCountry() {
  const forced = loadStore().settings.freeCountry;
  if (typeof forced === 'string' && /^[A-Za-z]{2}$/.test(forced)) return forced.toUpperCase();
  let tz = null; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch {}
  return freegames.countryFromTimeZone(tz) || (app.getLocaleCountryCode && app.getLocaleCountryCode()) || 'US';
}
async function getFree(force) {
  const country = freeCountry();
  if (!freeMem) { try { freeMem = JSON.parse(fs.readFileSync(freeFile(), 'utf8')); if (freeMem && freeMem.v !== 4) freeMem = null; } catch { freeMem = null; } }
  const fresh = freeMem && Date.now() - freeMem.updated < FREE_TTL && !force && freeMem.country === country;
  if (!fresh) {
    if (!freeBusy) freeBusy = (async () => {
      const locale = `${(app.getLocale() || 'es').split(/[-_]/)[0]}-${country}`;
      const r = await freegames.fetchAll(netJson, locale, Date.now(), country);
      // si una tienda falló pero había datos recientes de ella, se conservan
      if (freeMem && freeMem.country === country) for (const k of ['epic', 'steam', 'other']) if (r.errors[k] && freeMem[k]) { r[k] = freeMem[k]; r.stale = true; }
      r.v = 4; freeMem = r; try { fs.writeFileSync(freeFile(), JSON.stringify(r)); } catch { /* sin caché en disco */ }
    })().finally(() => { freeBusy = null; });
    await freeBusy;
  }
  const lib = (cache && cache.length) ? cache : [];
  const now = Date.now();
  const live = (arr) => (arr || []).filter((x) => !x.end || x.end > now);
  return { epic: freegames.markOwned(live(freeMem.epic), lib), steam: freegames.markOwned(live(freeMem.steam), lib), other: freegames.markOwned(live(freeMem.other), lib), errors: freeMem.errors || {}, updated: freeMem.updated, stale: !!freeMem.stale, country: freeMem.country || country, auto: !/^[A-Za-z]{2}$/.test(loadStore().settings.freeCountry || '') };
}
ipcMain.handle('free:get', async (_e, force) => { try { return await getFree(!!force); } catch (e) { return { epic: [], steam: [], errors: { all: String((e && e.message) || e) }, updated: 0 }; } });
// Abre la oferta en la aplicación de Epic o de Steam; si no está instalada o falla, en el navegador
// La dirección de la aplicación se deduce de la web si falta (datos guardados por versiones anteriores)
function appUrlFor(web) {
  let m = /^https:\/\/store\.steampowered\.com\/app\/(\d+)/.exec(String(web));
  if (m) return `steam://store/${m[1]}`;
  m = /^https:\/\/store\.epicgames\.com\/[\w-]+\/p\/([\w-]+)/.exec(String(web));
  if (m) return `com.epicgames.launcher://store/p/${m[1]}`;
  if (/^https:\/\/store\.epicgames\.com\/[\w-]+\/free-games/.test(String(web))) return 'com.epicgames.launcher://store/free-games';
  return null;
}
ipcMain.handle('free:open', async (_e, web, app0) => {
  const app_ = app0 || appUrlFor(web);
  const okWeb = /^https:\/\/(store\.epicgames\.com|store\.steampowered\.com|www\.gamerpower\.com)\//.test(String(web));
  const okApp = /^(steam:\/\/store\/\d+|com\.epicgames\.launcher:\/\/store\/(p\/[\w-]+|free-games))$/.test(String(app_));
  if (okApp) { try { await shell.openExternal(app_); return { ok: true, via: 'app' }; } catch { /* sin la aplicación: se abre la web */ } }
  if (okWeb) { await shell.openExternal(web); return { ok: true, via: 'web' }; }
  return { ok: false };
});


// ---------- Lista de deseados (Steam y Epic) ----------
const WISH_TTL = 60 * 60 * 1000;
let wishMem = null, wishBusy = null;
const wishFile = () => path.join(app.getPath('userData'), 'wishlist.json');
const wishSeenFile = () => path.join(app.getPath('userData'), 'wish-seen.json');
async function getWish(force) {
  const country = freeCountry();
  if (!wishMem) { try { wishMem = JSON.parse(fs.readFileSync(wishFile(), 'utf8')); if (wishMem && wishMem.v !== 2) wishMem = null; } catch { wishMem = null; } }
  // si una tienda enlazada falló o salió vacía, se reintenta pronto (5 min) en vez de esperar una hora
  const bad = wishMem && ((wishMem.errors && (wishMem.errors.steam || wishMem.errors.epic)) || (wishMem.linked && wishMem.linked.epic && !(wishMem.epic || []).length));
  const fresh = wishMem && Date.now() - wishMem.updated < (bad ? 5 * 60 * 1000 : WISH_TTL) && !force && wishMem.country === country;
  if (!fresh) {
    if (!wishBusy) wishBusy = (async () => {
      const st = loadStore();
      const lang = (app.getLocale() || 'es').split(/[-_]/)[0];
      const prev = wishMem && wishMem.country === country ? wishMem : null;
      const r = { v: 2, updated: Date.now(), country, steam: [], epic: [], errors: {}, linked: {} };
      let sid = null; try { sid = await resolveSteamId(st.settings); } catch { /* sin Steam */ }
      r.linked.steam = !!sid;
      if (sid) {
        const x = await wishlist.fetchSteamWishlist({ steamId: sid, country, lang, getJson });
        if (x.items) r.steam = x.items; else { r.errors.steam = x.error; if (prev) r.steam = prev.steam || []; }
      }
      r.linked.epic = !!loadEpicAuth(st);
      if (r.linked.epic) {
        const a = await epicAuthed();
        if (!a.auth) r.errors.epic = a.error;
        else {
          const x = await wishlist.fetchEpicWishlist({ auth: a.auth, request: epicRequest, country, locale: `${lang === 'es' ? 'es-ES' : 'en-US'}` });
          if (x.items) { r.epic = x.items; if (!x.items.length && x.diag) r.errors.epicDiag = x.diag; } else { r.errors.epic = x.error; if (prev) r.epic = prev.epic || []; }
        }
      }
      wishMem = r; try { fs.writeFileSync(wishFile(), JSON.stringify(r)); } catch { /* sin caché */ }
    })().finally(() => { wishBusy = null; });
    await wishBusy;
  }
  const lib = (cache && cache.length) ? cache : [];
  const mk = (a) => freegames.markOwned(a || [], lib);
  return { steam: mk(wishMem.steam), epic: mk(wishMem.epic), errors: wishMem.errors || {}, linked: wishMem.linked || {}, updated: wishMem.updated, country: wishMem.country };
}
ipcMain.handle('wish:get', async (_e, force) => { try { return await getWish(!!force); } catch (e) { return { steam: [], epic: [], errors: { all: String((e && e.message) || e) }, linked: {}, updated: 0 }; } });
// Avisa cuando un juego de tu lista de deseados baja de precio o se vuelve gratis
// Avisos: con el modo consola abierto se muestran dentro de él (las notificaciones de Windows no se ven en pantalla completa)
// Windows no sabe cómo se llama la app (la versión portable no se registra y el instalador no crea su acceso directo con el identificador),
// así que en las notificaciones enseña el identificador interno («com.mateo.gamelauncher»). Se registra aquí el nombre y el icono
// para ese identificador (HKCU, sin permisos de administrador); vale para el instalador, el portable y la versión instalada ya existente.
function registerToastIdentity() {
  if (process.platform !== 'win32' || !app.isPackaged) return;
  try {
    const key = 'HKCU\\Software\\Classes\\AppUserModelId\\com.mateo.gamelauncher';
    const add = (name, value) => execFile('reg', ['add', key, '/v', name, '/t', 'REG_SZ', '/d', value, '/f'], { windowsHide: true }, () => {});
    add('DisplayName', 'Comptus');
    const src = [path.join(__dirname, 'build', 'icon.png'), path.join(__dirname, 'renderer', 'icon.png')].find((p) => { try { return fs.existsSync(p); } catch { return false; } });
    if (src) { const dst = path.join(app.getPath('userData'), 'toast-icon.png'); try { fs.copyFileSync(src, dst); add('IconUri', dst); } catch {} }
  } catch { /* sin registro: las notificaciones salen con el identificador, como antes */ }
}
function sendNotice(kind, o, open) {
  try { if (win && !win.isDestroyed()) win.webContents.send('app:notice', { kind, title: o.title, body: o.body, open }); } catch {} // historial de avisos del modo escritorio
  try { if (couchOn && win && !win.isDestroyed() && win.isVisible() && !win.isMinimized()) { win.webContents.send('couch:notice', { kind, title: o.title, body: o.body }); return; } } catch {}
  // Jugando en pantalla completa (con o sin bordes): el aviso sale sobre el juego con el overlay, sin quitarle el foco
  try { if (fgGame && overlayOn() && !(overlay && !overlay.isDestroyed() && overlay.isVisible() && overlayMode === 'panel')) { showToast(`${o.title}\n${o.body || ''}`.trim(), 6500, 104); return; } } catch {}
  if (!(Notification && Notification.isSupported())) return;
  const n = new Notification({ title: o.title, body: o.body, silent: false });
  n.on('click', () => { showMain(); sendWin(open); });
  n.show();
}
async function checkWishNotify() {
  try {
    if (loadStore().settings.wishNotify === false) return 0;
    const d = await getWish(false);
    const all = [...d.steam, ...d.epic];
    if (!all.length) return 0;
    let st = { keys: [], seeded: false };
    try { st = { keys: [], seeded: false, ...JSON.parse(fs.readFileSync(wishSeenFile(), 'utf8')) }; } catch { /* primera vez */ }
    const seen = new Set(st.keys);
    const fresh = wishlist.newSales(all, seen);
    const toNotify = st.seeded ? fresh : [];
    for (const it of all) if (it.discount > 0) seen.add(wishlist.wishKey(it));
    try { fs.writeFileSync(wishSeenFile(), JSON.stringify({ seeded: true, keys: [...seen].slice(-600) })); } catch { /* sin permiso */ }
    if (toNotify.length) {
      const one = toNotify.length === 1 ? toNotify[0] : null;
      sendNotice('wish', {
        title: one ? (one.free ? 'Un juego de tu lista de deseados es gratis' : `Rebaja en tu lista de deseados (−${one.discount} %)`) : `${toNotify.length} juegos de tu lista de deseados están en oferta`,
        body: one ? `${one.title} · ${one.price}` : toNotify.slice(0, 4).map((x) => `${x.title} (−${x.discount} %)`).join(', ') + (toNotify.length > 4 ? '…' : ''),
      }, 'open:wish');
    }
    return toNotify.length;
  } catch (e) { if (process.env.COMPTUS_DEBUG) console.error('wish check', e); return 0; }
}
ipcMain.handle('wish:check', () => checkWishNotify());
ipcMain.handle('friends:open', async (_e, url) => {
  if (!/^https:\/\/steamcommunity\.com\/(id|profiles)\/[\w-]+\/?$/.test(String(url))) return { ok: false };
  try { await shell.openExternal('steam://openurl/' + url); return { ok: true, via: 'app' }; } catch { /* a la web */ }
  await shell.openExternal(url); return { ok: true, via: 'web' };
});
// Amigos de Steam: se consulta como mucho cada 2 min (o al forzar)
let friendsMem = null, friendsBusy = null;
ipcMain.handle('friends:get', async (_e, force) => {
  try {
    if (!force && friendsMem && Date.now() - friendsMem.at < 2 * 60 * 1000) return friendsMem.res;
    if (!friendsBusy) friendsBusy = (async () => {
      const st = loadStore();
      let sid = null; try { sid = await resolveSteamId(st.settings); } catch { /* sin Steam */ }
      const res = await fetchFriends({ steamId: sid, key: st.settings.steamKey, getJson });
      friendsMem = { at: Date.now(), res };
      return res;
    })().finally(() => { friendsBusy = null; });
    return await friendsBusy;
  } catch (e) { return { ok: false, code: 'net', error: String((e && e.message) || e) }; }
});

// Perfil de Steam propio (avatar, nombre, estado, nivel, código de amigo y cuenta local)
let profMem = null;
ipcMain.handle('profile:get', async (_e, force) => {
  try {
    if (!force && profMem && Date.now() - profMem.at < 60 * 1000) return profMem.res;
    const st = loadStore(); const key = String(st.settings.steamKey || '').trim();
    let sid = null; try { sid = await resolveSteamId(st.settings); } catch { /* sin Steam */ }
    if (!sid) return { ok: false, code: 'nosteam' };
    const out = { ok: true, id: String(sid), friendCode: String(BigInt(sid) - 76561197960265728n), account: '', name: '', avatar: '', state: 0, level: null, url: 'https://steamcommunity.com/profiles/' + sid, hasKey: !!key };
    try { if (steamPathCache === undefined) steamPathCache = await findSteamPath().catch(() => null); if (steamPathCache) { const t = fs.readFileSync(path.join(steamPathCache, 'config', 'loginusers.vdf'), 'utf8'); const re = /"(\d{17})"\s*\{([^}]*)\}/g; let mm; while ((mm = re.exec(t))) if (mm[1] === String(sid)) { const a = /"AccountName"\s+"([^"]*)"/.exec(mm[2]), p = /"PersonaName"\s+"([^"]*)"/.exec(mm[2]); out.account = a ? a[1] : ''; out.name = p ? p[1] : ''; } } } catch { /* sin loginusers */ }
    if (key) {
      try { const r = await getJson(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${encodeURIComponent(key)}&steamids=${sid}`); const p = r && r.response && r.response.players && r.response.players[0]; if (p) { out.name = p.personaname || out.name; out.avatar = p.avatarfull || p.avatarmedium || ''; out.state = Number(p.personastate) || 0; out.url = p.profileurl || out.url; } } catch { /* sin red */ }
      try { const r = await getJson(`https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/?key=${encodeURIComponent(key)}&steamid=${sid}`); if (r && r.response && r.response.player_level != null) out.level = Number(r.response.player_level); } catch { /* privado */ }
    }
    profMem = { at: Date.now(), res: out }; return out;
  } catch { return { ok: false, code: 'net' }; }
});
const PROFILE_ACTIONS = {
  funds: 'https://store.steampowered.com/steamaccount/addfunds', privacy: 'https://steamcommunity.com/my/edit/settings', account: 'https://store.steampowered.com/account',
  addfriend: 'steam://friends/add', 'status:online': 'steam://friends/status/online', 'status:away': 'steam://friends/status/away', 'status:busy': 'steam://friends/status/busy', 'status:invisible': 'steam://friends/status/invisible', 'status:offline': 'steam://friends/status/offline',
};
ipcMain.handle('profile:action', async (_e, act) => {
  try {
    const u = PROFILE_ACTIONS[String(act)]; if (!u) return { ok: false };
    if (/^steam:\/\//.test(u)) { await shell.openExternal(u); return { ok: true }; }
    try { await shell.openExternal('steam://openurl/' + u); return { ok: true, via: 'app' }; } catch { await shell.openExternal(u); return { ok: true, via: 'web' }; }
  } catch { return { ok: false }; }
});
const friendDetailMem = new Map(), ownersMem = new Map();
ipcMain.handle('friends:detail', async (_e, id) => {
  try {
    id = String(id || ''); if (!/^\d{5,20}$/.test(id)) return { ok: false };
    const c = friendDetailMem.get(id); if (c && Date.now() - c.at < 5 * 60 * 1000) return c.res;
    const key = loadStore().settings.steamKey; if (!String(key || '').trim()) return { ok: false, code: 'nokey' };
    const res = await fetchFriendDetail({ id, key, getJson }); friendDetailMem.set(id, { at: Date.now(), res }); return res;
  } catch { return { ok: false }; }
});
ipcMain.handle('friends:owners', async (_e, appid) => {
  try {
    appid = Number(appid); if (!appid) return { ok: false };
    const c = ownersMem.get(appid); if (c && Date.now() - c.at < 10 * 60 * 1000) return c.res;
    const st = loadStore(); const key = st.settings.steamKey; if (!String(key || '').trim()) return { ok: false, code: 'nokey' };
    let fr = friendsMem && friendsMem.res && friendsMem.res.ok ? friendsMem.res : null;
    if (!fr) { let sid = null; try { sid = await resolveSteamId(st.settings); } catch { /* sin Steam */ } fr = await fetchFriends({ steamId: sid, key, getJson }); friendsMem = { at: Date.now(), res: fr }; }
    if (!fr.ok) return fr;
    const res = await fetchOwners({ appid, friends: fr.friends, key, getJson }); ownersMem.set(appid, { at: Date.now(), res }); return res;
  } catch { return { ok: false }; }
});
ipcMain.handle('friends:chat', async (_e, id) => {
  if (!/^\d{5,20}$/.test(String(id))) return { ok: false };
  try { await shell.openExternal('steam://friends/message/' + id); return { ok: true }; } catch { return { ok: false }; }
});

// ---------- Eventos y rebajas ----------
const EVENTS_URL = 'https://raw.githubusercontent.com/emptystill/Comptus-Launcher-Beta/main/events.json';
let eventsRemote = null, eventsRemoteAt = 0;
const eventsRemoteFile = () => path.join(app.getPath('userData'), 'events-remote.json');
async function getEvents(force) {
  let bundled = [];
  try { bundled = JSON.parse(fs.readFileSync(path.join(__dirname, 'events.json'), 'utf8')).events || []; } catch { /* sin calendario incluido */ }
  if (!eventsRemote) { try { const c = JSON.parse(fs.readFileSync(eventsRemoteFile(), 'utf8')); eventsRemote = c.events || []; eventsRemoteAt = c.at || 0; } catch { eventsRemote = []; } }
  if (force || Date.now() - eventsRemoteAt > 24 * 3600 * 1000) {
    try {
      const j = await netJson(EVENTS_URL);
      if (j && Array.isArray(j.events)) { eventsRemote = j.events; eventsRemoteAt = Date.now(); try { fs.writeFileSync(eventsRemoteFile(), JSON.stringify({ at: eventsRemoteAt, events: eventsRemote })); } catch {} }
    } catch { eventsRemoteAt = Date.now() - 23 * 3600 * 1000; /* sin internet o sin archivo: se reintenta en una hora */ }
  }
  return eventsMod.merge(bundled, eventsRemote);
}
ipcMain.handle('events:get', async (_e, force) => { try { return { events: (await getEvents(!!force)).map((e) => ({ ...e, status: eventsMod.status(e) })) }; } catch { return { events: [] }; } });
ipcMain.handle('events:open', async (_e, url) => {
  if (!/^https:\/\/(store\.steampowered\.com|store\.epicgames\.com)\//.test(String(url))) return { ok: false };
  if (/^https:\/\/store\.steampowered\.com\//.test(url)) { try { await shell.openExternal('steam://openurl/' + url); return { ok: true, via: 'app' }; } catch { /* a la web */ } }
  await shell.openExternal(url); return { ok: true, via: 'web' };
});
const evSeenFile = () => path.join(app.getPath('userData'), 'event-seen.json');
async function checkEventNotify() {
  try {
    if (!sysSettings().eventNotify) return 0;
    let seen = []; try { seen = JSON.parse(fs.readFileSync(evSeenFile(), 'utf8')).keys || []; } catch { /* primera vez */ }
    const due = eventsMod.dueNotices(await getEvents(false), seen);
    if (!due.length) return 0;
    for (const n of due) {
      seen.push(n.key);
      sendNotice('events', eventsMod.noticeText(n), 'open:events');
    }
    try { fs.writeFileSync(evSeenFile(), JSON.stringify({ keys: seen.slice(-200) })); } catch { /* sin permiso */ }
    return due.length;
  } catch (e) { if (process.env.COMPTUS_DEBUG) console.error('event check', e); return 0; }
}
ipcMain.handle('events:check', () => checkEventNotify());

// ---------- Comunidad: tu lista de proyectos de GitHub (ports y descompilaciones) con aviso de versiones nuevas ----------
const communityMod = require('./community');
const communityFile = () => path.join(app.getPath('userData'), 'community.json');
function readCommunity() { try { const j = JSON.parse(fs.readFileSync(communityFile(), 'utf8')); return Array.isArray(j.items) ? j.items : []; } catch { return []; } }
function writeCommunity(items) { try { fs.writeFileSync(communityFile(), JSON.stringify({ items })); } catch { /* sin permiso */ } }
async function communityFeed(repo, kind) {
  const r = await net.fetch(`https://github.com/${repo}/${kind}.atom`, { redirect: 'follow' });
  if (r.status === 404) return { missing: true };
  if (!r.ok) throw new Error('http ' + r.status);
  return { release: communityMod.parseAtom(await r.text()) };
}
async function communityFetchFeed(feedUrl) {
  try {
    const r = await net.fetch(feedUrl, { redirect: 'follow', headers: { 'User-Agent': 'Comptus', Accept: 'application/atom+xml, application/rss+xml, application/xml, text/xml, */*' } });
    if (r.status === 404 || r.status === 410) return { state: 'nofeed', release: null };
    if (!r.ok) throw new Error('http ' + r.status);
    const txt = await r.text();
    if (!/<(feed|rss|rdf:RDF)[\s>]/i.test(txt)) return { state: 'notfeed', release: null };
    const release = communityMod.parseFeed(txt);
    return release ? { state: 'ok', release } : { state: 'norelease', release: null };
  } catch { return { state: 'error', release: null }; }
}
async function communityFetchItem(it) { return it.feed ? communityFetchFeed(it.feed) : communityFetch(it.repo); }
async function communityFetch(repo) {
  try {
    let f = await communityFeed(repo, 'releases');
    if (f.missing) return { state: 'missing', release: null };
    if (!f.release) { try { f = await communityFeed(repo, 'tags'); } catch { f = { release: null }; } } // sin lanzamientos: se mira la última etiqueta
    return f.release ? { state: 'ok', release: f.release } : { state: 'norelease', release: null };
  } catch { return { state: 'error', release: null }; }
}
async function refreshCommunity(force) {
  const items = readCommunity(); let dirty = false;
  for (const it of items) {
    if (!force && it.checkedAt && Date.now() - it.checkedAt < 3 * 3600 * 1000) continue;
    const r = await communityFetchItem(it);
    if (r.state === 'error') { if (!it.release) it.state = 'error'; } else { it.state = r.state; it.release = r.release; }
    it.checkedAt = Date.now(); dirty = true;
  }
  if (dirty) writeCommunity(items);
  return items;
}
function communityView(items) {
  const games = new Set((cache || []).map((g) => g.id));
  return items.map((i) => ({ id: i.id, repo: i.repo || '', kind: i.kind || 'github', label: i.label || i.repo || '', page: i.page || (i.repo ? `https://github.com/${i.repo}` : ''), name: i.name, state: i.state || 'error', release: i.release || null, gameId: i.gameId && games.has(i.gameId) ? i.gameId : null, addedAt: i.addedAt, seen: i.seen || '' }));
}
ipcMain.handle('community:list', async (_e, force) => { try { return { ok: true, items: communityView(await refreshCommunity(!!force)) }; } catch { return { ok: true, items: communityView(readCommunity()) }; } });
ipcMain.handle('community:add', async (_e, input) => {
  const src = communityMod.parseSource(input);
  if (!src) return { ok: false, error: 'No reconozco ese enlace. Puede ser de GitHub (github.com/usuario/proyecto), itch.io, GitLab, Codeberg, SourceForge o la dirección de un feed RSS.' };
  if (src.kind === 'moddb') return { ok: false, error: 'ModDB no tiene un aviso de novedades que Comptus pueda leer por el enlace de la página. Si la página muestra un icono RSS, copia esa dirección y pégala aquí.' };
  const items = readCommunity();
  if (items.some((i) => i.id === src.id)) return { ok: false, error: 'Ese proyecto ya está en tu lista.' };
  const r = src.kind === 'github' ? await communityFetch(src.repo) : await communityFetchFeed(src.feed);
  if (r.state === 'missing') return { ok: false, error: 'No existe ese repositorio en GitHub (o es privado).' };
  if (r.state === 'nofeed') return { ok: false, error: src.kind === 'itch' ? 'Ese juego de itch.io no tiene feed de novedades (el autor no ha publicado ninguna entrada de devlog).' : 'Esa página no ofrece un feed de novedades.' };
  if (r.state === 'notfeed') return { ok: false, error: 'Esa dirección no es un feed RSS o Atom, así que no puedo saber cuándo cambia.' };
  if (r.state === 'error') return { ok: false, error: 'No se pudo comprobar la página ahora. Revisa tu conexión e inténtalo de nuevo.' };
  items.push({ id: src.id, kind: src.kind, repo: src.repo || '', label: src.label, page: src.page, feed: src.feed || '', name: src.name, addedAt: Date.now(), checkedAt: Date.now(), state: r.state, release: r.release, seen: r.release ? r.release.tag : '-', gameId: null });
  writeCommunity(items);
  return { ok: true, items: communityView(items) };
});
ipcMain.handle('community:remove', (_e, id) => { writeCommunity(readCommunity().filter((i) => i.id !== id)); return { ok: true, items: communityView(readCommunity()) }; });
ipcMain.handle('community:open', async (_e, url) => {
  if (!/^https?:\/\/[^\s]+$/.test(String(url))) return { ok: false };
  await shell.openExternal(url); return { ok: true };
});
// Registra como juego el ejecutable del proyecto que ya descargaste (Comptus no descarga nada)
ipcMain.handle('community:link', async (_e, id) => {
  const items = readCommunity(), it = items.find((i) => i.id === id); if (!it) return null;
  const res = await dialog.showOpenDialog(win, { title: 'Elige el ejecutable del proyecto que ya descargaste', properties: ['openFile'], filters: [{ name: 'Ejecutables', extensions: ['exe', 'bat', 'lnk'] }, { name: 'Todos los archivos', extensions: ['*'] }] });
  if (res.canceled || !res.filePaths[0]) return null;
  const exe = res.filePaths[0], store = loadStore();
  let g = store.local.find((x) => x.exe.toLowerCase() === exe.toLowerCase());
  if (!g) { g = { id: `local:${randomUUID()}`, name: it.name, exe, args: '', cover: null }; store.local.push(g); saveStore(store); }
  it.gameId = g.id; writeCommunity(items);
  return g;
});
// Aviso cuando un proyecto de tu lista saca una versión distinta a la que ya viste
async function checkCommunityNotify() {
  try {
    const items = await refreshCommunity(true);
    const fresh = communityMod.changed(items);
    for (const it of items) if (it.release) it.seen = it.release.tag;
    writeCommunity(items);
    for (const f of fresh) sendNotice('community', { title: `Novedad en ${f.name}`, body: (f.feed ? 'Nueva publicación: ' : 'Nueva versión: ') + f.release.tag }, 'open:community');
    return fresh.length;
  } catch (e) { if (process.env.COMPTUS_DEBUG) console.error('community check', e); return 0; }
}
ipcMain.handle('community:check', () => checkCommunityNotify());

// Avisos de juegos gratis nuevos (mientras Comptus esté abierto, también en la bandeja)
const seenFile = () => path.join(app.getPath('userData'), 'free-seen.json');
let freeNotifTimer = null;
async function checkFreeNotify() {
  try {
    const s = sysSettings();
    if (!s.freeNotify) return;
    const d = await getFree(false);
    if (d.errors && d.errors.all) return;
    const all = [...d.epic, ...d.steam, ...(d.other || [])];
    let st = { keys: [], seeded: false };
    try { st = { keys: [], seeded: false, ...JSON.parse(fs.readFileSync(seenFile(), 'utf8')) }; } catch { /* primera vez */ }
    const seen = new Set(st.keys);
    const fresh = freegames.newOffers(all, seen, { dlc: s.freeNotifyDlc });
    // la primera comprobación solo anota lo que ya había: no avisa de ofertas que ya estaban publicadas
    const toNotify = st.seeded ? fresh : [];
    for (const it of all) seen.add(freegames.offerKey(it));
    try { fs.writeFileSync(seenFile(), JSON.stringify({ seeded: true, keys: [...seen].slice(-400) })); } catch { /* sin permiso */ }
    if (toNotify.length) { sendNotice('free', freegames.notifText(toNotify), 'open:free'); return toNotify.length; }
  } catch (e) { if (process.env.COMPTUS_DEBUG) console.error('free check', e); }
  return 0;
}
ipcMain.handle('free:check', () => checkFreeNotify()); // (también lo usan las pruebas)
function startFreeNotify() {
  clearInterval(freeNotifTimer);
  setTimeout(() => { checkFreeNotify(); checkEventNotify(); checkWishNotify(); checkCommunityNotify(); }, 30000);
  freeNotifTimer = setInterval(() => { checkFreeNotify(); checkEventNotify(); checkWishNotify(); checkCommunityNotify(); }, 3 * 3600 * 1000);
}

// ---------- Espacio en disco ----------
// Se mide en segundo plano (carpetas de los juegos instalados de cualquier tienda) y se avisa a la ventana al terminar
async function startDiskScan(force) {
  const games = (cache && cache.length) ? cache : await getLibrary();
  const ds = diskStore();
  if (ds.state().scanning) return false;
  sendWin('disk:changed', { scanning: true });
  try { await ds.scan(games, { force, onProgress: () => sendWin('disk:changed', { scanning: true, sizes: ds.all() }) }); }
  catch { /* se reintenta la próxima vez */ }
  sendWin('disk:changed', { scanning: false, sizes: ds.all() });
  return true;
}
ipcMain.handle('disk:get', () => ({ sizes: diskStore().all(), scanning: diskStore().state().scanning }));
ipcMain.handle('disk:scan', (_e, force) => { startDiskScan(!!force).catch(() => {}); return true; });

// ---------- Ubicación, desinstalar y abrir el launcher ----------
ipcMain.handle('game:openLocation', async (_e, id) => {
  const g = cache.find((x) => x.id === id);
  if (!g) return { ok: false, error: 'Juego no encontrado' };
  if (g.installPath && fs.existsSync(g.installPath)) {
    const err = await shell.openPath(g.installPath);
    return err ? { ok: false, error: err } : { ok: true };
  }
  if (g.exe && fs.existsSync(g.exe)) {
    shell.showItemInFolder(g.exe); // abre la carpeta con el ejecutable seleccionado
    return { ok: true };
  }
  return { ok: false, error: 'No se encontró la carpeta del juego.' };
});

function findUninstaller(dir) {
  try {
    const f = fs.readdirSync(dir).find((n) => /^unins\d*\.exe$/i.test(n));
    return f ? path.join(dir, f) : null;
  } catch {
    return null;
  }
}

async function openLauncher(sourceId) {
  const p = providers.find((x) => x.id === sourceId);
  if (!p || !p.openUri) return { ok: false, error: 'No se sabe cómo abrir este launcher.' };
  try {
    await shell.openExternal(p.openUri);
    return { ok: true };
  } catch {
    return { ok: false, error: `No se pudo abrir ${p.name}. ¿Está instalado?` };
  }
}
ipcMain.handle('launcher:open', (_e, sourceId) => openLauncher(sourceId));

// No borramos nada nosotros: abrimos el desinstalador oficial para que confirmes allí
// Instalaciones en curso (para el modo consola): Steam trae el porcentaje real; Epic solo indica que está instalando
let instDirs = null, instDirsAt = 0;
ipcMain.handle('installs:get', async () => {
  const out = [];
  try {
    if (!instDirs || Date.now() - instDirsAt > 60000) { const sp = await findSteamPath(); instDirs = sp ? readLibraryFolders(sp).map((l) => path.join(l, 'steamapps')) : []; instDirsAt = Date.now(); }
    for (const d of instDirs) {
      let files = []; try { files = fs.readdirSync(d).filter((f) => /^appmanifest_\d+\.acf$/.test(f)); } catch { continue; }
      for (const f of files) {
        let t; try { t = fs.readFileSync(path.join(d, f), 'utf8'); } catch { continue; }
        const num = (k) => parseInt((t.match(new RegExp('"' + k + '"\\s+"(\\d+)"')) || [])[1] || '0', 10);
        const flags = num('StateFlags');
        if ((flags & 4) || (flags & 2048) || !(flags & (2 | 256 | 512 | 1024))) continue; // solo instalaciones nuevas en marcha o en pausa
        const tot = num('BytesToDownload') + num('BytesToStage'), got = num('BytesDownloaded') + num('BytesStaged');
        out.push({ id: 'steam:' + f.match(/\d+/)[0], pct: tot > 0 ? Math.max(0, Math.min(99, Math.round(got / tot * 100))) : null, paused: !!(flags & 512) });
      }
    }
  } catch {}
  try {
    const dir = epicManifestsDir();
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.item'))) {
      let it; try { it = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
      if (!it.bIsIncompleteInstall) continue;
      const cats = Array.isArray(it.AppCategories) ? it.AppCategories : []; if (cats.length && !cats.includes('games')) continue;
      const an = it.MainGameAppName || it.AppName; if (an) out.push({ id: 'epic:' + an, pct: null, paused: false });
    }
  } catch {}
  return out;
});

ipcMain.handle('game:uninstall', async (_e, id) => {
  const g = cache.find((x) => x.id === id);
  if (!g) return { ok: false, error: 'Juego no encontrado' };
  if (g.source === 'steam' && g.appid) {
    await shell.openExternal(`steam://uninstall/${g.appid}`);
    return { ok: true, message: 'Steam te pedirá confirmar la desinstalación.' };
  }
  const dir = g.installPath || (g.exe && path.dirname(g.exe));
  const unins = dir && findUninstaller(dir);
  if (unins) {
    shell.openPath(unins); // openPath permite que Windows pida permisos de administrador
    return { ok: true, message: 'Se abrió el desinstalador del juego.' };
  }
  if (g.source === 'epic') {
    await openLauncher('epic');
    return { ok: true, message: 'Desinstálalo desde tu Biblioteca en Epic Games Launcher (menú ⋯ del juego).' };
  }
  await shell.openExternal('ms-settings:appsfeatures');
  return { ok: true, message: `Busca "${g.name}" en la lista de aplicaciones y pulsa Desinstalar.` };
});

// ---------- Miniaturas (para sacar los colores de portadas y banners) ----------
// Se hace aquí para evitar problemas de permisos al leer imágenes remotas o locales desde la página.
const thumbCache = new Map();
ipcMain.handle('image:thumb', async (_e, src) => {
  if (!src) return null;
  if (thumbCache.has(src)) return thumbCache.get(src);
  let url = null;
  try {
    let img;
    if (/^https?:/i.test(src)) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      try {
        const res = await net.fetch(src, { signal: ctrl.signal });
        if (!res.ok) throw new Error('http ' + res.status);
        img = nativeImage.createFromBuffer(Buffer.from(await res.arrayBuffer()));
      } finally {
        clearTimeout(timer);
      }
    } else {
      img = nativeImage.createFromPath(src);
    }
    if (img && !img.isEmpty()) url = img.resize({ width: 64, quality: 'good' }).toDataURL();
  } catch {
    url = null;
  }
  if (url) thumbCache.set(src, url);
  return url;
});

// ---------- Imágenes propias reducidas ----------
// Las imágenes que eliges (portadas, banners, iconos) pueden ser enormes (4K, webp animados…) y cargarlas
// a tamaño completo en cada tarjeta ralentiza todo. Se guardan versiones pequeñas en una caché en disco:
// aquí solo se decide si hace falta una (y dónde), y la página la genera y la guarda.
const IMG_CACHE = path.join(app.getPath('userData'), 'imgcache');
// ¿Es una imagen animada? (webp con fotogramas, gif o png animado); se mira solo el comienzo del archivo
function isAnimatedImage(file) {
  try {
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(4096);
    const n = fs.readSync(fd, buf, 0, 4096, 0);
    fs.closeSync(fd);
    const b = buf.subarray(0, n);
    if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return b.includes('ANIM');
    if (b.toString('ascii', 0, 3) === 'GIF') return true;
    if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return b.includes('acTL');
  } catch { /* se trata como estática */ }
  return false;
}
ipcMain.handle('img:small', (_e, src, width, fmt, still) => {
  try {
    if (typeof src !== 'string' || !path.isAbsolute(src)) return { path: src };
    const st = fs.statSync(src);
    const animated = isAnimatedImage(src);
    if (st.size < 150 * 1024 && !(still && animated)) return { path: src, animated }; // ya es ligera
    const ext = fmt === 'png' ? 'png' : 'jpg';
    const key = createHash('sha1').update(`${src}|${st.mtimeMs}|${st.size}|${width}|${ext}|${still ? 's' : ''}`).digest('hex');
    const out = path.join(IMG_CACHE, `${key}.${ext}`);
    return fs.existsSync(out) ? { path: out, animated } : { need: true, out, animated };
  } catch { return { path: src }; }
});

// Portadas horizontales de una sola imagen (banner + logo ya unidos): ruta de la ya hecha o dónde guardarla
ipcMain.handle('img:comp', (_e, banner, logo, variant) => {
  try {
    if (![banner, logo].every((x) => typeof x === 'string' && path.isAbsolute(x))) return null;
    const a = fs.statSync(banner), b = fs.statSync(logo);
    const key = createHash('sha1').update(`comp2|${banner}|${a.mtimeMs}|${a.size}|${logo}|${b.mtimeMs}|${b.size}|${variant}`).digest('hex');
    const out = path.join(IMG_CACHE, `${key}.jpg`);
    return fs.existsSync(out) ? { path: out } : { need: true, out };
  } catch { return null; }
});
ipcMain.handle('img:store', (_e, out, dataUrl) => {
  try {
    if (typeof out !== 'string' || path.dirname(path.resolve(out)) !== path.resolve(IMG_CACHE) || !/\.(jpg|png)$/.test(out)) return false;
    const m = /^data:image\/(?:jpeg|png);base64,(.+)$/.exec(String(dataUrl || ''));
    if (!m) return false;
    fs.mkdirSync(IMG_CACHE, { recursive: true });
    fs.writeFileSync(out, Buffer.from(m[1], 'base64'));
    return true;
  } catch { return false; }
});

// Copia en disco las imágenes de las tiendas (Steam, Epic…) para no volver a descargarlas en cada arranque:
// devuelve al instante las que ya están y baja las demás en segundo plano (4 a la vez); al terminar avisa a la ventana.
const REMOTE_DIR = () => path.join(app.getPath('userData'), 'img-remote');
const remoteQueue = []; const remoteBusy = new Set(); let remoteActive = 0, remoteGot = 0;
const remoteFile = (url) => path.join(REMOTE_DIR(), createHash('sha1').update(url).digest('hex') + (/\.(png|webp|gif)(\?|$)/i.test(url) ? '.' + /\.(png|webp|gif)(\?|$)/i.exec(url)[1].toLowerCase() : '.jpg'));
async function remotePump() {
  while (remoteActive < 4 && remoteQueue.length) {
    const url = remoteQueue.shift(); remoteActive++;
    (async () => {
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 20000);
      try {
        const r = await net.fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Comptus' } });
        const ct = r.headers && r.headers.get ? String(r.headers.get('content-type') || '') : 'image/';
        if (r.ok && /^image\//i.test(ct)) {
          const buf = Buffer.from(await r.arrayBuffer());
          if (buf.length > 200 && buf.length < 15 * 1024 * 1024) { fs.mkdirSync(REMOTE_DIR(), { recursive: true }); fs.writeFileSync(remoteFile(url), buf); remoteGot++; }
        }
      } catch { /* se reintenta en el próximo arranque */ } finally {
        clearTimeout(t); remoteBusy.delete(url); remoteActive--;
        if (!remoteQueue.length && !remoteActive && remoteGot > 0) { remoteGot = 0; sendWin('imgremote:done'); } else remotePump();
      }
    })();
  }
}
ipcMain.handle('img:remote', (_e, urls) => {
  const out = {};
  if (!Array.isArray(urls)) return out;
  for (const u of urls.slice(0, 5000)) {
    if (typeof u !== 'string' || !/^https:\/\//i.test(u) || u.length > 600) continue;
    const f = remoteFile(u);
    if (fs.existsSync(f)) out[u] = f;
    else if (!remoteBusy.has(u)) { remoteBusy.add(u); remoteQueue.push(u); }
  }
  remotePump();
  return out;
});

// ---------- Información del juego (descripción, desarrollador, capturas…) ----------
async function getJson(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await net.fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw Object.assign(new Error('http ' + res.status), { status: res.status });
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function postJson(url, body, headers = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await net.fetch(url, { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    if (res.status === 456 || res.status === 429) throw Object.assign(new Error('quota'), { code: 'quota' });
    if (res.status === 403 || res.status === 401) throw Object.assign(new Error('auth'), { code: 'auth' });
    if (!res.ok) throw new Error('http ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Traduce la descripción de `info` (si está en inglés) y devuelve { descriptionEs } o { error }
async function translateInfo(info) {
  const { deeplKey } = loadStore().settings;
  try {
    const r = await translateText(info.description, { from: 'en', to: 'es', deeplKey, getJson, postJson });
    return r.text ? { descriptionEs: r.text, provider: r.provider } : { error: 'No hay texto para traducir.' };
  } catch (e) {
    return { error: explain(e, !!deeplKey) };
  }
}

// `term` es opcional: un nombre, un appid o el enlace de la tienda (búsqueda manual)
ipcMain.handle('info:fetch', async (_e, id, term, auto) => {
  const g = cache.find((x) => x.id === id);
  if (!g) return { ok: false, error: 'Juego no encontrado' };
  const res = await fetchInfo(g, { getJson, term, rawgKey: loadStore().settings.rawgKey || '' });
  if (res.info) {
    let translateError = null;
    if (res.info.lang === 'en' && res.info.description && loadStore().settings.autoTranslate !== false) {
      const tr = await translateInfo(res.info);
      if (tr.descriptionEs) { res.info.descriptionEs = tr.descriptionEs; res.info.translatedBy = tr.provider; } else translateError = tr.error;
    }
    updateMeta(id, { info: res.info, infoTried: Date.now() });
    return { ok: true, info: res.info, translateError };
  }
  if (auto) updateMeta(id, { infoTried: Date.now(), infoErr: res.error || '' }); // no insistir solo; queda el botón manual
  return { ok: false, error: res.error };
});
ipcMain.handle('info:translate', async (_e, id) => {
  const info = (loadStore().meta[id] || {}).info;
  if (!info || !info.description) return { ok: false, error: 'Este juego no tiene descripción que traducir.' };
  const tr = await translateInfo(info);
  if (!tr.descriptionEs) return { ok: false, error: tr.error };
  updateMeta(id, { info: { ...info, descriptionEs: tr.descriptionEs, translatedBy: tr.provider } });
  return { ok: true };
});
ipcMain.handle('info:edit', (_e, id, patch) => {
  const store = loadStore();
  const meta = { ...(store.meta[id] || {}) };
  const edit = cleanEdit(patch);
  if (Object.keys(edit).length) meta.infoEdit = edit; else delete meta.infoEdit;
  store.meta[id] = meta;
  saveStore(store);
  return true;
});
ipcMain.handle('info:clear', (_e, id) => {
  const store = loadStore();
  const meta = { ...(store.meta[id] || {}) };
  delete meta.info;
  delete meta.infoEdit;
  meta.infoTried = Date.now();
  store.meta[id] = meta;
  saveStore(store);
  return true;
});

// Solo enlaces web normales (el sitio del juego, la página de la tienda)
ipcMain.handle('link:open', async (_e, url) => {
  if (!/^https?:\/\//i.test(String(url || ''))) return false;
  await shell.openExternal(url);
  return true;
});

// Ajustes generales (tema de colores, tamaño de portadas, fondo)
// Modo consola: pasa la ventana a pantalla completa y, al salir, la deja como estaba
let couchOn = false, couchMoveT = null, couchMoveHooked = false, couchSaved = '';
// Recuerda en qué monitor se usa el modo consola para volver a abrirlo ahí
// Monitor donde está el centro de la ventana (con Win+Mayús+flecha la ventana puede cambiar de monitor sin cambiar aún de tamaño)
function couchWinDisplay() { const b = win.getBounds(); return screen.getDisplayNearestPoint({ x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }); }
function rememberCouchDisplay() {
  if (!couchOn || !win || win.isDestroyed()) return;
  try {
    const d = couchWinDisplay();
    const v = { id: d.id, x: d.bounds.x, y: d.bounds.y, w: d.bounds.width, h: d.bounds.height };
    const key = JSON.stringify(v);
    if (key === couchSaved) return;
    couchSaved = key;
    const store = loadStore();
    store.settings = { ...store.settings, couchDisplay: v };
    saveStore(store);
  } catch {}
}
function savedCouchDisplay() {
  try {
    const v = loadStore().settings?.couchDisplay; if (!v) return null;
    const all = screen.getAllDisplays();
    return all.find((d) => d.id === v.id) || all.find((d) => d.bounds.x === v.x && d.bounds.y === v.y && d.bounds.width === v.w && d.bounds.height === v.h) || null;
  } catch { return null; }
}
// Modo consola: si Windows cambia la resolución del monitor (un juego a pantalla completa la cambia al abrirse y la restaura al cerrarse,
// sobre todo en monitores en vertical) la ventana se queda con el tamaño de antes: cortada a la mitad o con el escritorio a la vista.
// Aquí se vuelve a ajustar al monitor entero en cuanto cambian los monitores, la ventana o termina un juego.
let couchFitting = false, couchFitT = null, couchFitHooked = false, couchFitLog = [], couchGood = null;
function couchTargetDisplay() { try { return savedCouchDisplay() || screen.getDisplayMatching(win.getBounds()); } catch { return null; } }
function refitCouch(force) {
  if (!couchOn || !win || win.isDestroyed() || couchFitting || win.isMinimized() || !win.isVisible()) return;
  try {
    let d = couchTargetDisplay(); if (!d) return;
    const b0 = win.getBounds();
    // Si la persona movió la ventana a otro monitor (Win+Mayús+flecha), se queda allí: se recuerda el nuevo y se ajusta a él
    try { const cur = couchWinDisplay(); if (cur && cur.id !== d.id) { dlog('modo consola: la ventana se movió a otro monitor (' + cur.bounds.width + 'x' + cur.bounds.height + '), se queda allí'); couchGood = null; couchSaved = ''; rememberCouchDisplay(); d = cur; couchFitLog = []; } } catch {}
    let t = d.bounds;
    // Windows a veces sigue diciendo que el monitor es más pequeño mientras un juego mantiene su modo de pantalla: si la ventana quedó más pequeña que cuando entró, se usa ese tamaño
    if (couchGood && (b0.width < couchGood.width - 2 || b0.height < couchGood.height - 2)) t = couchGood;
    else if (win.isFullScreen() && !(couchGood && (b0.width < couchGood.width - 2 || b0.height < couchGood.height - 2)) && (!couchGood || (d.bounds.width * d.bounds.height >= couchGood.width * couchGood.height && Math.abs(b0.width - d.bounds.width) <= 2 && Math.abs(b0.height - d.bounds.height) <= 2))) couchGood = { ...d.bounds };
    const same = (b) => Math.abs(b.x - t.x) <= 2 && Math.abs(b.y - t.y) <= 2 && Math.abs(b.width - t.width) <= 2 && Math.abs(b.height - t.height) <= 2;
    const b = b0;
    if (same(b) && win.isFullScreen() && !force) return;
    const nowT = Date.now(); couchFitLog = couchFitLog.filter((x) => nowT - x < 30000); if (couchFitLog.length >= 6) return; couchFitLog.push(nowT); // como mucho 6 reajustes cada 30 s (evita un bucle si el tamaño no cuadra)
    couchFitting = true;
    try { dlog('modo consola: la ventana ya no coincide con el monitor (' + b.width + 'x' + b.height + ' → ' + t.width + 'x' + t.height + '), se reajusta'); } catch {}
    try { win.setBounds(t); } catch {} // primero se intenta sin salir de pantalla completa (sin parpadeo)
    setTimeout(() => {
      try {
        if (win.isDestroyed() || !couchOn) { couchFitting = false; return; }
        if (same(win.getBounds()) && win.isFullScreen()) { couchFitting = false; return; }
        if (win.isFullScreen()) win.setFullScreen(false); // si no basta, se sale y se vuelve a entrar
        setTimeout(() => {
          try { if (!win.isDestroyed() && couchOn) { win.setBounds(t); win.setFullScreen(true); } } catch {}
          setTimeout(() => { couchFitting = false; }, 500);
        }, 150);
      } catch { couchFitting = false; }
    }, 150);
  } catch { couchFitting = false; }
}
function scheduleCouchFit(delays) { clearTimeout(couchFitT); (delays || [500]).forEach((ms, i) => { const t = setTimeout(() => refitCouch(), ms); if (i === 0) couchFitT = t; }); }
function hookCouchFit() {
  if (couchFitHooked) return; couchFitHooked = true;
  const go = () => { try { const d = couchTargetDisplay(); if (d) dlog('pantalla: ' + d.bounds.width + 'x' + d.bounds.height + ' (escala ' + d.scaleFactor + ') · ventana ' + win.getBounds().width + 'x' + win.getBounds().height); } catch {} scheduleCouchFit([700, 2500]); };
  try { screen.on('display-metrics-changed', go); screen.on('display-added', go); screen.on('display-removed', go); } catch {}
  try { win.on('resize', () => { if (couchOn && !couchFitting) scheduleCouchFit([120]); }); win.on('restore', go); win.on('show', go); win.on('focus', () => { if (couchOn) scheduleCouchFit([100, 800]); }); } catch {}
  // Vigilante: mientras el modo consola está a la vista, cada 0,6 s comprueba que la ventana cubra el monitor (hay cambios que Windows no avisa)
  let lastWhy = 0;
  setInterval(() => { try {
    if (!couchOn || !win || win.isDestroyed()) return;
    const b = win.getBounds(), g = couchGood;
    if (g && (b.width < g.width - 2 || b.height < g.height - 2) && Date.now() - lastWhy > 3000) { lastWhy = Date.now(); dlog('vigilante: ventana ' + b.width + 'x' + b.height + ' < ' + g.width + 'x' + g.height + ' · visible=' + win.isVisible() + ' minimizada=' + win.isMinimized() + ' pantallaCompleta=' + win.isFullScreen() + ' reajustando=' + couchFitting); }
    if (win.isVisible() && !win.isMinimized()) refitCouch();
  } catch {} }, 600);
}
ipcMain.handle('couch:fullscreen', (_e, on, restoreFs) => {
  if (!win || win.isDestroyed()) return { ok: false };
  if (on) {
    const was = win.isFullScreen();
    try {
      const d = savedCouchDisplay();
      if (d) {
        const cur = screen.getDisplayMatching(win.getBounds());
        if (cur.id !== d.id) {
          if (win.isFullScreen()) win.setFullScreen(false);
          if (win.isMaximized()) win.unmaximize();
          if (win.isMinimized()) win.restore();
          const b = d.workArea;
          win.setBounds({ x: b.x + 40, y: b.y + 40, width: Math.min(1100, b.width - 80), height: Math.min(700, b.height - 80) });
        }
      }
    } catch {}
    win.setFullScreen(true); try { win.setMenuBarVisibility(false); } catch {}
    couchOn = true; couchGood = null; hookCouchFit(); setTimeout(() => { try { if (couchOn && win.isFullScreen()) { const d = couchTargetDisplay(); const w = win.getBounds(); if (d && Math.abs(w.width - d.bounds.width) <= 2 && Math.abs(w.height - d.bounds.height) <= 2) couchGood = { ...d.bounds }; } } catch {} }, 1500);
    if (!couchMoveHooked) { couchMoveHooked = true; win.on('move', () => { clearTimeout(couchMoveT); couchMoveT = setTimeout(rememberCouchDisplay, 700); }); }
    setTimeout(rememberCouchDisplay, 900);
    return { ok: true, was };
  }
  rememberCouchDisplay(); couchOn = false; couchGood = null;
  if (!restoreFs) win.setFullScreen(false);
  return { ok: true };
});
// Energía y volumen del equipo (modo consola). Solo acciones de una lista fija.
const POWER = {
  shutdown: ['shutdown.exe', ['/s', '/t', '0']],
  restart: ['shutdown.exe', ['/r', '/t', '0']],
  sleep: ['rundll32.exe', ['powrprof.dll,SetSuspendState', '0,1,0']],
  lock: ['rundll32.exe', ['user32.dll,LockWorkStation']],
};
ipcMain.handle('system:power', (_e, action) => {
  const c = POWER[action]; if (process.platform !== 'win32' || !c) return { ok: false };
  try { flushStore(true); } catch {}
  execFile(c[0], c[1], { windowsHide: true }, () => {});
  return { ok: true };
});
// Teclas multimedia de Windows: 175 sube, 174 baja, 173 silencia (cada pulsación mueve ~2 %)
ipcMain.handle('system:volume', (_e, dir, steps) => {
  const code = { up: 175, down: 174, mute: 173 }[dir]; if (process.platform !== 'win32' || !code) return { ok: false };
  const n = dir === 'mute' ? 1 : Math.max(1, Math.min(25, Math.floor(+steps || 5)));
  const ps = '$w=New-Object -ComObject WScript.Shell; 1..' + n + ' | ForEach-Object { $w.SendKeys([char]' + code + ') }';
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { windowsHide: true }, () => {});
  return { ok: true };
});
ipcMain.handle('app:quitAll', () => { quitting = true; try { flushStore(true); } catch {} app.quit(); return { ok: true }; });
let couchMin = false; // el modo consola se minimizó al iniciar un juego: se restaura al cerrarse
ipcMain.handle('couch:minimize', () => { if (!win || win.isDestroyed()) return { ok: false }; couchMin = true; try { win.minimize(); } catch {} return { ok: true }; });
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('settings:get', () => resolveIn(loadStore().settings));
ipcMain.handle('settings:set', (_e, patch) => {
  const store = loadStore();
  store.settings = { ...store.settings, ...tokenizeIn(patch) };
  saveStore(store);
  if ('overlayAny' in patch) { fgGame = false; dlog('modo «cualquier programa»: ' + (patch.overlayAny ? 'activado' : 'desactivado')); if (fgLast) fgChanged(fgLast, fgLastPid); else registerHotkeys(); }
  if ('overlay' in patch) { if (overlayOn()) startFgWatch(); else stopFgWatch(); registerHotkeys(); }
  if ('overlay' in patch || 'padOverlay' in patch || 'padOverlayBtns' in patch) syncPadWatch();
  return resolveIn(store.settings);
});


// ---------- SteamGridDB: rellena las imágenes que faltan ----------
const sgdbTriedFile = () => path.join(app.getPath('userData'), 'sgdb-tried.json');
const SGDB_RETRY = 14 * 24 * 3600 * 1000; // lo que no se encontró se vuelve a intentar a las 2 semanas
let sgdbRun = null;
async function sgdbJson(url, headers) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await net.fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Comptus', ...(headers || {}) } });
    if (!r.ok) throw Object.assign(new Error('http ' + r.status), { status: r.status });
    return await r.json();
  } finally { clearTimeout(t); }
}
async function sgdbSave(kind, gameName, url) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await net.fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Comptus' } });
    if (!r.ok) return false;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 500 || buf.length > 25 * 1024 * 1024) return false;
    const sub = media.KINDS[kind]; const dir = path.join(media.ensure(userDir()), sub);
    const dest = path.join(dir, (media.safeName(gameName) || 'imagen') + sgdb.extOf(url, r.headers.get('content-type')));
    if (fs.existsSync(dest)) return false; // nunca se pisa nada
    fs.writeFileSync(dest, buf);
    return true;
  } catch { return false; } finally { clearTimeout(t); }
}
async function runSgdb(kinds, silent) {
  const st = loadStore(); const key = String(st.settings.sgdbKey || '').trim();
  if (!key) return { ok: false, error: 'Escribe primero tu clave de SteamGridDB.' };
  if (sgdbRun) return { ok: false, error: 'Ya se están descargando imágenes.' };
  const want = (kinds && kinds.length ? kinds : ['cover', 'banner', 'logo']).filter((k) => sgdb.KINDS[k]);
  const games = await getLibrary();
  let tried = {}; try { tried = JSON.parse(fs.readFileSync(sgdbTriedFile(), 'utf8')) || {}; } catch { /* primera vez */ }
  const replace = (Array.isArray(st.settings.sgdbReplace) ? st.settings.sgdbReplace : []).filter((k) => want.includes(k));
  const todo = sgdb.pending(games, want, tried, Date.now(), SGDB_RETRY, replace);
  if (!todo.length) return { ok: true, total: 0, added: 0 };
  sgdbRun = { cancel: false };
  const res = { total: todo.length, done: 0, added: 0, missed: [], authError: false, canceled: false };
  (async () => {
    const byGame = new Map(); for (const x of todo) { if (!byGame.has(x.game.id)) byGame.set(x.game.id, { game: x.game, kinds: [] }); byGame.get(x.game.id).kinds.push(x.kind); }
    const jobs = [...byGame.values()]; let idx = 0;
    const worker = async () => {
      while (idx < jobs.length && !sgdbRun.cancel && !res.authError) {
        const { game, kinds: ks } = jobs[idx++];
        try {
          const found = await sgdb.findGame({ name: game.name, appid: game.source === 'steam' ? game.appid : (game.info && game.info.source !== 'rawg' ? game.info.appid : null), key, getJson: sgdbJson });
          for (const kind of ks) {
            let ok = false;
            if (found) { const im = await sgdb.findImage({ gameId: found.id, kind, key, getJson: sgdbJson }); if (im) ok = await sgdbSave(kind, game.name, im.url); }
            tried[`${game.id}|${kind}`] = Date.now();
            if (ok) res.added++; else res.missed.push({ name: game.name, kind });
          }
        } catch (e) {
          if (e && (e.status === 401 || e.status === 403)) { res.authError = true; break; }
          /* error de red: se reintentará la próxima vez */
        }
        res.done++;
        if (!silent) sendWin('sgdb:progress', { done: res.done, total: jobs.length, name: game.name, added: res.added });
      }
    };
    await Promise.all([worker(), worker(), worker()]);
    res.canceled = !!sgdbRun.cancel; res.total = jobs.length;
    try { fs.writeFileSync(sgdbTriedFile(), JSON.stringify(tried)); } catch { /* sin permiso */ }
    sgdbRun = null; cache = [];
    sendWin('sgdb:done', { ...res, silent: !!silent });
  })().catch(() => { sgdbRun = null; });
  return { ok: true, total: byGame0(todo) };
}
const byGame0 = (todo) => new Set(todo.map((x) => x.game.id)).size;
const sgdbKinds = () => { const k = loadStore().settings.sgdbKinds; return Array.isArray(k) && k.length ? k : ['cover', 'banner', 'logo']; };
ipcMain.handle('sgdb:test', (_e, key) => sgdb.testKey({ key: String(key || '').trim(), getJson: sgdbJson }));
ipcMain.handle('sgdb:fill', () => runSgdb(sgdbKinds(), false));
ipcMain.handle('sgdb:cancel', () => { if (sgdbRun) sgdbRun.cancel = true; return true; });
// Al abrir Comptus (un minuto después) completa lo que falte, sin avisos
function backgroundSgdb() {
  setTimeout(() => { const s = loadStore().settings; if (s.sgdbKey && s.sgdbAuto !== false) runSgdb(sgdbKinds(), true).catch(() => {}); }, 60000);
}


// ---------- Copia de seguridad ----------
ipcMain.handle('backup:export', async () => {
  const res = await dialog.showSaveDialog(win, {
    title: 'Guardar copia de seguridad de Comptus',
    defaultPath: path.join(media.ensure(userDir()), media.BACKUPS, `comptus-copia-${backup.dayStamp()}.json`),
    filters: [{ name: 'Copia de Comptus', extensions: ['json'] }],
  });
  if (res.canceled || !res.filePath) return { ok: false, canceled: true };
  try {
    flushStore(true);
    const b = backup.buildBackup(loadStore(), app.getVersion());
    fs.writeFileSync(res.filePath, JSON.stringify(b, null, 1));
    return { ok: true, file: res.filePath, games: b.data.local.length, notes: Object.keys(b.data.meta).length };
  } catch (e) { return { ok: false, error: 'No se pudo guardar el archivo: ' + e.message }; }
});
ipcMain.handle('backup:import', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Elige una copia de seguridad de Comptus',
    properties: ['openFile'],
    filters: [{ name: 'Copia de Comptus', extensions: ['json'] }, { name: 'Todos los archivos', extensions: ['*'] }],
  });
  if (res.canceled || !res.filePaths[0]) return { ok: false, canceled: true };
  let data;
  try { data = backup.parseBackup(fs.readFileSync(res.filePaths[0], 'utf8')); } catch (e) { return { ok: false, error: e.message }; }
  const when = data.exportedAt ? new Date(data.exportedAt).toLocaleString('es') : 'fecha desconocida';
  const ask = await dialog.showMessageBox(win, {
    type: 'question',
    title: 'Restaurar copia de seguridad',
    message: `Copia del ${when}: ${data.local.length} juego(s) propios y datos de ${Object.keys(data.meta).length} juego(s).`,
    detail: '«Combinar» conserva lo que tienes y añade/actualiza con la copia. «Reemplazar» deja tus datos exactamente como estaban en la copia. Antes de aplicar se guarda una copia de lo actual.',
    buttons: ['Combinar', 'Reemplazar', 'Cancelar'],
    defaultId: 0,
    cancelId: 2,
  });
  if (ask.response === 2) return { ok: false, canceled: true };
  try {
    flushStore(true);
    const dir = path.join(app.getPath('userData'), 'backups');
    fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(storePath())) fs.copyFileSync(storePath(), path.join(dir, `antes-de-restaurar-${Date.now()}.json`));
    saveStore(backup.applyBackup(loadStore(), data, ask.response === 1 ? 'replace' : 'merge'));
    flushStore(true);
    setTimeout(() => { if (win && !win.isDestroyed()) win.webContents.reload(); }, 400);
    return { ok: true, games: data.local.length, mode: ask.response === 1 ? 'replace' : 'merge' };
  } catch (e) { return { ok: false, error: 'No se pudo restaurar: ' + e.message }; }
});
ipcMain.handle('backup:openFolder', async () => {
  const dir = path.join(app.getPath('userData'), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  await shell.openPath(dir);
  return backup.listAutoBackups(app.getPath('userData')).length;
});

ipcMain.handle('local:add', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Elige el ejecutable del juego',
    properties: ['openFile'],
    filters: [
      { name: 'Ejecutables', extensions: ['exe', 'bat', 'lnk'] },
      { name: 'Todos los archivos', extensions: ['*'] },
    ],
  });
  if (res.canceled || !res.filePaths[0]) return null;

  const exe = res.filePaths[0];
  const store = loadStore();
  if (store.local.some((g) => g.exe.toLowerCase() === exe.toLowerCase())) return { duplicate: true };

  const game = {
    id: `local:${randomUUID()}`,
    name: path.basename(exe, path.extname(exe)),
    exe,
    args: '',
    cover: null,
  };
  store.local.push(game);
  saveStore(store);
  return game;
});

ipcMain.handle('local:pickExe', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Elige el ejecutable del juego',
    properties: ['openFile'],
    filters: [{ name: 'Ejecutables', extensions: ['exe', 'bat', 'lnk'] }, { name: 'Todos los archivos', extensions: ['*'] }],
  });
  return res.canceled || !res.filePaths[0] ? null : res.filePaths[0];
});

ipcMain.handle('local:edit', (_e, id, patch) => {
  const store = loadStore();
  const g = store.local.find((x) => x.id === id);
  if (!g) return null;
  if (typeof patch.exe === 'string' && patch.exe.trim() && patch.exe !== g.exe) {
    const exe = patch.exe.trim();
    if (store.local.some((x) => x.id !== id && x.exe.toLowerCase() === exe.toLowerCase())) return { duplicate: true };
    g.exe = exe;
  }
  for (const k of ['name', 'args', 'cover']) if (k in patch) g[k] = k === 'cover' && typeof patch[k] === 'string' ? media.toToken(userDir(), 'cover', patch[k], g.name) : patch[k];
  saveStore(store);
  return g;
});

ipcMain.handle('local:remove', (_e, id) => {
  const store = loadStore();
  store.local = store.local.filter((x) => x.id !== id);
  delete store.meta[id];
  saveStore(store);
  return true;
});

ipcMain.handle('dialog:pickImage', async (_e, kind, name) => {
  media.ensure(userDir());
  const res = await dialog.showOpenDialog(win, {
    title: 'Elige una imagen',
    properties: ['openFile'],
    filters: [{ name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }],
  });
  if (res.canceled) return null;
  // Se copia a la carpeta de imágenes de Comptus (así no depende de dónde esté el original)
  const p = res.filePaths[0];
  const k = media.KINDS[kind] ? kind : 'cover';
  const t = media.toToken(userDir(), k, p, name);
  return t.startsWith('media:') ? media.resolve(userDir(), t) : p;
});

// ---------- Exportar / importar temas propios ----------
// Cada tema va en su carpeta: tema.json + el fondo (imagen o vídeo) al lado, para poder pasarlo a otro equipo o compartirlo
const THEME_BG_EXT = /^\.(png|jpe?g|webp|gif|mp4|webm|m4v|mov|ogv)$/i;
const HEX6 = /^#[0-9a-f]{6}$/i;
ipcMain.handle('themes:export', async (_e, list) => {
  const themes = (Array.isArray(list) ? list : []).filter((t) => t && t.name);
  if (!themes.length) return { ok: false, error: 'No tienes temas propios que exportar.' };
  media.ensure(userDir());
  const res = await dialog.showOpenDialog(win, { title: 'Elige dónde guardar los temas (se crea una carpeta por tema)', defaultPath: path.join(media.dirOf(userDir()), media.KINDS.themes), properties: ['openDirectory', 'createDirectory'] });
  if (res.canceled || !res.filePaths[0]) return { ok: false, canceled: true };
  let count = 0; const used = new Set();
  for (const t of themes) {
    try {
      let base = media.safeName('Tema ' + t.name) || 'Tema'; let name = base, n = 2;
      while (used.has(name.toLowerCase()) || fs.existsSync(path.join(res.filePaths[0], name))) name = `${base} (${n++})`;
      used.add(name.toLowerCase());
      const dir = path.join(res.filePaths[0], name); fs.mkdirSync(dir, { recursive: true });
      const out = { format: 'comptus-theme', version: 1, name: String(t.name).slice(0, 30), bg: t.bg, panel: t.panel, text: t.text, accent: t.accent, accent2: t.accent2 };
      const c = t.bgCfg;
      if (c) {
        out.bgCfg = { dim: c.dim, blur: c.blur, art: c.art || null, file: null };
        if (c.path && fs.existsSync(c.path) && THEME_BG_EXT.test(path.extname(c.path))) { out.bgCfg.file = 'fondo' + path.extname(c.path).toLowerCase(); fs.copyFileSync(c.path, path.join(dir, out.bgCfg.file)); }
      }
      fs.writeFileSync(path.join(dir, 'tema.json'), JSON.stringify(out, null, 2));
      count++;
    } catch { /* ese tema no se pudo guardar: se sigue con el resto */ }
  }
  return { ok: count > 0, count, dir: res.filePaths[0], error: count ? null : 'No se pudo escribir en esa carpeta.' };
});
ipcMain.handle('themes:import', async () => {
  media.ensure(userDir());
  const res = await dialog.showOpenDialog(win, { title: 'Elige uno o varios archivos tema.json', defaultPath: path.join(media.dirOf(userDir()), media.KINDS.themes), properties: ['openFile', 'multiSelections'], filters: [{ name: 'Tema de Comptus', extensions: ['json'] }] });
  if (res.canceled) return { ok: false, canceled: true };
  const themes = []; let bad = 0;
  for (const f of res.filePaths) {
    try {
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      if (!j || j.format !== 'comptus-theme' || typeof j.name !== 'string') throw new Error('formato');
      for (const k of ['bg', 'panel', 'text', 'accent', 'accent2']) if (!HEX6.test(String(j[k]))) throw new Error('color');
      const t = { name: j.name.slice(0, 30), bg: j.bg, panel: j.panel, text: j.text, accent: j.accent, accent2: j.accent2 };
      const c = j.bgCfg;
      if (c && typeof c === 'object') {
        const num = (v, lo, hi, d) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
        t.bgCfg = { path: null, art: typeof c.art === 'string' ? c.art.slice(0, 40) : null, dim: num(c.dim, 0, 100, 55), blur: num(c.blur, 0, 20, 0) };
        if (typeof c.file === 'string' && c.file === path.basename(c.file) && THEME_BG_EXT.test(path.extname(c.file))) {
          const src = path.join(path.dirname(f), c.file);
          if (fs.existsSync(src)) { const tk = media.toToken(userDir(), 'background', src, 'Fondo ' + t.name); t.bgCfg.path = tk.startsWith('media:') ? media.resolve(userDir(), tk) : src; t.bgCfg.art = null; }
          else t.missingBg = true;
        }
      }
      themes.push(t);
    } catch { bad++; }
  }
  return { ok: themes.length > 0, themes, bad, error: themes.length ? null : 'Ese archivo no es un tema de Comptus.' };
});

// Captura la zona del fondo (ya pintada, con o sin vídeo) en miniatura para sacar sus colores: un canvas no puede leer ficheros locales
ipcMain.handle('bg:grab', async (_e, r) => {
  try {
    if (!win || win.isDestroyed()) return null;
    const rect = { x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)), width: Math.max(8, Math.round(r.w)), height: Math.max(8, Math.round(r.h)) };
    const img = await win.webContents.capturePage(rect);
    if (!img || img.isEmpty()) return null;
    return img.resize({ width: 64, quality: 'good' }).toDataURL();
  } catch { return null; }
});

// Fondo de la biblioteca: imagen o vídeo (se copia a «Themes Wallpaper» dentro de Comptus Media)
ipcMain.handle('dialog:pickBackground', async () => {
  media.ensure(userDir());
  const res = await dialog.showOpenDialog(win, {
    title: 'Elige una imagen o un vídeo para el fondo',
    properties: ['openFile'],
    filters: [{ name: 'Imágenes y vídeos', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'webm', 'm4v', 'mov', 'ogv'] }, { name: 'Imágenes', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }, { name: 'Vídeos', extensions: ['mp4', 'webm', 'm4v', 'mov', 'ogv'] }],
  });
  if (res.canceled) return null;
  const p = res.filePaths[0];
  const t = media.toToken(userDir(), 'background', p, 'Fondo');
  return t.startsWith('media:') ? media.resolve(userDir(), t) : p;
});

// Carpeta de imágenes propias
// Sugerencia: junto a la carpeta del programa (p. ej. C:\Archivos de programa\Comptus\Comptus Media) si se puede escribir ahí; si no, en Documentos
const suggestedMediaDir = () => {
  const exeDir = app.isPackaged ? path.dirname(process.execPath) : null;
  // Instalado en «…\Comptus\Comptus Launcher»: la carpeta de media va al lado, en «…\Comptus\Comptus Media»
  const base = process.env.PORTABLE_EXECUTABLE_DIR || (exeDir && path.basename(exeDir).toLowerCase() === 'comptus launcher' ? path.dirname(exeDir) : exeDir);
  if (base) { try { const d = path.join(base, media.ROOT_NAME); fs.mkdirSync(d, { recursive: true }); fs.accessSync(d, fs.constants.W_OK); return d; } catch { /* sin permiso */ } }
  return path.join(app.getPath('documents'), media.ROOT_NAME);
};
ipcMain.handle('media:getDir', () => { const st = loadStore().settings; const d = media.ensure(userDir()); // «Ya respondido» vale solo para esta instalación (ruta del programa): una instalación nueva vuelve a preguntar. Si la carpeta elegida ya no existe, también.
  return { dir: d, configured: !!st.mediaDir && fs.existsSync(st.mediaDir), declined: st.mediaAsked === process.execPath, suggested: suggestedMediaDir() }; });
// Crear/mover la carpeta «Comptus Media»: parent = ruta ('suggested' = Documentos) o null para elegirla con el explorador
ipcMain.handle('media:setDir', async (_e, parent) => {
  let base = parent === 'suggested' ? path.dirname(suggestedMediaDir()) : parent;
  if (!base) {
    const res = await dialog.showOpenDialog(win, { title: 'Elige dónde crear la carpeta «Comptus Media»', properties: ['openDirectory', 'createDirectory'] });
    if (res.canceled || !res.filePaths[0]) return { ok: false, canceled: true };
    base = res.filePaths[0];
  }
  try {
    const old = media.dirOf(userDir());
    const dir = media.rootIn(base);
    fs.mkdirSync(dir, { recursive: true });
    const copied = media.copyTree(old, dir);
    media.setRoot(dir); media.ensure(userDir());
    const store = loadStore();
    store.settings.mediaDir = dir; store.settings.mediaAsked = process.execPath;
    saveStore(store); flushStore(true);
    return { ok: true, dir, copied };
  } catch (e) { applyMediaRoot(); return { ok: false, error: String(e.message || e) }; }
});
ipcMain.handle('media:decline', () => { const store = loadStore(); store.settings.mediaAsked = process.execPath; saveStore(store); return true; });
ipcMain.handle('media:openFolder', async () => { const d = media.ensure(userDir()); const err = await shell.openPath(d); return { ok: !err, dir: d, error: err || null }; });
// Trae a la carpeta las imágenes que estaban sueltas por el PC (portadas, banners, logos, iconos, fondo, colecciones, temas)
ipcMain.handle('media:import', () => {
  const store = loadStore();
  const ud = userDir();
  media.ensure(ud);
  let moved = 0, missing = 0;
  const conv = (kind, p, name) => {
    if (typeof p !== 'string' || !p || p.startsWith('media:') || /^https?:/i.test(p)) return p;
    if (!path.isAbsolute(p)) return p;
    if (!fs.existsSync(p)) { missing++; return p; }
    const t = media.toToken(ud, kind, p, name);
    if (t !== p) moved++;
    return t;
  };
  const nameOf = (id) => { const l = store.local.find((x) => x.id === id); return (l && l.name) || ((cache || []).find((x) => x.id === id) || {}).name || id; };
  for (const id of Object.keys(store.meta)) for (const k of IMG_KEYS) if (store.meta[id][k]) store.meta[id][k] = conv(k, store.meta[id][k], nameOf(id));
  for (const g of store.local) if (g.cover) g.cover = conv('cover', g.cover, g.name);
  const st = store.settings;
  if (st.background && st.background.path) st.background.path = conv('background', st.background.path, 'Fondo');
  for (const t of st.myThemes || []) if (t.bgCfg && t.bgCfg.path) t.bgCfg.path = conv('background', t.bgCfg.path, 'Fondo ' + (t.name || ''));
  for (const c of st.collections || []) { if (c.bg && c.bg.path) c.bg.path = conv('background', c.bg.path, 'Fondo colección ' + (c.name || '')); if (c.cover) c.cover = conv('collection', c.cover, 'Colección ' + (c.name || '')); if (c.iconImage) c.iconImage = conv('icon', c.iconImage, 'Colección ' + (c.name || '')); }
  saveStore(store);
  return { ok: true, moved, missing };
});

ipcMain.handle('dialog:pickVideo', async () => {
  const res = await dialog.showOpenDialog(win, {
    title: 'Elige el vídeo del tráiler',
    properties: ['openFile'],
    filters: [{ name: 'Vídeos', extensions: ['mp4', 'webm', 'm4v', 'mov', 'ogv'] }],
  });
  return res.canceled ? null : res.filePaths[0];
});

// ---------- Logros de Steam ----------
const ACH_FRESH_MS = 10 * 60 * 1000;
let steamPathCache;
// El SteamID que escribió el usuario o, si no, el de la última cuenta que inició sesión en Steam
async function resolveSteamId(settings) {
  const typed = String((settings || {}).steamId || '').trim();
  if (typed) return typed;
  if (steamPathCache === undefined) steamPathCache = await findSteamPath().catch(() => null);
  return steamPathCache ? detectSteamId(steamPathCache, { parseVdf, getCI, fs, path }) : null;
}
async function getAch(id, force) {
  const g = cache.find((x) => x.id === id);
  if (g && g.source === 'epic' && g.epicNs) return epicAchievements(g, force);
  if (g && g.source === 'xbox' && g.xboxTitleId) return xboxAchievements(g, force);
  if (!g || g.source !== 'steam' || !g.appid) return { ok: false, code: 'unsupported', error: 'Los logros solo están disponibles para juegos de Steam, Epic y Xbox (con la sesión iniciada).' };
  const st = loadStore();
  const saved = (st.meta[id] || {}).achievements || null;
  if (saved && !force && Date.now() - saved.fetchedAt < ACH_FRESH_MS) return { ok: true, data: saved };
  const { steamKey } = st.settings;
  const sid = await resolveSteamId(st.settings);
  const res = await fetchAchievements({ appid: g.appid, steamId: sid, key: steamKey, getJson });
  if (res.data) { updateMeta(id, { achievements: res.data }); return { ok: true, data: res.data }; }
  // si falla pero hay datos guardados, se enseñan como están (con el motivo)
  return { ok: false, code: res.code, error: res.error, data: saved };
}
ipcMain.handle('achievements:get', (_e, id, force) => getAch(id, force));
ipcMain.handle('app:userName', () => { try { return require('os').userInfo().username || ''; } catch { return ''; } });

// ---------- Logros nuevos: se avisa (sonido + aviso) al desbloquear uno mientras juegas o al cerrar el juego ----------
async function detectNewAch(g) {
  try {
    if (!g || !(g.source === 'steam' || g.source === 'epic' || g.source === 'xbox')) return;
    const before = ((loadStore().meta[g.id] || {}).achievements || {}).list;
    if (!Array.isArray(before)) return; // sin lista previa no se sabe qué es nuevo
    const had = new Set(before.filter((a) => a.achieved).map((a) => a.id));
    const r = await getAch(g.id, true); const list = r && r.data && Array.isArray(r.data.list) ? r.data.list : null; if (!list) return;
    const fresh = list.filter((a) => a.achieved && !had.has(a.id));
    if (!fresh.length) return;
    const rare = fresh.some((a) => a.percent != null && a.percent < 10);
    if (win && !win.isDestroyed()) win.webContents.send('ach:unlocked', { id: g.id, game: g.name, rare, list: fresh.map((a) => ({ name: a.name, description: a.description, percent: a.percent, icon: a.icon })) });
    try { showToast('🏆 Logro desbloqueado: ' + fresh[0].name + (fresh.length > 1 ? ` (+${fresh.length - 1})` : ''), 5200); } catch {}
  } catch (e) { try { dlog('logros nuevos: ' + (e && e.message)); } catch {} }
}
setInterval(() => { try { const a = tracker.active; if (a) { const g = cache.find((x) => x.id === a.id) || a; detectNewAch(g); } } catch {} }, 180000);

// ---------- Juegos que tienes pero no están instalados ----------
const OWNED_STALE_MS = 12 * 60 * 60 * 1000;

// El token de Epic se guarda cifrado con el almacén del sistema (Windows DPAPI) cuando está disponible
// y nunca se envía a la ventana de la interfaz.
function sealToken(s) {
  try { if (safeStorage && safeStorage.isEncryptionAvailable()) return { e: 1, v: safeStorage.encryptString(s).toString('base64') }; } catch {}
  return { e: 0, v: s };
}
function openToken(t) {
  if (!t || !t.v) return '';
  try { return t.e ? safeStorage.decryptString(Buffer.from(t.v, 'base64')) : t.v; } catch { return ''; }
}
function loadEpicAuth(store) {
  const a = store.owned.epicAuth; if (!a) return null;
  const refreshToken = openToken(a.token); if (!refreshToken) return null;
  return { refreshToken, accountId: a.accountId, name: a.name, refreshExpires: a.refreshExpires };
}
function saveEpicAuth(auth) {
  const store = loadStore();
  store.owned.epicAuth = { token: sealToken(auth.refreshToken), accountId: auth.accountId, name: auth.name, refreshExpires: auth.refreshExpires };
  saveStore(store);
}
let epicAccess = null; // acceso temporal en memoria (no se guarda)
async function epicRequest(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await net.fetch(url, { method: opts.method || 'GET', headers: opts.headers, body: opts.body, signal: ctrl.signal });
    let json = null; try { json = await res.json(); } catch {}
    return { status: res.status, json };
  } finally { clearTimeout(timer); }
}

// Acceso de Epic listo para usar (renueva y guarda el token si hace falta)
async function epicAuthed() {
  const epicAuth = loadEpicAuth(loadStore());
  if (!epicAuth) return { code: 'nologin', error: 'Inicia sesión en Configuración > Epic Games.' };
  const r = await epicOwned.ensureAccess({ auth: { ...epicAuth, ...(epicAccess || {}) }, request: epicRequest });
  if (!r.auth) { if (r.code === 'expired') { const store = loadStore(); delete store.owned.epicAuth; saveStore(store); epicAccess = null; } return r; }
  epicAccess = { accessToken: r.auth.accessToken, accessExpires: r.auth.accessExpires };
  if (r.auth.refreshToken !== epicAuth.refreshToken) saveEpicAuth({ ...epicAuth, ...r.auth });
  return r;
}
async function epicAchievements(g, force) {
  const saved = (loadStore().meta[g.id] || {}).achievements || null;
  if (saved && !force && Date.now() - saved.fetchedAt < ACH_FRESH_MS) return { ok: true, data: saved };
  const a = await epicAuthed();
  if (!a.auth) return { ok: false, code: a.code, error: a.error, data: saved };
  const res = await epicOwned.fetchEpicAchievements({ auth: a.auth, sandboxId: g.epicNs, request: epicRequest });
  if (res.data) { updateMeta(g.id, { achievements: res.data }); return { ok: true, data: res.data }; }
  return { ok: false, code: res.code, error: res.error, data: saved };
}

// ---------- Cuenta de Xbox ----------
let xboxSess = null; // sesión de Xbox Live en memoria (no se guarda)
let xboxLogin = null; // inicio de sesión en curso
function loadXboxAuth(store) {
  const a = store.owned.xboxAuth; if (!a) return null;
  const refreshToken = openToken(a.token); if (!refreshToken) return null;
  return { refreshToken, gamertag: a.gamertag || '', xuid: a.xuid || '', clientId: a.clientId || '' };
}
function saveXboxAuth(a) {
  const store = loadStore();
  store.owned.xboxAuth = { token: sealToken(a.refreshToken), gamertag: a.gamertag || '', xuid: a.xuid || '', clientId: a.clientId || '' };
  saveStore(store);
}
function dropXboxAuth(all) {
  const store = loadStore();
  delete store.owned.xboxAuth; if (all) delete store.owned.xbox;
  xboxSess = null; saveStore(store); cache = [];
}
// Sesión de Xbox Live lista para usar (renueva el permiso de Microsoft si hace falta)
async function xboxAuthed() {
  const store = loadStore();
  const auth = loadXboxAuth(store);
  if (!auth) return { code: 'nologin', error: 'Inicia sesión en Configuración > Xbox.' };
  if (xboxSess && xboxSess.expires - Date.now() > 120000) return { session: xboxSess };
  const ms = await xboxLive.refreshMs({ clientId: auth.clientId, refreshToken: auth.refreshToken, request: epicRequest });
  if (!ms.auth) { if (ms.code === 'expired') dropXboxAuth(false); return ms; }
  const s = await xboxLive.xboxSession({ msAccessToken: ms.auth.accessToken, request: epicRequest });
  if (!s.session) return s;
  xboxSess = s.session;
  saveXboxAuth({ refreshToken: ms.auth.refreshToken, gamertag: s.session.gamertag, xuid: s.session.xuid, clientId: auth.clientId });
  return { session: xboxSess };
}
async function xboxAchievements(g, force) {
  const saved = (loadStore().meta[g.id] || {}).achievements || null;
  if (saved && !force && Date.now() - saved.fetchedAt < ACH_FRESH_MS) return { ok: true, data: saved };
  const a = await xboxAuthed();
  if (!a.session) return { ok: false, code: a.code, error: a.error, data: saved };
  const res = await xboxLive.fetchXboxAchievements({ session: a.session, titleId: g.xboxTitleId, request: epicRequest });
  if (res.data) { updateMeta(g.id, { achievements: res.data }); return { ok: true, data: res.data }; }
  return { ok: false, code: res.code, error: res.error, data: saved };
}

let syncing = false;
async function syncOwned() {
  if (syncing) return { ok: false, error: 'Ya se está sincronizando.' };
  syncing = true;
  try {
    const st = loadStore();
    const epicAuth = loadEpicAuth(st);
    const xboxAuth = loadXboxAuth(st);
    const hasSteam = !!String(st.settings.steamKey || '').trim();
    const hasItch = !!String(st.settings.itchKey || '').trim();
    if (!hasSteam && !epicAuth && !xboxAuth && !hasItch) {
      // sin nada configurado: mismo aviso de siempre
      const r = await fetchOwnedSteam({ steamId: '', key: '', getJson });
      return { ok: false, code: r.code, error: r.error };
    }
    const out = { ok: false, errors: [] };
    if (hasSteam) {
      const res = await fetchOwnedSteam({ steamId: await resolveSteamId(st.settings), key: st.settings.steamKey, getJson });
      if (res.games) {
        const store = loadStore();
        const before = new Set(((store.owned.steam || {}).games || []).map((g) => g.appid));
        store.owned.steam = { fetchedAt: Date.now(), games: res.games };
        saveStore(store);
        out.steam = { total: res.games.length, added: res.games.filter((g) => !before.has(g.appid)).length };
        out.ok = true;
      } else { out.errors.push(epicAuth ? `Steam: ${res.error}` : res.error); out.code = out.code || res.code; }
    }
    if (epicAuth) {
      const res = await epicOwned.fetchOwnedEpic({ auth: { ...epicAuth, ...(epicAccess || {}) }, request: epicRequest });
      if (res.auth && res.auth.refreshToken) { epicAccess = { accessToken: res.auth.accessToken, accessExpires: res.auth.accessExpires }; saveEpicAuth(res.auth); }
      if (res.games) {
        const store = loadStore();
        const before = new Set(((store.owned.epic || {}).games || []).map((g) => g.catalogItemId));
        store.owned.epic = { fetchedAt: Date.now(), v: 2, games: res.games };
        saveStore(store);
        out.epic = { total: res.games.length, added: res.games.filter((g) => !before.has(g.catalogItemId)).length };
        out.ok = true;
      } else {
        if (res.code === 'expired') { const store = loadStore(); delete store.owned.epicAuth; saveStore(store); epicAccess = null; out.epicExpired = true; }
        out.errors.push(hasSteam ? `Epic: ${res.error}` : res.error); out.code = out.code || res.code;
      }
    }
    if (hasItch) {
      const res = await itchOwned.fetchOwnedItch({ key: st.settings.itchKey, request: epicRequest });
      if (res.games) {
        const store = loadStore();
        const before = new Set(((store.owned.itch || {}).games || []).map((g) => g.id));
        store.owned.itch = { fetchedAt: Date.now(), games: res.games };
        saveStore(store);
        out.itch = { total: res.games.length, added: res.games.filter((g) => !before.has(g.id)).length };
        out.ok = true;
      } else { out.errors.push(`itch.io: ${res.error}`); out.code = out.code || res.code; }
    }
    if (xboxAuth) {
      const a = await xboxAuthed();
      const res = a.session ? await xboxLive.fetchXboxTitles({ session: a.session, request: epicRequest }) : a;
      if (res.games) {
        const store = loadStore();
        const before = new Set(((store.owned.xbox || {}).games || []).map((g) => g.titleId));
        store.owned.xbox = { fetchedAt: Date.now(), games: res.games };
        saveStore(store);
        out.xbox = { total: res.games.length, added: res.games.filter((g) => !before.has(g.titleId)).length };
        out.ok = true;
      } else {
        if (res.code === 'expired') { dropXboxAuth(false); out.xboxExpired = true; }
        out.errors.push(`Xbox: ${res.error}`); out.code = out.code || res.code;
      }
    }
    cache = []; // se vuelve a armar la biblioteca
    out.error = out.errors.join(' ');
    return out;
  } finally { syncing = false; }
}
ipcMain.handle('owned:sync', async () => {
  const r = await syncOwned();
  if (r.ok) { sendWin('library:changed'); setTimeout(() => backgroundInfo().catch(() => {}), 500); }
  return r;
});
// Al abrir el lanzador, si hay datos con más de 12 horas, se actualizan sin molestar
async function autoSyncOwned() {
  const st = loadStore();
  if (st.settings.showOwned === false) return;
  const stale = (k) => Date.now() - ((st.owned[k] || {}).fetchedAt || 0) >= OWNED_STALE_MS;
  const epicOld = st.owned.epicAuth && (st.owned.epic || {}).v !== 2; // datos guardados antes de traer las descripciones de Epic
  if (!((st.settings.steamKey && stale('steam')) || (st.owned.epicAuth && stale('epic')) || (st.owned.xboxAuth && stale('xbox')) || (st.settings.itchKey && stale('itch')) || epicOld)) return;
  const r = await syncOwned().catch(() => null);
  if (r && r.ok) sendWin('library:changed');
}

// ---------- Cuenta de Epic Games ----------
ipcMain.handle('epic:status', () => {
  const a = loadStore().owned.epicAuth;
  return { loggedIn: !!a, name: (a && a.name) || '' };
});
async function epicFinishLogin(code) {
  const t = await epicOwned.epicToken({ code, request: epicRequest });
  if (!t.auth) return { ok: false, error: t.error };
  epicAccess = { accessToken: t.auth.accessToken, accessExpires: t.auth.accessExpires };
  saveEpicAuth(t.auth);
  const r = await syncOwned();
  sendWin('library:changed');
  return { ok: true, name: t.auth.name, epic: r.epic || null, error: r.epic ? '' : (r.error || '') };
}
// Ventana con la página oficial de Epic. Al terminar el inicio de sesión, Epic muestra un JSON con un
// código de un solo uso; lo leemos de ahí y la cerramos. La sesión de esa ventana no se conserva.
ipcMain.handle('epic:login', () => new Promise((resolve) => {
  let done = false;
  const w = new BrowserWindow({ width: 520, height: 760, parent: win, modal: true, autoHideMenuBar: true, title: 'Iniciar sesión en Epic Games',
    webPreferences: { partition: 'epic-login-' + Date.now(), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  const finish = (v) => { if (done) return; done = true; try { if (!w.isDestroyed()) w.close(); } catch {} resolve(v); };
  const check = async () => {
    if (done || w.isDestroyed()) return;
    const url = w.webContents.getURL();
    if (!url.startsWith(epicOwned.REDIRECT_BASE)) return;
    let text = '';
    try { text = await w.webContents.executeJavaScript('document.body ? document.body.innerText : ""'); } catch {}
    const code = epicOwned.parseAuthCode(text);
    if (!code) return;
    finish(await epicFinishLogin(code));
  };
  w.webContents.on('did-finish-load', check);
  w.webContents.on('did-navigate', check);
  w.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\/(www\.)?epicgames\.com\//.test(url)) w.loadURL(url); return { action: 'deny' }; });
  w.on('closed', () => finish({ ok: false, cancelled: true }));
  w.loadURL(epicOwned.LOGIN_URL).catch(() => finish({ ok: false, error: 'No se pudo abrir la página de Epic. Revisa tu conexión.' }));
}));
// Alternativa si la ventana no sirve: abrir el navegador y pegar el código que muestra Epic
ipcMain.handle('epic:loginUrl', () => { shell.openExternal(epicOwned.LOGIN_URL); return true; });
ipcMain.handle('epic:loginCode', async (_e, text) => {
  const code = epicOwned.parseAuthCode(text);
  if (!code) return { ok: false, error: 'No parece el código de Epic. Copia todo el texto que muestra la página.' };
  return epicFinishLogin(code);
});
ipcMain.handle('epic:logout', () => {
  const store = loadStore();
  delete store.owned.epicAuth; delete store.owned.epic; epicAccess = null;
  saveStore(store); cache = [];
  sendWin('library:changed');
  return { ok: true };
});

// ---------- Cuenta de Xbox: inicio de sesión ----------
ipcMain.handle('xbox:status', () => {
  const st = loadStore();
  const a = st.owned.xboxAuth;
  return { loggedIn: !!a, name: (a && a.gamertag) || '', pending: !!xboxLogin };
});
ipcMain.handle('xbox:login', async () => {
  if (xboxLogin) xboxLogin.cancel = true;
  const d = await xboxLive.startDeviceCode({ request: epicRequest });
  if (!d.ok) return d;
  const me = { cancel: false };
  xboxLogin = me;
  shell.openExternal(d.verificationUri);
  (async () => {
    const deadline = Date.now() + d.expiresIn * 1000;
    let wait = d.interval * 1000;
    let result = null;
    while (!me.cancel && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, wait));
      if (me.cancel) break;
      const p = await xboxLive.pollDeviceCode({ clientId: d.clientId, deviceCode: d.deviceCode, request: epicRequest });
      if (p.pending) { if (p.slower) wait += 5000; continue; }
      if (!p.auth) { result = { ok: false, error: p.error }; break; }
      const s = await xboxLive.xboxSession({ msAccessToken: p.auth.accessToken, request: epicRequest });
      if (!s.session) { result = { ok: false, error: s.error }; break; }
      xboxSess = s.session;
      saveXboxAuth({ refreshToken: p.auth.refreshToken, gamertag: s.session.gamertag, xuid: s.session.xuid, clientId: d.clientId });
      const r = await syncOwned();
      result = { ok: true, name: s.session.gamertag, xbox: r.xbox || null, error: r.xbox ? '' : (r.error || '') };
      break;
    }
    if (me.cancel) return;
    xboxLogin = null;
    sendWin('xbox:login', result || { ok: false, error: 'El código caducó. Vuelve a pulsar «Iniciar sesión».' });
    if (result && result.ok) { sendWin('library:changed'); setTimeout(() => backgroundInfo().catch(() => {}), 500); }
  })();
  return { ok: true, userCode: d.userCode, verificationUri: d.verificationUri, expiresIn: d.expiresIn };
});
ipcMain.handle('xbox:cancel', () => { if (xboxLogin) { xboxLogin.cancel = true; xboxLogin = null; } return true; });
ipcMain.handle('xbox:logout', () => {
  if (xboxLogin) { xboxLogin.cancel = true; xboxLogin = null; }
  dropXboxAuth(true);
  sendWin('library:changed');
  return { ok: true };
});

// ---------- Descarga en lote (información + imágenes de todos los juegos que les falte) ----------
let batch = null;
const sendWin = (ch, payload) => { if (win && !win.isDestroyed()) win.webContents.send(ch, payload); };

// Sin información todavía, o con información vieja pero sin portada/banner
function needsInfoWork(g) {
  if (g.hidden) return false;
  if (!g.info && !g.infoEdit) return true;
  if (g.info && g.info.source !== 'rawg' && g.info.appid && g.info.movies === undefined) return true; // descargada antes de existir los tráilers
  return !!g.info && !g.info.images && (!g.cover || !g.banner);
}

const RETRY_MS = 7 * 24 * 60 * 60 * 1000; // lo que no se encontró no se vuelve a buscar solo hasta pasada una semana
// Logros de Steam: solo si hay clave y aún no se han leído (se muestran en la portada del 100 %, el filtro de logros, etc.)
function needsAchWork(g, hasKey) {
  if (g.source === 'epic' && g.epicNs && !g.hidden && !g.achievements && loadStore().owned.epicAuth) return !g.achTried || Date.now() - g.achTried > RETRY_MS;
  if (g.source === 'xbox' && g.xboxTitleId && !g.hidden && !g.achievements && loadStore().owned.xboxAuth) return !g.achTried || Date.now() - g.achTried > RETRY_MS;
  if (!hasKey || g.hidden || g.source !== 'steam' || !g.appid || g.achievements) return false;
  return !g.achTried || Date.now() - g.achTried > RETRY_MS;
}
const needsInfoAuto = (g) => needsInfoWork(g) && (!g.infoTried || g.info || (g.epicInfo && !g.info) || Date.now() - g.infoTried > RETRY_MS);

// silent = descarga en segundo plano: sin ventana de progreso; la lista se refresca de vez en cuando
async function runBatch(targets, silent = false) {
  const store = loadStore();
  const rawgKey = store.settings.rawgKey || '';
  const translate = store.settings.autoTranslate !== false;
  const hasKey = !!String(store.settings.steamKey || '').trim();
  const sid = hasKey ? await resolveSteamId(store.settings) : '';
  let done = 0, found = 0, quotaHit = false;
  const missed = [];
  for (const g of targets) {
    if (batch.cancel) break;
    if (!silent) sendWin('info:progress', { done, total: targets.length, name: g.name });
    if (needsInfoWork(g)) {
      // Si ya tenía información, se vuelve a pedir el mismo juego (no se cambia la coincidencia)
      const term = g.info ? (g.info.source === 'rawg' ? `rawg:${g.info.rawgId}` : g.info.appid) : null;
      const res = await fetchInfo(g, { getJson, term, rawgKey });
      if (res.info) {
        if (translate && !quotaHit && res.info.lang === 'en' && res.info.description) {
          const tr = await translateInfo(res.info);
          if (tr.descriptionEs) { res.info.descriptionEs = tr.descriptionEs; res.info.translatedBy = tr.provider; }
          else if (/límite|cuota/i.test(tr.error || '')) quotaHit = true; // no seguir gastando intentos
        }
        updateMeta(g.id, { info: res.info, infoTried: Date.now() });
        found++;
      } else {
        updateMeta(g.id, { infoTried: Date.now(), infoErr: res.error || '' });
        if (!g.info) missed.push({ name: g.name, error: res.error });
      }
      await sleep(250); // sin saturar los servicios
    }
    if (needsAchWork(g, hasKey) && g.source === 'xbox') {
      const r = await xboxAchievements(g, true).catch(() => ({}));
      if (!r.ok) updateMeta(g.id, { achTried: Date.now() });
      await sleep(400);
    } else if (needsAchWork(g, hasKey) && g.source === 'epic') {
      const r = await epicAchievements(g, true).catch(() => ({}));
      if (!r.ok) updateMeta(g.id, { achTried: Date.now() });
      await sleep(250);
    } else if (needsAchWork(g, hasKey)) {
      const r = await fetchAchievements({ appid: g.appid, steamId: sid, key: store.settings.steamKey, getJson }).catch(() => ({}));
      if (r.data) updateMeta(g.id, { achievements: r.data }); else updateMeta(g.id, { achTried: Date.now() });
      await sleep(250);
    }
    done++;
    if (silent && done % 40 === 0) { cache = []; sendWin('library:changed'); }
  }
  const summary = { total: targets.length, done, found, missed, quotaHit, canceled: batch.cancel, silent };
  batch = null;
  cache = [];
  if (!silent) sendWin('info:done', summary);
  sendWin('library:changed');
}

ipcMain.handle('info:batch', async () => {
  if (batch) return { ok: false, error: 'Ya hay una descarga en curso.' };
  const store = loadStore();
  const hasKey = !!String(store.settings.steamKey || '').trim();
  cache = cache.length ? cache : await getLibrary();
  const targets = cache.filter((g) => needsInfoWork(g) || needsAchWork(g, hasKey));
  if (!targets.length) return { ok: true, total: 0 };
  batch = { cancel: false };
  runBatch(targets);
  return { ok: true, total: targets.length };
});
// Al abrir el lanzador (y tras sincronizar) completa en segundo plano lo que falte, sin ventanas
async function backgroundInfo() {
  const st = loadStore();
  if (st.settings.autoBackground === false || batch) return;
  const hasKey = !!String(st.settings.steamKey || '').trim();
  cache = cache.length ? cache : await getLibrary();
  const targets = cache.filter((g) => needsInfoAuto(g) || needsAchWork(g, hasKey));
  if (!targets.length) return;
  batch = { cancel: false };
  runBatch(targets, true).catch(() => { batch = null; });
}
ipcMain.handle('info:batchCancel', () => { if (batch) batch.cancel = true; return true; });

// ---------- Overlay, atajos y capturas ----------
const DEFAULT_HOTKEYS = { overlay: 'Ctrl+Shift+O', shot: 'Ctrl+Shift+P', search: 'Ctrl+Alt+Space' };
const overlayOn = () => loadStore().settings.overlay !== false;
const getHotkeys = () => ({ ...DEFAULT_HOTKEYS, ...(loadStore().settings.hotkeys || {}) });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let overlay = null, overlayMode = 'panel', overlayLoaded = false, toastTimer = null, overlayViaPad = false;

function ensureOverlay() {
  if (overlay && !overlay.isDestroyed()) return overlay;
  overlayLoaded = false;
  overlay = new BrowserWindow({
    width: 440, height: 600, show: false, frame: false, transparent: true, resizable: false, hasShadow: false,
    alwaysOnTop: true, skipTaskbar: true, focusable: true, fullscreenable: false,
    webPreferences: { preload: path.join(__dirname, 'overlay-preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  overlay.setAlwaysOnTop(true, 'screen-saver'); // por encima de juegos en ventana sin bordes
  overlay.loadFile(path.join(__dirname, 'renderer', 'overlay.html'));
  overlay.webContents.once('did-finish-load', () => { overlayLoaded = true; });
  overlay.on('blur', () => { if (overlayMode === 'panel' && !overlayViaPad) overlay.hide(); }); // al volver al juego se oculta (si se abrió con el mando se queda: se cierra con B o con la combinación)
  overlay.on('hide', () => { overlayViaPad = false; stopNav(); });
  // Mientras el panel del overlay está abierto, Comptus ignora el mando y el teclado (que no se mueva nada al fondo)
  const ovState = (v) => { try { if (win && !win.isDestroyed()) win.webContents.send('overlay:state', v); } catch {} };
  overlay.on('show', () => { if (overlayMode === 'panel') ovState(true); });
  overlay.on('hide', () => ovState(false));
  return overlay;
}

function sendOverlay(mode, payload) {
  const o = ensureOverlay();
  const go = () => o.webContents.send('overlay:mode', mode, payload);
  if (overlayLoaded) go(); else o.webContents.once('did-finish-load', go);
}

const cursorDisplay = () => screen.getDisplayNearestPoint(screen.getCursorScreenPoint());

function placeOverlay(w, h, top) {
  const a = cursorDisplay().workArea;
  overlay.setBounds({ x: a.x + Math.round((a.width - w) / 2), y: top ? a.y + 24 : a.y + Math.round((a.height - h) / 2), width: w, height: h });
}

function showPanel() {
  const o = ensureOverlay();
  clearTimeout(toastTimer);
  overlayMode = 'panel';
  o.setIgnoreMouseEvents(false);
  placeOverlay(440, 600, false);
  sendOverlay('panel');
  mixer.warm(); // compilar el mezclador mientras el panel se abre
  o.show();
  o.focus();
  startNav();
}

// ---------- Overlay con el mando ----------
// El lanzador no puede leer el mando mientras el juego tiene el foco, así que mientras hay un juego en marcha
// se abre una ventanita invisible (sin foco, sin clics) que sí lo escucha.
let padWin = null, padWinMode = null;
const padMode = () => { const m = loadStore().settings.padOverlay; return ['selstart', 'sela', 'l3r3', 'guide', 'custom', 'off'].includes(m) ? m : 'selstart'; };
const padBtns = () => { const b = loadStore().settings.padOverlayBtns; return Array.isArray(b) ? b.filter((n) => Number.isInteger(n) && n >= 0 && n < 32).slice(0, 3) : []; };
const lowPrioProc = (c) => { try { if (c && c.pid) require('os').setPriority(c.pid, require('os').constants.priority.PRIORITY_BELOW_NORMAL); } catch {} };
function stopPadWin() { try { if (padWin && !padWin.isDestroyed()) padWin.destroy(); } catch {} padWin = null; padWinMode = null; }
function stopPadWatch() { stopXi(); stopPadWin(); stopNav(); }
function syncPadWatch() {
  syncXi();
  const m = padMode(), bt = padBtns().join(','), key = m + ':' + (m === 'custom' ? bt : '');
  if (!overlayOn() || m === 'off' || (m === 'custom' && !bt)) return stopPadWin();
  if (padWin && !padWin.isDestroyed() && padWinMode === key) return;
  stopPadWin();
  try {
    padWinMode = key;
    padWin = new BrowserWindow({ width: 2, height: 2, x: 0, y: 0, frame: false, transparent: true, focusable: false, skipTaskbar: true, show: false, hasShadow: false, resizable: false, webPreferences: { preload: path.join(__dirname, 'padwatch-preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } });
    padWin.setAlwaysOnTop(true, 'screen-saver');
    padWin.setIgnoreMouseEvents(true);
    padWin.setOpacity(0.02); // casi invisible, pero «visible» para que Chromium le dé los datos del mando
    padWin.on('closed', () => { padWin = null; });
    padWin.loadFile(path.join(__dirname, 'renderer', 'padwatch.html'), { query: { m, b: bt } });
    padWin.once('ready-to-show', () => { if (padWin && !padWin.isDestroyed()) padWin.showInactive(); });
  } catch { padWin = null; }
}

// Manejo del overlay con el mando: el juego tiene el foco, así que la ventana del overlay no puede leer el mando por sí sola.
// Mientras el overlay está abierto, un PowerShell lee XInput y manda arriba / abajo / A / B a la ventana del overlay.
let navProc = null, navBuf = '';
const NAV_SCRIPT = "Add-Type -Namespace P -Name N -MemberDefinition '[DllImport(\"xinput1_4.dll\", EntryPoint=\"XInputGetState\")] public static extern int Get(int i, byte[] s);';" +
  "$pa=$null;$pb=$null;$nu=0;$nd=0;$fu=$true;$fd=$true;$nl=0;$nr=0;$fl=$true;$fr=$true;" +
  "while($true){ $w=0;$ly=0;$lx=0; for($i=0;$i -lt 4;$i++){ $b=New-Object byte[] 16; if([P.N]::Get($i,$b) -eq 0){ $w=$w -bor [int][BitConverter]::ToUInt16($b,4); $v=[int][BitConverter]::ToInt16($b,10); if([Math]::Abs($v) -gt [Math]::Abs($ly)){$ly=$v}; $vx=[int][BitConverter]::ToInt16($b,8); if([Math]::Abs($vx) -gt [Math]::Abs($lx)){$lx=$vx} } } " +
  "$now=[Environment]::TickCount; $combo=(($w -band 0x30) -ne 0); $a=((($w -band 0x1000) -ne 0) -and -not $combo); $bb=((($w -band 0x2000) -ne 0) -and -not $combo); " +
  "if($pa -eq $null){ $pa=$a;$pb=$bb } " +
  "if($a -and -not $pa){ [Console]::Out.WriteLine('NAV|a'); [Console]::Out.Flush() } if($bb -and -not $pb){ [Console]::Out.WriteLine('NAV|b'); [Console]::Out.Flush() } $pa=$a;$pb=$bb; " +
  "$up=((($w -band 1) -ne 0) -or ($ly -gt 16000)); $dn=((($w -band 2) -ne 0) -or ($ly -lt -16000)); " +
  "if($up){ if($now -ge $nu){ [Console]::Out.WriteLine('NAV|up'); [Console]::Out.Flush(); if($fu){$nu=$now+380;$fu=$false}else{$nu=$now+140} } } else { $nu=0;$fu=$true } " +
  "if($dn){ if($now -ge $nd){ [Console]::Out.WriteLine('NAV|down'); [Console]::Out.Flush(); if($fd){$nd=$now+380;$fd=$false}else{$nd=$now+140} } } else { $nd=0;$fd=$true } " +
  "$lf=((($w -band 4) -ne 0) -or ($lx -lt -16000)); $rt=((($w -band 8) -ne 0) -or ($lx -gt 16000)); " +
  "if($lf){ if($now -ge $nl){ [Console]::Out.WriteLine('NAV|left'); [Console]::Out.Flush(); if($fl){$nl=$now+380;$fl=$false}else{$nl=$now+110} } } else { $nl=0;$fl=$true } " +
  "if($rt){ if($now -ge $nr){ [Console]::Out.WriteLine('NAV|right'); [Console]::Out.Flush(); if($fr){$nr=$now+380;$fr=$false}else{$nr=$now+110} } } else { $nr=0;$fr=$true } " +
  "Start-Sleep -Milliseconds 40 }";
function stopNav() { try { if (navProc) navProc.kill(); } catch {} navProc = null; }
function startNav() {
  if (navProc || process.platform !== 'win32') return;
  try {
    navProc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(NAV_SCRIPT, 'utf16le').toString('base64')], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    navProc.stdout.on('data', (d) => {
      navBuf += d.toString('utf8'); let i;
      while ((i = navBuf.indexOf('\n')) >= 0) {
        const line = navBuf.slice(0, i).trim(); navBuf = navBuf.slice(i + 1);
        if (line.startsWith('NAV|') && overlay && !overlay.isDestroyed() && overlay.isVisible()) overlay.webContents.send('overlay:nav', line.slice(4));
      }
    });
    navProc.on('exit', () => { navProc = null; });
  } catch { navProc = null; }
}

let padCombo0 = 0;
async function padCombo(src) { // lo avisan a la vez la ventana (API del navegador) y XInput: se ignoran avisos repetidos
  const now = Date.now(); if (now - padCombo0 < 700) return; padCombo0 = now;
  const ok = overlayOn() && await inGameNow();
  dlog('combinación del mando (' + src + ') → ' + (ok ? 'se abre/cierra el overlay' : 'ignorada: no hay juego en primer plano'));
  if (ok) { const wasOpen = overlay && !overlay.isDestroyed() && overlay.isVisible() && overlayMode === 'panel'; if (!wasOpen) overlayViaPad = true; toggleOverlay(); }
}
ipcMain.on('pad:combo', () => { padCombo('navegador'); });

// Lector XInput (mandos de Xbox y compatibles): funciona aunque el juego tenga el foco, algo que la API de mandos del navegador no permite
// (solo da datos a la ventana activa). Un PowerShell ligero mira el mando cada 40 ms y avisa al pulsar la combinación elegida.
let xiProc = null, xiKey = null, xiCount = -1, xiBuf = '';
const XI_BITS = { 0: 0x1000, 1: 0x2000, 2: 0x4000, 3: 0x8000, 4: 0x100, 5: 0x200, 8: 0x20, 9: 0x10, 10: 0x40, 11: 0x80, 12: 0x1, 13: 0x2, 14: 0x4, 15: 0x8, 16: 0x400 };
const PAD_PRESETS = { selstart: [8, 9], sela: [8, 0], l3r3: [10, 11], guide: [16] };
function xiScript(btns) {
  let mask = 0, lt = 0, rt = 0;
  for (const b of btns) { if (b === 6) lt = 1; else if (b === 7) rt = 1; else if (XI_BITS[b]) mask |= XI_BITS[b]; }
  const g = btns.includes(16) ? 1 : 0;
  return "Add-Type -Namespace P -Name X -MemberDefinition '[DllImport(\"xinput1_4.dll\", EntryPoint=\"#100\")] public static extern int GetEx(int i, byte[] s); [DllImport(\"xinput1_4.dll\", EntryPoint=\"XInputGetState\")] public static extern int Get(int i, byte[] s);';" +
    `$m=${mask};$lt=${lt};$rt=${rt};$g=${g};$down=$false;$n=-1;` +
    "while($true){ $any=$false;$cnt=0; for($i=0;$i -lt 4;$i++){ $b=New-Object byte[] 16; if($g){$r=[P.X]::GetEx($i,$b)}else{$r=[P.X]::Get($i,$b)}; if($r -eq 0){ $cnt++; $w=[int][BitConverter]::ToUInt16($b,4); if((($w -band $m) -eq $m) -and ((-not $lt) -or $b[6] -gt 100) -and ((-not $rt) -or $b[7] -gt 100)){ $any=$true } } } " +
    "if($cnt -ne $n){ $n=$cnt; [Console]::Out.WriteLine('PAD|'+$cnt); [Console]::Out.Flush() } " +
    "if($any -and -not $down){ [Console]::Out.WriteLine('COMBO'); [Console]::Out.Flush() } $down=$any; Start-Sleep -Milliseconds 40 }";
}
function stopXi() { try { if (xiProc) xiProc.kill(); } catch {} xiProc = null; xiKey = null; xiCount = -1; }
function syncXi() {
  const m = padMode(), btns = m === 'custom' ? padBtns() : (PAD_PRESETS[m] || []);
  const key = m + ':' + btns.join(',');
  if (process.platform !== 'win32' || !overlayOn() || m === 'off' || !btns.length) return stopXi();
  if (xiProc && xiKey === key) return;
  stopXi();
  try {
    xiKey = key;
    xiProc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(xiScript(btns), 'utf16le').toString('base64')], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); lowPrioProc(xiProc);
    xiProc.stdout.on('data', (d) => {
      xiBuf += d.toString('utf8'); let i;
      while ((i = xiBuf.indexOf('\n')) >= 0) {
        const line = xiBuf.slice(0, i).trim(); xiBuf = xiBuf.slice(i + 1);
        if (line === 'COMBO') padCombo('XInput'); else if (line.startsWith('PAD|')) { xiCount = parseInt(line.slice(4), 10); dlog('mandos XInput conectados: ' + xiCount); }
      }
    });
    let errN = 0; xiProc.stderr.on('data', (d) => { if (!String(d).startsWith('#<') && errN++ < 3) dlog('PowerShell (mando): ' + String(d).trim().slice(0, 300)); });
    xiProc.on('exit', (c) => { dlog('el lector XInput terminó (código ' + c + ')'); xiProc = null; });
  } catch (e) { dlog('no se pudo iniciar el lector XInput: ' + e.message); xiProc = null; }
}

function toggleOverlay() {
  if (overlay && !overlay.isDestroyed() && overlay.isVisible() && overlayMode === 'panel') overlay.hide();
  else showPanel();
}

function showToast(text, ms = 2300, h = 76) {
  const o = ensureOverlay();
  clearTimeout(toastTimer);
  overlayMode = 'toast';
  o.setIgnoreMouseEvents(true); // el aviso no roba clics ni el foco del juego
  placeOverlay(420, h, true);
  sendOverlay('toast', text);
  o.showInactive();
  toastTimer = setTimeout(() => { if (overlayMode === 'toast') o.hide(); }, ms);
}

async function captureScreen() {
  const d = cursorDisplay();
  const size = { width: Math.round(d.size.width * d.scaleFactor), height: Math.round(d.size.height * d.scaleFactor) };
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: size });
  const src = sources.find((x) => String(x.display_id) === String(d.id)) || sources[0];
  if (!src || src.thumbnail.isEmpty()) throw new Error('sin imagen');
  return src.thumbnail.toJPEG(92);
}

async function takeScreenshot() {
  try {
    if (overlay && !overlay.isDestroyed() && overlay.isVisible()) { overlay.hide(); await sleep(180); } // que no salga el overlay
    const buf = await captureScreen();
    const a = tracker.active;
    shots.save(app.getPath('userData'), a ? a.id : null, buf);
    if (win && !win.isDestroyed()) win.webContents.send('shots:changed', a ? a.id : null);
    showToast(a ? `Captura guardada en «${a.name}»` : 'Captura guardada (no hay juego detectado)');
    return { ok: true };
  } catch {
    showToast('No se pudo tomar la captura');
    return { ok: false };
  }
}

// ---------- Actualizaciones automáticas (instalador) ----------
const updater = updaterMod.create({
  app, logFile: path.join(app.getPath('userData'), 'updater.log'),
  findInstaller: (version) => { // instalador descargado por el actualizador: %LOCALAPPDATA%\<nombre>-updater\pending\*.exe
    const base = process.env.LOCALAPPDATA; if (!base) return null;
    let best = null;
    for (const d of fs.readdirSync(base).filter((n) => /-updater$/i.test(n))) {
      const pend = path.join(base, d, 'pending');
      let files = []; try { files = fs.readdirSync(pend).filter((f) => /\.exe$/i.test(f)); } catch { continue; }
      for (const f of files) {
        const full = path.join(pend, f), t = fs.statSync(full).mtimeMs, hit = version && f.includes(version);
        if (!best || (hit && !best.hit) || (hit === best.hit && t > best.t)) best = { full, t, hit };
      }
    }
    return best && (best.hit || !version) ? best.full : null;
  },
  openFile: (f) => shell.openPath(f),
  getAuto: () => loadStore().settings.autoUpdate !== false,
  send: (ch, p) => sendWin(ch, p),
  loadUpdater: () => require('electron-updater').autoUpdater,
  beforeInstall: () => { // todo lo que mantenga vivo a Comptus (ventanas ocultas, procesos auxiliares, bandeja) se cierra: el instalador no puede empezar mientras siga abierto
    quitting = true; flushStore(true);
    try { stopPadWatch(); stopFgWatch(); stopLibraryWatch(); } catch {}
    try { if (tray) { tray.destroy(); tray = null; } } catch {}
    try { if (globalShortcut) globalShortcut.unregisterAll(); } catch {}
    try { tracker.stop(); } catch {}
    for (const w of BrowserWindow.getAllWindows()) { try { if (!w.isDestroyed()) w.destroy(); } catch {} }
  },
});
ipcMain.handle('update:state', () => updater.state());
ipcMain.handle('update:check', () => updater.check(true));
ipcMain.handle('update:download', () => updater.download());
ipcMain.handle('update:install', () => updater.install());

// ---------- Sistema: bandeja, inicio con Windows y búsqueda rápida ----------
const sysSettings = () => {
  const s = loadStore().settings;
  return { startWithWindows: !!s.startWithWindows, startHidden: !!s.startHidden, closeToTray: !!s.closeToTray, quickSearch: s.quickSearch !== false, autoUpdate: s.autoUpdate !== false, freeNotify: s.freeNotify !== false, freeNotifyDlc: !!s.freeNotifyDlc, eventNotify: s.eventNotify !== false, wishNotify: s.wishNotify !== false, splash: s.splash !== false, nowPlaying: s.nowPlaying !== false };
};
const exePath = () => process.env.PORTABLE_EXECUTABLE_FILE || process.execPath; // en la versión portable, el .exe original
function loginEnabled() { // ¿está en el arranque de Windows? (cuenta también lo que escribió el instalador)
  try {
    if (!app.isPackaged) return sysSettings().startWithWindows;
    return ['--oculto', null].some((a) => app.getLoginItemSettings({ path: exePath(), args: a ? [a] : [] }).openAtLogin);
  } catch { return sysSettings().startWithWindows; }
}
function applyLoginItem() {
  try {
    if (!app.isPackaged) return; // en desarrollo no se toca el registro de Windows
    const s = sysSettings();
    if (!s.startWithWindows) { app.setLoginItemSettings({ openAtLogin: false, path: exePath(), args: [] }); app.setLoginItemSettings({ openAtLogin: false, path: exePath(), args: ['--oculto'] }); return; }
    app.setLoginItemSettings({ openAtLogin: true, path: exePath(), args: s.startHidden ? ['--oculto'] : [] });
  } catch { /* sin permiso: se deja como estaba */ }
}
const systemState = () => ({ ...sysSettings(), startWithWindows: loginEnabled(), packaged: !!app.isPackaged, hasTray: !!tray });
ipcMain.handle('system:get', () => systemState());
ipcMain.handle('system:set', (_e, patch) => {
  const store = loadStore();
  const next = { ...store.settings };
  for (const k of ['startWithWindows', 'startHidden', 'closeToTray', 'quickSearch', 'autoUpdate', 'freeNotify', 'freeNotifyDlc', 'eventNotify', 'wishNotify', 'splash', 'nowPlaying']) if (typeof (patch || {})[k] === 'boolean') next[k] = patch[k];
  store.settings = next; saveStore(store);
  if (patch && 'nowPlaying' in patch) { try { npApplySetting(); } catch {} }
  applyLoginItem();
  registerHotkeys();
  return systemState();
});

let tray = null, trayTimer = null, hiddenForGame = false;
function showMain() {
  if (!win || win.isDestroyed()) { createWindow(); return; }
  hiddenForGame = false;
  if (win.isMinimized()) win.restore();
  win.show(); win.focus();
}
// Lista sin repetidos (una ficha por juego unido), la que usan la bandeja y la búsqueda rápida
async function paletteBase() {
  const all = cache.length ? cache : await getLibrary();
  const list = all.filter((g) => !g.hidden).map((g) => ({ ...g }));
  if (loadStore().settings.mergeDupes !== false) Dupes.applyGroups(list, { enabled: true });
  return list.filter((g) => !g.dupOf);
}
async function recentGames(n) {
  try { return (await paletteBase()).filter((g) => g.lastPlayed && g.installed !== false).sort((a, b) => b.lastPlayed - a.lastPlayed).slice(0, n); } catch { return []; }
}
async function buildTrayMenu() {
  if (!tray) return;
  const recents = await recentGames(5);
  const items = [{ label: 'Abrir Comptus', click: showMain }];
  if (sysSettings().quickSearch) items.push({ label: 'Buscar juego…', accelerator: getHotkeys().search, registerAccelerator: false, click: togglePalette });
  if (recents.length) {
    items.push({ type: 'separator' }, { label: 'Jugados recientemente', enabled: false });
    for (const g of recents) items.push({ label: String(g.name).slice(0, 50), click: () => { const r = launchGame(g.id); if (!r.ok) showToast(r.error || 'No se pudo abrir el juego'); } });
  }
  items.push({ type: 'separator' }, { label: 'Salir de Comptus', click: () => { quitting = true; app.quit(); } });
  try { tray.setContextMenu(Menu.buildFromTemplate(items)); } catch { /* menú no disponible */ }
}
const scheduleTray = () => { if (!tray) return; clearTimeout(trayTimer); trayTimer = setTimeout(() => buildTrayMenu().catch(() => {}), 1500); };
function createTray() {
  if (tray || !Tray) return;
  try {
    // La carpeta build/ no va dentro del instalador, por eso el icono se guarda también en renderer/
    let img = nativeImage.createFromPath(path.join(__dirname, 'renderer', 'tray.png'));
    if (img.isEmpty()) img = nativeImage.createFromPath(path.join(__dirname, 'build', 'icon.png'));
    if (img.isEmpty()) img = nativeImage.createFromPath(process.execPath); // último recurso: el icono del .exe
    if (!img.isEmpty()) img = img.resize({ width: 32, height: 32, quality: 'best' });
    tray = new Tray(img);
    tray.setToolTip('Comptus');
    tray.on('click', showMain);
    buildTrayMenu().catch(() => {});
  } catch { tray = null; }
}
function hintTray() {
  const store = loadStore();
  if (store.settings.trayHintShown || !tray) return;
  store.settings = { ...store.settings, trayHintShown: true }; saveStore(store);
  try { tray.displayBalloon({ title: 'Comptus sigue abierto', content: 'Está en la bandeja del sistema. Haz clic en su icono para abrirlo; para salir, usa su menú.' }); } catch { /* sin globo */ }
}

let palette = null, paletteLoaded = false;
function ensurePalette() {
  if (palette && !palette.isDestroyed()) return palette;
  paletteLoaded = false;
  palette = new BrowserWindow({
    width: 640, height: 120, show: false, frame: false, transparent: true, resizable: false, hasShadow: false,
    alwaysOnTop: true, skipTaskbar: true, fullscreenable: false,
    webPreferences: { preload: path.join(__dirname, 'palette-preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  palette.setAlwaysOnTop(true, 'screen-saver');
  palette.loadFile(path.join(__dirname, 'renderer', 'palette.html'));
  palette.webContents.once('did-finish-load', () => { paletteLoaded = true; });
  palette.on('blur', () => { if (palette && !palette.isDestroyed()) palette.hide(); });
  return palette;
}
function togglePalette() {
  const p = ensurePalette();
  if (p.isVisible()) { p.hide(); return; }
  const a = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  p.setBounds({ x: a.x + Math.round((a.width - 640) / 2), y: a.y + Math.round(a.height * 0.18), width: 640, height: 120 });
  const go = () => { p.show(); p.focus(); p.webContents.send('palette:show'); };
  if (paletteLoaded) go(); else p.webContents.once('did-finish-load', go);
}
const hidePalette = () => { if (palette && !palette.isDestroyed()) palette.hide(); };
const imgUrl = (v) => (typeof v !== 'string' || !v ? null : /^(https?:|data:|file:)/i.test(v) ? v : path.isAbsolute(v) ? pathToFileURL(v).href : null);
ipcMain.handle('palette:query', async (_e, q) => {
  const text = String(q || '').trim().toLowerCase().slice(0, 80);
  let list = await paletteBase();
  const nameOf = (g) => String(g.name || '').toLowerCase();
  const score = (g) => {
    const n = nameOf(g), tags = Array.isArray(g.tags) ? g.tags.join(' ').toLowerCase() : '';
    if (n.startsWith(text)) return 0;
    if (n.split(/[^a-z0-9áéíóúñ]+/i).some((w) => w.startsWith(text))) return 1;
    if (n.includes(text)) return 2;
    if (tags.includes(text)) return 3;
    return -1;
  };
  if (text) list = list.map((g) => [g, score(g)]).filter(([, sc]) => sc >= 0).sort((a, b) => a[1] - b[1] || (a[0].installed === false) - (b[0].installed === false) || (b[0].lastPlayed || 0) - (a[0].lastPlayed || 0) || nameOf(a[0]).localeCompare(nameOf(b[0]))).map(([g]) => g);
  else list = list.filter((g) => g.lastPlayed).sort((a, b) => b.lastPlayed - a.lastPlayed);
  const defs = Object.fromEntries(sourcesInfo().map((x) => [x.id, x]));
  return list.slice(0, 8).map((g) => ({
    id: g.id, name: g.name, installed: g.installed !== false,
    source: (defs[g.source] && defs[g.source].name) || (g.source === 'local' ? 'Local' : g.source),
    color: (defs[g.source] && defs[g.source].color) || '#8892b0',
    img: imgUrl(g.icon) || imgUrl(g.cover) || imgUrl(g.coverFallback),
  }));
});
ipcMain.handle('palette:launch', (_e, id) => {
  hidePalette();
  const r = launchGame(id);
  if (!r.ok) showToast(r.error || 'No se pudo abrir el juego');
  return r;
});
ipcMain.handle('palette:open', (_e, id) => {
  hidePalette(); showMain();
  if (win && !win.isDestroyed()) win.webContents.send('open:game', id);
  return true;
});
ipcMain.handle('palette:close', () => { hidePalette(); return true; });
ipcMain.handle('palette:resize', (_e, h) => {
  if (palette && !palette.isDestroyed() && Number.isFinite(h)) { const b = palette.getBounds(); palette.setBounds({ ...b, height: Math.max(80, Math.min(640, Math.round(h))) }); }
  return true;
});
ipcMain.handle('palette:theme', () => loadStore().settings.theme || null);

// Overlay y captura solo actúan estando dentro de un juego. Un atajo global se «come» la tecla en todo Windows, así que solo se
// registra mientras un juego tiene la ventana en primer plano: un proceso de PowerShell avisa de cada cambio de ventana
// activa; si es un juego de la biblioteca (abierto desde Comptus, Steam, etc.) se activan los atajos y, al salir, se sueltan.
const FG_LOOP = '[Console]::OutputEncoding=[Text.Encoding]::UTF8;$ProgressPreference="SilentlyContinue";' +
  'Add-Type -Namespace W -Name U -MemberDefinition \'[DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p); [DllImport("kernel32.dll")] public static extern IntPtr OpenProcess(uint a, bool b, uint pid); [DllImport("kernel32.dll", CharSet=CharSet.Unicode)] public static extern bool QueryFullProcessImageName(IntPtr h, uint f, System.Text.StringBuilder s, ref uint n); [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);\';' +
  "$last='x'; while($true){ $p=0; [void][W.U]::GetWindowThreadProcessId([W.U]::GetForegroundWindow(),[ref]$p); $path=$null; " +
  "$h=[W.U]::OpenProcess(0x1000,$false,$p); if($h -ne [IntPtr]::Zero){ $sb=New-Object Text.StringBuilder 1024; $n=[uint32]1024; if([W.U]::QueryFullProcessImageName($h,0,$sb,[ref]$n)){ $path=$sb.ToString() }; [void][W.U]::CloseHandle($h) }; " +
  "if(-not $path){ $path=(Get-Process -Id $p -ErrorAction SilentlyContinue).Path }; " +
  "if($path -ne $last){ $last=$path; [Console]::Out.WriteLine('FG|'+$p+'|'+$path); [Console]::Out.Flush() }; Start-Sleep -Milliseconds 600 }";
let lastGameFg = 0;
let fgProc = null, fgGame = false, fgBuf = '', fgLast = null, fgLastPid = 0;
const fgLog = [], hkState = {};
const dlog = (s) => { fgLog.push(new Date().toLocaleTimeString('es') + '  ' + s); if (fgLog.length > 40) fgLog.shift(); };
const overlayAny = () => !!loadStore().settings.overlayAny;
function fgChanged(p, pid) {
  fgLast = p; fgLastPid = pid;
  const self = p && path.win32.normalize(p).toLowerCase() === path.win32.normalize(process.execPath).toLowerCase();
  let on = false;
  if (self) on = fgGame && overlay && !overlay.isDestroyed() && overlay.isVisible(); // el propio overlay abierto no cuenta como salir del juego
  else if (p) {
    const g = cache.find((x) => x.installed !== false && (() => { const d = trackerGameDir(x); return d && trackerUnder(d, p); })());
    const t = tracker.active;
    on = !!g || !!(t && ((t.dir && trackerUnder(t.dir, p)) || (t.procs || []).some((q) => q.path && q.path.toLowerCase() === p.toLowerCase())));
    if (g && !t) { if (tracker.track(g)) sendGameState(g.id, 'starting'); }
    if (on && pid) tracker.addPid(pid); // así «Cerrar el juego» lo encuentra aunque Windows no deje leer su ruta (anti-trampas) // se le sigue la pista (nombre en el overlay, cerrarlo, tiempo jugado)
  }
  let why = on ? 'juego de la biblioteca' : 'no es un juego de la biblioteca';
  if (!on && !self && p && overlayAny() && !/\\(explorer|searchhost|shellexperiencehost|startmenuexperiencehost|applicationframehost)\.exe$/i.test(p)) { on = true; why = 'modo «cualquier programa»'; }
  dlog('ventana activa: ' + (p || '(desconocida)') + ' → ' + (self ? 'Comptus' : why) + (on !== fgGame ? (on ? ' · atajos ACTIVADOS' : ' · atajos soltados') : ''));
  if (on) lastGameFg = Date.now();
  if (on !== fgGame) { fgGame = on; if (!on) lastGameFg = Date.now(); registerHotkeys(); }
}
function startFgWatch() {
  if (fgProc || process.platform !== 'win32' || !overlayOn()) return;
  try {
    fgProc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(FG_LOOP, 'utf16le').toString('base64')], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }); lowPrioProc(fgProc);
    dlog('vigilante de ventana activa iniciado');
    let errN = 0; fgProc.stderr.on('data', (d) => { if (!String(d).startsWith('#<') && errN++ < 3) dlog('PowerShell: ' + String(d).trim().slice(0, 300)); });
    fgProc.stdout.on('data', (d) => {
      fgBuf += d.toString('utf8'); let i;
      while ((i = fgBuf.indexOf('\n')) >= 0) { const line = fgBuf.slice(0, i).replace(/\r$/, ''); fgBuf = fgBuf.slice(i + 1); if (line.startsWith('FG|')) { const k = line.indexOf('|', 3); const pid = parseInt(line.slice(3, k), 10) || 0; const fp = line.slice(k + 1); try { fgChanged(fp || null, pid); } catch {} } }
    });
    fgProc.on('exit', (c) => { dlog('el vigilante de ventana activa terminó (código ' + c + ')'); fgProc = null; if (fgGame) { fgGame = false; registerHotkeys(); } });
  } catch (e) { dlog('no se pudo iniciar el vigilante: ' + e.message); fgProc = null; }
}
function stopFgWatch() { try { if (fgProc) fgProc.kill(); } catch {} fgProc = null; if (fgGame) { fgGame = false; registerHotkeys(); } }
// El overlay es solo para juegos: si Comptus (el lanzador o el modo consola) es la ventana activa, no se abre
const overlayShown = () => !!(overlay && !overlay.isDestroyed() && overlay.isVisible());
const inGameNow = async () => {
  if (!overlayShown() && win && !win.isDestroyed() && win.isFocused()) return false;
  return fgGame || overlayShown();
};
function registerHotkeys() {
  const failed = {};
  if (!globalShortcut) return failed;
  globalShortcut.unregisterAll();
  const hk = getHotkeys();
  const reg = (name, fn) => {
    try { if (!hk[name] || !globalShortcut.register(hk[name], fn)) failed[name] = true; } catch { failed[name] = true; }
    hkState[name] = failed[name] ? 'NO se pudo registrar «' + hk[name] + '» (lo usa otro programa)' : 'registrado «' + hk[name] + '»';
  };
  if (sysSettings().quickSearch) reg('search', togglePalette); // la búsqueda rápida no depende del overlay
  for (const k of ['overlay', 'shot']) hkState[k] = 'sin registrar (ningún juego en primer plano)';
  if (!overlayOn() || !fgGame) return failed;
  reg('overlay', async () => { dlog('pulsado el atajo del overlay'); if (await inGameNow()) toggleOverlay(); });
  reg('shot', async () => { dlog('pulsado el atajo de captura'); if (await inGameNow()) takeScreenshot(); });
  return failed;
}

function logSession(g) { // historial de sesiones (para las estadísticas): solo si el juego llegó a abrirse y duró al menos un minuto
  try {
    if (!g || !g.seen || !g.startedAt) return;
    const mins = Math.round((Date.now() - g.startedAt) / 60000);
    if (mins < 1) return;
    const store = loadStore();
    store.sessions = [...(store.sessions || []), { id: g.id, s: g.startedAt, m: mins }].slice(-20000);
    saveStore(store);
  } catch { /* no es crítico */ }
}
const gameById = (id) => cache.find((x) => x.id === id);
ipcMain.handle('saves:info', (_e, id) => { const g = gameById(id); if (!g) return { ok: false, error: 'Juego no encontrado.' }; try { return { ...getSaves().info(g), opts: saveOpts() }; } catch (e) { return { ok: false, error: e.message }; } });
ipcMain.handle('saves:backup', (_e, id) => { const g = gameById(id); if (!g) return { ok: false, error: 'Juego no encontrado.' }; try { return getSaves().backup(g, { note: 'Manual', force: true, keep: saveOpts().keep }); } catch (e) { return { ok: false, error: e.message }; } });
ipcMain.handle('saves:restore', (_e, id, bid) => { const g = gameById(id); if (!g) return { ok: false, error: 'Juego no encontrado.' }; if (gameRunning()) return { ok: false, error: 'Cierra el juego antes de restaurar.' }; try { return getSaves().restore(g, bid, saveOpts().keep); } catch (e) { return { ok: false, error: e.message }; } });
ipcMain.handle('saves:remove', (_e, id, bid) => { const g = gameById(id); if (!g) return { ok: false }; try { return getSaves().remove(g, bid); } catch (e) { return { ok: false, error: e.message }; } });
ipcMain.handle('saves:openFolder', async (_e, id) => { const g = gameById(id); if (!g) return { ok: false }; const d = getSaves().gameDir(g); fs.mkdirSync(d, { recursive: true }); const err = await shell.openPath(d); return { ok: !err, error: err }; });
ipcMain.handle('saves:openSaves', async (_e, p) => { if (typeof p !== 'string') return { ok: false }; const err = await shell.openPath(p); return { ok: !err, error: err }; });
ipcMain.handle('saves:suggest', (_e, id) => { const g = gameById(id); if (!g) return { ok: false, error: 'Juego no encontrado.' };
  try {
    const hint = ((loadStore().saveHints || {})[id] || {});
    const mine = new Set(((loadStore().savePaths || {})[id] || []).map((p) => p.toLowerCase()));
    const fromPlay = (hint.list || []).filter((c) => fs.existsSync(c.path) && !mine.has(c.path.toLowerCase()));
    const rest = getSaves().suggest(g).filter((c) => !fromPlay.some((h) => h.path.toLowerCase() === c.path.toLowerCase()));
    return { ok: true, list: [...fromPlay, ...rest], playedAt: hint.when || 0 };
  } catch (e) { return { ok: false, error: e.message }; } });
ipcMain.handle('saves:addSuggested', (_e, id, p) => {
  const g = gameById(id); if (!g || typeof p !== 'string' || !path.isAbsolute(p) || !fs.existsSync(p)) return { ok: false };
  const store = loadStore(); store.savePaths = store.savePaths || {};
  const cur = store.savePaths[id] || [];
  if (!cur.some((x) => x.toLowerCase() === p.toLowerCase())) store.savePaths[id] = [...cur, p];
  saveStore(store); return { ok: true };
});
ipcMain.handle('saves:addPath', async (_e, id, kind) => {
  const g = gameById(id); if (!g) return { ok: false };
  const r = await dialog.showOpenDialog(win, { title: kind === 'file' ? 'Archivo de guardado' : 'Carpeta de guardado', properties: [kind === 'file' ? 'openFile' : 'openDirectory'] });
  if (r.canceled || !r.filePaths[0]) return { ok: true, canceled: true };
  const p = r.filePaths[0];
  if (p.split(/[\\/]/).filter(Boolean).length < 2) return { ok: false, error: 'Elige una carpeta concreta, no la raíz de un disco.' };
  const store = loadStore(); store.savePaths = store.savePaths || {};
  const cur = store.savePaths[id] || [];
  if (!cur.some((x) => x.toLowerCase() === p.toLowerCase())) store.savePaths[id] = [...cur, p];
  saveStore(store); return { ok: true };
});
ipcMain.handle('saves:removePath', (_e, id, p) => { const store = loadStore(); store.savePaths = store.savePaths || {}; store.savePaths[id] = (store.savePaths[id] || []).filter((x) => x !== p); saveStore(store); return { ok: true }; });
ipcMain.handle('saves:db', () => getSaves().status());
ipcMain.handle('saves:update', (_e, force) => getSaves().update(!!force));
ipcMain.handle('stats:sessions', () => loadStore().sessions || []);
let savesInst = null;
function getSaves() {
  if (!savesInst) savesInst = createSaves({
    userData: userDir(), backupsRoot: () => path.join(media.dirOf(userDir()), 'Partidas guardadas'),
    findSteamPath: () => { try { return require('./scanners/steam').steamPathSync(); } catch { return null; } },
    extraPaths: (g) => ((loadStore().savePaths || {})[g.id] || []),
    documentsDir: (() => { try { return app.getPath('documents'); } catch { return null; } })(),
  });
  return savesInst;
}
const saveOpts = () => { const s = loadStore().settings || {}; return { auto: s.saveAuto !== false, keep: Math.max(1, Math.min(30, parseInt(s.saveKeep, 10) || 5)) }; };
function detectSavesAfter(g) { // juegos sin guardados conocidos: se miran los archivos que cambiaron durante la sesión
  try {
    if (!g || !g.seen || !g.startedAt || Date.now() - g.startedAt < 60000) return;
    const game = cache.find((x) => x.id === g.id); if (!game) return;
    const sv = getSaves(); const info = sv.info(game);
    if (info.known && info.paths.length) return; // ya sabemos dónde guarda
    setTimeout(async () => {
      try {
        const list = await sv.detect(game, g.startedAt);
        const store = loadStore(); store.saveHints = store.saveHints || {};
        store.saveHints[game.id] = { when: Date.now(), list };
        saveStore(store);
        if (list.length && win && !win.isDestroyed()) win.webContents.send('saves:hint', { id: game.id, name: game.name, n: list.length });
      } catch { /* no es crítico */ }
    }, 6000);
  } catch { /* no es crítico */ }
}
function autoBackupSaves(g) { // al cerrar un juego, copia su progreso (si lo conocemos y cambió)
  try {
    const o = saveOpts(); if (!o.auto || !g) return;
    const game = cache.find((x) => x.id === g.id); if (!game) return;
    setTimeout(() => {
      try {
        const r = getSaves().backup(game, { keep: o.keep, maxBytes: 100 * 1024 * 1024 });
        if (r.ok && r.fresh && win && !win.isDestroyed()) win.webContents.send('saves:done', { id: game.id, name: game.name });
      } catch { /* no es crítico */ }
    }, 4000); // un momento, para que el juego termine de soltar sus archivos
  } catch { /* no es crítico */ }
}
// Trae la ventana principal al frente y con el foco del teclado y del mando. Windows a veces no deja robar el foco de un
// juego que se está cerrando, así que se insiste unas veces (si ya tiene el foco, no hace nada más).
function bringMainFront() {
  const go = (first) => {
    if (!win || win.isDestroyed()) return;
    if (!first && win.isFocused() && win.isVisible() && !win.isMinimized()) return;
    try {
      if (win.isMinimized()) win.restore();
      if (!win.isVisible()) win.show();
      win.setAlwaysOnTop(true, 'screen-saver'); win.show(); win.moveTop(); win.focus();
      try { app.focus({ steal: true }); } catch {}
      win.webContents.focus();
      setTimeout(() => { try { if (!win.isDestroyed()) win.setAlwaysOnTop(false); } catch {} }, 300);
    } catch {}
  };
  go(true); setTimeout(() => go(false), 500); setTimeout(() => go(false), 1500); setTimeout(() => go(false), 3500);
  if (couchOn) scheduleCouchFit([1200, 3000, 6000]); // el juego pudo cambiar la resolución y restaurarla al cerrarse
}
function onGameEnd(g) {
  stopping = false;
  logSession(g);
  autoBackupSaves(g);
  detectSavesAfter(g);
  if (g) { sendGameState(g.id, null); setTimeout(() => detectNewAch(cache.find((x) => x.id === g.id) || g), 6000); }
  if (overlay && !overlay.isDestroyed()) overlay.hide();
  if (win && !win.isDestroyed()) {
    win.webContents.send('library:changed');
    // Al terminar el juego, el lanzador vuelve al frente y con el foco (así el mando funciona sin hacer clic).
    // Con el modo consola abierto vuelve siempre, pase lo que pase con el overlay o con el tiempo transcurrido.
    if (couchOn || (!win.isVisible() && hiddenForGame) || Date.now() - lastGameFg < 30000 || couchMin) {
      hiddenForGame = false; couchMin = false;
      try { dlog('juego cerrado → se devuelve el foco a Comptus' + (couchOn ? ' (modo consola)' : '')); } catch {}
      bringMainFront();
    }
  }
}

ipcMain.handle('hotkeys:get', () => getHotkeys());
ipcMain.handle('overlay:diag', () => [
  'Vigilante de ventana activa: ' + (fgProc ? 'en marcha' : (process.platform === 'win32' ? 'PARADO' : 'solo Windows')),
  'Atajos activos ahora: ' + (fgGame ? 'sí (juego en primer plano)' : 'no (no hay juego en primer plano)'),
  'Overlay: ' + (hkState.overlay || '—'), 'Captura: ' + (hkState.shot || '—'),
  'Mando (XInput): ' + (xiProc ? 'lector en marcha · ' + (xiCount < 0 ? 'sin datos aún' : xiCount + ' mando(s) conectado(s)') : 'parado') + ' · combinación: ' + padMode() + (padMode() === 'custom' ? ' (' + padBtns().join('+') + ')' : ''),
  'Juegos en la biblioteca: ' + cache.length + ' · seguimiento: ' + (tracker.active ? tracker.active.name : 'ninguno'),
  '', 'Últimos eventos:', ...fgLog.slice().reverse()].join('\n'));
ipcMain.handle('hotkeys:set', (_e, patch) => {
  const store = loadStore();
  const prev = { ...getHotkeys() };
  const next = { ...prev };
  for (const k of Object.keys(DEFAULT_HOTKEYS)) {
    if (typeof patch[k] === 'string' && /^[\w+]{1,40}$/.test(patch[k])) next[k] = patch[k];
  }
  store.settings.hotkeys = next;
  saveStore(store);
  let failed = registerHotkeys();
  if (Object.keys(failed).length) { // ese atajo lo usa otro programa: se deja el anterior
    for (const k of Object.keys(failed)) next[k] = prev[k];
    store.settings.hotkeys = next;
    saveStore(store);
    const first = failed;
    registerHotkeys();
    failed = first;
  }
  return { hotkeys: next, failed };
});

ipcMain.handle('overlay:state', () => {
  const a = tracker.active;
  const g = a && cache.find((x) => x.id === a.id);
  return {
    game: a ? { id: a.id, name: a.name, cover: g ? g.cover || g.coverFallback || null : null } : null,
    sessionStart: a && a.startedAt ? a.startedAt : null,                 // para el cronómetro de la sesión
    playTime: g ? ((loadStore().meta[g.id] || {}).playTime || g.playTime || 0) : 0, // minutos jugados en total (antes de esta sesión)
    accent: (loadStore().settings.theme || {}).accent || null,
  };
});
// «Sonando ahora»: lo que suena en Windows (Spotify y otros) con pausa / siguiente / anterior; ver nowplaying.js
const nowPlaying = require('./nowplaying').createNowPlaying();
let npLastErr = '', npLastThumbErr = '', npState = { has: false }, npThumb = { key: '', data: '' }, npJson = '', npBusy = false;
const npEnabled = () => process.platform === 'win32' && loadStore().settings.nowPlaying !== false;
const npWanted = () => npEnabled() && ((win && !win.isDestroyed() && win.isVisible() && !win.isMinimized()) || (overlay && !overlay.isDestroyed() && overlay.isVisible()));
const npApp = (id) => String(id || '').split('!').pop().replace(/\.exe$/i, '').replace(/_.*$/, '').slice(0, 40);
function npBroadcast() {
  try { if (win && !win.isDestroyed()) win.webContents.send('media:state', npState); } catch {}
  try { if (overlay && !overlay.isDestroyed()) overlay.webContents.send('media:state', npState); } catch {}
}
async function npPoll(force) {
  if (!npEnabled()) return { has: false, disabled: true };
  if (npBusy || (!force && !npWanted())) return npState;
  npBusy = true;
  try {
    const r = await nowPlaying.get();
    let s = { has: false };
    if (!r.ok) { s = { has: false, error: String(r.error || '').slice(0, 200) }; if (s.error !== npLastErr) { npLastErr = s.error; try { dlog('música: no se pudo leer el reproductor de Windows (' + s.error + ')'); } catch {} } if (process.env.COMPTUS_DEBUG) console.error('now playing', r.error); }
    else if (r.data && r.data.has) {
      const d = r.data;
      if (d.thumb) npThumb = { key: d.key, data: d.thumb };
      if (d.thumbErr && d.thumbErr !== npLastThumbErr) { npLastThumbErr = d.thumbErr; try { dlog('música: no se pudo leer la portada (' + d.thumbErr + ')'); } catch {} }
      s = { has: true, title: d.title || '', artist: d.artist || '', album: d.album || '', app: npApp(d.app), playing: !!d.playing, key: d.key, thumb: npThumb.key === d.key ? npThumb.data : '' };
    }
    const j = JSON.stringify(s);
    if (j !== npJson) { npJson = j; npState = s; npBroadcast(); }
  } catch { /* se reintenta en el siguiente ciclo */ } finally { npBusy = false; }
  return npState;
}
function npApplySetting() { if (!npEnabled()) { nowPlaying.stop(); npState = { has: false }; npJson = ''; npBroadcast(); } else npPoll(true); }
setInterval(() => { npPoll(false); }, 2000);
ipcMain.handle('media:get', () => npPoll(true));
ipcMain.handle('media:cmd', async (_e, c) => {
  if (!npEnabled()) return { ok: false };
  const r = await nowPlaying.cmd(c);
  setTimeout(() => npPoll(true), 350);
  return { ok: !!r.ok };
});

// Mezclador de volumen (general y por aplicación) con sliders; ver mixer.js
const mixer = require('./mixer').createMixer();
ipcMain.handle('overlay:mixer:list', async () => {
  const r = await mixer.list();
  if (!r.ok) return r;
  const a = tracker.active; const gp = new Set([...(a && a.pids ? a.pids : []), ...(a && a.extra ? a.extra : [])].map(Number).filter((n) => n > 0));
  if (fgGame && Number(fgLastPid) > 0) gp.add(Number(fgLastPid));
  return { ok: true, items: r.data.map((x) => ({ ...x, game: gp.has(x.pid) })) };
});
ipcMain.handle('overlay:mixer:set', (_e, pid, vol) => mixer.set(pid, vol));
ipcMain.handle('overlay:mixer:mute', (_e, pid) => mixer.mute(pid));
// Volumen del sistema: se pulsan las teclas multimedia de Windows (sube/baja de 2 en 2 %, así que cada pulsación del overlay da 5 pasos)
const VOL_KEYS = { up: 0xAF, down: 0xAE, mute: 0xAD };
ipcMain.handle('overlay:volume', (_e, dir) => new Promise((resolve) => {
  const vk = VOL_KEYS[dir];
  if (!vk || process.platform !== 'win32') return resolve({ ok: false, error: 'El volumen solo se puede cambiar desde Windows.' });
  const steps = dir === 'mute' ? 1 : 5;
  const script = 'Add-Type -TypeDefinition \'using System; using System.Runtime.InteropServices; public class KB { [DllImport("user32.dll")] public static extern void keybd_event(byte b, byte s, uint f, UIntPtr e); }\'\n'
    + `1..${steps} | ForEach-Object { [KB]::keybd_event(${vk}, 0, 0, [UIntPtr]::Zero); [KB]::keybd_event(${vk}, 0, 2, [UIntPtr]::Zero) }`;
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { windowsHide: true, timeout: 8000 }, (err) => resolve(err ? { ok: false, error: 'No se pudo cambiar el volumen.' } : { ok: true }));
}));
ipcMain.handle('overlay:shot', () => takeScreenshot());
ipcMain.handle('overlay:exit', async () => {
  const res = await stopActiveGame();
  if (res.ok) { // si falla, el overlay sigue abierto para mostrar el motivo
    if (overlay && !overlay.isDestroyed()) overlay.hide();
    showToast('Cerrando el juego…');
  }
  return res;
});
ipcMain.handle('overlay:showLauncher', () => {
  if (overlay && !overlay.isDestroyed()) overlay.hide();
  if (win && !win.isDestroyed()) { win.show(); if (win.isMinimized()) win.restore(); win.focus(); }
  return true;
});
ipcMain.on('overlay:resize', (_e, h) => {
  if (!overlay || overlay.isDestroyed() || overlayMode !== 'panel') return;
  const a = cursorDisplay().workArea, b = overlay.getBounds();
  const nh = Math.max(300, Math.min(Math.round(Number(h) || 0), a.height - 20));
  if (!nh || Math.abs(nh - b.height) < 2) return;
  overlay.setBounds({ x: b.x, y: a.y + Math.round((a.height - nh) / 2), width: b.width, height: nh });
});
ipcMain.handle('overlay:hide', () => { if (overlay && !overlay.isDestroyed()) overlay.hide(); return true; });

ipcMain.handle('shots:list', (_e, id) => shots.list(app.getPath('userData'), id));
ipcMain.handle('shots:delete', (_e, file) => shots.remove(app.getPath('userData'), file));
ipcMain.handle('shots:openFolder', async (_e, id) => {
  const dir = shots.dirFor(app.getPath('userData'), id);
  fs.mkdirSync(dir, { recursive: true });
  const err = await shell.openPath(dir);
  return err ? { ok: false, error: err } : { ok: true };
});

// ---------- Ventana ----------
// Tamaño inicial: el guardado de la última vez (si sigue cabiendo en alguna pantalla) o, la primera vez,
// cerca del 85 % del área útil de la pantalla principal.
function initialBounds() {
  let work = { x: 0, y: 0, width: 1920, height: 1080 };
  try { work = screen.getPrimaryDisplay().workArea; } catch { /* sin pantalla */ }
  const def = {
    width: Math.max(1000, Math.min(Math.round(work.width * 0.85), 2200)),
    height: Math.max(640, Math.min(Math.round(work.height * 0.88), 1400)),
  };
  def.width = Math.min(def.width, work.width); def.height = Math.min(def.height, work.height);
  const saved = loadStore().settings.windowBounds;
  if (saved && saved.width >= 800 && saved.height >= 560) {
    try {
      const vis = screen.getAllDisplays().some((d) => {
        const a = d.workArea;
        return saved.x + 100 < a.x + a.width && saved.x + saved.width - 100 > a.x && saved.y + 40 < a.y + a.height && saved.y > a.y - 40;
      });
      if (vis) return { bounds: saved, maximized: !!saved.maximized };
    } catch { /* se usa el tamaño por defecto */ }
  }
  return { bounds: def, maximized: false };
}
// Pantalla de inicio (con el nombre de Comptus) mientras se abre el lanzador
let afterSplash = null; // arranque pendiente que espera a que la pantalla de inicio ya se vea
let splash = null, splashAt = 0, revealTimer = null, revealed = false, pendingMax = false, restoreBounds = null;
function openSplash() {
  try {
    const th = loadStore().settings.theme || {};
    const col = (c) => (/^#[0-9a-f]{3,8}$/i.test(c || '') ? c : undefined);
    splash = new BrowserWindow({ width: 440, height: 280, frame: false, transparent: true, resizable: false, movable: true, show: false, skipTaskbar: true, alwaysOnTop: true, center: true, hasShadow: false, icon: path.join(__dirname, 'build', 'icon.png'), webPreferences: { contextIsolation: true, nodeIntegration: false } });
    splash.once('ready-to-show', () => { if (splash && !splash.isDestroyed()) { splash.show(); splashAt = Date.now(); } if (afterSplash) { const f = afterSplash; afterSplash = null; setTimeout(f, 30); } });
    splash.on('closed', () => { splash = null; });
    const q = { v: app.getVersion() }; if (col(th.accent)) q.a = col(th.accent); if (col(th.accent2)) q.b = col(th.accent2);
    splash.loadFile(path.join(__dirname, 'renderer', 'splash.html'), { query: q });
  } catch { splash = null; }
}
// Muestra el lanzador y cierra la pantalla de inicio (como mínimo ~1,4 s después de mostrarla, para que no parpadee).
// El lanzador «se despliega» desde la pantalla de inicio: crece desde su tamaño y posición hasta los suyos con un fundido.
const DEPLOY_MS = 420;
const num = (b) => b && ['x', 'y', 'width', 'height'].every((k) => Number.isFinite(b[k]));
function deployMain(done) {
  // Aparece con un fundido sobre la pantalla de inicio, ya a su tamaño final (redimensionar la página cada frame dejaba una fase negra)
  const FADE = 300;
  if (typeof win.setOpacity !== 'function') { try { win.show(); if (pendingMax) { pendingMax = false; win.maximize(); } } catch {} return done(); }
  const pendingMaxHad = pendingMax;
  try { win.setOpacity(0); win.show(); if (pendingMax) { pendingMax = false; win.maximize(); } } catch { try { win.show(); } catch {} return done(); }
  const wasMax = !!pendingMaxHad;
  try { win.webContents.invalidate(); } catch {}
  setTimeout(startFade, wasMax ? 380 : 40); // tras maximizar, la página necesita un instante para redibujarse (si no, se ve un destello blanco)
  let t0 = 0, closed = false;
  function startFade() { t0 = Date.now(); tickLoop(); }
  function tickLoop() {
  const tick = setInterval(() => {
    try {
      if (!win || win.isDestroyed()) throw new Error('cerrada');
      const t = Math.min(1, (Date.now() - t0) / FADE);
      win.setOpacity(t);
      if (!closed && t > 0.6) { closed = true; done(); }
      if (t >= 1) { clearInterval(tick); if (!closed) done(); }
    } catch { clearInterval(tick); try { if (win && !win.isDestroyed()) win.setOpacity(1); } catch {} if (!closed) done(); }
  }, 16);
  }
}
function revealMain(force) {
  if (revealed) return; revealed = true; clearTimeout(revealTimer);
  const closeSplash = () => { try { if (splash && !splash.isDestroyed()) splash.close(); } catch {} splash = null; };
  const go = () => deployMain(closeSplash);
  const wait = splash && splashAt && !force ? Math.max(0, 1400 - (Date.now() - splashAt)) : 0;
  if (wait) setTimeout(go, wait); else go();
}
ipcMain.handle('app:ready', () => { setTimeout(() => revealMain(false), 150); return true; }); // el lanzador ya dibujó su primera pantalla

function createWindow() {
  const init = initialBounds();
  const hiddenStart = process.argv.includes('--oculto') && tray; // iniciado con Windows y minimizado: queda en la bandeja
  const useSplash = !hiddenStart && sysSettings().splash !== false;
  if (useSplash && !splash) openSplash();
  revealed = !useSplash;
  win = new BrowserWindow({
    show: !hiddenStart && !useSplash,
    icon: path.join(__dirname, "build", "icon.png"),
    ...(init.bounds.x != null ? { x: init.bounds.x, y: init.bounds.y } : {}),
    width: init.bounds.width,
    height: init.bounds.height,
    minWidth: 800,
    minHeight: 560,
    backgroundColor: '#0f1115',
    title: 'Comptus',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  pendingMax = !!(init.maximized && win.maximize);
  if (pendingMax && !useSplash) { win.maximize(); pendingMax = false; } // con pantalla de inicio se maximiza al terminar de desplegarse
  // Guarda tamaño, posición y si está maximizada (con un pequeño retraso mientras se arrastra o se cambia el tamaño)
  let boundsTimer = null;
  const saveBounds = () => {
    clearTimeout(boundsTimer);
    boundsTimer = setTimeout(() => {
      try {
        if (!win || win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
        const maximized = win.isMaximized();
        const b = maximized ? (restoreBounds || win.getNormalBounds()) : win.getBounds();
        const store = loadStore();
        store.settings = { ...store.settings, windowBounds: { x: b.x, y: b.y, width: b.width, height: b.height, maximized } };
        saveStore(store);
      } catch { /* no es crítico */ }
    }, 600);
  };
  for (const ev of ['resize', 'move', 'maximize', 'unmaximize']) win.on(ev, saveBounds);
  // Si se desplegó hasta pantalla completa, al restaurarla vuelve al tamaño normal que tenía guardado
  win.on('unmaximize', () => { if (restoreBounds) { const b = restoreBounds; restoreBounds = null; try { win.setBounds(b); } catch {} } });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  if (useSplash) { revealTimer = setTimeout(() => revealMain(true), 5000); if (revealTimer.unref) revealTimer.unref(); if (win.webContents && win.webContents.on) win.webContents.on('did-fail-load', () => revealMain(true)); } // por si el lanzador no avisa, no se queda la pantalla de inicio
  // Con un juego en marcha, cerrar la ventana solo la oculta: los atajos y el overlay siguen activos
  win.on('focus', () => { if (Date.now() - libLastRefresh > 45000 && !tracker.active) refreshLibrary(); }); // volver a Comptus tras un rato: se mira si cambió algo (GOG, Ubisoft, EA, Xbox…)
  win.on('closed', () => { if (!quitting) app.quit(); }); // las ventanas auxiliares ocultas (overlay, escucha del mando) no deben mantener Comptus vivo
  win.on('close', (e) => {
    if (quitting) return;
    const toTray = !!tray && sysSettings().closeToTray;
    if (toTray || (gameRunning() && overlayOn())) {
      e.preventDefault();
      win.hide();
      if (toTray) hintTray(); else { hiddenForGame = true; showToast('El lanzador sigue en segundo plano mientras juegas', 3500); }
    }
  });
}

// Una sola copia abierta: si lo abres otra vez, trae la ventana al frente
const gotLock = app.requestSingleInstanceLock ? app.requestSingleInstanceLock() : true;
if (!gotLock) app.quit();
else if (app.on) {
  app.on('second-instance', () => showMain());
}
app.on('before-quit', () => { quitting = true; try { mixer.stop(); } catch {} try { nowPlaying.stop(); } catch {} stopPadWatch(); stopFgWatch(); stopLibraryWatch(); try { if (tray) { tray.destroy(); tray = null; } } catch {} flushStore(true); });
app.on('will-quit', () => { flushStore(true); if (globalShortcut) globalShortcut.unregisterAll(); });

// Los tráilers de la tienda se reproducen desde la CDN de Steam: se permite leerlos desde la ventana de la app
function allowSteamVideo() {
  if (!session || !session.defaultSession) return;
  session.defaultSession.webRequest.onHeadersReceived({ urls: ['https://*.steamstatic.com/*'] }, (details, cb) => {
    const headers = { ...details.responseHeaders };
    for (const k of Object.keys(headers)) if (/^access-control-allow-origin$/i.test(k)) delete headers[k];
    headers['Access-Control-Allow-Origin'] = ['*'];
    cb({ responseHeaders: headers });
  });
}
app.whenReady().then(() => { if (!gotLock) return; if (!process.argv.includes('--oculto') && sysSettings().splash !== false) openSplash(); /* lo primero: que se vea cuanto antes */
  // El resto del arranque (copias, bandeja, ventana principal…) bloquea el hilo principal: se hace cuando la pantalla de inicio ya se ve (o a los 700 ms como máximo)
  let started = false;
  const rest = () => { if (started) return; started = true; adoptInstallerMediaDir(); applyMediaRoot(); try { backup.autoBackup(app.getPath('userData')); } catch { /* sin copia automática */ } try { if (app.isPackaged) app.setAppUserModelId('com.mateo.gamelauncher'); } catch {} registerToastIdentity(); allowSteamVideo(); createTray(); createWindow(); registerHotkeys(); startFgWatch(); syncPadWatch(); startLibraryWatch(); if (sysSettings().startWithWindows) applyLoginItem();
  updater.start(); setTimeout(() => { try { getSaves().update(false); } catch {} }, 90000); setTimeout(async () => { await autoSyncOwned().catch(() => {}); backgroundInfo().catch(() => {}); setTimeout(() => startDiskScan(false).catch(() => {}), 15000); startFreeNotify(); backgroundSgdb(); }, 4000); };
  if (splash) { afterSplash = rest; setTimeout(() => { afterSplash = null; rest(); }, 700); } else rest(); });
app.on('window-all-closed', () => app.quit());
