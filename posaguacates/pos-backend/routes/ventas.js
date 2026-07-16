const express = require('express');

const router = express.Router();

const db = require('../db/conexion');

/* =========================
   CREAR VENTA
========================= */

router.post('/crear',(req,res)=>{

  const {

    cliente_id,
    usuario_id,
    tipo_pago,
    productos

  } = req.body;

  if(!productos || productos.length === 0){

    return res.json({
      error:'No hay productos'
    });

  }

  let total = 0;

  productos.forEach(p=>{

    total +=
      p.cantidad * p.precio;

  });

  db.query(`

    INSERT INTO ventas

    (
      cliente_id,
      usuario_id,
      total,
      tipo_pago
    )

    VALUES (?,?,?,?)

  `,

  [
    cliente_id,
    usuario_id,
    total,
    tipo_pago
  ],

  (err,result)=>{

    if(err){
      return res.status(500).json(err);
    }

    const ventaId =
      result.insertId;

    productos.forEach(p=>{

      const subtotal =
        p.cantidad * p.precio;

      /* =========================
         DETALLE
      ========================= */

      db.query(`

        INSERT INTO detalle_venta

        (
          venta_id,
          producto_id,
          cantidad,
          precio_unitario,
          subtotal
        )

        VALUES (?,?,?,?,?)

      `,

      [
        ventaId,
        p.producto_id,
        p.cantidad,
        p.precio,
        subtotal
      ]);

      /* =========================
         INVENTARIO
      ========================= */

      db.query(`

        UPDATE productos

        SET stock = stock - ?

        WHERE id = ?

      `,

      [
        p.cantidad,
        p.producto_id
      ]);

      /* =========================
         MOVIMIENTO
      ========================= */

      db.query(`

        INSERT INTO movimientos_inventario

        (
          producto_id,
          tipo,
          cantidad,
          motivo,
          referencia_id
        )

        VALUES
        (?, 'SALIDA', ?, 'VENTA', ?)

      `,

      [
        p.producto_id,
        p.cantidad,
        ventaId
      ]);

    });

    /* =========================
       CRÉDITO
    ========================= */

    if(tipo_pago === 'CREDITO'){

      db.query(`

        INSERT INTO cuentas_por_cobrar

        (
          venta_id,
          cliente_id,
          total_deuda,
          saldo_pendiente
        )

        VALUES (?,?,?,?)

      `,

      [
        ventaId,
        cliente_id,
        total,
        total
      ]);

    }

    res.json({

      mensaje:'Venta registrada',

      venta_id:ventaId

    });

  });

});

module.exports = router;