const express = require('express');
const PDFDocument = require('pdfkit');
const db = require('../db/conexion');
const { permitirRoles } = require('../middleware/auth');

const router = express.Router();
router.use(permitirRoles('ADMON_GRAL'));

router.get('/ventas-pdf', async (req, res) => {
  try {
    const [ventas] = await db.promise.query(
      `SELECT v.id, v.fecha, v.total, v.tipo_pago, v.estado_venta,
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
        `Pago: ${venta.tipo_pago} · Total: ${total}\n` +
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
