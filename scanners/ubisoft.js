const fs = require('fs');
const path = require('path');
const { queryAll, findKeys } = require('./winreg');
const { readCache, ownedGames } = require('./ubisoft-cache');

// Ubisoft Connect no tiene una lista única y fiable, así que se combinan varias fuentes (si una falla, las demás cubren):
//  1) Registro «Launcher\Installs»: carpeta de cada juego instalado y su identificador (HKLM de 64 y 32 bits y HKCU).
//  2) Registro «Uninstall\Uplay Install <id>»: el nombre real del juego (y su carpeta, por si falta la anterior).
//  3) Caché del launcher (como Playnite): todos los juegos de tu cuenta, con nombre, portada e iconos; los que no están
//     instalados salen con el botón «Instalar».
//  4) Carpetas: las bibliotecas de Ubisoft (la de settings.yml, la de por defecto y las de los juegos ya conocidos)
//     se recorren por si hay juegos instalados que el registro no recoge; esos se abren por su .exe.
// Los juegos cuya carpeta ya no existe (entradas de registro huérfanas) se descartan.
const INSTALL_KEYS = [
  'HKLM\\SOFTWARE\\WOW6432Node\\Ubisoft\\Launcher\\Installs',
  'HKLM\\SOFTWARE\\Ubisoft\\Launcher\\Installs',
  'HKCU\\SOFTWARE\\Ubisoft\\Launcher\\Installs',
];
const UNINSTALL_ROOTS = [
  'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
];
const SKIP_EXE = /unins|crash|redist|setup|vcredist|dxsetup|dotnet|launcher|helper|report|cef|ubisoftgamelauncher|uplay|easyanticheat|battleye|benchmark/i;

const clean = (p) => String(p || '').replace(/\//g, path.sep === '\\' ? '\\' : '/').replace(/[\\/]+$/, '');
const norm = (p) => String(p || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();

const realDeps = {
  installs: async () => { const all = {}; for (const k of INSTALL_KEYS) Object.assign(all, await queryAll(k)); return all; },
  uninstall: async () => {
    const all = {};
    for (const root of UNINSTALL_ROOTS) for (const k of await findKeys(root, 'Uplay Install')) Object.assign(all, await queryAll(k));
    return all;
  },
  exists: (p) => { try { return fs.existsSync(p); } catch { return false; } },
  readdir: (p) => { try { return fs.readdirSync(p, { withFileTypes: true }); } catch { return []; } },
  stat: (p) => { try { return fs.statSync(p); } catch { return null; } },
  readText: (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } },
  env: process.env,
};

// Carpetas de bibliotecas de Ubisoft donde mirar
function libraryDirs(known, deps) {
  const env = deps.env || {};
  const set = new Map();
  const add = (d) => { if (d && !set.has(norm(d))) set.set(norm(d), clean(d)); };
  const settings = deps.readText(path.join(env.LOCALAPPDATA || '', 'Ubisoft Game Launcher', 'settings.yml'));
  const m = settings.match(/game_installation_path:\s*["']?([^"'\r\n]+?)["']?\s*$/m);
  if (m) add(m[1]);
  for (const base of [env['ProgramFiles(x86)'], env.ProgramFiles, 'C:\\Program Files (x86)']) {
    if (base) add(path.join(base, 'Ubisoft', 'Ubisoft Game Launcher', 'games'));
  }
  for (const d of known) { const parent = path.dirname(clean(d)); if (/ubisoft/i.test(parent)) add(parent); }
  return [...set.values()];
}

// El .exe del juego dentro de una carpeta (para abrirlo directamente cuando no se conoce su identificador)
function findGameExe(dir, deps) {
  const exes = [];
  const visit = (d, depth) => {
    for (const e of deps.readdir(d)) {
      const full = path.join(d, e.name);
      if (e.isFile && e.isFile() && /\.exe$/i.test(e.name) && !SKIP_EXE.test(e.name)) {
        const st = deps.stat(full); exes.push({ full, size: st ? st.size : 0 });
      } else if (depth < 2 && e.isDirectory && e.isDirectory() && !/^(_?redist|support|_commonredist|dxsetup|\.)/i.test(e.name)) visit(full, depth + 1);
    }
  };
  visit(dir, 0);
  exes.sort((a, b) => b.size - a.size);
  return exes[0] ? exes[0].full : null;
}

// Reúne las fuentes y devuelve { games, info } (info sirve para el diagnóstico)
async function collect(depsIn) {
  const deps = { ...realDeps, ...(depsIn || {}) };
  const info = { cache: null, ownedCount: 0, installKeys: 0, uninstallKeys: 0, dirs: [], notFound: [], fromFolders: [] };
  const byId = new Map(); // id -> { dir, name }

  const installs = await deps.installs().catch(() => ({}));
  for (const [key, v] of Object.entries(installs)) {
    const id = key.split('\\').filter(Boolean).pop();
    if (!/^\d+$/.test(id)) continue;
    info.installKeys++;
    if (!v.InstallDir) continue;
    const e = byId.get(id) || {};
    e.dir = e.dir || clean(v.InstallDir);
    byId.set(id, e);
  }
  const uninst = await deps.uninstall().catch(() => ({}));
  for (const [key, v] of Object.entries(uninst)) {
    const m = key.match(/Uplay Install (\d+)\s*$/i);
    if (!m) continue;
    info.uninstallKeys++;
    const e = byId.get(m[1]) || {};
    if (v.DisplayName) e.name = v.DisplayName;
    if (!e.dir && v.InstallLocation) e.dir = clean(v.InstallLocation);
    byId.set(m[1], e);
  }

  const games = [];
  const knownDirs = new Set();
  for (const [id, e] of byId) {
    if (!e.dir) continue;
    if (!deps.exists(e.dir)) { info.notFound.push(`${id} ${e.dir}`); continue; } // entrada huérfana
    knownDirs.add(norm(e.dir));
    games.push({
      id: `ubisoft:${id}`, source: 'ubisoft',
      name: e.name || path.basename(e.dir),
      cover: null, installPath: e.dir, launchUri: `uplay://launch/${id}/0`,
    });
  }

  // Caché del launcher: datos de todos los juegos de la cuenta
  const cacheRes = deps.cache ? deps.cache() : readCache(deps.env);
  const excluded = [];
  const owned = ownedGames(cacheRes.products || [], excluded, { includeStore: !!deps.includeStore });
  info.excluded = excluded;
  info.cache = { file: cacheRes.file || '', missing: !!cacheRes.missing, bytes: cacheRes.bytes || 0, error: cacheRes.error || '', ...(cacheRes.stats || {}) };
  info.ownedCount = owned.length;
  const ownedById = new Map(owned.map((p) => [String(p.uplayId), p]));
  const installedIds = new Set();
  for (const g of games) {
    const id = g.id.replace(/^ubisoft:/, '');
    installedIds.add(id);
    const p = ownedById.get(id);
    if (!p) continue;
    g.name = p.name || g.name;
    if (p.cover) g.cover = p.cover;
    if (p.background) g.banner = p.background;
    if (p.logo) g.logo = p.logo;
  }
  for (const p of owned) {
    const id = String(p.uplayId);
    if (installedIds.has(id)) continue;
    games.push({
      id: `ubisoft:${id}`, source: 'ubisoft', name: p.name, installed: false,
      ...(p.viaStore ? { viaStore: true } : { installUri: `uplay://install/${id}` }),
      cover: p.cover || null, ...(p.background ? { banner: p.background } : {}), ...(p.logo ? { logo: p.logo } : {}), ...(p.icon ? { icon: p.icon } : {}),
    });
  }

  // Carpetas de biblioteca: juegos que el registro no recoge
  info.dirs = libraryDirs([...byId.values()].map((e) => e.dir).filter(Boolean), deps);
  for (const lib of info.dirs) {
    for (const e of deps.readdir(lib)) {
      if (!(e.isDirectory && e.isDirectory())) continue;
      const dir = path.join(lib, e.name);
      if (knownDirs.has(norm(dir))) continue;
      const exe = findGameExe(dir, deps);
      if (!exe) continue;
      knownDirs.add(norm(dir));
      info.fromFolders.push(e.name);
      games.push({ id: `ubisoft:dir:${e.name}`, source: 'ubisoft', name: e.name, cover: null, installPath: dir, exe });
    }
  }
  return { games, info };
}

// `registryOverride` (solo pruebas): resultado de leer «Launcher\Installs», sin mirar carpetas
async function scanUbisoft(registryOverride, depsIn) {
  if (registryOverride) {
    const deps = { installs: async () => registryOverride, uninstall: async () => ({}), exists: () => true, readdir: () => [], cache: () => ({ products: [] }), ...(depsIn || {}) };
    return (await collect(deps)).games;
  }
  return (await collect(depsIn)).games;
}

// Texto para pegar al pedir ayuda: qué fuentes se miraron y qué se encontró
async function diagnoseUbisoft(depsIn) {
  const { games, info } = await collect(depsIn);
  const L = [];
  L.push(`Ubisoft Connect — ${games.length} juego(s) detectado(s)`);
  L.push(`Claves «Launcher\\Installs» leídas: ${info.installKeys}`);
  L.push(`Entradas «Uplay Install»: ${info.uninstallKeys}`);
  const c = info.cache || {};
  L.push(`Caché de Ubisoft: ${c.missing ? 'NO ENCONTRADA' : `${c.bytes || 0} bytes, ${c.entries || 0} registros, ${c.parsed || 0} leídos, ${c.skipped || 0} saltados`}${c.error ? ' · ' + c.error : ''}${c.file ? ' · ' + c.file : ''}`);
  L.push(`Juegos de tu cuenta según la caché (sin contenido extra ni de otras tiendas): ${info.ownedCount}`);
  L.push(`Carpetas de biblioteca revisadas: ${info.dirs.join(' | ') || '(ninguna)'}`);
  if ((info.excluded || []).length) {
    L.push(`Descartados de la caché (${info.excluded.length}):`);
    for (const e of info.excluded) L.push(`  · ${e.name} [${e.id}] — ${e.why}`);
  }
  if (info.notFound.length) L.push(`Descartados (la carpeta ya no existe): ${info.notFound.join(' | ')}`);
  if (info.fromFolders.length) L.push(`Encontrados solo por carpeta: ${info.fromFolders.join(', ')}`);
  for (const g of games) L.push(`- ${g.name} [${g.id}] ${g.installed === false ? '(no instalado)' : g.installPath}${g.exe ? ' (abre el .exe)' : ''}`);
  return L.join('\n');
}

module.exports = { scanUbisoft, diagnoseUbisoft, collect };
