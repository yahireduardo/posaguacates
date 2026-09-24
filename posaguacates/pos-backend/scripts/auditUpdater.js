const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const mysql = require('mysql2/promise');
const { splitStatements, migrationChecksum } = require('./migrate');
require('dotenv').config({ path: process.env.SOURCE_ENV_PATH || '.env', quiet: true });

const database = 'posaguacates_test';
const backend = path.join(__dirname, '..');
const root = path.join(backend, 'temp', `audit-updater-${Date.now()}`);
const stageSource = process.env.AUDIT_STAGE_PATH;
const tables = ['productos','clientes','ventas','detalle_venta','movimientos_inventario','cuentas_por_cobrar','pagos','aplicaciones_pago','proveedores','compras','detalle_compra','usuarios','configuracion_negocio'];

const ordenar = value => Array.isArray(value) ? value.map(ordenar) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, ordenar(value[key])])) : value;
const canonical = value => JSON.stringify(ordenar(value));
async function snapshot(db, projection = null) {
  const result = {};
  for (const table of tables) {
    const [columns] = await db.query(`SHOW COLUMNS FROM \`${table}\``);
    const names = projection?.tables?.[table]?.columns || columns.map(x => x.Field).filter(x => !['actualizado_en'].includes(x));
    const [rows] = await db.query(`SELECT ${names.map(x => `\`${x}\``).join(',')} FROM \`${table}\` ORDER BY id`);
    result[table] = { count: rows.length, hash: crypto.createHash('sha256').update(canonical(rows)).digest('hex'), columns: names };
  }
  const [[control]] = await db.query('SELECT (SELECT stock FROM productos WHERE id=1) stock,(SELECT saldo_pendiente FROM cuentas_por_cobrar WHERE id=1) saldo');
  return { tables: result, control: { stock: Number(control.stock), saldo: Number(control.saldo) } };
}

async function main() {
  if (!stageSource || !await fs.stat(stageSource).then(x => x.isDirectory()).catch(() => false)) throw new Error('AUDIT_STAGE_PATH no apunta al payload generado');
  const cfg = { host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD };
  const admin = await mysql.createConnection(cfg);
  try {
    await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await admin.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await admin.query(`USE \`${database}\``);
    for (const statement of splitStatements(await fs.readFile(path.join(backend, 'sql', 'posaguacates.sql'), 'utf8'))) await admin.query(statement);
    for (const file of (await fs.readdir(path.join(backend, 'sql', 'migrations'))).filter(x => /^(00[1-7])_.*\.sql$/.test(x)).sort()) {
      const sql = await fs.readFile(path.join(backend, 'sql', 'migrations', file), 'utf8');
      for (const statement of splitStatements(sql)) await admin.query(statement);
      await admin.query('INSERT INTO schema_migrations(version,description,checksum_sha256) VALUES(?,?,?)', [file, 'Versión anterior de auditoría', migrationChecksum(sql)]);
    }
    await admin.query("INSERT INTO usuarios(id,nombre,username,password_hash,rol,activo) VALUES(1,'Admin anterior','admin_anterior','hash','ADMON_GRAL',1)");
    await admin.query("INSERT INTO clientes(id,nombre_razon_social,permite_credito,activo) VALUES(1,'Cliente anterior',1,1)");
    await admin.query("INSERT INTO proveedores(id,nombre,activo) VALUES(1,'Proveedor anterior',1)");
    await admin.query("INSERT INTO productos(id,codigo,nombre,precio_venta,costo,stock,stock_minimo,unidad,activo) VALUES(1,'OLD-1','Producto anterior',25,10,8,1,'KG',1)");
    await admin.query("INSERT INTO ventas(id,cliente_id,usuario_id,total,tipo_pago,metodo_pago,estado_pago,estado_venta,fecha,idempotency_key) VALUES(1,1,1,50,'CREDITO',NULL,'PENDIENTE','ACTIVA','2026-01-02 10:00:00','old-sale-0001')");
    await admin.query('INSERT INTO detalle_venta(id,venta_id,producto_id,cantidad,precio_unitario,subtotal) VALUES(1,1,1,2,25,50)');
    await admin.query("INSERT INTO movimientos_inventario(id,producto_id,tipo,cantidad,stock_anterior,stock_final,motivo,referencia_tipo,usuario_id) VALUES(1,1,'SALIDA',2,10,8,'Venta anterior','VENTA',1)");
    await admin.query("INSERT INTO cuentas_por_cobrar(id,venta_id,cliente_id,total_deuda,saldo_pendiente,estado) VALUES(1,1,1,50,40,'PENDIENTE')");
    await admin.query("INSERT INTO pagos(id,cliente_id,cuenta_id,monto,monto_total,metodo_pago,usuario_id,estado) VALUES(1,1,1,10,10,'EFECTIVO',1,'ACTIVO')");
    await admin.query("INSERT INTO aplicaciones_pago(id,pago_id,cuenta_id,monto_aplicado,estado) VALUES(1,1,1,10,'ACTIVA')");
    await admin.query("INSERT INTO compras(id,proveedor_id,folio,total,estado,usuario_id,idempotency_key) VALUES(1,1,'OLD-COMPRA',30,'ACTIVA',1,'old-buy-0001')");
    await admin.query("INSERT INTO detalle_compra(id,compra_id,producto_id,cantidad,unidad,precio_compra,subtotal) VALUES(1,1,1,3,'KG',10,30)");
    await admin.query("UPDATE configuracion_negocio SET nombre_comercial='Empresa anterior',logo='assets/logo-personalizado.png' WHERE id=1");
    const before = await snapshot(admin);

    await fs.mkdir(path.join(root, 'app', 'pos-backend'), { recursive: true });
    await fs.mkdir(path.join(root, 'app', 'backups'), { recursive: true });
    await fs.mkdir(path.join(root, 'runtime'), { recursive: true });
    const env = [`NODE_ENV=production`,`DB_HOST=${process.env.DB_HOST}`,`DB_PORT=${process.env.DB_PORT || 3306}`,`DB_USER=${process.env.DB_USER}`,`DB_PASSWORD=${process.env.DB_PASSWORD}`,`DB_NAME=${database}`,`JWT_SECRET=${'j'.repeat(48)}`,`BACKUP_SIGNING_KEY=${'b'.repeat(48)}`,`OPENAI_API_KEY=clave-ficticia-persistente`,`MARIADB_BIN_DIR=${process.env.MARIADB_BIN_DIR || 'C:\\Program Files\\MariaDB 12.3\\bin'}`,`BACKUP_DIR=${path.join(root, 'app', 'backups')}`,''].join('\r\n');
    const envPath = path.join(root, 'app', 'pos-backend', '.env');
    await fs.writeFile(envPath, env, { flag: 'wx' });
    await fs.writeFile(path.join(root, 'app', 'backups', 'respaldo-anterior.txt'), 'conservar');
    await fs.copyFile(process.execPath, path.join(root, 'runtime', 'node.exe'));
    const staging = path.join(root, 'staging', 'payload');
    await fs.cp(stageSource, staging, { recursive: true, force: true });
    const envHashBefore = crypto.createHash('sha256').update(await fs.readFile(envPath)).digest('hex');
    const forceRollback = process.env.AUDIT_FORCE_UPDATE_ROLLBACK === '1';
    const args = ['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'..','..','packaging','actualizar.ps1'),'-BasePath',root,'-StagingPath',staging,'-SkipService'];
    if (forceRollback) args.push('-ForceFailureAfterMigration');
    const ps = spawnSync('powershell.exe', args, { encoding: 'utf8', env: { ...process.env, DB_NAME: database, SOURCE_ENV_PATH: envPath, POS_ENV_OVERRIDE: '1', EXPECTED_UPDATE_DATABASE: database } });
    if ((!forceRollback && ps.status !== 0) || (forceRollback && ps.status === 0)) throw new Error(`Resultado inesperado del actualizador: ${ps.stdout}\n${ps.stderr}`);
    const envNuevo = path.join(root, 'app', 'pos-backend', '.env');
    const envHashAfter = crypto.createHash('sha256').update(await fs.readFile(envNuevo)).digest('hex');
    const after = await snapshot(admin, before);
    const preserved = tables.every(t => before.tables[t].count === after.tables[t].count && before.tables[t].hash === after.tables[t].hash) && canonical(before.control) === canonical(after.control);
    const [migrations] = await admin.query('SELECT version FROM schema_migrations ORDER BY version');
    const backups = await fs.readdir(path.join(root, 'update-backups'), { recursive: true });
    const [newStructures] = await admin.query("SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND (TABLE_NAME IN ('sesiones_usuario','intentos_login') OR (TABLE_NAME='movimientos_inventario' AND COLUMN_NAME IN ('idempotency_key','idempotency_fingerprint'))) ORDER BY TABLE_NAME,COLUMN_NAME");
    const migrationStateOk = forceRollback ? !migrations.some(x => x.version === '011_sesiones_login_inventario.sql')
      : migrations.some(x => x.version === '011_sesiones_login_inventario.sql') && newStructures.length >= 4;
    const ok = preserved && envHashBefore === envHashAfter && migrationStateOk;
    console.log(JSON.stringify({ ok, mode: forceRollback ? 'ROLLBACK_INDUCIDO' : 'ACTUALIZACION', database, preserved, envPreserved: envHashBefore === envHashAfter,
      before, after, migrations: migrations.map(x => x.version), preUpdateBackup: backups.find(x => /^PRE_UPDATE_.*\.zip$/.test(path.basename(x))) || null,
      newStructures, priorBackupPreserved: await fs.readFile(path.join(root, 'app', 'backups', 'respaldo-anterior.txt'), 'utf8') === 'conservar' }, null, 2));
    if (!ok) throw new Error('La comparación antes/después del actualizador no fue exacta');
  } finally {
    await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await admin.end();
  }
}
main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
