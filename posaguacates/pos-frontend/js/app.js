const API=''; let usuario=null, token=localStorage.getItem('tokenPOS'), productos=[], clientes=[], carrito=[], ultimaVenta=null, detalleVentaActual=null, grafica=null, productoSeleccionado = null, indiceResultadoActivo = -1;
    const dinero=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2,maximumFractionDigits:2});
    const cantidad=n=>new Intl.NumberFormat('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0);
    const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

    async function api(path, options = {}) {

  const headers = {

    ...(options.body
      ? {
          'Content-Type':
            'application/json'
        }
      : {}),

    ...(token
      ? {
          Authorization:
            `Bearer ${token}`
        }
      : {})

  };

  let response;
  try {
    response = await fetch(API + path, {
      ...options,
      headers: { ...headers, ...options.headers }
    });
  } catch (error) {
    throw new Error('No fue posible conectar con el servidor');
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text();

  const esLogin =
    path === '/auth/login';

  if (
    response.status === 401 &&
    !esLogin &&
    token
  ) {

    cerrarSesion();

    throw new Error(
      'Tu sesión expiró'
    );

  }

  if (!response.ok) {

    throw new Error(
      (typeof data === 'object' ? data.error : data) ||
      'Error en la solicitud'
    );

  }

  return data;

}
    function mostrar(id){document.querySelectorAll('.seccion').forEach(x=>x.classList.toggle('activa',x.id===id));if(id==='cuentas')cargarCuentas();if(id==='inventario')cargarInventario();if(id==='ventas')cargarVentas();if(id==='dashboard')cargarDashboard()}
    document.querySelectorAll('[data-section]').forEach(b => b.addEventListener('click', () => mostrar(b.dataset.section)));

    document
  .getElementById('loginForm')
  .addEventListener('submit', async evento => {

    evento.preventDefault();

    const usernameInput =
      document.getElementById(
        'username'
      );

    const passwordInput =
      document.getElementById(
        'password'
      );

    const loginError =
      document.getElementById(
        'loginError'
      );

    loginError.textContent = '';

    try {

      const data =
        await api(
          '/auth/login',
          {
            method: 'POST',

            body: JSON.stringify({

              username:
                usernameInput
                  .value
                  .trim(),

              password:
                passwordInput.value

            })

          }
        );

      token = data.token;
      usuario = data.usuario;

      localStorage.setItem(
        'tokenPOS',
        token
      );

      localStorage.setItem(
        'usuarioPOS',
        JSON.stringify(usuario)
      );

      iniciarApp();

    } catch (error) {

      loginError.textContent =
        error.message;

    }

  });
   function iniciarApp() {

  document
    .getElementById('login')
    .classList.add('hidden');

  document
    .getElementById('sistema')
    .classList.remove('hidden');

  document
    .getElementById('sesion')
    .textContent =
      `${
        usuario.nombre ||
        usuario.username
      } · ${usuario.rol}`;

  document
    .querySelectorAll('.admin')
    .forEach(elemento => {

      elemento.classList.toggle(
        'hidden',
        usuario.rol !== 'ADMON_GRAL'
      );

    });

  cargarProductos();
  cargarClientes();

}
    function cerrarSesion(){localStorage.removeItem('tokenPOS');localStorage.removeItem('usuarioPOS');location.reload()}
    document.getElementById('logout')?.addEventListener('click', cerrarSesion);

        async function cargarProductos() {

      try {

        productos = await api('/productos');

        const productoMovimiento =
          document.getElementById('productoMovimiento');

        if (productoMovimiento) {

          productoMovimiento.innerHTML =
            productos.map(producto => `

              <option value="${producto.id}">

                ${esc(producto.codigo || producto.id)}
                -
                ${esc(producto.nombre)}
                (${cantidad(producto.stock)})

              </option>

            `).join('');

        }

      } catch (error) {

        console.error(
          'Error cargando productos:',
          error
        );

        alert(error.message);

      }

    }
    const buscarProducto =
  document.getElementById('buscarProducto');

    const resultadosProductos =
      document.getElementById('resultadosProductos');

    const cantidadCaptura =
      document.getElementById('cantidadCaptura');

    const unidadCaptura =
      document.getElementById('unidadCaptura');

    const agregarCaptura =
      document.getElementById('agregarCaptura');

      buscarProducto.addEventListener(
  'input',
  mostrarCoincidencias
);

buscarProducto.addEventListener(
  'keydown',
  manejarTecladoBuscador
);

document.addEventListener('click', evento => {

  if (
    !buscarProducto.contains(evento.target) &&
    !resultadosProductos.contains(evento.target)
  ) {

    cerrarResultados();

  }

});

function mostrarCoincidencias() {

  productoSeleccionado = null;
  indiceResultadoActivo = -1;

  const texto =
    buscarProducto.value
      .trim()
      .toLowerCase();

  if (!texto) {

    cerrarResultados();

    return;

  }

  const coincidencias =
    productos.filter(producto => {

      const codigo =
        String(
          producto.codigo || producto.id
        ).toLowerCase();

      const nombre =
        String(producto.nombre)
          .toLowerCase();

      return (
        codigo.includes(texto) ||
        nombre.includes(texto)
      );

    }).slice(0, 8);

  if (!coincidencias.length) {

    resultadosProductos.innerHTML = `

      <div class="resultado-producto">
        No se encontraron productos
      </div>

    `;

    resultadosProductos.classList.remove(
      'hidden'
    );

    return;

  }

  resultadosProductos.innerHTML =
    coincidencias.map((producto, indice) => `

      <div
        class="resultado-producto"
        data-id="${producto.id}"
        data-indice="${indice}"
      >

        <span class="resultado-codigo">
          ${esc(producto.codigo || producto.id)}
        </span>

        <span>
          ${esc(producto.nombre)}

          <small class="muted">
            Stock:
            ${cantidad(producto.stock)}
          </small>
        </span>

        <span class="resultado-precio">
          ${dinero.format(producto.precio_venta)}
        </span>

      </div>

    `).join('');

  resultadosProductos.classList.remove(
    'hidden'
  );

  resultadosProductos
    .querySelectorAll('.resultado-producto[data-id]')
    .forEach(elemento => {

      elemento.addEventListener(
        'click',
        () => {

          seleccionarProducto(
            Number(elemento.dataset.id)
          );

        }
      );

    });

}

function seleccionarProducto(id) {

  const producto =
    productos.find(
      item => item.id === id
    );

  if (!producto) {
    return;
  }

  productoSeleccionado = producto;

  buscarProducto.value =
    `${producto.codigo || producto.id} - ${producto.nombre}`;

  if (producto.unidad) {
    unidadCaptura.value = producto.unidad || 'kg';
  }

  cerrarResultados();

  cantidadCaptura.focus();
  cantidadCaptura.select();

}
function manejarTecladoBuscador(evento) {

  const resultados = [
    ...resultadosProductos.querySelectorAll(
      '.resultado-producto[data-id]'
    )
  ];

  if (
    evento.key === 'ArrowDown' &&
    resultados.length
  ) {

    evento.preventDefault();

    indiceResultadoActivo =
      Math.min(
        indiceResultadoActivo + 1,
        resultados.length - 1
      );

    marcarResultadoActivo(resultados);

    return;

  }

  if (
    evento.key === 'ArrowUp' &&
    resultados.length
  ) {

    evento.preventDefault();

    indiceResultadoActivo =
      Math.max(
        indiceResultadoActivo - 1,
        0
      );

    marcarResultadoActivo(resultados);

    return;

  }

  if (evento.key === 'Enter') {

    evento.preventDefault();

    if (
      resultados.length &&
      indiceResultadoActivo >= 0
    ) {

      seleccionarProducto(
        Number(
          resultados[
            indiceResultadoActivo
          ].dataset.id
        )
      );

      return;

    }

    const texto =
      buscarProducto.value
        .trim()
        .toLowerCase();

    const coincidenciaExacta =
      productos.find(producto => {

        return (
          String(
            producto.codigo || producto.id
          ).toLowerCase() === texto ||

          producto.nombre
            .toLowerCase() === texto
        );

      });

    if (coincidenciaExacta) {

      seleccionarProducto(
        coincidenciaExacta.id
      );

    }

  }

}

function marcarResultadoActivo(resultados) {

  resultados.forEach(
    (elemento, indice) => {

      elemento.classList.toggle(
        'activo',
        indice === indiceResultadoActivo
      );

    }
  );

  resultados[
    indiceResultadoActivo
  ]?.scrollIntoView({
    block: 'nearest'
  });

}

function cerrarResultados() {

  resultadosProductos.classList.add(
    'hidden'
  );

  resultadosProductos.innerHTML = '';

  indiceResultadoActivo = -1;

}

agregarCaptura.addEventListener(
  'click',
  agregarProductoCapturado
);

cantidadCaptura.addEventListener(
  'keydown',
  evento => {

    if (evento.key === 'Enter') {

      evento.preventDefault();

      agregarProductoCapturado();

    }

  }
);

function agregarProductoCapturado() {

  if (!productoSeleccionado) {

    alert(
      'Selecciona un producto de la lista'
    );

    buscarProducto.focus();

    return;

  }

  const cantidadNueva =
    Number(cantidadCaptura.value);

  if (
    !Number.isFinite(cantidadNueva) ||
    cantidadNueva <= 0
  ) {

    alert('Cantidad inválida');

    cantidadCaptura.focus();

    return;

  }

  const existente =
    carrito.find(
      item =>
        item.producto_id ===
        productoSeleccionado.id
    );

  const cantidadAcumulada =
    cantidadNueva +
    Number(existente?.cantidad || 0);

  if (
    cantidadAcumulada >
    Number(productoSeleccionado.stock)
  ) {

    alert(
      `Stock insuficiente. Disponible: ${
        cantidad(productoSeleccionado.stock)
      }`
    );

    return;

  }

  if (existente) {

    existente.cantidad =
      cantidadAcumulada;

    existente.unidad =
      unidadCaptura.value;

  } else {

    carrito.push({

      producto_id:
        productoSeleccionado.id,

      codigo:
        productoSeleccionado.codigo ||
        productoSeleccionado.id,

      nombre:
        productoSeleccionado.nombre,

      cantidad:
        cantidadNueva,

      unidad:
        unidadCaptura.value,

      precio:
        Number(
          productoSeleccionado.precio_venta
        )

    });

  }

  limpiarCaptura();
  dibujarCarrito();

}

function limpiarCaptura() {

  productoSeleccionado = null;

  buscarProducto.value = '';

  cantidadCaptura.value = '1';

  cerrarResultados();

  buscarProducto.focus();

}
   
    function dibujarCarrito() {

  const detalleVenta =
    document.getElementById('detalleVenta');

  const totalElemento =
    document.getElementById('total');

  const cantidadArticulos =
    document.getElementById(
      'cantidadArticulos'
    );

  const resumenProductos =
    document.getElementById(
      'resumenProductos'
    );

  const resumenCantidad =
    document.getElementById(
      'resumenCantidad'
    );

  if (!carrito.length) {

    detalleVenta.innerHTML = `

      <tr>

        <td
          colspan="7"
          class="tabla-vacia"
        >
          Todavía no hay productos en la nota
        </td>

      </tr>

    `;

    totalElemento.textContent =
      dinero.format(0);

    cantidadArticulos.textContent =
      cantidad(0);

    resumenProductos.textContent = '0';

    resumenCantidad.textContent =
      cantidad(0);

    return;

  }

  detalleVenta.innerHTML =
    carrito.map((producto, indice) => {

      const importe =
        Number(producto.cantidad) *
        Number(producto.precio);

      return `

        <tr>

          <td>
            ${esc(producto.codigo)}
          </td>

          <td>
            ${esc(producto.nombre)}
          </td>

          <td>

            <input
              class="cantidad-carrito"
              data-indice="${indice}"
              type="number"
              min="0.01"
              step="0.01"
              value="${producto.cantidad}"
            >

          </td>

          <td>

            <span>${esc(producto.unidad || '')}</span>

          </td>

          <td>
            ${dinero.format(producto.precio)}
          </td>

          <td class="money">
            ${dinero.format(importe)}
          </td>

          <td>

            <button
              type="button"
              class="boton-eliminar-producto"
              data-indice="${indice}"
            >
              ×
            </button>

          </td>

        </tr>

      `;

    }).join('');

  const totalVenta =
    carrito.reduce(
      (suma, producto) => {

        return suma +
          Number(producto.cantidad) *
          Number(producto.precio);

      },
      0
    );

  const totalCantidad =
    carrito.reduce(
      (suma, producto) =>
        suma + Number(producto.cantidad),
      0
    );

  totalElemento.textContent =
    dinero.format(totalVenta);

  cantidadArticulos.textContent =
    cantidad(totalCantidad);

  resumenProductos.textContent =
    String(carrito.length);

  resumenCantidad.textContent =
    cantidad(totalCantidad);

}

function cambiarCantidad(
  indice,
  nuevoValor
) {

  const nuevaCantidad =
    Number(nuevoValor);

  const productoCarrito =
    carrito[indice];

  const productoOriginal =
    productos.find(
      producto =>
        producto.id ===
        productoCarrito.producto_id
    );

  if (
    !Number.isFinite(nuevaCantidad) ||
    nuevaCantidad <= 0
  ) {

    alert('Cantidad inválida');

    dibujarCarrito();

    return;

  }

  if (
    nuevaCantidad >
    Number(productoOriginal.stock)
  ) {

    alert(
      `Stock insuficiente. Disponible: ${
        cantidad(productoOriginal.stock)
      }`
    );

    dibujarCarrito();

    return;

  }

  productoCarrito.cantidad =
    nuevaCantidad;

  dibujarCarrito();

}

function quitar(indice) {

  carrito.splice(indice, 1);

  dibujarCarrito();

}

document.getElementById('detalleVenta')?.addEventListener('change', evento => {
  const input = evento.target.closest('.cantidad-carrito');
  if (input) cambiarCantidad(Number(input.dataset.indice), input.value);
});
document.getElementById('detalleVenta')?.addEventListener('click', evento => {
  const boton = evento.target.closest('.boton-eliminar-producto');
  if (boton) quitar(Number(boton.dataset.indice));
});
    const venderBtn = document.getElementById('vender');
    const imprimirBtn = document.getElementById('imprimir');
    const clienteVentaSelect = document.getElementById('clienteVenta');
    const tipoPagoSelect = document.getElementById('tipoPago');
    venderBtn?.addEventListener('click', async () => {
      if (!carrito.length) return alert('Agrega productos');
      try {
        const data = await api('/ventas/crear', { method: 'POST', body: JSON.stringify({
          cliente_id: Number(clienteVentaSelect.value), tipo_pago: tipoPagoSelect.value,
          productos: carrito.map(({ producto_id, cantidad }) => ({ producto_id, cantidad }))
        }) });
        ultimaVenta = {
          ...data,
          cliente: clienteVentaSelect.options[clienteVentaSelect.selectedIndex]?.text || '',
          tipo_pago: tipoPagoSelect.value,
          fecha: new Date().toISOString()
        };
        carrito = [];
        dibujarCarrito();
        imprimirBtn.disabled = false;
        await cargarProductos();
        alert(`Venta #${data.venta_id} registrada por ${dinero.format(data.total)}`);
      } catch (error) { alert(error.message); }
    });

    async function imprimirVenta(ventaId, ventaCreada = null) {
      const impresion = await api(`/ventas/${ventaId}/imprimir`, { method: 'POST' });
      const detalle = ventaCreada
        ? { venta: { ...ventaCreada, id: ventaId }, productos: ventaCreada.productos }
        : await api(`/ventas/${ventaId}/detalle`);
      const v = detalle.venta;
      const ventana = window.open('', 'ticket', 'width=420,height=650');
      if (!ventana) throw new Error('El navegador bloqueó la ventana de impresión');
      ventana.document.write(`<meta charset="utf-8"><style>body{font-family:monospace;padding:18px}h2{text-align:center}table{width:100%}td:last-child{text-align:right}</style><h2>AGUACATES DE PERIBÁN</h2><h2>${impresion.leyenda}</h2><p>Folio: ${v.id}<br>Cliente: ${esc(v.cliente || 'Público general')}<br>Pago: ${esc(v.tipo_pago)}<br>Fecha: ${new Date(v.fecha).toLocaleString('es-MX')}</p><hr><table>${detalle.productos.map(p => `<tr><td>${cantidad(p.cantidad)} ${esc(p.unidad)} ${esc(p.nombre)}</td><td>${dinero.format(p.subtotal)}</td></tr>`).join('')}</table><hr><h2>Total ${dinero.format(v.total)}</h2>`);
      ventana.document.close();
      ventana.print();
    }
    imprimirBtn?.addEventListener('click', async () => {
      if (!ultimaVenta) return;
      try { await imprimirVenta(ultimaVenta.venta_id, ultimaVenta); } catch (error) { alert(error.message); }
    });

    async function cargarClientes(){const selector=document.getElementById('clienteVenta'),lista=document.getElementById('listaClientes');clientes=await api('/clientes');selector.innerHTML=clientes.map(c=>`<option value="${c.id}">${esc(c.nombre_razon_social)}</option>`).join('');lista.innerHTML=clientes.map(c=>`<article class="card"><h3>${esc(c.nombre_razon_social)}</h3><p>${esc(c.rfc||'Sin RFC')} · ${esc(c.telefono||'Sin teléfono')}<br>${esc(c.correo_electronico||'Sin correo')}</p>${usuario.rol==='ADMON_GRAL'?`<button class="editar-cliente" data-id="${c.id}">Editar</button>`:''}</article>`).join('')}
    function seleccionarCliente(id){const c=clientes.find(x=>x.id===id);if(!c)return;document.getElementById('clienteId').value=c.id;document.getElementById('nombreRazon').value=c.nombre_razon_social;document.getElementById('rfc').value=c.rfc||'';document.getElementById('telefono').value=c.telefono||'';document.getElementById('correo').value=c.correo_electronico||'';cancelarEdicion.classList.remove('hidden')}
    const clienteForm=document.getElementById('clienteForm'),cancelarEdicion=document.getElementById('cancelarEdicion');
    cancelarEdicion?.addEventListener('click',()=>{clienteForm.reset();document.getElementById('clienteId').value='';cancelarEdicion.classList.add('hidden')});
    clienteForm?.addEventListener('submit',async e=>{e.preventDefault();const id=document.getElementById('clienteId').value;const body=JSON.stringify({nombre_razon_social:document.getElementById('nombreRazon').value,rfc:document.getElementById('rfc').value,telefono:document.getElementById('telefono').value,correo_electronico:document.getElementById('correo').value});try{await api(id?`/clientes/${id}`:'/clientes',{method:id?'PUT':'POST',body});cancelarEdicion.click();await cargarClientes()}catch(error){alert(error.message)}});
    document.getElementById('listaClientes')?.addEventListener('click',evento=>{const boton=evento.target.closest('.editar-cliente');if(boton)seleccionarCliente(Number(boton.dataset.id))});

    async function cargarCuentas(){try{const data=await api('/cuentas'),lista=document.getElementById('listaCuentas');lista.innerHTML=data.length?data.map(c=>`<article class="card"><h3>${esc(c.nombre_razon_social)}</h3><div class="money">${dinero.format(c.saldo_total)}</div><button class="ver-cuenta" data-id="${c.cliente_id}">Detalle e historial</button></article>`).join(''):'<p>Sin saldos pendientes.</p>'}catch(e){alert(e.message)}}
    async function verCuenta(id){try{const d=await api(`/cuentas/cliente/${id}`),detalle=document.getElementById('detalleCuenta');detalle.classList.remove('hidden');detalle.innerHTML=`<h3>Cuentas</h3>${d.cuentas.map(c=>`<div class="row"><span>Venta #${c.venta_id} · ${esc(c.estado)}<br>${new Date(c.fecha).toLocaleString('es-MX')}</span><span>${dinero.format(c.saldo_pendiente)} ${c.estado==='PENDIENTE'?`<button class="primary abonar-cuenta" data-id="${c.id}" data-saldo="${c.saldo_pendiente}">Abonar</button>`:''}</span></div>`).join('')}<h3>Historial de abonos</h3>${d.pagos.length?d.pagos.map(p=>`<div class="row"><span>${new Date(p.fecha).toLocaleString('es-MX')} · ${esc(p.metodo_pago)}</span><strong>${dinero.format(p.monto)}</strong></div>`).join(''):'<p>Sin abonos.</p>'}`}catch(e){alert(e.message)}}
    document.getElementById('listaCuentas')?.addEventListener('click',e=>{const b=e.target.closest('.ver-cuenta');if(b)verCuenta(Number(b.dataset.id))});
    document.getElementById('detalleCuenta')?.addEventListener('click',e=>{const b=e.target.closest('.abonar-cuenta');if(b)abonar(Number(b.dataset.id),Number(b.dataset.saldo))});
    async function abonar(id,saldo){const monto=prompt(`Monto a abonar (saldo ${dinero.format(saldo)})`);if(monto===null)return;const metodo=prompt('Método de pago','EFECTIVO');if(metodo===null)return;try{await api('/cuentas/abonar',{method:'POST',body:JSON.stringify({cuenta_id:id,monto:Number(monto),metodo_pago:metodo})});await cargarCuentas();detalleCuenta.classList.add('hidden')}catch(e){alert(e.message)}}

    async function cargarInventario(){await cargarProductos();const data=await api('/inventario');movimientos.innerHTML=data.map(m=>`<div class="panel row"><span>${esc(m.producto)} · ${esc(m.motivo)}<br><small>${new Date(m.fecha).toLocaleString('es-MX')}</small></span><strong>${m.tipo==='ENTRADA'?'+':'−'}${cantidad(m.cantidad)}</strong></div>`).join('')}
    document.getElementById('movimientoForm')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget;try{await api('/inventario/movimiento',{method:'POST',body:JSON.stringify({producto_id:Number(document.getElementById('productoMovimiento').value),tipo:document.getElementById('tipoMovimiento').value,cantidad:Number(document.getElementById('cantidadMovimiento').value),motivo:document.getElementById('motivoMovimiento').value})});form.reset();await cargarInventario()}catch(error){alert(error.message)}});

    async function cargarVentas() {

  const lista =
    document.getElementById(
      'listaVentas'
    );

  lista.innerHTML = `

    <tr>

      <td
        colspan="9"
        class="tabla-vacia"
      >
        Cargando ventas...
      </td>

    </tr>

  `;

  try {

    const parametros =
      new URLSearchParams();

    const folio =
      document.getElementById(
        'filtroFolio'
      ).value.trim();

    const cliente =
      document.getElementById(
        'filtroCliente'
      ).value.trim();

    const fechaInicio =
      document.getElementById(
        'filtroFechaInicio'
      ).value;

    const fechaFin =
      document.getElementById(
        'filtroFechaFin'
      ).value;

    const tipoPago =
      document.getElementById(
        'filtroTipoPago'
      ).value;

    const estadoVenta =
      document.getElementById(
        'filtroEstadoVenta'
      ).value;

    if (folio) {
      parametros.set('folio', folio);
    }

    if (cliente) {
      parametros.set('cliente', cliente);
    }

    if (fechaInicio) {
      parametros.set(
        'fecha_inicio',
        fechaInicio
      );
    }

    if (fechaFin) {
      parametros.set(
        'fecha_fin',
        fechaFin
      );
    }

    if (tipoPago) {
      parametros.set(
        'tipo_pago',
        tipoPago
      );
    }

    if (estadoVenta) {
      parametros.set(
        'estado_venta',
        estadoVenta
      );
    }

    parametros.set('limite', '500');

    const ventas =
      await api(
        `/ventas?${parametros.toString()}`
      );

    document.getElementById(
      'ventasEncontradas'
    ).textContent =
      ventas.length;

    const importeTotal =
      ventas
        .filter(
          venta =>
            venta.estado_venta !==
            'CANCELADA'
        )
        .reduce(
          (suma, venta) =>
            suma + Number(venta.total),
          0
        );

    document.getElementById(
      'importeVentas'
    ).textContent =
      dinero.format(importeTotal);

    if (!ventas.length) {

      lista.innerHTML = `

        <tr>

          <td
            colspan="9"
            class="tabla-vacia"
          >
            No se encontraron ventas
          </td>

        </tr>

      `;

      return;

    }

    lista.innerHTML =
      ventas.map(venta => {

        const fecha =
          new Date(venta.fecha);

        const claseEstado =
          venta.estado_venta ===
          'CANCELADA'
            ? 'estado-cancelada'
            : 'estado-activa';

        return `

          <tr data-venta-id="${venta.id}">

            <td>
              ${fecha.toLocaleDateString(
                'es-MX'
              )}
            </td>

            <td>
              <strong>
                ${venta.id}
              </strong>
            </td>

            <td>
              ${esc(
                venta.cliente ||
                'Sin cliente'
              )}
            </td>

            <td class="money">
              ${dinero.format(
                Number(venta.total)
              )}
            </td>

            <td>
              ${esc(venta.tipo_pago)}
            </td>

            <td>

              <span class="${claseEstado}">
                ${esc(
                  venta.estado_venta
                )}
              </span>

            </td>

            <td>
              ${esc(
                venta.usuario ||
                'Sin usuario'
              )}
            </td>

            <td>
              ${fecha.toLocaleTimeString(
                'es-MX',
                {
                  hour: '2-digit',
                  minute: '2-digit'
                }
              )}
            </td>

            <td>

  <div class="actions">

    <button
      type="button"
      class="ver-venta"
      data-id="${venta.id}"
    >
      Ver
    </button>

    ${
      venta.estado_venta === 'ACTIVA'
        ? `
          <button
            type="button"
            class="danger cancelar-venta"
            data-id="${venta.id}"
          >
            Cancelar
          </button>
        `
        : ''
    }

  </div>

</td>

          </tr>

        `;

      }).join('');

  } catch (error) {

    console.error(error);

    lista.innerHTML = `

      <tr>

        <td
          colspan="9"
          class="tabla-vacia"
        >
          ${esc(error.message)}
        </td>

      </tr>

    `;

  }

}
document
  .getElementById('filtrosVentas')
  .addEventListener(
    'submit',
    evento => {

      evento.preventDefault();

      cargarVentas();

    }
  );

document.getElementById('listaVentas')?.addEventListener('click', evento => {
  const ver = evento.target.closest('.ver-venta');
  const cancelar = evento.target.closest('.cancelar-venta');
  if (ver) verDetalleVenta(Number(ver.dataset.id));
  if (cancelar) cancelarVenta(Number(cancelar.dataset.id));
});
document.getElementById('listaVentas')?.addEventListener('dblclick', evento => {
  if (evento.target.closest('button')) return;
  const fila = evento.target.closest('tr[data-venta-id]');
  if (fila) verDetalleVenta(Number(fila.dataset.ventaId));
});

document
  .getElementById('actualizarVentas')
  .addEventListener(
    'click',
    cargarVentas
  );

document
  .getElementById(
    'limpiarFiltrosVentas'
  )
  .addEventListener(
    'click',
    () => {

      document
        .getElementById(
          'filtrosVentas'
        )
        .reset();

      cargarVentas();

    }
  );

  async function verDetalleVenta(
  ventaId
) {

  try {

    const data =
      await api(
        `/ventas/${ventaId}/detalle`
      );

    detalleVentaActual = ventaId;

    const venta =
      data.venta;

    const fecha =
      new Date(venta.fecha);

    document.getElementById(
      'tituloDetalleVenta'
    ).textContent =
      `Venta #${venta.id}`;

    document.getElementById(
      'contenidoDetalleVenta'
    ).innerHTML = `

      <div class="detalle-resumen">

        <div>
          <span>Cliente</span>
          <strong>
            ${esc(
              venta.cliente ||
              'Sin cliente'
            )}
          </strong>
        </div>

        <div>
          <span>Fecha</span>
          <strong>
            ${fecha.toLocaleString(
              'es-MX'
            )}
          </strong>
        </div>

        <div>
          <span>Tipo de pago</span>
          <strong>
            ${esc(venta.tipo_pago)}
          </strong>
        </div>

        <div>
          <span>Estado</span>
          <strong>
            ${esc(venta.estado_venta)}
          </strong>
        </div>

        <div>
          <span>Cajero</span>
          <strong>
            ${esc(
              venta.usuario ||
              'Sin usuario'
            )}
          </strong>
        </div>

        <div>
          <span>Total</span>
          <strong class="money">
            ${dinero.format(
              Number(venta.total)
            )}
          </strong>
        </div>

      </div>

      <table class="tabla-ventas">

        <thead>

          <tr>
            <th>Código</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Unidad</th>
            <th>Precio</th>
            <th>Subtotal</th>
          </tr>

        </thead>

        <tbody>

          ${data.productos.map(
            producto => `

              <tr>

                <td>
                  ${esc(
                    producto.codigo ||
                    producto.producto_id
                  )}
                </td>

                <td>
                  ${esc(
                    producto.nombre
                  )}
                </td>

                <td>
                  ${cantidad(
                    producto.cantidad
                  )}
                </td>

                <td>
                  ${esc(
                    producto.unidad ||
                    ''
                  )}
                </td>

                <td>
                  ${dinero.format(
                    Number(
                      producto.precio_unitario
                    )
                  )}
                </td>

                <td class="money">
                  ${dinero.format(
                    Number(
                      producto.subtotal
                    )
                  )}
                </td>

              </tr>

            `
          ).join('')}

        </tbody>

      </table>

    `;

    document
      .getElementById(
        'modalDetalleVenta'
      )
      .classList.remove('hidden');

  } catch (error) {

    alert(error.message);

  }

}

document
  .getElementById(
    'cerrarDetalleVenta'
  )
  .addEventListener(
    'click',
    () => {

      document
        .getElementById(
          'modalDetalleVenta'
        )
        .classList.add('hidden');

    }
  );

const modalDetalleVenta = document.getElementById('modalDetalleVenta');
modalDetalleVenta?.addEventListener('click', evento => {
  if (evento.target === modalDetalleVenta) modalDetalleVenta.classList.add('hidden');
});
document.addEventListener('keydown', evento => {
  if (evento.key === 'Escape') modalDetalleVenta?.classList.add('hidden');
});
document.getElementById('reimprimirDetalle')?.addEventListener('click', async () => {
  if (!detalleVentaActual) return;
  try { await imprimirVenta(detalleVentaActual); } catch (error) { alert(error.message); }
});

    async function cancelarVenta(id) {

  const motivo =
    prompt('Motivo de cancelación');

  if (!motivo || !motivo.trim()) {
    return;
  }

  const password =
    prompt(
      'Escribe la contraseña del Administrador General'
    );

  if (!password) {
    return;
  }

  try {

    await api(
      `/ventas/${id}/cancelar`,
      {
        method: 'POST',

        body: JSON.stringify({
          motivo: motivo.trim(),
          password
        })
      }
    );

    alert(
      'Venta cancelada e inventario restaurado'
    );

    await cargarVentas();
    await cargarProductos();

  } catch (error) {

    alert(error.message);

  }

}
    async function cargarDashboard(){try{const d=await api('/stats'),metricas=document.getElementById('metricas'),canvas=document.getElementById('graficaSemanal');metricas.innerHTML=[['Ventas hoy',d.ventas_hoy],['Ingresos hoy',dinero.format(d.ingresos_hoy)],['Clientes',d.clientes],['Deuda',dinero.format(d.deuda_total)]].map(x=>`<div class="card"><h3>${x[0]}</h3><h2>${x[1]}</h2></div>`).join('');const mapa=new Map(d.semanal.map(x=>[String(x.dia).slice(0,10),Number(x.total)])),labels=[],values=[];for(let i=6;i>=0;i--){const f=new Date();f.setHours(0,0,0,0);f.setDate(f.getDate()-i);const k=`${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,'0')}-${String(f.getDate()).padStart(2,'0')}`;labels.push(f.toLocaleDateString('es-MX',{weekday:'short',day:'2-digit'}));values.push(mapa.get(k)||0)}if(grafica)grafica.destroy();grafica=new Chart(canvas,{type:'bar',data:{labels,datasets:[{label:'Ventas',data:values,backgroundColor:'#168b52'}]},options:{scales:{y:{beginAtZero:true,ticks:{callback:v=>dinero.format(v)}}}}})}catch(e){alert(e.message)}}
    document.getElementById('reporte')?.addEventListener('click',async()=>{try{const r=await fetch('/reportes/ventas-pdf',{headers:{Authorization:`Bearer ${token}`}});const data=r.ok?await r.blob():await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'No fue posible generar el reporte');const url=URL.createObjectURL(data);window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(e){alert(e.message)}});

    try{usuario=JSON.parse(localStorage.getItem('usuarioPOS'))}catch{} if(token&&usuario)iniciarApp();
