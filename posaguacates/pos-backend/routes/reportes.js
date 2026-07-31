const express = require('express');
const PDFDocument = require('pdfkit');
const db = require('../db/conexion');
const { permitirRoles } = require('../middleware/auth');

const router = express.Router();
router.use(permitirRoles('ADMON_GRAL'));

const reportesCsv={
  ventas:`SELECT v.id folio,v.fecha,c.nombre_razon_social cliente,u.username usuario,v.tipo_pago,v.metodo_pago,v.total,v.estado_venta FROM ventas v LEFT JOIN clientes c ON c.id=v.cliente_id LEFT JOIN usuarios u ON u.id=v.usuario_id ORDER BY v.fecha DESC`,
  pagos:`SELECT p.id folio,p.fecha,c.nombre_razon_social cliente,p.metodo_pago,p.referencia,p.monto_total,p.estado,u.username usuario FROM pagos p LEFT JOIN clientes c ON c.id=p.cliente_id LEFT JOIN usuarios u ON u.id=p.usuario_id ORDER BY p.fecha DESC`,
  cartera:`SELECT x.id,x.venta_id,c.nombre_razon_social cliente,x.total_deuda,x.saldo_pendiente,x.estado,x.fecha FROM cuentas_por_cobrar x JOIN clientes c ON c.id=x.cliente_id ORDER BY x.fecha DESC`,
  inventario:`SELECT m.id,m.fecha,p.codigo,p.nombre producto,m.tipo,m.cantidad,m.stock_anterior,m.stock_final,m.motivo,m.referencia_tipo,m.referencia_id,u.username usuario FROM movimientos_inventario m JOIN productos p ON p.id=m.producto_id LEFT JOIN usuarios u ON u.id=m.usuario_id ORDER BY m.fecha DESC`,
  productos:`SELECT codigo,nombre,descripcion,unidad,costo,precio_venta,stock,stock_minimo,activo FROM productos ORDER BY nombre`,
  compras:`SELECT c.id,c.folio,c.fecha,p.nombre proveedor,c.referencia,c.total,c.estado,u.username usuario FROM compras c LEFT JOIN proveedores p ON p.id=c.proveedor_id LEFT JOIN usuarios u ON u.id=c.usuario_id ORDER BY c.fecha DESC`,
  cancelaciones:`SELECT 'VENTA' entidad,id,fecha,cancelada_at,motivo_cancelacion FROM ventas WHERE estado_venta='CANCELADA' UNION ALL SELECT 'PAGO',id,fecha,cancelado_at,motivo_cancelacion FROM pagos WHERE estado='CANCELADO' UNION ALL SELECT 'COMPRA',id,fecha,cancelada_at,motivo_cancelacion FROM compras WHERE estado='CANCELADA' ORDER BY cancelada_at DESC`
};
const csvValue=value=>`"${String(value??'').replaceAll('"','""')}"`;
router.get('/:tipo.csv',async(req,res,next)=>{const sql=reportesCsv[req.params.tipo];if(!sql)return res.status(404).json({error:'Reporte no disponible'});try{const[rows]=await db.promise.query(sql),columnas=rows.length?Object.keys(rows[0]):[];const contenido=[columnas,...rows.map(row=>columnas.map(c=>row[c]))].map(row=>row.map(csvValue).join(',')).join('\r\n');res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition',`attachment; filename="${req.params.tipo}.csv"`);res.send('\ufeff'+contenido);}catch(e){next(e);}});

router.get('/ventas-pdf', async (req, res) => {
  try {
    const [ventas] = await db.promise.query(
      `SELECT v.id, v.fecha, v.total, v.tipo_pago, v.metodo_pago, v.estado_venta,
              c.nombre_razon_social AS cliente
       FROM ventas v LEFT JOIN clientes c ON c.id = v.cliente_id
       ORDER BY v.id DESC`
    );

    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="ventas.pdf"');
    doc.on('error', error => {
      console.error('Error generando PDF:', error);
      if (!res.headersSent) res.status(500).json({ error: 'No fue posible generar el reporte' });
      else res.destroy(error);
    });
    doc.pipe(res);
    doc.fontSize(22).text('Reporte de Ventas', { align: 'center' }).moveDown();

    for (const venta of ventas) {
      const total = Number(venta.total).toLocaleString('es-MX', {
        style: 'currency', currency: 'MXN', minimumFractionDigits: 2
      });
      doc.fontSize(11).text(
        `Venta #${venta.id} · ${venta.estado_venta}\n` +
        `Cliente: ${venta.cliente || 'Sin cliente'}\n` +
        `Pago: ${venta.tipo_pago} · Método: ${venta.metodo_pago || 'EFECTIVO'} · Total: ${total}\n` +
        `Fecha: ${new Date(venta.fecha).toLocaleString('es-MX')}\n` +
        '------------------------------------------\n'
      );
    }
    doc.end();
  } catch (error) {
    console.error('Error consultando reporte:', error);
    if (!res.headersSent) res.status(500).json({ error: 'No fue posible generar el reporte' });
  }
});

module.exports = router;
