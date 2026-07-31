const express = require('express');
const db = require('../db/conexion');
const { permitirRoles } = require('../middleware/auth');
const {
  idValido,
  eliminacionDestructivaHabilitada,
  esPublicoGeneral,
  validarSolicitudEliminacion
} = require('../lib/eliminacionCliente');
const { esCantidadValida, mensajeCantidad } = require('../lib/cantidades');
const router = express.Router();

async function diagnosticoEliminacion(query, clienteId, bloquear = false) {
  const sufijoBloqueo = bloquear ? ' FOR UPDATE' : '';
  const [[cliente]] = await query(
    `SELECT id,nombre_razon_social,rfc,activo FROM clientes WHERE id=?${sufijoBloqueo}`,
    [clienteId]
  );
  if (!cliente) return null;

  const [resultadoConteos, resultadoProductos] = await Promise.all([
    query(
      `SELECT
        (SELECT COUNT(*) FROM ventas WHERE cliente_id=?) ventas,
        (SELECT COUNT(*) FROM ventas WHERE cliente_id=? AND estado_venta='ACTIVA') ventas_activas,
        (SELECT COUNT(*) FROM ordenes_venta WHERE cliente_id=?) ordenes,
        (SELECT COUNT(*) FROM cuentas_por_cobrar WHERE cliente_id=?) cuentas,
        (SELECT COUNT(*) FROM cuentas_por_cobrar
          WHERE cliente_id=? AND estado='PENDIENTE' AND saldo_pendiente>0) cuentas_pendientes,
        (SELECT COUNT(DISTINCT p.id) FROM pagos p
          LEFT JOIN aplicaciones_pago ap ON ap.pago_id=p.id
          LEFT JOIN cuentas_por_cobrar cxc ON cxc.id=ap.cuenta_id
          LEFT JOIN cuentas_por_cobrar pcxc ON pcxc.id=p.cuenta_id
          WHERE p.cliente_id=? OR cxc.cliente_id=? OR pcxc.cliente_id=?) pagos`,
      [clienteId, clienteId, clienteId, clienteId, clienteId, clienteId, clienteId, clienteId]
    ),
    query(
      `SELECT p.id producto_id,p.codigo,p.nombre,p.unidad,
              SUM(dv.cantidad) cantidad
       FROM ventas v
       JOIN detalle_venta dv ON dv.venta_id=v.id
       JOIN productos p ON p.id=dv.producto_id
       WHERE v.cliente_id=? AND v.estado_venta='ACTIVA'
       GROUP BY p.id,p.codigo,p.nombre,p.unidad
       ORDER BY p.nombre,p.id`,
      [clienteId]
    )
  ]);

  const conteos = resultadoConteos[0][0];
  const productos = resultadoProductos[0];
  return {
    cliente,
    protegido: esPublicoGeneral(cliente),
    modo: eliminacionDestructivaHabilitada(process.env) ? 'DESTRUCTIVO_PRUEBAS' : 'BAJA_LOGICA',
    ventas: Number(conteos.ventas),
    ventas_activas: Number(conteos.ventas_activas),
    ordenes: Number(conteos.ordenes),
    cuentas: Number(conteos.cuentas),
    cuentas_pendientes: Number(conteos.cuentas_pendientes),
    pagos: Number(conteos.pagos),
    productos_reintegrados: productos.map(p => ({
      ...p,
      cantidad: Number(p.cantidad)
    }))
  };
}

router.get('/', async (req, res) => {
  const buscar = String(req.query.buscar || '').trim();
  const pagina = Math.max(1, Number.parseInt(req.query.pagina, 10) || 1);
  const limite = Math.min(500, Math.max(1, Number.parseInt(req.query.limite, 10) || 200));
  const params = [];
  let where = 'activo = 1';
  if (buscar) {
    where += ' AND (nombre_razon_social LIKE ? OR rfc LIKE ? OR telefono LIKE ?)';
    params.push(`%${buscar}%`, `%${buscar}%`, `%${buscar}%`);
  }
  try {
    const [rows] = await db.promise.query(
      `SELECT id, nombre_razon_social, rfc, telefono, correo_electronico
       FROM clientes WHERE ${where}
       ORDER BY nombre_razon_social COLLATE utf8mb4_spanish_ci, id LIMIT ? OFFSET ?`,
      [...params, limite, (pagina - 1) * limite]
    );
    const [[total]] = await db.promise.query(`SELECT COUNT(*) total FROM clientes WHERE ${where}`, params);
    res.json(req.query.pagina || req.query.buscar ? { datos: rows, pagina, limite, total: total.total } : rows);
  } catch (error) { res.status(500).json({ error: 'No fue posible consultar clientes' }); }
});

router.get('/:id/resumen', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Cliente inválido' });
  try {
    const [[cliente], [cuentas], [movimientos], [ordenes], [ventas]] = await Promise.all([
      db.promise.query(`SELECT id,nombre_razon_social,rfc,telefono,correo_electronico,activo FROM clientes WHERE id=?`, [id]),
      db.promise.query(`SELECT id,venta_id,total_deuda,saldo_pendiente,estado,fecha
        FROM cuentas_por_cobrar WHERE cliente_id=? ORDER BY fecha,id`, [id]),
      db.promise.query(`SELECT mc.*,u.nombre usuario FROM movimientos_cartera mc
        LEFT JOIN usuarios u ON u.id=mc.usuario_id WHERE mc.cliente_id=? ORDER BY mc.fecha,mc.id`, [id]),
      db.promise.query(`SELECT id,folio,estado,total_estimado,creada_at FROM ordenes_venta
        WHERE cliente_id=? AND estado='PENDIENTE' ORDER BY creada_at,id`, [id]),
      db.promise.query(`SELECT id,total,tipo_pago,estado_pago,estado_venta,fecha FROM ventas
        WHERE cliente_id=? ORDER BY fecha DESC,id DESC LIMIT 20`, [id])
    ]);
    if (!cliente[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ cliente: cliente[0],
      saldo_total: cuentas.filter(c => c.estado === 'PENDIENTE').reduce((s, c) => s + Number(c.saldo_pendiente), 0),
      cuentas, movimientos, ordenes, ventas });
  } catch (error) {
    res.status(500).json({ error: 'No fue posible consultar el estado de cuenta; verifica la migración pendiente' });
  }
});

function datosCliente(body) {
  return {
    nombre: String(body.nombre_razon_social || '').trim(),
    rfc: String(body.rfc || '').trim().toUpperCase() || null,
    telefono: String(body.telefono || '').trim() || null,
    correo: String(body.correo_electronico || '').trim().toLowerCase() || null
  };
}

async function crearCliente(req, res) {
  const c = datosCliente(req.body);
  if (!c.nombre) return res.status(400).json({ error: 'Nombre o razón social obligatorio' });
  try {
    const [result] = await db.promise.query(
      `INSERT INTO clientes (nombre_razon_social, rfc, telefono, correo_electronico)
       VALUES (?, ?, ?, ?)`, [c.nombre, c.rfc, c.telefono, c.correo]
    );
    res.status(201).json({ mensaje: 'Cliente creado', cliente_id: result.insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El RFC ya está registrado' });
    res.status(500).json({ error: 'No fue posible crear el cliente' });
  }
}

router.post('/', crearCliente);
router.post('/crear', crearCliente); // Compatibilidad temporal con el frontend anterior.

router.put('/:id', permitirRoles('ADMON_GRAL'), async (req, res) => {
  const id = Number(req.params.id);
  const c = datosCliente(req.body);
  if (!Number.isInteger(id) || id <= 0 || !c.nombre) return res.status(400).json({ error: 'Datos inválidos' });
  try {
    const [result] = await db.promise.query(
      `UPDATE clientes SET nombre_razon_social = ?, rfc = ?, telefono = ?, correo_electronico = ?
       WHERE id = ? AND activo = 1`, [c.nombre, c.rfc, c.telefono, c.correo, id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ mensaje: 'Cliente actualizado' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El RFC ya está registrado' });
    res.status(500).json({ error: 'No fue posible actualizar el cliente' });
  }
});

router.get('/:id/eliminacion-diagnostico', permitirRoles('ADMON_GRAL'), async (req, res) => {
  const clienteId = Number(req.params.id);
  if (!idValido(clienteId)) return res.status(400).json({ error: 'Cliente inválido' });
  try {
    const diagnostico = await diagnosticoEliminacion(
      (...args) => db.promise.query(...args),
      clienteId
    );
    if (!diagnostico) return res.status(404).json({ error: 'Cliente no encontrado' });
    return res.json(diagnostico);
  } catch (error) {
    console.error('Error diagnosticando eliminación de cliente:', error);
    return res.status(500).json({ error: 'No fue posible analizar los datos del cliente' });
  }
});

router.delete('/:id', permitirRoles('ADMON_GRAL'), async (req, res) => {
  const clienteId = Number(req.params.id);
  const motivo = String(req.body.motivo || '').trim();
  const confirmacion = String(req.body.confirmacion || '').trim().toUpperCase();
  const errorValidacion = validarSolicitudEliminacion({ clienteId, motivo, confirmacion });
  if (errorValidacion) return res.status(errorValidacion.status).json({ error: errorValidacion.error });

  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    const diagnostico = await diagnosticoEliminacion(
      (...args) => connection.query(...args),
      clienteId,
      true
    );
    if (!diagnostico) {
      const error = Object.assign(new Error('Cliente no encontrado'), { status: 404 });
      throw error;
    }
    if (diagnostico.protegido) {
      const error = Object.assign(new Error('El cliente Público General no se puede eliminar'), { status: 409 });
      throw error;
    }

    if (!eliminacionDestructivaHabilitada(process.env)) {
      await connection.query('UPDATE clientes SET activo=0 WHERE id=?', [clienteId]);
      await connection.query(
        `INSERT INTO autorizaciones_admin
         (accion,recurso_tipo,recurso_id,solicitado_por,autorizado_por,motivo,resultado,fecha)
         VALUES ('BAJA_CLIENTE','CLIENTE',?,?,?,?, 'AUTORIZADA',NOW())`,
        [clienteId, req.usuario.id, req.usuario.id, motivo]
      );
      await connection.commit();
      return res.json({
        ok: true,
        modo: 'BAJA_LOGICA',
        mensaje: 'La eliminación destructiva está deshabilitada en producción. El cliente fue marcado como inactivo.',
        resumen: diagnostico
      });
    }

    const [[auditoria]] = await connection.query(
      `SELECT COUNT(*) existe FROM information_schema.TABLES
       WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='auditoria_eliminaciones'`
    );
    if (!Number(auditoria.existe)) {
      const error = Object.assign(
        new Error('Falta aplicar la migración de auditoría; no se eliminó ningún dato'),
        { status: 503 }
      );
      throw error;
    }

    const [ventas] = await connection.query(
      `SELECT id,estado_venta FROM ventas WHERE cliente_id=? ORDER BY id FOR UPDATE`,
      [clienteId]
    );
    const ventaIds = ventas.map(v => Number(v.id));
    const ventasActivas = ventas.filter(v => v.estado_venta === 'ACTIVA').map(v => Number(v.id));
    const [cuentas] = await connection.query(
      `SELECT id FROM cuentas_por_cobrar WHERE cliente_id=? ORDER BY id FOR UPDATE`,
      [clienteId]
    );
    const cuentaIds = cuentas.map(c => Number(c.id));
    const [ordenes] = await connection.query(
      `SELECT id FROM ordenes_venta WHERE cliente_id=? ORDER BY id FOR UPDATE`,
      [clienteId]
    );
    const ordenIds = ordenes.map(o => Number(o.id));
    const [pagos] = await connection.query(
      `SELECT DISTINCT p.id FROM pagos p
       LEFT JOIN aplicaciones_pago ap ON ap.pago_id=p.id
       LEFT JOIN cuentas_por_cobrar cxc ON cxc.id=ap.cuenta_id
       LEFT JOIN cuentas_por_cobrar pcxc ON pcxc.id=p.cuenta_id
       WHERE p.cliente_id=? OR cxc.cliente_id=? OR pcxc.cliente_id=?
       ORDER BY p.id FOR UPDATE`,
      [clienteId, clienteId, clienteId]
    );
    const pagoIds = pagos.map(p => Number(p.id));

    if (ventasActivas.length) {
      const marcadores = ventasActivas.map(() => '?').join(',');
      const [detalleActivo] = await connection.query(
        `SELECT dv.venta_id,dv.producto_id,dv.cantidad,p.unidad
         FROM detalle_venta dv JOIN productos p ON p.id=dv.producto_id
         WHERE dv.venta_id IN (${marcadores}) ORDER BY dv.producto_id,dv.id FOR UPDATE`,
        ventasActivas
      );
      for (const item of detalleActivo) {
        if (!esCantidadValida(item.cantidad, item.unidad)) {
          const error = Object.assign(
            new Error(`Cantidad inválida en la venta ${item.venta_id}: ${mensajeCantidad(item.unidad)}`),
            { status: 409 }
          );
          throw error;
        }
        await connection.query('UPDATE productos SET stock=stock+? WHERE id=?', [
          item.cantidad,
          item.producto_id
        ]);
        await connection.query(
          `INSERT INTO movimientos_inventario
           (producto_id,tipo,cantidad,motivo,referencia_id,usuario_id)
           VALUES (?,'ENTRADA',?,'ELIMINACION_CLIENTE_PRUEBAS',?,?)`,
          [item.producto_id, item.cantidad, item.venta_id, req.usuario.id]
        );
      }
    }

    await connection.query('DELETE FROM movimientos_cartera WHERE cliente_id=?', [clienteId]);
    if (pagoIds.length) {
      const marcadores = pagoIds.map(() => '?').join(',');
      await connection.query(`DELETE FROM aplicaciones_pago WHERE pago_id IN (${marcadores})`, pagoIds);
      await connection.query(`DELETE FROM pagos WHERE id IN (${marcadores})`, pagoIds);
    }
    if (cuentaIds.length) {
      const marcadores = cuentaIds.map(() => '?').join(',');
      await connection.query(`DELETE FROM aplicaciones_pago WHERE cuenta_id IN (${marcadores})`, cuentaIds);
    }
    if (ordenIds.length) {
      const marcadores = ordenIds.map(() => '?').join(',');
      await connection.query(`DELETE FROM detalle_orden_venta WHERE orden_id IN (${marcadores})`, ordenIds);
      await connection.query(`DELETE FROM ordenes_venta WHERE id IN (${marcadores})`, ordenIds);
    }
    await connection.query('DELETE FROM cuentas_por_cobrar WHERE cliente_id=?', [clienteId]);
    if (ventaIds.length) {
      const marcadores = ventaIds.map(() => '?').join(',');
      await connection.query(`DELETE FROM detalle_venta WHERE venta_id IN (${marcadores})`, ventaIds);
      await connection.query(`DELETE FROM ventas WHERE id IN (${marcadores})`, ventaIds);
    }

    const resumenAuditoria = {
      cliente: diagnostico.cliente,
      ventas: diagnostico.ventas,
      pagos: diagnostico.pagos,
      cuentas: diagnostico.cuentas,
      ordenes: diagnostico.ordenes,
      productos_reintegrados: diagnostico.productos_reintegrados,
      folios_venta: ventaIds
    };
    await connection.query(
      `INSERT INTO auditoria_eliminaciones
       (entidad,entidad_id,descripcion,resumen_json,motivo,ejecutado_por,ejecutado_at)
       VALUES ('CLIENTE',?,'Eliminación controlada de datos de prueba',?,?,?,NOW())`,
      [clienteId, JSON.stringify(resumenAuditoria), motivo, req.usuario.id]
    );
    await connection.query('DELETE FROM clientes WHERE id=?', [clienteId]);
    await connection.commit();
    return res.json({
      ok: true,
      modo: 'DESTRUCTIVO_PRUEBAS',
      mensaje: 'Cliente y datos de prueba eliminados correctamente',
      resumen: {
        ventas_eliminadas: diagnostico.ventas,
        pagos_eliminados: diagnostico.pagos,
        cuentas_eliminadas: diagnostico.cuentas,
        ordenes_eliminadas: diagnostico.ordenes,
        productos_reintegrados: diagnostico.productos_reintegrados
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error eliminando cliente:', { clienteId, code: error.code, message: error.message });
    return res.status(error.status || 500).json({
      error: error.status ? error.message : 'No fue posible eliminar el cliente; no se aplicaron cambios'
    });
  } finally {
    connection.release();
  }
});

module.exports = router;
