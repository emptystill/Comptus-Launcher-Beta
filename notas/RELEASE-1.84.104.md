# Comptus 1.84.104

## Tus datos, a salvo de apagones
- Si Windows se apagaba o se colgaba justo mientras Comptus guardaba (un apagón, por ejemplo), el archivo de datos podía quedar dañado. Comptus arrancaba entonces vacío, sin temas, juegos locales ni colecciones, y no guardaba nada.
- Ahora los datos se escriben de forma segura: se fuerzan al disco antes de sustituir el archivo, así que un apagón ya no lo deja dañado.
- Si aun así no se puede leer, Comptus **recupera solo** la copia buena más reciente (la del último cierre o la copia diaria) y te avisa con «Datos recuperados».
- Las copias automáticas ya no copian nunca un archivo dañado. Antes, en una semana, las copias buenas se habrían ido sustituyendo por otras inservibles.

## Logros más rápidos
- **Steam:** mientras juegas, Comptus vigila el archivo donde Steam guarda tus logros y, en cuanto cambia, comprueba si hay alguno nuevo. Si la web de Steam va con retraso, lo reintenta a los 15 y a los 45 segundos. Antes se comprobaba cada 3 minutos.
- **Epic y Xbox:** la comprobación pasa de cada 3 minutos a cada minuto mientras juegas.
- El mismo logro ya no puede avisarse dos veces.

## Animaciones con Comptus en otro monitor
- Las animaciones (por ejemplo, las de los juegos completados) y las portadas animadas ya no se congelan solo porque Comptus pierda el foco. Se pausan cuando no se ve (minimizado, en la bandeja o tapado del todo) y mientras hay un juego abierto.
