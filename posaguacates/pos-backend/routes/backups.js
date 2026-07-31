const express = require('express');
const multer = require('multer');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const bcrypt = require('bcryptjs');
const { permitirRoles } = require('../middleware/auth');
const runtime = require('../services/backupRuntime');

const router = express.Router();

const maxBytes = Number(process.env.BACKUP_MAX_SIZE_MB || 500) * 1024 * 1024;
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: maxBytes, files: 1, fields: 5, parts: 6 },
  fileFilter(req, file, callback) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!['.zip', '.sql'].includes(ext)) {
      return callback(Object.assign(new Error('Solo se aceptan respaldos ZIP o SQL'), { status: 400 }));
    }
    return callback(null, true);
  }
});

async function confirmarPasswordAdmin(req) {
  const password = String(req.body.password_admin || '');
  if (!password) throw Object.assign(new Error('Se requiere la contraseña del administrador'), { status: 400 });
  const [rows] = await runtime.instanceControl.db.query(
    `SELECT id,password_hash FROM usuarios
     WHERE id=? AND username=? AND rol='ADMON_GRAL' AND activo=1 LIMIT 1`,
    [req.usuario.id, req.usuario.username]
  );
  if (!rows[0]?.password_hash || !await bcrypt.compare(password, rows[0].password_hash)) {
    throw Object.assign(new Error('Autorización administrativa incorrecta'), { status: 401 });
  }
}

router.get('/status', async (req, res, next) => {
  try { res.json({ ok: true, instance: await runtime.instanceControl.obtenerEstado() }); } catch (error) { next(error); }
});

router.use(permitirRoles('ADMON_GRAL'));

router.post('/export', async (req, res, next) => {
  let resultado;
  try {
    resultado = await runtime.backupService.crearZip(req.usuario.id);
    res.setHeader('X-Backup-Id', resultado.manifest.backupId);
    res.download(resultado.zipPath, resultado.nombreZip, async error => {
      await fs.rm(resultado.tempDir, { recursive: true, force: true });
      if (error && !res.headersSent) next(error);
    });
  } catch (error) {
    if (resultado?.tempDir) await fs.rm(resultado.tempDir, { recursive: true, force: true });
    next(error);
  }
});

router.post('/analyze', (req, res, next) => {
  upload.single('backup')(req, res, async error => {
    if (error) return next(Object.assign(error, { status: error.code === 'LIMIT_FILE_SIZE' ? 413 : (error.status || 400) }));
    try {
      const resultado = await runtime.restoreService.analizar(req.file, req.usuario.id);
      return res.json({ ok: true, ...resultado });
    } catch (analysisError) {
      if (req.file?.path) await fs.rm(req.file.path, { force: true });
      return next(analysisError);
    }
  });
});

router.post('/restore', async (req, res, next) => {
  try {
    await confirmarPasswordAdmin(req);
    const resultado = await runtime.restoreService.restaurar({
      token: req.body.analysisToken,
      usuarioId: req.usuario.id,
      confirmacion: req.body.confirmacion,
      confirmarAntiguo: req.body.confirmarAntiguo === true
    });
    res.json(resultado);
  } catch (error) { next(error); }
});

router.post('/mark-transferred', async (req, res, next) => {
  try {
    await confirmarPasswordAdmin(req);
    const backupId = String(req.body.backupId || '');
    if (!/^[0-9a-f-]{36}$/i.test(backupId)) return res.status(400).json({ error: 'backupId inválido' });
    await runtime.instanceControl.marcarEntregada(backupId);
    await runtime.audit.registrar({
      usuarioId: req.usuario.id, accion: 'MARCAR_ENTREGADA', backupId, resultado: 'EXITOSO'
    });
    res.json({ ok: true, estado: 'ENTREGADA' });
  } catch (error) { next(error); }
});

router.post('/reactivate', async (req, res, next) => {
  try {
    await confirmarPasswordAdmin(req);
    const motivo = String(req.body.motivo || '').trim();
    if (motivo.length < 10 || motivo.length > 500) {
      return res.status(400).json({ error: 'El motivo debe contener entre 10 y 500 caracteres' });
    }
    await runtime.instanceControl.reactivar(motivo);
    await runtime.audit.registrar({
      usuarioId: req.usuario.id, accion: 'REACTIVAR', resultado: 'EXITOSO', detalles: { motivo }
    });
    res.json({ ok: true, estado: 'ACTIVA', advertencia: 'La reactivación manual puede causar divergencia de datos.' });
  } catch (error) { next(error); }
});

router.get('/history', async (req, res, next) => {
  try {
    const limite = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
    const [rows] = await runtime.instanceControl.db.query(
      `SELECT a.id,a.accion,a.backup_id,a.nombre_archivo,a.resultado,a.tamano_bytes,
              a.hostname,a.error_resumido,a.creado_en,u.username
       FROM auditoria_respaldos a LEFT JOIN usuarios u ON u.id=a.usuario_id
       ORDER BY a.id DESC LIMIT ?`,
      [limite]
    );
    res.json({ ok: true, history: rows });
  } catch (error) { next(error); }
});

module.exports = router;
module.exports.confirmarPasswordAdmin = confirmarPasswordAdmin;
