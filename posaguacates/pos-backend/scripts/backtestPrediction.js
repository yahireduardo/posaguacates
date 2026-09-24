const path = require('path');
require('dotenv').config({ path: process.env.SOURCE_ENV_PATH || path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const proyectar = semanas => {
  const valores = semanas.map(x => Math.max(0, Number(x.cantidad) || 0));
  if (!valores.length) return { estimado: 0 };
  const peso = valores.length * (valores.length + 1) / 2;
  return { estimado: valores.reduce((s, v, i) => s + v * (i + 1), 0) / peso };
};

const metricas = pares => {
  if (!pares.length) return null;
  const errores = pares.map(({ real, pred }) => real - pred);
  return {
    n: pares.length,
    mae: errores.reduce((s, e) => s + Math.abs(e), 0) / pares.length,
    rmse: Math.sqrt(errores.reduce((s, e) => s + e ** 2, 0) / pares.length),
    mape: (() => {
      const validos = pares.filter(x => x.real !== 0);
      return validos.length ? validos.reduce((s, x) => s + Math.abs((x.real - x.pred) / x.real), 0) / validos.length * 100 : null;
    })()
  };
};

async function main() {
  const db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    const [bounds] = await db.query("SELECT MIN(DATE_SUB(DATE(fecha),INTERVAL WEEKDAY(fecha) DAY)) minimo, MAX(DATE_SUB(DATE(fecha),INTERVAL WEEKDAY(fecha) DAY)) maximo FROM ventas WHERE estado_venta='ACTIVA'");
    const [rows] = await db.query("SELECT d.producto_id, DATE_FORMAT(DATE_SUB(DATE(v.fecha),INTERVAL WEEKDAY(v.fecha) DAY),'%Y-%m-%d') semana, SUM(d.cantidad) cantidad FROM ventas v JOIN detalle_venta d ON d.venta_id=v.id WHERE v.estado_venta='ACTIVA' GROUP BY d.producto_id,semana ORDER BY d.producto_id,semana");
    const porProducto = new Map();
    for (const row of rows) {
      if (!porProducto.has(row.producto_id)) porProducto.set(row.producto_id, new Map());
      porProducto.get(row.producto_id).set(row.semana, Number(row.cantidad));
    }
    const inicio = bounds[0]?.minimo && new Date(bounds[0].minimo);
    const fin = bounds[0]?.maximo && new Date(bounds[0].maximo);
    const semanas = [];
    if (inicio && fin) for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 7)) semanas.push(d.toISOString().slice(0, 10));
    const pares = { actual: [], ultima_semana: [], promedio_historico: [], promedio_movil_4: [] };
    let productosEvaluados = 0;
    for (const mapa of porProducto.values()) {
      const serie = semanas.map(semana => mapa.get(semana) || 0);
      if (serie.length < 13) continue;
      productosEvaluados++;
      for (let i = 12; i < serie.length; i++) {
        const historial = serie.slice(0, i), ventana = historial.slice(-12), real = serie[i];
        pares.actual.push({ real, pred: proyectar(ventana.map(cantidad => ({ cantidad }))).estimado });
        pares.ultima_semana.push({ real, pred: historial.at(-1) });
        pares.promedio_historico.push({ real, pred: historial.reduce((a, b) => a + b, 0) / historial.length });
        const cuatro = historial.slice(-4);
        pares.promedio_movil_4.push({ real, pred: cuatro.reduce((a, b) => a + b, 0) / cuatro.length });
      }
    }
    console.log(JSON.stringify({ database: process.env.DB_NAME, soloLectura: true, semanasDisponibles: semanas.length, productosEvaluados, resultados: Object.fromEntries(Object.entries(pares).map(([k, v]) => [k, metricas(v)])) }, null, 2));
  } finally { await db.end(); }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
