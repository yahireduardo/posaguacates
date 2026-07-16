const db = require('../db/conexion');

exports.crearVenta = (req, res) => {
  const { cliente_id, usuario_id, tipo_pago, productos } = req.body;

  // =========================
  // VALIDACIONES
  // =========================
  if (!usuario_id || !tipo_pago || !Array.isArray(productos) || productos.length === 0) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  // =========================
  // NORMALIZAR TIPO PAGO
  // =========================
  const esCredito = tipo_pago && tipo_pago.toLowerCase().includes('credito');

  console.log("TIPO PAGO RAW:", tipo_pago);
  console.log("ES CREDITO:", esCredito);

  if (esCredito && !cliente_id) {
    return res.status(400).json({
      error: 'Venta a crédito requiere cliente_id'
    });
  }

  // =========================
  // CALCULAR TOTAL
  // =========================
  let total = 0;
  productos.forEach(p => {
    total += Number(p.cantidad) * Number(p.precio);
  });

  // =========================
  // TRANSACCIÓN
  // =========================
  db.beginTransaction(err => {
    if (err) {
      console.error("Error al iniciar transacción:", err);
      return res.status(500).json(err);
    }

    // =========================
    // 1. INSERTAR VENTA
    // =========================
    const sqlVenta = `
      INSERT INTO ventas (cliente_id, usuario_id, total, tipo_pago)
      VALUES (?, ?, ?, ?)
    `;

    db.query(sqlVenta, [cliente_id || null, usuario_id, total, tipo_pago], (err, result) => {
      if (err) {
        return db.rollback(() => {
          console.error("Error al crear venta:", err);
          res.status(500).json(err);
        });
      }

      const ventaId = result.insertId;

      // =========================
      // 2. DETALLE + INVENTARIO
      // =========================
      let pendientes = productos.length;

      productos.forEach(p => {
        const subtotal = Number(p.cantidad) * Number(p.precio);

        // Detalle venta
        db.query(`
          INSERT INTO detalle_venta 
          (venta_id, producto_id, cantidad, precio_unitario, subtotal)
          VALUES (?, ?, ?, ?, ?)
        `, [ventaId, p.producto_id, p.cantidad, p.precio, subtotal], (err) => {
          if (err) {
            return db.rollback(() => {
              console.error("Error en detalle_venta:", err);
              res.status(500).json(err);
            });
          }
        });

        // Descontar inventario
        db.query(`
          UPDATE productos 
          SET stock = stock - ?
          WHERE id = ?
        `, [p.cantidad, p.producto_id], (err) => {
          if (err) {
            return db.rollback(() => {
              console.error("Error en inventario:", err);
              res.status(500).json(err);
            });
          }
        });

        // Movimiento inventario
        db.query(`
          INSERT INTO movimientos_inventario 
          (producto_id, tipo, cantidad, motivo, referencia_id)
          VALUES (?, 'SALIDA', ?, 'VENTA', ?)
        `, [p.producto_id, p.cantidad, ventaId], (err) => {
          if (err) {
            return db.rollback(() => {
              console.error("Error en movimientos:", err);
              res.status(500).json(err);
            });
          }
        });

        pendientes--;

        // Cuando termine el último producto
        if (pendientes === 0) {

          // =========================
          // 3. CUENTA POR COBRAR (SI ES CRÉDITO)
          // =========================
          if (esCredito) {
            db.query(`
              INSERT INTO cuentas_por_cobrar 
              (venta_id, cliente_id, total_deuda, saldo_pendiente)
              VALUES (?, ?, ?, ?)
            `, [ventaId, cliente_id, total, total], (err) => {

              if (err) {
                return db.rollback(() => {
                  console.error("Error al crear cuenta:", err);
                  res.status(500).json(err);
                });
              }

              console.log("✅ CUENTA CREADA CORRECTAMENTE");

              // =========================
              // COMMIT FINAL
              // =========================
              db.commit(err => {
                if (err) {
                  return db.rollback(() => {
                    console.error("Error en commit:", err);
                    res.status(500).json(err);
                  });
                }

                return res.json({
                  mensaje: 'Venta registrada correctamente (CRÉDITO)',
                  venta_id: ventaId,
                  total
                });
              });
            });

          } else {

            // =========================
            // COMMIT SIN CRÉDITO
            // =========================
            db.commit(err => {
              if (err) {
                return db.rollback(() => {
                  console.error("Error en commit:", err);
                  res.status(500).json(err);
                });
              }

              return res.json({
                mensaje: 'Venta registrada correctamente (CONTADO)',
                venta_id: ventaId,
                total
              });
            });
          }
        }
      });
    });
  });
};