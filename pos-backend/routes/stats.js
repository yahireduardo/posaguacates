const express = require('express');
const router = express.Router();
const db = require('../db/conexion');

router.get('/', (req,res)=>{
  db.query(`
    SELECT COUNT(*) as ventasHoy FROM ventas WHERE DATE(fecha)=CURDATE()
  `,(e,r1)=>{
    db.query(`
      SELECT c.nombre, SUM(v.total) total 
      FROM ventas v JOIN clientes c ON v.cliente_id=c.id
      GROUP BY c.id ORDER BY total DESC LIMIT 1
    `,(e,r2)=>{
      db.query(`
        SELECT p.nombre, SUM(d.cantidad) total
        FROM detalle_venta d JOIN productos p ON d.producto_id=p.id
        GROUP BY p.id ORDER BY total DESC LIMIT 1
      `,(e,r3)=>{
        res.json({
          ventasHoy: r1[0].ventasHoy,
          clienteTop: r2[0]?.nombre || 'N/A',
          productoTop: r3[0]?.nombre || 'N/A'
        });
      });
    });
  });
});

module.exports = router;