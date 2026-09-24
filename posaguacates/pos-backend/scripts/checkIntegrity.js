require('dotenv').config({ path: process.env.SOURCE_ENV_PATH || undefined, override: process.env.POS_ENV_OVERRIDE === '1', quiet: true });
const db = require('../db/conexion');

const checks = [
  ['stock_negativo', 'SELECT COUNT(*) total FROM productos WHERE stock<0'],
  ['cxc_pagada_con_saldo', "SELECT COUNT(*) total FROM cuentas_por_cobrar WHERE estado='PAGADO' AND saldo_pendiente<>0"],
  ['cxc_pendiente_sin_saldo', "SELECT COUNT(*) total FROM cuentas_por_cobrar WHERE estado='PENDIENTE' AND saldo_pendiente<=0"],
  ['cxc_saldo_fuera_de_rango', 'SELECT COUNT(*) total FROM cuentas_por_cobrar WHERE saldo_pendiente<0 OR saldo_pendiente>total_deuda'],
  ['venta_total_distinto_detalle', `SELECT COUNT(*) total FROM ventas v LEFT JOIN
    (SELECT venta_id,ROUND(SUM(subtotal),2) total FROM detalle_venta GROUP BY venta_id) d ON d.venta_id=v.id
    WHERE v.estado_venta='ACTIVA' AND ABS(v.total-COALESCE(d.total,0))>0.005`],
  ['compra_total_distinto_detalle', `SELECT COUNT(*) total FROM compras c LEFT JOIN
    (SELECT compra_id,ROUND(SUM(subtotal),2) total FROM detalle_compra GROUP BY compra_id) d ON d.compra_id=c.id
    WHERE c.estado='ACTIVA' AND ABS(c.total-COALESCE(d.total,0))>0.005`],
  ['pago_total_distinto_aplicaciones', `SELECT COUNT(*) total FROM pagos p LEFT JOIN
    (SELECT pago_id,ROUND(SUM(monto_aplicado),2) total FROM aplicaciones_pago WHERE estado='ACTIVA' GROUP BY pago_id) a ON a.pago_id=p.id
    WHERE p.estado='ACTIVO' AND a.pago_id IS NOT NULL AND ABS(p.monto_total-a.total)>0.005`],
  ['detalle_venta_huerfano', 'SELECT COUNT(*) total FROM detalle_venta d LEFT JOIN ventas v ON v.id=d.venta_id WHERE v.id IS NULL'],
  ['detalle_producto_huerfano', 'SELECT COUNT(*) total FROM detalle_venta d LEFT JOIN productos p ON p.id=d.producto_id WHERE p.id IS NULL'],
  ['movimiento_inventario_huerfano', 'SELECT COUNT(*) total FROM movimientos_inventario m LEFT JOIN productos p ON p.id=m.producto_id WHERE p.id IS NULL'],
  ['aplicacion_activa_pago_cancelado', "SELECT COUNT(*) total FROM aplicaciones_pago a JOIN pagos p ON p.id=a.pago_id WHERE a.estado='ACTIVA' AND p.estado='CANCELADO'"],
  ['forma_venta_distinta_total', `SELECT COUNT(*) total FROM ventas v JOIN
    (SELECT venta_id,ROUND(SUM(monto),2) total FROM venta_formas_pago GROUP BY venta_id) f ON f.venta_id=v.id
    WHERE v.estado_venta='ACTIVA' AND v.tipo_pago='CONTADO' AND ABS(v.total-f.total)>0.005`],
  ['forma_pago_distinta_total', `SELECT COUNT(*) total FROM pagos p JOIN
    (SELECT pago_id,ROUND(SUM(monto),2) total FROM pago_formas_pago GROUP BY pago_id) f ON f.pago_id=p.id
    WHERE p.estado='ACTIVO' AND ABS(p.monto_total-f.total)>0.005`]
];

(async () => {
  if (process.env.EXPECTED_UPDATE_DATABASE && process.env.DB_NAME !== process.env.EXPECTED_UPDATE_DATABASE) {
    throw new Error('Integridad abortada: DB_NAME no coincide con la base esperada');
  }
  const results = {};
  for (const [name, sql] of checks) {
    const [[row]] = await db.promise.query(sql);
    results[name] = Number(row.total);
  }
  const failures = Object.entries(results).filter(([, total]) => total !== 0);
  const diagnostics = {};
  if (results.pago_total_distinto_aplicaciones) {
    const [rows] = await db.promise.query(`SELECT p.id,p.monto_total,p.estado,COALESCE(SUM(CASE WHEN a.estado='ACTIVA' THEN a.monto_aplicado ELSE 0 END),0) aplicado
      FROM pagos p LEFT JOIN aplicaciones_pago a ON a.pago_id=p.id WHERE p.estado='ACTIVO'
      GROUP BY p.id,p.monto_total,p.estado HAVING ABS(p.monto_total-aplicado)>0.005`);
    diagnostics.pagos = rows;
  }
  console.log(JSON.stringify({ database: process.env.DB_NAME, results, diagnostics, ok: failures.length === 0 }, null, 2));
  if (failures.length) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.promise.end());
