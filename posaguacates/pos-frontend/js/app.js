const API=''; let usuario=null, token=localStorage.getItem('tokenPOS'), productos=[], clientes=[], carrito=[], ultimaVenta=null, detalleVentaActual=null, grafica=null, graficaProductos=null, productoSeleccionado = null, indiceResultadoActivo = -1, ordenCargada=null, reporteProductosActual=[];
    const dinero=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2,maximumFractionDigits:2});
    const cantidad=n=>new Intl.NumberFormat('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0);
    const esCaja=unidad=>['CAJA','CAJAS'].includes(String(unidad||'').trim().toUpperCase());
    const esCantidadValida=(valor,unidad)=>{const n=Number(valor);return Number.isFinite(n)&&n>0&&(!esCaja(unidad)||Number.isInteger(n*2))};
    const mensajeCantidad=unidad=>esCaja(unidad)?'En cajas solo se permiten cantidades enteras o medias cajas, por ejemplo 1, 1.5, 2 o 2.5.':'Ingresa una cantidad válida en kilos.';
    const formatearCantidad=(valor,unidad)=>{const n=Number(valor);if(!Number.isFinite(n))return '0';return new Intl.NumberFormat('es-MX',{minimumFractionDigits:0,maximumFractionDigits:esCaja(unidad)?1:2}).format(n)};
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
    function mostrar(id){document.querySelectorAll('.seccion').forEach(x=>x.classList.toggle('activa',x.id===id));if(id==='cuentas')cargarCuentas();if(id==='ordenes')cargarOrdenes();if(id==='clientes')cargarClientes();if(id==='inventario')cargarInventario();if(id==='ventas')cargarVentas();if(id==='dashboard'){cargarDashboard();cargarReporteProductos()}}
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
                — ${formatearCantidad(producto.stock,producto.unidad)} ${esc(producto.unidad||'')}

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
  cantidadCaptura.step=esCaja(producto.unidad)?'0.5':'0.01';

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
    !esCantidadValida(cantidadNueva, productoSeleccionado.unidad)
  ) {

    alert(mensajeCantidad(productoSeleccionado.unidad));

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
    !esCantidadValida(nuevaCantidad, productoCarrito.unidad)
  ) {

    alert(mensajeCantidad(productoCarrito.unidad));

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
        const endpoint=ordenCargada?`/ordenes/${ordenCargada.id}/convertir`:'/ventas/crear';
        const data = await api(endpoint, { method: 'POST', body: JSON.stringify({
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
        ordenCargada=null;
        document.getElementById('ordenPosAviso').textContent='';
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

    async function cargarClientes(buscar=''){const selector=document.getElementById('clienteVenta'),lista=document.getElementById('listaClientes'),indice=document.getElementById('indiceClientes');const respuesta=await api(`/clientes?buscar=${encodeURIComponent(buscar)}&limite=500`);clientes=respuesta.datos||respuesta;if(selector){selector.innerHTML=clientes.map(c=>`<option value="${c.id}">${esc(c.nombre_razon_social)}</option>`).join('');const rpc=document.getElementById('rpcCliente');if(rpc)rpc.innerHTML='<option value="">Todos los clientes</option>'+selector.innerHTML}const grupos=new Map();clientes.forEach(c=>{const inicial=(c.nombre_razon_social.normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/^[A-Za-z]/)?.[0]||'#').toUpperCase();if(!grupos.has(inicial))grupos.set(inicial,[]);grupos.get(inicial).push(c)});if(indice)indice.innerHTML='ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('').map(l=>`<button type="button" data-letra="${l}" aria-label="Ir a ${l}">${l}</button>`).join('');if(lista)lista.innerHTML=[...grupos.entries()].map(([letra,items])=>`<section id="clientes-${letra}" class="grupo-clientes" tabindex="-1"><h3>${letra}</h3><div class="grid">${items.map(c=>`<article class="card"><h3>${esc(c.nombre_razon_social)}</h3><p>${esc(c.rfc||'Sin RFC')} · ${esc(c.telefono||'Sin teléfono')}</p><button class="ver-cliente" data-id="${c.id}">Estado de cuenta</button>${usuario.rol==='ADMON_GRAL'?`<button class="editar-cliente" data-id="${c.id}">Editar</button>`:''}</article>`).join('')}</div></section>`).join('')}
    function seleccionarCliente(id){const c=clientes.find(x=>x.id===id);if(!c)return;document.getElementById('clienteId').value=c.id;document.getElementById('nombreRazon').value=c.nombre_razon_social;document.getElementById('rfc').value=c.rfc||'';document.getElementById('telefono').value=c.telefono||'';document.getElementById('correo').value=c.correo_electronico||'';cancelarEdicion.classList.remove('hidden')}
    const clienteForm=document.getElementById('clienteForm'),cancelarEdicion=document.getElementById('cancelarEdicion');
    cancelarEdicion?.addEventListener('click',()=>{clienteForm.reset();document.getElementById('clienteId').value='';cancelarEdicion.classList.add('hidden')});
    clienteForm?.addEventListener('submit',async e=>{e.preventDefault();const id=document.getElementById('clienteId').value;const body=JSON.stringify({nombre_razon_social:document.getElementById('nombreRazon').value,rfc:document.getElementById('rfc').value,telefono:document.getElementById('telefono').value,correo_electronico:document.getElementById('correo').value});try{await api(id?`/clientes/${id}`:'/clientes',{method:id?'PUT':'POST',body});cancelarEdicion.click();await cargarClientes()}catch(error){alert(error.message)}});
    document.getElementById('listaClientes')?.addEventListener('click',evento=>{const editar=evento.target.closest('.editar-cliente'),ver=evento.target.closest('.ver-cliente');if(editar)seleccionarCliente(Number(editar.dataset.id));if(ver)verResumenCliente(Number(ver.dataset.id))});

    async function cargarCuentas(){try{const data=await api('/cuentas'),lista=document.getElementById('listaCuentas');lista.innerHTML=data.length?data.map(c=>`<article class="card"><h3>${esc(c.nombre_razon_social)}</h3><div class="money">${dinero.format(c.saldo_total)}</div><button class="ver-cuenta" data-id="${c.cliente_id}">Detalle e historial</button></article>`).join(''):'<p>Sin saldos pendientes.</p>'}catch(e){alert(e.message)}}
    async function verCuenta(id){try{const d=await api(`/cuentas/cliente/${id}`),detalle=document.getElementById('detalleCuenta');detalle.classList.remove('hidden');detalle.innerHTML=`<h3>Cuentas</h3>${d.cuentas.map(c=>`<div class="row"><span>Venta #${c.venta_id} · ${esc(c.estado)}<br>${new Date(c.fecha).toLocaleString('es-MX')}</span><span>${dinero.format(c.saldo_pendiente)}</span></div>`).join('')}<h3>Historial de abonos</h3>${d.pagos.length?d.pagos.map(p=>`<div class="row"><span>${new Date(p.fecha).toLocaleString('es-MX')} · ${esc(p.metodo_pago)}</span><strong>${dinero.format(p.monto)}</strong></div>`).join(''):'<p>Sin abonos.</p>'}${usuario.rol==='ADMON_GRAL'?`<button class="primary aplicar-pago-cliente" data-id="${id}">Aplicar pago a este cliente</button>`:''}`}catch(e){alert(e.message)}}
    document.getElementById('listaCuentas')?.addEventListener('click',e=>{const b=e.target.closest('.ver-cuenta');if(b)verCuenta(Number(b.dataset.id))});
    document.getElementById('detalleCuenta')?.addEventListener('click',e=>{const b=e.target.closest('.aplicar-pago-cliente');if(b)abrirPagoParaCliente(Number(b.dataset.id))});

    async function cargarInventario(){await cargarProductos();const data=await api('/inventario');movimientos.innerHTML=data.map(m=>`<div class="panel row"><span>${esc(m.producto)} · ${esc(m.motivo)}<br><small>${new Date(m.fecha).toLocaleString('es-MX')}</small></span><strong>${m.tipo==='ENTRADA'?'+':'−'}${formatearCantidad(m.cantidad,m.unidad)} ${esc(m.unidad||'')}</strong></div>`).join('')}
    document.getElementById('productoMovimiento')?.addEventListener('change',e=>{const p=productos.find(x=>x.id===Number(e.target.value));document.getElementById('cantidadMovimiento').step=esCaja(p?.unidad)?'0.5':'0.01'});
    document.getElementById('movimientoForm')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,productoId=Number(document.getElementById('productoMovimiento').value),valor=Number(document.getElementById('cantidadMovimiento').value),producto=productos.find(p=>p.id===productoId);if(!producto||!esCantidadValida(valor,producto.unidad))return alert(mensajeCantidad(producto?.unidad));try{await api('/inventario/movimiento',{method:'POST',body:JSON.stringify({producto_id:productoId,tipo:document.getElementById('tipoMovimiento').value,cantidad:valor,motivo:document.getElementById('motivoMovimiento').value})});form.reset();await cargarInventario()}catch(error){alert(error.message)}});

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

  const password=prompt('Escribe la contraseña del Administrador General');
  if(!password)return;

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
    await cargarInventario();
    await cargarDashboard();

  } catch (error) {

    alert(error.message);

  }

}
    async function cargarDashboard(){try{const d=await api('/stats'),metricas=document.getElementById('metricas'),canvas=document.getElementById('graficaSemanal');metricas.innerHTML=[['Ventas hoy',d.ventas_hoy],['Ingresos hoy',dinero.format(d.ingresos_hoy)],['Clientes',d.clientes],['Deuda',dinero.format(d.deuda_total)]].map(x=>`<div class="card"><h3>${x[0]}</h3><h2>${x[1]}</h2></div>`).join('');const mapa=new Map(d.semanal.map(x=>[String(x.dia).slice(0,10),Number(x.total)])),labels=[],values=[];for(let i=6;i>=0;i--){const f=new Date();f.setHours(0,0,0,0);f.setDate(f.getDate()-i);const k=`${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,'0')}-${String(f.getDate()).padStart(2,'0')}`;labels.push(f.toLocaleDateString('es-MX',{weekday:'short',day:'2-digit'}));values.push(mapa.get(k)||0)}if(grafica)grafica.destroy();grafica=new Chart(canvas,{type:'bar',data:{labels,datasets:[{label:'Ventas',data:values,backgroundColor:'#168b52'}]},options:{scales:{y:{beginAtZero:true,ticks:{callback:v=>dinero.format(v)}}}}})}catch(e){alert(e.message)}}
    document.getElementById('reporte')?.addEventListener('click',async()=>{try{const r=await fetch('/reportes/ventas-pdf',{headers:{Authorization:`Bearer ${token}`}});const data=r.ok?await r.blob():await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'No fue posible generar el reporte');const url=URL.createObjectURL(data);window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(e){alert(e.message)}});

// Referencias explícitas de los módulos nuevos. No depender de variables globales
// creadas implícitamente a partir de atributos id del HTML.
const ordenFolio=document.getElementById('ordenFolio'),ordenCliente=document.getElementById('ordenCliente'),
  ordenFecha=document.getElementById('ordenFecha'),ordenEstado=document.getElementById('ordenEstado'),
  listaOrdenes=document.getElementById('listaOrdenes'),clienteVenta=document.getElementById('clienteVenta'),
  pagoFecha=document.getElementById('pagoFecha'),
  buscarClientePago=document.getElementById('buscarClientePago'),pagoClienteId=document.getElementById('pagoClienteId'),
  pagoClienteNombre=document.getElementById('pagoClienteNombre'),notasPago=document.getElementById('notasPago'),
  formPago=document.getElementById('formPago'),resultadosClientePago=document.getElementById('resultadosClientePago'),
  pagoMonto=document.getElementById('pagoMonto'),pagoMetodo=document.getElementById('pagoMetodo'),
  pagoReferencia=document.getElementById('pagoReferencia'),pagoObservaciones=document.getElementById('pagoObservaciones'),
  confirmarPago=document.getElementById('confirmarPago'),
  rpcInicio=document.getElementById('rpcInicio'),rpcFin=document.getElementById('rpcFin'),
  rpcCliente=document.getElementById('rpcCliente'),rpcProducto=document.getElementById('rpcProducto'),
  rpcPago=document.getElementById('rpcPago'),rpcOrden=document.getElementById('rpcOrden'),
  rpcCanceladas=document.getElementById('rpcCanceladas'),productoMasVendido=document.getElementById('productoMasVendido'),
  tablaProductosCliente=document.getElementById('tablaProductosCliente');

// Órdenes de venta
let ordenDetalle=[],ordenActualId=null;
function limpiarEditorOrden(){
  ordenActualId=null;ordenDetalle=[];document.getElementById('editorOrden').reset();
  document.getElementById('ordenEditandoId').value='';document.getElementById('ordenEditorCantidad').value='1';
  dibujarEditorOrden();
}
function prepararCatalogosOrden(){
  const clientesHtml=clientes.map(c=>`<option value="${c.id}">${esc(c.nombre_razon_social)}</option>`).join('');
  document.getElementById('ordenEditorCliente').innerHTML=clientesHtml;
  document.getElementById('ordenEditorProducto').innerHTML=productos.map(p=>`<option value="${p.id}">${esc(p.codigo||p.id)} - ${esc(p.nombre)} · ${dinero.format(p.precio_venta)}</option>`).join('');
}
function dibujarEditorOrden(){
  const tbody=document.getElementById('ordenEditorDetalle');
  tbody.innerHTML=ordenDetalle.length?ordenDetalle.map((x,i)=>`<tr><td>${esc(x.codigo)}</td><td>${esc(x.nombre)}</td><td><input class="orden-item-cantidad" data-i="${i}" type="number" min="0.01" step="0.01" value="${x.cantidad}"></td><td>${esc(x.unidad)}</td><td>${dinero.format(x.precio)}</td><td>${dinero.format(x.cantidad*x.precio)}</td><td><input class="orden-item-obs" data-i="${i}" value="${esc(x.observaciones||'')}"></td><td><button type="button" class="orden-item-quitar danger" data-i="${i}">Quitar</button></td></tr>`).join(''):'<tr><td colspan="8">Agrega productos a la orden</td></tr>';
  document.getElementById('ordenEditorTotal').textContent=dinero.format(ordenDetalle.reduce((s,x)=>s+x.cantidad*x.precio,0));
}
async function cargarOrdenes(){
  if(!productos.length)await cargarProductos();
  if(!clientes.length)await cargarClientes();
  prepararCatalogosOrden();
  const q=new URLSearchParams({folio:ordenFolio.value,cliente:ordenCliente.value,fecha:ordenFecha.value,estado:ordenEstado.value});
  try{const data=await api(`/ordenes?${q}`);listaOrdenes.innerHTML=data.length?data.map(o=>`<tr><td>${esc(o.folio)}</td><td>${new Date(o.creada_at).toLocaleString('es-MX')}</td><td>${esc(o.cliente)}</td><td>${esc(o.estado)}</td><td>${dinero.format(o.total_estimado)}</td><td>${['BORRADOR','PENDIENTE'].includes(o.estado)?`<button class="orden-abrir" data-id="${o.id}">Abrir / modificar</button>`:''}${o.estado==='PENDIENTE'?`<button class="orden-pos" data-id="${o.id}">Cargar en POS</button>`:''}${['BORRADOR','PENDIENTE'].includes(o.estado)&&usuario.rol==='ADMON_GRAL'?`<button class="orden-cancelar danger" data-id="${o.id}">Cancelar</button>`:''}</td></tr>`).join(''):'<tr><td colspan="6">Sin órdenes</td></tr>'}catch(e){listaOrdenes.innerHTML=`<tr><td colspan="6">${esc(e.message)}</td></tr>`}
}
document.getElementById('filtrosOrdenes')?.addEventListener('submit',e=>{e.preventDefault();cargarOrdenes()});
document.getElementById('ordenNueva')?.addEventListener('click',limpiarEditorOrden);
document.getElementById('ordenCerrarEditor')?.addEventListener('click',limpiarEditorOrden);
document.getElementById('ordenAgregarProducto')?.addEventListener('click',()=>{
  const id=Number(document.getElementById('ordenEditorProducto').value),p=productos.find(x=>x.id===id),cantidadNueva=Number(document.getElementById('ordenEditorCantidad').value);
  if(!p||!esCantidadValida(cantidadNueva,p.unidad))return alert(p?mensajeCantidad(p.unidad):'Selecciona un producto');
  const existente=ordenDetalle.find(x=>x.producto_id===id);
  if(existente){existente.cantidad+=cantidadNueva;if(document.getElementById('ordenEditorDetalleObs').value)existente.observaciones=document.getElementById('ordenEditorDetalleObs').value}
  else ordenDetalle.push({producto_id:id,codigo:p.codigo||p.id,nombre:p.nombre,unidad:p.unidad,precio:Number(p.precio_venta),cantidad:cantidadNueva,observaciones:document.getElementById('ordenEditorDetalleObs').value});
  document.getElementById('ordenEditorCantidad').value='1';document.getElementById('ordenEditorDetalleObs').value='';dibujarEditorOrden();
});
document.getElementById('ordenEditorProducto')?.addEventListener('change',e=>{const p=productos.find(x=>x.id===Number(e.target.value));document.getElementById('ordenEditorCantidad').step=esCaja(p?.unidad)?'0.5':'0.01'});
document.getElementById('ordenEditorDetalle')?.addEventListener('change',e=>{const i=Number(e.target.dataset.i);if(e.target.matches('.orden-item-cantidad')){const n=Number(e.target.value);if(!esCantidadValida(n,ordenDetalle[i].unidad)){alert(mensajeCantidad(ordenDetalle[i].unidad));return dibujarEditorOrden()}ordenDetalle[i].cantidad=n}if(e.target.matches('.orden-item-obs'))ordenDetalle[i].observaciones=e.target.value;dibujarEditorOrden()});
document.getElementById('ordenEditorDetalle')?.addEventListener('click',e=>{const b=e.target.closest('.orden-item-quitar');if(b){ordenDetalle.splice(Number(b.dataset.i),1);dibujarEditorOrden()}});
document.getElementById('editorOrden')?.addEventListener('submit',async e=>{e.preventDefault();if(!ordenDetalle.length)return alert('Agrega productos a la orden');const invalido=ordenDetalle.find(x=>!esCantidadValida(x.cantidad,x.unidad));if(invalido)return alert(mensajeCantidad(invalido.unidad));const id=ordenActualId,endpoint=id?`/ordenes/${id}`:'/ordenes';try{await api(endpoint,{method:id?'PUT':'POST',body:JSON.stringify({cliente_id:Number(document.getElementById('ordenEditorCliente').value),estado:'PENDIENTE',productos:ordenDetalle.map(x=>({producto_id:x.producto_id,cantidad:x.cantidad,observaciones:x.observaciones}))})});alert(id?'Orden actualizada':'Orden guardada');limpiarEditorOrden();await cargarOrdenes()}catch(err){alert(err.message)}});
async function abrirOrdenEditor(id){const d=await api(`/ordenes/${id}`);if(!['BORRADOR','PENDIENTE'].includes(d.orden.estado))throw new Error('La orden ya no se puede modificar');ordenActualId=id;document.getElementById('ordenEditandoId').value=id;document.getElementById('ordenEditorCliente').value=d.orden.cliente_id;ordenDetalle=d.productos.map(x=>({producto_id:x.producto_id,codigo:x.codigo,nombre:x.nombre,unidad:x.unidad,precio:Number(x.precio_estimado),cantidad:Number(x.cantidad),observaciones:x.observaciones||''}));dibujarEditorOrden();document.getElementById('editorOrden').scrollIntoView({behavior:'smooth'})}
async function cargarOrdenEnPos(id){const d=await api(`/ordenes/${id}`);if(d.orden.estado!=='PENDIENTE')throw new Error('La orden ya no está pendiente');await cargarProductos();carrito=d.productos.map(x=>({producto_id:x.producto_id,codigo:x.codigo,nombre:x.nombre,cantidad:Number(x.cantidad),unidad:x.unidad,precio:Number(x.precio_actual),stock:Number(x.stock),observaciones:x.observaciones}));clienteVenta.value=d.orden.cliente_id;ordenCargada={id:d.orden.id,folio:d.orden.folio};const cambios=d.productos.filter(x=>x.precio_modificado).map(x=>x.nombre);alert(`Orden ${d.orden.folio} cargada en POS.${cambios.length?' Precios modificados: '+cambios.join(', '):''}`);dibujarCarrito();mostrar('pos')}
document.getElementById('listaOrdenes')?.addEventListener('click',async e=>{const abrir=e.target.closest('.orden-abrir'),pos=e.target.closest('.orden-pos'),x=e.target.closest('.orden-cancelar');try{if(abrir)await abrirOrdenEditor(Number(abrir.dataset.id));if(pos)await cargarOrdenEnPos(Number(pos.dataset.id));if(x&&confirm('¿Cancelar esta orden?')){await api(`/ordenes/${x.dataset.id}/cancelar`,{method:'POST'});cargarOrdenes()}}catch(err){alert(err.message)}});

// Directorio y estado de cuenta
let temporizadorCliente;
document.getElementById('buscarCliente')?.addEventListener('input',e=>{clearTimeout(temporizadorCliente);temporizadorCliente=setTimeout(()=>cargarClientes(e.target.value),250)});
document.getElementById('indiceClientes')?.addEventListener('click',e=>{const b=e.target.closest('[data-letra]');document.getElementById(`clientes-${b?.dataset.letra}`)?.focus({preventScroll:false})});
document.addEventListener('keydown',e=>{if(document.getElementById('clientes')?.classList.contains('activa')&&/^[a-z]$/i.test(e.key)&&!['INPUT','TEXTAREA'].includes(e.target.tagName))document.getElementById(`clientes-${e.key.toUpperCase()}`)?.focus()});
async function verResumenCliente(id){try{const d=await api(`/clientes/${id}/resumen`),r=document.getElementById('resumenCliente');r.classList.remove('hidden');r.innerHTML=`<div class="ventas-titulo"><h2>${esc(d.cliente.nombre_razon_social)}</h2><button type="button" id="cerrarResumenCliente">Cerrar</button></div><p>Saldo pendiente: <strong class="money">${dinero.format(d.saldo_total)}</strong></p><h3>Estado de cuenta</h3><div class="tabla-contenedor"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Folio</th><th>Cargo</th><th>Crédito</th><th>Saldo</th><th>Descripción</th><th>Usuario</th></tr></thead><tbody>${d.movimientos.length?d.movimientos.map(m=>`<tr><td>${new Date(m.fecha).toLocaleString('es-MX')}</td><td>${esc(m.concepto)}</td><td>${esc(m.folio)}</td><td>${dinero.format(m.cargo)}</td><td>${dinero.format(m.credito)}</td><td>${dinero.format(m.saldo_resultante)}</td><td>${esc(m.descripcion||'')}</td><td>${esc(m.usuario||'')}</td></tr>`).join(''):'<tr><td colspan="8">Sin movimientos</td></tr>'}</tbody></table></div><h3>Órdenes pendientes</h3><p>${d.ordenes.map(o=>esc(o.folio)).join(', ')||'Ninguna'}</p><h3>Últimas ventas</h3>${d.ventas.map(v=>`<div class="row"><span>Venta ${v.id} · ${new Date(v.fecha).toLocaleDateString('es-MX')}</span><strong>${dinero.format(v.total)}</strong></div>`).join('')||'<p>Sin ventas</p>'}`;r.scrollIntoView({behavior:'smooth',block:'start'});r.querySelector('#cerrarResumenCliente').addEventListener('click',()=>r.classList.add('hidden'))}catch(e){alert(`No fue posible abrir el estado de cuenta: ${e.message}`)}}

// Aplicación avanzada de pagos
const modalPago=document.getElementById('modalPago');
document.getElementById('abrirPago')?.addEventListener('click',()=>{modalPago.classList.remove('hidden');pagoFecha.value=new Date().toISOString().slice(0,10);buscarClientePago.focus()});
document.getElementById('cerrarPago')?.addEventListener('click',()=>modalPago.classList.add('hidden'));
async function abrirPagoParaCliente(id,nombre=''){
  modalPago.classList.remove('hidden');
  pagoFecha.value=new Date().toISOString().slice(0,10);
  const cliente=clientes.find(c=>Number(c.id)===Number(id));
  const notas=await api(`/cuentas/cliente/${id}/pendientes`);
  pagoClienteId.value=id;
  pagoClienteNombre.textContent=nombre||cliente?.nombre_razon_social||`Cliente ${id}`;
  notasPago.innerHTML=notas.length?`<div class="tabla-contenedor"><table><thead><tr><th></th><th>Folio</th><th>Fecha</th><th>Total original</th><th>Saldo</th><th>Monto a aplicar</th></tr></thead><tbody>${notas.map(n=>`<tr><td><input class="nota-pago" type="checkbox" value="${n.id}"></td><td>${esc(n.folio)}</td><td>${new Date(n.fecha).toLocaleDateString('es-MX')}</td><td>${dinero.format(n.total_deuda)}</td><td>${dinero.format(n.saldo_pendiente)}</td><td><input class="aplicacion-manual" data-id="${n.id}" data-saldo="${n.saldo_pendiente}" type="number" min="0.01" max="${n.saldo_pendiente}" step="0.01" disabled></td></tr>`).join('')}</tbody></table></div>`:'<p>Sin notas pendientes</p>';
  formPago.classList.remove('hidden');
}
let temporizadorPago;
document.getElementById('buscarClientePago')?.addEventListener('input',e=>{clearTimeout(temporizadorPago);temporizadorPago=setTimeout(async()=>{try{const d=await api(`/cuentas/clientes/buscar?q=${encodeURIComponent(e.target.value)}`);resultadosClientePago.innerHTML=d.map(c=>`<button class="cliente-pago" data-id="${c.id}" data-nombre="${esc(c.nombre_razon_social)}">${esc(c.nombre_razon_social)} · ${dinero.format(c.saldo_total)}</button>`).join('')}catch(err){alert(err.message)}},250)});
document.getElementById('resultadosClientePago')?.addEventListener('click',async e=>{const b=e.target.closest('.cliente-pago');if(!b)return;try{await abrirPagoParaCliente(Number(b.dataset.id),b.dataset.nombre)}catch(err){alert(err.message)}});
document.getElementById('notasPago')?.addEventListener('change',e=>{const check=e.target.closest('.nota-pago');if(!check)return;const input=document.querySelector(`.aplicacion-manual[data-id="${check.value}"]`);input.disabled=!check.checked;if(!check.checked)input.value=''});
document.getElementById('pagoMetodo')?.addEventListener('change',()=>{const requiere=pagoMetodo.value!=='EFECTIVO',grupo=document.getElementById('grupoPagoReferencia');grupo.classList.toggle('hidden',!requiere);pagoReferencia.required=requiere;pagoReferencia.placeholder=pagoMetodo.value==='CHEQUE'?'Número de cheque':'Referencia bancaria';if(!requiere)pagoReferencia.value=''});
document.getElementById('formPago')?.addEventListener('submit',async e=>{e.preventDefault();const checks=[...document.querySelectorAll('.nota-pago:checked')],aplicaciones=checks.map(c=>{const input=document.querySelector(`.aplicacion-manual[data-id="${c.value}"]`);return{cuenta_id:Number(c.value),monto:Number(input.value),saldo:Number(input.dataset.saldo)}});if(!aplicaciones.length)return alert('Selecciona al menos una nota');if(aplicaciones.some(a=>!Number.isFinite(a.monto)||a.monto<=0||a.monto>a.saldo))return alert('Revisa los montos aplicados; deben ser positivos y no superar el saldo');const monto=Number(pagoMonto.value),suma=aplicaciones.reduce((s,a)=>s+a.monto,0);if(!Number.isFinite(monto)||monto<=0)return alert('El monto recibido debe ser mayor que cero');if(Math.abs(suma-monto)>0.005)return alert('La suma aplicada debe coincidir con el monto recibido');if(pagoMetodo.value!=='EFECTIVO'&&!pagoReferencia.value.trim())return alert(pagoMetodo.value==='CHEQUE'?'Captura el número de cheque':'Captura la referencia bancaria');const resumen=`Cliente: ${pagoClienteNombre.textContent}\nMonto: ${dinero.format(monto)}\nMétodo: ${pagoMetodo.value}\nNotas: ${aplicaciones.length}`;if(!confirm(resumen))return;confirmarPago.disabled=true;try{const r=await api('/cuentas/pagos',{method:'POST',body:JSON.stringify({cliente_id:Number(pagoClienteId.value),monto_recibido:monto,cuenta_ids:aplicaciones.map(a=>a.cuenta_id),modo:'MANUAL',aplicaciones,metodo_pago:pagoMetodo.value,referencia:pagoReferencia.value.trim(),observaciones:pagoObservaciones.value,fecha:pagoFecha.value})});alert(`Pago ${r.pago_id} aplicado correctamente`);modalPago.classList.add('hidden');e.target.reset();cargarCuentas()}catch(err){alert(err.message)}finally{confirmarPago.disabled=false}});

// Reporte de productos por cliente
function parametrosReporte(){return new URLSearchParams({fecha_inicio:rpcInicio.value,fecha_fin:rpcFin.value,cliente_id:rpcCliente.value,producto_id:rpcProducto.value,tipo_pago:rpcPago.value,orden:rpcOrden.value,incluir_canceladas:rpcCanceladas.checked?'1':'0'})}
async function cargarReporteProductos(){if(usuario?.rol!=='ADMON_GRAL')return;try{rpcProducto.innerHTML='<option value="">Todos los productos</option>'+productos.map(p=>`<option value="${p.id}">${esc(p.codigo)} - ${esc(p.nombre)}</option>`).join('');const q=parametrosReporte(),[r,top]=await Promise.all([api(`/stats/productos-por-cliente?${q}`),api(`/stats/producto-mas-vendido?${q}`)]);reporteProductosActual=r.datos;productoMasVendido.innerHTML=top.producto?`<div class="card"><h4>Producto más vendido</h4><strong>${esc(top.producto.codigo)} · ${esc(top.producto.nombre)} · ${esc(top.producto.unidad)}</strong><p>${cantidad(top.producto.cantidad_total)} · ${dinero.format(top.producto.ingresos_generados)}</p></div>`:'<p>Sin ventas en el periodo.</p>';const totalUnidades=r.totales_por_unidad.map(x=>`${cantidad(x.cantidad)} ${esc(x.unidad)}`).join(' + ')||'0';tablaProductosCliente.innerHTML=`<table><thead><tr><th>Cliente</th><th>Código</th><th>Producto</th><th>Unidad</th><th>Cantidad</th><th>Ingresos</th></tr></thead><tbody>${r.datos.map(x=>`<tr><td>${esc(x.cliente)}</td><td>${esc(x.codigo)}</td><td>${esc(x.producto)}</td><td>${esc(x.unidad)}</td><td>${cantidad(x.cantidad_vendida)}</td><td>${dinero.format(x.ingresos_generados)}</td></tr>`).join('')}</tbody><tfoot><tr><th colspan="4">Totales por unidad</th><th>${totalUnidades}</th><th>${dinero.format(r.total_ingresos)}</th></tr></tfoot></table>`;if(graficaProductos)graficaProductos.destroy();graficaProductos=new Chart(document.getElementById('graficaProductos'),{type:'bar',data:{labels:r.datos.slice(0,10).map(x=>x.producto),datasets:[{label:'Cantidad vendida',data:r.datos.slice(0,10).map(x=>x.cantidad_vendida),backgroundColor:'#168b52'}]},options:{indexAxis:'y'}})}catch(e){console.error(e)}}
document.getElementById('filtrosProductosCliente')?.addEventListener('submit',e=>{e.preventDefault();cargarReporteProductos()});
document.getElementById('exportarProductosCsv')?.addEventListener('click',()=>{const filas=[['Cliente','Código','Producto','Unidad','Cantidad vendida','Ingresos'],...reporteProductosActual.map(x=>[x.cliente,x.codigo,x.producto,x.unidad,x.cantidad_vendida,x.ingresos_generados])],csv=filas.map(f=>f.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\r\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv'}));a.download='productos-por-cliente.csv';a.click();URL.revokeObjectURL(a.href)});

    try{usuario=JSON.parse(localStorage.getItem('usuarioPOS'))}catch{} if(token&&usuario)iniciarApp();
