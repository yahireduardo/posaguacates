const express = require('express');
const bcrypt = require('bcryptjs');

const db = require('../db/conexion');

const {
  permitirRoles
} = require('../middleware/auth');

const router = express.Router();

/* =========================================================
   VENTAS DE MOSTRADOR CON FILTROS
   Solo Administrador General
========================================================= */

router.get(
  '/',
  permitirRoles('ADMON_GRAL'),
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
  permitirRoles('ADMON_GRAL'),
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

  for (const item of productos) {

    const productoId =
      Number(item.producto_id);

    const cantidad =
      Number(item.cantidad);

    if (
      !Number.isInteger(productoId) ||
      productoId <= 0 ||
      !Number.isFinite(cantidad) ||
      cantidad <= 0
    ) {

      return res.status(400).json({
        error: 'Producto o cantidad inválida'
      });

    }

    cantidades.set(
      productoId,

      (
        cantidades.get(productoId) || 0
      ) + cantidad
    );

  }

  let connection;

  try {

    connection =
      await db.promise.getConnection();

    await connection.beginTransaction();

    /* =========================
       VALIDAR CLIENTE
    ========================= */

    const [clientes] =
      await connection.query(
        `
          SELECT id

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

      /*
       * El precio se toma de MySQL.
       * Nunca se acepta el precio enviado
       * desde el navegador.
       */

      const precio =
        Number(producto.precio_venta);

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

        subtotal

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
            'ACTIVA',
            0
          )
        `,
        [
          clienteId,
          req.usuario.id,
          total,
          tipoPago,
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
            motivo,
            referencia_id,
            usuario_id
          )

          VALUES
          (
            ?,
            'SALIDA',
            ?,
            'VENTA',
            ?,
            ?
          )
        `,
        [
          item.producto_id,
          item.cantidad,
          ventaId,
          req.usuario.id
        ]
      );

    }

    /* =========================
       CUENTA POR COBRAR
    ========================= */

    if (tipoPago === 'CREDITO') {

      await connection.query(
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
   Solicita nuevamente la contraseña
========================================================= */

router.post(
  '/:ventaId/cancelar',

  permitirRoles('ADMON_GRAL'),

  async (req, res) => {

    const ventaId =
      Number(req.params.ventaId);

    const motivo =
      String(
        req.body.motivo || ''
      ).trim();

    const password =
      String(
        req.body.password || ''
      );

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

    if (!password) {

      return res.status(400).json({
        error:
          'La contraseña del administrador es obligatoria'
      });

    }

    let connection;

    try {

      /* =========================
         VALIDAR CONTRASEÑA ADMIN
      ========================= */

      const [administradores] =
        await db.promise.query(
          `
            SELECT
              id,
              password_hash

            FROM usuarios

            WHERE id = ?
              AND rol = 'ADMON_GRAL'
              AND activo = 1

            LIMIT 1
          `,
          [req.usuario.id]
        );

      if (
        administradores.length === 0
      ) {

        return res.status(403).json({
          error:
            'Administrador no autorizado'
        });

      }

      const administrador =
        administradores[0];

      if (
        !administrador.password_hash
      ) {

        return res.status(500).json({
          error:
            'El administrador no tiene contraseña segura configurada'
        });

      }

      const passwordValido =
        await bcrypt.compare(
          password,
          administrador.password_hash
        );

      if (!passwordValido) {

        return res.status(401).json({
          error:
            'Contraseña de administrador incorrecta'
        });

      }

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
              SELECT
                COALESCE(
                  SUM(monto),
                  0
                ) AS total_abonado

              FROM pagos

              WHERE cuenta_id = ?
            `,
            [cuenta.id]
          );

        const totalAbonado =
          Number(
            pagos[0].total_abonado
          );

        if (totalAbonado > 0) {

          const error =
            new Error(
              'No se puede cancelar una venta a crédito que ya tiene abonos registrados'
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
            req.usuario.id
          ]
        );

      }

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
          req.usuario.id,
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

      await connection.commit();

      return res.json({
        mensaje:
          'Venta cancelada e inventario restaurado'
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
