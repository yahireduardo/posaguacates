const express = require('express');

const cors = require('cors');

const app = express();

app.use(cors());

app.use(express.json());

/* =========================
   RUTAS
========================= */

app.use('/productos',
require('./routes/productos'));

app.use('/ventas',
require('./routes/ventas'));

app.use('/clientes',
require('./routes/clientes'));

app.use('/cuentas',
require('./routes/cuentas'));

app.use('/stats',
require('./routes/stats'));

app.use('/chatbot',
require('./routes/chatbot'));

app.use('/prediccion',
require('./routes/prediccion'));

app.use('/inventario',
require('./routes/inventario'));

app.use('/auth',
require('./routes/auth'));

app.use('/reportes',
require('./routes/reportes'));

app.use('/ia',
require('./routes/ia'));

/* =========================
   SERVIDOR
========================= */

app.listen(3000,()=>{

  console.log(
    'Servidor corriendo en http://localhost:3000'
  );

});