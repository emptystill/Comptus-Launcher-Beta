# Comptus — estado del proyecto (versión 1.84.84)

Leyenda: `[x]` hecho y confirmado por ti · `[~]` hecho, falta confirmarlo en tu equipo · `[ ]` pendiente

---

## 1. Lo que ya tiene Comptus

### Bibliotecas
- [x] Steam: instalados y comprados sin instalar (con clave de API)
- [x] Epic Games: instalados y comprados sin instalar (inicio de sesión seguro)
- [x] Xbox / Game Pass: instalados e historial de juegos de PC
- [x] Ubisoft Connect: instalados y biblioteca completa
- [x] GOG: instalados · juegos locales añadidos a mano
- [~] EA app, Battle.net, Rockstar, Amazon Games: instalados
- [~] itch.io: biblioteca completa con clave de API
- [x] Sincronización automática de las bibliotecas al abrir (cada 12 h)
- [~] Biblioteca que se actualiza sola al instalar o desinstalar (Steam y Epic)
- [x] Juegos repetidos entre tiendas en una sola ficha

### Biblioteca y fichas de juego
- [x] Cuadrícula con portadas (tamaño ajustable, vertical u horizontal, nombres ocultables)
- [x] Favoritos, recientes, ocultos, búsqueda, filtros y ordenación
- [x] Colecciones con icono propio, fondo propio (imagen o vídeo) y banner automático del juego más jugado
- [x] Estados por juego (pendiente, jugando, completado, abandonado) y etiquetas propias
- [x] Información automática (Steam / RAWG), tráilers, capturas y traducción al español
- [x] Logros (Steam, Epic y Xbox) y marca 100 %
- [x] Portadas, banners (también animados), iconos y logotipos propios · SteamGridDB
- [x] Fondo de la ficha con el banner del juego, desenfocado
- [x] Botón Jugar con estados (iniciando, jugando, detener)
- [x] Estadísticas (horas, más jugados, por mes y por tienda)
- [x] ¿Qué juego hoy? (juego aleatorio)
- [x] Espacio en disco por juego
- [x] Lista de deseados unificada con aviso de rebajas
- [x] Juegos gratis (Epic, Steam y otras tiendas) con avisos
- [x] Eventos y rebajas
- [x] Desinstalar e instalar con botón (abre el launcher de cada tienda)

### Apariencia
- [x] Temas incluidos, con ilustración y temas propios
- [x] Fondos de imagen o **vídeo** en bucle, con oscurecimiento y desenfoque
- [x] Colores que se adaptan al fondo
- [x] Temas con fondo guardado, exportar e importar (carpeta «My Themes»)
- [x] Transparencia de los recuadros
- [x] Ahorro de recursos con vídeos (pausa al perder foco, con batería, sin desenfoque)
- [x] **Tema automático**: por hora o según el modo claro/oscuro de Windows
- [x] Pantalla de inicio, logo e icono de Comptus, barra lateral ajustable

### Overlay y mando
- [x] Overlay con atajo, captura de pantalla y cerrar el juego
- [x] Overlay con hora, tiempo de sesión, tiempo total y batería
- [x] **Mezclador de volumen** (general y por aplicación, con barras)
- [x] Modo mando para navegar por Comptus y para abrir el overlay
- [~] Overlay con el mando y atajos de una sola tecla

### Modo consola (nuevo)
- [~] Vista a pantalla completa para televisor y mando: filas de portadas, fondo del juego enfocado, Jugar con A, favorito con X, menú con Y
- [~] Entrada con botón, F10 o botón Guía del mando · opción de arrancar en modo consola

### Partidas guardadas
- [~] Panel «Partidas guardadas» en cada ficha: copiar, restaurar y borrar copias
- [~] Copia automática al cerrar el juego (últimas N por juego)
- [~] Base de datos Ludusavi (12 600 juegos) con descarga y actualización automática
- [~] «Añadir carpeta / archivo» a mano para juegos locales
- [~] «Buscar guardados» por carpetas y nombres (acertó con algunos juegos)
- [~] Detección de guardados por lo que cambió al jugar (recompilaciones, mods…)

### Sistema
- [x] Instalador personalizado y portable · actualizaciones automáticas desde GitHub
- [x] Copia de seguridad (manual y diaria automática) y restaurar
- [x] Carpeta «Comptus Media» elegible
- [x] Bandeja del sistema, iniciar con Windows, búsqueda rápida (Ctrl+Alt+Espacio)

---

## 2. Por confirmar en tu equipo
- [ ] **Guardados:** que la base de datos se descargue (si el panel sigue pidiéndola, copiar el «Último intento fallido»); probar más juegos
- [ ] **Guardados:** detección al jugar con BLACK, Def Jam, Darkwatch y Gears of War 2 Hollow (jugar un minuto, guardar y cerrar)
- [ ] Biblioteca que se actualiza sola al instalar o desinstalar un juego (1.46.0)
- [ ] Bibliotecas de EA, Battle.net, Rockstar, Amazon e itch.io con tus juegos reales
- [ ] Overlay con el mando en un juego, y atajos de una sola tecla
- [ ] Logros de Xbox · SteamGridDB con tu clave · Deseados de Epic
- [ ] Gratis con las tiendas reales y aviso de Windows de juegos gratis nuevos
- [ ] Instalador: carpeta de «Comptus Media», permisos y actualización automática
- [ ] Restaurar una copia de seguridad (probado solo con simulaciones)
- [ ] Espacio en disco y ¿Qué juego hoy? con tus juegos reales

(El detalle de cada versión está en `CHECKLIST.md`.)

---

## 3. Pendiente por hacer

### Para depender menos de otros launchers
- [ ] **Integración de emuladores** *(nuevo)*
  - [ ] Detectar emuladores instalados (RetroArch, Dolphin, PCSX2, DuckStation, RPCS3, Cemu, PPSSPP, mGBA…)
  - [ ] Elegir carpetas de ROMs y mostrarlas como una biblioteca más, con portadas (SteamGridDB / RAWG)
  - [ ] Abrir cada juego con el emulador y los argumentos correctos
  - [ ] Tiempo de juego, favoritos y colecciones igual que los demás
  - [ ] Copia de las partidas guardadas y estados de los emuladores
  - [ ] Comptus no incluye ni descarga ROMs: solo organiza las que ya tengas
- [ ] **Duración del juego** (estilo HowLongToBeat), comparada con tu tiempo jugado
- [ ] **Estado en Discord** («Jugando X»)
- [ ] **Sincronizar Comptus entre dos PCs** (ajustes, temas, etiquetas y colecciones)
- [ ] **Animación al instalar o desinstalar un juego** *(idea tuya; falta definir el estilo: efecto en la tarjeta, aviso en pantalla o indicador mientras se instala)*
- [ ] **Perfil de ajustes por juego**: volumen, tema, argumentos de arranque, prioridad y qué hacer con Comptus al abrirlo *(para más adelante)*

### Al final (dependen de tener cada launcher)
- [ ] Biblioteca completa de GOG (no solo lo instalado), con inicio de sesión
- [ ] Instalar y actualizar desde Comptus con Legendary (Epic) y gogdl (GOG)
- [ ] Biblioteca completa de Amazon Games
- [ ] Tiempo de juego unificado de todas las tiendas
- [ ] Aviso de actualización pendiente de cada juego
- [ ] Notas de versión combinadas para publicar en GitHub

### Limitaciones conocidas
- Juegos en pantalla completa exclusiva: el overlay puede no mostrarse
- Guardados en el registro de Windows: no se copian (solo archivos)
- El progreso de descargas dentro de Comptus se descartó: dependía de lo que escriba cada launcher
