// Copias de seguridad de los datos de Comptus (juegos locales, información/estados por juego y ajustes).
// Lo que NO se incluye a propósito: las sesiones de Epic/Xbox (están cifradas con la cuenta de Windows de este
// equipo y no servirían en otro) ni las listas de juegos comprados (se vuelven a descargar al sincronizar).
const fs = require('fs');
const path = require('path');

const FORMAT = 1;

function buildBackup(store, version) {
  return {
    app: 'Comptus',
    format: FORMAT,
    version: version || '',
    exportedAt: new Date().toISOString(),
    data: {
      local: Array.isArray(store.local) ? store.local : [],
      meta: store.meta && typeof store.meta === 'object' ? store.meta : {},
      settings: store.settings && typeof store.settings === 'object' ? store.settings : {},
      sessions: Array.isArray(store.sessions) ? store.sessions : [],
    },
  };
}

const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);

// Valida el texto de un archivo de copia y devuelve { local, meta, settings }; si no sirve, lanza un Error con el motivo.
function parseBackup(text) {
  let j;
  try { j = JSON.parse(String(text).replace(/^﻿/, '')); } catch { throw new Error('El archivo no es una copia válida (no se puede leer).'); }
  // Las copias automáticas diarias son el propio games.json (sin envoltorio): también se aceptan
  if (isObj(j) && j.app !== 'Comptus' && (Array.isArray(j.local) || isObj(j.meta) || isObj(j.settings))) j = { app: 'Comptus', format: FORMAT, exportedAt: '', data: j };
  if (!isObj(j) || j.app !== 'Comptus' || !isObj(j.data)) throw new Error('Este archivo no es una copia de seguridad de Comptus.');
  if (typeof j.format === 'number' && j.format > FORMAT) throw new Error('La copia es de una versión más nueva de Comptus. Actualiza el programa e inténtalo de nuevo.');
  const d = j.data;
  if (d.local != null && !Array.isArray(d.local)) throw new Error('La copia está dañada (lista de juegos inválida).');
  if (d.meta != null && !isObj(d.meta)) throw new Error('La copia está dañada (datos de juegos inválidos).');
  if (d.settings != null && !isObj(d.settings)) throw new Error('La copia está dañada (ajustes inválidos).');
  return {
    local: (d.local || []).filter((g) => isObj(g) && g.id),
    meta: d.meta || {},
    settings: d.settings || {},
    sessions: Array.isArray(d.sessions) ? d.sessions.filter((x) => isObj(x) && x.id && Number.isFinite(x.s) && Number.isFinite(x.m)) : [],
    exportedAt: j.exportedAt || '',
    version: j.version || '',
  };
}

// Aplica la copia sobre el almacén actual (que conserva owned, sesiones, etc.).
// 'replace': deja exactamente lo de la copia. 'merge': conserva lo actual y añade/actualiza con lo de la copia.
function applyBackup(store, data, mode) {
  const out = { ...store };
  if (mode === 'merge') {
    const byId = new Map((store.local || []).map((g) => [g.id, g]));
    for (const g of data.local) byId.set(g.id, { ...(byId.get(g.id) || {}), ...g });
    out.local = [...byId.values()];
    out.meta = { ...(store.meta || {}) };
    for (const [id, m] of Object.entries(data.meta)) out.meta[id] = { ...(out.meta[id] || {}), ...m };
    out.settings = { ...(store.settings || {}), ...data.settings };
    const seen = new Set((store.sessions || []).map((x) => x.id + '|' + x.s));
    out.sessions = [...(store.sessions || []), ...(data.sessions || []).filter((x) => !seen.has(x.id + '|' + x.s))].sort((a, b) => a.s - b.s);
  } else {
    out.local = data.local;
    out.meta = data.meta;
    out.settings = data.settings;
    out.sessions = data.sessions || [];
  }
  return out;
}

const pad = (n) => String(n).padStart(2, '0');
const dayStamp = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Copia automática diaria: guarda games.json en <carpeta>/backups/games-AAAA-MM-DD.json (una por día) y
// conserva solo las últimas `keep`. Devuelve la ruta creada, o null si ya existía la de hoy / no hay archivo.
function autoBackup(userDir, keep = 7, now = new Date()) {
  const src = path.join(userDir, 'games.json');
  if (!fs.existsSync(src)) return null;
  const dir = path.join(userDir, 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `games-${dayStamp(now)}.json`);
  let created = null;
  if (!fs.existsSync(dest)) { fs.copyFileSync(src, dest); created = dest; }
  const files = fs.readdirSync(dir).filter((f) => /^games-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  for (const f of files.slice(0, Math.max(0, files.length - keep))) { try { fs.unlinkSync(path.join(dir, f)); } catch { /* ignorar */ } }
  return created;
}

function listAutoBackups(userDir) {
  const dir = path.join(userDir, 'backups');
  try { return fs.readdirSync(dir).filter((f) => /^games-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse(); } catch { return []; }
}

module.exports = { buildBackup, parseBackup, applyBackup, autoBackup, listAutoBackups, dayStamp, FORMAT };
