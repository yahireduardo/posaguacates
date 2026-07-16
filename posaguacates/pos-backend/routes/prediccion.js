const express = require('express');

const router = express.Router();

const db = require('../db/conexion');

/* =========================
   REGRESIÓN LINEAL
========================= */

router.get('/',(req,res)=>{

  db.query(`

    SELECT

      DATE(fecha) as dia,

      SUM(total) as total

    FROM ventas

    GROUP BY DATE(fecha)

    ORDER BY dia ASC

  `,(err,result)=>{

    if(err){
      return res.status(500).json(err);
    }

    if(result.length < 2){

      return res.json({

        prediccion:0,

        mensaje:
        'No hay suficientes datos',

        historial:result

      });

    }

    /* =========================
       REGRESIÓN LINEAL
    ========================= */

    let x = [];
    let y = [];

    result.forEach((v,index)=>{

      x.push(index + 1);

      y.push(
        parseFloat(v.total)
      );

    });

    const n = x.length;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for(let i=0;i<n;i++){

      sumX += x[i];

      sumY += y[i];

      sumXY += x[i] * y[i];

      sumXX += x[i] * x[i];

    }

    /* =========================
       PENDIENTE
    ========================= */

    const m =

      (
        (n * sumXY) -
        (sumX * sumY)
      )

      /

      (
        (n * sumXX) -
        (sumX * sumX)
      );

    /* =========================
       INTERCEPTO
    ========================= */

    const b =

      (
        sumY -
        (m * sumX)
      ) / n;

    /* =========================
       PREDICCIÓN
    ========================= */

    const siguienteX = n + 1;

    const prediccion =

      (m * siguienteX) + b;

    res.json({

      prediccion:
      prediccion.toFixed(2),

      mensaje:
      `La venta estimada para mañana es $${prediccion.toFixed(2)}`,

      historial:result

    });

  });

});

module.exports = router;