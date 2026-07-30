require('dotenv').config({ quiet: true });
process.env.DB_SILENT = '1';
const bcrypt = require('bcryptjs');
const db = require('../db/conexion');
const { preguntar, preguntarOculto, validarPassword } = require('./lib/entradaSegura');

async function main() {
  const username = (await preguntar('Usuario: ')).toLowerCase();
  const nombre = await preguntar('Nombre: ');
  const rol = (await preguntar('Rol (ADMON_GRAL/CAJERO): ')).toUpperCase();
  if (!/^[a-z0-9._-]{3,50}$/.test(username)) throw new Error('Usuario inválido');
  if (!nombre || nombre.length > 100) throw new Error('Nombre inválido');
  if (!['ADMON_GRAL', 'CAJERO'].includes(rol)) throw new Error('Rol inválido');
  const [[existente]] = await db.promise.query('SELECT id FROM usuarios WHERE username=? LIMIT 1', [username]);
  if (existente) throw new Error('El usuario ya existe');

  const password = await preguntarOculto('Contraseña (no se mostrará): ');
  const confirmacion = await preguntarOculto('Confirma la contraseña: ');
  validarPassword(password);
  if (password !== confirmacion) throw new Error('Las contraseñas no coinciden');
  const hash = await bcrypt.hash(password, 12);
  const [resultado] = await db.promise.query(
    `INSERT INTO usuarios (nombre,username,password,password_hash,rol,activo)
     VALUES (?,?,NULL,?,?,1)`,
    [nombre, username, hash, rol]
  );
  console.log(`Usuario creado con id ${resultado.insertId}, rol ${rol}.`);
}

main()
  .catch(error => {
    console.error(`No se pudo crear el usuario: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => db.promise.end());
