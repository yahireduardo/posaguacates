const fs = require('fs/promises');
const path = require('path');
require('dotenv').config({ path: process.env.SOURCE_ENV_PATH || path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const { splitStatements } = require('./migrate');

const DB = 'posaguacates_test';
const medir = async (db, nombre, sql, params = []) => {
  const inicio = performance.now();
  const [rows] = await db.query(sql, params);
  return { nombre, ms: Number((performance.now() - inicio).toFixed(2)), filas: rows.length };
};

async function main() {
  const admin = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, multipleStatements: false });
  try {
    await admin.query(`DROP DATABASE IF EXISTS \`${DB}\``);
    await admin.query(`CREATE DATABASE \`${DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await admin.query(`USE \`${DB}\``);
    const schema = await fs.readFile(path.join(__dirname, '..', 'sql', 'posaguacates.sql'), 'utf8');
    for (const statement of splitStatements(schema)) await admin.query(statement);
    const migrations = (await fs.readdir(path.join(__dirname, '..', 'sql', 'migrations'))).filter(x => /^\d+.*\.sql$/.test(x)).sort();
    for (const file of migrations) for (const statement of splitStatements(await fs.readFile(path.join(__dirname, '..', 'sql', 'migrations', file), 'utf8'))) await admin.query(statement);
    await admin.query("INSERT INTO usuarios(nombre,username,password_hash,rol,activo) VALUES('Auditor','audit','x','ADMON_GRAL',1)");
    await admin.query("INSERT INTO clientes(nombre_razon_social,activo) VALUES('Carga auditoria',1)");
    for (let base = 1; base <= 10000; base += 500) {
      const vals = [], marks = [];
      for (let i = base; i < base + 500; i++) { marks.push('(?,?,?,?,?,?,1)'); vals.push(`P${String(i).padStart(6,'0')}`, `Producto auditoria ${i}`, 'KG', 10, 1000, 5); }
      await admin.query(`INSERT INTO productos(codigo,nombre,unidad,precio_venta,stock,stock_minimo,activo) VALUES ${marks.join(',')}`, vals);
    }
    for (let base = 1; base <= 10000; base += 500) {
      const vals = [], marks = [];
      for (let i = base; i < base + 500; i++) { marks.push('(?,?,?,?,?,?,?)'); vals.push(1, 1, new Date(2020 + (i % 6), i % 12, 1 + (i % 27)), 'CONTADO', 100, 'ACTIVA', 'EFECTIVO'); }
      await admin.query(`INSERT INTO ventas(cliente_id,usuario_id,fecha,tipo_pago,total,estado_venta,metodo_pago) VALUES ${marks.join(',')}`, vals);
    }
    for (let base = 0; base < 100000; base += 1000) {
      const vals = [], marks = [];
      for (let j = 0; j < 1000; j++) { const n = base + j; marks.push('(?,?,?,?,?)'); vals.push(1 + (n % 10000), 1 + (n % 10000), 1, 10, 10); }
      await admin.query(`INSERT INTO detalle_venta(venta_id,producto_id,cantidad,precio_unitario,subtotal) VALUES ${marks.join(',')}`, vals);
    }
    const pruebas = [];
    pruebas.push(await medir(admin, 'productos listado 10000', 'SELECT * FROM productos WHERE activo=1 ORDER BY nombre'));
    pruebas.push(await medir(admin, 'venta por id', 'SELECT * FROM ventas WHERE id=?', [9999]));
    pruebas.push(await medir(admin, 'ventas rango anual', "SELECT COUNT(*) total,SUM(total) importe FROM ventas WHERE estado_venta='ACTIVA' AND fecha>=? AND fecha<?", ['2024-01-01','2025-01-01']));
    pruebas.push(await medir(admin, 'top productos 100k detalles', "SELECT d.producto_id,SUM(d.cantidad) cantidad FROM detalle_venta d JOIN ventas v ON v.id=d.venta_id WHERE v.estado_venta='ACTIVA' GROUP BY d.producto_id ORDER BY cantidad DESC LIMIT 10"));
    const [explain] = await admin.query('EXPLAIN SELECT * FROM ventas WHERE id=?', [9999]);
    console.log(JSON.stringify({ database: DB, temporal: true, volumen: { productos: 10000, ventas: 10000, detalle_venta: 100000 }, pruebas, explainVentaId: explain }, null, 2));
  } finally {
    await admin.query(`DROP DATABASE IF EXISTS \`${DB}\``);
    await admin.end();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
