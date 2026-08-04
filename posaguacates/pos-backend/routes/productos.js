const express = require('express');
const db = require('../db/conexion');
const { permitirRoles } = require('../middleware/auth');
const router = express.Router();

function datos(body) {
  const kilosCaja = Number(body.kilos_por_caja);
  return {
    codigo: String(body.codigo || '').trim().toUpperCase(), nombre: String(body.nombre || '').trim(),
    descripcion: String(body.descripcion || '').trim() || null, precio: Number(body.precio_venta),
    costo: Number(body.costo || 0), unidad: String(body.unidad || '').toUpperCase(),
    kilosCaja: body.kilos_por_caja === null || body.kilos_por_caja === '' || body.kilos_por_caja === undefined || !Number.isFinite(kilosCaja) ? null : kilosCaja,
    minimo: Number(body.stock_minimo || 0), proveedor: body.proveedor_id ? Number(body.proveedor_id) : null
  };
}
function validar(p) {
  if (!p.codigo || !p.nombre || !['KG', 'CAJA'].includes(p.unidad)) return 'Código, nombre y unidad (KG o CAJA) son obligatorios';
  if (!Number.isInteger(p.precio) || !Number.isInteger(p.costo) || !Number.isFinite(p.minimo) || p.precio < 0 || p.costo < 0 || p.minimo < 0) return 'Precio y costo deben ser pesos enteros; el stock mínimo debe ser un número no negativo';
  if (p.unidad === 'CAJA' && !Number.isInteger(p.minimo * 2)) return 'El stock mínimo por caja debe avanzar de 0.5 en 0.5';
  if (p.unidad === 'CAJA' && (!Number.isFinite(p.kilosCaja) || p.kilosCaja <= 0)) return 'Kilos por caja es obligatorio para productos por caja';
  if (p.kilosCaja !== null && (!Number.isFinite(p.kilosCaja) || p.kilosCaja <= 0)) return 'Kilos por caja debe ser un número mayor que cero';
  return null;
}

router.get('/', async (req, res, next) => {
  const buscar = String(req.query.buscar || '').trim();
  const incluirInactivos = req.usuario.rol === 'ADMON_GRAL' && req.query.incluir_inactivos === '1';
  try {
    const [rows] = await db.promise.query(
      `SELECT p.id,p.codigo,p.nombre,p.descripcion,p.precio_venta,p.costo,p.stock,p.stock_minimo,
              p.unidad,p.kilos_por_caja,p.proveedor_id,p.activo,pr.nombre proveedor,
              (SELECT COUNT(*) FROM producto_proveedores pp WHERE pp.producto_id=p.id AND pp.activo=1) proveedores_asociados,
              (SELECT MAX(pp.ultima_compra_at) FROM producto_proveedores pp WHERE pp.producto_id=p.id AND pp.activo=1) ultima_compra
       FROM productos p LEFT JOIN proveedores pr ON pr.id=p.proveedor_id
       WHERE (?=1 OR p.activo=1) AND (?='' OR p.codigo LIKE ? OR p.nombre LIKE ?)
       ORDER BY p.activo DESC,p.nombre`,
      [incluirInactivos ? 1 : 0, buscar, `%${buscar}%`, `%${buscar}%`]
    );
    res.json(rows);
  } catch (error) { next(error); }
});

router.get('/stock-bajo', async (req, res, next) => {
  try { const [rows] = await db.promise.query('SELECT id,codigo,nombre,stock,stock_minimo,unidad FROM productos WHERE activo=1 AND stock<=stock_minimo ORDER BY stock'); res.json(rows); }
  catch (error) { next(error); }
});

router.post('/', permitirRoles('ADMON_GRAL'), async (req, res, next) => {
  const p = datos(req.body); const errorValidacion = validar(p);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });
  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    if (p.proveedor) {
      const [[proveedor]] = await connection.query('SELECT id FROM proveedores WHERE id=? AND activo=1', [p.proveedor]);
      if (!proveedor) throw Object.assign(new Error('El proveedor principal no está disponible'), { status: 409 });
    }
    const [result] = await connection.query(
      `INSERT INTO productos (codigo,nombre,descripcion,precio_venta,costo,stock,stock_minimo,unidad,kilos_por_caja,proveedor_id,activo)
       VALUES (?,?,?,?,?,0,?,?,?,?,1)`, [p.codigo,p.nombre,p.descripcion,p.precio,p.costo,p.minimo,p.unidad,p.kilosCaja,p.proveedor]
    );
    if (p.proveedor) await connection.query('INSERT INTO producto_proveedores(producto_id,proveedor_id,activo) VALUES(?,?,1)', [result.insertId, p.proveedor]);
    await connection.commit();
    res.status(201).json({ id: result.insertId, mensaje: 'Producto creado; el stock se agrega desde Inventario' });
  } catch (error) { await connection.rollback(); if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El código ya existe' }); next(error); }
  finally { connection.release(); }
});

router.put('/:id', permitirRoles('ADMON_GRAL'), async (req, res, next) => {
  const id=Number(req.params.id),p=datos(req.body),errorValidacion=validar(p);
  if (!Number.isInteger(id)||id<=0||errorValidacion) return res.status(400).json({ error:errorValidacion||'Producto inválido' });
  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    if(p.proveedor){const[[proveedor]]=await connection.query('SELECT id FROM proveedores WHERE id=? AND activo=1',[p.proveedor]);if(!proveedor)throw Object.assign(new Error('El proveedor principal no está disponible'),{status:409});}
    const [result]=await connection.query(`UPDATE productos SET codigo=?,nombre=?,descripcion=?,precio_venta=?,costo=?,stock_minimo=?,unidad=?,kilos_por_caja=?,proveedor_id=? WHERE id=?`,[p.codigo,p.nombre,p.descripcion,p.precio,p.costo,p.minimo,p.unidad,p.kilosCaja,p.proveedor,id]);
    if(!result.affectedRows)throw Object.assign(new Error('Producto no encontrado'),{status:404});
    if(p.proveedor)await connection.query(`INSERT INTO producto_proveedores(producto_id,proveedor_id,activo) VALUES(?,?,1) ON DUPLICATE KEY UPDATE activo=1`,[id,p.proveedor]);
    await connection.commit();
    res.json({mensaje:'Producto actualizado'});
  } catch(error){await connection.rollback();if(error.code==='ER_DUP_ENTRY')return res.status(409).json({error:'El código ya existe'});next(error);}finally{connection.release();}
});

router.patch('/:id/estado', permitirRoles('ADMON_GRAL'), async(req,res,next)=>{
  const id=Number(req.params.id),activo=req.body.activo===true||req.body.activo===1;
  if(!Number.isInteger(id)||id<=0)return res.status(400).json({error:'Producto inválido'});
  try{const [r]=await db.promise.query('UPDATE productos SET activo=? WHERE id=?',[activo?1:0,id]);if(!r.affectedRows)return res.status(404).json({error:'Producto no encontrado'});res.json({mensaje:activo?'Producto activado':'Producto desactivado'});}catch(e){next(e);}
});

router.get('/:id/proveedores', permitirRoles('ADMON_GRAL'), async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Producto inválido' });
  try {
    const [rows] = await db.promise.query(
      `SELECT pp.proveedor_id,p.nombre,p.activo proveedor_activo,pp.codigo_proveedor,
              pp.costo_ultimo,pp.ultima_compra_at,pp.activo,pr.proveedor_id=pp.proveedor_id principal
       FROM producto_proveedores pp
       JOIN proveedores p ON p.id=pp.proveedor_id JOIN productos pr ON pr.id=pp.producto_id
       WHERE pp.producto_id=? ORDER BY principal DESC,p.nombre`, [id]
    );
    return res.json(rows);
  } catch (error) { return next(error); }
});

router.put('/:id/proveedores', permitirRoles('ADMON_GRAL'), async (req, res, next) => {
  const id = Number(req.params.id);
  const proveedores = Array.isArray(req.body.proveedores) ? req.body.proveedores : [];
  const ids = proveedores.map(item => Number(item.proveedor_id));
  if (!Number.isInteger(id) || id <= 0 || ids.some(x => !Number.isInteger(x) || x <= 0) || new Set(ids).size !== ids.length) {
    return res.status(400).json({ error: 'Producto o proveedores inválidos' });
  }
  const connection = await db.promise.getConnection();
  try {
    await connection.beginTransaction();
    const [[producto]] = await connection.query('SELECT id,proveedor_id FROM productos WHERE id=? FOR UPDATE', [id]);
    if (!producto) throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
    if (ids.length) {
      const [activos] = await connection.query(`SELECT id FROM proveedores WHERE activo=1 AND id IN (${ids.map(() => '?').join(',')})`, ids);
      if (activos.length !== ids.length) throw Object.assign(new Error('Todos los proveedores asociados deben estar activos'), { status: 409 });
    }
    await connection.query('UPDATE producto_proveedores SET activo=0 WHERE producto_id=?', [id]);
    for (const item of proveedores) {
      await connection.query(
        `INSERT INTO producto_proveedores(producto_id,proveedor_id,codigo_proveedor,activo)
         VALUES(?,?,?,1) ON DUPLICATE KEY UPDATE codigo_proveedor=VALUES(codigo_proveedor),activo=1`,
        [id, Number(item.proveedor_id), String(item.codigo_proveedor || '').trim() || null]
      );
    }
    const principal = req.body.proveedor_principal_id ? Number(req.body.proveedor_principal_id) : null;
    if (principal && !ids.includes(principal)) throw Object.assign(new Error('El proveedor principal debe estar asociado'), { status: 400 });
    await connection.query('UPDATE productos SET proveedor_id=? WHERE id=?', [principal, id]);
    await connection.commit();
    return res.json({ mensaje: 'Proveedores del producto actualizados' });
  } catch (error) {
    await connection.rollback(); return next(error);
  } finally { connection.release(); }
});

router.put('/:id/precio', permitirRoles('ADMON_GRAL'), async(req,res,next)=>{
  const id=Number(req.params.id),precio=Number(req.body.precio_venta);if(!Number.isInteger(id)||id<=0||!Number.isInteger(precio)||precio<0)return res.status(400).json({error:'Producto o precio entero inválido'});
  try{const[r]=await db.promise.query('UPDATE productos SET precio_venta=? WHERE id=?',[precio,id]);if(!r.affectedRows)return res.status(404).json({error:'Producto no encontrado'});res.json({mensaje:'Precio actualizado'});}catch(e){next(e);}
});
module.exports=router;
module.exports.datosProducto=datos;
module.exports.validarProducto=validar;
