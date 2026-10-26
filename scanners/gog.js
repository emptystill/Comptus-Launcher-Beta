const fs = require('fs');
const path = require('path');
const { queryAll } = require('./winreg');

const GOG_KEY = 'HKLM\\SOFTWARE\\WOW6432Node\\GOG.com\\Games';

// GOG Galaxy registra cada juego instalado en el registro de Windows.
// `registryOverride` permite probar con datos de ejemplo.
async function scanGog(registryOverride) {
  const keys = registryOverride || (await queryAll(GOG_KEY));
  const games = [];
  const seen = new Set();

  for (const v of Object.values(keys)) {
    if (!v.gameID || !v.gameName) continue;
    if (v.dependsOn) continue; // DLC: depende de otro juego
    if (seen.has(v.gameID)) continue;

    const exe = v.exe || (v.path && v.launchCommand);
    if (!exe || !fs.existsSync(exe)) continue; // desinstalado o movido

    seen.add(v.gameID);
    games.push({
      id: `gog:${v.gameID}`,
      source: 'gog',
      name: v.gameName,
      cover: null,
      exe,
      args: v.launchParam || '',
      installPath: v.path || path.dirname(exe),
      cwd: v.workingDir || v.path || path.dirname(exe),
    });
  }
  return games;
}

module.exports = { scanGog };
