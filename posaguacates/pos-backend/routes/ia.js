const express = require('express');

const router = express.Router();

const db = require('../db/conexion');

/* =========================
   IA AVANZADA
========================= */

router.get('/analisis',(req,res)=>{

  db.query(`

    SELECT

      p.nombre,

      SUM(dv.cantidad) as vendidos,

      p.stock

    FROM detalle_venta dv

    INNER JOIN productos p
    ON p.id = dv.producto_id

    GROUP BY p.id

    ORDER BY vendidos DESC

  `,(err,result)=>{

    if(err){
      return res.status(500).json(err);
    }

    let mensajes = [];

    /* =========================
       MÁS VENDIDO
    ========================= */

    if(result.length > 0){

      mensajes.push(

        `📈 ${result[0].nombre}
        es el producto más vendido`

      );

    }

    /* =========================
       STOCK BAJO
    ========================= */

    result.forEach(p=>{

      if(p.stock <= 20){

        mensajes.push(

          `⚠️ Se recomienda surtir
          ${p.nombre}`

        );

      }

    });

    /* =========================
       POCO MOVIMIENTO
    ========================= */

    result.forEach(p=>{

      if(p.vendidos <= 5){

        mensajes.push(

          `📉 ${p.nombre}
          tiene pocas ventas`

        );

      }

    });

    res.json(mensajes);

  });

});

module.exports = router;