const express = require('express');

const router = express.Router();

const db = require('../db/conexion');

const PDFDocument = require('pdfkit');

/* =========================
   REPORTE VENTAS PDF
========================= */

router.get('/ventas-pdf',(req,res)=>{

  db.query(`

    SELECT

      v.id,
      v.fecha,
      v.total,
      v.tipo_pago,
      c.nombre_razon_social as cliente

    FROM ventas v

    LEFT JOIN clientes c
    ON c.id = v.cliente_id

    WHERE v.estado_venta = 'ACTIVA'

    ORDER BY v.id DESC

  `,(err,result)=>{

    if(err){
      return res.status(500).json(err);
    }

    const doc = new PDFDocument({

      margin:40

    });

    res.setHeader(
      'Content-Type',
      'application/pdf'
    );

    res.setHeader(
      'Content-Disposition',
      'inline; filename=ventas.pdf'
    );

    doc.pipe(res);

    /* =========================
       TITULO
    ========================= */

    doc

    .fontSize(22)

    .text(
      'Reporte de Ventas',
      {
        align:'center'
      }
    );

    doc.moveDown();

    /* =========================
       TABLA
    ========================= */

    result.forEach(v=>{

      doc

      .fontSize(12)

      .text(`

Venta #${v.id}

Cliente:
${v.cliente}

Tipo Pago:
${v.tipo_pago}

Total:
$${Number(v.total).toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2})}

Fecha:
${new Date(v.fecha)
.toLocaleString()}

----------------------------------

      `);

    });

    doc.end();

  });

});

module.exports = router;
