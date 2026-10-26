// Utilidades compartidas por las bibliotecas que se detectan mirando carpetas y registro (EA, Battle.net, Rockstar, Amazon, itch.io).
const fs = require('fs');
const path = require('path');

const SKIP_EXE = /unins|crash|redist|setup|vcredist|dxsetup|dotnet|helper|report|cef|easyanticheat|battleye|benchmark|installer|updater|activation|touchup|eaanticheat|cleanup/i;

const realDeps = {
  exists: (p) => { try { return fs.existsSync(p); } catch { return false; } },
  readdir: (p) => { try { return fs.readdirSync(p, { withFileTypes: true }); } catch { return []; } },
  stat: (p) => { try { return fs.statSync(p); } catch { return null; } },
  readText: (p) => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } },
  readBuf: (p) => { try { return fs.readFileSync(p); } catch { return null; } },
  env: process.env,
};

const norm = (p) => String(p || '').replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
const clean = (p) => String(p || '').trim().replace(/^"+|"+$/g, '').replace(/[\\/]+$/, '');
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// El .exe del juego dentro de su carpeta (hasta 2 niveles): primero los que `prefer` indica, luego el más grande
function findGameExe(dir, deps, prefer) {
  const exes = [];
  const visit = (d, depth) => {
    for (const e of deps.readdir(d)) {
      const full = path.join(d, e.name);
      if (e.isFile && e.isFile() && /\.exe$/i.test(e.name) && !SKIP_EXE.test(e.name)) {
        const st = deps.stat(full); exes.push({ full, name: e.name, size: st ? st.size : 0 });
      } else if (depth < 2 && e.isDirectory && e.isDirectory() && !/^(_?redist|support|_commonredist|dxsetup|__installer|\.)/i.test(e.name)) visit(full, depth + 1);
    }
  };
  visit(dir, 0);
  if (prefer) { const p = exes.find((x) => prefer.test(x.name)); if (p) return p.full; }
  exes.sort((a, b) => b.size - a.size);
  return exes[0] ? exes[0].full : null;
}

// Subcarpetas (con nombre) de una carpeta
function subdirs(dir, deps) {
  return deps.readdir(dir).filter((e) => e.isDirectory && e.isDirectory() && !e.name.startsWith('.')).map((e) => ({ name: e.name, full: path.join(dir, e.name) }));
}

function progFiles(env) {
  const set = new Set([env['ProgramFiles(x86)'], env.ProgramFiles, env.ProgramW6432, 'C:\\Program Files (x86)', 'C:\\Program Files'].filter(Boolean));
  return [...set];
}

// ¿Está instalado el launcher? Si no hay ni rastro de sus carpetas se ahorra consultar el registro (cada consulta lanza un proceso y retrasa el arranque)
function launcherPresent(deps, relPaths) {
  const env = deps.env || {};
  const bases = [env.ProgramData, env['ProgramFiles(x86)'], env.ProgramFiles, env.ProgramW6432, env.LOCALAPPDATA, env.APPDATA, 'C:\\Program Files (x86)', 'C:\\Program Files', 'C:\\ProgramData'].filter(Boolean);
  return relPaths.some((r) => bases.some((b) => deps.exists(path.join(b, r))));
}

module.exports = { launcherPresent, realDeps, norm, clean, slug, findGameExe, subdirs, progFiles, SKIP_EXE };
