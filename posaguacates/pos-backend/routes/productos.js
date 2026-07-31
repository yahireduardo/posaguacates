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
  if (![p.precio, p.costo, p.minimo].every(Number.isFinite) || p.precio < 0 || p.costo < 0 || p.minimo < 0) return 'Precios, costo y stock mínimo deben ser números no negativos';
  if (p.unidad === 'CAJA' && (!Number.isFinite(p.kilosCaja) || p.kilosCaja <= 0)) return 'Kilos por caja es obligatorio para productos por caja';
  return null;
}

router.get('/', async (req, res, next) => {
  const buscar = String(req.query.buscar || '').trim();
  const incluirInactivos = req.usuario.rol === 'ADMON_GRAL' && req.query.incluir_inactivos === '1';
  try {
    const [rows] = await db.promise.query(
      `SELECT p.id,p.codigo,p.nombre,p.descripcion,p.precio_venta,p.costo,p.stock,p.stock_minimo,
              p.unidad,p.kilos_por_caja,p.proveedor_id,p.activo,pr.nombre proveedor
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
  try {
    const [result] = await db.promise.query(
      `INSERT INTO productos (codigo,nombre,descripcion,precio_venta,costo,stock,stock_minimo,unidad,kilos_por_caja,proveedor_id,activo)
       VALUES (?,?,?,?,?,0,?,?,?,?,1)`, [p.codigo,p.nombre,p.descripcion,p.precio,p.costo,p.minimo,p.unidad,p.kilosCaja,p.proveedor]
    );
    res.status(201).json({ id: result.insertId, mensaje: 'Producto creado; el stock se agrega desde Inventario' });
  } catch (error) { if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El código ya existe' }); next(error); }
});

router.put('/:id', permitirRoles('ADMON_GRAL'), async (req, res, next) => {
  const id=Number(req.params.id),p=datos(req.body),errorValidacion=validar(p);
  if (!Number.isInteger(id)||id<=0||errorValidacion) return res.status(400).json({ error:errorValidacion||'Producto inválido' });
  try {
    const [result]=await db.promise.query(`UPDATE productos SET codigo=?,nombre=?,descripcion=?,precio_venta=?,costo=?,stock_minimo=?,unidad=?,kilos_por_caja=?,proveedor_id=? WHERE id=?`,[p.codigo,p.nombre,p.descripcion,p.precio,p.costo,p.minimo,p.unidad,p.kilosCaja,p.proveedor,id]);
    if(!result.affectedRows)return res.status(404).json({error:'Producto no encontrado'}); res.json({mensaje:'Producto actualizado'});
  } catch(error){if(error.code==='ER_DUP_ENTRY')return res.status(409).json({error:'El código ya existe'});next(error);}
});

router.patch('/:id/estado', permitirRoles('ADMON_GRAL'), async(req,res,next)=>{
  const id=Number(req.params.id),activo=req.body.activo===true||req.body.activo===1;
  if(!Number.isInteger(id)||id<=0)return res.status(400).json({error:'Producto inválido'});
  try{const [r]=await db.promise.query('UPDATE productos SET activo=? WHERE id=?',[activo?1:0,id]);if(!r.affectedRows)return res.status(404).json({error:'Producto no encontrado'});res.json({mensaje:activo?'Producto activado':'Producto desactivado'});}catch(e){next(e);}
});

router.put('/:id/precio', permitirRoles('ADMON_GRAL'), async(req,res,next)=>{
  const id=Number(req.params.id),precio=Number(req.body.precio_venta);if(!Number.isInteger(id)||id<=0||!Number.isFinite(precio)||precio<0)return res.status(400).json({error:'Producto o precio inválido'});
  try{const[r]=await db.promise.query('UPDATE productos SET precio_venta=? WHERE id=?',[precio,id]);if(!r.affectedRows)return res.status(404).json({error:'Producto no encontrado'});res.json({mensaje:'Precio actualizado'});}catch(e){next(e);}
});
module.exports=router;
module.exports.datosProducto=datos;
