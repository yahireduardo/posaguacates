const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
require('dotenv').config({ quiet: true });
const db = require('../db/conexion');

function extract(files, env = process.env) {
  const executable = String(env.PYTHON_COMMAND || 'python').trim();
  const script = path.join(__dirname, '..', 'ml', 'extract_historical_inventory.py');
  return new Promise((resolve, reject) => {
    const child = spawn(executable, [script, ...files], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '', errorOutput = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { errorOutput += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      if (code !== 0) return reject(new Error(errorOutput.trim() || `Python terminó con código ${code}`));
      try { return resolve(JSON.parse(output)); }
      catch { return reject(new Error('El extractor devolvió JSON inválido')); }
    });
  });
}

function sourceKey(record) {
  return crypto.createHash('sha256').update(['INVENTARIO_XLSX', record.file, record.sheet, record.date, '01'].join('|')).digest('hex');
}

async function importHistoricalDemand(files, database = db.promise) {
  if (!files.length) throw new Error('Indique al menos un archivo de inventario .xlsx');
  const extracted = await extract(files);
  const [[product]] = await database.query("SELECT id FROM productos WHERE codigo='01' AND activo=1 LIMIT 1");
  if (!product) throw new Error('No existe el producto activo con código 01');
  let imported = 0;
  for (const record of extracted.records) {
    await database.query(`INSERT INTO demanda_historica
      (producto_id,fecha,cantidad,unidad,origen,archivo,hoja,clasificaciones,clave_origen)
      VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE cantidad=VALUES(cantidad),clasificaciones=VALUES(clasificaciones)`,
    [product.id, record.date, record.quantity, 'CAJA', 'INVENTARIO_XLSX', record.file, record.sheet, record.classifications.join('; '), sourceKey(record)]);
    imported += 1;
  }
  const basenames = files.map(file => path.basename(file));
  const placeholders = basenames.map(() => '?').join(',');
  const [removed] = await database.query(
    `DELETE FROM demanda_historica WHERE origen='INVENTARIO_XLSX' AND archivo IN (${placeholders}) AND fecha>CURDATE()`,
    basenames
  );
  return { imported, futureRemoved: removed.affectedRows, warnings: extracted.warnings };
}

if (require.main === module) {
  importHistoricalDemand(process.argv.slice(2))
    .then(result => console.log(`Importación terminada: ${result.imported} lotes. Futuros excluidos: ${result.futureRemoved}. Advertencias: ${result.warnings.length}`))
    .catch(error => { console.error(`Importación cancelada: ${error.message}`); process.exitCode = 1; })
    .finally(() => db.promise.end());
}

module.exports = { extract, sourceKey, importHistoricalDemand };
