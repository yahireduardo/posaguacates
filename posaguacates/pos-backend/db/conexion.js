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

pool.getConnection((error, connection) => {
  if (error) {
    console.error('Error de conexión a MySQL:', error.message);
    return;
  }

  console.log('Conectado a MySQL');
  connection.release();
});

module.exports = pool;
module.exports.promise = pool.promise();
