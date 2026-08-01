require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { autenticar, validarSesion } = require('./middleware/auth');
const db = require('./db/conexion');
const { instanceControl } = require('./services/backupRuntime');
const { crearBloqueoEscrituras } = require('./middleware/instanceWritable');

function resolveListenHost(value) {
  const host = String(value || '127.0.0.1').trim();
  if (!/^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|\[[0-9a-f:]+\])$/i.test(host)) {
    throw new Error('HOST inválido');
  }
  return host;
}

function resolveCorsOrigins(value, port = process.env.PORT || 3000) {
  const origins = String(value || '').split(',').map(origin => origin.trim()).filter(Boolean);
  const listenPort = Number(port || 3000);
  if (Number.isInteger(listenPort) && listenPort > 0 && listenPort <= 65535) {
    origins.push(`http://127.0.0.1:${listenPort}`, `http://localhost:${listenPort}`);
  }
  return [...new Set(origins)];
}

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
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'");
  next();
});

app.get('/health', async (req, res) => {
  try {
    await db.verificarConexion();
    return res.json({
      ok: true,
      servicio: 'POS Aguacates',
      base_datos: 'disponible',
      uptime_segundos: Math.floor(process.uptime()),
      fecha: new Date().toISOString()
    });
  } catch (error) {
    return res.status(503).json({
      ok: false,
      servicio: 'POS Aguacates',
      base_datos: 'no disponible',
      fecha: new Date().toISOString()
    });
  }
});

const allowedOrigins = resolveCorsOrigins(process.env.CORS_ORIGINS);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(Object.assign(new Error('Origen no permitido por CORS'), { status: 403 }));
  }
}));
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  const mantenimiento = path.join(__dirname, '.maintenance');
  if (req.method !== 'GET' && req.method !== 'HEAD' && fs.existsSync(mantenimiento)) {
    return res.status(503).json({ error: 'Sistema temporalmente en mantenimiento por restauración' });
  }
  return next();
});

function crearLimitadorLogin({ maxIntentos = 10, ventanaMs = 15 * 60 * 1000, now = () => Date.now() } = {}) {
  const intentosFallidos = new Map();
  return (req, res, next) => {
    if (req.method !== 'POST') return next();
    const key = req.ip;
    const recientes = (intentosFallidos.get(key) || []).filter(time => now() - time < ventanaMs);
    if (recientes.length >= maxIntentos) {
      return res.status(429).json({ error: 'Demasiados intentos. Intenta de nuevo más tarde' });
    }
    intentosFallidos.set(key, recientes);
    res.once('finish', () => {
      if (res.statusCode === 401) intentosFallidos.set(key, [...recientes, now()]);
      else if (res.statusCode >= 200 && res.statusCode < 300) intentosFallidos.delete(key);
    });
    return next();
  };
}

app.use('/auth/login', crearLimitadorLogin());

app.use('/auth', require('./routes/auth'));
app.use('/tickets', require('./routes/tickets'));
app.use('/backups', autenticar, validarSesion, require('./routes/backups'));
app.use(crearBloqueoEscrituras(instanceControl));
const sesion = [autenticar, validarSesion];
app.use('/usuarios', ...sesion, require('./routes/usuarios'));
app.use('/proveedores', ...sesion, require('./routes/proveedores'));
app.use('/compras', ...sesion, require('./routes/compras'));
app.use('/configuracion', ...sesion, require('./routes/configuracion'));
app.use('/productos', ...sesion, require('./routes/productos'));
app.use('/ventas', ...sesion, require('./routes/ventas'));
app.use('/ordenes', ...sesion, require('./routes/ordenes'));
app.use('/clientes', ...sesion, require('./routes/clientes'));
app.use('/cuentas', ...sesion, require('./routes/cuentas'));
app.use('/stats', ...sesion, require('./routes/stats'));
app.use('/chatbot', ...sesion, require('./routes/chatbot'));
app.use('/prediccion', ...sesion, require('./routes/prediccion'));
app.use('/inventario', ...sesion, require('./routes/inventario'));
app.use('/reportes', ...sesion, require('./routes/reportes'));
app.use('/ia', ...sesion, require('./routes/ia'));

const frontendPath = path.join(__dirname, '..', 'pos-frontend');
app.get('/vendor/chart.js', (req, res) => res.sendFile(path.join(__dirname, 'node_modules', 'chart.js', 'dist', 'chart.umd.js')));
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

async function iniciarServidor() {
  const port = Number(process.env.PORT || 3000);
  const host = resolveListenHost(process.env.HOST);
  console.log(`Iniciando POS Aguacates. Esperando MySQL en ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}...`);
  await db.esperarConexion();
  const server = app.listen(port, host, () => {
    console.log(`POS Aguacates disponible en http://${host}:${port}`);
  });
  const cerrar = señal => {
    console.log(`Señal ${señal} recibida. Cerrando servidor...`);
    server.close(() => db.end(() => process.exit(0)));
  };
  process.once('SIGTERM', () => cerrar('SIGTERM'));
  process.once('SIGINT', () => cerrar('SIGINT'));
  return server;
}

if (require.main === module) {
  iniciarServidor().catch(error => {
    console.error('No fue posible iniciar POS Aguacates:', error);
    process.exit(1);
  });
}

module.exports = { app, iniciarServidor, resolveListenHost, resolveCorsOrigins, crearLimitadorLogin };
