# Comptus 1.84.102

## Se quita «Partidas guardadas»
- Desaparece el panel **Partidas guardadas** de la ficha de cada juego, la copia automática al cerrar un juego, la descarga de la base de datos Ludusavi y su apartado en **Configuración › Sistema**.
- Motivo: en muchos juegos no está claro dónde guardan el progreso, y la función confundía más de lo que ayudaba.
- Las copias que ya existan en `Comptus Media\Partidas guardadas` no se borran solas. Si no las necesitas, puedes eliminar esa carpeta.
- La **Copia de seguridad** de Comptus (ajustes, colecciones y temas) sigue igual.

## Interno
- Con `npm start`, las notificaciones de Windows salen con el nombre «Comptus».
- Ya no se usa la dependencia `yaml`, así que el instalador es algo más ligero.
