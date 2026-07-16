const express = require('express');
const router = express.Router();
const db = require('../db/conexion');

router.post('/', (req, res) => {
  let q = req.body.pregunta.toLowerCase();

  // quitar acentos
  q = q.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  console.log("PREGUNTA:", q);

  // 🔥 cliente que más compró
  if (
    q.includes('cliente') ||
    q.includes('quien compro') ||
    q.includes('quien compro mas') ||
    q.includes('mayor compra')
  ) {

    db.query(`
      SELECT c.nombre, SUM(v.total) total
      FROM ventas v
      JOIN clientes c ON v.cliente_id = c.id
      GROUP BY c.id
      ORDER BY total DESC
      LIMIT 1
    `, (err, result) => {

      if (err) return res.status(500).json(err);

      if (result.length === 0) {
        return res.json({ respuesta: 'No hay datos aún' });
      }

      res.json({
        respuesta: `El cliente que más compró es ${result[0].nombre}`
      });
    });

  }

  // 🔥 ventas del día
  else if (q.includes('ventas hoy')) {

    db.query(`
      SELECT COUNT(*) as total FROM ventas
      WHERE DATE(fecha) = CURDATE()
    `, (err, result) => {

      res.json({
        respuesta: `Hoy hay ${result[0].total} ventas`
      });
    });

  }

  else {
    res.json({ respuesta: 'No entendí la pregunta 🤔' });
  }
});

module.exports = router;