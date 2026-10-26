const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { parseVdf, getCI } = require('./vdf');

const IGNORED_IDS = new Set(['228980']); // Steamworks Common Redistributables
const IGNORED_NAMES = [/^Steamworks Common/i, /^Proton/i, /^Steam Linux Runtime/i];

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { windowsHide: true }, (err, stdout) => (err ? reject(err) : resolve(stdout)));
  });
}

async function findSteamPath() {
  if (process.platform === 'win32') {
    try {
      const out = await run('reg', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'SteamPath']);
      const m = out.match(/SteamPath\s+REG_SZ\s+(.+)/);
      if (m) return path.normalize(m[1].trim());
    } catch { /* sigue con las rutas comunes */ }
  }
  const candidates = [
    process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Steam'),
    'C:\\Program Files (x86)\\Steam',
    'C:\\Program Files\\Steam',
  ].filter(Boolean);
  return candidates.find((c) => fs.existsSync(c)) || null;
}

function readLibraryFolders(steamPath) {
  const folders = new Set([steamPath]);
  try {
    const vdf = fs.readFileSync(path.join(steamPath, 'steamapps', 'libraryfolders.vdf'), 'utf8');
    for (const m of vdf.matchAll(/"path"\s+"([^"]+)"/g)) {
      folders.add(path.normalize(m[1].replace(/\\\\/g, '\\')));
    }
  } catch { /* sin libraryfolders.vdf: solo la carpeta principal */ }
  return [...folders];
}

// Tiempo de juego y última sesión que Steam guarda en userdata/<usuario>/config/localconfig.vdf.
// Steam lo actualiza al cerrarse o cada cierto tiempo, así que puede ir un poco atrasado.
function readSteamStats(steamPath) {
  const stats = {}; // appid -> { playTime (min), lastPlayed (ms) }
  let users = [];
  try { users = fs.readdirSync(path.join(steamPath, 'userdata')); } catch { return stats; }
  for (const u of users) {
    let vdf;
    try { vdf = parseVdf(fs.readFileSync(path.join(steamPath, 'userdata', u, 'config', 'localconfig.vdf'), 'utf8')); } catch { continue; }
    const root = getCI(vdf, 'UserLocalConfigStore');
    const apps = getCI(getCI(getCI(getCI(root, 'Software'), 'Valve'), 'Steam'), 'apps');
    if (!apps) continue;
    for (const [appid, a] of Object.entries(apps)) {
      if (!a || typeof a !== 'object') continue;
      const play = parseInt(getCI(a, 'Playtime') || getCI(a, 'PlaytimeForever') || '0', 10) || 0;
      const last = (parseInt(getCI(a, 'LastPlayed') || '0', 10) || 0) * 1000;
      const prev = stats[appid] || { playTime: 0, lastPlayed: 0 };
      // si hay varias cuentas en el equipo, nos quedamos con el mayor valor
      stats[appid] = { playTime: Math.max(prev.playTime, play), lastPlayed: Math.max(prev.lastPlayed, last) };
    }
  }
  return stats;
}

async function scanSteam(steamPathOverride) {
  const steamPath = steamPathOverride || (await findSteamPath());
  if (!steamPath) return [];

  const games = [];
  const seen = new Set();
  const stats = readSteamStats(steamPath);

  for (const lib of readLibraryFolders(steamPath)) {
    const appsDir = path.join(lib, 'steamapps');
    let files = [];
    try { files = fs.readdirSync(appsDir); } catch { continue; }

    for (const file of files) {
      const m = file.match(/^appmanifest_(\d+)\.acf$/);
      if (!m) continue;
      const appid = m[1];
      if (IGNORED_IDS.has(appid) || seen.has(appid)) continue;

      let text;
      try { text = fs.readFileSync(path.join(appsDir, file), 'utf8'); } catch { continue; }

      const name = (text.match(/"name"\s+"([^"]*)"/) || [])[1];
      const installdir = (text.match(/"installdir"\s+"([^"]*)"/) || [])[1];
      const flags = parseInt((text.match(/"StateFlags"\s+"(\d+)"/) || [])[1] || '0', 10);
      if (!name || !(flags & 4)) continue; // 4 = instalado por completo
      if (IGNORED_NAMES.some((re) => re.test(name))) continue;

      seen.add(appid);
      const st = stats[appid] || {};
      games.push({
        id: `steam:${appid}`,
        source: 'steam',
        name,
        appid,
        installPath: installdir ? path.join(lib, 'steamapps', 'common', installdir) : null,
        cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_600x900.jpg`,
        coverFallback: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`,
        banner: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/library_hero.jpg`,
        bannerFallback: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`,
        launchUri: `steam://rungameid/${appid}`,
        ...(st.playTime ? { playTime: st.playTime } : {}),
        ...(st.lastPlayed ? { lastPlayed: st.lastPlayed } : {}),
      });
    }
  }
  return games;
}

// versión rápida (sin registro) para quien necesita la ruta al instante
function steamPathSync() {
  const c = [process.env['ProgramFiles(x86)'] && path.join(process.env['ProgramFiles(x86)'], 'Steam'), 'C:\\Program Files (x86)\\Steam', 'C:\\Program Files\\Steam'].filter(Boolean);
  return c.find((x) => fs.existsSync(x)) || null;
}
module.exports = { steamPathSync, scanSteam, readSteamStats, findSteamPath, readLibraryFolders };
