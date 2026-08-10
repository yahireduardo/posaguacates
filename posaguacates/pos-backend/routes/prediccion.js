const express = require('express');
const db = require('../db/conexion');
const { runForecast } = require('../services/demandForecastService');

const router = express.Router();

function proyectar(semanas) {
  const valores = semanas.map(item => Math.max(0, Number(item.cantidad) || 0));
  if (!valores.length) return { estimado: 0, incertidumbre: 0, muestra: 0 };
  const pesos = valores.map((_, index) => index + 1);
  const peso = pesos.reduce((sum, value) => sum + value, 0);
  const estimado = valores.reduce((sum, value, index) => sum + value * pesos[index], 0) / peso;
  const promedio = valores.reduce((sum, value) => sum + value, 0) / valores.length;
  const desviacion = Math.sqrt(valores.reduce((sum, value) => sum + (value - promedio) ** 2, 0) / valores.length);
  return { estimado: Math.max(0, estimado), incertidumbre: desviacion, muestra: valores.length };
}

function mondayKey(value) {
  const date = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function completeWeeks(rows) {
  if (!rows.length) return [];
  const byDate = new Map(rows.map(row => [mondayKey(row.semana_inicio), Number(row.cantidad) || 0]));
  const start = new Date(`${mondayKey(rows[0].semana_inicio)}T00:00:00Z`);
  const end = new Date(`${mondayKey(rows.at(-1).semana_inicio)}T00:00:00Z`);
  const weeks = [];
  for (const current = new Date(start); current <= end; current.setUTCDate(current.getUTCDate() + 7)) {
    const key = current.toISOString().slice(0, 10);
    weeks.push({ semana: key, cantidad: byDate.get(key) || 0 });
  }
  return weeks;
}

async function predictionData(database = db.promise, productId = null) {
  const params = [], where = productId ? 'AND p.id=?' : '';
  if (productId) params.push(productId);
  const [[rows], [historicalRows]] = await Promise.all([
    database.query(`SELECT p.id,p.codigo,p.nombre,p.unidad,
      DATE_SUB(DATE(v.fecha),INTERVAL WEEKDAY(v.fecha) DAY) semana_inicio,SUM(d.cantidad) cantidad
      FROM productos p LEFT JOIN detalle_venta d ON d.producto_id=p.id
      LEFT JOIN ventas v ON v.id=d.venta_id AND v.estado_venta='ACTIVA'
        AND v.fecha<DATE_SUB(CURDATE(),INTERVAL WEEKDAY(CURDATE()) DAY)
      WHERE p.activo=1 ${where}
      GROUP BY p.id,p.codigo,p.nombre,p.unidad,semana_inicio ORDER BY p.id,semana_inicio`, params),
    database.query(`SELECT h.producto_id id,
      DATE_SUB(h.fecha,INTERVAL WEEKDAY(h.fecha) DAY) semana_inicio,SUM(h.cantidad) cantidad
      FROM demanda_historica h JOIN productos p ON p.id=h.producto_id
      WHERE p.activo=1 AND h.fecha<DATE_SUB(CURDATE(),INTERVAL WEEKDAY(CURDATE()) DAY) ${productId ? 'AND p.id=?' : ''}
      GROUP BY h.producto_id,semana_inicio ORDER BY h.producto_id,semana_inicio`, params)
  ]);
  const products = new Map();
  for (const row of rows) {
    if (!products.has(row.id)) products.set(row.id, { producto_id: row.id, codigo: row.codigo, nombre: row.nombre, unidad: row.unidad, raw: [], semanas_pos_disponibles: 0 });
    if (row.semana_inicio) products.get(row.id).raw.push({ ...row, fuente: 'VENTAS_POS' });
  }
  for (const product of products.values()) {
    product.semanas_pos_disponibles = product.raw.length;
    if (product.semanas_pos_disponibles < 4) product.raw = [];
  }
  for (const row of historicalRows) {
    const product = products.get(row.id);
    if (!product || !row.semana_inicio) continue;
    const key = mondayKey(row.semana_inicio);
    if (!product.raw.some(item => mondayKey(item.semana_inicio) === key)) product.raw.push({ ...row, fuente: 'INVENTARIO_HISTORICO' });
  }
  return [...products.values()].map(product => {
    product.raw.sort((a, b) => String(mondayKey(a.semana_inicio)).localeCompare(String(mondayKey(b.semana_inicio))));
    return {
      ...product,
      semanas: completeWeeks(product.raw),
      semanas_historicas: product.raw.filter(item => item.fuente === 'INVENTARIO_HISTORICO').length,
      semanas_pos: product.raw.filter(item => item.fuente === 'VENTAS_POS').length,
      semanas_pos_disponibles: product.semanas_pos_disponibles
    };
  });
}

router.get('/', async (req, res, next) => {
  const productId = req.query.producto_id ? Number(req.query.producto_id) : null;
  try {
    const products = await predictionData(db.promise, productId);
    let mlByProduct = new Map(), mlWarning = null;
    try {
      const ml = await runForecast(products.map(product => ({ product_id: product.producto_id, values: product.semanas.map(week => week.cantidad) })));
      mlByProduct = new Map((ml.products || []).map(item => [Number(item.product_id), item]));
    } catch (error) {
      mlWarning = `${error.message}. Se conserva el método local.`;
    }
    const predicciones = products.map(product => {
      const local = proyectar(product.semanas.slice(-12));
      const ml = mlByProduct.get(Number(product.producto_id));
      const comparable = Boolean(ml?.available);
      const winner = comparable ? ml.winner : 'PROMEDIO_PONDERADO_LOCAL';
      const estimate = comparable ? ml.prediction : local.estimado;
      return {
        producto_id: product.producto_id, codigo: product.codigo, nombre: product.nombre, unidad: product.unidad,
        estimado_proxima_semana: Number(estimate.toFixed(2)), incertidumbre: Number(local.incertidumbre.toFixed(2)),
        metodo: winner, metodo_actual: 'PROMEDIO_PONDERADO_LOCAL', ganador: winner,
        comparacion: comparable ? { semanas_validacion: ml.validation_weeks, metricas: ml.metrics, pronosticos: ml.forecasts } : null,
        observacion: comparable
          ? `Ganó ${winner} por menor MAE en ${ml.validation_weeks} semanas no usadas para ajustar cada predicción.`
          : (ml?.reason || (local.muestra < 4 ? 'Historial insuficiente: use la estimación con cautela.' : 'No fue posible comparar con scikit-learn.')),
        periodo: 'PRÓXIMA_SEMANA', semanas_disponibles: product.semanas.length,
        fuentes: {
          semanas_inventario_historico: product.semanas_historicas,
          semanas_ventas_pos_usadas: product.semanas_pos,
          semanas_ventas_pos_disponibles: product.semanas_pos_disponibles,
          minimo_semanas_pos_para_sustituir_historico: 4
        }
      };
    });
    return res.json({
      predicciones,
      motor_ml: mlWarning ? 'NO_DISPONIBLE' : 'SCIKIT_LEARN', advertencia_ml: mlWarning,
      criterio_ganador: 'Menor MAE; RMSE se usa para desempatar.',
      limitaciones: 'No considera clima, promociones, mermas ni eventos externos. Los ceros representan semanas sin ventas registradas.'
    });
  } catch (error) { return next(error); }
});

module.exports = router;
module.exports.proyectar = proyectar;
module.exports.completeWeeks = completeWeeks;
module.exports.predictionData = predictionData;
