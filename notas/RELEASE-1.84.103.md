# Comptus 1.84.103

## Inicio con Windows
- La casilla **«Abrir Comptus al iniciar Windows»** podía salir desmarcada estando activada, y Comptus seguía abriéndose al encender el PC. El motivo: Electron no reconoce su propia entrada de arranque cuando la ruta tiene espacios (`C:\Program Files\…`).
- Ahora Comptus lee el registro de Windows directamente, así que la casilla muestra lo que de verdad pasa al encender. Además, la entrada se escribe con la ruta entre comillas.
- Si te pasaba, abre **Configuración › Sistema**: la casilla saldrá marcada. Desmárcala y Comptus dejará de abrirse con Windows.

## Modo escritorio
- El deslizador de tamaño de las portadas (abajo a la derecha) solo aparece donde hay portadas. Ya no tapa el porcentaje de la barra de Locales en Estadísticas ni sale en Gratis, Eventos, Deseados, Comunidad o la ficha de un juego.
