const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// 🔹 RUTAS
const ventasRoutes = require('./routes/ventas');
app.use('/ventas', ventasRoutes);

const productosRoutes = require('./routes/productos');
app.use('/productos', productosRoutes);

const pagosRoutes = require('./routes/pagos');
app.use('/pagos', pagosRoutes);

const clientesRoutes =
require('./routes/clientes');

app.use('/cuentas',
require('./routes/cuentas'));

app.use('/clientes', clientesRoutes);

// 🔥 NUEVAS RUTAS (IA + DASHBOARD)
app.use('/stats', require('./routes/stats'));
app.use('/chatbot', require('./routes/chatbot'));
app.use('/prediccion', require('./routes/prediccion'));

// 🔹 INICIAR SERVIDOR (SIEMPRE AL FINAL)
app.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});