function crearBloqueoEscrituras(instanceControl) {
  return async (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    try {
      const estado = await instanceControl.obtenerEstado();
      if (estado.restauracion_en_progreso) {
        return res.status(503).json({ error: 'Restauración en progreso. Intenta nuevamente al finalizar.' });
      }
      if (estado.estado === 'ENTREGADA' || Number(estado.bloqueada) === 1) {
        return res.status(423).json({
          error: 'Esta computadora entregó la base de datos. Restaure el respaldo más reciente para continuar.'
        });
      }
      if (!instanceControl.iniciarEscritura()) {
        return res.status(503).json({ error: 'Restauración en progreso. Intenta nuevamente al finalizar.' });
      }
      let terminada = false;
      const finalizar = () => {
        if (!terminada) {
          terminada = true;
          instanceControl.finalizarEscritura();
        }
      };
      res.once('finish', finalizar);
      res.once('close', finalizar);
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { crearBloqueoEscrituras };
