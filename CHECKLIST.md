# Comptus — checklist

Leyenda: `[x]` hecho · `[~]` hecho pero sin confirmar en tu equipo · `[ ]` pendiente

## Bibliotecas
- [x] Steam: juegos instalados
- [x] Steam: juegos comprados sin instalar (con clave de API)
- [x] Epic Games: instalados
- [x] Epic Games: comprados sin instalar (inicio de sesión seguro, token cifrado)
- [x] Xbox / Microsoft Store: instalados
- [x] Xbox: historial de juegos de PC con inicio de sesión sin Azure
- [x] Ubisoft Connect: instalados (registro, carpetas, desinstalación)
- [x] Ubisoft Connect: biblioteca completa desde la caché de Ubisoft (los comprados en Steam se omiten a propósito)
- [x] Diagnóstico de Ubisoft (copia el informe al portapapeles)
- [x] GOG y juegos locales añadidos a mano
- [x] Sincronización automática al abrir (cada 12 h)
- [x] Juegos de Ubisoft comprados en Steam: se incluyen y se unen a su ficha de Steam (ajuste)
- [ ] EA App, Battle.net, Rockstar, Amazon Games, itch.io
- [ ] Juegos gratis de Epic de la semana

## Biblioteca y juegos
- [x] Cuadrícula con portadas, tamaño ajustable (Ctrl + rueda)
- [x] Favoritos, ocultar, búsqueda y filtros laterales
- [x] Colecciones
- [x] Botón Jugar con estados (iniciando / jugando / detener) para cualquier juego
- [x] Tiempo de juego y última vez jugado
- [x] Información automática (Steam / RAWG), tráilers, traducción
- [x] Logros: Steam, Epic y Xbox [~ Xbox sin confirmar]
- [x] Capturas y overlay con atajos
- [x] Portadas, banners (incluidos animados), iconos y logotipos propios
- [x] Caché de imágenes ligeras
- [~] Apertura rápida (se corrigió el congelamiento inicial)
- [x] Estados por juego (pendiente, jugando, completado, abandonado) y etiquetas propias, con filtros y búsqueda
- [x] Unir juegos repetidos entre tiendas en una sola ficha (con elección de versión por defecto)
- [ ] Estadísticas (horas, más jugados, progreso del año)
- [ ] Juego aleatorio («¿qué juego hoy?»)
- [ ] Gestión de instalados (tamaño en disco, desinstalar desde Comptus)

## Apariencia
- [x] Temas predefinidos, temas propios guardados
- [x] Fondos: ilustraciones, imágenes y propios; oscurecimiento y desenfoque fijos del usuario
- [x] Banners animados en la ficha
- [x] Nombre «Comptus» con logo e icono propios
- [x] Adaptación a pantallas estrechas / vertical

## Sistema
- [x] Portable e instalador personalizado (`npm run dist`, `npm run dist:instalador`)
- [x] Copia de seguridad: exportar y restaurar (combinar o reemplazar)
- [x] Copia automática diaria (últimas 7)
- [~] Bandeja del sistema, minimizar a la bandeja
- [~] Iniciar con Windows (opcionalmente oculto) y atajo global para buscar un juego (Ctrl+Alt+Espacio)
- [~] Actualizaciones automáticas (instalador + GitHub Releases; repositorio emptystill/Comptus-Launcher-Beta ya configurado)
- [ ] Modo mando (navegar con el gamepad)
- [ ] Copias de partidas guardadas de juegos sin nube

## Por confirmar en tu equipo
- [ ] Estados del botón Jugar con juegos reales de Steam y Epic
- [ ] Instalador (`npm run dist:instalador`): aspecto y pantallas
- [ ] Logros de Xbox
- [ ] Bandeja, inicio con Windows y búsqueda rápida (Ctrl+Alt+Espacio)
- [ ] Actualizaciones: publicar una release de prueba y comprobar que el instalador la detecta, descarga e instala
- [ ] Restaurar una copia de seguridad (probado solo con simulaciones)
