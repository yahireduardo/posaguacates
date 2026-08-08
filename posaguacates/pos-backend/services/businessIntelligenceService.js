const db = require('../db/conexion');

async function getBusinessContext(database = db.promise) {
  const [[summaryRows], [inventoryRows], [trendRows]] = await Promise.all([
    database.query(`SELECT COUNT(*) ventas_30d, COALESCE(SUM(total),0) ingresos_30d,
      COALESCE(AVG(total),0) ticket_promedio,
      (SELECT COALESCE(SUM(saldo_pendiente),0) FROM cuentas_por_cobrar WHERE estado='PENDIENTE') deuda_pendiente
      FROM ventas WHERE estado_venta='ACTIVA' AND fecha>=DATE_SUB(CURDATE(),INTERVAL 30 DAY)`),
    database.query(`SELECT p.id,p.codigo,p.nombre,p.unidad,p.stock,p.stock_minimo,
      COALESCE(SUM(CASE WHEN v.fecha>=DATE_SUB(CURDATE(),INTERVAL 28 DAY) THEN d.cantidad ELSE 0 END)/4,0) venta_semanal_promedio
      FROM productos p LEFT JOIN detalle_venta d ON d.producto_id=p.id
      LEFT JOIN ventas v ON v.id=d.venta_id AND v.estado_venta='ACTIVA'
      WHERE p.activo=1 GROUP BY p.id,p.codigo,p.nombre,p.unidad,p.stock,p.stock_minimo
      HAVING p.stock<=p.stock_minimo OR p.stock<venta_semanal_promedio*1.5
      ORDER BY (p.stock<=p.stock_minimo) DESC,p.stock ASC LIMIT 20`),
    database.query(`SELECT p.id,p.nombre,
      COALESCE(SUM(CASE WHEN v.fecha>=DATE_SUB(CURDATE(),INTERVAL 30 DAY) THEN d.cantidad ELSE 0 END),0) actual,
      COALESCE(SUM(CASE WHEN v.fecha>=DATE_SUB(CURDATE(),INTERVAL 60 DAY) AND v.fecha<DATE_SUB(CURDATE(),INTERVAL 30 DAY) THEN d.cantidad ELSE 0 END),0) anterior,
      CASE WHEN SUM(CASE WHEN v.fecha>=DATE_SUB(CURDATE(),INTERVAL 60 DAY) AND v.fecha<DATE_SUB(CURDATE(),INTERVAL 30 DAY) THEN d.cantidad ELSE 0 END)>0
        THEN 100*(SUM(CASE WHEN v.fecha>=DATE_SUB(CURDATE(),INTERVAL 30 DAY) THEN d.cantidad ELSE 0 END)-SUM(CASE WHEN v.fecha>=DATE_SUB(CURDATE(),INTERVAL 60 DAY) AND v.fecha<DATE_SUB(CURDATE(),INTERVAL 30 DAY) THEN d.cantidad ELSE 0 END))/SUM(CASE WHEN v.fecha>=DATE_SUB(CURDATE(),INTERVAL 60 DAY) AND v.fecha<DATE_SUB(CURDATE(),INTERVAL 30 DAY) THEN d.cantidad ELSE 0 END)
        ELSE NULL END variacion_porcentaje
      FROM productos p LEFT JOIN detalle_venta d ON d.producto_id=p.id LEFT JOIN ventas v ON v.id=d.venta_id AND v.estado_venta='ACTIVA'
      WHERE p.activo=1 GROUP BY p.id,p.nombre ORDER BY actual DESC LIMIT 20`)
  ]);
  return { resumen: summaryRows[0] || {}, inventario: inventoryRows, tendencias: trendRows, generado_en: new Date().toISOString() };
}

module.exports = { getBusinessContext };
