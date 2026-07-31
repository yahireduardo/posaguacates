const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'pos_aguacates',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true
});

const promisePool = pool.promise();
let estadoConexion = {
  conectada: false,
  ultimaConexion: null,
  ultimoError: null
};

async function verificarConexion() {
  try {
    await promisePool.query('SELECT 1');
    estadoConexion = {
      conectada: true,
      ultimaConexion: new Date().toISOString(),
      ultimoError: null
    };
    return true;
  } catch (error) {
    estadoConexion = {
      ...estadoConexion,
      conectada: false,
      ultimoError: error.code || error.message
    };
    throw error;
  }
}

async function esperarConexion(opciones = {}) {
  const intentos = Number(opciones.intentos || process.env.DB_CONNECT_RETRIES || 30);
  const intervaloMs = Number(opciones.intervaloMs || process.env.DB_CONNECT_RETRY_MS || 2000);
  for (let intento = 1; intento <= intentos; intento += 1) {
    try {
      await verificarConexion();
      if (process.env.DB_SILENT !== '1') {
        console.log(`MySQL disponible (intento ${intento}/${intentos})`);
      }
      return;
    } catch (error) {
      console.error(`MySQL no disponible (intento ${intento}/${intentos}): ${error.code || error.message}`);
      if (intento === intentos) throw error;
      await new Promise(resolve => setTimeout(resolve, intervaloMs));
    }
  }
}

function obtenerEstadoConexion() {
  return { ...estadoConexion };
}

module.exports = pool;
module.exports.promise = promisePool;
module.exports.verificarConexion = verificarConexion;
module.exports.esperarConexion = esperarConexion;
module.exports.obtenerEstadoConexion = obtenerEstadoConexion;
