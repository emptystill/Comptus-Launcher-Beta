# Comptus 1.84.101

Mejoras de rendimiento y arranque sobre la 1.84.100.

## Rendimiento
- **Menos consumo:** la consulta de instalaciones en curso solo relee los archivos de Steam/Epic que cambiaron y se espacia a 8 s cuando no hay nada instalándose; en modo consola la música de Windows se consulta cada 10 s (antes 2 s); y los vigilantes de mando de PowerShell comprueban cada 1 s, en lugar de 25 veces por segundo, mientras no haya un mando conectado.
- **Sin foco, menos gráfica:** con Comptus minimizado o sin la ventana activa se congelan las animaciones CSS y, según el ajuste de portadas animadas, estas vuelven a su imagen fija.

## Inicio con Windows
- Comptus reconoce y limpia las entradas de arranque duplicadas o antiguas (`electron.app.Comptus`, `com.mateo.gamelauncher`) y deja una sola, `Comptus`. Antes el ajuste podía aparecer apagado y aun así abrirse al encender el PC.

## Interno
- Se elimina `community.json` (la sección de proyectos de la comunidad ya no existe).
