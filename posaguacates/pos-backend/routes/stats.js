const express = require('express');
const db = require('../db/conexion');
const router = express.Router();
const { permitirRoles } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const [[hoy], [periodos], [clientes], [deuda], [pagos], [compras], [stockBajo], [productos], [topClientes], [deudores], [semanal]] = await Promise.all([
      db.promise.query(`SELECT COUNT(*) ventas_hoy,COALESCE(SUM(total),0) ingresos_hoy,COALESCE(SUM(tipo_pago='CONTADO'),0) contado_hoy,COALESCE(SUM(tipo_pago='CREDITO'),0) credito_hoy FROM ventas WHERE DATE(fecha)=CURDATE() AND estado_venta='ACTIVA'`),
      db.promise.query(`SELECT COALESCE(SUM(fecha>=DATE_SUB(CURDATE(),INTERVAL WEEKDAY(CURDATE()) DAY)),0) ventas_semana,COALESCE(SUM(CASE WHEN fecha>=DATE_SUB(CURDATE(),INTERVAL WEEKDAY(CURDATE()) DAY) THEN total ELSE 0 END),0) ingresos_semana,COALESCE(SUM(fecha>=DATE_FORMAT(CURDATE(),'%Y-%m-01')),0) ventas_mes,COALESCE(SUM(CASE WHEN fecha>=DATE_FORMAT(CURDATE(),'%Y-%m-01') THEN total ELSE 0 END),0) ingresos_mes FROM ventas WHERE estado_venta='ACTIVA'`),
      db.promise.query('SELECT COUNT(*) AS clientes FROM clientes WHERE activo=1'),
      db.promise.query("SELECT COALESCE(SUM(saldo_pendiente),0) AS deuda_total FROM cuentas_por_cobrar WHERE estado='PENDIENTE'"),
      db.promise.query("SELECT COALESCE(SUM(monto_total),0) pagos_mes FROM pagos WHERE estado='ACTIVO' AND fecha>=DATE_FORMAT(CURDATE(),'%Y-%m-01')"),
      db.promise.query("SELECT COALESCE(SUM(total),0) compras_mes FROM compras WHERE estado='ACTIVA' AND fecha>=DATE_FORMAT(CURDATE(),'%Y-%m-01')"),
      db.promise.query('SELECT COUNT(*) stock_bajo FROM productos WHERE activo=1 AND stock<=stock_minimo'),
      db.promise.query(`SELECT p.nombre, SUM(dv.cantidad) AS total FROM detalle_venta dv JOIN ventas v ON v.id=dv.venta_id JOIN productos p ON p.id=dv.producto_id WHERE v.estado_venta='ACTIVA' GROUP BY p.id,p.nombre ORDER BY total DESC LIMIT 5`),
      db.promise.query(`SELECT c.nombre_razon_social, SUM(v.total) AS total FROM ventas v JOIN clientes c ON c.id=v.cliente_id WHERE v.estado_venta='ACTIVA' GROUP BY c.id,c.nombre_razon_social ORDER BY total DESC LIMIT 5`),
      db.promise.query(`SELECT c.nombre_razon_social,SUM(x.saldo_pendiente) deuda FROM cuentas_por_cobrar x JOIN clientes c ON c.id=x.cliente_id WHERE x.estado='PENDIENTE' GROUP BY c.id,c.nombre_razon_social ORDER BY deuda DESC LIMIT 5`),
      db.promise.query(`SELECT DATE(fecha) AS dia, COUNT(*) AS ventas, COALESCE(SUM(total),0) AS total FROM ventas WHERE estado_venta='ACTIVA' AND fecha >= CURDATE() - INTERVAL 6 DAY GROUP BY DATE(fecha) ORDER BY dia`)
    ]);
    res.json({ ...hoy[0],...periodos[0],clientes:clientes[0].clientes,deuda_total:deuda[0].deuda_total,
      pagos_mes:pagos[0].pagos_mes,compras_mes:compras[0].compras_mes,stock_bajo:stockBajo[0].stock_bajo,
      top_productos:productos,top_clientes:topClientes,top_deudores:deudores,semanal,actualizado_en:new Date().toISOString() });
  } catch (error) { console.error(error); res.status(500).json({ error: 'No fue posible cargar el dashboard' }); }
});

function filtrosReporte(query) {
  const where = [];
  const params = [];
  if (query.fecha_inicio) { where.push('v.fecha >= ?'); params.push(`${query.fecha_inicio} 00:00:00`); }
  if (query.fecha_fin) { where.push('v.fecha < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(query.fecha_fin); }
  for (const [campo, columna] of [['cliente_id', 'v.cliente_id'], ['producto_id', 'dv.producto_id'], ['usuario_id', 'v.usuario_id']]) {
    const id = Number(query[campo]);
    if (Number.isInteger(id) && id > 0) { where.push(`${columna} = ?`); params.push(id); }
  }
  const pago = String(query.tipo_pago || '').toUpperCase();
  if (['CONTADO', 'CREDITO'].includes(pago)) { where.push('v.tipo_pago = ?'); params.push(pago); }
  if (String(query.incluir_canceladas || '0') !== '1') where.push("v.estado_venta <> 'CANCELADA'");
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

router.get('/productos-por-cliente', permitirRoles('ADMON_GRAL'), async (req, res) => {
  const filtro = filtrosReporte(req.query);
  const ordenes = { cliente: 'c.nombre_razon_social,p.nombre', producto: 'p.nombre,c.nombre_razon_social',
    cantidad: 'cantidad_vendida DESC', ingresos: 'ingresos_generados DESC' };
  const orden = ordenes[req.query.orden] || ordenes.cliente;
  try {
    const [rows] = await db.promise.query(
      `SELECT c.id cliente_id,c.nombre_razon_social cliente,p.id producto_id,p.codigo,p.nombre producto,p.unidad,
              SUM(dv.cantidad) cantidad_vendida,SUM(dv.subtotal) ingresos_generados
       FROM ventas v JOIN detalle_venta dv ON dv.venta_id=v.id
       JOIN productos p ON p.id=dv.producto_id JOIN clientes c ON c.id=v.cliente_id
       ${filtro.sql} GROUP BY c.id,c.nombre_razon_social,p.id,p.codigo,p.nombre,p.unidad ORDER BY ${orden}`, filtro.params
    );
    const totalesUnidad = Object.values(rows.reduce((acc, r) => {
      const unidad = r.unidad || 'SIN_UNIDAD';
      acc[unidad] = acc[unidad] || { unidad, cantidad: 0 };
      acc[unidad].cantidad += Number(r.cantidad_vendida);
      return acc;
    }, {}));
    res.json({ datos: rows,
      total_cantidad: totalesUnidad.length === 1 ? totalesUnidad[0].cantidad : null,
      totales_por_unidad: totalesUnidad,
      total_ingresos: rows.reduce((s, r) => s + Number(r.ingresos_generados), 0) });
  } catch (e) { res.status(500).json({ error: 'No fue posible generar el reporte' }); }
});

router.get('/producto-mas-vendido', permitirRoles('ADMON_GRAL'), async (req, res) => {
  const filtro = filtrosReporte(req.query);
  try {
    const [[row]] = await db.promise.query(
      `SELECT p.id producto_id,p.codigo,p.nombre,p.unidad,SUM(dv.cantidad) cantidad_total,
              SUM(dv.subtotal) ingresos_generados
       FROM ventas v JOIN detalle_venta dv ON dv.venta_id=v.id JOIN productos p ON p.id=dv.producto_id
       ${filtro.sql} GROUP BY p.id,p.codigo,p.nombre,p.unidad ORDER BY cantidad_total DESC,p.id LIMIT 1`, filtro.params
    );
    res.json({ producto: row || null, periodo: { fecha_inicio: req.query.fecha_inicio || null, fecha_fin: req.query.fecha_fin || null } });
  } catch (e) { res.status(500).json({ error: 'No fue posible calcular el producto más vendido' }); }
});

router.get('/productos-global', permitirRoles('ADMON_GRAL'), async (req, res) => {
  const filtro = filtrosReporte(req.query);
  try {
    const [rows] = await db.promise.query(
      `SELECT p.id producto_id,p.codigo,p.nombre producto,p.unidad,
              SUM(dv.cantidad) cantidad_vendida,SUM(dv.subtotal) ingresos_generados,
              COUNT(DISTINCT v.id) numero_ventas
       FROM ventas v JOIN detalle_venta dv ON dv.venta_id=v.id
       JOIN productos p ON p.id=dv.producto_id
       ${filtro.sql}
       GROUP BY p.id,p.codigo,p.nombre,p.unidad
       ORDER BY cantidad_vendida DESC,p.nombre`, filtro.params
    );
    res.json({ datos: rows, periodo: { fecha_inicio: req.query.fecha_inicio || null, fecha_fin: req.query.fecha_fin || null } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No fue posible generar el histórico global de productos' });
  }
});

router.get('/clientes-compras', permitirRoles('ADMON_GRAL'), async (req, res) => {
  const filtro = filtrosReporte(req.query);
  try {
    const [rows] = await db.promise.query(
      `SELECT c.id cliente_id,c.nombre_razon_social cliente,
              COUNT(DISTINCT v.id) numero_ventas,SUM(dv.subtotal) total_comprado,
              MIN(v.fecha) primera_compra,MAX(v.fecha) ultima_compra
       FROM ventas v JOIN detalle_venta dv ON dv.venta_id=v.id
       JOIN clientes c ON c.id=v.cliente_id
       ${filtro.sql}
       GROUP BY c.id,c.nombre_razon_social
       ORDER BY total_comprado DESC,c.nombre_razon_social`, filtro.params
    );
    res.json({ datos: rows, periodo: { fecha_inicio: req.query.fecha_inicio || null, fecha_fin: req.query.fecha_fin || null } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No fue posible generar el histórico de compras por cliente' });
  }
});

module.exports = router;
