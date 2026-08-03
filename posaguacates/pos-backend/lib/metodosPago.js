const METODOS = new Set(['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE']);

function error(mensaje) { return Object.assign(new Error(mensaje), { status: 400 }); }

function normalizarMetodosPago(body, total, { metodo = 'metodo_pago', referencia = 'referencia' } = {}) {
  const esperado = Number(Number(total).toFixed(2));
  const entrada = Array.isArray(body.metodos_pago) && body.metodos_pago.length
    ? body.metodos_pago
    : [{ metodo_pago: body[metodo] || 'EFECTIVO', monto: esperado, referencia: body[referencia] }];
  if (!Number.isFinite(esperado) || esperado <= 0 || entrada.length > 3) throw error('El total del cobro no es válido');
  const vistos = new Set();
  const metodos = entrada.map(item => {
    const nombre = String(item.metodo_pago || '').trim().toUpperCase();
    const monto = Number(Number(item.monto).toFixed(2));
    const ref = String(item.referencia || '').trim() || null;
    if (!METODOS.has(nombre) || !Number.isFinite(monto) || monto <= 0) throw error('Cada método debe tener un monto positivo');
    if (vistos.has(nombre)) throw error(`El método ${nombre} está repetido`);
    if (nombre !== 'EFECTIVO' && !ref) throw error(`La referencia es obligatoria para ${nombre.toLowerCase()}`);
    vistos.add(nombre);
    return { metodo_pago: nombre, monto, referencia: ref };
  });
  const suma = Number(metodos.reduce((s, item) => s + item.monto, 0).toFixed(2));
  if (Math.abs(suma - esperado) > 0.005) throw error('La suma de los métodos de pago debe coincidir con el total');
  return {
    metodos,
    metodo_resumen: metodos.length > 1 ? 'MIXTO' : metodos[0].metodo_pago,
    referencia_resumen: metodos.length === 1 ? metodos[0].referencia : null
  };
}

async function insertarMetodosPago(connection, tabla, llave, id, metodos) {
  for (const item of metodos) {
    await connection.query(
      `INSERT INTO ${tabla} (${llave},metodo_pago,monto,referencia) VALUES (?,?,?,?)`,
      [id, item.metodo_pago, item.monto, item.referencia]
    );
  }
}

module.exports = { normalizarMetodosPago, insertarMetodosPago };
