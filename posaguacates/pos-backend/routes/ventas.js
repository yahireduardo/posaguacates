const express = require('express');
const db = require('../db/conexion');

const {
  permitirRoles
} = require('../middleware/auth');
const { esCantidadValida, mensajeCantidad } = require('../lib/cantidades');
const {
  resolverAutorizacionAdmin,
  registrarAuditoriaSiExiste
} = require('../lib/autorizacionAdmin');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../middleware/auth');

const router = express.Router();

/* =========================================================
   VENTAS DE MOSTRADOR CON FILTROS
   Administrador General y Cajero
========================================================= */

router.get(
  '/',
  permitirRoles('ADMON_GRAL', 'CAJERO'),
  async (req, res) => {

    try {

      const folio =
        String(req.query.folio || '').trim();

      const cliente =
        String(req.query.cliente || '').trim();

      const fechaInicio =
        String(req.query.fecha_inicio || '').trim();

      const fechaFin =
        String(req.query.fecha_fin || '').trim();

      const estadoVenta =
        String(req.query.estado_venta || '').trim();

      const tipoPago =
        String(req.query.tipo_pago || '').trim();

      const limiteSolicitado =
        Number(req.query.limite || 100);

      const limite =
        Number.isInteger(limiteSolicitado)
          ? Math.min(
              Math.max(limiteSolicitado, 1),
              500
            )
          : 100;

      const paginaSolicitada = Number(req.query.pagina || 1);
      const pagina = Number.isInteger(paginaSolicitada) && paginaSolicitada > 0
        ? paginaSolicitada : 1;
      const offset = (pagina - 1) * limite;

      const fechaValida = valor => /^\d{4}-\d{2}-\d{2}$/.test(valor) &&
        !Number.isNaN(Date.parse(`${valor}T00:00:00Z`));
      if ((fechaInicio && !fechaValida(fechaInicio)) || (fechaFin && !fechaValida(fechaFin)) ||
          (fechaInicio && fechaFin && fechaInicio > fechaFin)) {
        return res.status(400).json({ error: 'Rango de fechas inválido' });
      }

      const condiciones = [];
      const parametros = [];

      /* =========================
         FILTRO POR FOLIO
      ========================= */

      if (folio) {

        if (/^\d+$/.test(folio)) {
          condiciones.push('v.id = ?');
          parametros.push(Number(folio));
        } else {
          return res.status(400).json({ error: 'El folio debe ser numérico' });
        }

      }

      /* =========================
         FILTRO POR CLIENTE
      ========================= */

      if (cliente) {

        condiciones.push(
          'c.nombre_razon_social LIKE ?'
        );

        parametros.push(
          `%${cliente}%`
        );

      }

      /* =========================
         FILTRO FECHA INICIAL
      ========================= */

      if (fechaInicio) {

        condiciones.push(
          'DATE(v.fecha) >= ?'
        );

        parametros.push(
          fechaInicio
        );

      }

      /* =========================
         FILTRO FECHA FINAL
      ========================= */

      if (fechaFin) {

        condiciones.push(
          'DATE(v.fecha) <= ?'
        );

        parametros.push(
          fechaFin
        );

      }

      /* =========================
         FILTRO ESTADO
      ========================= */

      if (
        ['ACTIVA', 'CANCELADA']
          .includes(estadoVenta)
      ) {

        condiciones.push(
          'v.estado_venta = ?'
        );

        parametros.push(
          estadoVenta
        );

      }

      /* =========================
         FILTRO TIPO DE PAGO
      ========================= */

      if (
        ['CONTADO', 'CREDITO']
          .includes(tipoPago)
      ) {

        condiciones.push(
          'v.tipo_pago = ?'
        );

        parametros.push(
          tipoPago
        );

      }

      const where =
        condiciones.length > 0
          ? `WHERE ${condiciones.join(' AND ')}`
          : '';

      const [ventas] =
        await db.promise.query(
          `
            SELECT
              v.id,
              v.fecha,
              v.total,
              v.tipo_pago,
              v.metodo_pago,
              v.estado_pago,
              v.estado_venta,
              v.impresiones,
              v.cancelada_at,
              v.motivo_cancelacion,

              c.nombre_razon_social
                AS cliente,

              u.username
                AS usuario

            FROM ventas v

            LEFT JOIN clientes c
              ON c.id = v.cliente_id

            LEFT JOIN usuarios u
              ON u.id = v.usuario_id

            ${where}

            ORDER BY
              v.fecha DESC,
              v.id DESC

            LIMIT ? OFFSET ?
          `,
          [
            ...parametros,
            limite,
            offset
          ]
        );

      return res.json(ventas);

    } catch (error) {

      console.error(
        'Error consultando ventas:',
        error
      );

      return res.status(500).json({
        error:
          'No fue posible consultar las ventas'
      });

    }

  }
);



/* =========================================================
   DETALLE DE UNA VENTA
========================================================= */

router.get(
  '/:ventaId/detalle',
  async (req, res) => {

    try {

      const ventaId =
        Number(req.params.ventaId);

      if (
        !Number.isInteger(ventaId) ||
        ventaId <= 0
      ) {

        return res.status(400).json({
          error: 'ID de venta inválido'
        });

      }

      const [ventas] =
        await db.promise.query(
          `
            SELECT
              v.id,
              v.fecha,
              v.total,
              v.tipo_pago,
              v.metodo_pago,
              v.estado_pago,
              v.estado_venta,
              v.impresiones,
              v.cancelada_at,
              v.motivo_cancelacion,

              c.nombre_razon_social
                AS cliente,

              c.rfc,
              c.telefono,
              c.correo_electronico,

              u.username
                AS usuario

            FROM ventas v

            LEFT JOIN clientes c
              ON c.id = v.cliente_id

            LEFT JOIN usuarios u
              ON u.id = v.usuario_id

            WHERE v.id = ?

            LIMIT 1
          `,
          [ventaId]
        );

      if (!ventas.length) {

        return res.status(404).json({
          error: 'Venta no encontrada'
        });

      }

      const [productos] =
        await db.promise.query(
          `
            SELECT
              dv.producto_id,
              p.codigo,
              p.nombre,
              p.unidad,
              dv.cantidad,
              dv.precio_unitario,
              dv.subtotal

            FROM detalle_venta dv

            INNER JOIN productos p
              ON p.id = dv.producto_id

            WHERE dv.venta_id = ?

            ORDER BY dv.id
          `,
          [ventaId]
        );

      return res.json({
        venta: ventas[0],
        productos
      });

    } catch (error) {

      console.error(
        'Error consultando detalle:',
        error
      );

      return res.status(500).json({
        error:
          'No fue posible consultar el detalle'
      });

    }

  }
);


/* =========================================================
   CREAR VENTA
   Administrador y Cajero
========================================================= */

router.post('/crear', async (req, res) => {

  const clienteId =
    Number(req.body.cliente_id);

  const tipoPago =
    String(
      req.body.tipo_pago || ''
    ).toUpperCase();

  const metodoPagoCapturado = String(req.body.metodo_pago || '').toUpperCase();
  const metodoPago = tipoPago === 'CREDITO' ? null : (metodoPagoCapturado || 'EFECTIVO');
  const referenciaPago = tipoPago === 'CREDITO' ? null : (String(req.body.referencia_pago || '').trim() || null);
  const idempotencyKey = String(req.get('Idempotency-Key') || req.body.idempotency_key || '').trim();

  const productos =
    Array.isArray(req.body.productos)
      ? req.body.productos
      : [];

  /* =========================
     VALIDACIONES
  ========================= */

  if (
    !Number.isInteger(clienteId) ||
    clienteId <= 0
  ) {

    return res.status(400).json({
      error: 'Cliente inválido'
    });

  }

  if (
    !['CONTADO', 'CREDITO']
      .includes(tipoPago)
  ) {

    return res.status(400).json({
      error: 'Tipo de pago inválido'
    });

  }

  if (tipoPago === 'CONTADO' && !['EFECTIVO', 'TRANSFERENCIA', 'CHEQUE'].includes(metodoPago)) {
    return res.status(400).json({
      error: 'Método de pago inválido'
    });
  }

  if (!/^[A-Za-z0-9._:-]{8,80}$/.test(idempotencyKey)) {
    return res.status(400).json({ error: 'Idempotency-Key inválido o ausente' });
  }
  if (tipoPago === 'CONTADO' && metodoPago !== 'EFECTIVO' && !referenciaPago) {
    return res.status(400).json({ error: 'La referencia es obligatoria para transferencia o cheque' });
  }

  if (productos.length === 0) {

    return res.status(400).json({
      error: 'No hay productos en la venta'
    });

  }

  /*
   * Agrupa productos repetidos.
   * Si el mismo producto aparece dos veces,
   * suma sus cantidades.
   */

  const cantidades = new Map();
  const preciosCapturados = new Map();

  for (const item of productos) {

    const productoId =
      Number(item.producto_id);

    const cantidad =
      Number(item.cantidad);

    const precioCapturado = item.precio_unitario == null ? null : Number(item.precio_unitario);

    if (
      !Number.isInteger(productoId) ||
      productoId <= 0 ||
      !Number.isFinite(cantidad) ||
      cantidad <= 0 ||
      (precioCapturado !== null && (!Number.isInteger(precioCapturado) || precioCapturado <= 0 || precioCapturado > 99999999))
    ) {

      return res.status(400).json({
        error: 'Producto, cantidad o precio entero inválido'
      });

    }

    cantidades.set(
      productoId,

      (
        cantidades.get(productoId) || 0
      ) + cantidad
    );
    if (precioCapturado !== null) {
      const anterior = preciosCapturados.get(productoId);
      if (anterior !== undefined && anterior !== precioCapturado) {
        return res.status(400).json({ error: 'Un producto repetido no puede tener precios diferentes' });
      }
      preciosCapturados.set(productoId, precioCapturado);
    }

  }

  let connection;

  try {

    connection =
      await db.promise.getConnection();

    await connection.beginTransaction();

    const [[ventaRepetida]] = await connection.query(
      'SELECT id,total FROM ventas WHERE idempotency_key=? FOR UPDATE', [idempotencyKey]
    );
    if (ventaRepetida) {
      await connection.rollback();
      return res.json({ mensaje: 'Venta ya registrada', venta_id: ventaRepetida.id,
        folio: ventaRepetida.id, total: Number(ventaRepetida.total), repetida: true });
    }

    /* =========================
       VALIDAR CLIENTE
    ========================= */

    const [clientes] =
      await connection.query(
        `
          SELECT id,nombre_razon_social,permite_credito

          FROM clientes

          WHERE id = ?
            AND activo = 1

          LIMIT 1
        `,
        [clienteId]
      );

    if (clientes.length === 0) {

      const error =
        new Error('Cliente no encontrado');

      error.status = 404;

      throw error;

    }
    if (tipoPago === 'CREDITO' && (!Number(clientes[0].permite_credito) ||
        /p[uú]blico\s+general/i.test(clientes[0].nombre_razon_social))) {
      const error = new Error('El cliente seleccionado no tiene crédito autorizado');
      error.status = 409;
      throw error;
    }

    /* =========================
       BLOQUEAR PRODUCTOS
    ========================= */

    const ids =
      [...cantidades.keys()];

    const placeholders =
      ids.map(() => '?').join(',');

    const [catalogo] =
      await connection.query(
        `
          SELECT
            id,
            codigo,
            nombre,
            precio_venta,
            stock,
            unidad

          FROM productos

          WHERE activo = 1
            AND id IN (${placeholders})

          ORDER BY id

          FOR UPDATE
        `,
        ids
      );

    if (catalogo.length !== ids.length) {

      const error =
        new Error(
          'Uno o más productos no existen'
        );

      error.status = 404;

      throw error;

    }

    /* =========================
       CALCULAR VENTA
    ========================= */

    let total = 0;

    const detalle = [];

    for (const producto of catalogo) {

      const cantidad =
        Number(
          cantidades.get(producto.id)
        );

      const stockDisponible =
        Number(producto.stock);

      if (!esCantidadValida(cantidad, producto.unidad)) {
        const error = new Error(mensajeCantidad(producto.unidad));
        error.status = 400;
        throw error;
      }

      if (
        stockDisponible < cantidad
      ) {

        const error =
          new Error(
            `Stock insuficiente para ${producto.nombre}. Disponible: ${stockDisponible}`
          );

        error.status = 409;

        throw error;

      }

      const precioCatalogo = Number(producto.precio_venta);
      const precio = Number((preciosCapturados.get(producto.id) ?? precioCatalogo).toFixed(2));

      const subtotal =
        Number(
          (cantidad * precio).toFixed(2)
        );

      total += subtotal;

      detalle.push({

        producto_id:
          producto.id,

        codigo:
          producto.codigo,

        nombre:
          producto.nombre,

        unidad:
          producto.unidad,

        cantidad,

        precio,

        subtotal,
        precio_catalogo: precioCatalogo,
        precio_modificado: precio !== precioCatalogo

      });

    }

    total =
      Number(total.toFixed(2));

    /* =========================
       INSERTAR VENTA
    ========================= */

    const estadoPago =
      tipoPago === 'CONTADO'
        ? 'PAGADO'
        : 'PENDIENTE';

    const [ventaResult] =
      await connection.query(
        `
          INSERT INTO ventas
          (
            cliente_id,
            usuario_id,
            total,
            tipo_pago,
            metodo_pago,
            referencia_pago,
            idempotency_key,
            estado_pago,
            estado_venta,
            impresiones
          )

          VALUES
          (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            'ACTIVA',
            0
          )
        `,
        [
          clienteId,
          req.usuario.id,
          total,
          tipoPago,
          metodoPago,
          referenciaPago,
          idempotencyKey,
          estadoPago
        ]
      );

    const ventaId =
      ventaResult.insertId;

    /* =========================
       DETALLES E INVENTARIO
    ========================= */

    for (const item of detalle) {

      await connection.query(
        `
          INSERT INTO detalle_venta
          (
            venta_id,
            producto_id,
            cantidad,
            precio_unitario,
            subtotal
          )

          VALUES (?, ?, ?, ?, ?)
        `,
        [
          ventaId,
          item.producto_id,
          item.cantidad,
          item.precio,
          item.subtotal
        ]
      );

      /*
       * La condición stock >= cantidad
       * evita existencias negativas.
       */

      const [stockResult] =
        await connection.query(
          `
            UPDATE productos

            SET stock = stock - ?

            WHERE id = ?
              AND stock >= ?
          `,
          [
            item.cantidad,
            item.producto_id,
            item.cantidad
          ]
        );

      if (
        stockResult.affectedRows === 0
      ) {

        const error =
          new Error(
            `Stock insuficiente para ${item.nombre}`
          );

        error.status = 409;

        throw error;

      }

      await connection.query(
        `
          INSERT INTO movimientos_inventario
          (
            producto_id,
            tipo,
            cantidad,
            stock_anterior,
            stock_final,
            motivo,
            referencia_tipo,
            referencia_id,
            usuario_id
          )

          VALUES
          (
            ?,
            'SALIDA',
            ?,
            ?,
            ?,
            'VENTA',
            'VENTA',
            ?,
            ?
          )
        `,
        [
          item.producto_id,
          item.cantidad,
          Number(catalogo.find(p => p.id === item.producto_id).stock),
          Number(catalogo.find(p => p.id === item.producto_id).stock) - item.cantidad,
          ventaId,
          req.usuario.id
        ]
      );

    }

    /* =========================
       CUENTA POR COBRAR
    ========================= */

    if (tipoPago === 'CREDITO') {

      const [cuentaResult] = await connection.query(
        `
          INSERT INTO cuentas_por_cobrar
          (
            venta_id,
            cliente_id,
            total_deuda,
            saldo_pendiente,
            estado
          )

          VALUES
          (
            ?,
            ?,
            ?,
            ?,
            'PENDIENTE'
          )
        `,
        [
          ventaId,
          clienteId,
          total,
          total
        ]
      );

      await connection.query(
        `INSERT INTO movimientos_cartera
         (cliente_id,venta_id,cuenta_id,fecha,concepto,folio,cargo,credito,saldo_resultante,descripcion,usuario_id)
         VALUES (?,?,?,NOW(),'VENTA_CREDITO',?,?,0,?,'Venta a crédito',?)`,
        [clienteId, ventaId, cuentaResult.insertId, ventaId, total, total, req.usuario.id]
      );

    }
    else {
      await connection.query(
        `INSERT INTO pagos (cliente_id,cuenta_id,monto,monto_total,metodo_pago,referencia,
          observaciones,usuario_id,fecha,estado) VALUES (?,NULL,?,?,?,?,'Pago de venta de contado',?,NOW(),'ACTIVO')`,
        [clienteId,total,total,metodoPago,referenciaPago,req.usuario.id]
      );
    }

    await connection.commit();

    return res.status(201).json({

      mensaje: 'Venta registrada',

      venta_id: ventaId,

      folio: ventaId,

      total,

      productos: detalle

    });

  } catch (error) {

    if (connection) {
      await connection.rollback();
    }

    console.error(
      'Error creando venta:',
      error
    );

    return res
      .status(error.status || 500)
      .json({

        error:
          error.status
            ? error.message
            : 'No fue posible registrar la venta'

      });

  } finally {

    if (connection) {
      connection.release();
    }

  }

});

/* =========================================================
   CANCELAR VENTA
   Solo Administrador General
   Reautenticación obligatoria del Administrador General
========================================================= */

router.get('/:ventaId/cancelacion-validacion', permitirRoles('ADMON_GRAL', 'CAJERO'), async (req, res) => {
  const ventaId = Number(req.params.ventaId);
  if (!Number.isInteger(ventaId) || ventaId <= 0) return res.status(400).json({ error: 'ID de venta inválido' });
  try {
    const [[venta]] = await db.promise.query(
      `SELECT v.id,v.estado_venta,v.tipo_pago,cxc.id cuenta_id,
              COALESCE((SELECT SUM(p.monto) FROM pagos p WHERE p.cuenta_id=cxc.id AND p.estado='ACTIVO'),0)
              + COALESCE((SELECT SUM(ap.monto_aplicado)
                          FROM aplicaciones_pago ap JOIN pagos p ON p.id=ap.pago_id
                          WHERE ap.cuenta_id=cxc.id AND p.estado='ACTIVO'),0) total_abonado
       FROM ventas v LEFT JOIN cuentas_por_cobrar cxc ON cxc.venta_id=v.id WHERE v.id=?`, [ventaId]
    );
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
    if (venta.estado_venta === 'CANCELADA') return res.json({ puede_cancelar: false, motivo: 'La venta ya está cancelada' });
    const totalAbonado = Number(venta.total_abonado);
    if (totalAbonado > 0) {
      return res.json({
        puede_cancelar: false,
        motivo: `La venta tiene ${totalAbonado.toFixed(2)} en pagos aplicados. Cancela primero el pago desde Cuentas`
      });
    }
    return res.json({ puede_cancelar: true });
  } catch (error) {
    console.error('Error validando cancelación:', { ventaId, code: error.code, message: error.message });
    return res.status(500).json({ error: 'No fue posible validar la cancelación' });
  }
});

router.post('/:ventaId/ticket-url', async (req, res) => {
  const ventaId = Number(req.params.ventaId);
  if (!Number.isInteger(ventaId) || ventaId <= 0) {
    return res.status(400).json({ error: 'ID de venta inválido' });
  }
  try {
    const [[venta]] = await db.promise.query(
      'SELECT id,estado_venta FROM ventas WHERE id=? LIMIT 1', [ventaId]
    );
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
    if (venta.estado_venta === 'CANCELADA') {
      return res.status(409).json({ error: 'No se puede imprimir una venta cancelada' });
    }
    const ticketToken = jwt.sign(
      { proposito: 'TICKET', venta_id: ventaId, usuario_id: req.usuario.id },
      jwtSecret(),
      { algorithm: 'HS256', expiresIn: '2m' }
    );
    return res.json({ url: `/tickets/${ventaId}?token=${encodeURIComponent(ticketToken)}` });
  } catch (error) {
    console.error('Error generando URL de ticket:', { ventaId, code: error.code, message: error.message });
    return res.status(500).json({ error: 'No fue posible preparar la impresión' });
  }
});

router.post(
  '/:ventaId/cancelar',

  permitirRoles('ADMON_GRAL', 'CAJERO'),

  async (req, res) => {

    const ventaId =
      Number(req.params.ventaId);

    const motivo =
      String(
        req.body.motivo || ''
      ).trim();

    if (
      !Number.isInteger(ventaId) ||
      ventaId <= 0
    ) {

      return res.status(400).json({
        error: 'ID de venta inválido'
      });

    }

    if (!motivo) {

      return res.status(400).json({
        error:
          'El motivo de cancelación es obligatorio'
      });

    }

    let connection;

    try {
      console.info('Cancelación de venta solicitada', {
        ventaId,
        usuarioId: req.usuario.id,
        rol: req.usuario.rol
      });
      const autorizacion = await resolverAutorizacionAdmin({
        usuario: req.usuario,
        body: req.body,
        buscarAdministrador: async username => {
          const [[administrador]] = await db.promise.query(
            `SELECT id,password_hash FROM usuarios
             WHERE username=? AND rol='ADMON_GRAL' AND activo=1 LIMIT 1`,
            [username]
          );
          return administrador;
        }
      });

      connection =
        await db.promise.getConnection();

      await connection.beginTransaction();

      /* =========================
         BLOQUEAR VENTA
      ========================= */

      const [ventas] =
        await connection.query(
          `
            SELECT
              id,
              cliente_id,
              total,
              tipo_pago,
              estado_venta

            FROM ventas

            WHERE id = ?

            FOR UPDATE
          `,
          [ventaId]
        );

      if (ventas.length === 0) {

        const error =
          new Error('Venta no encontrada');

        error.status = 404;

        throw error;

      }

      const venta =
        ventas[0];
      console.info('Venta bloqueada para cancelación', {
        ventaId,
        estado: venta.estado_venta,
        tipoPago: venta.tipo_pago
      });

      if (
        venta.estado_venta ===
        'CANCELADA'
      ) {

        const error =
          new Error(
            'La venta ya está cancelada'
          );

        error.status = 409;

        throw error;

      }

      /* =========================
         VALIDAR ABONOS
      ========================= */

      const [cuentas] =
        await connection.query(
          `
            SELECT
              id,
              total_deuda,
              saldo_pendiente,
              estado

            FROM cuentas_por_cobrar

            WHERE venta_id = ?

            FOR UPDATE
          `,
          [ventaId]
        );

      if (cuentas.length > 0) {

        const cuenta =
          cuentas[0];

        const [pagos] =
          await connection.query(
            `
              SELECT COALESCE(
                (SELECT SUM(p.monto) FROM pagos p WHERE p.cuenta_id = ? AND p.estado = 'ACTIVO'),
                0
              ) + COALESCE(
                (SELECT SUM(ap.monto_aplicado)
                 FROM aplicaciones_pago ap JOIN pagos p ON p.id=ap.pago_id
                 WHERE ap.cuenta_id = ? AND p.estado = 'ACTIVO'),
                0
              ) AS total_abonado
            `,
            [cuenta.id, cuenta.id]
          );

        const totalAbonado = Number(pagos[0].total_abonado);
        if (totalAbonado > 0) {
          const error = new Error(
            'No se puede cancelar una venta a crédito con pagos aplicados. Cancela primero el pago desde Cuentas'
          );
          error.status = 409;
          throw error;
        }

      }

      /* =========================
         RESTAURAR INVENTARIO
      ========================= */

      const [detalle] =
        await connection.query(
          `
            SELECT
              producto_id,
              cantidad

            FROM detalle_venta

            WHERE venta_id = ?
          `,
          [ventaId]
        );

      for (const item of detalle) {

        await connection.query(
          `
            UPDATE productos

            SET stock = stock + ?

            WHERE id = ?
          `,
          [
            item.cantidad,
            item.producto_id
          ]
        );

        await connection.query(
          `
            INSERT INTO movimientos_inventario
            (
              producto_id,
              tipo,
              cantidad,
              motivo,
              referencia_id,
              usuario_id
            )

            VALUES
            (
              ?,
              'ENTRADA',
              ?,
              'CANCELACION_VENTA',
              ?,
              ?
            )
          `,
          [
            item.producto_id,
            item.cantidad,
            ventaId,
            autorizacion.solicitadoPor
          ]
        );

      }
      console.info('Inventario restaurado por cancelación', {
        ventaId,
        productosRestaurados: detalle.length
      });

      /* =========================
         CANCELAR VENTA
      ========================= */

      await connection.query(
        `
          UPDATE ventas

          SET
            estado_venta = 'CANCELADA',
            cancelada_por = ?,
            cancelada_at = NOW(),
            motivo_cancelacion = ?

          WHERE id = ?
        `,
        [
          autorizacion.autorizadoPor,
          motivo,
          ventaId
        ]
      );

      /* =========================
         CANCELAR CUENTA
      ========================= */

      await connection.query(
        `
          UPDATE cuentas_por_cobrar

          SET
            estado = 'CANCELADA',
            saldo_pendiente = 0

          WHERE venta_id = ?
        `,
        [ventaId]
      );
      console.info('Cuenta por cobrar actualizada por cancelación', {
        ventaId,
        cuentasActualizadas: cuentas.length
      });

      if (cuentas.length) {
        const [[saldoCliente]] = await connection.query(
          "SELECT COALESCE(SUM(saldo_pendiente),0) total FROM cuentas_por_cobrar WHERE cliente_id=? AND estado='PENDIENTE'",
          [venta.cliente_id]
        );
        await connection.query(
          `INSERT INTO movimientos_cartera
           (cliente_id,venta_id,cuenta_id,fecha,concepto,folio,cargo,credito,saldo_resultante,descripcion,usuario_id)
           VALUES (?,?,?,NOW(),'CANCELACION',?,0,?,?,?,?)`,
          [venta.cliente_id, ventaId, cuentas[0].id, `V-${ventaId}`, cuentas[0].saldo_pendiente,
            saldoCliente.total, `Cancelación: ${motivo}`, autorizacion.solicitadoPor]
        );
      }

      const auditoriaRegistrada = await registrarAuditoriaSiExiste(connection, {
        accion: 'CANCELAR_VENTA',
        recursoTipo: 'VENTA',
        recursoId: ventaId,
        solicitadoPor: autorizacion.solicitadoPor,
        autorizadoPor: autorizacion.autorizadoPor,
        motivo
      });
      await connection.commit();
      console.info('Cancelación de venta confirmada', { ventaId, usuarioId: req.usuario.id });

      return res.json({
        mensaje: 'Venta cancelada e inventario restaurado',
        auditoria_registrada: auditoriaRegistrada
      });

    } catch (error) {

      if (connection) {
        await connection.rollback();
      }

      console.error(
        'Error cancelando venta:',
        error
      );

      return res
        .status(error.status || 500)
        .json({

          error:
            error.status
              ? error.message
              : 'No fue posible cancelar la venta'

        });

    } finally {

      if (connection) {
        connection.release();
      }

    }

  }
);

/* =========================================================
   PREPARAR IMPRESIÓN
   Primera impresión: ORIGINAL
   Siguientes: COPIA
========================================================= */

router.post(
  '/:ventaId/imprimir',
  async (req, res) => {

    const ventaId =
      Number(req.params.ventaId);

    if (
      !Number.isInteger(ventaId) ||
      ventaId <= 0
    ) {

      return res.status(400).json({
        error: 'ID de venta inválido'
      });

    }

    let connection;

    try {

      connection =
        await db.promise.getConnection();

      await connection.beginTransaction();

      /*
       * FOR UPDATE evita que dos impresiones
       * simultáneas reciban ambas ORIGINAL.
       */

      const [ventas] =
        await connection.query(
          `
            SELECT
              id,
              impresiones,
              estado_venta

            FROM ventas

            WHERE id = ?

            FOR UPDATE
          `,
          [ventaId]
        );

      if (ventas.length === 0) {

        const error =
          new Error('Venta no encontrada');

        error.status = 404;

        throw error;

      }

      const venta =
        ventas[0];

      if (
        venta.estado_venta ===
        'CANCELADA'
      ) {

        const error =
          new Error(
            'No se puede imprimir una venta cancelada'
          );

        error.status = 409;

        throw error;

      }

      const numeroImpresion =
        Number(venta.impresiones) + 1;

      const leyenda =
        numeroImpresion === 1
          ? 'ORIGINAL'
          : 'COPIA';

      await connection.query(
        `
          UPDATE ventas

          SET
            impresiones = ?,
            ultima_impresion_at = NOW()

          WHERE id = ?
        `,
        [
          numeroImpresion,
          ventaId
        ]
      );

      await connection.commit();

      return res.json({

        venta_id: ventaId,

        leyenda,

        numero_impresion:
          numeroImpresion

      });

    } catch (error) {

      if (connection) {
        await connection.rollback();
      }

      console.error(
        'Error preparando ticket:',
        error
      );

      return res
        .status(error.status || 500)
        .json({

          error:
            error.status
              ? error.message
              : 'No fue posible preparar el ticket'

        });

    } finally {

      if (connection) {
        connection.release();
      }

    }

  }
);

module.exports = router;
