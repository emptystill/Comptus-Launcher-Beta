// Copias de seguridad de las partidas guardadas de cada juego.
// Las rutas donde cada juego guarda su progreso vienen de la base de datos comunitaria Ludusavi
// (https://github.com/mtkennerly/ludusavi-manifest). Se descarga una vez cada 2 semanas y se reduce a un índice pequeño.
// No toca la nube de ninguna tienda: solo copia archivos de tu PC y los puede devolver a su sitio.
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { Worker } = require('worker_threads');

const MANIFEST_URL = 'https://raw.githubusercontent.com/mtkennerly/ludusavi-manifest/master/data/manifest.yaml';
const MAX_AGE = 14 * 24 * 3600 * 1000;
const MAX_BYTES = 600 * 1024 * 1024; // un guardado más grande que esto se omite (casi seguro no es un guardado)
const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '');

function createSaves({ userData, backupsRoot, findSteamPath, documentsDir, extraPaths = () => [], fsx = fs, now = () => Date.now() }) {
  const dir = path.join(userData, 'saves-db');
  const indexFile = path.join(dir, 'index.json');
  let idx = null, building = null, lastError = '';

  // ---------- base de datos ----------
  function load() {
    if (idx) return idx;
    try {
      const d = JSON.parse(fsx.readFileSync(indexFile, 'utf8'));
      const bySteam = new Map(), byGog = new Map(), byName = new Map();
      for (const e of d.games) {
        if (e.s) bySteam.set(String(e.s), e);
        for (const x of e.x || []) if (!bySteam.has(String(x))) bySteam.set(String(x), e);
        if (e.g) byGog.set(String(e.g), e);
        const k = norm(e.n); if (k && !byName.has(k)) byName.set(k, e);
        for (const dn of e.d || []) { const k2 = norm(dn); if (k2 && !byName.has(k2)) byName.set(k2, e); }
      }
      idx = { built: d.built || 0, count: d.games.length, bySteam, byGog, byName };
    } catch { idx = null; }
    return idx;
  }
  const status = () => { const i = load(); return { ready: !!i, count: i ? i.count : 0, built: i ? i.built : 0, building: !!building, error: lastError }; };

  function download(url, to, redirects = 5) {
    return new Promise((resolve, reject) => {
      const req = https.get(url, { headers: { 'User-Agent': 'Comptus' } }, (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) { res.resume(); resolve(download(new URL(res.headers.location, url).href, to, redirects - 1)); return; }
        if (res.statusCode !== 200) { res.resume(); reject(new Error('HTTP ' + res.statusCode)); return; }
        const out = fsx.createWriteStream(to);
        res.pipe(out); out.on('finish', () => out.close(() => resolve())); out.on('error', reject); res.on('error', reject);
      });
      req.setTimeout(60000, () => req.destroy(new Error('tiempo agotado'))); req.on('error', reject);
    });
  }

  // Descarga el manifiesto y lo convierte en un proceso aparte (tarda unos segundos y mucha memoria; así no frena Comptus)
  function update(force) {
    if (building) return building;
    const i = load();
    if (!force && i && now() - i.built < MAX_AGE) return Promise.resolve({ ok: true, skipped: true, ...status() });
    building = (async () => {
      try {
        fsx.mkdirSync(dir, { recursive: true });
        const yml = path.join(dir, 'manifest.yaml'), tmp = path.join(dir, 'index.tmp.json');
        await download(MANIFEST_URL, yml);
        // primero en un hilo aparte; si no pudiera, en un proceso aparte
        const viaWorker = () => new Promise((resolve, reject) => {
          const w = new Worker(path.join(__dirname, 'saves-build.js'), { workerData: { input: yml, output: tmp }, resourceLimits: { maxOldGenerationSizeMb: 3072 } });
          w.on('error', reject); w.on('exit', (c) => (c === 0 ? resolve() : reject(new Error('el conversor terminó con código ' + c))));
        });
        const viaProcess = () => new Promise((resolve, reject) => {
          const p = spawn(process.execPath, [path.join(__dirname, 'saves-build.js'), yml, tmp], { env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }, windowsHide: true, stdio: 'ignore' });
          p.on('error', reject); p.on('exit', (c) => (c === 0 ? resolve() : reject(new Error('el conversor terminó con código ' + c))));
        });
        try { await viaWorker(); } catch (e1) { try { await viaProcess(); } catch (e2) { throw new Error(`${e1.message} / ${e2.message}`); } }
        fsx.renameSync(tmp, indexFile);
        try { fsx.unlinkSync(yml); } catch {}
        idx = null; load(); lastError = '';
        return { ok: true, ...status() };
      } catch (e) { lastError = e.message; return { ok: false, error: 'No se pudo actualizar la base de guardados: ' + e.message }; }
      finally { building = null; }
    })();
    return building;
  }

  // ---------- localizar los guardados de un juego ----------
  function entryFor(g) {
    const i = load(); if (!i || !g) return null;
    const sid = (g.source === 'steam' && g.appid) || (/^steam:(\d+)/.exec(g.id || '') || [])[1] || (g.info && g.info.source !== 'rawg' && g.info.appid) || null;
    if (sid && i.bySteam.has(String(sid))) return i.bySteam.get(String(sid));
    const gid = (/^gog:(\d+)/.exec(g.id || '') || [])[1];
    if (gid && i.byGog.has(gid)) return i.byGog.get(gid);
    const cand = [g.name, g.installPath && path.basename(g.installPath)];
    for (const c of cand) { const k = norm(c); if (k && i.byName.has(k)) return i.byName.get(k); }
    return null;
  }

  function vars(g) {
    const env = process.env;
    const home = os.homedir();
    const local = env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    const v = {
      home, winAppData: env.APPDATA || path.join(home, 'AppData', 'Roaming'), winLocalAppData: local,
      winLocalAppDataLow: path.join(path.dirname(local), 'LocalLow'), winDocuments: documentsDir || path.join(home, 'Documents'),
      winPublic: env.PUBLIC || 'C:\\Users\\Public', winProgramData: env.PROGRAMDATA || 'C:\\ProgramData', winDir: env.WINDIR || 'C:\\Windows',
      osUserName: env.USERNAME || path.basename(home), storeUserId: '*',
    };
    if (g && g.installPath) { v.base = g.installPath; v.game = path.basename(g.installPath); }
    const sid = g && ((g.source === 'steam' && g.appid) || (/^steam:(\d+)/.exec(g.id || '') || [])[1]);
    if (sid) {
      v.storeGameId = String(sid);
      const m = g.installPath && /^(.*)[\\/]steamapps[\\/]/i.exec(g.installPath);
      const cands = [m && m[1], findSteamPath && findSteamPath()].filter(Boolean);
      const sp = cands.find((c) => fsx.existsSync(path.join(c, 'userdata'))) || cands[0];
      if (sp) v.root = sp;
    }
    return v;
  }

  const isGlob = (s) => /[*?]/.test(s);
  const segRe = (s) => new RegExp('^' + s.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
  function expandGlob(p) { // admite * y ? en cualquier tramo
    const parts = p.split(/[\\/]+/).filter((x, i) => x !== '' || i === 0);
    let cur = [parts[0] && /^[A-Za-z]:$/.test(parts[0]) ? parts[0] + path.sep : (parts[0] === '' ? path.sep : parts[0])];
    for (const seg of parts.slice(1)) {
      const next = [];
      for (const base of cur) {
        if (!isGlob(seg)) { const f = path.join(base, seg); if (fsx.existsSync(f)) next.push(f); continue; }
        let names = []; try { names = fsx.readdirSync(base); } catch {}
        const re = segRe(seg);
        for (const n of names) if (re.test(n)) next.push(path.join(base, n));
      }
      cur = next; if (!cur.length) break;
    }
    return cur;
  }
  function resolvePaths(entry, g) {
    const v = vars(g), out = new Set();
    for (const t of entry.f) {
      let bad = false;
      const p = t.replace(/<([A-Za-z]+)>/g, (_m, k) => { if (v[k] == null) { bad = true; return ''; } return v[k]; });
      if (bad || /<[A-Za-z]+>/.test(p)) continue;
      if (!path.isAbsolute(p) && !/^[A-Za-z]:/.test(p)) continue;
      for (const f of (isGlob(p) ? expandGlob(p) : (fsx.existsSync(p) ? [p] : []))) out.add(path.normalize(f));
    }
    return nest(out);
  }
  // si una ruta contiene a otra, basta con la de fuera
  function nest(out) {
    const list = [...out].sort((a, b) => a.length - b.length);
    const roots = [];
    for (const f of list) if (!roots.some((r) => f.toLowerCase().startsWith(r.toLowerCase() + path.sep))) roots.push(f);
    return roots;
  }

  // rutas de la base de datos + las que añadió el usuario a mano (sirven para juegos locales o que no están en la base)
  function allPaths(g) {
    const e = entryFor(g);
    const own = (extraPaths(g) || []).filter((p) => { try { return fsx.existsSync(p); } catch { return false; } }).map((p) => path.normalize(p));
    return { e, own, paths: nest([...(e ? resolvePaths(e, g) : []), ...own]) };
  }

  // ---------- recorrido y copia ----------
  function walk(root, cb) { // cb(rutaCompleta, relativa, stat)
    let st; try { st = fsx.statSync(root); } catch { return; }
    if (st.isFile()) { cb(root, path.basename(root), st); return; }
    const rec = (d, rel) => {
      let names = []; try { names = fsx.readdirSync(d); } catch { return; }
      for (const n of names) {
        const f = path.join(d, n); let s; try { s = fsx.statSync(f); } catch { continue; }
        if (s.isDirectory()) rec(f, path.join(rel, n)); else cb(f, path.join(rel, n), s);
      }
    };
    rec(root, '');
  }
  function scan(roots) {
    let bytes = 0, files = 0; const h = crypto.createHash('sha1');
    for (const r of roots) walk(r, (f, rel, s) => { bytes += s.size; files++; h.update(rel + '|' + s.size + '|' + Math.round(s.mtimeMs) + ';'); });
    return { bytes, files, sig: h.digest('hex') };
  }

  const gameDir = (g) => path.join(backupsRoot(), String(g.name || g.id).replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().replace(/[. ]+$/, '').slice(0, 80) || 'juego');
  const stamp = () => { const d = new Date(now()); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; };

  function list(g) {
    const base = gameDir(g), out = [];
    let names = []; try { names = fsx.readdirSync(base); } catch { return out; }
    for (const n of names) {
      try { const m = JSON.parse(fsx.readFileSync(path.join(base, n, 'meta.json'), 'utf8')); out.push({ id: n, date: m.date, bytes: m.bytes, files: m.files, note: m.note || '', sig: m.sig }); } catch {}
    }
    return out.sort((a, b) => b.date - a.date);
  }

  function info(g) {
    const i = load(), { e, paths } = allPaths(g), custom = extraPaths(g) || [];
    const base = { ok: true, db: status(), custom, backups: list(g), folder: gameDir(g) };
    if (!e && !custom.length) return { ...base, known: false, paths: [] };
    const sc = paths.length ? scan(paths) : { bytes: 0, files: 0 };
    return { ...base, known: true, name: e ? e.n : g.name, paths, bytes: sc.bytes, files: sc.files };
  }

  // ---------- «Buscar guardados»: sugerencias para juegos que no están en la base (locales, de la comunidad…) ----------
  const SAVE_DIR = /^(saves?|savegames?|savedata|save[ _-]?files?|slots?|profiles?|userdata|player ?data|partidas?|guardados?)$/i;
  const SAVE_FILE = /\.(sav|save|savegame|sgd|sg|dat|rsav|slot\d*|sav\d+|profile|gamedata)$/i;
  function brief(p) { // archivos, tamaño y fecha de lo más reciente (con tope para que sea rápido)
    let files = 0, bytes = 0, mtime = 0;
    try {
      const st0 = fsx.statSync(p);
      if (st0.isFile()) return { files: 1, bytes: st0.size, mtime: st0.mtimeMs };
      const rec = (d, depth) => {
        let names = []; try { names = fsx.readdirSync(d); } catch { return; }
        for (const n of names) {
          if (files > 3000) return;
          const f = path.join(d, n); let s; try { s = fsx.statSync(f); } catch { continue; }
          if (s.isDirectory()) { if (depth < 4) rec(f, depth + 1); } else { files++; bytes += s.size; if (s.mtimeMs > mtime) mtime = s.mtimeMs; }
        }
      };
      rec(p, 0);
    } catch {}
    return { files, bytes, mtime };
  }
  function suggest(g) {
    const have = new Set(((extraPaths(g) || [])).map((p) => path.normalize(p).toLowerCase()));
    const known = (allPaths(g).paths || []).map((p) => p.toLowerCase());
    const out = new Map();
    const add = (p, why) => {
      const k = path.normalize(p).toLowerCase();
      if (have.has(k) || known.includes(k) || out.has(k)) return;
      const b = brief(p); if (!b.files || b.bytes > MAX_BYTES) return;
      out.set(k, { path: path.normalize(p), dir: fsx.statSync(p).isDirectory(), why, ...b });
    };
    const exeBase = g.exe ? path.basename(g.exe).replace(/\.[^.]*$/, '') : '';
    const inst = g.installPath || (g.exe && path.dirname(g.exe)) || '';
    // A) dentro de la carpeta del juego
    if (inst && fsx.existsSync(inst) && inst.split(/[\\/]/).filter(Boolean).length >= 2) {
      let seen = 0;
      const rec = (d, depth) => {
        let names = []; try { names = fsx.readdirSync(d); } catch { return; }
        for (const n of names) {
          if (++seen > 4000) return;
          const f = path.join(d, n); let s; try { s = fsx.statSync(f); } catch { continue; }
          if (s.isDirectory()) { if (SAVE_DIR.test(n)) add(f, 'carpeta de guardado dentro del juego'); else if (depth < 3) rec(f, depth + 1); }
          else if (SAVE_FILE.test(n) && !SAVE_DIR.test(path.basename(d)) && s.size < 50 * 1048576) add(f, 'archivo de guardado dentro del juego');
        }
      };
      rec(inst, 0);
    }
    // B) carpetas con nombre parecido en los sitios habituales
    const names = [g.name, exeBase, inst && path.basename(inst)].map(norm).filter((x) => x && x.length >= 4);
    if (names.length) {
      const v = vars(g), home = v.home;
      const roots = [v.winDocuments, path.join(v.winDocuments, 'My Games'), path.join(home, 'Saved Games'), v.winAppData, v.winLocalAppData, v.winLocalAppDataLow];
      for (const r of roots) {
        let ents = []; try { ents = fsx.readdirSync(r); } catch { continue; }
        for (const n of ents) {
          const k = norm(n); if (k.length < 4) continue;
          if (!names.some((x) => x === k || (x.length >= 6 && k.includes(x)) || (k.length >= 6 && x.includes(k)))) continue;
          const f = path.join(r, n); try { if (!fsx.statSync(f).isDirectory()) continue; } catch { continue; }
          add(f, 'carpeta con el nombre del juego en ' + path.basename(r));
        }
      }
    }
    return [...out.values()].sort((a, b) => b.mtime - a.mtime).slice(0, 12);
  }

  // ---------- Detección por sesión: qué archivos cambiaron mientras jugabas ----------
  // Sirve para cualquier juego (recompilaciones, mods, juegos de la comunidad…): no depende del nombre ni de ninguna base de datos.
  const NOISE_DIR = /^(microsoft|google|mozilla|packages|temp|tmp|cache|caches|code cache|gpucache|crashpad|crashdumps|nvidia|nvidia corporation|discord|steam|epic|epicgameslauncher|comptus|mi-lanzador-de-juegos|programs|adobe|intel|amd|d3dscache|pip|npm|windows|connecteddevices|virtualstore|application data|local settings|history|inetcache|webcache|electron|chromium|squirrel|jetbrains|node-gyp|uplay|ubisoft game launcher|origin|ea|ea app|battle\.net|blizzard entertainment|gog\.com|gog galaxy|riot games|obs-studio|spotify|slack|teams|zoom|dropbox|onedrive|python|code|vscode|\.vscode|claude)$/i;
  const NOISE_FILE = /\.(log|tmp|etl|dmp|lock|ldb|lnk|pdb|shadercache|cache|bin\.tmp)$/i;
  async function detect(g, sinceMs) {
    const v = vars(g), home = v.home;
    const since = (sinceMs || 0) - 3000, until = now() + 60000;
    const exeBase = g.exe ? path.basename(g.exe) : '';
    const inst = g.installPath || (g.exe && path.dirname(g.exe)) || '';
    const roots = [[v.winDocuments, 3], [path.join(home, 'Saved Games'), 3], [v.winAppData, 3], [v.winLocalAppData, 3], [v.winLocalAppDataLow, 3]];
    if (inst && inst.split(/[\\/]/).filter(Boolean).length >= 2 && fsx.existsSync(inst)) roots.push([inst, 4]);
    const groups = new Map(); let budget = 80000, tick = 0;
    for (const [root, maxDepth] of roots) {
      if (!root || !fsx.existsSync(root)) continue;
      const isInst = root === inst;
      const rec = async (d, depth, top) => {
        let names = []; try { names = fsx.readdirSync(d); } catch { return; }
        for (const n of names) {
          if (--budget < 0) return;
          if (++tick % 400 === 0) await new Promise((r) => setImmediate(r)); // no bloquear Comptus
          const f = path.join(d, n); let s; try { s = fsx.statSync(f); } catch { continue; }
          if (s.isDirectory()) { if (depth < maxDepth && !(depth === 0 && !isInst && NOISE_DIR.test(n))) await rec(f, depth + 1, top || f); continue; }
          if (s.mtimeMs < since || s.mtimeMs > until || NOISE_FILE.test(n) || s.size > 200 * 1048576) continue;
          if (isInst && n.toLowerCase() === exeBase.toLowerCase()) continue;
          const key = top || f; // carpeta de primer nivel (o el propio archivo si está suelto en la raíz)
          const gr = groups.get(key) || { top: key, dirs: new Map(), files: 0, bytes: 0, mtime: 0, root };
          gr.files++; gr.bytes += s.size; gr.mtime = Math.max(gr.mtime, s.mtimeMs);
          gr.dirs.set(d, (gr.dirs.get(d) || 0) + 1);
          groups.set(key, gr);
        }
      };
      await rec(root, 0, null);
    }
    const have = new Set((extraPaths(g) || []).map((p) => path.normalize(p).toLowerCase()));
    const out = [];
    for (const gr of groups.values()) {
      // si todo lo cambiado está dentro de una sola subcarpeta, se afina hasta ella
      let target = gr.top;
      try {
        if (fsx.statSync(target).isDirectory()) {
          const dirs = [...gr.dirs.keys()];
          let common = dirs[0].split(path.sep);
          for (const d of dirs.slice(1)) { const p = d.split(path.sep); let k = 0; while (k < common.length && k < p.length && common[k] === p[k]) k++; common = common.slice(0, k); }
          const c = common.join(path.sep);
          if (c.length >= target.length && fsx.existsSync(c)) target = c;
        }
      } catch { continue; }
      if (have.has(path.normalize(target).toLowerCase())) continue;
      const b = brief(target);
      out.push({ path: path.normalize(target), dir: (() => { try { return fsx.statSync(target).isDirectory(); } catch { return false; } })(), files: b.files || gr.files, bytes: b.bytes || gr.bytes, mtime: gr.mtime, changed: gr.files, why: 'cambió mientras jugabas' });
    }
    return out.sort((a, b) => b.changed - a.changed || b.mtime - a.mtime).slice(0, 8);
  }

  function copyRoot(src, dst) { // copia un archivo o una carpeta entera
    walk(src, (f, rel) => { const to = path.join(dst, rel); fsx.mkdirSync(path.dirname(to), { recursive: true }); fsx.copyFileSync(f, to); });
  }

  function backup(g, { note = '', force = false, keep = 5, maxBytes = MAX_BYTES } = {}) {
    const { e, paths: roots } = allPaths(g);
    if (!e && !(extraPaths(g) || []).length) return { ok: false, code: 'unknown', error: 'No conozco dónde guarda este juego su progreso. Puedes indicarlo con «Añadir carpeta».' };
    if (!roots.length) return { ok: false, code: 'none', error: 'No encontré archivos de guardado de este juego en tu equipo.' };
    const sc = scan(roots);
    if (!sc.files) return { ok: false, code: 'none', error: 'Las carpetas de guardado están vacías.' };
    if (sc.bytes > maxBytes) return { ok: false, code: 'big', error: 'Los archivos de guardado pesan demasiado (' + Math.round(sc.bytes / 1048576) + ' MB) y no se copian.' };
    const prev = list(g);
    if (!force && prev[0] && prev[0].sig === sc.sig) return { ok: true, fresh: false, backups: prev };
    let id = stamp(), n = 1; // si ya hay una copia con la misma hora (al segundo), se le añade un número
    while (fsx.existsSync(path.join(gameDir(g), id))) id = stamp() + '-' + (++n);
    const target = path.join(gameDir(g), id);
    try {
      fsx.mkdirSync(target, { recursive: true });
      const meta = { date: now(), game: g.name, note, bytes: sc.bytes, files: sc.files, sig: sc.sig, roots: [] };
      roots.forEach((r, k) => { const rel = 'p' + k; copyRoot(r, path.join(target, rel)); meta.roots.push({ orig: r, rel, file: fsx.statSync(r).isFile() }); });
      fsx.writeFileSync(path.join(target, 'meta.json'), JSON.stringify(meta, null, 1));
    } catch (err) { try { fsx.rmSync(target, { recursive: true, force: true }); } catch {} return { ok: false, error: 'No se pudo copiar: ' + err.message }; }
    // conserva solo las últimas «keep»
    const all = list(g);
    for (const old of all.slice(Math.max(1, keep))) { try { fsx.rmSync(path.join(gameDir(g), old.id), { recursive: true, force: true }); } catch {} }
    return { ok: true, fresh: true, id, backups: list(g) };
  }

  function restore(g, id, keep = 5) {
    if (!/^[0-9_-]+$/.test(String(id))) return { ok: false, error: 'Copia no válida.' };
    const src = path.join(gameDir(g), id);
    let meta; try { meta = JSON.parse(fsx.readFileSync(path.join(src, 'meta.json'), 'utf8')); } catch { return { ok: false, error: 'No se encontró esa copia.' }; }
    const safety = backup(g, { note: 'Antes de restaurar', force: true, keep: keep + 1 }); // por si te arrepientes
    try {
      for (const r of meta.roots) {
        const from = path.join(src, r.rel);
        if (r.file) { fsx.mkdirSync(path.dirname(r.orig), { recursive: true }); fsx.copyFileSync(path.join(from, path.basename(r.orig)), r.orig); }
        else walk(from, (f, rel) => { const to = path.join(r.orig, rel); fsx.mkdirSync(path.dirname(to), { recursive: true }); fsx.copyFileSync(f, to); });
      }
    } catch (err) { return { ok: false, error: 'No se pudo restaurar: ' + err.message }; }
    return { ok: true, safety: !!(safety && safety.ok && safety.fresh), backups: list(g) };
  }

  function remove(g, id) {
    if (!/^[0-9_-]+$/.test(String(id))) return { ok: false };
    try { fsx.rmSync(path.join(gameDir(g), id), { recursive: true, force: true }); } catch (err) { return { ok: false, error: err.message }; }
    return { ok: true, backups: list(g) };
  }

  return { detect, suggest, status, update, info, backup, restore, remove, list, entryFor, resolvePaths, gameDir, load, norm };
}

module.exports = { createSaves, norm };
