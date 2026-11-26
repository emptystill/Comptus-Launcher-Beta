# Comptus 1.84.113

## Selector de vista
- Nuevo icono abajo a la derecha, a la izquierda del deslizador de tamaño. Cambia la biblioteca entre:
  - **Portadas verticales**
  - **Portadas horizontales**
  - **Portadas con detalles**: nombre y tiempo jugado bajo cada portada.
  - **Lista**: una fila por juego con portada pequeña, nombre, tienda, tiempo jugado, última vez y si está instalado. Las columnas quedan alineadas en todas las filas.
- Cambiar entre vertical, con detalles y lista es instantáneo. La vista elegida se guarda.

## Tiempo jugado de los juegos locales, corregido
- Antes solo contaba mientras seguía abierto el .exe que lanzaba Comptus. En los juegos que arrancan con un lanzador propio se perdía casi todo, y no contaba si abrías el juego fuera de Comptus.
- Ahora cuenta desde que se ve el juego hasta que se cierran todos sus procesos, lo abras desde donde lo abras.
- El total recupera también el tiempo de las sesiones ya registradas.

## Imágenes propias
- «Restablecer» (portada, banner, icono) y «Quitar logotipo» ahora sí quitan la imagen. Antes Comptus volvía a usar sola la que hay con el nombre del juego en Comptus Media.
- Si cambias un archivo de esas carpetas por otro con el mismo nombre, Comptus muestra el nuevo sin tener que reiniciarlo.
