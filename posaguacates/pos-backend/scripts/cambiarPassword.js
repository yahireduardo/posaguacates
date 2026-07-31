require('dotenv').config({ quiet: true });
process.env.DB_SILENT = '1';
const bcrypt = require('bcryptjs');
const db = require('../db/conexion');
const { preguntar, preguntarOculto, validarPassword } = require('./lib/entradaSegura');

async function main() {
  const username = (await preguntar('Usuario: ')).toLowerCase();
  const [[usuario]] = await db.promise.query(
    'SELECT id,username FROM usuarios WHERE username=? LIMIT 1',
    [username]
  );
  if (!usuario) throw new Error('Usuario no encontrado');
  const password = await preguntarOculto('Nueva contraseña (no se mostrará): ');
  const confirmacion = await preguntarOculto('Confirma la nueva contraseña: ');
  validarPassword(password);
  if (password !== confirmacion) throw new Error('Las contraseñas no coinciden');
  const hash = await bcrypt.hash(password, 12);
  await db.promise.query(
    'UPDATE usuarios SET password_hash=?,password=NULL WHERE id=?',
    [hash, usuario.id]
  );
  console.log(`Contraseña actualizada para ${usuario.username}.`);
}

main()
  .catch(error => {
    console.error(`No se pudo cambiar la contraseña: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.promise.end());
