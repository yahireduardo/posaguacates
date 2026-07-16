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
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'");
  next();
});

const allowedOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',').map(origin => origin.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(Object.assign(new Error('Origen no permitido por CORS'), { status: 403 }));
  }
}));
app.use(express.json({ limit: '1mb' }));

const loginAttempts = new Map();
app.use('/auth/login', (req, res, next) => {
  if (req.method !== 'POST') return next();
  const now = Date.now();
  const key = req.ip;
  const recent = (loginAttempts.get(key) || []).filter(time => now - time < 15 * 60 * 1000);
  if (recent.length >= 10) return res.status(429).json({ error: 'Demasiados intentos. Intenta de nuevo más tarde' });
  recent.push(now);
  loginAttempts.set(key, recent);
  return next();
});

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

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

app.use((error, req, res, next) => {
  console.error(`${req.method} ${req.originalUrl}:`, error);
  if (res.headersSent) return next(error);
  return res.status(error.status || 500).json({
    error: error.status ? error.message : 'Error interno del servidor'
  });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
