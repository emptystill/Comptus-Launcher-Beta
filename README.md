# Comptus

Una sola interfaz para tus juegos de **Steam**, **Epic Games**, **GOG**, **Ubisoft Connect**, **Xbox / Game Pass** y los que tienes **locales** (cualquier .exe).

## Cómo ejecutarlo (Windows)

1. Instala [Node.js](https://nodejs.org) (versión LTS) si no lo tienes.
2. Abre una terminal en esta carpeta y ejecuta:

   ```
   npm install
   npm start
   ```

   (Si PowerShell bloquea scripts: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, o usa `npm.cmd`.)

3. (Opcional) Para generar un .exe portable: `npm run dist` (queda en `dist/`).

## Qué hace

### Bibliotecas
- **Steam**: detecta tus juegos instalados (todas tus carpetas de biblioteca) y los abre con Steam, con portada automática.
- **Epic Games**: detecta los juegos instalados y los abre con su launcher.
- **GOG**: lee los juegos que Galaxy registró en Windows y los ejecuta directamente.
- **Ubisoft Connect**: lee las instalaciones registradas y las abre con el launcher.
- **Xbox / Game Pass**: usa PowerShell para listar los juegos de la tienda de Xbox. Viene **desactivada** porque puede tardar unos segundos; actívala en Configuración > Bibliotecas.
- **Locales**: botón "Agregar juego local", eliges el .exe y listo.
- En **Configuración > Bibliotecas** activas o desactivas cuáles se escanean. Los filtros del menú lateral muestran solo las bibliotecas que tienen juegos.

### Biblioteca y lista lateral
- Búsqueda, filtros, favoritos, recientes, ocultar juegos y ordenar por nombre / último jugado / tiempo jugado.
- Cada biblioteca se identifica con su **logo** (en los filtros, las tarjetas, la lista lateral y la página del juego).
- La barra lateral lista tus juegos con su icono (el que elijas, o la portada, o el icono real del .exe, o la inicial).

### Clic derecho sobre cualquier juego (tarjeta, lista lateral o su página)
Jugar · Abrir página · **Abrir ubicación del juego** · **Abrir el launcher** (Steam, Epic, GOG, Ubisoft…) · Cambiar icono / portada / banner / logotipo · Restablecer personalización · Favorito · Ocultar · **Desinstalar** (o "Quitar de la biblioteca" en los locales).

Desinstalar no borra nada por sí mismo: abre el desinstalador oficial (Steam te pide confirmar; en GOG usa el desinstalador del juego; en el resto abre Configuración > Aplicaciones o el launcher) y allí confirmas.

### Página de cada juego (clic en una portada)
Arriba a la derecha hay botones de icono, cada uno con un pequeño menú:
- 🖼️ **Banner**, 🎴 **Portada** e 🔷 **Icono** (elegir / restablecer)
- 🔤 **Logotipo**: se muestra en lugar del nombre. Con el menú arrastras un punto para colocarlo **donde quieras** (o pulsas **Centrar**) y ajustas su **tamaño** hasta 600 px de alto (también agranda logos pequeños); lo ves cambiar en vivo.
- 🎨 **Color**: por defecto la página **se adapta sola a los colores de la portada y el banner** (acentos y un ligero tinte del fondo). También puedes elegir un color propio o volver al color del tema.
- ⋯ **Más opciones**: el mismo menú del clic derecho.

#### Estructura (como la de Steam)
- **Cabecera** con el banner, la portada y el logotipo. La posición y el tamaño del logotipo solo mueven el logotipo; nada más.
- **Barra de acción** fija debajo: botón **▶ Jugar**, **Biblioteca**, **Última sesión**, **Tiempo de juego** y, a la derecha, botones de icono (favorito, abrir ubicación, editar en los locales e información).
- **Acerca de este juego**, **capturas** (clic para verlas grandes, flechas para pasar), **notas** y un panel de **detalles** (desarrollador, editor, lanzamiento, géneros, ubicación, sitio web).

#### Información de los juegos
- Se descarga de la **tienda de Steam** al abrir la página de un juego (una sola vez). No necesita cuenta ni clave.
- En los juegos de Steam se usa su número; en los demás se busca por nombre y solo se acepta una coincidencia muy clara (si no, no se inventa nada).
- Con el botón **ℹ️** puedes buscar a mano (nombre, número o enlace de la tienda), **editar** cualquier dato o **quitar** la información. Lo que escribes tú manda sobre lo descargado y no se pisa al actualizar.
- **Traducción**: la descripción de RAWG se traduce sola al español, y los géneros y la fecha se muestran en español. Con **Ver original** / **Ver traducción** cambias entre una y otra, y si ya tenías información en inglés hay un botón **Traducir al español**. Sin clave se usa MyMemory (gratuito, con límite diario); si lo agotas, la descripción queda en inglés y puedes traducirla otro día. Con una clave gratuita de DeepL (Configuración) la calidad es mejor. Lo que escribes a mano nunca se traduce ni se pisa. Se desactiva en Configuración.
- Se puede desactivar en Configuración. Solo se envía a Steam el nombre (o número) del juego.
- **Juegos que no están en Steam** (locales, proyectos de la comunidad…): puedes usar **RAWG**, una base de datos de juegos con clave gratuita (rawg.io/apidocs). Pega tu clave en Configuración y se usará solo cuando Steam no encuentre el juego. La información de RAWG viene en inglés, pero se **traduce al español** automáticamente (ver abajo). Si ni así aparece (muchos proyectos de fans no están en ninguna base de datos), edítala a mano con el botón **ℹ️**.

#### Descarga en lote (información + portada y banner)
En **Configuración → Información → «Descargar información e imágenes de todos los juegos»**: recorre los juegos que aún no tienen información (o la tienen sin imágenes), la descarga, la traduce y guarda además una **portada y un banner** automáticos.
- Steam: usa las imágenes de la biblioteca de Steam (vertical para la portada, grande para el banner). Otros juegos encontrados en RAWG (necesita tu clave): imagen horizontal, se recorta en la tarjeta.
- Nunca pisa lo que ya pusiste tú: portada o banner propios, información editada a mano y juegos ocultos se respetan.
- Los juegos que no encuentra quedan listados al final para buscarlos con ℹ️ (conviene corregir antes el nombre de los juegos locales).
- Si se agota el límite diario del traductor gratuito, guarda igual la información en inglés y avisa; se puede repetir otro día.
- Icono: no hay una fuente fiable; la lista lateral usa tu icono, tu portada, el icono del .exe o, al final, la portada automática.

### Logros (Steam)
En la página de cada juego de Steam aparece un panel **Logros**: progreso («12 de 40»), lista con icono, nombre, descripción, fecha de desbloqueo y porcentaje global de jugadores (💎 = menos del 10 %), con filtros Todos / Desbloqueados / Bloqueados.
- Necesita tu **clave gratuita de Steam Web API** (steamcommunity.com/dev/apikey; pide un dominio, escribe cualquiera, p. ej. «localhost») en *Configuración → Logros de Steam*.
- Tu perfil de Steam debe tener **«Detalles del juego» en público** (Perfil → Editar perfil → Privacidad).
- Tu SteamID se detecta solo; si falla, escríbelo (17 dígitos) en el mismo apartado.
- Se guardan en el equipo y se refrescan solos pasados 10 minutos; botón «Refrescar» para forzarlo. Si no hay conexión, se enseña lo último guardado.
- En la barra junto a «Jugar» aparece «Logros 12 / 40»; al conseguirlos todos se convierte en una **insignia dorada 100 %**.
- Solo Steam por ahora; en Epic, Ubisoft y Xbox no hay forma oficial sencilla de leerlos.

#### Tráiler
Cada página de juego tiene un panel **Tráiler**, justo después de *Logros*, con el vídeo oficial (juegos con información de Steam) (sin sonido, con controles; si hay varios, miniaturas para cambiar). Se reproduce al abrir la página; se puede desactivar en *Configuración → Información → «Reproducir el tráiler…»* (entonces solo se carga al pulsar play).
- Steam entrega los tráilers como flujos HLS; la app incluye el reproductor libre [hls.js](https://github.com/video-dev/hls.js) (Apache-2.0, en `renderer/vendor/`). Solo se permiten vídeos de la CDN de Steam.
- La información descargada antes de esta función se completa sola con los tráilers al abrir la página del juego (o con el botón de descarga en lote).
- Si un tráiler no carga, aparece el aviso con un enlace a la tienda. Los juegos sin Steam (RAWG, locales) no traen tráiler propio.
- **Tráiler propio**: en cualquier juego, *📁 Añadir vídeo de mi PC* (mp4, webm, m4v, mov, ogv; se reproduce en el panel y se suma a los de Steam) o *🔗 Añadir enlace* (YouTube u otro; se abre en el navegador). *🗑 Quitar el mío* lo elimina.
- Las **capturas** de la tienda van en la misma tira de miniaturas que los vídeos (clic para verlas en grande).

### Juegos que tienes pero no están instalados (Steam)
Con tu clave y SteamID de *Logros de Steam*, el lanzador trae toda tu biblioteca de Steam: los juegos sin instalar salen atenuados con la marca «No instalado», tienen el botón **⬇ Instalar** (abre la instalación en Steam) y un filtro propio en la barra lateral. Al instalarlos pasan solos a juegos normales. Se actualiza al abrir el lanzador (cada 12 horas) o con *Configuración → Sincronizar mis juegos de Steam*; se puede desactivar con la casilla de arriba.
- Se omiten herramientas, servidores dedicados, SDK y bandas sonoras; lo demás que no quieras ver, ocúltalo con clic derecho.
- Tu perfil debe tener «Detalles del juego» en público. Los juegos de Compartir en familia no salen en esa lista.

### Colecciones y orden de la barra lateral
- Botón **✓ Solo instalados** junto al buscador (activado por defecto): **solo la página principal («Página principal»)** muestra lo que puedes jugar ahora (instalados y locales). En el resto de secciones (bibliotecas, favoritos, recientes y colecciones) siempre se ve todo.
- Las secciones de la barra lateral (*Bibliotecas*, *Colecciones*, *Otros* y *Juegos*) se **minimizan** pulsando su título; se recuerda cómo las dejaste. Las colecciones se ordenan **alfabéticamente**.
- En *Bibliotecas* cada biblioteca es un filtro directo. Para separar instalados y no instalados usa el filtro de la barra derecha (*Estado*).
- **Colecciones propias** (por ejemplo «Call of Duty»): botón ＋ junto a *Colecciones* en la barra lateral. Para llenarlas: **Ctrl + clic** en una portada (o el botón **☑ Seleccionar**), **Shift + clic** para marcar todo un rango, y en la barra de abajo abre **«Añadir a colección ▾»**: al elegir una (o «Nueva colección…») se añaden todos de golpe. Un solo juego: clic derecho → *Añadir a colección…*. Al elegir la colección se cierra el panel; con varios juegos, la selección se suelta y la barra desaparece.
- Cada colección tiene **icono propio**: un emoji (de la lista o el que escribas) o una imagen tuya; se cambia con clic derecho → *Editar nombre e icono…*.
- Dentro de una colección, clic derecho → *Quitar de…*, o selecciona varios y quítalos de golpe. Clic derecho sobre la colección para editarla o eliminarla (los juegos no se borran). Esc cancela la selección.

### Overlay y capturas (mientras juegas)
- Atajos globales que funcionan con el juego en primer plano (cámbialos en Configuración):
  - **Ctrl+Shift+O**: abre/cierra el **overlay** (cerrar el juego, mostrar el lanzador, tomar captura).
  - **Ctrl+Shift+P**: **toma una captura** de pantalla. Sale un aviso breve y se guarda en la página del juego (**Mis capturas**), con visor y botón de borrar.
- **Cerrar el juego**: pide al juego que se cierre con calma y, si a los pocos segundos sigue abierto, lo fuerza. Solo afecta a procesos que están dentro de la carpeta del juego. Pide una segunda pulsación para confirmar.
- Solo reconoce los juegos que abres **desde el lanzador**. Con un juego en marcha, cerrar la ventana del lanzador lo deja en segundo plano (para que sigan los atajos) y vuelve a aparecer al terminar el juego.
- Limitaciones: el overlay se ve sobre juegos en **ventana o ventana sin bordes**; en pantalla completa exclusiva puede no mostrarse (el atajo de captura sí suele funcionar). La captura es del monitor donde está el cursor. Si el juego corre como administrador, Windows puede impedir verlo o cerrarlo. No inyecta nada en el juego, así que es compatible con juegos con antitrampas.

### Configuración
6 temas listos, selectores para cada color, tamaño de las portadas y bibliotecas activas. El **tamaño de las portadas** también se cambia con el deslizador de la barra superior o con **Ctrl + rueda del ratón** sobre la biblioteca (de muy pequeñas a muy grandes).
- **Fondo de la biblioteca**: elige una imagen para la pantalla principal y ajusta cuánto se **oscurece** y se **desenfoca** para que las portadas se sigan leyendo bien.
- Interruptor de la descarga automática de información.

Todo se guarda solo.

Atajo: **Escape** cierra menús y ventanas y vuelve de la página de un juego a la biblioteca.

## Notas

- Los juegos de Steam, Epic y Ubisoft se abren a través de sus clientes (pueden pedir iniciar sesión). GOG y los locales se ejecutan directamente.
- En **Steam** el tiempo de juego y la última sesión se leen de los datos de tu cuenta en el equipo (Steam los actualiza al cerrarse o cada cierto tiempo, así que pueden ir un poco atrasados). En los locales y GOG los mide el lanzador al ejecutarlos directamente; en Epic, Ubisoft y Xbox no hay forma fiable de leerlo.
- Tus datos se guardan en `%APPDATA%\mi-lanzador-de-juegos\games.json`.
- Los colores automáticos se calculan a partir de miniaturas de las imágenes (las de Steam se descargan de su CDN, así que necesitan internet).
- Las imágenes que eliges se guardan como la **ruta** del archivo, no como copia: si las mueves o borras, vuelve la imagen por defecto.
- "Quitar" un juego local solo lo saca de la biblioteca; no borra nada de tu PC.

## Cómo agregar otra biblioteca en el futuro

1. Crea `scanners/mi-biblioteca.js` con una función `async` que devuelva una lista de juegos:
   `{ id: 'miid:123', source: 'miid', name: 'Nombre', ... }` y una forma de abrirlos:
   `launchUri` (protocolo del launcher), `launchCmd` (`['programa.exe', 'arg']`) o `exe` (ruta al ejecutable).
2. Regístrala en la lista de `scanners/index.js` (nombre, color y, si quieres, `openUri` para el botón "Abrir <launcher>").
3. (Opcional) Agrega su logo en `renderer/icons.js`; si no, usa un mando genérico.

Aparece sola en el menú lateral y en Configuración > Bibliotecas.

## Estructura

```
main.js            proceso principal (lanzamiento, almacenamiento, overlay, atajos)
translate.js       traducción de descripciones (MyMemory / DeepL)
tracker.js         juego en ejecución (detección y cierre seguro)
shots.js           capturas de pantalla por juego
overlay-preload.js puente de la ventana overlay (interfaz en renderer/overlay.*)
metadata.js        información de los juegos (tienda de Steam)
preload.js         puente seguro entre la interfaz y el sistema
scanners/          una biblioteca por archivo + index.js (registro)
renderer/          interfaz (HTML, CSS, JS); icons.js = logos de bibliotecas, palette.js = colores de imágenes, quicksearch.js = búsqueda rápida
```

## Eventos y rebajas (`events.json`)
Sección **Eventos** en el menú lateral (insignia = eventos en curso): rebajas y festivales de Steam y Epic, en curso y próximos, con cuenta atrás, barra de progreso y botón para abrirlos en Steam o Epic. En Configuración → Sistema → **Avisos** se puede activar un aviso de Windows **un día antes** y **cuando empiezan**.
- Ni Steam ni Epic publican un calendario oficial que se pueda consultar, así que las fechas salen de `events.json` (incluido en la aplicación; ahora trae Next Fest, Scream Fest y la rebaja de invierno de Steam) y son **aproximadas**.
- **Actualizarlo sin sacar versión nueva:** sube un archivo `events.json` a la raíz de tu repositorio (rama `main`) de GitHub, con el mismo formato; Comptus lo descarga cada 24 h y sus eventos mandan sobre los incluidos (mismo `id`) y añaden los nuevos. Formato de cada evento: `id`, `name`, `store` (`steam`, `epic` o `all`), `kind` (`sale`, `fest`, `free`, `other`), `start` y `end` en formato `2026-12-17T18:00:00Z`, `url` (solo de las tiendas de Steam o Epic) y `desc` opcional.
- Los eventos que terminaron hace más de 3 días se quitan solos.

## Historial de cambios

Los cambios de cada versión están en [CHANGELOG.md](CHANGELOG.md) y en las [Releases](https://github.com/emptystill/Comptus-Launcher-Beta/releases).
