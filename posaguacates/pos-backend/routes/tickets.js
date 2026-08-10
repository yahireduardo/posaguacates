const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db/conexion');
const { jwtSecret } = require('../middleware/auth');

const router = express.Router();
const dinero = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2
});
const esc = valor => String(valor ?? '').replace(/[&<>'"]/g, caracter => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[caracter]));

router.get('/:ventaId', async (req, res) => {
  const ventaId = Number(req.params.ventaId);
  let payload;
  try {
    payload = jwt.verify(String(req.query.token || ''), jwtSecret(), { algorithms: ['HS256'] });
  } catch {
    return res.status(401).type('text').send('El enlace de impresión es inválido o expiró');
  }
  if (!Number.isInteger(ventaId) || ventaId <= 0 ||
      payload.proposito !== 'TICKET' || Number(payload.venta_id) !== ventaId) {
    return res.status(403).type('text').send('El enlace no corresponde a este ticket');
  }
  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    const [[venta]] = await connection.query(
      `SELECT v.id,v.fecha,v.total,v.tipo_pago,v.metodo_pago,v.referencia_pago,v.estado_venta,v.impresiones,
              x.saldo_pendiente,
              c.nombre_razon_social cliente,u.username cajero
       FROM ventas v
       LEFT JOIN clientes c ON c.id=v.cliente_id
       LEFT JOIN usuarios u ON u.id=v.usuario_id
       LEFT JOIN cuentas_por_cobrar x ON x.venta_id=v.id
       WHERE v.id=? FOR UPDATE`, [ventaId]
    );
    if (!venta) {
      await connection.rollback();
      return res.status(404).type('text').send('Venta no encontrada');
    }
    if (venta.estado_venta === 'CANCELADA') {
      await connection.rollback();
      return res.status(409).type('text').send('No se puede imprimir una venta cancelada');
    }
    const [productos] = await connection.query(
      `SELECT p.nombre,p.unidad,dv.cantidad,dv.precio_unitario,dv.subtotal
       FROM detalle_venta dv JOIN productos p ON p.id=dv.producto_id
       WHERE dv.venta_id=? ORDER BY dv.id`, [ventaId]
    );
    const [formasPago] = await connection.query(
      `SELECT metodo_pago,monto,referencia FROM venta_formas_pago WHERE venta_id=? ORDER BY id`, [ventaId]
    );
    const totalRecibido = Number(formasPago.reduce((s, forma) => s + Number(forma.monto), 0).toFixed(2));
    const cambio = formasPago.some(forma => forma.metodo_pago === 'EFECTIVO')
      ? Math.max(0, Number((totalRecibido - Number(venta.total)).toFixed(2))) : 0;
    const [[configuracion]] = await connection.query('SELECT * FROM configuracion_negocio WHERE id=1');
    const numeroImpresion = Number(venta.impresiones) + 1;
    const leyenda = numeroImpresion === 1 ? 'ORIGINAL' : 'COPIA';
    await connection.query(
      'UPDATE ventas SET impresiones=?,ultima_impresion_at=NOW() WHERE id=?',
      [numeroImpresion, ventaId]
    );
    await connection.commit();
    res.set('Cache-Control', 'no-store');
    return res.type('html').send(`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Ticket ${esc(venta.id)}</title><style>
@page{margin:5mm}body{width:72mm;margin:0 auto;padding:4mm;font-family:monospace;color:#000}
.logo-ticket{display:block;width:90px;max-width:70%;height:auto;margin:0 auto 8px}
header{text-align:center}h1{font-size:20px;margin:2px 0}h2{font-size:14px;margin:2px 0}
table{width:100%;border-collapse:collapse}th,td{padding:2px;text-align:left;vertical-align:top}
th:last-child,td:last-child{text-align:right}.total{text-align:right;font-size:18px}.meta{font-size:11px}
@media print{body{padding:0}}
</style></head><body>
<img src="${esc(configuracion?.logo?.startsWith('/')?configuracion.logo:'/assets/logo-ticket.png')}" class="logo-ticket" alt="Logo">
<header><h1>${esc(configuracion?.nombre_comercial||'AGUACATES HASS')}</h1><h2>${esc(configuracion?.razon_social||'')}</h2><h2>${leyenda}</h2></header>
<p class="meta">Folio: ${esc(venta.id)}<br>Cliente: ${esc(venta.cliente || 'Público general')}
<br>Cajero: ${esc(venta.cajero || 'Sin cajero')}<br>Fecha: ${esc(new Date(venta.fecha).toLocaleString('es-MX'))}
<br>Tipo de pago: ${esc(venta.tipo_pago)}<br>Método: ${esc(venta.metodo_pago || 'EFECTIVO')}</p>
<hr><table><thead><tr><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
<tbody>${productos.map(p => `<tr><td>${esc(p.nombre)}<br><small>${esc(p.unidad || '')}</small></td>
<td>${esc(p.cantidad)}</td><td>${dinero.format(Number(p.precio_unitario))}</td>
<td>${dinero.format(Number(p.subtotal))}</td></tr>`).join('')}</tbody></table>
<hr><h2 class="total">Total ${dinero.format(Number(venta.total))}</h2>
${venta.tipo_pago==='CONTADO'?`<p><strong>Forma de cobro</strong><br>${formasPago.map(f=>`${esc(f.metodo_pago)}: ${dinero.format(Number(f.monto))}${f.referencia?` · Ref. ${esc(f.referencia)}`:''}`).join('<br>')}${cambio>0?`<br><strong>Cambio: ${dinero.format(cambio)}</strong>`:''}</p>`:''}
${venta.tipo_pago==='CREDITO'?`<p>Saldo pendiente: ${dinero.format(Number(venta.saldo_pendiente||0))}</p>`:''}
<p>${esc(configuracion?.mensaje_ticket||'Gracias por su compra')}</p>
<script src="/js/ticket.js" defer></script></body></html>`);
  } catch (error) {
    await connection.rollback();
    console.error('Error renderizando ticket:', { ventaId, code: error.code, message: error.message });
    return res.status(500).type('text').send('No fue posible generar el ticket');
  } finally {
    connection.release();
  }
});

module.exports = router;
