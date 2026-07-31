# Manual de instalación

Instale una sola vez Node.js LTS, MariaDB 12.x y Git (solo para mantenimiento). Cree la base `posaguacates`, un usuario de ejecución con permisos DML y conserve una cuenta administrativa separada para migraciones.

Para una instalación nueva, una cuenta DDL temporal debe crear la base e importar `pos-backend/sql/posaguacates.sql`. El archivo es un esquema sanitizado: no contiene usuarios, ventas ni contraseñas. Después ejecute `npm run db:migrate` y cree el primer administrador con `npm run usuario:crear`. No restaure el dump histórico del repositorio.

En `pos-backend`: ejecute `npm ci`, copie `.env.production.example` a `.env`, complete valores locales y genere `JWT_SECRET` aleatorio. No publique `.env`.

Antes de migrar ejecute `npm run db:backup`. Después, en una PowerShell temporal establezca `DB_USER` y `DB_PASSWORD` con la cuenta DDL y ejecute `npm run db:migrate`; cierre esa consola. Arranque con `npm start` y verifique `http://127.0.0.1:3000/health`.
