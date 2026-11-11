# Comptus 1.84.101

Mejoras de rendimiento, del inicio con Windows y del tamaño de las portadas por pantalla sobre la 1.84.100.

## Rendimiento
- **Menos consumo:** la consulta de instalaciones en curso solo relee los archivos de Steam/Epic que cambiaron y se espacia a 8 s cuando no hay nada instalándose; en modo consola la música de Windows se consulta cada 10 s (antes 2 s); y los vigilantes de mando de PowerShell comprueban cada 1 s, en lugar de 25 veces por segundo, mientras no haya un mando conectado.
- **Sin foco, menos gráfica:** con Comptus minimizado o sin la ventana activa se congelan las animaciones CSS y, según el ajuste de portadas animadas, estas vuelven a su imagen fija.

## Modo escritorio
- **Tamaño de las portadas por pantalla:** se recuerda según la pantalla (resolución + orientación). Al mover la ventana a otro monitor o girarlo (horizontal/vertical), el tamaño cambia solo al que dejaste en esa pantalla; en una pantalla nueva se conserva el actual y desde ahí queda guardado. Dos monitores con la misma resolución y orientación comparten tamaño.
- El cambio de tamaño al pasar de una pantalla a otra ya no es brusco: cada portada se desplaza de su posición y tamaño anteriores a los nuevos, con un ligero rebote y sin parpadeo (respeta «reducir movimiento» de Windows).

## Inicio con Windows
- Comptus reconoce y limpia las entradas de arranque duplicadas o antiguas (`electron.app.Comptus`, `com.mateo.gamelauncher`) y deja una sola, `Comptus`. Antes el ajuste podía aparecer apagado y aun así abrirse al encender el PC.

## Interno
- Se elimina `community.json`, un catálogo de proyectos que ya no se usaba. La sección Comunidad sigue igual.
