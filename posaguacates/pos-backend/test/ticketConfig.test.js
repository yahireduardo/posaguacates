const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizarTicket } = require('../lib/ticketConfig');

test('ticket de 58 mm respeta ancho, margen, texto y logo configurados', () => {
  assert.deepEqual(normalizarTicket({ papel_mm: 58, ticket_escala_texto: 80, ticket_margen_mm: 1,
    ticket_mostrar_logo: 0, ticket_logo_alto_contraste: 1, ticket_logo_ancho_pct: 40 }), {
    papel: 58, escala: 80, margen: 1, contenido: 56, mostrarLogo: false, logoAltoContraste: true, logoAncho: 40
  });
});

test('ticket usa valores seguros ante configuración inválida', () => {
  assert.deepEqual(normalizarTicket({ papel_mm: 999, ticket_margen_mm: -1 }), {
    papel: 80, escala: 100, margen: 2, contenido: 76, mostrarLogo: true, logoAltoContraste: false, logoAncho: 50
  });
});
