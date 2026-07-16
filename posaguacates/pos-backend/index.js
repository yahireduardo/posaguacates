require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { autenticar } = require('./middleware/auth');

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET. Copia .env.example a .env y define una clave segura.');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/auth', require('./routes/auth'));
app.use('/productos', autenticar, require('./routes/productos'));
app.use('/ventas', autenticar, require('./routes/ventas'));
app.use('/clientes', autenticar, require('./routes/clientes'));
app.use('/cuentas', autenticar, require('./routes/cuentas'));
app.use('/stats', autenticar, require('./routes/stats'));
app.use('/chatbot', autenticar, require('./routes/chatbot'));
app.use('/prediccion', autenticar, require('./routes/prediccion'));
app.use('/inventario', autenticar, require('./routes/inventario'));
app.use('/reportes', autenticar, require('./routes/reportes'));
app.use('/ia', autenticar, require('./routes/ia'));

const frontendPath = path.join(__dirname, '..', 'pos-frontend');
app.use(express.static(frontendPath));
app.get('/', (req, res) => res.sendFile(path.join(frontendPath, 'index.html')));

app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  return res.status(500).json({ error: 'Error interno del servidor' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
