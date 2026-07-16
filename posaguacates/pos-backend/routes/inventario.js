const express = require('express');

const router = express.Router();

const db = require('../db/conexion');

/* =========================
   MOVIMIENTOS
========================= */

router.get('/',(req,res)=>{

  db.query(`

    SELECT

      mi.*,

      p.nombre as producto

    FROM movimientos_inventario mi

    INNER JOIN productos p
    ON p.id = mi.producto_id

    ORDER BY mi.id DESC

  `,(err,result)=>{

    if(err){
      return res.status(500).json(err);
    }

    res.json(result);

  });

});

/* =========================
   REGISTRAR MOVIMIENTO
========================= */

router.post('/movimiento',(req,res)=>{

  const {

    producto_id,
    tipo,
    cantidad,
    motivo

  } = req.body;

  if(
    !producto_id ||
    !tipo ||
    !cantidad
  ){

    return res.json({
      error:'Datos incompletos'
    });

  }

  /* =========================
     ACTUALIZAR STOCK
  ========================= */

  let sqlStock = '';

  if(tipo === 'ENTRADA'){

    sqlStock = `

      UPDATE productos

      SET stock = stock + ?

      WHERE id = ?

    `;

  }

  if(
    tipo === 'MERMA' ||
    tipo === 'AJUSTE'
  ){

    sqlStock = `

      UPDATE productos

      SET stock = stock - ?

      WHERE id = ?

    `;

  }

  db.query(

    sqlStock,

    [
      cantidad,
      producto_id
    ],

    (err)=>{

      if(err){
        return res.status(500).json(err);
      }

      /* =========================
         MOVIMIENTO
      ========================= */

      db.query(`

        INSERT INTO movimientos_inventario

        (
          producto_id,
          tipo,
          cantidad,
          motivo
        )

        VALUES (?,?,?,?)

      `,

      [
        producto_id,
        tipo,
        cantidad,
        motivo
      ],

      (err)=>{

        if(err){
          return res.status(500).json(err);
        }

        res.json({
          mensaje:'Movimiento registrado'
        });

      });

    }

  );

});

module.exports = router;