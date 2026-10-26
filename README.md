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

## Iconos de la interfaz
Todos los botones, menús y filtros usan iconos propios (SVG, en `renderer/ui-icons.js`) en lugar de emojis. Toman el **color de acento del tema**, así cambian solos al personalizar la interfaz (sobre botones de color de acento usan el color de su texto). Para añadir uno nuevo, agrégalo a `UI_ICONS` y úsalo como `[[nombre]]` en cualquier texto de botón. Los iconos de colecciones que eliges tú (emojis o imagen) se conservan; el de por defecto es una carpeta.

## Mis temas
En *Configuración → Apariencia* ajusta los cinco colores, y si quieres elige un fondo en la pestaña *Fondo* (tu imagen o un dibujo, con su oscurecido y desenfoque). Luego, en **Mis temas**, escribe un nombre y pulsa *Guardar tema actual*. Con la casilla *Incluir el fondo actual* marcada, el tema guarda también el fondo: al aplicarlo vuelven la imagen, el oscurecido y el desenfoque. Sin marcarla, solo guarda los colores y no toca tu fondo. Aparecen junto a los temas incluidos: un clic los aplica y la ✕ (al pasar el ratón) los borra. Guardar con un nombre que ya existe lo reemplaza. Se guardan en `settings.myThemes`. Si el archivo de imagen se mueve o se borra, el tema se aplica igual pero sin ese fondo.

## Logotipos automáticos
Los juegos de Steam (y los locales emparejados con uno de Steam) muestran su **logotipo oficial** en lugar del nombre en la cabecera de su página (`library_logo.png` de la CDN de Steam, con `logo.png` como respaldo; si no existe, se muestra el nombre). No hay que descargar nada: aparece solo. El menú 🔤 del juego permite elegir uno propio (manda sobre el de Steam), moverlo/redimensionarlo, o *Quitar logotipo* (se queda el nombre y no vuelve solo; *Usar el logotipo de Steam* lo restaura).

## Juegos dentro de cada colección
Cada colección con juegos tiene una flecha ▸ a la derecha en la barra lateral: al pulsarla se despliega la lista de sus juegos (en orden alfabético, los ocultos no salen y los no instalados se ven atenuados). Un clic en un juego abre su página (queda marcado mientras la ves) y el clic derecho abre su menú. Se recuerda qué colecciones dejaste abiertas.

**Desplegar con un clic:** pulsar directamente una colección o una biblioteca con «Instalados / No instalados» la abre y muestra su contenido; pulsarla otra vez (mientras la estás viendo) la cierra. La flecha ▸ sigue funcionando por si solo quieres abrir/cerrar sin cambiar de vista.

**Una a la vez:** solo hay una lista desplegada en la barra lateral; al abrir otra colección o biblioteca, la anterior se cierra sola.

## Página de colecciones
Pulsa el nombre **Colecciones** de la barra lateral (la flecha de al lado sigue minimizando la sección) para ver todas tus colecciones como tarjetas, igual que la biblioteca: cada una muestra un collage con las portadas de sus juegos (o su icono si está vacía), su nombre y cuántos juegos tiene. Un clic abre la colección; clic derecho permite editarla o eliminarla; la tarjeta *Nueva colección* crea otra. El buscador filtra por nombre y el tamaño de las tarjetas sigue el control de tamaño de portadas.

**Tarjetas horizontales y portada propia:** las colecciones se ven en formato horizontal (16:9). Con clic derecho sobre una colección (en la página o en la barra lateral), o con el botón *Portada* de su cabecera, eliges una imagen propia; *Quitar portada* vuelve al collage automático. Al abrir una colección aparece arriba su nombre, icono y número de juegos, con los botones *Editar* y *Portada*.

## Imágenes propias grandes
Las portadas, banners e iconos que eliges tú (webp, jpg, png… de cualquier tamaño) se **reducen una vez** y se guardan en `%APPDATA%\mi-lanzador-de-juegos\imgcache`; las tarjetas, la lista lateral y las cabeceras usan esas copias ligeras (portada 480 px, icono 96 px, banner 1600 px). El archivo original no se toca. Las imágenes pequeñas (menos de 150 KB) se usan tal cual. Las imágenes **animadas** (webp, gif, png animado) se detectan y se controlan según *Configuración → Apariencia → Portadas animadas*: **solo al pasar el ratón** (por defecto: las tarjetas muestran una copia fija ligera y la que señalas se mueve), **unas pocas a la vez** (hasta 4 de las visibles, más la que tengas bajo el ratón; la ventana oculta lo deja todo quieto), o **todas siempre** (puede ir lento con muchas). Los iconos de la lista lateral nunca se animan y la página del juego siempre usa el original animado. Si quieres liberar espacio, puedes borrar esa carpeta: se regenera sola.

## Ventana de configuración
El botón **Configuración** (abajo a la izquierda) abre una ventana con las opciones separadas por secciones: **Bibliotecas** (cuáles se escanean), **Apariencia** (temas, mis temas, colores, tamaño de portadas, portadas animadas), **Fondo** (imagen, oscurecer, desenfoque), **Información** (descarga automática, tráiler, RAWG, traducción, descarga en lote), **Steam** (clave, SteamID, juegos no instalados, sincronizar), **Overlay y capturas** (atajos) y **Acerca de** (versión, datos, restablecer). Recuerda la última sección abierta.

## Barra superior con iconos
Los botones de arriba son solo iconos (el nombre sale al pasar el ratón): **▽ Filtrar y ordenar** (abre la barra de la derecha, ver abajo), **disco = Solo instalados** (resaltado cuando está activo; solo afecta a «Página principal» y se ignora en cuanto hay algún filtro activo, así «Estado: Todos» muestra también los no instalados), **☑ Seleccionar** (elegir varios juegos para añadirlos a una colección) y **↻ Actualizar** (volver a escanear las bibliotecas).

**Búsqueda desplegable:** la barra de búsqueda es ahora un icono 🔍 que se despliega con una animación al pulsarlo (o con **Ctrl + F**). Si la dejas vacía y haces clic fuera, se pliega sola; con texto escrito se queda abierta; **Esc** limpia la búsqueda y la cierra. Todos los iconos de la barra superior van centrados.

## Filtrar y ordenar
El botón del **embudo** (sustituye al de orden) abre una **barra lateral derecha** (se queda abierta mientras navegas; se cierra con el embudo, la X o Esc, y recuerda si la dejaste abierta) con opciones en lista (casillas para marcar varias, círculos para elegir una) que se combinan entre sí; el número en el botón indica cuántos filtros hay activos y **Limpiar filtros** los quita todos. Se aplican a la vista que estés mirando (Todos, una biblioteca, una colección…), también a la lista lateral, y duran lo que la sesión.
- **Ordenar por**: nombre (A–Z / Z–A), jugados recientemente, más tiempo jugado, fecha de lanzamiento (más nuevos / más antiguos), mejor puntuación Metacritic y más logros conseguidos.
- **Biblioteca** (varias a la vez), **Estado** (instalados / no instalados; si eliges uno, «Solo instalados» deja de ocultar), **Solo favoritos**, **Tiempo jugado** (sin jugar, <1 h, 1–10 h, 10–50 h, +50 h).
- **Logros** (100 % completados, en progreso, sin empezar — solo para juegos de Steam cuya página ya abriste), **Género** (cualquiera de los elegidos), **Información** (con / sin información, con tráiler), **Metacritic** (70+, 80+, 90+) y **Colección** (cualquiera de las elegidas).

## Juegos completados al 100 %
Los juegos de Steam con todos los logros conseguidos muestran en la portada el **trofeo dorado** (junto a la estrella de favoritos) un borde dorado y **estrellitas doradas que titilan** por el borde de la portada, para que destaquen. La animación es ligera; se desactiva si Windows tiene activada la reducción de animaciones. Los logros se conocen una vez abres la página del juego (ahí se cargan), así que el trofeo aparece en ese momento. El filtro *Logros → 100 % completados* los lista todos.

## Epic Games: tu biblioteca completa
En **Configuración > Epic Games** pulsa *Iniciar sesión en Epic*: se abre la página oficial de Epic en una ventana (tu contraseña no pasa por el lanzador; la ventana no guarda la sesión). Al terminar, el lanzador trae todos los juegos que tienes en tu cuenta de Epic y los muestra como **No instalados**, con portada y logo, y el botón **Instalar** (abre la instalación en Epic Games Launcher). Se actualizan solos al abrir el lanzador (cada 12 horas) o con *Sincronizar*, y funcionan con los filtros, colecciones, favoritos, etc. igual que los de Steam. *Cerrar sesión* quita el permiso y esos juegos.

- Si la ventana de inicio de sesión no funciona (por ejemplo por un captcha), usa *¿La ventana no funciona? Usar mi navegador*: abre Epic en tu navegador, copia el texto que muestra (contiene `authorizationCode`) y pégalo.
- Lo único que se guarda es un token renovable, **cifrado con Windows** (DPAPI) en `games.json`; nunca se envía a la interfaz ni a otros sitios que no sean Epic. Si caduca (tras semanas sin abrir el lanzador) te pedirá iniciar sesión otra vez.
- Epic no tiene una API pública para esto: el lanzador usa el mismo servicio de biblioteca que usa el propio Epic Games Launcher (como Legendary o Heroic). Podría dejar de funcionar si Epic lo cambia. El tiempo de juego de Epic no se puede leer.

## Información y logros ya cargados
Con **Configuración > Información > «Completar en segundo plano…»** (activado por defecto) el lanzador, al abrirse y tras cada sincronización, descarga solo en segundo plano la información, portada, banner y —en los juegos de Steam, si pusiste tu clave— los **logros** de todos los juegos que aún no los tengan, instalados o no. No hay ventanas: la lista se va refrescando sola. Así el trofeo del 100 %, el filtro de logros y la información están listos sin abrir cada juego. Lo que no se encuentra no se vuelve a buscar solo hasta pasada una semana (búscalo a mano con el botón «i» de su página). El botón *Descargar información e imágenes de todos los juegos* hace lo mismo con ventana de progreso, ahora también con los logros.

## Información de juegos de Epic que no se encuentran
Para los juegos de Epic el lanzador busca la información por nombre (Steam, y RAWG si pusiste su clave). Ahora quita antes sufijos como «Standard Edition», «Deluxe» o «Game of the Year» para acertar más. Si aun así no aparece en ninguno, usa la **descripción y el desarrollador de la propia tienda de Epic** (sin capturas ni tráiler). Si no se encuentra nada, la página del juego explica el motivo, y puedes buscarlo a mano con el botón «i». Para que los juegos de Epic ya sincronizados traigan esos datos, el lanzador vuelve a sincronizar tu cuenta de Epic la próxima vez que lo abras.

## Logros de Epic (experimental)
Los juegos de Epic de tu cuenta muestran el panel **Logros** igual que los de Steam (progreso, iconos, descripciones, fecha de desbloqueo y % global), la barra «12 / 40», el trofeo y borde dorado del 100 % y el filtro de logros. Funciona con la misma sesión de Epic de *Configuración > Epic Games* (no pide nada más) y usa la misma consulta que usan Epic y plugins como SuccessStory de Playnite. También se descargan en segundo plano junto con la información. Solo salen en juegos que Epic tiene registrados con logros.

Es una consulta interna de Epic, no documentada: si Epic la cambia puede fallar. Si en el panel aparece «Epic rechazó la consulta de logros (…)», copia ese texto completo: dice qué parte hay que ajustar.

## Temas con ilustración
En **Configuración > Apariencia > Temas con ilustración** hay 16 temas con ilustraciones reales (pixel art y arte digital) que cambian los colores **y** ponen la imagen de fondo: *Luna carmesí, Ruinas de otoño, Árbol retro* (claro), *Noche de lunas, Espiral galáctica, Prado sereno, Ciudad junto al lago, Calle azul, Bosque crepuscular, Eclipse rosado, Ramen neón, Ciudad lluviosa, Atardecer en el estudio, Verde geométrico, Pagoda sakura* y *Obsidiana roja*.
Las imágenes están en `renderer/backgrounds/` (con miniaturas en `thumb/`). Al elegir un tema reemplaza la imagen de fondo, pero **tu oscurecimiento y desenfoque se mantienen** como los tengas en **Fondo** (los temas ya no los cambian). El pixel art se muestra sin suavizar para que se vea nítido.

## Crear el .exe portable
En Windows, dentro de la carpeta del proyecto: `npm install` y luego `npm run dist`. Se genera en `dist/` un único `.exe` portable (no instala nada) con el icono de `build/icon.ico`. Para cambiar el icono, reemplaza `build/icon.ico` (256×256) y `build/icon.png`.

### Si `npm run dist` falla con «Cannot create symbolic link… privilegio requerido»
Windows no deja a electron-builder crear enlaces simbólicos al descomprimir sus herramientas. Soluciones (una basta):
1. Abrir PowerShell **como administrador** y repetir `npm run dist`.
2. O activar el **Modo de desarrollador** (Configuración > Sistema > Para programadores) y repetir.
3. Antes de reintentar, borrar la caché dañada: `Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign"`.
4. Si no quieres tocar nada: `npm run dist:sinicono` genera el `.exe` sin editar el icono del archivo (la ventana sí muestra el icono).

## Instalador (Setup)
Genera el instalador con `npm run dist:instalador` (o `npm run dist:instalador:sinicono` si tienes el problema de permisos descrito arriba). Sale en `dist/` como `Comptus Setup <versión>.exe`.
Está personalizado con la identidad de Comptus (`build/`):
- **Imágenes propias** (barra lateral con el mando, el nombre en tipografía Audiowide y estrellas; cabecera a juego) en `installerSidebar.bmp`, `uninstallerSidebar.bmp` e `installerHeader.bmp`.
- **Pasos:** bienvenida, aviso de uso (`licencia.txt`), carpeta de instalación, **opciones** (acceso directo en el escritorio, en el menú Inicio y abrir Comptus al iniciar Windows) y pantalla final con «Ejecutar Comptus».
- Se instala solo para tu usuario (sin administrador). Al desinstalar **no borra tus datos** (`%APPDATA%\mi-lanzador-de-juegos`), y quita los accesos directos y el arranque con Windows.
- Para cambiar los textos o las opciones: `build/installer.nsh` y `build/licencia.txt`. Las imágenes miden 164×314 (barra) y 150×57 (cabecera).

## Nombre y logo
El programa se llama **Comptus** (nombre beta). El logo de la barra lateral usa la tipografía *Audiowide* (incluida en `renderer/fonts/`, licencia abierta SIL OFL) y un degradado con los colores de acento del tema, así que cambia con cada tema. Tus datos siguen en `%APPDATA%\mi-lanzador-de-juegos`, por lo que no se pierde nada con el cambio de nombre.

## Estado del botón Jugar
Al lanzar un juego desde Comptus, el botón de su página cambia: **Iniciando…** (esperando a que abra) → **Jugando** (en verde) → al pulsarlo pide confirmación (**¿Detener? Clic otra vez**) → **Deteniendo…** → vuelve a **Jugar** cuando el juego termina. Cierra el juego con calma y, si sigue abierto pasados unos segundos, lo fuerza.
- Solo reconoce los juegos abiertos desde Comptus; uno que abras por fuera no se detecta.
- Para detectar el juego, Comptus consulta cada 5 s los procesos de la carpeta del juego mientras juegas (antes solo lo hacía con el overlay activado).

## Pantallas estrechas y en vertical
En ventanas estrechas (menos de 900 px) o en vertical, la cabecera del juego pasa a una sola columna: portada centrada y el logotipo (o el nombre) debajo, sin tapar la portada. En pantallas anchas, el logotipo de posición libre se mueve solo en el espacio a la derecha de la portada.

## Rendimiento al abrir
Comptus mantiene tus datos en memoria y los guarda en segundo plano (cada pocos segundos y al cerrar), en lugar de releer y reescribir `games.json` completo con cada cambio. Con cientos de juegos con información y logros, la descarga en segundo plano del arranque provocaba pequeños congelamientos. Si Comptus se cierra de golpe (corte de luz, cierre forzado) puedes perder, como mucho, los últimos segundos de cambios.

## Banners animados
El banner de la cabecera de un juego se muestra siempre en movimiento si es un webp, gif o png animado, sea cual sea la opción de animación elegida (esa opción solo afecta a las portadas de la biblioteca, que son muchas a la vez).

## Xbox: juegos de tu cuenta y logros
En **Configuración > Xbox** puedes iniciar sesión con tu cuenta de Microsoft para ver los **juegos de PC de tu historial de Xbox** (comprados o de Game Pass) aunque no estén instalados, con sus portadas, y los **logros de Xbox** de cada juego (los de Xbox instalados también). Los juegos sin instalar tienen el botón «Instalar», que abre la búsqueda en Microsoft Store.

**Inicio de sesión:** pulsa «Iniciar sesión en Xbox»: se abre microsoft.com/link, escribes el código que muestra Comptus y aceptas. No hay que registrar nada en Azure. Tu contraseña no pasa por Comptus; solo se guarda un permiso renovable cifrado con Windows (`%APPDATA%\mi-lanzador-de-juegos`). Se actualiza solo al abrir (cada 12 horas), y los logros se descargan en segundo plano como los de Steam y Epic.
- Usa el mismo inicio de sesión que la app de Xbox (identificadores de Live Connect), como hacen otros programas de terceros. No es una integración oficial para Comptus: Microsoft podría cambiarlo.
- Solo aparecen juegos de PC del historial de Xbox (los de consola se descartan). Un juego instalado de otra tienda no aparece aquí.
- Primera versión de esta función, no probada con una cuenta real. Si algo falla, el mensaje de Configuración > Xbox indica el motivo.

## Ubisoft Connect: instalados y toda tu biblioteca
Comptus lee lo mismo que Playnite: la **caché local de Ubisoft Connect** (`%LOCALAPPDATA%\Ubisoft Game Launcher\cache\configuration\configurations`), que tiene todos los juegos de tu cuenta. Así aparecen también los **no instalados** (con portada, banner, logotipo y el botón «Instalar», que abre la instalación en Ubisoft Connect) y los instalados salen con su nombre real y portada. Se excluyen el contenido extra (DLC), lo comprado en otras tiendas (como Steam, para no duplicarlo) y lo que no se puede abrir. Los juegos sin instalar se ocultan con la opción «Mostrar también los juegos que tengo pero no están instalados».
La caché se actualiza cuando abres Ubisoft Connect, así que un juego recién comprado puede tardar en salir hasta que lo abras una vez. El formato de ese archivo no está documentado: si Ubisoft lo cambia, Comptus sigue detectando los instalados por las demás fuentes.

Para los instalados se combinan varias fuentes:
1. Registro `Ubisoft\Launcher\Installs` (HKLM de 64 y 32 bits y HKCU): carpeta e identificador de cada juego.
2. Registro `Uninstall\Uplay Install <id>`: el nombre real del juego.
3. Las carpetas de las bibliotecas de Ubisoft (la de `settings.yml`, la de por defecto y las de los juegos conocidos): un juego instalado que el registro no recoja se añade y se abre por su `.exe`.
Los juegos cuya carpeta ya no existe (entradas huérfanas del registro) se descartan.

**Si falta algún juego:** *Configuración > Bibliotecas > Diagnóstico de Ubisoft* copia al portapapeles qué se revisó (incluida la caché: registros leídos y saltados) y qué se encontró. Pégalo en el chat para ajustarlo.

## Copias de seguridad
En **Configuración → Copias de seguridad**:
- **Exportar copia…** guarda en un `.json` tus juegos añadidos a mano, los datos de cada juego (favoritos, colecciones, imágenes elegidas, etc.), tus ajustes y temas.
- **Restaurar copia…** la vuelve a cargar. Puedes **combinar** (conserva lo que tienes y añade lo de la copia) o **reemplazar**. Antes de aplicar se guarda automáticamente una copia de lo actual.
- Comptus hace además **una copia automática al día** (las últimas 7) en `%APPDATA%\mi-lanzador-de-juegos\backups`; el botón «Abrir copias automáticas» abre esa carpeta. Para recuperar una, cópiala como `games.json` con Comptus cerrado.
- No incluye las sesiones de Epic/Xbox (están cifradas con tu cuenta de Windows y se vuelven a iniciar en el equipo nuevo) ni los archivos de imagen que elegiste: solo guarda su ruta. El archivo incluye tus claves de Steam/RAWG si las pusiste: no lo compartas.

## Checklist
`CHECKLIST.md` lista todo lo que ya tiene Comptus y lo que falta.

## Ventana de Configuración
La lista de pestañas ocupa ahora todo el alto de la ventana (antes la limitaba la regla del menú lateral y, con 10 pestañas, se desplazaba y ocultaba las primeras). La pestaña «Copias de seguridad» se llama «Copias» en la lista.

## Tamaño de la ventana
La primera vez, Comptus abre al ~85 % del área útil de tu pantalla (antes era siempre 1280×800). Después recuerda el tamaño, la posición y si la dejaste maximizada. Si el monitor donde estaba ya no existe, vuelve al tamaño por defecto. Para volver a empezar, borra `windowBounds` de `games.json` o simplemente cambia el tamaño y se guardará el nuevo.

## Mi seguimiento: estados y etiquetas
En la página de cada juego, el panel **Mi seguimiento** (arriba) permite marcar el juego como **Pendiente, Jugando, Completado o Abandonado** (un clic elige, otro clic lo quita) y añadir **etiquetas propias** (escribe y pulsa Intro o coma; hasta 12 por juego, de 24 caracteres como máximo; Retroceso borra la última). Las etiquetas ya usadas se sugieren al escribir.
- Las tarjetas muestran una insignia con el estado, debajo de la de la biblioteca.
- En el panel de filtros (embudo) hay dos grupos nuevos: **Mi seguimiento** (cada estado o «Sin estado») y **Etiquetas** (los juegos con cualquiera de las elegidas).
- La búsqueda también encuentra por etiqueta.
- Se guarda junto al resto de datos del juego y entra en las copias de seguridad.

## Juegos repetidos: una sola ficha
Si el mismo juego está en varias bibliotecas (Steam + Epic, Epic + Ubisoft, un juego local que también tienes en una tienda…), Comptus lo muestra **una sola vez** en la página principal, favoritos, recientes y colecciones. Dentro de cada biblioteca (Steam, Epic…) sigues viendo lo suyo.
- **Cómo se detecta:** el nombre es el mismo ignorando mayúsculas, acentos, ™ ® ©, signos, «The» y «Tom Clancy's» iniciales, la «Edition» de la tienda («Ultimate Edition», «Game of the Year»…) y con los números romanos II–X como cifras («Assassin's Creed III» = «Assassin's Creed 3»). Se unen solo si son de **bibliotecas distintas** (dos entradas de Steam con el mismo nombre no se unen) y no están ocultos.
- **Quién es la principal:** la que elijas «por defecto»; si no, la instalada, luego la más jugada y por último el orden Steam → Epic → Ubisoft → Xbox → local.
- **La tarjeta** muestra, junto a la biblioteca, los iconos de las otras donde también está. El **tiempo jugado** es la suma, la **última sesión** la más reciente y es **favorito** si lo es en alguna. Quitar el favorito lo quita en todas.
- **En su página**, el panel **Disponible en** lista cada versión con su botón Jugar/Instalar, «Usar por defecto», «Separar» (la muestra como juego aparte; luego «Volver a unir») y «Ver ficha». El estado y las etiquetas de «Mi seguimiento» se guardan en todas las versiones.
- **Apagarlo:** Configuración → Bibliotecas → «Unir los juegos repetidos…».
- Si dos juegos distintos se unen por error, usa «Separar». Si los nombres son demasiado distintos, une a mano: clic derecho sobre el juego → **Unir con otro juego…** (o el botón del panel «Disponible en»); los parecidos salen primero. El botón **Ver juegos repetidos** (Configuración → Bibliotecas) copia un informe con lo unido y los parecidos que siguen separados.

## Ubisoft: juegos comprados en otras tiendas
Con **Configuración → Bibliotecas → «Incluir los juegos de Ubisoft Connect comprados en otras tiendas (Steam…)»** (activado por defecto), Comptus añade también los juegos de tu cuenta de Ubisoft que compraste en Steam y Ubisoft solo vincula (los de la insignia STEAM). Se unen a su ficha de Steam: la tarjeta muestra los dos iconos y en «Disponible en» la versión de Ubisoft aparece como «Vinculado a tu cuenta de Ubisoft». En la pestaña de Ubisoft Connect no se repiten: solo salen los vinculados que no se pudieron unir a ninguna ficha (para que puedas unirlos a mano), y el contador de la barra lateral los cuenta igual. Se juegan siempre desde la otra tienda (no tienen forma de abrirse desde Ubisoft), y nunca son la versión principal. En la biblioteca de Ubisoft Connect verás todos los de tu cuenta (los 43 en vez de 9). Si el nombre cambia entre tiendas y no se unen solos, usa «Unir con otro juego…».

## Bandeja, inicio con Windows y búsqueda rápida
En **Configuración → Sistema**:
- **Icono en la bandeja**: clic para abrir Comptus; clic derecho para ver los últimos juegos, buscar o salir. Con «Cerrar a la bandeja» la X oculta la ventana en vez de cerrar.
- **Iniciar con Windows** (solo en la versión instalada o portable ya compilada) y, aparte, **iniciar oculto** directamente en la bandeja.
- **Búsqueda rápida**: atajo global (por defecto `Ctrl+Alt+Espacio`, se puede cambiar) que abre una ventanita sobre cualquier programa. Escribe, ↑↓ para elegir, `Enter` para jugar, `Ctrl+Enter` para abrir su ficha, `Esc` para cerrar. Vacía, muestra los últimos que jugaste.

## Protección de tus datos
Si `games.json` no se puede leer al abrir (por ejemplo, bloqueado un instante por un antivirus), Comptus reintenta, no lo sobrescribe y deja una copia `games.ilegible-*.json` en la carpeta de datos. Además guarda `games.json.bak` al empezar cada sesión.

## Actualizaciones automáticas
Solo para la versión **instalada** (`npm run dist:instalador`); no funcionan con el portable ni con `npm start`. Comptus busca versiones nuevas en GitHub Releases al abrir y cada 6 horas (se puede desactivar en Configuración → Sistema → Actualizaciones). Si hay una, avisa; tú pulsas **Descargar** y luego **Reiniciar e instalar** (o se instala sola al cerrar).

**Configuración, una sola vez**
1. Crea un repositorio **público** en GitHub y escribe tu usuario y el nombre en `package.json` → `build.publish` (`owner` y `repo`, ya está puesto `emptystill` y `Comptus-Launcher-Beta`).
2. Ejecuta `npm install` (instala `electron-updater`).

**Publicar una versión nueva**
1. Sube el número de `version` en `package.json`.
2. `npm run dist:instalador`.
3. En GitHub: Releases → Draft a new release → etiqueta `v` + versión (por ejemplo `v1.25.0`) y sube los tres archivos de `dist/`: `Comptus-Setup-X.Y.Z.exe`, `Comptus-Setup-X.Y.Z.exe.blockmap` y `latest.yml`. Publícala (no como borrador).

Alternativa automática: con un token en la variable `GH_TOKEN`, `npm run dist:publicar` construye y sube todo.

## Estadísticas
En la barra superior, el icono de **Estadísticas** (al lado del botón de filtrar; pulsa otra vez para volver). **Ocultos** está arriba en la barra lateral, junto a Favoritos y Recientes: tiempo total jugado, juegos jugados y completados, los más jugados de siempre y del año, horas por mes (con selector de año), últimos 14 días, horas por tienda y tus estados. Con los repetidos unidos, cada juego suma el tiempo de todas sus tiendas.

El tiempo total sale de lo que informan Steam y Comptus. El desglose por **mes y por día** se calcula con un historial de sesiones que Comptus apunta desde la v1.25.0 cada vez que abres un juego desde él (solo cuentan sesiones de 1 minuto o más), así que empieza vacío y se va llenando. El historial va incluido en las copias de seguridad.

## Restaurar copias automáticas
Los archivos `games-AAAA-MM-DD.json` de la carpeta `backups` ahora también se pueden elegir en «Restaurar copia…» (antes solo servían las exportadas desde el botón).

## Transiciones suaves (prueba)
Al entrar a otro apartado (biblioteca, tienda, colección, ficha de un juego, estadísticas o una pestaña de Configuración) el contenido sube suavemente desde abajo (medio segundo) casi sin desvanecerse, para que no se vea el fondo del lanzador a través. Se puede quitar en *Configuración → Apariencia → Transiciones suaves*, y se desactivan solas si Windows tiene activada la opción de reducir animaciones. Es una prueba: si no te convence, desmárcala o dímelo y la quitamos.

## Portadas sin «blanco» al cambiar de biblioteca
Comptus recuerda mientras está abierto las portadas que ya cargó (al volver a una biblioteca salen al instante, sin la carga diferida) y las que no existen (ponen la letra de color directamente, sin volver a pedirlas por internet; se vuelven a intentar a los 10 minutos). Mientras llega una portada nueva, la tarjeta muestra el color del juego en vez de un hueco en blanco.

## Diagnóstico de rendimiento
En *Configuración → Acerca de → Rendimiento*, el botón **Copiar diagnóstico de rendimiento** copia un informe con las pausas largas de la interfaz, el tiempo que tardó en dibujarse cada ficha, las imágenes lentas, lo que tardó el cálculo de colores y, para los fotogramas lentos, en qué se fue el tiempo (código, estilos o pintado). Úsalo justo después de abrir la ficha o la sección que se «frena» para poder ver qué es lo que tarda.

## Fichas más rápidas con portadas propias grandes
La ficha del juego ya no carga los archivos originales de la portada ni del logotipo (por ejemplo PNG grandes en OneDrive): usa la versión ligera guardada en la caché de Comptus. Solo se usa el original si la portada es animada.

## Carpeta «Comptus Media» (1.26.1)
La primera vez que abres Comptus pregunta si quieres crear la carpeta **Comptus Media** (por defecto en Documentos, o donde elijas). Dentro crea: `Banners`, `Collections Banners`, `Comptus Copias de seguridad`, `Iconos`, `Logos`, `My Themes`, `Portadas`, `Themes Wallpaper` y `Video - Trailers`. Si dices «Ahora no», se usa una carpeta interna (`%APPDATA%\mi-lanzador-de-juegos\media`). Se puede crear o mover después en Configuración → Sistema → **Mis imágenes**; al moverla se copia lo que ya había (la carpeta anterior no se borra).

- Cada imagen o tráiler que eliges desde Comptus se **copia** a su subcarpeta (nombrada con el juego); los datos guardan una referencia relativa (`media:Portadas/Juego.png`), así que puedes borrar los originales y mover la carpeta sin romper nada.
- Si sueltas una imagen en `Portadas`, `Banners`, `Logos` o `Iconos` con el **nombre del juego** (o su número de Steam, p. ej. `1145360.png`), se usa sola. Prioridad: lo que elegiste a mano > carpeta > imágenes de la tienda.
- **Traer mis imágenes actuales a esta carpeta**: copia lo que ya tenías elegido desde rutas sueltas (p. ej. tu carpeta ArtWork). Hazlo una vez.
- «Exportar copia…» propone guardar en `Comptus Copias de seguridad`. La copia solo apunta a las imágenes: para cambiar de equipo, copia también la carpeta Comptus Media.
- La pregunta se hace en la propia aplicación y no en el instalador, así funciona igual con instalador, portátil y `npm start`.

## Instalación en Archivos de programa (1.26.5)
El instalador instala **para todos los usuarios** y propone por defecto `C:\Archivos de programa\Comptus\Comptus Launcher` (pide permisos de administrador, también al actualizar). Tiene una pantalla propia **«Carpeta para tus imágenes»**: casilla «Crear la carpeta Comptus Media» y la ruta editable (por defecto `C:\Archivos de programa\Comptus\Comptus Media`, fuera de la carpeta del programa, con botón Examinar). Si la marcas, la crea con permiso de escritura para los usuarios y Comptus la usa desde el primer arranque sin preguntar. Si no, Comptus pregunta dentro de la aplicación en la primera apertura de esa instalación.
- Desinstalar o actualizar solo toca `Comptus Launcher`; la carpeta de media queda intacta. Las actualizaciones silenciosas no tocan esa elección.
- Si ya tenías la versión instalada solo para tu usuario, desinstálala antes; tus datos (`%APPDATA%`) se conservan.
- El aviso dentro de la aplicación sale en la primera apertura de cada instalación nueva (o si la carpeta elegida ya no existe).
- **Iconos en blanco en el Explorador:** suele ser la caché de iconos de Windows. Cierra sesión o ejecuta `ie4uinit.exe -show`, y si sigue, borra `%LocalAppData%\IconCache.db` y los `iconcache_*.db` de `%LocalAppData%\Microsoft\Windows\Explorer` y reinicia el Explorador.

## ¿Qué juego hoy? (1.27.0)
Botón con un dado en la barra superior (junto a Estadísticas). Propone un juego al azar y puedes pulsar **Otro** (no repite hasta agotar el grupo), **Ver ficha** o **Jugar**. Se elige el grupo: cualquier instalado, pendientes, sin estrenar, favoritos, los que estás jugando o toda la biblioteca; por defecto no propone completados ni abandonados (se puede desmarcar). Recuerda tu última elección. Nunca propone juegos ocultos.

## Espacio en disco (1.28.0)
Comptus mide en segundo plano la carpeta de cada juego instalado (de cualquier tienda, también locales) unos segundos después de abrir y la guarda aparte (`disk-sizes.json`), repitiéndolo como mucho una vez por semana por juego o cuando cambia su ruta.
- **Estadísticas → Espacio en disco:** total que ocupan tus juegos, reparto por tienda con porcentaje y los 15 que más ocupan (al pulsar uno abre su ficha). «Recalcular tamaños» fuerza una nueva medición.
- **Ficha del juego:** nuevo dato «En disco».
- **Ordenar:** «Más espacio en disco».
- No sigue accesos directos (enlaces) y descarta carpetas con más de 400 000 archivos (por ejemplo, la raíz de un disco). Los juegos locales cuyo `.exe` está en la raíz de un disco no se miden.

## Juegos gratis (1.29.0)
Nueva sección **Gratis** en el menú lateral (entre Recientes y Ocultos), con una insignia con las ofertas del momento que aún no tienes.
- **Epic Games:** los juegos gratis de esta semana (con cuenta atrás y precio original) y los anunciados para la próxima.
- **Steam:** ofertas temporales del 100 % que Steam destaca. No incluye juegos que son gratuitos siempre ni los fines de semana gratis.
- «Ya la tienes» aparece si el juego ya está en tu biblioteca. El botón abre la tienda en el navegador (Comptus no reclama nada por ti).
- Se consulta al abrir (con 1 hora de caché) y con el botón «Actualizar»; usa el país de tu Windows para las ofertas y los precios. Si una tienda no responde, se muestra lo último guardado.
- **País (1.29.1):** el país para las ofertas y los precios se toma de la zona horaria de Windows (más fiable que el idioma, que puede estar en «es-MX» aunque vivas en otro país); se puede cambiar con el selector de la parte superior de la sección Gratis y se recuerda.
- **Abrir en la aplicación (1.29.2):** «Reclamar en Epic» y «Ver en Steam» abren la oferta directamente en el cliente de Epic Games o de Steam (si no están instalados o no responden, se abre la tienda web). Solo se abren direcciones de tienda de esas dos plataformas.
- (1.29.3) Si los datos guardados venían de una versión anterior, la dirección de la aplicación se deduce de la de la tienda web, así que también abre Epic/Steam con ofertas ya descargadas.
- **Tarjetas y DLC (1.29.4):** las tarjetas son más grandes y apaisadas. Cada oferta lleva una etiqueta **Juego** (verde) o **DLC** (naranja); en Steam se consulta el tipo real de cada oferta y los DLC salen en su propia sección («DLC y contenido extra gratis») con «Necesita el juego…». La insignia del menú cuenta solo juegos completos que aún no tienes.
- (1.29.5) Los datos de ofertas guardados por la 1.29.3 o anteriores se descartan para que se vuelvan a pedir con el tipo (Juego/DLC) y la imagen; si Steam no responde con el tipo, la tarjeta muestra «Tipo sin confirmar».

## Avisos de juegos gratis (1.30.0)
Comptus revisa las ofertas gratis de Epic y Steam unos segundos después de abrir y luego cada 3 horas, y muestra una **notificación de Windows** cuando aparece una nueva que aún no tienes (por ejemplo «Gratis en Epic Games: …»). Al pulsarla abre la sección **Gratis**.
- La primera vez solo anota lo que ya estaba publicado (no te avisa de ofertas que ya conocías); los DLC y contenido extra solo avisan si lo activas.
- Se configura en Configuración → Sistema → **Avisos**.
- Solo funciona mientras Comptus esté abierto: para recibirlos siempre, activa «Iniciar con Windows» y «Al cerrar, dejar en la bandeja».

## Eventos y rebajas (1.31.0)
Sección **Eventos** en el menú lateral (insignia = eventos en curso): rebajas y festivales de Steam y Epic, en curso y próximos, con cuenta atrás, barra de progreso y botón para abrirlos en Steam o Epic. En Configuración → Sistema → **Avisos** se puede activar un aviso de Windows **un día antes** y **cuando empiezan**.
- Ni Steam ni Epic publican un calendario oficial que se pueda consultar, así que las fechas salen de `events.json` (incluido en la aplicación; ahora trae Next Fest, Scream Fest y la rebaja de invierno de Steam) y son **aproximadas**.
- **Actualizarlo sin sacar versión nueva:** sube un archivo `events.json` a la raíz de tu repositorio (rama `main`) de GitHub, con el mismo formato; Comptus lo descarga cada 24 h y sus eventos mandan sobre los incluidos (mismo `id`) y añaden los nuevos. Formato de cada evento: `id`, `name`, `store` (`steam`, `epic` o `all`), `kind` (`sale`, `fest`, `free`, `other`), `start` y `end` en formato `2026-12-17T18:00:00Z`, `url` (solo de las tiendas de Steam o Epic) y `desc` opcional.
- Los eventos que terminaron hace más de 3 días se quitan solos.

## Más tiendas en Gratis (1.32.0)
La sección **Gratis** (y sus avisos) ahora incluye una parte **«Otras tiendas»**: Ubisoft, EA, Battle.net, itch.io, Amazon Prime Gaming, Xbox / Microsoft Store, Rockstar y similares. Estas ofertas salen de **GamerPower** (gamerpower.com, servicio público de terceros), porque esas tiendas no ofrecen una lista consultable de forma directa. Por eso Comptus no las verifica: el botón abre la página de GamerPower, desde donde se llega a la tienda; comprueba la oferta antes de reclamarla.
- Se descartan lo que ya se consulta directamente (Steam y Epic), GOG, los objetos de juego («loot») y las betas.
- Entran en la insignia del menú y en los avisos de Windows igual que las demás; «Ya la tienes» se detecta por el nombre del juego en tu biblioteca.
- Para eventos de otras tiendas puedes añadirlos a `events.json` (ver la sección de Eventos).

## Logos por tienda y barra lateral ajustable (1.33.0)
- **Logos:** los títulos de cada tienda en Gratis (Epic, Steam y cada una de las otras tiendas, que ahora van en su propio apartado), las etiquetas de las tarjetas y las de Eventos llevan el logo o icono de su tienda.
- **Barra lateral ajustable:** arrastra con el ratón la línea del borde derecho de la barra izquierda para hacerla más ancha o más estrecha (entre 200 y 560 px). Se recuerda al cerrar; con doble clic en esa línea vuelve al tamaño original.

## Lista de deseados (1.34.0)
Nueva sección **Deseados** en el menú lateral (junto a Gratis), con una insignia con los juegos de tu lista que están en oferta y que aún no tienes.
- **Steam:** lee tu lista de deseados con tu SteamID (el de Configuración > Steam o el de la cuenta con sesión iniciada en este equipo; no hace falta clave de API). Tu perfil y los «detalles del juego» deben ser públicos. Muestra precio actual, precio anterior y porcentaje de descuento en el país elegido en la sección Gratis.
- **Epic Games:** la lee con la sesión de Epic que ya iniciaste en Configuración > Epic Games. Epic no documenta esto, así que si lo rechaza se muestra el motivo en la propia sección.
- **Otras tiendas (Ubisoft, Xbox, EA, GOG…):** no ofrecen forma de leer su lista de deseados desde fuera, por eso no aparecen.
- Ordenar (mayor descuento, añadidos recientemente, nombre), filtro «Solo en oferta», marca «Ya la tienes» y botón que abre la tienda en la aplicación de Steam o Epic.
- **Avisos:** cada 3 horas se comprueba y se muestra una notificación de Windows cuando un juego de tu lista baja de precio o se vuelve gratis (se desactiva en Sistema > Avisos).

### 1.34.1
- **Deseados de Epic:** si Epic devuelve un juego de tu lista sin su ficha (antes se descartaba en silencio y no aparecía), ahora se completa con el catálogo de Epic.

### 1.34.2
- **Deseados de Epic:** si Epic responde con la lista vacía, Comptus prueba otras variantes de la consulta (servidor del lanzador y de la web, con y sin datos de precio) y, si sigue vacía, muestra en la sección un «detalle técnico» de lo que respondió cada una.

### 1.34.3
- **Deseados de Epic:** Epic devuelve solo los identificadores de los juegos de tu lista; ahora Comptus pide el nombre, la imagen, el precio y el descuento de cada uno a la tienda de Epic (y al catálogo como respaldo).

### 1.34.4
- **Deseados:** se descarta la caché guardada por versiones anteriores (podía mostrar los datos viejos de Epic hasta una hora) y, si una tienda falla o sale vacía, se reintenta a los 5 minutos en vez de a la hora.

## Portadas: forma y nombres (1.35.0)
En **Configuración > Apariencia**:
- **Forma de las portadas:** «Vertical (póster)» como siempre, o «Horizontal», que usa el banner del juego (si no tiene, recorta la portada vertical) en tarjetas 16:9. El control de tamaño sigue funcionando.
- **Ocultar los nombres de los juegos:** solo se ven las portadas; el nombre aparece al dejar el cursor encima (descripción emergente). Los juegos sin imagen conservan su nombre para poder reconocerlos.

### 1.35.1
- **Logo en las portadas horizontales:** el logo del juego (el mismo de su ficha; se respeta «Quitar logotipo») se muestra centrado sobre el banner y reemplaza al nombre. Se puede desactivar en Apariencia.

### 1.35.2
- **Portadas horizontales:** ya no se anima la portada (webp/gif) en esa vista; si hace falta usarla porque no hay banner, se muestra su imagen fija.

### 1.35.3
- **Portadas horizontales:** usan solo el banner. Si un juego no tiene banner se muestra su letra con el nombre (ya no se recorta la portada vertical, que podía animarse).

### 1.35.4
- **Portadas horizontales:** con el logo puesto, el nombre y los datos del juego vuelven a verse abajo (solo se ocultan si activas «Ocultar los nombres»).

### 1.35.5
- La opción «Ocultar los nombres de los juegos» indica ahora que es recomendable para las portadas horizontales (el nombre se solapa con el logo del banner).

### 1.35.6
- **Portadas horizontales:** el logo ocupa la zona de arriba y el nombre queda debajo, sin pisarse. Con «Ocultar los nombres» el logo usa todo el centro.

## SteamGridDB (1.36.0)
Nueva pestaña **Configuración > SteamGridDB** para rellenar las imágenes que falten con las de la comunidad de [SteamGridDB](https://www.steamgriddb.com/).
- Necesitas una **clave gratuita**: en steamgriddb.com, tu perfil > Preferences > API. Se comprueba al pegarla.
- Eliges qué rellenar: portadas (600×900), banners (heroes ~1920×620), logos e iconos (iconos desactivado por defecto). Solo imágenes **estáticas**, sin contenido para adultos ni humor, y la mejor valorada por la comunidad.
- Botón **«Rellenar ahora lo que falte»** (con progreso y cancelar) y opción de hacerlo **solo en segundo plano** un minuto después de abrir Comptus.
- **Solo se rellena lo que falta**: nunca se cambia una imagen que elegiste ni se pisa un archivo de tu carpeta Comptus Media. Las descargas se guardan ahí con el nombre del juego (Portadas, Banners, Logos, Iconos), así que puedes sustituirlas cuando quieras.
- Juegos de Steam: se buscan por su número. Los demás: solo si el nombre coincide exactamente (para no poner la imagen de otro juego). Lo que no se encuentra se reintenta a las 2 semanas.

### 1.36.1
- **SteamGridDB:** nuevas casillas «Cambiar las portadas / banners / logos automáticos»: sustituyen las imágenes que traen Steam, Epic, etc. (las que son una dirección web) por las de SteamGridDB en todos los juegos donde las encuentre. Nunca toca las que elegiste tú ni los archivos que ya estén en tu carpeta Comptus Media.

### 1.36.2
- **Portadas horizontales:** el logo de los juegos no instalados ya no se ve atenuado (el atenuado «No instalado» solo afecta al banner).

### 1.36.3
- **Carga de imágenes al desplazarte:** las tarjetas usan versiones ligeras de logos (360 px) y banners (720 px) en lugar de las grandes, y Comptus precarga en segundo plano las imágenes de las tarjetas que aún no se ven. La primera vez tras actualizar se crean esas versiones ligeras (puede notarse algo más de trabajo al abrir); después quedan guardadas.

## Imágenes de las tiendas en disco (1.37.0)
Las portadas, banners y logos que vienen de Steam, Epic y similares (direcciones web) se guardan ahora en la carpeta de datos de Comptus (`img-remote`) y se usan desde ahí, ya reducidas para las tarjetas. Antes se pedían a internet en cada arranque, por eso tardaban en aparecer al desplazarte (los banners de Steam pesan mucho). La primera vez se descargan en segundo plano (4 a la vez) y, al terminar, Comptus se recarga una vez para usarlas; desde entonces cargan al instante y también sin conexión.

### 1.37.1
- **Arranque más rápido:** la comprobación de las versiones ligeras de las imágenes ya no se hace de 3 en 3 (solo se limita la creación de las que faltan), y las versiones extra para portadas horizontales solo se calculan si usas esa forma.
- **Logos que desaparecían hasta pasar el cursor:** el logo de las portadas horizontales ahora se carga sin esperar (no es «perezoso») y va en su propia capa de dibujo, para que no se quede sin pintar.

### 1.37.2
- **Menos tirones:** al abrir, las primeras 60 tarjetas se dibujan enseguida y el resto en tandas cuando el programa está libre; la precarga de imágenes se pausa mientras te desplazas; y los logos de las portadas horizontales ya no llevan una sombra cada uno (pesada con cientos de tarjetas): ahora se oscurece un poco el centro de la tarjeta para que se lean.

### 1.37.3
- **Logos y tirones:** se vuelve a cargar el logo sin esperar (con la carga diferida desaparecían), y la tarjeta ya no cambia de estilo cuando termina de cargar. Se quitó el desenfoque («blur») de las etiquetas de tienda y de estado de cada tarjeta, que es lo más costoso de dibujar al desplazarse con cientos de tarjetas.

## Portadas horizontales de una sola imagen (1.38.0)
En la vista horizontal, el banner y el logo de cada juego se unen en **una sola imagen ligera** (640×360, guardada en disco) y la tarjeta usa solo esa: una imagen por tarjeta en lugar de dos capas, que pesa menos al desplazarte. El banner y el logo originales no se tocan (siguen igual en la ficha del juego). Las imágenes se crean en segundo plano, de 2 en 2 y sin molestar al desplazarte; mientras una no está lista, la tarjeta se ve como antes (banner y logo por separado) y se cambia sola. Se rehacen si cambias el banner o el logo del juego, o la opción «Ocultar los nombres». Solo se usa cuando el juego tiene banner y logo; solo en la vista horizontal.

### 1.38.1
- **Logos que desaparecían (portadas horizontales):** a algunos juegos de Steam les falta el logo principal y la tarjeta no probaba el alternativo (como hace la ficha); ahora sí. Además, en la vista horizontal se desactiva «content-visibility» en las tarjetas (con él, algunas imágenes podían no pintarse hasta pasar el cursor).

### 1.38.2
- **Parpadeos al llegar a los últimos juegos:** al terminar cada imagen unida, la tarjeta se rehacía entera (parpadeaba hasta cargar); ahora solo se cambia la imagen, ya cargada de antemano.

## Más bibliotecas (1.39.0)
Comptus detecta ahora los juegos instalados de cinco launchers más. Aparecen solos en el menú lateral y en Configuración > Bibliotecas (se pueden desactivar como las demás):
- **EA app / Origin:** lee el registro («EA Games», «Electronic Arts») y las carpetas `EA Games` / `Origin Games`; el nombre sale de `__Installer\installerdata.xml`. Se abren por su .exe.
- **Battle.net:** lee «Uninstall» (editor Blizzard/Activision). Los conocidos (WoW, Diablo III/IV/Immortal/II Resurrected, Overwatch, Hearthstone, Heroes of the Storm, StarCraft, Warcraft III) se abren por el launcher (`battlenet://…`); el resto, por su .exe.
- **Rockstar:** lee `Rockstar Games` en el registro (GTA V, RDR2, Max Payne 3…) y abre el `Play*.exe`.
- **Amazon Games:** lee las entradas `AmazonGames/…` de «Uninstall» y el `fuel.json` de cada juego.
- **itch.io:** recorre `%APPDATA%\itch\apps`; título y portada salen del recibo `.itch\receipt.json.gz`. Solo se listan los que tienen .exe.
Limitaciones: solo juegos **instalados** (no la biblioteca completa de cada cuenta). Si instalaste juegos en una carpeta personalizada que el registro no recoge, ese juego no sale (puedes agregarlo a mano). Los juegos repetidos entre tiendas (p. ej. GTA V en Steam y Rockstar) se unen como siempre.

## itch.io: tu biblioteca completa (1.40.0)
Nueva pestaña **Configuración > itch.io**. Pega tu clave de la API (itch.io > Settings > API keys > «Generate new API key»; es gratuita y solo se envía a itch.io) y Comptus lista los juegos que **compraste o reclamaste** aunque no estén instalados, con su portada y el botón «Instalar», que abre la página del juego en tu navegador. Usa la API oficial de itch.io (`/profile/owned-keys`).
- Solo se muestran juegos para Windows o web (sin herramientas, bandas sonoras, libros ni recursos). Los que ya tienes instalados no se repiten (se comparan por nombre).
- Se sincroniza con el botón de la pestaña, junto con el botón de Steam, y solo al abrir cada 12 horas. Si quitas la clave, desaparecen de la biblioteca.
- También cabe mejor la lista de pestañas de Configuración en ventanas bajas.

## Modo mando (1.41.0)
Comptus se puede usar entero con un gamepad (Xbox, PlayStation, etc.). Pulsa cualquier botón del mando y aparece un anillo de color en el elemento enfocado y una barra de ayuda abajo; al mover el ratón o usar el teclado vuelve la vista normal.
- **Cruceta o palanca izquierda:** mover el foco por tarjetas, barra lateral, botones y ventanas (mantenida repite). En un deslizador, izquierda/derecha lo ajusta.
- **A:** abrir o pulsar · **B:** atrás (cierra la ficha, el menú o la ventana) · **X:** jugar o instalar · **Y:** menú del juego (favorito, colecciones, ocultar…).
- **LB / RB:** sección anterior / siguiente de la barra lateral · **LT / RT** o palanca derecha: desplazarte · **Start:** ajustes · **Select:** ¿Qué juego hoy?
- Al cerrar una ficha o un menú el foco vuelve a la tarjeta donde estabas.
- Solo responde mientras Comptus está en primer plano: al abrir un juego deja de actuar y no interfiere con él.
- Se desactiva en Configuración > Sistema > Mando. Los campos de texto se siguen escribiendo con el teclado (A enfoca el campo).

## Pantalla de inicio (1.42.0)
Al abrir Comptus aparece primero una ventanita con el nombre y el logo (con el color de tu tema, una animación suave y la versión) mientras se carga el lanzador. Cuando la biblioteca ya está dibujada, la ventana principal **se despliega desde la pantalla de inicio**: nace con su tamaño y posición, crece (unos 0,4 s) hasta el suyo y aparece con un fundido, y la pantalla de inicio se cierra por debajo. Si abres Comptus maximizado, aparece directamente (como mínimo se ve ~1,4 segundos, para que no parpadee; si la biblioteca tarda, se muestra el lanzador a los 5 segundos y se va llenando).
- No sale cuando Windows te lo abre minimizado en la bandeja («Iniciar con Windows» + «Iniciar minimizado»).
- Se desactiva en Configuración > Sistema > «Mostrar una pantalla de inicio con el nombre de Comptus al abrir».

### 1.42.1
- **Pantalla de inicio:** el lanzador ya no aparece de golpe: se despliega desde la pantalla de inicio (crece hasta su tamaño con un fundido).

## Arranque más rápido y pantalla de inicio en pantalla completa (1.43.0)
- **Biblioteca al instante:** Comptus guarda la última biblioteca en disco (`library-cache.json`). Al abrir se dibuja enseguida con lo guardado y, en segundo plano, se vuelven a escanear las tiendas; si algo cambió (un juego instalado o quitado), se actualiza sola unos segundos después.
- **Menos trabajo al abrir:** EA app, Battle.net, Rockstar y Amazon Games ya no consultan el registro de Windows (cada consulta lanza un proceso) si no tienes ese launcher instalado.
- **Pantalla completa:** si cierras Comptus maximizado, al abrir ya no se ven a la vez la pantalla de inicio y el lanzador. Se despliega como ventana normal desde la pantalla de inicio y se maximiza al terminar.
- **Menos lag al desplegarse:** mientras la ventana crece, el contenido no se dibuja (solo el nombre «Comptus»); al llegar a su tamaño aparece con un fundido, en vez de recolocar cientos de tarjetas en cada fotograma.

### 1.43.1
- **Pantalla de inicio más corta:** si la biblioteca tarda en cargar (por ejemplo la primera vez, mientras todavía no hay copia guardada), el lanzador se muestra a los 5 segundos (antes 12) y se va llenando.
- **Sin parpadeo negro al abrir maximizado:** el lanzador se despliega ya hasta el tamaño de pantalla completa y el maximizado final no cambia nada. Al restaurar la ventana vuelve a su tamaño normal guardado.

### 1.43.2
- **La causa real de la apertura lenta:** Comptus preparaba las versiones ligeras de las imágenes de **todos** los juegos antes de dibujar la primera pantalla (miles de consultas al disco), y por eso la pantalla de inicio duraba varios segundos aunque la biblioteca ya estuviera guardada. Ahora primero prepara solo lo que se ve al abrir (las primeras ~70 tarjetas), muestra el lanzador, y prepara el resto en segundo plano; las tarjetas de más abajo se dibujan cuando están listas.
- **La pantalla de inicio sale antes:** se abre lo primero al arrancar (antes esperaba a preparar copias y ajustes), así no hay un par de segundos sin nada en pantalla.

### 1.43.3
- **Adiós al «Comptus» pegado y a la fase negra:** el lanzador ya no crece desde la pantalla de inicio con el contenido oculto (eso dejaba un rectángulo negro con el nombre unos segundos). Ahora aparece directamente a su tamaño final con un fundido suave sobre la pantalla de inicio, que se cierra al terminar. Si estaba maximizado, se abre maximizado.

### 1.43.4
- **Menos lag al iniciar la pantalla de inicio:** antes, mientras se abría, Comptus hacía a la vez el resto del arranque (copia automática, bandeja, crear y cargar la ventana principal), y eso retrasaba que la pantalla de inicio se viera y la animaba a tirones. Ahora primero se muestra la pantalla de inicio y, en cuanto se ve, arranca todo lo demás.
- **Sin cuadro a medio pintar al aparecer maximizado:** el lanzador espera un instante tras maximizarse antes de empezar el fundido, para que la página ya esté redibujada.

### 1.44.0
- **F5 actualiza la biblioteca:** igual que el botón de actualizar de la barra superior (vuelve a escanear las bibliotecas), sin recargar la ventana. Mientras actualiza, el botón gira.

### 1.45.0
- **Abrir el overlay con el mando:** mientras hay un juego en marcha, pulsa **Select + Start** a la vez (configurable en Configuración > Overlay y capturas: L3 + R3, botón Guía/Home o desactivado) y se abre / cierra el overlay. Como el juego tiene el foco y el lanzador no puede leer el mando, Comptus abre mientras juegas una mini-ventana invisible (sin foco ni clics) que solo escucha el mando; se cierra al terminar el juego.
- **Overlay manejable con el mando:** cruceta o palanca arriba/abajo para elegir, **A** para pulsar y **B** para cerrar.
- En el lanzador, Select + Start juntos ya no abren «Ajustes» / «¿Qué juego hoy?».

### 1.45.1
- **Overlay con el mando, a tu gusto:** en Configuración > Overlay y capturas ahora hay más opciones: Select + Start, **Select + A**, L3 + R3, Guía, **Personalizado** (pulsa «Asignar», mantén a la vez hasta 3 botones del mando y suéltalos) o desactivado.
- **Atajos con una sola tecla:** el atajo de abrir/cerrar overlay, el de captura y el de búsqueda rápida ya aceptan una tecla sola (por ejemplo F9, Insert, Home), sin necesidad de combinación. Evita letras sueltas: dejarían de escribirse mientras juegas.

### 1.45.2
- **Overlay y captura solo dentro de un juego:** los atajos de abrir/cerrar el overlay y de tomar captura solo se activan mientras hay un juego abierto desde Comptus (antes también se disparaban estando en el lanzador). La búsqueda rápida no cambia.
- **«Asignar» botones del mando arreglado:** primero espera a que sueltes el botón con el que pulsaste «Asignar» (por eso solo guardaba la A), luego recoge todos los botones que pulses (hasta 3, no hace falta que sean exactamente a la vez) y termina cuando los sueltas. Mientras asignas, el mando no navega ni cierra nada en el lanzador.

### 1.45.3
- **El overlay ya funciona con cualquier juego (Steam, etc.):** en 1.45.2 se activaba solo si Comptus detectaba el juego en marcha, y con algunos de Steam esa detección falla. Ahora el atajo del overlay, el de captura y el del mando funcionan siempre que el lanzador **no** esté en primer plano (o haya un juego detectado), así que siguen sin dispararse mientras usas el lanzador.

### 1.45.4
- **El overlay y las capturas solo funcionan dentro de un juego:** en 1.45.3 se abrían también en el escritorio o el navegador. Ahora, al pulsar el atajo (o la combinación del mando), Comptus comprueba qué programa tiene la ventana en primer plano: si es un juego de tu biblioteca (aunque lo hayas abierto desde Steam y no desde Comptus), actúa; si no, no hace nada. Desde ese momento le sigue la pista al juego (su nombre sale en el overlay, se puede cerrar y cuenta el tiempo jugado). La comprobación tarda una fracción de segundo la primera vez.
- Limitaciones: no puede dibujar el overlay sobre juegos en **pantalla completa exclusiva**; y un juego ejecutado como administrador no se puede reconocer.

### 1.45.5
- **Los atajos ya no te quitan la tecla fuera del juego:** un atajo global bloquea esa tecla en todo Windows (si tenías la P, no podías escribirla con el lanzador abierto). Ahora el atajo del overlay y el de captura solo se registran **mientras un juego de tu biblioteca tiene la ventana en primer plano**, y se sueltan en cuanto sales (al escritorio, al navegador o al lanzador). Para saberlo, Comptus mantiene un proceso de PowerShell muy ligero que avisa cuando cambia la ventana activa (comprueba cada ~0,6 s).
- Se reconocen los juegos abiertos desde Comptus, Steam o donde sea, siempre que estén en tu biblioteca. El overlay y la combinación del mando usan esa misma comprobación.

### 1.45.6
- **Diagnóstico del overlay:** en Configuración > Overlay y capturas hay un botón «Ver diagnóstico» que muestra si el vigilante de ventana activa funciona, qué programa detecta en primer plano, si lo reconoce como juego de tu biblioteca, si los atajos se registraron y los últimos eventos. Así se puede ver exactamente dónde falla en tu equipo.
- **Modo «cualquier programa»:** casilla opcional para activar los atajos con cualquier programa en primer plano (menos el escritorio y la barra de tareas) si tu juego no se reconoce. Bloquea esas teclas fuera del juego, por eso viene desactivada.
- El vigilante ahora lee las rutas en UTF-8 (carpetas con tildes o eñes).

### 1.45.7
- **Causa encontrada del overlay que no salía:** el diagnóstico mostró que el vigilante de ventana activa fallaba al arrancar («No se encuentra el tipo [W.U]»): estaba mal escrita la definición de la función de Windows que consulta la ventana en primer plano, así que Comptus nunca sabía en qué juego estabas y no activaba los atajos. Corregido (ahora el script se envía codificado, sin problemas de comillas).
- El diagnóstico solo guarda los primeros errores de PowerShell, para no llenarse con lo mismo repetido.

### 1.45.8
- **Juegos protegidos (anti-trampas, administrador):** el diagnóstico mostró una ventana activa «desconocida»: Windows no deja leer la ruta de algunos juegos con el método anterior. Ahora el vigilante usa la consulta de bajos privilegios de Windows (la misma que usa el Administrador de tareas), que sí funciona con ellos.

### 1.45.9
- **«Cerrar el juego» desde el overlay:** daba «No se encontró el proceso del juego» con juegos protegidos (anti-trampas, como The Division 2), porque la lista de procesos no podía leer su ruta. Ahora usa WMI, que sí la da, y si algo falla vuelve al método anterior. Esto también mejora el seguimiento del tiempo jugado de esos juegos.

### 1.45.10
- **«Cerrar el juego» con juegos protegidos (The Division 2…):** cuando el juego tiene la ventana en primer plano, Comptus anota también el proceso de esa ventana, y «Cerrar el juego» lo cierra aunque Windows no deje leer su ruta (anti-trampas). Si el proceso desaparece, se da el juego por terminado.
- Los juegos en **pantalla completa exclusiva** (como Metro Last Light, que no tiene modo sin bordes) no admiten overlay: Windows no deja dibujar nada encima. Alternativas: la captura con el atajo sigue funcionando en muchos casos (la guarda sin overlay), o forzar modo ventana con Alt+Enter si el juego lo permite.

### 1.45.11
- **La X de la ventana ahora cierra Comptus de verdad:** desde que existe el oyente del mando (una mini-ventana invisible), Windows consideraba que Comptus seguía abierto al cerrar la ventana principal: el proceso y el icono de la bandeja quedaban vivos, y al volver a abrirlo aparecía de nuevo la pantalla de inicio. Ahora, al cerrar la ventana principal Comptus se cierra por completo (y quita su icono de la bandeja).
- «Seguir en segundo plano mientras juegas» ahora solo ocurre si el juego está realmente en marcha (antes bastaba con que Comptus «creyera» que había uno).

### 1.46.0
- **La biblioteca se actualiza sola:** al instalar o desinstalar un juego ya no hace falta pulsar actualizar. Comptus vigila las carpetas donde **Steam** (appmanifest) y **Epic** (manifiestos) apuntan lo instalado; cuando cambian, espera 5 segundos a que termine la instalación y actualiza la biblioteca. Para el resto de tiendas (GOG, Ubisoft, EA, Battle.net, Xbox…), que no se pueden vigilar igual, se vuelve a mirar al volver a la ventana de Comptus si pasaron más de 45 s desde la última vez (y no hay un juego en marcha). F5 y el botón de actualizar siguen funcionando.

### 1.46.1
- **Ventana de actualización dentro de Comptus:** cuando hay una versión nueva (publicada en GitHub), Comptus lo avisa con una ventana: muestra la versión nueva, las notas de la release, y botones **Actualizar ahora** (descarga con barra de progreso y luego «Reiniciar e instalar»), **Más tarde** y **Omitir esta versión** (no vuelve a avisar de esa). Ya no hace falta ir a Configuración. Comprueba al abrir y cada 6 horas; en Configuración > Sistema sigue estando el botón de buscar a mano.
- Para que se muestren las notas, escribe las novedades en el cuerpo de la release de GitHub.

### 1.46.2
- Versión de prueba del sistema de actualizaciones: no cambia nada visible; sirve para comprobar que Comptus 1.46.1 detecta y descarga una versión nueva desde GitHub.

### 1.46.3
- **«Reiniciar e instalar» más fiable:** a veces la primera vez Comptus se cerraba pero el instalador no llegaba a abrirse. Ahora, antes de instalar, Comptus cierra todo lo que podía mantenerlo vivo (ventanas ocultas del overlay y del mando, el vigilante de ventana activa, el icono de la bandeja y los atajos), y si a los 6 segundos sigue sin cerrarse vuelve a pedir la instalación.

### 1.46.4
- **Registro del actualizador:** Comptus guarda en `updater.log` (carpeta de datos: `%APPDATA%\mi-lanzador-de-juegos\`) lo que pasa al buscar, descargar e instalar una actualización, para poder ver por qué falla si el instalador no se abre.

### 1.46.5
- **«Reiniciar e instalar» abre el instalador descargado directamente:** en el video se veía una ventana azul que aparecía y desaparecía sin llegar a abrirse el instalador (el método interno del actualizador lo lanzaba con un ayudante de permisos que fallaba en tu equipo). Ahora Comptus abre el instalador ya descargado como lo haría el Explorador (Windows pide permisos con su ventana normal) y se cierra 1,5 s después. Si no encuentra el archivo, usa el método anterior.

### 1.46.6
- **Causa encontrada de que el instalador no se abriera:** gracias al registro (`updater.log`) se vio que, al pulsar «Reiniciar e instalar», el actualizador lanzaba por su cuenta una instalación **silenciosa** (`/S`, sin ventana ni relanzar) con un ayudante de permisos, y la instalación normal quedaba ignorada. Ahora, al instalar desde la ventana, esa instalación automática silenciosa se desactiva y se abre únicamente el instalador normal.

### 1.46.7
- **Instalador una sola vez:** «Reiniciar e instalar» ahora se bloquea tras la primera pulsación y el actualizador ignora pulsaciones repetidas, para que no se abra un segundo instalador.

### 1.47.0
- **Overlay con el mando que sí funciona dentro del juego:** la API de mandos del navegador solo da datos a la ventana que tiene el foco, así que con el juego en primer plano no se enteraba de que pulsabas Select + A. Ahora Comptus lee el mando directamente con **XInput** (mandos de Xbox y compatibles) mediante un PowerShell ligero (mira cada 40 ms). Funciona con cualquier combinación elegida (Select + Start, Select + A, L3 + R3, Guía o personalizada) y solo actúa si hay un juego de tu biblioteca en primer plano.
- El **diagnóstico** (Configuración > Overlay y capturas) ahora muestra si el lector del mando está en marcha, cuántos mandos XInput detecta y cada vez que se pulsa la combinación.
- Limitación: mandos que no son XInput (PlayStation directo, Switch…) necesitan Steam Input o DS4Windows para verse como mando de Xbox; con el juego en primer plano, sin eso, no hay forma de leerlos.

### 1.47.1
- **Lector del mando corregido:** en el diagnóstico se veía «el lector XInput terminó» nada más arrancar: la propia preparación de la ventana de escucha del mando lo cerraba por error. Ahora el lector XInput se queda en marcha.

### 1.47.2
- **Al cerrar el juego, el lanzador vuelve con el foco:** ya no hace falta hacer clic en Comptus para volver a usar el mando; al terminar el juego el lanzador pasa al frente y se queda activo.
- **El overlay abierto con el mando ya no se pierde al mover el ratón:** antes, si el juego recuperaba el foco (por ejemplo al mover el ratón), el overlay dejaba de responder al mando. Ahora, mientras el overlay está abierto, Comptus lee el mando por su cuenta (cruceta o palanca arriba/abajo, **A** y **B**) aunque el overlay no tenga el foco, y un overlay abierto con el mando se mantiene hasta cerrarlo con **B**, con «Cerrar overlay» o con la misma combinación.
- Limitación: Comptus no puede impedir que el juego siga recibiendo los movimientos del mando mientras el overlay está abierto (Windows se los da a ambos).


## 1.48.0 — Vídeos como fondo de la biblioteca

- En **Configuración > Fondo**, el botón ahora es **«Elegir imagen o vídeo…»**. Acepta imágenes (PNG, JPG, WEBP, GIF) y vídeos **MP4 (H.264), WebM, M4V, MOV y OGV**.
- El vídeo se reproduce en bucle, sin sonido y ajustado a la ventana (como «cover»). Siguen funcionando los controles de **oscurecer** y **desenfoque**.
- Se **pausa solo** cuando Comptus está oculto/minimizado y mientras hay un juego en marcha, y se reanuda al volver.
- Los **temas guardados** con un vídeo de fondo lo conservan.
- Recomendado: 1080p y 30 fps. MKV, AVI y HEVC (H.265) no están garantizados porque dependen del motor de Chromium.


## 1.49.0 — Los colores se adaptan al fondo

- Al elegir un fondo nuevo (imagen o vídeo), los colores del tema (fondo, paneles, texto y los dos acentos) se calculan a partir de él. Así solo tienes que ponerle nombre y guardarlo en «Mis temas».
- Opción en Configuración > Fondo: «Al elegir un fondo nuevo, adaptar los colores…» (activada por defecto) y botón **«Adaptar colores»** para hacerlo a mano con el fondo actual.
- Con un vídeo se usa un fotograma: la pantalla se queda un instante sin contenido mientras se captura.
- Si el fondo casi no tiene color (blanco y negro) se mantienen los acentos que tenías y solo se tiñen fondo y paneles.


## 1.49.1 — Temas con vídeo de fondo más claros

- En «Mis temas», un tema guardado con vídeo de fondo muestra un fotograma del vídeo y una marca ▶ en su muestra.
- Al guardar, el aviso dice «(con su fondo de vídeo)» y la casilla «Incluir el fondo actual» ahora menciona el vídeo.


## 1.49.2 — El vídeo de fondo ya se conserva al reiniciar

- Al abrir Comptus, la comprobación de que el fondo sigue existiendo lo trataba como una imagen, fallaba con los vídeos y los quitaba en silencio. Ahora los vídeos se comprueban como vídeo y el fondo vuelve solo al abrir.


## 1.50.3 — Se quita el progreso de descargas

- Se elimina el recuadro y las barras de progreso de las descargas de Steam: dependían de lo que cada launcher escribe en disco (Steam actualiza el avance con retraso y Epic/Ubisoft no lo publican), así que no era fiable. Instalar y desinstalar sigue abriendo la tienda como antes.


## 1.51.0 — Exportar e importar temas

- En Configuración > Apariencia > «Mis temas»: **Exportar mis temas…** guarda cada tema en su carpeta (`tema.json` + su fondo, sea imagen o vídeo) y **Importar tema…** carga uno o varios `tema.json`, copiando el fondo a la carpeta de Comptus.
- Sirve de copia de seguridad, para pasar tus temas a otro PC o para compartirlos (envía la carpeta entera).
- Si importas un tema con el mismo nombre que uno tuyo, lo reemplaza. Los archivos no válidos se descartan y los colores y valores se comprueban antes de usarse.


## 1.51.1 — Carpeta «My Themes»

- Comptus Media tiene una subcarpeta nueva, **My Themes**. Al exportar o importar temas, el selector se abre ahí por defecto (puedes elegir cualquier otra carpeta como antes). La carpeta se crea sola; en instalaciones ya existentes aparece la primera vez que exportas o importas.


## 1.52.0 — Fondo en la página de cada juego

- En la página de un juego, el banner del juego se ve también como fondo de toda la página (muy oscurecido y fijo mientras te desplazas), junto con los colores propios que ya tenía cada juego.
- Se activa o desactiva en Configuración > Fondo: «En la página de cada juego, usar su banner como fondo». Si el juego no tiene banner, la página queda como antes.


## 1.52.1 — Fondo de la página del juego: desenfocado y sin saltos

- El banner de fondo ahora va **desenfocado** y quieto detrás del contenido: no importa que el banner sea pequeño (ya no se nota la baja resolución) y no se desalinea con el banner de la cabecera, que era lo que hacía que la imagen «se corriera».
- Aparece con un fundido suave en lugar de de golpe.


## 1.52.2 — Fondo de la página del juego: menos desenfoque y sin hueco a la derecha

- El desenfoque baja de 26 px a 12 px.
- Se quita el hueco que quedaba a la derecha de la página: el fondo ampliado hacía la página más ancha de lo que cabía y se podía desplazar unos píxeles de lado. Ahora la página no se mueve en horizontal.


## 1.53.0 — Transparencia de los recuadros

- Nuevo control en Configuración > Fondo: **Transparencia de los recuadros** (de «opacos» hasta 70 %). Afecta a los recuadros de la página del juego (seguimiento, detalles, logros, capturas…), la barra de Jugar, y los de estadísticas, amigos y eventos.
- Con transparencia, lo que queda detrás se desenfoca un poco (8 px) para que el texto siga leyéndose bien.
- Por defecto está en «opacos», como antes.


## 1.54.0 — Fondo propio para cada colección

- Clic derecho sobre una colección (en la barra lateral o en su tarjeta) > **«Fondo propio para esta colección…»**: elige una imagen o un vídeo. Al abrir esa colección se ve ese fondo; el resto de la biblioteca sigue con el general.
- También hay **«Quitar el fondo de esta colección»** y **«Cambiar el fondo…»**. Los controles de oscurecido y desenfoque de Configuración > Fondo se aplican también a estos fondos.
- Los vídeos se pausan al abrir la página de un juego (ahí no se ven) y, como siempre, con la ventana oculta o un juego en marcha.
- El archivo se copia a la carpeta `Themes Wallpaper` de Comptus Media.


## 1.54.1 — Fondo automático para las colecciones

- Nueva casilla en Configuración > Fondo: **«Las colecciones sin fondo propio usan el banner de su juego más jugado»**. Es automático, no hay que descargar nada: usa los banners que Comptus ya tiene (los de Steam vienen de su CDN oficial) y se desenfocan un poco.
- Un fondo propio de la colección (imagen o vídeo) siempre manda sobre el automático. Si la colección no tiene juegos con banner, se usa el fondo general.
- No se usa SteamDB: no ofrece una API pública y bloquea las consultas automáticas.


## 1.54.2 — Diagnóstico del fondo de colecciones

- Botón **«Diagnóstico del fondo»** en Configuración > Fondo: copia al portapapeles lo que Comptus ve de la colección abierta (filtro, fondo propio guardado, banner automático elegido, qué fondo se aplicaría y el estado de la capa de fondo), para localizar por qué un fondo de colección no se aplica en un equipo concreto.


## 1.54.3 — El banner automático de las colecciones encaja mejor

- El banner automático (juego más jugado) ya no se recorta ni se amplía para cubrir toda la pantalla: se muestra **a todo el ancho y con su forma natural** en la parte de arriba, y se funde con el fondo hacia abajo. Se ve más nítido y se reconoce la ilustración.
- Los fondos que eliges tú (imagen o vídeo) siguen cubriendo toda la pantalla.


## 1.54.4 — Botón «Fondo» en la cabecera de la colección

- La cabecera de cada colección tiene ahora un botón **Fondo** (junto a Editar y Portada) para elegir su fondo, imagen o vídeo, o quitarlo. El botón **Portada** sigue siendo solo para imágenes: es la portada de la tarjeta, no el fondo.


## 1.54.5 — Si se borra el archivo de un fondo

- Si borras o mueves el archivo de un fondo (de una colección o el general), Comptus ya no deja la pantalla vacía y oscurecida: avisa («No se pudo cargar el fondo de “X”…») y usa el siguiente fondo disponible (el general). El ajuste no se borra solo: con el botón **Fondo** de la colección puedes cambiarlo o quitarlo, y si devuelves el archivo a su sitio se vuelve a ver al reiniciar.
- Antes, con un vídeo ausente salía un aviso de «no se pudo reproducir» y el fondo se quedaba en blanco.


## 1.54.6 — Logo de Comptus a todo el ancho de la barra lateral

- El logo (icono + «Comptus») ocupa ahora todo el ancho de su zona en la barra lateral y se escala con ella: si arrastras para ensanchar o estrechar la barra, el logo crece o se reduce.


## 1.55.0 — Ahorro de recursos con los vídeos de fondo

Nueva sección «Vídeo de fondo: ahorro de recursos» en Configuración > Fondo:
- **Pausar el vídeo cuando Comptus no es la ventana activa** (activada): al pasar a otro programa el vídeo se detiene y retoma al volver.
- **Pausar el vídeo cuando el equipo funciona con batería** (activada): se reanuda al conectar el cargador. Solo si el sistema informa del estado de la batería.
- **No desenfocar el vídeo** (desactivada): el desenfoque sobre un vídeo es lo que más gráfica gasta; con esto se mantiene el oscurecido pero se quita el desenfoque.
- Además, como antes, el vídeo se pausa con la ventana oculta, con un juego en marcha y en la página de un juego.


## 1.56.0 — Overlay con más información y control del volumen

- El overlay muestra ahora, arriba: **hora**, **tiempo de esta sesión** (cronómetro en vivo), **tiempo total jugado** al juego y **batería** (solo si el equipo la tiene).
- Tres botones nuevos: **Volumen −**, **Silenciar** y **Volumen +**. Usan las teclas multimedia de Windows (cada pulsación sube o baja ~10 %), así que funcionan igual que las del teclado y también se manejan con el mando (arriba/abajo y A).
- La ventana del overlay es un poco más alta para que quepa todo.

## 1.57.0 — Mezclador de volumen en el overlay
- El overlay ahora tiene **barras de volumen** como el mezclador de Windows: «Volumen general» y las apps que suenan (el juego primero, hasta 3).
- Se arrastran con el ratón; cada fila tiene su botón de silencio.
- Con mando: arriba/abajo elige la fila, **izquierda/derecha** ajusta ±5 %, **A** silencia.
- Si el mezclador no puede iniciarse, se muestran los botones de volumen anteriores y el motivo.
- El overlay es algo más alto para dar cabida a las barras.

## 1.57.1 — Corrección de las barras de volumen
- Las barras enviaban el volumen como fracción (0–1) y el mezclador esperaba porcentaje (0–100), así que cualquier valor quedaba casi en 0 %. Ahora se envía el porcentaje correcto.

## 1.57.2 — Overlay sin cortes
- La ventana del overlay ahora ajusta su altura al contenido (y se centra), así que ya no se corta por abajo.
- El mezclador oculta «Sonidos del sistema» y las apps repetidas, y ya no marca esa fila como si fuera el juego.

## 1.57.3 — El mezclador vuelve a listar las apps
- Corregida la detección de «Sonidos del sistema» (la llamada devolvía siempre el mismo valor y todas las apps se tomaban por sonidos del sistema, que se ocultan). Ahora salen el juego y las demás apps con sonido.

## 1.58.0 — Tema automático
- Nuevo en Configuración → Apariencia → «Tema automático»: Comptus cambia solo de tema.
  - **Según la hora**: eliges un tema de día, uno de noche y a qué hora empieza cada uno (por defecto 07:00 y 19:00).
  - **Según Windows**: usa el tema de día con el modo claro de Windows y el de noche con el modo oscuro; cambia al instante cuando cambias el modo de Windows.
- Sirve cualquier tema: los incluidos, los de ilustración y los tuyos (con su fondo si lo guardaste).
- Si eliges otro tema a mano, se respeta hasta el siguiente cambio de periodo.

## 1.59.0 — Copias de las partidas guardadas
- Cada juego tiene ahora un panel **«Partidas guardadas»** en su ficha: muestra dónde guarda su progreso, hace una copia con «Copiar ahora» y lista las copias con **Restaurar** (pide confirmar y antes copia la partida actual por si te arrepientes) y borrar.
- **Copia automática al cerrar el juego** (se puede desactivar) en Configuración → Sistema → «Partidas guardadas». No repite copias si nada cambió y conserva las últimas N por juego (5 por defecto, ajustable).
- Las rutas de guardado vienen de la base de datos comunitaria **Ludusavi** (más de 12 000 juegos). Se descarga sola unos minutos después de abrir Comptus y cada dos semanas se actualiza (botón «Actualizar la base de guardados»). Requiere `npm install` (nueva dependencia `yaml`).
- Las copias van a `Comptus Media\Partidas guardadas\<juego>\<fecha>`. Si cambias de sitio «Comptus Media» (p. ej. a OneDrive), allí viajan tus guardados.
- Límites: solo archivos (no claves del registro de Windows), solo juegos que estén en la base de datos, y la copia automática omite guardados de más de 100 MB. Es una copia local: no toca la nube de Steam, Epic ni otras tiendas.

## 1.59.1 — Guardados de juegos locales (y de los que no están en la base)
- En el panel «Partidas guardadas» ahora puedes **añadir tú la carpeta o el archivo** donde un juego guarda su progreso («Añadir carpeta» / «Añadir archivo»). Sirve para los juegos locales y para los que no están en la base de Ludusavi. Se pueden añadir varias rutas y quitarlas con la ✕.
- Esas rutas se copian igual que las de la base: copia manual, copia automática al cerrar el juego y restaurar.
- Arreglo: si hacías dos copias (o una copia y una restauración) en el mismo segundo, la copia nueva podía pisar a la anterior; ahora cada copia tiene su propio nombre.
- Los juegos locales cuyo nombre coincide con uno de la base (por nombre del juego o de su carpeta) se reconocen solos.

## 1.59.2 — «Buscar guardados» para juegos de la comunidad
- Nuevo botón **«Buscar guardados»** en el panel de partidas guardadas: busca dentro de la carpeta del juego (carpetas `saves`, `savedata`, `profiles`… y archivos `.sav`, `.save`, `.dat`…) y en Documentos, My Games, Saved Games y AppData carpetas cuyo nombre se parezca al del juego, su .exe o su carpeta.
- Muestra los candidatos (lo más reciente primero, con tamaño y fecha) y tú eliges cuáles añadir; nunca se añade nada solo. Sirve para juegos locales y de la comunidad que no están en la base de Ludusavi.
- Es una heurística: puede proponer carpetas que no son partidas o no encontrar nada; en ese caso queda «Añadir carpeta».

## 1.59.3 — Detección de guardados al jugar y base más fiable
- **Detección al cerrar el juego:** si un juego no tiene guardados conocidos (recompilaciones, mods, juegos de la comunidad…), al cerrarlo —tras jugar al menos un minuto— Comptus mira qué archivos cambiaron durante la sesión en Documentos, Saved Games, AppData y la carpeta del juego, y lo guarda como sugerencia. Sale un aviso y las sugerencias aparecen primero en «Buscar guardados», marcadas «cambió mientras jugabas». No depende del nombre del juego ni de ninguna base de datos. Para que acierte: juega, **guarda la partida dentro del juego** y ciérralo.
- **Base de guardados:** la conversión ahora se hace en un hilo interno (con el proceso aparte como respaldo) y, si falla, el panel muestra el motivo del último intento fallido.

## 1.60.0 — Modo consola
- Nueva vista a pantalla completa pensada para televisor y mando, estilo «Big Picture». Se abre con el botón de monitor de la barra superior, la tecla **F10** o el botón **Guía** del mando (Windows puede reservar Guía para la barra de juegos de Xbox; si no responde, usa F10 o el botón).
- Muestra filas de portadas grandes: **Continuar jugando**, **Favoritos**, tus **colecciones** y una fila por **biblioteca** (solo juegos instalados y no ocultos). Al enfocar un juego, su banner se pone de fondo con su título (o logotipo), tiempo jugado, última sesión y el botón **Jugar**.
- Con mando: cruceta o palanca para moverte, **A** juega, **X** favorito, **Y** menú del juego (el mismo del clic derecho), **LB/RB** salta de fila, **B** o Start salen. Con teclado: flechas, Enter, F y Esc. El ratón también funciona y el cursor se oculta solo.
- Al abrir un juego, Comptus sigue en modo consola: cuando cierras el juego vuelves a la misma fila. El juego en marcha se marca «En ejecución».
- Al salir, la ventana vuelve a su tamaño anterior. En Configuración → Sistema → «Modo consola» puedes hacer que Comptus **arranque directamente en modo consola**.
- Reloj y batería arriba; ayuda de botones abajo (mando o teclado según lo que uses).

## 1.61.0 — Modo consola rediseñado
- **Secciones arriba**: Recientes, Favoritos, Más jugados, Biblioteca, Colecciones y Tiendas (las vacías se ocultan). Se cambian con **LB/RB** y siempre hay una sola fila horizontal, sin bajar.
- **Tema propio**: el modo consola ya no usa los colores del launcher; tiene su propia capa (Medianoche, Esmeralda, Atardecer, Neón, Carbón, Hielo), fondo con banner o liso, oscurecido, tamaños de portada y letra.
- **Menú de ajustes para mando**: pestaña «Ajustes» (o **Start**): filas que se cambian con izquierda/derecha.
- **Ficha por juego**: **A** abre una página con logros, horas, estado, descripción, datos y capturas; botones Jugar, Favorito, Más opciones y Volver.
- **Arreglos visuales**: ya no aparece el banner abajo ni hay saltos verticales (el desplazamiento es manual y el contenedor no se mueve).
- Controles: A abrir, X jugar, Y menú, Select favorito, LT/RT saltar de 8 en 8, B atrás, Guía entra/sale.

## 1.62.0 — Modo consola: más personalización
- El modo consola ya no se mezcla con el launcher: se oculta su barra de ayudas del mando y las ventanas emergentes quedan por encima. Se sigue entrando desde Comptus (botón de monitor, F10 o Guía).
- Portadas más pequeñas (nuevo tamaño «Muy pequeñas») y borde de selección más fino.
- Nuevos ajustes: **Distribución** (fila horizontal o cuadrícula vertical; en cuadrícula arriba/abajo cambian de fila y LT/RT saltan 3 filas), **Desenfocar el fondo**, **Borde de selección**, **Esquinas de las portadas** y **Mostrar título e información**.
- **Biblioteca** muestra todos los juegos (también los no instalados, atenuados con la etiqueta «No instalado»), sin aplicar el filtro del launcher.
- Pequeña transición al abrir la ficha de un juego o una colección.

## 1.63.0 — Modo consola: banner, distribución y sonidos
- **Banner lateral**: la imagen del juego ocupa la parte derecha y se funde con un degradado del tema del modo consola (opción «Pantalla completa» disponible).
- **Más control de la distribución**: separación entre portadas (pegadas/normal/separadas), altura de la fila horizontal (alta/media/baja; por defecto un poco más abajo) y tamaño de portadas hasta «Muy grandes».
- **Cuadrícula vertical**: corregido el «brinco» al cambiar de juego (la cabecera tenía altura variable) y ahora la cuadrícula ocupa todo el ancho.
- **Pestaña «Instalados»** nueva; las demás secciones muestran como máximo 10 juegos no instalados. Biblioteca los muestra todos.
- **Sonidos** sintetizados (mover, abrir, volver, sección, menú, jugar, entrar/salir); se pueden desactivar y cambiar de volumen en Ajustes.

## 1.64.0 — Modo consola: ajustes con vista previa y colecciones
- **Ajustes por categorías**: menú lateral (Apariencia, Distribución, Texto y pantalla, Sonido, General). Con arriba/abajo eliges categoría, con derecha o A entras y con B vuelves. Los cambios se ven **en vivo** a la derecha (la biblioteca queda visible mientras ajustas).
- **Secciones centradas** y reordenadas: Biblioteca, Instalados, Recientes, Favoritos, Más jugados, Colecciones y Ajustes. Se quitó Tiendas.
- **Banner** de la fila horizontal limitado a la zona superior (no ocupa toda la pantalla) y con las portadas pequeñas para las miniaturas.
- **Logo cortado** en la cabecera de la cuadrícula: corregido.
- **Logo de la tienda** (Steam, Epic, Xbox…) en una esquina de cada portada.
- **Colecciones** se ven por defecto en cuadrícula vertical, con tarjetas con collage como en el launcher.

## 1.65.0 — Modo consola: pantalla vertical, ajustes y portadas
- **Portadas sin parpadeo**: al refrescarse la biblioteca ya no se repintan las portadas (se veía el color de relleno oscuro hasta recargar la imagen) ni se reinicia el fondo si nada cambió.
- **Pantalla vertical automática**: si la pantalla es más alta que ancha, el modo consola usa cuadrícula, portadas y letra más grandes, cabecera en dos filas y ajustes en panel superior. La distribución tiene ahora «Automática» (por defecto), «Fila horizontal» y «Cuadrícula vertical».
- **Ajustes guardados**: además del archivo de Comptus se guarda una copia local y se comprueba que el guardado funcionó; si falla, avisa con un mensaje.
- **Colecciones** usan la misma portada que en el launcher (o el collage si no tiene).

## 1.66.0 — Modo consola: banner, colecciones animadas y guardado manual
- **Banner sin salto de brillo**: la animación al cambiar de juego terminaba en opacidad 1 y luego volvía a la oscurecida (por eso parecía que «se oscurecía después de un rato»). Ahora la animación termina en el mismo nivel que se queda.
- **Colecciones**: usan la portada original del launcher (webp/gif animados incluidos) en lugar de la miniatura.
- **Ajustes → General**: «Guardar ajustes ahora» (guarda y comprueba) y «Ajustes cargados desde» (archivo de Comptus, copia local o valores por defecto) para diagnosticar si se pierden.

## 1.67.0 — Modo consola: ajustes que ya se conservan y colecciones más ligeras
- **Ajustes perdidos al reiniciar — causa encontrada**: al arrancar, la biblioteca podía terminar de cargar los ajustes *antes* de que cargara el archivo del modo consola, así que se ignoraban y se usaban los valores por defecto. Ahora el modo consola recoge los ajustes cuando carga, ocurra en el orden que ocurra (también «Abrir Comptus en modo consola»). Se reprodujo con una carga artificialmente lenta y queda corregido.
- **Colecciones**: las portadas animadas (webp/gif) solo se animan en la colección enfocada; las demás muestran la imagen fija, para que no lagueen.

## 1.68.0 — Modo consola: menús propios y cursor
- **Opciones del juego** con el estilo del modo consola (Y, o «Más opciones» en la ficha): ficha, jugar, favoritos, ocultar, añadir a colección… Se movieron fuera las acciones de escritorio (cambiar imágenes, desinstalar…), que siguen en el launcher.
- **Menú del modo consola**: **Select + X** (teclado: F2). Ajustes, activar/desactivar sonidos, actualizar la biblioteca, guardar ajustes y cerrar el modo consola.
- **B** ya no cierra el modo consola en las pantallas principales (sigue volviendo atrás dentro de fichas, colecciones y ajustes).
- **Cursor**: al detectar el mando se oculta y el ratón quieto deja de mover la selección; al mover el ratón vuelve a funcionar.
- Select ya no marca favorito (estorbaba al usarlo como modificador); favorito está en el menú de opciones y en la ficha.

## 1.69.0 — Modo consola: al salir de Ajustes vuelves donde estabas
- Al abrir Ajustes se recuerda la sección, la colección/tienda abierta y el juego enfocado; al salir (B) vuelves exactamente ahí en vez de a Biblioteca. La vista previa de Ajustes también conserva el juego que tenías seleccionado.

## 1.70.0 — Botón a la derecha y pantalla de inicio del modo consola
- El botón de monitor queda en el **extremo derecho** de la barra superior del launcher.
- Al entrar al modo consola aparece una **pantalla de inicio** («Comptus · Iniciando el modo consola…») con los colores del tema del modo consola. Cubre el cambio a pantalla completa y se desvanece al estar listo (mínimo ~1 s).

## 1.71.0 — Logros, completados al 100 % y «al iniciar un juego» en el modo consola

- **Pestaña «Logros»** en la barra superior (entre «Más jugados» y «Colecciones»; solo aparece si hay juegos con logros). Lista los juegos ordenados por progreso, con contador (`10/12`) y barra dorada en cada portada.
- **Ficha del juego:** nueva sección «Logros · X de Y (%)» con barra de progreso y la lista (icono, nombre, descripción, % de jugadores, 💎 si es raro, fecha de desbloqueo). Botón «🏆 Logros» para saltar a ella; se puede leer con ↑↓. Si la lista no estaba cargada se pide al abrir la ficha.
- **Completados al 100 %:** aro dorado y trofeo en la portada en todas las pestañas, y «🏆 Completado al 100 %» en la información del juego.
- **Ajustes → General → «Al iniciar un juego»:** *Mantener el modo consola* (por defecto) o *Minimizar el modo consola*. Al minimizar, Comptus se oculta cuando el juego ya está en marcha y vuelve a primer plano al cerrarlo.

## 1.71.1 — Logros en lista con el detalle al lado

La pestaña **Logros** del modo consola ahora es una lista de juegos a la izquierda (miniatura, nombre, `10/12 · 83 %`; dorado si está al 100 %) y, a la derecha, los logros del juego seleccionado (progreso, icono, descripción, rareza, fecha). **↑↓** cambia de juego, **→** pasa el foco a los logros para desplazarlos con ↑↓, **←** o **B** vuelve a la lista, **Enter** abre la ficha.

## 1.72.0 — Tráilers y capturas en la ficha del modo consola

La ficha de cada juego tiene los botones **🎬 Tráiler** y **🖼 Capturas** (solo aparecen si el juego tiene esa información; incluye tu tráiler propio si es un archivo) y una tira de miniaturas «Tráiler y capturas» al final. Se abren en un visor a pantalla completa: **← →** cambia de tráiler/captura, **A / Enter** pausa o reanuda el vídeo, **B / Esc** cierra. Los tráilers vienen de la información que ya descargó el lanzador (Steam); si un juego no la tiene, descárgala antes desde el lanzador con ℹ️.

## 1.72.1 — Tráiler y capturas en la zona derecha de la ficha

El tráiler y las capturas ya no abren un visor aparte: se ven en un **panel a la derecha de la ficha** (reproductor/imagen grande + tira de miniaturas). Los botones **🎬 Tráiler** y **🖼 Capturas** pasan el foco al panel: **← →** cambia de tráiler/captura, **A** pausa el vídeo o amplía la captura a pantalla completa, **B** devuelve el foco a los botones.

## 1.72.2 — Ajustes del modo consola en pantalla vertical

- **Ficha:** en vertical el panel de tráiler y capturas va **dentro de la columna, bajo los botones** (ya no queda a un lado cortado), con el reproductor 16:9 más contenido. En horizontal sigue a la derecha.
- **Logo del juego** arriba de la ficha: recupera su tamaño (antes heredaba el alto de las cuadrículas y se veía diminuto).
- **Proporciones:** letra base de la pantalla vertical más pequeña, portadas más pequeñas (5 por fila en tamaño mediano), más aire entre filas, pestañas y pistas ajustadas para no pisar las portadas.

## 1.72.3 — Borde inferior de la lista en vertical

Se quitó el hueco vacío entre la última fila de portadas y las pistas de abajo (y el corte en seco de las portadas): ahora la lista llega hasta las pistas y su borde inferior se desvanece suavemente.

## 1.72.4 — Logros seleccionables uno a uno

En la pestaña **Logros**, al pasar el foco a la lista de la derecha (**→**), ↑↓ ya no desplaza a saltos: **selecciona los logros de uno en uno** (borde resaltado) y la lista se centra sola en el elegido. **←** o **B** vuelve a la lista de juegos.

Además (1.72.4): el menú del modo consola (**Select + X** / F2) tiene la opción **«Salir de Comptus por completo»**, que guarda los ajustes y cierra Comptus del todo (no solo el modo consola, que sigue siendo «Cerrar el modo consola»). Un juego en marcha no se cierra.

## 1.72.5 — Logros seleccionables también en la ficha

En la ficha de cada juego, el botón **🏆 Logros** entra a la lista de logros: **↑↓** los selecciona uno por uno (borde resaltado, se centra solo) y **B / Esc** (o ←) vuelve a los botones.

## 1.73.0 — Todos los temas del lanzador en el modo consola

Ajustes → Apariencia → **Tema de colores** ahora incluye, además de los 6 de siempre, los **12 temas con ilustración**, los **16 temas con imagen** del lanzador y **«Mis temas»** (los que creaste o importaste; aparecen en cuanto existen). El **Fondo** ya no cambia solo al elegir un tema: tú decides entre «Banner del juego», «Ilustración del tema» (si el tema no tiene ilustración se usa el banner del juego) y «Color liso». Si un nombre se repite se marca «(ilustrado)» o «(mío)».

## 1.73.1 — Degradado de los banners más suave

Se redujo la intensidad del degradado que cubre el banner del juego (el desvanecido lateral e inferior en «Lateral con degradado» y el oscurecido de «Pantalla completa»): el banner se ve más y se funde con el fondo más abajo y más a la izquierda. Sigues controlando el oscurecido general con «Oscurecer el fondo».

## 1.73.2 — Menos velo a la izquierda del banner

La zona izquierda del banner (detrás del título y la información, en «Lateral con degradado») ya no se funde tan fuerte con el color del tema: el banner es más ancho, empieza más a la izquierda y su velo lateral es mucho más ligero. El título sigue legible gracias a un oscurecido suave.

## 1.73.3 — «Vista de la lista» en el menú del modo consola

El menú de **Select + X / F2** tiene la opción **«Vista de la lista»**, que alterna al instante entre **Horizontal (fila)** y **Vertical (cuadrícula)** sin entrar a Ajustes. Es lo mismo que Ajustes → Distribución (que sigue ofreciendo también «Automática») y se guarda igual.

## 1.74.0 — Iconos del mando, secciones laterales y reloj al extremo

- **Iconos de botones según el mando**: Comptus detecta si el mando es Xbox, PlayStation, Nintendo o genérico y muestra los botones con su forma y colores (Xbox: A verde, B rojo, X azul, Y amarillo; PlayStation: ✕ ○ □ △ de colores; Nintendo: B A Y X; hombros L1/R1, L/R, etc.). Se aplica en las ayudas del modo consola y en la barra de ayudas del launcher. En **Ajustes > General > «Iconos del mando»** puedes dejarlo en Automático o elegir Xbox / PlayStation / Nintendo / Genérico a mano.
- **Posición de las secciones**: en **Ajustes > Distribución > «Posición de las secciones»** elige Arriba (texto), Izquierda (iconos) o Derecha (iconos). En los laterales aparece una barra vertical con un icono por sección (con LB/RB arriba y abajo).
- **Reloj y batería** más pegados al borde derecho de la pantalla.

## 1.74.1 — Iconos originales de los botones

Los botones de Xbox, PlayStation y Nintendo usan ahora las imágenes originales (carpeta `renderer/padicons/`, recortadas de las hojas de iconos): A/B/X/Y de colores, ✕ ○ □ △ de PlayStation, L1/R1/L2/R2, Create/Options, L/R/ZL/ZR, +/−, LB/RB/LT/RT, Menú y Ver. El tipo «Genérico» sigue con fichas dibujadas. Los iconos de Nintendo venían en baja resolución, así que se ven algo más suaves.

## 1.74.2 — Iconos de Xbox nítidos

Los botones de Xbox usan la nueva hoja en alta resolución: A/B/X/Y de colores sobre fondo negro y LB/RB/LT/RT, Menú y Ver en blanco.

## 1.74.3 — Botones proporcionados

Los iconos de los botones tienen ahora tamaños relativos entre sí (los blancos de hombros, Menú y Ver ya no se ven más grandes que A/B/X/Y).

## 1.74.4 — Página del juego más proporcionada y logos estándar

En el modo consola, la página de cada juego tiene textos y botones más pequeños (horizontal y vertical). Los logos de los juegos (en la lista horizontal, la cuadrícula conserva el suyo, y en la página del juego) se ajustan a una caja de tamaño estándar, así ninguno se ve mucho mayor que otro.

## 1.74.5 — Logos más grandes en horizontal

Los logos de los juegos en el modo consola horizontal (lista y página del juego) usan una caja estándar más grande. En vertical no cambia.

## 1.74.6 — Logos un poco más grandes

Logos del modo consola horizontal un paso más grandes (lista y página del juego).

## 1.75.0 — Colores según el juego (modo consola)

Nueva opción en **Ajustes del modo consola > Apariencia > «Colores según el juego»** (apagada por defecto). Al activarla, los acentos y un ligero tinte del fondo y los paneles se adaptan a los colores de la portada y el banner del juego enfocado, igual que la página del juego en el launcher. Respeta el color propio que hayas elegido para un juego y los juegos con «color del tema».

## 1.75.1 — «Colores según el juego» funciona con imágenes oscuras

Muchas portadas y banners son oscuros o apagados y se descartaban, así que el modo consola se quedaba en el color del tema (morado). Ahora, si no hay colores vivos, se prueba con los apagados; el tinte del fondo y los paneles sale del color dominante (antes del promedio, casi siempre gris oscuro) y es algo más marcado. También mejora la página del juego del launcher.

## 1.75.2 — Colores según el juego más oscuros

El tinte del fondo y los paneles es más suave y los acentos son un poco más oscuros.

## 1.75.3 — Menos degradado a la izquierda del banner

El desvanecido de la izquierda del banner (modo consola horizontal, «Lateral con degradado») es más suave: el banner se ve antes y con menos velo.

## 1.75.4 — Sin borde visible en el banner

El desvanecido de la izquierda del banner vuelve a nacer en transparente (con una curva más suave y corta), así no se ve el borde de la imagen.

## 1.75.5 — Desvanecido del banner más largo y suave

El desvanecido de la izquierda del banner es más largo y con curva suave, para que no se note el borde en banners de fondo claro o blanco.

## 1.76.0 — Sección «Inicio» en el modo consola

Nueva primera pestaña, **Inicio**, con filas de tarjetas que se recorren con ↑ ↓ (fila) y ← → (tarjeta):

- **Continuar jugando**: tus últimos juegos (A abre la ficha, X juega).
- **Gratis ahora**: juegos gratis de Epic, Steam y otras tiendas, con los días que quedan; los que ya tienes salen atenuados con «✓ Ya la tienes». A abre la oferta en la aplicación de la tienda.
- **Eventos y rebajas**: eventos en curso y los próximos 45 días (rebajas de Steam, Epic…).
- **En oferta de tu lista de deseados**: juegos de tu lista (Steam/Epic) con descuento o gratis.
- **Casi completados**: juegos con 50 % o más de logros.
- **Para estrenar**: juegos instalados que aún no has jugado.

Las filas sin datos no aparecen. Los datos de tiendas se piden al abrir Inicio y se guardan 5 minutos. Funciona en horizontal, vertical y con las secciones a un lado. El fondo sigue al juego enfocado.

## 1.76.1 — Barra de secciones centrada y eventos con icono

La barra de secciones queda centrada en la pantalla (en horizontal) con letra algo más pequeña para que quepan las 9 secciones. Las tarjetas de «Eventos y rebajas» muestran el icono de la tienda (Steam, Epic) sobre su color en vez de un cuadro liso, porque los eventos no traen imagen.

## 1.76.2 — Logos en las tarjetas de Inicio

Las tarjetas de juegos de Inicio (Continuar jugando, Casi completados, Para estrenar) muestran el logo del juego centrado sobre el banner, como las portadas horizontales del launcher, con el nombre y el dato debajo. Se respeta «Quitar logotipo»; los juegos sin logo se ven como antes.

## 1.77.0 — Tarjetas de Inicio más grandes y fondo propio

- Las tarjetas de Inicio son más grandes (horizontal y vertical).
- **Ajustes del modo consola > Apariencia > «Fondo de Inicio»**: «Según el juego enfocado» (como hasta ahora), «Imagen propia» (una imagen tuya a pantalla completa, que se oscurece con «Oscurecer el fondo» y se desenfoca con «Desenfocar el fondo») o «Color liso». La fila **«Elegir imagen para Inicio…»** abre el selector de archivos (solo imágenes). El resto de pestañas no cambia.

## 1.77.1 — Barra de ayudas inferior más centrada

La barra de botones de abajo se desplaza unos píxeles a la derecha porque, aunque estaba centrada, se veía algo a la izquierda.

## 1.77.2 — «Modo consola» y monitor recordado
- El «modo sofá» pasa a llamarse **modo consola** en toda la aplicación (botón, ajustes, menús, avisos y documentación).
- El modo consola ahora **recuerda el monitor** en el que lo usaste: al cerrar Comptus y abrirlo de nuevo (también con «Abrir Comptus directamente en modo consola») vuelve a aparecer en ese mismo monitor. Si ese monitor ya no está conectado, se usa el actual.

## 1.78.0 — Modo consola: pestaña «Buscar»
- Nueva sección **Buscar** (junto a Inicio) con **teclado en pantalla** que se maneja con el mando (cruceta/stick para moverse, A para escribir, B para borrar) o con el teclado físico.
- Los resultados se actualizan al escribir y se pueden filtrar por **tienda** (botón Y/X o Tab); A abre la ficha del juego y X/P lo lanza.
- Funciona en pantalla horizontal y vertical, y con las secciones arriba, a la izquierda o a la derecha.
- La barra de secciones se ajustó para que quepa con la sección nueva.

## 1.78.1 — Buscar: teclado centrado en horizontal
- En pantalla horizontal el teclado queda **centrado** y los resultados aparecen debajo, también centrados. Se baja a los resultados con ↓ desde la última fila del teclado y se vuelve con ↑ desde la primera fila de resultados (en vertical funciona igual).

## 1.79.0 — Modo consola: volumen y energía del equipo
- En el menú del sistema del modo consola (Select + A, o F2) hay una entrada nueva, **«Volumen y energía del equipo…»**, con: subir/bajar volumen, silenciar, **bloquear, suspender, reiniciar y apagar**.
- Suspender, reiniciar y apagar piden confirmación (por defecto queda marcado «No, volver»). Antes de apagar o reiniciar se guardan los datos de Comptus.
- El volumen usa las teclas multimedia de Windows (cada pulsación del menú sube o baja unos 10 %).
- Para arrancar directamente en modo consola ya existe la opción «Abrir Comptus directamente en modo consola» en los ajustes.

## 1.80.0 — Modo consola: «Jugando ahora»
- Mientras hay un juego en ejecución, **Inicio** muestra arriba una fila **«Jugando ahora»** con ese juego (marcado «EN EJECUCIÓN») y cuánto lleva la sesión; al abrirlo está el botón «Cerrar el juego».
- El menú del sistema (Select + A, o F2) añade **«Cerrar «juego»»** mientras haya uno abierto, con confirmación.
- Al cerrarse el juego, la fila desaparece sola.
- Nota: Comptus todavía no descarga juegos por sí mismo (la instalación la hace cada tienda), por eso no hay una «cola de descargas» propia; llegará cuando esté la instalación integrada de Epic/GOG.

## 1.80.1 — «Jugando ahora» se ve completo
- Al abrirse un juego, el foco de Inicio salta a la fila «Jugando ahora» y se desplaza para verla entera (antes, con el foco más abajo, la tarjeta quedaba cortada bajo la barra de secciones, sobre todo en el monitor vertical).

## 1.81.0 — Tarjeta flotante del juego en ejecución
- Mientras hay un juego abierto, el modo consola muestra una **tarjeta flotante en cualquier sección** (también en la ficha y en ajustes) con la **portada**, el nombre, «EN EJECUCIÓN» y el **tiempo de juego** de la sesión.
- En pantalla horizontal queda a la derecha, a media altura; en vertical, centrada en la parte baja, sobre la barra de ayuda. Si las secciones están a la derecha se aparta para no taparlas.
- Se puede desactivar en Ajustes → «Tarjeta del juego en ejecución».
- La fila «Jugando ahora» de Inicio se mantiene.

## 1.81.1 — Tarjeta de juego en ejecución: centrada y con fondo oscurecido
- La tarjeta ahora está **centrada en la pantalla** (horizontal y vertical) y muestra la **portada completa**, sin recortes.
- Mientras el juego está en ejecución, **el fondo del modo consola se oscurece** (con un leve desenfoque) para que la tarjeta destaque; al cerrar el juego todo vuelve a la normalidad.
- Sigue pudiéndose desactivar en Ajustes → «Tarjeta del juego en ejecución» (desactiva también el oscurecido).

## 1.81.2 — Tarjeta de juego en ejecución más pequeña
- La tarjeta centrada se reduce (≈17 % del ancho en horizontal y ≈40 % en vertical).

## 1.82.0 — Avisos dentro del modo consola
- Los avisos de **juegos gratis nuevos**, **eventos y rebajas** y **ofertas de tu lista de deseados** ya no dependen de las notificaciones de Windows (que en pantalla completa no se ven): con el modo consola abierto aparecen como una **tarjeta de aviso arriba** durante unos segundos, sin quitarte el foco ni interrumpir lo que haces. Si llegan varios, salen uno tras otro.
- En el menú del sistema (Select + A, o F2) hay una entrada **«Avisos»** con los últimos recibidos en la sesión y la hora; al elegir uno te lleva a **Inicio**, donde están esas secciones.
- Fuera del modo consola (o con Comptus minimizado jugando) todo sigue como antes, con la notificación de Windows. Se siguen activando o desactivando en los ajustes de avisos de siempre.

## 1.82.1 — Avisos sobre el juego (overlay)
- Si estás **dentro de un juego** (el mismo caso en que funciona el overlay: pantalla completa con bordes, o cualquier programa si activaste «cualquier programa»), los avisos de juegos gratis, eventos y lista de deseados salen **sobre el juego** como la tarjeta del overlay (arriba, ~6 s), con título y detalle, sin quitarle el foco ni los clics al juego.
- Orden de prioridad: modo consola visible → tarjeta del modo consola; jugando con overlay → tarjeta sobre el juego; en cualquier otro caso → notificación de Windows. Si el panel del overlay está abierto, el aviso va por Windows para no taparlo.
- Requiere tener el overlay activado en ajustes (es el mismo requisito que el atajo del overlay).

## 1.83.0 — Más filas en Inicio (modo consola)
Inicio ahora también muestra filas hechas con tu propia biblioteca (solo aparecen si hay juegos que cumplan):
- **Tus favoritos** (los instalados primero).
- **Los que más has jugado**, con las horas jugadas (mínimo 3 juegos con tiempo).
- **Hace tiempo que no juegas**: instalados que llevan más de 45 días sin abrirse, empezando por los que más jugaste.
- **Los mejor valorados de tu biblioteca**: juegos con Metacritic de 85 o más (necesita tener descargada la información de los juegos).
Orden: Jugando ahora, Continuar jugando, Favoritos, Más jugados, Gratis, Eventos, Deseados, Casi completados, Hace tiempo…, Mejor valorados, Para estrenar.

## 1.83.1 — «Hace tiempo que no juegas» ahora sí aparece
- La fila solo contaba juegos con fecha de última partida registrada por Comptus; los que jugaste antes (con tiempo de juego pero sin fecha) no entraban. Ahora también salen, mostrando sus horas jugadas.

## 1.83.2 — «Hace tiempo que no juegas» incluye juegos no instalados
- La fila exigía juegos instalados; la mayoría de los que más has jugado y llevas tiempo sin abrir no lo están. Ahora entran también (con la etiqueta «No instalado»), mostrando la última partida y las horas jugadas; los instalados salen primero.

## 1.83.3 — Filas de Inicio que rotan
- «Hace tiempo que no juegas», «Los mejor valorados de tu biblioteca» y «Para estrenar» ya no muestran siempre los mismos juegos: **cada 6 horas se elige otro grupo** de entre todos los que cumplen. Dentro de esas 6 horas la fila se mantiene igual (no cambia mientras la miras ni al repintar la pantalla); el cambio se ve al volver a Inicio o al abrir de nuevo el modo consola.

## 1.84.0 — Margen de pantalla para televisores
- Nuevo ajuste del modo consola: **Margen de pantalla (televisor)**, en «Distribución»: Ninguno, 2, 4, 6, 8 o 10 %. Aleja todo el contenido (secciones, filas, reloj, ayuda de botones, ajustes) de los bordes para que nada quede cortado por el sobrebarrido de algunos televisores. **El fondo sigue ocupando toda la pantalla.**
- Funciona en horizontal y vertical y con las secciones arriba, a la izquierda o a la derecha.
- Por defecto está en «Ninguno» (como hasta ahora). En un televisor que corta los bordes, empieza por 2 o 4 %.
- Con márgenes grandes (8–10 %) la barra de secciones de arriba se desplaza para seguir visible la sección elegida, porque tiene menos espacio.

## 1.84.1 — Al cerrar un juego se vuelve siempre al modo consola (con foco)
- Antes, al cerrarse un juego, Comptus volvía al frente solo si cumplía ciertas condiciones (poco tiempo desde que el juego estuvo en primer plano, estaba oculto…) y Windows a veces no le daba el **foco**, así que había que hacer clic para volver a controlarlo (sobre todo si se había usado el overlay).
- Ahora, **con el modo consola abierto, al cerrarse el juego vuelve siempre**: se restaura, se trae al frente y se le fuerza el foco, insistiendo a los 0,5, 1,5 y 3,5 s por si Windows lo rechaza mientras el juego termina de cerrarse. Si ya tiene el foco, no hace nada más.
- Fuera del modo consola todo sigue como antes. En el diagnóstico del overlay queda anotado cuando se devuelve el foco.

## 1.84.2 — El overlay solo para juegos y sin mover lo del fondo
- **El overlay ya no se abre cuando Comptus (el lanzador o el modo consola) es la ventana activa**, ni con el atajo, ni con la combinación del mando: solo funciona dentro de un juego. (Si el overlay ya está abierto sobre un juego, se puede cerrar como siempre.)
- **Mientras el panel del overlay está abierto, Comptus ignora el mando y el teclado**: no se mueve nada del modo consola ni del lanzador por detrás mientras manejas el overlay.
- Nota: lo que haga el propio **juego** con el mando mientras el overlay está abierto no lo puede controlar Comptus (el mando lo reciben todos los programas); depende del juego.

## 1.84.3 — Barra de ayuda de botones menos plana
- La barra inferior con los botones (A Abrir, X Jugar…) ya no es una franja de lado a lado: ahora es una **cápsula flotante**, centrada y del ancho de su contenido, con efecto cristal (fondo translúcido y desenfocado), borde fino y sombra. Respeta el margen de pantalla para televisores y en vertical sigue pudiendo partirse en dos líneas.

## 1.84.4 — El nombre de los juegos ya no queda bajo la barra de ayuda
- Las filas y la cuadrícula del modo consola dejan ahora espacio suficiente por debajo para que el **nombre del juego** se vea completo por encima de la cápsula de ayuda, incluso con la posición de las filas en «Baja». La pantalla de Inicio también deja más margen al final del desplazamiento.

## 1.84.5 — Inicio sin el «recuadro» sobre la barra de ayuda
- En Inicio, las filas se cortaban en línea recta justo encima de la cápsula de ayuda (el contenedor terminaba ahí), y con la barra ya sin fondo de franja se notaba como un recuadro. Ahora el contenido llega hasta abajo y **se desvanece suavemente** por debajo y por encima (junto a las secciones), sin cortes rectos.

## 1.84.6 — Nombre de los juegos un poco más abajo
- En las filas horizontales del modo consola, el **nombre del juego enfocado baja** (≈1,5 líneas) hacia la cápsula de ayuda, aprovechando el espacio libre. Las portadas no se mueven.

## 1.84.7 · Modo consola: portadas a ras del nombre
- En las filas horizontales, ahora bajan las **portadas completas** (con su nombre pegado debajo) para que queden a ras de la zona de texto, en lugar de bajar solo el nombre. La cápsula de ayudas no se toca.

## 1.84.8 · Modo consola: barra lateral a ras del borde
- La barra de secciones lateral (izquierda o derecha) queda pegada al borde; solo respeta un cuarto del margen de pantalla.
- El contenido (filas, detalle, búsqueda, inicio) tiene margen propio calculado según el ancho de la barra, así que ya no choca con ella, ni en horizontal ni en vertical.

## 1.84.9 · Modo consola: animación al instalar y desinstalar
- Cuando un juego pasa de «No instalado» a instalado (o al revés) mientras estás en el modo consola, su portada hace un destello verde con la etiqueta «✓ Instalado» (o un destello rojizo con «Desinstalado»), suena un sonido corto y aparece un aviso en la tarjeta de avisos.
- Funciona en las filas, en Inicio y en la ficha del juego. Si cambian más de 3 juegos a la vez (cerrar sesión de una tienda, reanalizar) no se anima para no saturar.

## 1.84.10 · Modo consola: progreso mientras se instala
- Mientras un juego se instala (desde Steam o Epic) con el modo consola abierto, su portada muestra una capa con «Instalando 37 %» y una barra. En Steam el porcentaje es real (lo lee del manifiesto de la descarga); en Epic solo se sabe que está instalando, así que la barra se mueve sin porcentaje. Si la descarga está en pausa, lo indica en ámbar.
- La ficha del juego muestra la misma barra bajo el tiempo de juego. Al terminar aparece «Terminando…» hasta que la biblioteca se actualiza y salta la animación de «✓ Instalado» de la 1.84.9.
- Nuevo canal interno `installs:get` (main) / `installsGet` (preload).

## 1.84.11 · Modo consola: opción «Desinstalar…»
- El menú de opciones de un juego instalado (tecla M / botón de opciones, y «Más opciones» en la ficha) ahora incluye **Desinstalar…**, al final y separada del resto.
- Pide confirmación con un menú propio, manejable con el mando («Cancelar» queda seleccionada por defecto; «Sí, desinstalar» abre el desinstalador oficial de la tienda, donde se confirma o se cancela). No aparece en juegos locales.

## 1.84.12 · Modo consola: «Instalando…» sin porcentaje
- La capa de instalación en curso muestra solo la animación (círculo girando, brillo suave y el texto «Instalando…»), sin porcentaje ni barra. Lo mismo en la ficha del juego. Si la descarga está en pausa, dice «En pausa».

## 1.84.13 · Modo escritorio: animación al instalar y desinstalar
- Mientras un juego se instala (Steam o Epic), su tarjeta muestra una capa con un círculo girando y «Instalando…» (o «En pausa»), con un brillo verde suave; en la ficha, el botón principal pasa a «Instalando…» y queda desactivado para no lanzar la instalación dos veces.
- Al terminar de instalar, la tarjeta hace un destello verde con la etiqueta «✓ Instalado»; al desinstalar, uno rojizo con «Desinstalado». También sale un aviso abajo. Si cambian más de 3 juegos a la vez no se anima.
- Nuevo archivo `renderer/deskfx.js`. Si el modo consola está abierto, esto no hace nada (ahí manda la animación del modo consola). Sin sonido.

## 1.84.14 · Modo escritorio: Inicio, «Jugando ahora», avisos y volumen/energía
Funciones del modo consola que también tienen sentido en el escritorio (archivo nuevo `renderer/deskplus.js`):
- **Inicio:** nueva entrada «Inicio» arriba de la barra lateral con filas de tus juegos: Continuar jugando, Tus favoritos, Los que más has jugado, Casi completados, Hace tiempo que no juegas, Los mejor valorados y Para estrenar (las dos últimas y «hace tiempo» rotan cada 6 horas). «Página principal» sigue siendo la lista completa. Las filas solo se muestran si tienen contenido.
- **Jugando ahora:** al lado del buscador aparece una píldora con la portada, el nombre y el tiempo de la sesión del juego en ejecución; al pulsarla abre su ficha, y su «×» cierra el juego (pide un segundo clic para confirmar).
- **Avisos:** campana en la barra superior con un contador de avisos sin leer. Guarda el historial (juegos gratis, eventos, ofertas de tu lista de deseados, instalaciones y desinstalaciones); al elegir uno, abre su sección. Las notificaciones de Windows siguen igual. Nuevo canal `app:notice` (main → preload `onAppNotice`).
- **Volumen y energía:** botón de apagado en la barra superior con volumen (−, silenciar, +) y Bloquear, Suspender, Reiniciar y Apagar (con confirmación).
- Nota: la barra superior se oculta en la ficha de un juego y en Gratis/Eventos/Deseados, y con ella la campana, la píldora y el botón de energía.

## 1.84.15 · Modo escritorio: se quita «Inicio» y se reordena la barra superior
- Se quita la página «Inicio» de la 1.84.14 (queda «Página principal» como única lista). Siguen la píldora «Jugando ahora», los avisos y el menú de volumen y energía.
- La campana de avisos pasa al lado del botón de modo consola (esquina superior derecha); el resto de botones sigue centrado.
- La barra para agrandar o achicar las portadas pasa a la esquina inferior derecha de la ventana (semitransparente hasta que pasas el ratón; se oculta en la ficha de un juego y en el modo consola).

## 1.84.16 · Modo escritorio: «Jugando ahora» en la barra lateral
- La píldora «Jugando ahora» pasa a la barra lateral, justo encima del botón «Configuración». Así se ve en cualquier pantalla, también en la ficha de un juego. Sigue igual: pulsarla abre la ficha y su «×» cierra el juego con un segundo clic.
