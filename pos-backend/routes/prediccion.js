const express = require('express');
const router = express.Router();

router.get('/', (req,res)=>{
  res.json({
    prediccion: "Se estima aumento de ventas de aguacate en 15% mañana"
  });
});

module.exports = router;