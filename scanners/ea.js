const path = require('path');
const { queryAll } = require('./winreg');
const C = require('./common');

// EA app / Origin: cada juego instalado deja su carpeta en el registro («EA Games» y «Electronic Arts») y en las
// carpetas por defecto (Program Files\EA Games, Origin Games). El nombre sale del instalador (installerdata.xml) o de la carpeta.
const REG_ROOTS = ['HKLM\\SOFTWARE\\WOW6432Node\\EA Games', 'HKLM\\SOFTWARE\\EA Games', 'HKLM\\SOFTWARE\\WOW6432Node\\Electronic Arts', 'HKLM\\SOFTWARE\\Electronic Arts'];
const SKIP_DIR = /^(ea app|ea desktop|origin|electronic arts|ea games|eadm|installer|redist)$/i;

const realDeps = { ...C.realDeps, registry: async () => { const all = {}; for (const r of REG_ROOTS) Object.assign(all, await queryAll(r)); return all; } };

function gameTitle(dir, deps, fallback) {
  const xml = deps.readText(path.join(dir, '__Installer', 'installerdata.xml'));
  const m = xml.match(/<localeInfo[^>]*locale="en_US"[^>]*>[\s\S]*?<title>([^<]+)<\/title>/i) || xml.match(/<gameTitle[^>]*>([^<]+)<\/gameTitle>/i) || xml.match(/<title>([^<]+)<\/title>/i);
  return m ? m[1].replace(/&amp;/g, '&').replace(/™|®/g, '').trim() : fallback;
}

async function scanEa(depsIn) {
  const deps = { ...realDeps, ...(depsIn || {}) };
  if (!C.launcherPresent(deps, ['EA Desktop', 'Electronic Arts', 'EA Games', 'Origin', 'Origin Games'])) return []; // no tienes ese launcher: ni se consulta el registro
  const found = new Map(); // carpeta normalizada -> { dir, name }
  const add = (dir, nameHint) => {
    dir = C.clean(dir);
    if (!dir || !deps.exists(dir) || found.has(C.norm(dir))) return;
    const base = path.basename(dir);
    if (SKIP_DIR.test(base)) return;
    found.set(C.norm(dir), { dir, name: gameTitle(dir, deps, nameHint || base) });
  };
  const reg = await deps.registry().catch(() => ({}));
  for (const [key, v] of Object.entries(reg)) {
    const dir = v['Install Dir'] || v['InstallDir'] || v['Install_Dir'];
    if (dir) add(dir, v.DisplayName || key.split('\\').pop());
  }
  const env = deps.env || {};
  for (const pf of C.progFiles(env)) for (const lib of ['EA Games', 'Origin Games', 'Electronic Arts']) for (const d of C.subdirs(path.join(pf, lib), deps)) add(d.full, d.name);
  for (const drive of ['C:', 'D:', 'E:', 'F:']) for (const lib of ['EA Games', 'Origin Games']) for (const d of C.subdirs(path.join(drive + '\\', lib), deps)) add(d.full, d.name);

  const games = [];
  for (const g of found.values()) {
    const exe = C.findGameExe(g.dir, deps);
    if (!exe) continue; // sin ejecutable no se puede abrir
    games.push({ id: `ea:${C.slug(path.basename(g.dir))}`, source: 'ea', name: g.name, cover: null, exe, installPath: g.dir, cwd: path.dirname(exe) });
  }
  return games;
}

module.exports = { scanEa };
