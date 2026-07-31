# Limpieza del historial Git

Eliminar `.env` o un dump en un commit nuevo solo los retira del estado actual. Sus versiones anteriores siguen disponibles en los objetos y commits históricos del repositorio.

La limpieza histórica debe realizarse como una operación separada y supervisada, después de rotar todos los secretos. Las herramientas habituales son `git filter-repo` y BFG Repo-Cleaner. Ambas reescriben identificadores de commits y requieren:

- respaldo verificable del repositorio y sus referencias;
- inventario exacto de rutas y patrones que se retirarán;
- coordinación con todas las personas que usan el repositorio;
- protección temporal contra pushes durante la operación;
- `force push` deliberado de las referencias reescritas;
- invalidar clones antiguos y volver a clonar en todas las computadoras;
- revisar forks, artefactos, cachés, releases y copias externas por separado.

El orden seguro es: rotar credenciales, respaldar, ensayar en una copia, revisar el resultado, coordinar la ventana, reescribir y finalmente volver a clonar. Este PR no ejecuta BFG, `git filter-repo` ni `force push`.
