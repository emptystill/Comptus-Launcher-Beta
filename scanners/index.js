// ---------------------------------------------------------------
// Registro de bibliotecas. Para agregar una nueva:
//   1. Crea scanners/mi-biblioteca.js con una función async que devuelva
//      una lista de juegos: { id: 'miid:123', source: 'miid', name, ... }
//      y que indique cómo abrirlos con UNA de estas opciones:
//        launchUri: 'protocolo://...'      (se abre con el launcher)
//        launchCmd: ['programa.exe', arg]  (se ejecuta un comando)
//        exe: 'C:\\ruta\\juego.exe'         (se ejecuta el juego directamente)
//   2. Agrégala a la lista de abajo. Aparece sola en el menú lateral
//      y en Configuración > Bibliotecas.
// ---------------------------------------------------------------
const { scanSteam } = require('./steam');
const { scanEpic } = require('./epic');
const { scanGog } = require('./gog');
const { scanUbisoft } = require('./ubisoft');
const { scanXbox } = require('./xbox');
const { scanEa } = require('./ea');
const { scanBattlenet } = require('./battlenet');
const { scanRockstar } = require('./rockstar');
const { scanAmazon } = require('./amazon');
const { scanItch } = require('./itch');

const providers = [
  { id: 'steam',   name: 'Steam',           color: '#2a9fd6', openUri: 'steam://open/main', scan: () => scanSteam() },
  { id: 'epic',    name: 'Epic Games',      color: '#8a8f98', openUri: 'com.epicgames.launcher://store', scan: () => scanEpic() },
  { id: 'gog',     name: 'GOG',             color: '#b05fd8', openUri: 'goggalaxy://', scan: () => scanGog() },
  { id: 'ubisoft', name: 'Ubisoft Connect', color: '#2f8cff', openUri: 'uplay://', scan: (o) => scanUbisoft(null, { includeStore: !!(o && o.ubisoftViaStore) }) },
  { id: 'ea',        name: 'EA app',          color: '#ff4747', openUri: 'origin2://', scan: () => scanEa() },
  { id: 'battlenet', name: 'Battle.net',      color: '#00aeff', openUri: 'battlenet://', scan: () => scanBattlenet() },
  { id: 'rockstar',  name: 'Rockstar',        color: '#fcaf17', scan: () => scanRockstar() },
  { id: 'prime',     name: 'Amazon Games',    color: '#00a8e1', scan: () => scanAmazon() },
  { id: 'itch',      name: 'itch.io',         color: '#fa5c5c', openUri: 'itch://', scan: () => scanItch() },
  // Xbox usa PowerShell y puede tardar unos segundos: viene desactivada por defecto
  { id: 'xbox',    name: 'Xbox / Game Pass', color: '#3fae2a', openUri: 'xbox:', scan: () => scanXbox(), defaultEnabled: false },
];

// Los juegos agregados a mano siempre existen
const LOCAL_SOURCE = { id: 'local', name: 'Locales', color: '#2fb36b' };

function sourcesInfo() {
  return [
    ...providers.map((p) => ({ id: p.id, name: p.name, color: p.color, canOpen: !!p.openUri, defaultEnabled: p.defaultEnabled !== false })),
    { ...LOCAL_SOURCE, defaultEnabled: true },
  ];
}

// Si una biblioteca tarda demasiado, se ignora para no bloquear a las demás
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((resolve) => { timer = setTimeout(() => resolve([]), ms); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// `enabled` es un mapa { idBiblioteca: true/false } guardado en los ajustes
async function scanAll(enabled = {}, options = {}) {
  const active = providers.filter((p) => (enabled[p.id] !== undefined ? enabled[p.id] : p.defaultEnabled !== false));
  const results = await Promise.all(active.map((p) => withTimeout(p.scan(options).catch(() => []), 25000)));
  return results.flat();
}

module.exports = { providers, sourcesInfo, scanAll };
