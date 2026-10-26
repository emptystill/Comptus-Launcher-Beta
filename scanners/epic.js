const fs = require('fs');
const path = require('path');

function defaultManifestsDir() {
  const base = process.env.ProgramData || 'C:\\ProgramData';
  return path.join(base, 'Epic', 'EpicGamesLauncher', 'Data', 'Manifests');
}

async function scanEpic(manifestsDirOverride) {
  const dir = manifestsDirOverride || defaultManifestsDir();
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith('.item')); } catch { return []; }

  const games = [];
  const seen = new Set();

  for (const file of files) {
    let item;
    try { item = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')); } catch { continue; }

    if (item.bIsIncompleteInstall) continue;
    const name = item.DisplayName;
    const appName = item.MainGameAppName || item.AppName;
    if (!name || !appName || seen.has(appName)) continue;

    // Epic también lista DLC, herramientas y otros; nos quedamos con los juegos
    const cats = Array.isArray(item.AppCategories) ? item.AppCategories : [];
    if (cats.length && !cats.includes('games')) continue;

    seen.add(appName);
    const exe = item.InstallLocation && item.LaunchExecutable
      ? path.join(item.InstallLocation, item.LaunchExecutable)
      : null;

    games.push({
      id: `epic:${appName}`,
      source: 'epic',
      name,
      cover: null, // Epic no guarda portadas locales; la UI muestra un placeholder
      launchUri: `com.epicgames.launcher://apps/${item.CatalogNamespace}%3A${item.CatalogItemId}%3A${item.AppName}?action=launch&silent=true`,
      exe,
      installPath: item.InstallLocation || null,
    });
  }
  return games;
}

module.exports = { scanEpic, defaultManifestsDir };
