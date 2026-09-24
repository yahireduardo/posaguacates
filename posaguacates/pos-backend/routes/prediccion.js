const express = require('express');
const db = require('../db/conexion');
const router = express.Router();

function proyectar(semanas) {
  const valores = semanas.map(x => Math.max(0, Number(x.cantidad) || 0));
  if (!valores.length) return { estimado: 0, incertidumbre: 0, muestra: 0 };
  const pesos = valores.map((_, i) => i + 1), peso = pesos.reduce((a, b) => a + b, 0);
  const estimado = valores.reduce((s, v, i) => s + v * pesos[i], 0) / peso;
  const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
  const desviacion = Math.sqrt(valores.reduce((s, v) => s + (v - promedio) ** 2, 0) / valores.length);
  return { estimado: Math.max(0, estimado), incertidumbre: desviacion, muestra: valores.length };
}

function claveFecha(value) {
  const fecha = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00Z`);
  return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString().slice(0, 10);
}

function completarSemanas(semanas, finExclusivo = null, total = 12) {
  const ordenadas = semanas.map(x => ({ semana: claveFecha(x.semana_inicio || x.semana), cantidad: Number(x.cantidad) || 0 }))
    .filter(x => x.semana).sort((a, b) => a.semana.localeCompare(b.semana));
  const cantidades = new Map(ordenadas.map(x => [x.semana, x.cantidad]));
  const fin = finExclusivo ? new Date(`${claveFecha(finExclusivo)}T00:00:00Z`) : new Date(`${ordenadas.at(-1)?.semana || ''}T00:00:00Z`);
  if (Number.isNaN(fin.getTime())) return [];
  if (finExclusivo) fin.setUTCDate(fin.getUTCDate() - 7);
  const inicio = finExclusivo ? new Date(fin) : new Date(`${ordenadas[0].semana}T00:00:00Z`);
  if (finExclusivo) inicio.setUTCDate(inicio.getUTCDate() - (Math.max(1, total) - 1) * 7);
  const completas = [];
  for (const fecha = new Date(inicio); fecha <= fin; fecha.setUTCDate(fecha.getUTCDate() + 7)) {
    const semana = fecha.toISOString().slice(0, 10);
    completas.push({ semana, cantidad: cantidades.get(semana) || 0 });
  }
  return completas;
}

router.get('/', async (req, res, next) => {
  const productoId = req.query.producto_id ? Number(req.query.producto_id) : null;
  if (productoId !== null && (!Number.isInteger(productoId) || productoId <= 0)) return res.status(400).json({ error: 'Producto inválido' });
  try {
    const params = [], where = productoId ? 'AND p.id=?' : '';
    if (productoId) params.push(productoId);
    const [rows] = await db.promise.query(
      `SELECT p.id,p.codigo,p.nombre,p.unidad,
              DATE_SUB(CURDATE(),INTERVAL WEEKDAY(CURDATE()) DAY) semana_actual,
              DATE_SUB(DATE(v.fecha),INTERVAL WEEKDAY(v.fecha) DAY) semana_inicio,SUM(d.cantidad) cantidad
       FROM productos p LEFT JOIN detalle_venta d ON d.producto_id=p.id
       LEFT JOIN ventas v ON v.id=d.venta_id AND v.estado_venta='ACTIVA'
         AND v.fecha>=DATE_SUB(DATE_SUB(CURDATE(),INTERVAL WEEKDAY(CURDATE()) DAY),INTERVAL 12 WEEK)
         AND v.fecha<DATE_SUB(CURDATE(),INTERVAL WEEKDAY(CURDATE()) DAY)
       WHERE p.activo=1 ${where}
       GROUP BY p.id,p.codigo,p.nombre,p.unidad,semana_inicio ORDER BY p.id,semana_inicio`, params
    );
    const mapa = new Map();
    for (const row of rows) {
      if (!mapa.has(row.id)) mapa.set(row.id, { producto_id: row.id, codigo: row.codigo, nombre: row.nombre, unidad: row.unidad, semana_actual: row.semana_actual, semanas: [] });
      if (row.semana_inicio) mapa.get(row.id).semanas.push({ semana_inicio: row.semana_inicio, cantidad: Number(row.cantidad) });
    }
    const predicciones = [...mapa.values()].map(producto => {
      producto.semanas = completarSemanas(producto.semanas, producto.semana_actual, 12);
      delete producto.semana_actual;
      const calculo = proyectar(producto.semanas);
      return { ...producto, estimado_proxima_semana: Number(calculo.estimado.toFixed(2)), incertidumbre: Number(calculo.incertidumbre.toFixed(2)), observacion: calculo.muestra < 4 ? 'Historial insuficiente: use la estimación con cautela.' : 'Promedio ponderado local de hasta 12 semanas, incluyendo semanas sin ventas; no garantiza demanda futura.', metodo: 'PROMEDIO_PONDERADO_LOCAL', periodo: 'PRÓXIMA_SEMANA' };
    });
    return res.json({ predicciones, limitaciones: 'No considera clima, promociones, mermas ni eventos externos.' });
  } catch (error) { return next(error); }
});

module.exports = router;
module.exports.proyectar = proyectar;
module.exports.completarSemanas = completarSemanas;
