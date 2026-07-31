# Operación offline

Express escucha únicamente en `127.0.0.1`. Chart.js se sirve desde `node_modules`; no hay CDN, Gemini, fuentes, iconos ni `fetch` externos. La CSP solo permite recursos del mismo origen y datos de imágenes.

Prueba: desconecte Internet, arranque MariaDB y `npm start`, abra el POS, realice el recorrido manual y confirme en herramientas del navegador que no existen solicitudes a dominios externos.
