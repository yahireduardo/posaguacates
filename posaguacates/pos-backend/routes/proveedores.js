const express = require('express');
const db = require('../db/conexion');
const { permitirRoles } = require('../middleware/auth');
const { datosProveedor, validarProveedor } = require('../lib/proveedores');
const { validarConfirmacionProveedor, proveedorTieneCompras } = require('../lib/eliminacionProveedor');

const router = express.Router();
const soloAdmin = permitirRoles('ADMON_GRAL');

router.get('/', async (req, res, next) => {
  try {
    const buscar = String(req.query.buscar || '').trim().replace(/\s+/g, ' ');
    const estado = String(req.query.estado || 'ACTIVOS').toUpperCase();
    const incluirInactivos = req.usuario.rol === 'ADMON_GRAL' && ['TODOS', 'INACTIVOS'].includes(estado);
    const soloInactivos = incluirInactivos && estado === 'INACTIVOS';
    const [rows] = await db.promise.query(
      `SELECT p.id,p.nombre,p.razon_social,p.contacto,p.telefono,p.correo,p.direccion,p.rfc,p.notas,
              p.activo,p.creado_en,p.actualizado_en,
              (SELECT COUNT(*) FROM producto_proveedores pp WHERE pp.proveedor_id=p.id AND pp.activo=1) productos,
              (SELECT MAX(c.fecha) FROM compras c WHERE c.proveedor_id=p.id AND c.estado='ACTIVA') ultima_compra,
              (SELECT COALESCE(SUM(c.total),0) FROM compras c WHERE c.proveedor_id=p.id AND c.estado='ACTIVA') total_comprado,
              (SELECT COALESCE(SUM(cpp.saldo_pendiente),0) FROM cuentas_por_pagar_proveedores cpp
               WHERE cpp.proveedor_id=p.id AND cpp.estado='PENDIENTE') deuda_pendiente
       FROM proveedores p
       WHERE (?=1 OR p.activo=1) AND (?=0 OR p.activo=0)
         AND (?='' OR p.nombre LIKE ? OR p.razon_social LIKE ? OR p.contacto LIKE ?
              OR p.telefono LIKE ? OR p.rfc LIKE ? OR p.correo LIKE ?)
       ORDER BY p.nombre ASC`,
      [incluirInactivos ? 1 : 0, soloInactivos ? 1 : 0, buscar,
        ...Array(6).fill(`%${buscar}%`)]
    );
    if (req.usuario.rol !== 'ADMON_GRAL') {
      return res.json(rows.map(({ total_comprado, deuda_pendiente, notas, direccion, ...row }) => row));
    }
    return res.json(rows);
  } catch (error) { return next(error); }
});

router.get('/:id', soloAdmin, async (req, res, next) => {
  try {
    const [proveedores] = await db.promise.query(
      `SELECT p.*,
              COALESCE(SUM(CASE WHEN c.estado='ACTIVA' THEN c.total ELSE 0 END),0) total_comprado,
              MAX(CASE WHEN c.estado='ACTIVA' THEN c.fecha END) ultima_compra,
              (SELECT COALESCE(SUM(cpp.saldo_pendiente),0) FROM cuentas_por_pagar_proveedores cpp
               WHERE cpp.proveedor_id=p.id AND cpp.estado='PENDIENTE') deuda_pendiente
       FROM proveedores p LEFT JOIN compras c ON c.proveedor_id=p.id WHERE p.id=? GROUP BY p.id`,
      [req.params.id]
    );
    if (!proveedores.length) return res.status(404).json({ error: 'Proveedor no encontrado' });
    const [compras, productos, cuentas, pagos] = await Promise.all([
      db.promise.query(
        'SELECT id,folio,referencia,total,estado,fecha FROM compras WHERE proveedor_id=? ORDER BY fecha DESC,id DESC LIMIT 100',
        [req.params.id]
      ).then(([rows]) => rows),
      db.promise.query(
        `SELECT pr.id,pr.codigo,pr.nombre,pr.activo,pp.codigo_proveedor,pp.costo_ultimo,
                pp.ultima_compra_at,pr.proveedor_id=? principal
         FROM producto_proveedores pp JOIN productos pr ON pr.id=pp.producto_id
         WHERE pp.proveedor_id=? AND pp.activo=1 ORDER BY pr.nombre`,
        [req.params.id, req.params.id]
      ).then(([rows]) => rows)
      ,db.promise.query(
        `SELECT cpp.id,cpp.compra_id,cpp.total_deuda,cpp.saldo_pendiente,cpp.estado,cpp.fecha,c.folio
         FROM cuentas_por_pagar_proveedores cpp JOIN compras c ON c.id=cpp.compra_id
         WHERE cpp.proveedor_id=? ORDER BY cpp.fecha,cpp.id`, [req.params.id]
      ).then(([rows]) => rows)
      ,db.promise.query(
        `SELECT pp.id,pp.cuenta_id,pp.monto,pp.metodo_pago,pp.referencia,pp.observaciones,
                pp.fecha,pp.estado,u.nombre usuario,c.folio
         FROM pagos_proveedores pp JOIN usuarios u ON u.id=pp.usuario_id
         JOIN cuentas_por_pagar_proveedores cpp ON cpp.id=pp.cuenta_id
         JOIN compras c ON c.id=cpp.compra_id WHERE pp.proveedor_id=?
         ORDER BY pp.fecha,pp.id`, [req.params.id]
      ).then(([rows]) => rows)
    ]);
    const movimientos = [
      ...cuentas.map(c => ({ id: `C-${c.id}`, fecha: c.fecha, tipo: 'COMPRA', folio: c.folio,
        cargo: c.estado === 'CANCELADA' ? 0 : Number(c.total_deuda), abono: 0,
        estado: c.estado, descripcion: c.estado === 'CANCELADA' ? 'Compra cancelada' : 'Compra registrada' })),
      ...pagos.map(p => ({ id: `P-${p.id}`, fecha: p.fecha, tipo: 'PAGO', folio: p.folio,
        cargo: 0, abono: p.estado === 'ACTIVO' ? Number(p.monto) : 0, estado: p.estado,
        descripcion: [p.metodo_pago, p.referencia && `Ref. ${p.referencia}`, p.observaciones].filter(Boolean).join(' · '),
        usuario: p.usuario }))
    ].sort((a, b) => new Date(a.fecha) - new Date(b.fecha) || String(a.id).localeCompare(String(b.id)));
    let saldo = 0;
    for (const movimiento of movimientos) {
      saldo = Number((saldo + movimiento.cargo - movimiento.abono).toFixed(2));
      movimiento.saldo = saldo;
    }
    return res.json({ proveedor: proveedores[0], compras, productos, cuentas, pagos, movimientos });
  } catch (error) { return next(error); }
});

async function duplicado(connection, p, excluirId = 0) {
  const [rows] = await connection.query(
    `SELECT id FROM proveedores WHERE id<>? AND
      (LOWER(nombre)=LOWER(?) OR (? IS NOT NULL AND rfc=?) OR (? IS NOT NULL AND LOWER(correo)=LOWER(?))) LIMIT 1`,
    [excluirId, p.nombre, p.rfc, p.rfc, p.correo, p.correo]
  );
  return rows.length > 0;
}

router.post('/', soloAdmin, async (req, res, next) => {
  const p = datosProveedor(req.body); const error = validarProveedor(p);
  if (error) return res.status(400).json({ error });
  try {
    if (await duplicado(db.promise, p)) return res.status(409).json({ error: 'Ya existe un proveedor con el mismo nombre, RFC o correo' });
    const [result] = await db.promise.query(
      `INSERT INTO proveedores (nombre,razon_social,contacto,telefono,correo,direccion,rfc,notas)
       VALUES (?,?,?,?,?,?,?,?)`, Object.values(p)
    );
    return res.status(201).json({ id: result.insertId, mensaje: 'Proveedor creado' });
  } catch (errorDb) { return next(errorDb); }
});

router.put('/:id', soloAdmin, async (req, res, next) => {
  const id = Number(req.params.id), p = datosProveedor(req.body), error = validarProveedor(p);
  if (!Number.isInteger(id) || id <= 0 || error) return res.status(400).json({ error: error || 'Proveedor inválido' });
  try {
    if (await duplicado(db.promise, p, id)) return res.status(409).json({ error: 'Ya existe un proveedor con el mismo nombre, RFC o correo' });
    const [result] = await db.promise.query(
      `UPDATE proveedores SET nombre=?,razon_social=?,contacto=?,telefono=?,correo=?,direccion=?,rfc=?,notas=? WHERE id=?`,
      [...Object.values(p), id]
    );
    if (!result.affectedRows) return res.status(404).json({ error: 'Proveedor no encontrado' });
    return res.json({ mensaje: 'Proveedor actualizado' });
  } catch (errorDb) { return next(errorDb); }
});

router.patch('/:id/estado', soloAdmin, async (req, res, next) => {
  const id = Number(req.params.id), activo = req.body.activo === true || req.body.activo === 1;
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Proveedor inválido' });
  try {
    const [result] = await db.promise.query('UPDATE proveedores SET activo=? WHERE id=?', [activo ? 1 : 0, id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Proveedor no encontrado' });
    return res.json({ mensaje: activo ? 'Proveedor activado' : 'Proveedor desactivado' });
  } catch (error) { return next(error); }
});

router.delete('/:id', soloAdmin, async (req, res, next) => {
  const id=Number(req.params.id);
  if(!Number.isInteger(id)||id<=0)return res.status(400).json({error:'Proveedor inválido'});
  if(!validarConfirmacionProveedor(req.body.confirmacion))return res.status(400).json({error:'Confirma la eliminación del proveedor'});
  const connection=await db.promise.getConnection();
  try{
    await connection.beginTransaction();
    const[[proveedor]]=await connection.query('SELECT id,nombre FROM proveedores WHERE id=? FOR UPDATE',[id]);
    if(!proveedor)throw Object.assign(new Error('Proveedor no encontrado'),{status:404});
    const[[uso]]=await connection.query('SELECT COUNT(*) compras FROM compras WHERE proveedor_id=?',[id]);
    if(proveedorTieneCompras(uso))throw Object.assign(new Error('No se puede eliminar: el proveedor tiene compras asociadas'),{status:409});
    await connection.query('UPDATE productos SET proveedor_id=NULL WHERE proveedor_id=?',[id]);
    await connection.query('DELETE FROM producto_proveedores WHERE proveedor_id=?',[id]);
    await connection.query('DELETE FROM proveedores WHERE id=?',[id]);
    await connection.commit();
    return res.json({mensaje:'Proveedor eliminado correctamente'});
  }catch(error){await connection.rollback();return next(error)}finally{connection.release()}
});

module.exports = router;
