-- Ejecute como administrador de MariaDB/MySQL.
-- Reemplace la contraseña únicamente en su consola local; no guarde la copia editada en Git.
CREATE DATABASE IF NOT EXISTS posaguacates
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'pos_app'@'localhost'
  IDENTIFIED BY 'REEMPLAZAR_EN_LA_CONSOLA_LOCAL';

GRANT SELECT, INSERT, UPDATE, DELETE, SHOW VIEW, TRIGGER, EVENT
  ON posaguacates.* TO 'pos_app'@'localhost';

FLUSH PRIVILEGES;
SHOW GRANTS FOR 'pos_app'@'localhost';
