const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { crearBloqueoEscrituras } = require('../middleware/instanceWritable');
const { permitirRoles } = require('../middleware/auth');
const { AuditService } = require('../services/auditService');

function response() {
  const res = new EventEmitter();
  res.statusCode = 200;
  res.status = code => { res.statusCode = code; return res; };
  res.json = body => { res.body = body; return res; };
  return res;
}

test('bloquea escrituras del negocio cuando está ENTREGADA y permite consultas', async () => {
  const middleware = crearBloqueoEscrituras({
    async obtenerEstado() { return { estado: 'ENTREGADA', bloqueada: 1 }; }
  });
  const bloqueada = response();
  await middleware({ method: 'POST' }, bloqueada, () => assert.fail('no debe continuar'));
  assert.equal(bloqueada.statusCode, 423);
  let consultada = false;
  await middleware({ method: 'GET' }, response(), () => { consultada = true; });
  assert.equal(consultada, true);
});

test('una escritura activa se contabiliza hasta terminar la respuesta', async () => {
  let activas = 0;
  const control = {
    async obtenerEstado() { return { estado: 'ACTIVA', bloqueada: 0 }; },
    iniciarEscritura() { activas += 1; return true; },
    finalizarEscritura() { activas -= 1; }
  };
  const res = response();
  await crearBloqueoEscrituras(control)({ method: 'POST' }, res, () => {});
  assert.equal(activas, 1);
  res.emit('finish');
  assert.equal(activas, 0);
});

test('solo ADMON_GRAL puede entrar al módulo de respaldos', () => {
  const res = response();
  permitirRoles('ADMON_GRAL')({ usuario: { rol: 'CAJERO' } }, res, () => assert.fail());
  assert.equal(res.statusCode, 403);
});

test('auditoría registra usuario, equipo, instancia y error resumido sin contraseña', async () => {
  let params;
  const audit = new AuditService({
    db: { async query(sql, values) { params = values; } },
    instanceControl: { async obtenerInstanceId() { return '11111111-1111-4111-8111-111111111111'; } }
  });
  await audit.registrar({
    usuarioId: 5, accion: 'RESTAURAR', resultado: 'FALLIDO',
    error: 'password=ultrasecreta acceso denegado'
  });
  assert.equal(params[0], 5);
  assert.doesNotMatch(params.join(' '), /ultrasecreta/);
  assert.match(params.join(' '), /\[OCULTA\]/);
});
