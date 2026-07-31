function normalizarTexto(valor, { mayusculas = false, minusculas = false, max = 1000 } = {}) {
  let texto = String(valor ?? '').trim().replace(/\s+/g, ' ');
  if (mayusculas) texto = texto.toUpperCase();
  if (minusculas) texto = texto.toLowerCase();
  return texto.slice(0, max) || null;
}

function datosProveedor(body = {}) {
  return {
    nombre: normalizarTexto(body.nombre, { max: 180 }),
    razon_social: normalizarTexto(body.razon_social, { max: 180 }),
    contacto: normalizarTexto(body.contacto, { max: 150 }),
    telefono: normalizarTexto(body.telefono, { max: 30 }),
    correo: normalizarTexto(body.correo, { minusculas: true, max: 180 }),
    direccion: normalizarTexto(body.direccion, { max: 500 }),
    rfc: normalizarTexto(body.rfc, { mayusculas: true, max: 13 }),
    notas: normalizarTexto(body.notas, { max: 1000 })
  };
}

function validarProveedor(p) {
  if (!p.nombre) return 'El nombre comercial es obligatorio';
  if (p.telefono && !/^\+?[0-9 ()-]{7,20}$/.test(p.telefono)) return 'El teléfono no tiene un formato válido';
  if (p.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.correo)) return 'El correo no tiene un formato válido';
  if (p.rfc && !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(p.rfc)) return 'El RFC no tiene un formato válido';
  return null;
}

module.exports = { normalizarTexto, datosProveedor, validarProveedor };
