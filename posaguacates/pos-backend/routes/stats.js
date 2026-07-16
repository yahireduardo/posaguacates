const express = require('express');
const db = require('../db/conexion');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [[hoy], [clientes], [deuda], [productos], [topClientes], [semanal]] = await Promise.all([
      db.promise.query(`SELECT COUNT(*) AS ventas_hoy, COALESCE(SUM(total),0) AS ingresos_hoy FROM ventas WHERE DATE(fecha)=CURDATE() AND estado_venta='ACTIVA'`),
      db.promise.query('SELECT COUNT(*) AS clientes FROM clientes WHERE activo=1'),
      db.promise.query("SELECT COALESCE(SUM(saldo_pendiente),0) AS deuda_total FROM cuentas_por_cobrar WHERE estado='PENDIENTE'"),
      db.promise.query(`SELECT p.nombre, SUM(dv.cantidad) AS total FROM detalle_venta dv JOIN ventas v ON v.id=dv.venta_id JOIN productos p ON p.id=dv.producto_id WHERE v.estado_venta='ACTIVA' GROUP BY p.id,p.nombre ORDER BY total DESC LIMIT 5`),
      db.promise.query(`SELECT c.nombre_razon_social, SUM(v.total) AS total FROM ventas v JOIN clientes c ON c.id=v.cliente_id WHERE v.estado_venta='ACTIVA' GROUP BY c.id,c.nombre_razon_social ORDER BY total DESC LIMIT 5`),
      db.promise.query(`SELECT DATE(fecha) AS dia, COUNT(*) AS ventas, COALESCE(SUM(total),0) AS total FROM ventas WHERE estado_venta='ACTIVA' AND fecha >= CURDATE() - INTERVAL 6 DAY GROUP BY DATE(fecha) ORDER BY dia`)
    ]);
    res.json({ ...hoy[0], clientes: clientes[0].clientes, deuda_total: deuda[0].deuda_total,
      top_productos: productos, top_clientes: topClientes, semanal });
  } catch (error) { console.error(error); res.status(500).json({ error: 'No fue posible cargar el dashboard' }); }
});

module.exports = router;
