const express = require('express');

const router = express.Router();

const db = require('../db/conexion');

/* =========================
   DASHBOARD STATS
========================= */

router.get('/',(req,res)=>{

  const stats = {};

  /* =========================
     VENTAS HOY
  ========================= */

  db.query(`

    SELECT

      COUNT(*) as ventas_hoy,

      IFNULL(SUM(total),0)
      as ingresos_hoy

    FROM ventas

    WHERE DATE(fecha) = CURDATE()

  `,(err,result)=>{

    if(err){
      return res.status(500).json(err);
    }

    stats.ventas_hoy =
      result[0].ventas_hoy;

    stats.ingresos_hoy =
      result[0].ingresos_hoy;

    /* =========================
       CLIENTES
    ========================= */

    db.query(`

      SELECT COUNT(*) as clientes

      FROM clientes

    `,(err,result2)=>{

      if(err){
        return res.status(500).json(err);
      }

      stats.clientes =
        result2[0].clientes;

      /* =========================
         DEUDA TOTAL
      ========================= */

      db.query(`

        SELECT

          IFNULL(
            SUM(saldo_pendiente),
            0
          ) as deuda_total

        FROM cuentas_por_cobrar

        WHERE estado != 'PAGADO'

      `,(err,result3)=>{

        if(err){
          return res.status(500).json(err);
        }

        stats.deuda_total =
          result3[0].deuda_total;

        /* =========================
           PRODUCTOS TOP
        ========================= */

        db.query(`

          SELECT

            p.nombre,

            SUM(dv.cantidad)
            as total

          FROM detalle_venta dv

          INNER JOIN productos p
          ON p.id = dv.producto_id

          GROUP BY p.nombre

          ORDER BY total DESC

          LIMIT 5

        `,(err,result4)=>{

          if(err){
            return res.status(500).json(err);
          }

          stats.top_productos =
            result4;

          /* =========================
             CLIENTES TOP
          ========================= */

          db.query(`

            SELECT

              c.nombre,

              SUM(v.total)
              as total

            FROM ventas v

            INNER JOIN clientes c
            ON c.id = v.cliente_id

            GROUP BY c.nombre

            ORDER BY total DESC

            LIMIT 5

          `,(err,result5)=>{

            if(err){
              return res.status(500).json(err);
            }

            stats.top_clientes =
              result5;

            res.json(stats);

          });

        });

      });

    });

  });

});

module.exports = router;