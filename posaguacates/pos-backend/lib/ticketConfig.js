function normalizarTicket(config = {}) {
  const papel = [58, 80].includes(Number(config.papel_mm)) ? Number(config.papel_mm) : 80;
  const escala = [80, 90, 100, 110, 120].includes(Number(config.ticket_escala_texto)) ? Number(config.ticket_escala_texto) : 100;
  const margen = [0, 1, 2, 3, 4, 5].includes(Number(config.ticket_margen_mm)) ? Number(config.ticket_margen_mm) : 2;
  const logoAncho = [30, 40, 50, 60, 70, 80].includes(Number(config.ticket_logo_ancho_pct)) ? Number(config.ticket_logo_ancho_pct) : 50;
  return {
    papel, escala, margen, contenido: Math.max(40, papel - (margen * 2)),
    mostrarLogo: config.ticket_mostrar_logo !== 0 && config.ticket_mostrar_logo !== false,
    logoAltoContraste: config.ticket_logo_alto_contraste === 1 || config.ticket_logo_alto_contraste === true,
    logoAncho
  };
}

module.exports = { normalizarTicket };
