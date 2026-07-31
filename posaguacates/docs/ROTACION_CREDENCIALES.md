# Rotación de credenciales

El `.env` y un volcado con usuarios estuvieron versionados. Considere comprometidos los valores anteriores aunque ya no aparezcan en la rama actual. No escriba valores reales en comandos que vayan a quedar en el historial de PowerShell.

## Orden recomendado

1. En una ventana administrativa de MariaDB, cambie la contraseña de `pos_app` para `localhost` y `127.0.0.1`. Use una contraseña nueva y única; no le otorgue privilegios administrativos permanentes.
2. Actualice `DB_PASSWORD` solamente en el `.env` local de cada instalación.
3. Genere un `JWT_SECRET` aleatorio nuevo de al menos 32 bytes y actualice el `.env`. Este cambio invalida todos los tokens existentes.
4. Revoque la `GEMINI_API_KEY` anterior si alguna vez fue real. El funcionamiento actual es local y no necesita publicarla en Git.
5. Cambie las contraseñas de todos los usuarios del POS cuyos hashes aparecieron en el volcado histórico. Un hash no revela directamente la contraseña, pero puede ser atacado fuera de línea.
6. Detenga y vuelva a iniciar el servicio del backend para cerrar sesiones en memoria y cargar el nuevo `.env`.
7. Compruebe `GET /health`, la conexión MariaDB y un inicio de sesión administrativo.
8. Ejecute `npm run security:check` antes de cada publicación.

No confirme, adjunte ni copie el `.env` nuevo al repositorio. Registre la fecha y responsable de la rotación en un sistema privado, nunca en Git.
