# Comptus 1.84.100

Novedades desde la 1.84.84. La más grande es el nuevo estilo de interfaz **Steam Big Picture (oscuro)** para el modo consola, con amigos de Steam, perfil, notificaciones y logros.

## Modo consola: estilo «Steam Big Picture (oscuro)»
Nueva opción en **Ajustes › Estilo de interfaz**. Está hecho a partir de grabaciones y capturas de Big Picture, sin copiar sus marcas.

**Estructura general**
- **Barra superior:** búsqueda, red, batería, hora y tu foto de perfil. La campana solo aparece cuando hay avisos sin leer (ver «Notificaciones»).
- **Barra inferior:** «Menú» a la izquierda y el resto de atajos a la derecha (Seleccionar, Atrás…); también se pueden pulsar con el ratón.
- **F1** abre el menú lateral a pantalla completa: Inicio, Biblioteca, Buscar, Logros, Colecciones, Parámetros, Mi perfil e Iniciar/Apagar. Los paneles laterales de la derecha (Notificaciones, ficha de amigo) también ocupan toda la altura y empiezan por debajo de los iconos de arriba.
- **Esc / B** vuelve atrás desde cualquier sección y desde la ficha.
- **Q / E** solo cambian de sección (ya no abren Ajustes desde Inicio); Ajustes se abre con el globo.
- Los menús contextuales, Ajustes (categorías a la izquierda, interruptores azules) y Colecciones (mosaicos de color) tienen el estilo del modo.

**Inicio**
- Fila «Jugados recientemente» con portadas 2:3 y, bajo ella, las pestañas **Novedades / Amigos / Recomendados** (Novedades: noticias, juegos gratis y eventos; Recomendados: filas de juegos).
- Al bajar, las pestañas quedan pegadas arriba como una **banda translúcida con desenfoque** (acrílico, en tres capas) que difumina portadas y fondo, con Q / E a los lados. Los títulos de las filas se ocultan bajo la banda.
- Tarjeta enfocada con zoom, borde que respira, barrido de brillo y resplandor; nombre y horas que suben con fundido. El texto «Jugado hoy» añade las **horas jugadas** («JUGADO HOY · 12 H»).
- Fondo del juego enfocado, oscurecido y ligeramente desenfocado; solo se muestra con un juego enfocado en la fila de arriba.
- El ratón solo se activa con un movimiento real y, al pasar sobre una tarjeta, solo hace un pequeño zoom (el clic abre).

**Búsqueda**
- Se abre con la lupa: la barra crece desde el icono, se escribe de inmediato con el teclado físico (teclado en pantalla solo con mando), con filtros por tienda, F4 para borrar y Esc para cerrar.

**Ficha del juego**
- Cabecera con logo, barra **Jugar / Última sesión / Tiempo de juego**, opciones y pestañas **Actividad / Tus cosas / Información sobre el juego** (LB/RB o Q/E para cambiar).
- **Actividad:** cronología por fecha con sesiones de juego y logros desbloqueados, con iconos grandes; sección **Amigos** (ver más abajo).
- **Tus cosas:** progreso de logros, logro destacado a la izquierda, desbloqueados a su derecha y cuadrícula de **Logros bloqueados** debajo, como en Steam; además, archivos multimedia.
- La barra de pestañas, al pegarse arriba, usa el mismo efecto translúcido y desenfocado que la del Inicio.
- Al pulsar **Jugar**, el arte crece y muestra el logo con «Iniciando…» (luego «Lanzando ejecutable»); con el juego abierto, el botón pasa a «Reanudar» + ✕ para cerrarlo. Al cerrarse el juego aparece una pantalla negra con el logo de Comptus y un aro azul (≈1,5 s) y se vuelve a la ficha o al Inicio.

**Logros (sección)**
- Lista de juegos a la izquierda (portada, nombre y progreso) y, a la derecha, cabecera y logros con los desbloqueados resaltados y los pendientes atenuados. Intro o clic pasa a la lista de logros del juego (ya no abre la ficha por detrás).

**Arranque**
- Animación de entrada de ~6 s (el trazo de luz dibuja el mando, anillo con puntos, emblema de Comptus), con sonido; se salta con cualquier tecla.

## Amigos, perfil y notificaciones de Steam
Necesita la **clave de la API de Steam** (Ajustes) y que tu lista de amigos y tu perfil sean **públicos**.

- **Pestaña Amigos** en Inicio: secciones *Jugando ahora / En línea / Desconectados* con avatar, estado y «Visto hace…». Un contador verde junto a la pestaña muestra cuántos están conectados y, en las tarjetas de juego, una insignia indica cuántos amigos están jugando a ese título. Se actualiza cada 2 min como máximo.
- **Ficha de amigo** (panel lateral): estado, nivel de Steam, «amigos desde», juegos de las últimas 2 semanas, «Enviar mensaje» (abre el chat en el cliente de Steam) y «Ver perfil en Steam».
- **Amigos en la ficha del juego** (juegos de Steam): *Jugando ahora / Jugado anteriormente (con horas y fecha) / Lo tienen*. Los amigos con los detalles de juego privados se omiten y se indica cuántos son. La primera consulta puede tardar unos segundos; el resultado se guarda 10 min.
- **Mi perfil** (clic en tu foto o F1 › Mi perfil): foto, nombre, estado, nivel, código de amigo y cuenta de Steam; accesos a Ver perfil, Añadir fondos, Privacidad, Detalles de la cuenta y Añadir amigos (abren Steam o la web) y cambio de estado (conectado, ausente, ocupado, invisible, desconectado; solo con Steam abierto).
- La foto de la esquina superior derecha usa tu **foto de Steam**; si no hay clave o no se puede leer el perfil, se queda la de Comptus.
- **Notificaciones:** la campana aparece solo cuando hay avisos sin leer, con contador. Avisa de logros desbloqueados, juegos gratis, ofertas de tu lista de deseados, eventos y novedades de proyectos, y de **amigos que se conectan o empiezan a jugar** (comprobación cada 2,5 min, máximo 3 avisos a la vez; la primera comprobación solo fija la referencia). Cada aviso abre lo que corresponde (ficha del amigo, logros del juego o Inicio). Al abrir el panel se marcan como leídos y siguen en el menú «Avisos» (hasta 20).

## Todos los modos consola
- Se quita la barra superior de «lo que suena» (♪ título — artista) en todos los temas. Los controles de música siguen en el menú del sistema.

## Modo escritorio
- **Tamaño de las portadas por pantalla:** se recuerda según la pantalla (resolución + orientación). Al mover la ventana a otro monitor o girarlo (horizontal/vertical), el tamaño cambia solo al que dejaste en esa pantalla; en una pantalla nueva se conserva el actual y desde ahí queda guardado. Dos monitores con la misma resolución y orientación comparten tamaño.

## Rendimiento y arranque
- Menos carga mientras juegas: el seguimiento del juego, que consultaba todos los procesos de Windows cada 5 s y causaba pequeños tirones de FPS, ahora se repite cada 30 s con el juego ya detectado. Los procesos de segundo plano (vigilante de ventana, lectura del mando) corren con prioridad baja.
- **Menos consumo:** la consulta de instalaciones en curso solo relee los archivos de Steam/Epic que cambiaron y se espacia a 8 s cuando no hay nada instalándose; en modo consola la música de Windows se consulta cada 10 s (antes 2 s); y los vigilantes de mando de PowerShell comprueban cada 1 s, en lugar de 25 veces por segundo, mientras no haya un mando conectado.
- **Sin foco, menos gráfica:** con Comptus minimizado o sin la ventana activa se congelan las animaciones CSS y, según el ajuste de portadas animadas, estas vuelven a su imagen fija.
- **Inicio con Windows:** Comptus reconoce y limpia las entradas de arranque duplicadas o antiguas (`electron.app.Comptus`, `com.mateo.gamelauncher`) y deja una sola, `Comptus`. Antes el ajuste podía aparecer apagado y aun así abrirse al encender el PC.
- El arranque ya no muestra un destello blanco al abrir y `npm start` no ejecuta el generador de `couch.js`.
- Steam Big Picture: el fondo del Inicio ya no repinta con cada cuadro (sin `filter`/`mask` animados), se precargan las tarjetas vecinas y se usa la copia fija del banner para evitar el lag con banners animados enormes.

## Xbox 360 (panel moderno)
- En Inicio, la tarjeta marcada es siempre la que se abre (antes, a veces se abría otro juego).
- Buscar vuelve a ir primero al cambiar de estilo con el modo consola abierto.

## Interno
- `renderer/couch.js` ahora se **genera** a partir de las partes de `renderer/couch/` (`node tools/build-couch.js`; `--check` comprueba que esté al día; `npm run couch`). No se edita a mano. Esas partes y `tools/` no van en el instalador.
- Nuevo `friends.js` (amigos, ficha de amigo y propietarios de un juego) y nuevas llamadas en `main.js` / `preload.js` para amigos y perfil.
- Se elimina `community.json`, un catálogo de proyectos que ya no se usaba. La sección Comunidad sigue igual.

## Qué no incluye / límites
- Steam no da por su API pública: chat dentro de Comptus, feed de actividad, invitaciones, «No molestar», saldo de la cuenta ni listas de deseados de otros usuarios. Tampoco están las pestañas «Comunidad» ni la sección de cromos de Big Picture.
- Con perfiles privados, la API devuelve datos incompletos o nada.
- Los sonidos del estilo Steam (`renderer/sonidos/deck/`) son de uso personal y **no se suben al repositorio público** (están en `.gitignore`); sin ellos el estilo funciona, pero sin esos sonidos.
