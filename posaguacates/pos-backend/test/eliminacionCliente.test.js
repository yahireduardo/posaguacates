const test = require('node:test');
const assert = require('node:assert/strict');
const {
  eliminacionDestructivaHabilitada,
  esPublicoGeneral,
  validarSolicitudEliminacion
} = require('../lib/eliminacionCliente');

test('el modo destructivo solo se habilita con true explícito', () => {
  assert.equal(eliminacionDestructivaHabilitada({}), false);
  assert.equal(eliminacionDestructivaHabilitada({ ALLOW_DESTRUCTIVE_TEST_DELETES: 'false' }), false);
  assert.equal(eliminacionDestructivaHabilitada({ ALLOW_DESTRUCTIVE_TEST_DELETES: '1' }), false);
  assert.equal(eliminacionDestructivaHabilitada({ ALLOW_DESTRUCTIVE_TEST_DELETES: 'TRUE' }), true);
});

test('Público General está protegido por id y por nombre normalizado', () => {
  assert.equal(esPublicoGeneral({ id: 1, nombre_razon_social: 'Otro' }), true);
  assert.equal(esPublicoGeneral({ id: 99, nombre_razon_social: 'Público General' }), true);
  assert.equal(esPublicoGeneral({ id: 3, nombre_razon_social: 'Cliente prueba' }), false);
});

test('la eliminación exige motivo y frase exacta', () => {
  assert.equal(validarSolicitudEliminacion({
    clienteId: 2,
    motivo: 'Datos de prueba',
    confirmacion: 'ELIMINAR CLIENTE'
  }), null);
  assert.equal(validarSolicitudEliminacion({
    clienteId: 2,
    motivo: '',
    confirmacion: 'ELIMINAR CLIENTE'
  }).error, 'El motivo es obligatorio');
  assert.equal(validarSolicitudEliminacion({
    clienteId: 2,
    motivo: 'Prueba',
    confirmacion: 'eliminar'
  }).error, 'Escribe ELIMINAR CLIENTE para confirmar');
});
