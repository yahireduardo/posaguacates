const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { resolverAutorizacionAdmin } = require('../lib/autorizacionAdmin');

test('ADMON_GRAL autoriza con su sesión sin solicitar contraseña', async () => {
  const resultado = await resolverAutorizacionAdmin({
    usuario: { id: 1, username: 'admin', rol: 'ADMON_GRAL' },
    body: {},
    buscarAdministrador: async username => ({ id: 1, username })
  });
  assert.deepEqual(resultado, { solicitadoPor: 1, autorizadoPor: 1, delegada: false });
});

test('CAJERO requiere credenciales administrativas', async () => {
  await assert.rejects(
    resolverAutorizacionAdmin({
      usuario: { id: 2, rol: 'CAJERO' },
      body: {},
      buscarAdministrador: async () => null
    }),
    error => error.status === 400 && error.message === 'Se requiere autorización de un administrador'
  );
});

test('CAJERO acepta autorización bcrypt correcta y conserva su identidad', async () => {
  const hash = await bcrypt.hash('Segura12345', 4);
  const resultado = await resolverAutorizacionAdmin({
    usuario: { id: 2, rol: 'CAJERO' },
    body: { usuario_admin: 'admin', password_admin: 'Segura12345' },
    buscarAdministrador: async username => username === 'admin'
      ? { id: 1, password_hash: hash }
      : null
  });
  assert.deepEqual(resultado, { solicitadoPor: 2, autorizadoPor: 1, delegada: true });
});

test('CAJERO recibe mensaje genérico con autorización incorrecta', async () => {
  const hash = await bcrypt.hash('Segura12345', 4);
  await assert.rejects(
    resolverAutorizacionAdmin({
      usuario: { id: 2, rol: 'CAJERO' },
      body: { usuario_admin: 'admin', password_admin: 'incorrecta' },
      buscarAdministrador: async () => ({ id: 1, password_hash: hash })
    }),
    error => error.status === 401 && error.message === 'Autorización incorrecta'
  );
});

test('otros roles son rechazados', async () => {
  await assert.rejects(
    resolverAutorizacionAdmin({
      usuario: { id: 3, rol: 'ADMIN' },
      body: {},
      buscarAdministrador: async () => null
    }),
    error => error.status === 403
  );
});
