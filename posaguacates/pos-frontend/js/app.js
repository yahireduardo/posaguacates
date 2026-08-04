const API=''; let usuario=null, token=localStorage.getItem('tokenPOS'), productos=[], clientes=[], carrito=[], ultimaVenta=null, detalleVentaActual=null, grafica=null, graficaProductos=null, graficaClientes=null, graficaProveedores=null, productoSeleccionado = null, indiceResultadoActivo = -1, ordenCargada=null, reporteProductosActual=[], estadoInstanciaPOS=null, archivoRespaldoSeleccionado=null, analisisRespaldoActual=null, backupIdDescargado=null, reinicioRespaldoPendiente=false, idempotenciaVentaPendiente=null;
    const ultimaVentaGuardada=Number(localStorage.getItem('ultimaVentaPOS'));
    if(Number.isInteger(ultimaVentaGuardada)&&ultimaVentaGuardada>0)ultimaVenta={venta_id:ultimaVentaGuardada};
    const dinero=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',minimumFractionDigits:2,maximumFractionDigits:2});
    const cantidad=n=>new Intl.NumberFormat('es-MX',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0);
    const esCaja=unidad=>['CAJA','CAJAS'].includes(String(unidad||'').trim().toUpperCase());
    const pasoCantidad=unidad=>esCaja(unidad)?'0.5':'0.01';
    const configurarPasoCantidad=(input,unidad)=>{if(!input)return;const paso=pasoCantidad(unidad),valor=Number(input.value);input.step=paso;input.min=paso;if(esCaja(unidad)&&(!Number.isFinite(valor)||valor<=0||!Number.isInteger(valor*2)))input.value='0.5'};
    const esCantidadValida=(valor,unidad)=>{const n=Number(valor);return Number.isFinite(n)&&n>0&&(!esCaja(unidad)||Number.isInteger(n*2))};
    const mensajeCantidad=unidad=>esCaja(unidad)?'En cajas solo se permiten cantidades enteras o medias cajas, por ejemplo 1, 1.5, 2 o 2.5.':'Ingresa una cantidad válida en kilos.';
    const formatearCantidad=(valor,unidad)=>{const n=Number(valor);if(!Number.isFinite(n))return '0';return new Intl.NumberFormat('es-MX',{minimumFractionDigits:0,maximumFractionDigits:esCaja(unidad)?1:2}).format(n)};
    const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

    async function api(path, options = {}) {

  const esFormData = options.body instanceof FormData;
  const headers = {

    ...(options.body && !esFormData
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
    if (response.status === 423) aplicarEstadoInstancia({ estado: 'ENTREGADA', bloqueada: 1 });

    throw new Error(
      (typeof data === 'object' ? data.error : data) ||
      'Error en la solicitud'
    );

  }

  return data;

}
    function mostrar(id){if(id==='respaldos'&&usuario?.rol!=='ADMON_GRAL')id='pos';document.querySelectorAll('.seccion').forEach(x=>x.classList.toggle('activa',x.id===id));if(id==='cuentas')cargarCuentas();if(id==='ordenes')cargarOrdenes();if(id==='clientes')cargarClientes();if(id==='inventario')cargarInventario();if(id==='ventas')cargarVentas();if(id==='respaldos'){cargarEstadoRespaldos();cargarHistorialRespaldos()}if(id==='dashboard'){cargarDashboard();cargarReporteProductos().then(cargarGraficasHistoricas);cargarGraficaProveedores()}}
    document.querySelectorAll('[data-section]').forEach(b => b.addEventListener('click', () => mostrar(b.dataset.section)));
    document.getElementById('toggleLoginPassword')?.addEventListener('click', e => {
      const input = document.getElementById('password');
      const mostrarPassword = input.type === 'password';
      input.type = mostrarPassword ? 'text' : 'password';
      e.currentTarget.textContent = mostrarPassword ? 'Ocultar' : 'Mostrar';
      e.currentTarget.setAttribute('aria-label', `${mostrarPassword ? 'Ocultar' : 'Mostrar'} contraseña`);
      e.currentTarget.setAttribute('aria-pressed', String(mostrarPassword));
      input.focus();
    });

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
  cargarEstadoRespaldos({silencioso:true});
  const botonUltimoTicket=document.getElementById('imprimir');
  if(botonUltimoTicket)botonUltimoTicket.disabled=!ultimaVenta;

}
    function cerrarSesion(){if(token)fetch('/auth/logout',{method:'POST',headers:{Authorization:`Bearer ${token}`}}).catch(()=>{});localStorage.removeItem('tokenPOS');localStorage.removeItem('usuarioPOS');location.reload()}
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

          configurarPasoCantidad(document.getElementById('cantidadMovimiento'),productos[0]?.unidad);

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
  configurarPasoCantidad(cantidadCaptura,producto.unidad);

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
              min="${pasoCantidad(producto.unidad)}"
              step="${pasoCantidad(producto.unidad)}"
              value="${producto.cantidad}"
            >

          </td>

          <td>

            <span>${esc(producto.unidad || '')}</span>

          </td>

          <td>
            <input class="precio-carrito" data-indice="${indice}" type="number" min="1" step="1" value="${Number(producto.precio)}" aria-label="Precio unitario entero de ${esc(producto.nombre)}">
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

  gestorPagoVenta?.establecerTotal(totalVenta);

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

function cambiarPrecio(indice, nuevoValor) {
  const precio = Number(nuevoValor);
  if (!Number.isInteger(precio) || precio <= 0 || precio > 99999999) {
    alert('Ingresa un precio unitario entero mayor a cero');
    dibujarCarrito();
    return;
  }
  carrito[indice].precio = precio;
  dibujarCarrito();
}

document.getElementById('detalleVenta')?.addEventListener('change', evento => {
  const input = evento.target.closest('.cantidad-carrito');
  if (input) cambiarCantidad(Number(input.dataset.indice), input.value);
  const precio = evento.target.closest('.precio-carrito');
  if (precio) cambiarPrecio(Number(precio.dataset.indice), precio.value);
});
document.getElementById('detalleVenta')?.addEventListener('click', evento => {
  const boton = evento.target.closest('.boton-eliminar-producto');
  if (boton) quitar(Number(boton.dataset.indice));
});
    const venderBtn = document.getElementById('vender');
    const imprimirBtn = document.getElementById('imprimir');
    const clienteVentaSelect = document.getElementById('clienteVenta');
    const tipoPagoSelect = document.getElementById('tipoPago');
    function crearGestorMetodosPago(contenedorId,saldoId,agregarId){const contenedor=document.getElementById(contenedorId),saldoNodo=document.getElementById(saldoId),agregar=document.getElementById(agregarId),nombres={EFECTIVO:'Efectivo',TRANSFERENCIA:'Transferencia',CHEQUE:'Cheque'};let filas=[],totalActual=0;const leerFilas=()=>[...contenedor.querySelectorAll('.metodo-pago-fila')].map(f=>({metodo_pago:f.querySelector('.metodo-pago-tipo').value,monto:Number(f.querySelector('.metodo-pago-monto').value||0),referencia:f.querySelector('.metodo-pago-referencia')?.value.trim()||null}));function actualizar(){filas=leerFilas();const suma=filas.reduce((s,x)=>s+(Number.isFinite(x.monto)?x.monto:0),0),restante=Number((totalActual-suma).toFixed(2));saldoNodo.textContent=restante>0.005?`Saldo pendiente: ${dinero.format(restante)}`:restante<-.005?`El cobro excede el total por ${dinero.format(Math.abs(restante))}`:'Nota saldada';saldoNodo.classList.toggle('error',restante<-.005);agregar.classList.toggle('hidden',restante<=.005||filas.length>=3)}function dibujar(){const usados=new Set(filas.map(x=>x.metodo_pago));contenedor.innerHTML=filas.map((fila,i)=>`<div class="metodo-pago-fila form-grid" data-i="${i}"><label>Método<select class="metodo-pago-tipo">${Object.entries(nombres).map(([v,n])=>`<option value="${v}" ${v===fila.metodo_pago?'selected':''} ${usados.has(v)&&v!==fila.metodo_pago?'disabled':''}>${n}</option>`).join('')}</select></label><label>Importe<input class="metodo-pago-monto" type="number" min="0.01" step="0.01" value="${fila.monto||''}"></label>${fila.metodo_pago==='EFECTIVO'?'':`<label>${fila.metodo_pago==='CHEQUE'?'Número de cheque':'Referencia'}<input class="metodo-pago-referencia" maxlength="100" value="${esc(fila.referencia||'')}"></label>`}${i?'<button class="quitar-metodo-pago danger" type="button">Quitar</button>':''}</div>`).join('');actualizar()}contenedor.addEventListener('input',actualizar);contenedor.addEventListener('change',e=>{if(!e.target.matches('.metodo-pago-tipo'))return;filas=leerFilas();dibujar()});contenedor.addEventListener('click',e=>{const boton=e.target.closest('.quitar-metodo-pago');if(!boton)return;filas=leerFilas();filas.splice(Number(boton.closest('.metodo-pago-fila').dataset.i),1);dibujar()});agregar.addEventListener('click',()=>{filas=leerFilas();const usado=new Set(filas.map(x=>x.metodo_pago)),metodo=['EFECTIVO','TRANSFERENCIA','CHEQUE'].find(x=>!usado.has(x));const suma=filas.reduce((s,x)=>s+x.monto,0);if(metodo)filas.push({metodo_pago:metodo,monto:Math.max(0,Number((totalActual-suma).toFixed(2))),referencia:null});dibujar()});return{establecerTotal(total){const anterior=totalActual;totalActual=Number(total)||0;if(!filas.length)filas=[{metodo_pago:'EFECTIVO',monto:totalActual,referencia:null}];else if(filas.length===1&&(Math.abs(filas[0].monto-anterior)<.005||filas[0].monto===0))filas[0].monto=totalActual;dibujar()},reiniciar(total=0){filas=[{metodo_pago:'EFECTIVO',monto:Number(total)||0,referencia:null}];totalActual=Number(total)||0;dibujar()},obtener(){filas=leerFilas();const validas=filas.filter(x=>x.monto>0);if(!validas.length)throw new Error('Captura al menos un método de pago');for(const x of validas)if(x.metodo_pago!=='EFECTIVO'&&!x.referencia)throw new Error(x.metodo_pago==='CHEQUE'?'Captura el número de cheque':'Captura la referencia de la transferencia');const suma=Number(validas.reduce((s,x)=>s+x.monto,0).toFixed(2));if(Math.abs(suma-totalActual)>.005)throw new Error(`Falta saldar ${dinero.format(Math.max(0,totalActual-suma))}`);return validas}}}
    const gestorPagoVenta=crearGestorMetodosPago('filasPagoVenta','saldoPagoVenta','agregarMetodoVenta');
    document.addEventListener('focusin',e=>{if(e.target.matches('.metodo-pago-monto'))e.target.step='any'});
    document.addEventListener('input',e=>{if(!e.target.matches('.metodo-pago-monto'))return;const contenedor=e.target.closest('#filasPagoVenta,#filasPagoCliente');if(!contenedor)return;const total=contenedor.id==='filasPagoVenta'?carrito.reduce((s,x)=>s+Number(x.cantidad)*Number(x.precio),0):Number(document.getElementById('pagoMonto')?.value||0),otros=[...contenedor.querySelectorAll('.metodo-pago-monto')].filter(x=>x!==e.target).reduce((s,x)=>s+Number(x.value||0),0),maximo=Math.max(0,Number((total-otros).toFixed(2))),valor=Number(e.target.value||0);e.target.max=String(maximo);if(Number.isFinite(valor)&&valor>maximo)e.target.value=String(maximo)},true);
    function actualizarCobroVenta(){const credito=tipoPagoSelect.value==='CREDITO';document.getElementById('metodosPagoVenta').classList.toggle('hidden',credito);if(credito)gestorPagoVenta.reiniciar(0)}
    tipoPagoSelect?.addEventListener('change',actualizarCobroVenta);actualizarCobroVenta();
    venderBtn?.addEventListener('click', async () => {
      if (!carrito.length) return alert('Agrega productos');
      const clienteSeleccionado=clientes.find(c=>c.id===Number(clienteVentaSelect.value));
      idempotenciaVentaPendiente ||= (crypto.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`);
      if(!clienteSeleccionado)return alert('Selecciona un cliente de los resultados de búsqueda');
      try {
        const total=carrito.reduce((s,x)=>s+Number(x.cantidad)*Number(x.precio),0).toFixed(2),metodos=tipoPagoSelect.value==='CONTADO'?gestorPagoVenta.obtener():[];
        const endpoint=ordenCargada?`/ordenes/${ordenCargada.id}/convertir`:'/ventas/crear';
        const data = await api(endpoint, { method: 'POST', headers:{'Idempotency-Key':idempotenciaVentaPendiente}, body: JSON.stringify({
          cliente_id: Number(clienteVentaSelect.value), tipo_pago: tipoPagoSelect.value,
          metodo_pago: tipoPagoSelect.value==='CONTADO'?(metodos.length>1?'MIXTO':metodos[0].metodo_pago):null,
          metodos_pago:metodos, idempotency_key: idempotenciaVentaPendiente,
          productos: carrito.map(({ producto_id, cantidad, precio }) => ({ producto_id, cantidad, precio_unitario:precio }))
        }) });
        ultimaVenta = {
          ...data,
          cliente: clienteSeleccionado.nombre_razon_social,
          tipo_pago: tipoPagoSelect.value,
          metodo_pago: tipoPagoSelect.value==='CONTADO'?(metodos.length>1?'MIXTO':metodos[0].metodo_pago):null,
          fecha: new Date().toISOString()
        };
        localStorage.setItem('ultimaVentaPOS',String(data.venta_id));
        carrito = [];
        idempotenciaVentaPendiente=null;
        gestorPagoVenta.reiniciar(0);
        ordenCargada=null;
        dibujarCarrito();
        imprimirBtn.disabled = false;
        await Promise.all([cargarProductos(),usuario?.rol==='ADMON_GRAL'?cargarVentas():Promise.resolve()]);
        alert(`Venta #${data.venta_id} registrada por ${dinero.format(data.total)}`);
      } catch (error) { alert(error.message); }
    });

    async function imprimirVenta(ventaId) {
      const ventana = window.open('', '_blank', 'width=420,height=650');
      if (!ventana) {
        throw new Error('El navegador bloqueó la ventana del ticket. Permite las ventanas emergentes para este sitio e intenta nuevamente');
      }
      ventana.document.write('<meta charset="utf-8"><title>Preparando ticket...</title><p style="font-family:sans-serif">Preparando ticket...</p>');
      try {
        const ticket = await api(`/ventas/${ventaId}/ticket-url`, { method: 'POST' });
        ventana.location.href=ticket.url;
      } catch (error) {
        ventana.close();
        throw error;
      }
    }
    imprimirBtn?.addEventListener('click', async () => {
      if (!ultimaVenta) return;
      try { await imprimirVenta(ultimaVenta.venta_id); } catch (error) { alert(error.message); }
    });

    async function cargarClientes(buscar=''){const lista=document.getElementById('listaClientes'),indice=document.getElementById('indiceClientes');const respuesta=await api(`/clientes?buscar=${encodeURIComponent(buscar)}&limite=500`);clientes=respuesta.datos||respuesta;const rpc=document.getElementById('rpcCliente');if(rpc)rpc.innerHTML='<option value="">Todos los clientes</option>'+clientes.map(c=>`<option value="${c.id}">${esc(c.nombre_razon_social)}</option>`).join('');const grupos=new Map();clientes.forEach(c=>{const inicial=(c.nombre_razon_social.normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/^[A-Za-z]/)?.[0]||'#').toUpperCase();if(!grupos.has(inicial))grupos.set(inicial,[]);grupos.get(inicial).push(c)});if(indice)indice.innerHTML='ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('').map(l=>`<button type="button" data-letra="${l}" aria-label="Ir a ${l}">${l}</button>`).join('');if(lista)lista.innerHTML=[...grupos.entries()].map(([letra,items])=>`<section id="clientes-${letra}" class="grupo-clientes" tabindex="-1"><h3>${letra}</h3><div class="grid">${items.map(c=>`<article class="card"><h3>${esc(c.nombre_razon_social)}</h3><p>${esc(c.rfc||'Sin RFC')} · ${esc(c.telefono||'Sin teléfono')}</p><div class="cliente-acciones"><button class="ver-cliente" data-id="${c.id}">Estado de cuenta</button>${usuario.rol==='ADMON_GRAL'?`<button class="editar-cliente" data-id="${c.id}">Editar</button><button class="eliminar-cliente danger" data-id="${c.id}" data-nombre="${esc(c.nombre_razon_social)}" ${Number(c.id)===1?'disabled title="Público General está protegido"':''}>Eliminar cliente</button>`:''}</div></article>`).join('')}</div></section>`).join('')}
    function dibujarResultadosClienteVenta(){
      const entrada=document.getElementById('clienteVentaBuscar'),resultados=document.getElementById('resultadosClienteVenta');
      if(!entrada||!resultados)return;
      const termino=entrada.value.trim().toLocaleLowerCase('es-MX');
      document.getElementById('clienteVenta').value='';
      if(!termino){resultados.innerHTML='';return}
      const coincidencias=clientes.filter(c=>[c.nombre_razon_social,c.rfc,c.telefono].some(v=>String(v||'').toLocaleLowerCase('es-MX').includes(termino))).slice(0,10);
      resultados.innerHTML=coincidencias.length?coincidencias.map(c=>`<button type="button" class="cliente-venta-opcion" data-id="${c.id}"><strong>${esc(c.nombre_razon_social)}</strong><small>${esc(c.rfc||'Sin RFC')} · ${esc(c.telefono||'Sin teléfono')}</small></button>`).join(''):'<p class="muted">No se encontraron clientes.</p>';
    }
    document.getElementById('clienteVentaBuscar')?.addEventListener('input',dibujarResultadosClienteVenta);
    document.getElementById('resultadosClienteVenta')?.addEventListener('click',e=>{
      const boton=e.target.closest('.cliente-venta-opcion');if(!boton)return;
      const cliente=clientes.find(c=>c.id===Number(boton.dataset.id));if(!cliente)return;
      document.getElementById('clienteVenta').value=cliente.id;
      document.getElementById('clienteVentaBuscar').value=cliente.nombre_razon_social;
      document.getElementById('resultadosClienteVenta').innerHTML='';
    });
    function seleccionarCliente(id){const c=clientes.find(x=>x.id===id);if(!c)return;document.getElementById('clienteId').value=c.id;document.getElementById('nombreRazon').value=c.nombre_razon_social;document.getElementById('rfc').value=c.rfc||'';document.getElementById('telefono').value=c.telefono||'';document.getElementById('correo').value=c.correo_electronico||'';cancelarEdicion.classList.remove('hidden')}
    const clienteForm=document.getElementById('clienteForm'),cancelarEdicion=document.getElementById('cancelarEdicion');
    cancelarEdicion?.addEventListener('click',()=>{clienteForm.reset();document.getElementById('clienteId').value='';cancelarEdicion.classList.add('hidden')});
    clienteForm?.addEventListener('submit',async e=>{e.preventDefault();const id=document.getElementById('clienteId').value;const body=JSON.stringify({nombre_razon_social:document.getElementById('nombreRazon').value,rfc:document.getElementById('rfc').value,telefono:document.getElementById('telefono').value,correo_electronico:document.getElementById('correo').value});try{await api(id?`/clientes/${id}`:'/clientes',{method:id?'PUT':'POST',body});cancelarEdicion.click();await cargarClientes()}catch(error){alert(error.message)}});
    const modalEliminarCliente=document.getElementById('modalEliminarCliente');
    function cerrarModalEliminarCliente(){
      modalEliminarCliente.classList.add('hidden');
      document.getElementById('formEliminarCliente').reset();
      document.getElementById('eliminarClienteId').value='';
      document.getElementById('resumenEliminarCliente').innerHTML='';
    }
    async function abrirModalEliminarCliente(id){
      const resumen=document.getElementById('resumenEliminarCliente');
      modalEliminarCliente.classList.remove('hidden');
      document.getElementById('formEliminarCliente').classList.add('hidden');
      resumen.innerHTML='<p>Analizando relaciones del cliente…</p>';
      try{
        const d=await api(`/clientes/${id}/eliminacion-diagnostico`);
        if(d.protegido)throw new Error('El cliente Público General no se puede eliminar');
        document.getElementById('eliminarClienteId').value=id;
        const cantidadTotal=d.productos_reintegrados.reduce((s,p)=>s+Number(p.cantidad),0);
        const productos=d.productos_reintegrados.length
          ?`<ul>${d.productos_reintegrados.map(p=>`<li>${esc(p.nombre)}: ${cantidad(p.cantidad)} ${esc(p.unidad||'')}</li>`).join('')}</ul>`
          :'<p>No regresarán productos al inventario.</p>';
        resumen.innerHTML=`<div class="alerta"><strong>${esc(d.cliente.nombre_razon_social)}</strong><p>${d.modo==='DESTRUCTIVO_PRUEBAS'?'Se eliminarán físicamente datos de prueba.':'La eliminación física está deshabilitada; se realizará una baja lógica.'}</p></div><div class="grid"><article class="card"><small>Ventas</small><strong>${d.ventas}</strong></article><article class="card"><small>Órdenes</small><strong>${d.ordenes}</strong></article><article class="card"><small>Cuentas pendientes</small><strong>${d.cuentas_pendientes}</strong></article><article class="card"><small>Pagos</small><strong>${d.pagos}</strong></article><article class="card"><small>Cantidad aproximada a reintegrar</small><strong>${cantidad(cantidadTotal)}</strong></article></div><h3>Inventario que regresaría</h3>${productos}`;
        document.getElementById('formEliminarCliente').classList.remove('hidden');
        document.getElementById('motivoEliminarCliente').focus();
      }catch(error){
        resumen.innerHTML=`<p class="error">${esc(error.message)}</p>`;
      }
    }
    document.getElementById('cerrarEliminarCliente')?.addEventListener('click',cerrarModalEliminarCliente);
    modalEliminarCliente?.addEventListener('click',e=>{if(e.target===modalEliminarCliente)cerrarModalEliminarCliente()});
    document.getElementById('formEliminarCliente')?.addEventListener('submit',async e=>{
      e.preventDefault();
      const boton=document.getElementById('confirmarEliminarCliente');
      boton.disabled=true;
      boton.textContent='Procesando…';
      try{
        const r=await api(`/clientes/${document.getElementById('eliminarClienteId').value}`,{
          method:'DELETE',
          body:JSON.stringify({
            motivo:document.getElementById('motivoEliminarCliente').value.trim(),
            confirmacion:document.getElementById('confirmacionEliminarCliente').value.trim()
          })
        });
        cerrarModalEliminarCliente();
        alert(r.mensaje);
        document.getElementById('resumenCliente')?.classList.add('hidden');
        await Promise.all([cargarClientes(),cargarProductos(),cargarInventario(),cargarVentas(),cargarCuentas(),cargarDashboard()]);
      }catch(error){
        alert(error.message);
      }finally{
        boton.disabled=false;
        boton.textContent='Eliminar cliente';
      }
    });
    document.getElementById('listaClientes')?.addEventListener('click',evento=>{const editar=evento.target.closest('.editar-cliente'),ver=evento.target.closest('.ver-cliente'),eliminar=evento.target.closest('.eliminar-cliente');if(editar)seleccionarCliente(Number(editar.dataset.id));if(ver)verResumenCliente(Number(ver.dataset.id));if(eliminar&&!eliminar.disabled)abrirModalEliminarCliente(Number(eliminar.dataset.id))});

    async function cargarCuentas(){try{const data=await api('/cuentas'),lista=document.getElementById('listaCuentas');lista.innerHTML=data.length?data.map(c=>`<article class="card"><h3>${esc(c.nombre_razon_social)}</h3><div class="money">${dinero.format(c.saldo_total)}</div><button class="ver-cuenta" data-id="${c.cliente_id}">Detalle e historial</button></article>`).join(''):'<p>Sin saldos pendientes.</p>'}catch(e){alert(e.message)}}
    async function verCuenta(id){try{const d=await api(`/cuentas/cliente/${id}`);if(!d.cliente||!d.resumen||!Array.isArray(d.cuentas)||!Array.isArray(d.pagos)||!Array.isArray(d.movimientos))throw new Error('La respuesta del historial de cuenta está incompleta');const detalle=document.getElementById('detalleCuenta'),pagosUnicos=[...new Map(d.pagos.map(p=>[p.pago_id,p])).values()];detalle.dataset.clienteId=id;detalle.classList.remove('hidden');detalle.innerHTML=`<h2>${esc(d.cliente.nombre_razon_social)}</h2><p>${esc(d.cliente.rfc||'Sin RFC')} · ${esc(d.cliente.telefono||'Sin teléfono')} · ${esc(d.cliente.correo_electronico||'Sin correo')}</p><div class="grid"><article class="card"><small>Saldo pendiente</small><strong>${dinero.format(d.resumen.saldo_total_pendiente)}</strong></article><article class="card"><small>Ventas pendientes</small><strong>${d.resumen.ventas_pendientes}</strong></article><article class="card"><small>Pagos aplicados</small><strong>${d.resumen.pagos_aplicados}</strong></article><article class="card"><small>Pagos cancelados</small><strong>${d.resumen.pagos_cancelados}</strong></article></div><h3>Estado de cuenta</h3><div class="tabla-contenedor"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Folio</th><th>Cargo</th><th>Abono</th><th>Saldo</th><th>Descripción</th><th>Usuario/Caja</th></tr></thead><tbody>${d.movimientos.length?d.movimientos.map(m=>`<tr><td>${new Date(m.fecha).toLocaleString('es-MX')}</td><td>${esc(m.concepto)}</td><td>${esc(m.folio)}</td><td>${dinero.format(m.cargo)}</td><td>${dinero.format(m.credito)}</td><td>${dinero.format(m.saldo)}</td><td>${esc(m.descripcion||'')}</td><td>${esc(m.usuario)}</td></tr>`).join(''):'<tr><td colspan="8">Sin movimientos.</td></tr>'}</tbody></table></div><h3>Cuentas</h3>${d.cuentas.length?d.cuentas.map(c=>`<div class="row"><span>Venta #${c.venta_id} · ${esc(c.estado)}<br>${new Date(c.fecha).toLocaleString('es-MX')}</span><span>${dinero.format(c.saldo_pendiente)}</span></div>`).join(''):'<p>Sin cuentas.</p>'}<h3>Historial de pagos</h3>${pagosUnicos.length?pagosUnicos.map(p=>`<div class="row"><span>Pago P-${p.pago_id} · ${new Date(p.fecha).toLocaleString('es-MX')} · ${esc(p.metodo_pago)}${p.pago_estado==='CANCELADO'?`<br><small>Cancelado: ${esc(p.motivo_cancelacion||'Sin motivo')}</small>`:''}</span><span>${p.pago_estado==='ACTIVO'?`<button class="cancelar-pago danger" data-id="${p.pago_id}">Cancelar pago</button>`:''}</span></div>`).join(''):'<p>Sin pagos.</p>'}${usuario.rol==='ADMON_GRAL'&&d.resumen.ventas_pendientes>0?`<button class="primary aplicar-pago-cliente" data-id="${id}">Aplicar pago a este cliente</button>`:''}`}catch(e){alert(e.message)}}
    document.getElementById('listaCuentas')?.addEventListener('click',e=>{const b=e.target.closest('.ver-cuenta');if(b)verCuenta(Number(b.dataset.id))});
    document.getElementById('detalleCuenta')?.addEventListener('click',async e=>{const b=e.target.closest('.aplicar-pago-cliente'),cancelar=e.target.closest('.cancelar-pago');if(b)abrirPagoParaCliente(Number(b.dataset.id));if(cancelar){const motivo=prompt('Motivo de cancelación del pago');if(!motivo?.trim())return;const password=prompt('Escribe la contraseña del Administrador General');if(!password)return;if(!confirm('Se revertirán todas las aplicaciones de este pago. ¿Deseas continuar?'))return;try{await api(`/cuentas/pagos/${cancelar.dataset.id}/cancelar`,{method:'POST',body:JSON.stringify({motivo:motivo.trim(),password})});alert('Pago cancelado');await verCuenta(Number(e.currentTarget.dataset.clienteId));await cargarCuentas()}catch(error){alert(error.message)}}});
    let temporizadorCuenta;
    async function buscarClientesCuenta(){const q=document.getElementById('buscarClienteCuenta').value.trim(),contenedor=document.getElementById('resultadosClienteCuenta');try{const datos=await api(`/cuentas/clientes/buscar?q=${encodeURIComponent(q)}`);contenedor.innerHTML=datos.length?datos.map(c=>`<button type="button" class="seleccionar-cliente-cuenta" data-id="${c.id}"><strong>${esc(c.nombre_razon_social)}</strong> · ${esc(c.rfc||'Sin RFC')} · ${esc(c.telefono||'Sin teléfono')} · ${esc(c.correo_electronico||'Sin correo')}</button>`).join(''):'<p>Sin clientes encontrados.</p>'}catch(error){contenedor.innerHTML=`<p>${esc(error.message)}</p>`}}
    document.getElementById('buscarClienteCuenta')?.addEventListener('input',()=>{clearTimeout(temporizadorCuenta);temporizadorCuenta=setTimeout(buscarClientesCuenta,300)});
    document.getElementById('buscarClienteCuenta')?.addEventListener('keydown',async e=>{if(e.key!=='Enter')return;e.preventDefault();clearTimeout(temporizadorCuenta);await buscarClientesCuenta();document.querySelector('#resultadosClienteCuenta .seleccionar-cliente-cuenta')?.click()});
    document.getElementById('ejecutarBusquedaCuenta')?.addEventListener('click',buscarClientesCuenta);
    document.getElementById('resultadosClienteCuenta')?.addEventListener('click',e=>{const b=e.target.closest('.seleccionar-cliente-cuenta');if(b)verCuenta(Number(b.dataset.id))});

    async function cargarInventario(){await cargarProductos();const data=await api('/inventario');const existencias=document.getElementById('existenciasInventario');if(existencias)existencias.innerHTML=`<table><thead><tr><th>Código</th><th>Producto</th><th>Unidad</th><th>Stock</th><th>Mínimo</th><th>Estado</th></tr></thead><tbody>${productos.map(p=>`<tr><td>${esc(p.codigo)}</td><td>${esc(p.nombre)}</td><td>${esc(p.unidad)}</td><td>${formatearCantidad(p.stock,p.unidad)}</td><td>${formatearCantidad(p.stock_minimo,p.unidad)}</td><td>${Number(p.stock)<=Number(p.stock_minimo)?'<span class="estado-chip warning">Stock bajo</span>':'<span class="estado-chip ok">Disponible</span>'}</td></tr>`).join('')}</tbody></table>`;movimientos.innerHTML=data.map(m=>`<div class="panel row"><span>${esc(m.producto)} · ${esc(m.motivo)}<br><small>${new Date(m.fecha).toLocaleString('es-MX')} · ${esc(m.referencia_tipo||'MANUAL')}</small></span><strong>${m.tipo==='ENTRADA'?'+':'−'}${formatearCantidad(m.cantidad,m.unidad)} ${esc(m.unidad||'')}</strong></div>`).join('')}
    document.getElementById('productoMovimiento')?.addEventListener('change',e=>{const p=productos.find(x=>x.id===Number(e.target.value));configurarPasoCantidad(document.getElementById('cantidadMovimiento'),p?.unidad)});
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
              ${esc(venta.tipo_pago)} · ${esc(venta.metodo_pago||'EFECTIVO')}
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
            ${usuario.rol === 'CAJERO' ? '🔒 Solicitar cancelación' : 'Cancelar'}
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
    document.getElementById('reimprimirDetalle').disabled=venta.estado_venta==='CANCELADA';

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
          <span>Método de pago</span>
          <strong>
            ${esc(venta.metodo_pago||'EFECTIVO')}
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

const modalAutorizacionCancelacion = document.getElementById('modalAutorizacionCancelacion');
let cancelacionPendiente = null;

function cerrarModalCancelacion() {
  modalAutorizacionCancelacion.classList.add('hidden');
  document.getElementById('formAutorizacionCancelacion').reset();
  document.getElementById('passwordAdminCancelacion').value = '';
  cancelacionPendiente = null;
}

function abrirModalCancelacion(tipo, id, clienteId = null) {
  cancelacionPendiente = { tipo, id, clienteId };
  const esCajero = usuario.rol === 'CAJERO';
  document.getElementById('tituloAutorizacionCancelacion').textContent =
    tipo === 'VENTA' ? 'Cancelar venta' : 'Cancelar pago';
  document.getElementById('textoAutorizacionCancelacion').textContent = esCajero
    ? 'Esta operación requiere autorización de un Administrador General.'
    : `¿Seguro que deseas cancelar ${tipo === 'VENTA' ? 'esta venta' : 'este pago'}?`;
  document.getElementById('camposAdministradorCancelacion').classList.remove('hidden');
  document.getElementById('usuarioAdminCancelacion').value = esCajero ? '' : usuario.username;
  document.getElementById('usuarioAdminCancelacion').required = true;
  document.getElementById('passwordAdminCancelacion').required = true;
  modalAutorizacionCancelacion.classList.remove('hidden');
  (esCajero
    ? document.getElementById('usuarioAdminCancelacion')
    : document.getElementById('motivoAutorizacionCancelacion')).focus();
}

document.getElementById('cerrarAutorizacionCancelacion')?.addEventListener('click', cerrarModalCancelacion);
modalAutorizacionCancelacion?.addEventListener('click', evento => {
  if (evento.target === modalAutorizacionCancelacion) cerrarModalCancelacion();
});
document.getElementById('formAutorizacionCancelacion')?.addEventListener('submit', async evento => {
  evento.preventDefault();
  if (!cancelacionPendiente) return;
  const boton = document.getElementById('confirmarAutorizacionCancelacion');
  const body = { motivo: document.getElementById('motivoAutorizacionCancelacion').value.trim() };
  if (!body.motivo) return;
  body.usuario_admin = document.getElementById('usuarioAdminCancelacion').value.trim();
  body.password_admin = document.getElementById('passwordAdminCancelacion').value;
  boton.disabled = true;
  const pendiente = { ...cancelacionPendiente };
  try {
    const endpoint = pendiente.tipo === 'VENTA'
      ? `/ventas/${pendiente.id}/cancelar`
      : `/cuentas/pagos/${pendiente.id}/cancelar`;
    await api(endpoint, { method: 'POST', body: JSON.stringify(body) });
    cerrarModalCancelacion();
    alert(pendiente.tipo === 'VENTA'
      ? 'Venta cancelada e inventario restaurado'
      : 'Pago cancelado y aplicaciones revertidas');
    if (pendiente.tipo === 'VENTA') {
      await Promise.all([cargarVentas(), cargarProductos(), cargarInventario(), cargarCuentas(), cargarDashboard()]);
    } else {
      if (pendiente.clienteId) await verCuenta(pendiente.clienteId);
      await Promise.all([cargarCuentas(), cargarDashboard()]);
    }
  } catch (error) {
    document.getElementById('passwordAdminCancelacion').value = '';
    alert(error.message);
  } finally {
    boton.disabled = false;
  }
});

document.getElementById('detalleCuenta')?.addEventListener('click', evento => {
  const boton = evento.target.closest('.cancelar-pago');
  if (!boton) return;
  evento.preventDefault();
  evento.stopImmediatePropagation();
  abrirModalCancelacion('PAGO', Number(boton.dataset.id), Number(evento.currentTarget.dataset.clienteId));
}, true);

    async function cancelarVenta(id) {

  try {
    const validacion=await api(`/ventas/${id}/cancelacion-validacion`);
    if(!validacion.puede_cancelar)return alert(validacion.motivo);
    if(validacion.advertencia&&!confirm(`${validacion.advertencia}\n\n¿Deseas continuar con la cancelación?`))return;
  } catch(error) {
    return alert(`No fue posible validar la cancelación: ${error.message}`);
  }

  abrirModalCancelacion('VENTA', id);

}
    async function cargarDashboard(){try{const d=await api('/stats'),metricas=document.getElementById('metricas'),canvas=document.getElementById('graficaSemanal');metricas.innerHTML=[['Ventas hoy',d.ventas_hoy],['Ingresos hoy',dinero.format(d.ingresos_hoy)],['Clientes',d.clientes],['Deuda clientes',dinero.format(d.deuda_total)],['Deuda proveedores',dinero.format(d.deuda_proveedores)]].map(x=>`<div class="card"><h3>${x[0]}</h3><h2>${x[1]}</h2></div>`).join('');const mapa=new Map(d.semanal.map(x=>[String(x.dia).slice(0,10),Number(x.total)])),labels=[],values=[];for(let i=6;i>=0;i--){const f=new Date();f.setHours(0,0,0,0);f.setDate(f.getDate()-i);const k=`${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,'0')}-${String(f.getDate()).padStart(2,'0')}`;labels.push(f.toLocaleDateString('es-MX',{weekday:'short',day:'2-digit'}));values.push(mapa.get(k)||0)}if(grafica)grafica.destroy();grafica=new Chart(canvas,{type:'bar',data:{labels,datasets:[{label:'Ventas',data:values,backgroundColor:'#6f9b85'}]},options:{scales:{y:{beginAtZero:true,ticks:{callback:v=>dinero.format(v)}}}}})}catch(e){alert(e.message)}}
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
  pagoMonto=document.getElementById('pagoMonto'),pagoObservaciones=document.getElementById('pagoObservaciones'),
  confirmarPago=document.getElementById('confirmarPago'),
  rpcInicio=document.getElementById('rpcInicio'),rpcFin=document.getElementById('rpcFin'),
  rpcCliente=document.getElementById('rpcCliente'),rpcProducto=document.getElementById('rpcProducto'),
  rpcPago=document.getElementById('rpcPago'),
  rpcCanceladas=document.getElementById('rpcCanceladas'),productoMasVendido=document.getElementById('productoMasVendido'),
  tablaProductosCliente=document.getElementById('tablaProductosCliente');

// Órdenes de venta
let ordenDetalle=[],ordenActualId=null;
function limpiarEditorOrden(){
  ordenActualId=null;ordenDetalle=[];document.getElementById('editorOrden').reset();
  document.getElementById('ordenEditandoId').value='';document.getElementById('ordenEditorCantidad').value='1';
  document.getElementById('ordenEditorCliente').value='';document.getElementById('resultadosClienteOrden').innerHTML='';
  document.getElementById('ordenEditorProducto').value='';document.getElementById('ordenEditorProductoBuscar').value='';document.getElementById('ordenEditorPrecio').value='';document.getElementById('resultadosProductoOrden').innerHTML='';
  document.getElementById('ordenEditorObservaciones').value='';
  sincronizarCantidadOrden();
  dibujarEditorOrden();
}
function prepararCatalogosOrden(){
  sincronizarCantidadOrden();
}
function sincronizarCantidadOrden(){
  const selector=document.getElementById('ordenEditorProducto'),input=document.getElementById('ordenEditorCantidad');
  const p=productos.find(x=>x.id===Number(selector?.value)),paso=esCaja(p?.unidad)?'0.5':'0.01';
  if(input){input.step=paso;input.min=paso}
}
function dibujarEditorOrden(){
  const tbody=document.getElementById('ordenEditorDetalle');
  tbody.innerHTML=ordenDetalle.length?ordenDetalle.map((x,i)=>{const paso=esCaja(x.unidad)?'0.5':'0.01';return `<tr><td>${esc(x.codigo)}</td><td>${esc(x.nombre)}</td><td><input class="orden-item-cantidad" data-i="${i}" type="number" min="${paso}" step="${paso}" value="${x.cantidad}"></td><td>${esc(x.unidad)}</td><td><input class="orden-item-precio" data-i="${i}" type="number" min="1" step="1" value="${x.precio}"></td><td>${dinero.format(x.cantidad*x.precio)}</td><td><button type="button" class="orden-item-quitar danger" data-i="${i}">Quitar</button></td></tr>`}).join(''):'<tr><td colspan="7">Agrega productos a la orden</td></tr>';
  document.getElementById('ordenEditorTotal').textContent=dinero.format(ordenDetalle.reduce((s,x)=>s+x.cantidad*x.precio,0));
}
async function cargarOrdenes(){
  if(!productos.length)await cargarProductos();
  if(!clientes.length)await cargarClientes();
  prepararCatalogosOrden();
  const q=new URLSearchParams({folio:ordenFolio.value,cliente:ordenCliente.value,fecha:ordenFecha.value,estado:ordenEstado.value});
  try{const data=await api(`/ordenes?${q}`);listaOrdenes.innerHTML=data.length?data.map(o=>`<tr><td>${esc(o.folio)}</td><td>${new Date(o.creada_at).toLocaleString('es-MX')}</td><td>${esc(o.cliente)}</td><td>${esc(o.observaciones||'—')}</td><td>${esc(o.estado)}</td><td>${dinero.format(o.total_estimado)}</td><td>${['BORRADOR','PENDIENTE'].includes(o.estado)?`<button class="orden-abrir" data-id="${o.id}">Abrir / modificar</button>`:''}${o.estado==='PENDIENTE'?`<button class="orden-pos" data-id="${o.id}">Cargar en POS</button>`:''}${['BORRADOR','PENDIENTE'].includes(o.estado)&&usuario.rol==='ADMON_GRAL'?`<button class="orden-cancelar danger" data-id="${o.id}">Cancelar</button>`:''}</td></tr>`).join(''):'<tr><td colspan="7">Sin órdenes</td></tr>'}catch(e){listaOrdenes.innerHTML=`<tr><td colspan="7">${esc(e.message)}</td></tr>`}
}
document.getElementById('filtrosOrdenes')?.addEventListener('submit',e=>{e.preventDefault();cargarOrdenes()});
let temporizadorClienteOrden;
document.getElementById('ordenEditorClienteBuscar')?.addEventListener('input',e=>{document.getElementById('ordenEditorCliente').value='';clearTimeout(temporizadorClienteOrden);temporizadorClienteOrden=setTimeout(()=>{const termino=e.target.value.trim().toLocaleLowerCase('es-MX'),resultados=document.getElementById('resultadosClienteOrden');if(termino.length<1){resultados.innerHTML='';return}const coincidencias=clientes.filter(c=>[c.nombre_razon_social,c.rfc,c.telefono].some(v=>String(v||'').toLocaleLowerCase('es-MX').includes(termino))).slice(0,12);resultados.innerHTML=coincidencias.map(c=>`<button type="button" class="cliente-orden-resultado" data-id="${c.id}">${esc(c.nombre_razon_social)}${c.rfc?` · ${esc(c.rfc)}`:''}${c.telefono?` · ${esc(c.telefono)}`:''}</button>`).join('')||'<p>Sin coincidencias.</p>'},180)});
document.getElementById('resultadosClienteOrden')?.addEventListener('click',e=>{const boton=e.target.closest('.cliente-orden-resultado');if(!boton)return;const cliente=clientes.find(c=>Number(c.id)===Number(boton.dataset.id));document.getElementById('ordenEditorCliente').value=boton.dataset.id;document.getElementById('ordenEditorClienteBuscar').value=cliente?.nombre_razon_social||boton.textContent;document.getElementById('resultadosClienteOrden').innerHTML=''});
document.getElementById('ordenEditorClienteBuscar')?.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const boton=document.querySelector('#resultadosClienteOrden .cliente-orden-resultado');if(!boton)return;e.preventDefault();e.stopPropagation();boton.click();document.getElementById('ordenEditorObservaciones').focus()});
let temporizadorProductoOrden;
document.getElementById('ordenEditorProductoBuscar')?.addEventListener('input',e=>{document.getElementById('ordenEditorProducto').value='';document.getElementById('ordenEditorPrecio').value='';clearTimeout(temporizadorProductoOrden);temporizadorProductoOrden=setTimeout(()=>{const termino=e.target.value.trim().toLocaleLowerCase('es-MX'),resultados=document.getElementById('resultadosProductoOrden');if(termino.length<1){resultados.innerHTML='';return}const coincidencias=productos.filter(p=>[p.codigo,p.nombre].some(v=>String(v||'').toLocaleLowerCase('es-MX').includes(termino))).slice(0,12);resultados.innerHTML=coincidencias.map(p=>`<button type="button" class="producto-orden-resultado" data-id="${p.id}"><strong>${esc(p.codigo||p.id)} · ${esc(p.nombre)}</strong><span>${esc(p.unidad)} · ${dinero.format(p.precio_venta)} · stock ${formatearCantidad(p.stock,p.unidad)}</span></button>`).join('')||'<p>Sin coincidencias.</p>'},180)});
document.getElementById('resultadosProductoOrden')?.addEventListener('click',e=>{const boton=e.target.closest('.producto-orden-resultado');if(!boton)return;const producto=productos.find(p=>Number(p.id)===Number(boton.dataset.id));document.getElementById('ordenEditorProducto').value=boton.dataset.id;document.getElementById('ordenEditorProductoBuscar').value=`${producto.codigo||producto.id} - ${producto.nombre}`;document.getElementById('ordenEditorPrecio').value=Number(producto.precio_venta);document.getElementById('resultadosProductoOrden').innerHTML='';sincronizarCantidadOrden();document.getElementById('ordenEditorCantidad').focus()});
document.getElementById('ordenEditorProductoBuscar')?.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const boton=document.querySelector('#resultadosProductoOrden .producto-orden-resultado');if(!boton)return;e.preventDefault();e.stopPropagation();boton.click()});
document.getElementById('editorOrden')?.addEventListener('submit',e=>{if(Number(document.getElementById('ordenEditorCliente').value)>0)return;e.preventDefault();e.stopImmediatePropagation();alert('Selecciona un cliente de los resultados de búsqueda')},true);
document.getElementById('ordenNueva')?.addEventListener('click',limpiarEditorOrden);
document.getElementById('ordenCerrarEditor')?.addEventListener('click',limpiarEditorOrden);
function agregarProductoOrden(){
  const id=Number(document.getElementById('ordenEditorProducto').value),p=productos.find(x=>x.id===id),cantidadNueva=Number(document.getElementById('ordenEditorCantidad').value),precio=Number(document.getElementById('ordenEditorPrecio').value);
  if(!p||!esCantidadValida(cantidadNueva,p.unidad))return alert(p?mensajeCantidad(p.unidad):'Selecciona un producto');
  if(!Number.isInteger(precio)||precio<=0)return alert('El precio unitario debe ser un entero mayor a cero');
  const existente=ordenDetalle.find(x=>x.producto_id===id);
  if(existente){existente.cantidad+=cantidadNueva;existente.precio=precio}
  else ordenDetalle.push({producto_id:id,codigo:p.codigo||p.id,nombre:p.nombre,unidad:p.unidad,precio,cantidad:cantidadNueva});
  document.getElementById('ordenEditorCantidad').value='1';document.getElementById('ordenEditorProducto').value='';document.getElementById('ordenEditorProductoBuscar').value='';document.getElementById('ordenEditorPrecio').value='';dibujarEditorOrden();document.getElementById('ordenEditorProductoBuscar').focus();
}
document.getElementById('ordenAgregarProducto')?.addEventListener('click',agregarProductoOrden);
document.getElementById('editorOrden')?.addEventListener('keydown',e=>{if(e.key!=='Enter'||!['ordenEditorCantidad','ordenEditorPrecio'].includes(e.target.id))return;e.preventDefault();e.stopPropagation();agregarProductoOrden()});
document.getElementById('ordenEditorDetalle')?.addEventListener('change',e=>{const i=Number(e.target.dataset.i);if(e.target.matches('.orden-item-cantidad')){const n=Number(e.target.value);if(!esCantidadValida(n,ordenDetalle[i].unidad)){alert(mensajeCantidad(ordenDetalle[i].unidad));return dibujarEditorOrden()}ordenDetalle[i].cantidad=n}if(e.target.matches('.orden-item-precio')){const precio=Number(e.target.value);if(!Number.isInteger(precio)||precio<=0){alert('El precio unitario debe ser un entero mayor a cero');return dibujarEditorOrden()}ordenDetalle[i].precio=precio}dibujarEditorOrden()});
document.getElementById('ordenEditorDetalle')?.addEventListener('click',e=>{const b=e.target.closest('.orden-item-quitar');if(b){ordenDetalle.splice(Number(b.dataset.i),1);dibujarEditorOrden()}});
document.getElementById('editorOrden')?.addEventListener('submit',async e=>{e.preventDefault();if(!ordenDetalle.length)return alert('Agrega productos a la orden');const invalido=ordenDetalle.find(x=>!esCantidadValida(x.cantidad,x.unidad)||!Number.isInteger(Number(x.precio))||Number(x.precio)<=0);if(invalido)return alert(!esCantidadValida(invalido.cantidad,invalido.unidad)?mensajeCantidad(invalido.unidad):'Todos los precios deben ser enteros mayores a cero');const id=ordenActualId,endpoint=id?`/ordenes/${id}`:'/ordenes';try{await api(endpoint,{method:id?'PUT':'POST',body:JSON.stringify({cliente_id:Number(document.getElementById('ordenEditorCliente').value),estado:'PENDIENTE',observaciones:document.getElementById('ordenEditorObservaciones').value,productos:ordenDetalle.map(x=>({producto_id:x.producto_id,cantidad:x.cantidad,precio_unitario:x.precio}))})});alert(id?'Orden actualizada':'Orden guardada');limpiarEditorOrden();await cargarOrdenes()}catch(err){alert(err.message)}});
async function abrirOrdenEditor(id){const d=await api(`/ordenes/${id}`);if(!['BORRADOR','PENDIENTE'].includes(d.orden.estado))throw new Error('La orden ya no se puede modificar');ordenActualId=id;document.getElementById('ordenEditandoId').value=id;document.getElementById('ordenEditorCliente').value=d.orden.cliente_id;document.getElementById('ordenEditorClienteBuscar').value=d.orden.cliente||clientes.find(c=>Number(c.id)===Number(d.orden.cliente_id))?.nombre_razon_social||'';document.getElementById('resultadosClienteOrden').innerHTML='';document.getElementById('ordenEditorObservaciones').value=d.orden.observaciones||'';ordenDetalle=d.productos.map(x=>({producto_id:x.producto_id,codigo:x.codigo,nombre:x.nombre,unidad:x.unidad,precio:Number(x.precio_estimado),cantidad:Number(x.cantidad)}));dibujarEditorOrden();document.getElementById('editorOrden').scrollIntoView({behavior:'smooth'})}
async function cargarOrdenEnPos(id){const d=await api(`/ordenes/${id}`);if(d.orden.estado!=='PENDIENTE')throw new Error('La orden ya no está pendiente');await cargarProductos();carrito=d.productos.map(x=>({producto_id:x.producto_id,codigo:x.codigo,nombre:x.nombre,cantidad:Number(x.cantidad),unidad:x.unidad,precio:Number(x.precio_estimado),stock:Number(x.stock)}));clienteVenta.value=d.orden.cliente_id;document.getElementById('clienteVentaBuscar').value=d.orden.cliente;ordenCargada={id:d.orden.id,folio:d.orden.folio};const cambios=d.productos.filter(x=>x.precio_modificado).map(x=>x.nombre);alert(`Orden ${d.orden.folio} cargada en POS.${cambios.length?' Precios conservados de la orden: '+cambios.join(', '):''}`);dibujarCarrito();mostrar('pos')}
document.getElementById('listaOrdenes')?.addEventListener('click',async e=>{const abrir=e.target.closest('.orden-abrir'),pos=e.target.closest('.orden-pos'),x=e.target.closest('.orden-cancelar');try{if(abrir)await abrirOrdenEditor(Number(abrir.dataset.id));if(pos)await cargarOrdenEnPos(Number(pos.dataset.id));if(x&&confirm('¿Cancelar esta orden?')){await api(`/ordenes/${x.dataset.id}/cancelar`,{method:'POST'});cargarOrdenes()}}catch(err){alert(err.message)}});

// Directorio y estado de cuenta
let temporizadorCliente;
document.getElementById('buscarCliente')?.addEventListener('input',e=>{clearTimeout(temporizadorCliente);temporizadorCliente=setTimeout(()=>cargarClientes(e.target.value),250)});
document.getElementById('indiceClientes')?.addEventListener('click',e=>{const b=e.target.closest('[data-letra]');document.getElementById(`clientes-${b?.dataset.letra}`)?.focus({preventScroll:false})});
document.addEventListener('keydown',e=>{if(document.getElementById('clientes')?.classList.contains('activa')&&/^[a-z]$/i.test(e.key)&&!['INPUT','TEXTAREA'].includes(e.target.tagName))document.getElementById(`clientes-${e.key.toUpperCase()}`)?.focus()});
async function verResumenCliente(id){try{const d=await api(`/clientes/${id}/resumen`),r=document.getElementById('resumenCliente');r.classList.remove('hidden');r.innerHTML=`<div class="ventas-titulo"><h2>${esc(d.cliente.nombre_razon_social)}</h2><button type="button" id="cerrarResumenCliente">Cerrar</button></div><p>Saldo pendiente: <strong class="money">${dinero.format(d.saldo_total)}</strong></p><h3>Estado de cuenta</h3><div class="tabla-contenedor"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Folio</th><th>Cargo</th><th>Abono</th><th>Saldo</th><th>Descripción</th><th>Usuario</th></tr></thead><tbody>${d.movimientos.length?d.movimientos.map(m=>`<tr><td>${new Date(m.fecha).toLocaleString('es-MX')}</td><td>${esc(m.concepto)}</td><td>${esc(m.folio)}</td><td>${dinero.format(m.cargo)}</td><td>${dinero.format(m.credito)}</td><td>${dinero.format(m.saldo_resultante)}</td><td>${esc(m.descripcion||'')}</td><td>${esc(m.usuario||'')}</td></tr>`).join(''):'<tr><td colspan="8">Sin movimientos</td></tr>'}</tbody></table></div><h3>Órdenes pendientes</h3><p>${d.ordenes.map(o=>esc(o.folio)).join(', ')||'Ninguna'}</p><h3>Últimas ventas</h3>${d.ventas.map(v=>`<div class="row"><span>Venta ${v.id} · ${new Date(v.fecha).toLocaleDateString('es-MX')}</span><strong>${dinero.format(v.total)}</strong></div>`).join('')||'<p>Sin ventas</p>'}`;r.scrollIntoView({behavior:'smooth',block:'start'});r.querySelector('#cerrarResumenCliente').addEventListener('click',()=>r.classList.add('hidden'))}catch(e){alert(`No fue posible abrir el estado de cuenta: ${e.message}`)}}

// Aplicación avanzada de pagos
const modalPago=document.getElementById('modalPago');
const gestorPagoCliente=crearGestorMetodosPago('filasPagoCliente','saldoPagoCliente','agregarMetodoCliente');
document.getElementById('abrirPago')?.addEventListener('click',()=>{modalPago.classList.remove('hidden');pagoFecha.value=new Date().toISOString().slice(0,10);buscarClientePago.focus()});
document.getElementById('cerrarPago')?.addEventListener('click',()=>modalPago.classList.add('hidden'));
async function abrirPagoParaCliente(id,nombre=''){
  modalPago.classList.remove('hidden');
  pagoFecha.value=new Date().toISOString().slice(0,10);
  const cliente=clientes.find(c=>Number(c.id)===Number(id));
  const notas=await api(`/cuentas/cliente/${id}/pendientes`);
  pagoClienteId.value=id;
  pagoClienteNombre.textContent=nombre||cliente?.nombre_razon_social||`Cliente ${id}`;
  gestorPagoCliente.reiniciar(0);
  notasPago.innerHTML=notas.length?`<div class="tabla-contenedor"><table><thead><tr><th></th><th>Folio</th><th>Fecha</th><th>Total original</th><th>Saldo</th><th>Monto a aplicar</th></tr></thead><tbody>${notas.map(n=>`<tr><td><input class="nota-pago" type="checkbox" value="${n.id}"></td><td>${esc(n.folio)}</td><td>${new Date(n.fecha).toLocaleDateString('es-MX')}</td><td>${dinero.format(n.total_deuda)}</td><td>${dinero.format(n.saldo_pendiente)}</td><td><input class="aplicacion-manual" data-id="${n.id}" data-saldo="${n.saldo_pendiente}" type="number" min="0.01" max="${n.saldo_pendiente}" step="0.01" disabled></td></tr>`).join('')}</tbody></table></div>`:'<p>Sin notas pendientes</p>';
  formPago.classList.remove('hidden');
}
let temporizadorPago;
document.getElementById('buscarClientePago')?.addEventListener('input',e=>{clearTimeout(temporizadorPago);temporizadorPago=setTimeout(async()=>{try{const d=await api(`/cuentas/clientes/buscar?q=${encodeURIComponent(e.target.value)}`);resultadosClientePago.innerHTML=d.map(c=>`<button class="cliente-pago" data-id="${c.id}" data-nombre="${esc(c.nombre_razon_social)}">${esc(c.nombre_razon_social)} · ${dinero.format(c.saldo_total)}</button>`).join('')}catch(err){alert(err.message)}},250)});
document.getElementById('buscarClientePago')?.addEventListener('keydown',async e=>{if(e.key!=='Enter')return;e.preventDefault();clearTimeout(temporizadorPago);try{const d=await api(`/cuentas/clientes/buscar?q=${encodeURIComponent(e.target.value)}`),cliente=d[0];if(cliente)await abrirPagoParaCliente(Number(cliente.id),cliente.nombre_razon_social)}catch(err){alert(err.message)}});
document.getElementById('resultadosClientePago')?.addEventListener('click',async e=>{const b=e.target.closest('.cliente-pago');if(!b)return;try{await abrirPagoParaCliente(Number(b.dataset.id),b.dataset.nombre)}catch(err){alert(err.message)}});
document.getElementById('notasPago')?.addEventListener('change',e=>{const check=e.target.closest('.nota-pago');if(check){const input=document.querySelector(`.aplicacion-manual[data-id="${check.value}"]`);input.disabled=!check.checked;input.value=check.checked?input.dataset.saldo:''}if(!check&&!e.target.matches('.aplicacion-manual'))return;const seleccionadas=[...document.querySelectorAll('.nota-pago:checked')];pagoMonto.value=seleccionadas.reduce((s,c)=>s+Number(document.querySelector(`.aplicacion-manual[data-id="${c.value}"]`).value||0),0).toFixed(2);gestorPagoCliente.establecerTotal(Number(pagoMonto.value))});
document.getElementById('formPago')?.addEventListener('submit',async e=>{e.preventDefault();const checks=[...document.querySelectorAll('.nota-pago:checked')],aplicaciones=checks.map(c=>{const input=document.querySelector(`.aplicacion-manual[data-id="${c.value}"]`);return{cuenta_id:Number(c.value),monto:Number(input.value),saldo:Number(input.dataset.saldo)}});if(!aplicaciones.length)return alert('Selecciona al menos una nota');if(aplicaciones.some(a=>!Number.isFinite(a.monto)||a.monto<=0||a.monto>a.saldo))return alert('Revisa los montos aplicados; deben ser positivos y no superar el saldo');const clienteId=Number(pagoClienteId.value),monto=Number(pagoMonto.value),suma=aplicaciones.reduce((s,a)=>s+a.monto,0);if(!Number.isInteger(clienteId)||clienteId<=0)return alert('Vuelve a seleccionar el cliente');if(!Number.isFinite(monto)||monto<=0)return alert('El monto recibido debe ser mayor que cero');if(Math.abs(suma-monto)>0.005)return alert('La suma aplicada debe coincidir con el monto recibido');let metodos;try{metodos=gestorPagoCliente.obtener()}catch(error){return alert(error.message)}const resumen=`Cliente: ${pagoClienteNombre.textContent}\nMonto: ${dinero.format(monto)}\nMétodos: ${metodos.map(x=>`${x.metodo_pago} ${dinero.format(x.monto)}`).join(' + ')}\nNotas: ${aplicaciones.length}`;if(!confirm(resumen))return;confirmarPago.disabled=true;try{const metodoTradicional=metodos.length===1?metodos[0]:null,payload={cliente_id:clienteId,monto_recibido:monto,cuenta_ids:aplicaciones.map(a=>a.cuenta_id),modo:'MANUAL',aplicaciones,metodos_pago:metodos,metodo_pago:metodoTradicional?.metodo_pago||'',referencia:metodoTradicional?.referencia||null,observaciones:pagoObservaciones.value,fecha:pagoFecha.value};const r=await api('/cuentas/pagos',{method:'POST',body:JSON.stringify(payload)});alert(`Pago ${r.pago_id} aplicado correctamente`);modalPago.classList.add('hidden');e.target.reset();gestorPagoCliente.reiniciar(0);cargarCuentas()}catch(err){alert(err.message)}finally{confirmarPago.disabled=false}});

// Reporte de productos por cliente
function parametrosReporte(){return new URLSearchParams({fecha_inicio:rpcInicio.value,fecha_fin:rpcFin.value,cliente_id:rpcCliente.value,producto_id:rpcProducto.value,tipo_pago:rpcPago.value,incluir_canceladas:rpcCanceladas.checked?'1':'0'})}
async function cargarReporteProductos(){if(usuario?.rol!=='ADMON_GRAL')return;try{rpcProducto.innerHTML='<option value="">Todos los productos</option>'+productos.map(p=>`<option value="${p.id}">${esc(p.codigo)} - ${esc(p.nombre)}</option>`).join('');const q=parametrosReporte(),[r,top]=await Promise.all([api(`/stats/productos-por-cliente?${q}`),api(`/stats/producto-mas-vendido?${q}`)]);reporteProductosActual=r.datos;productoMasVendido.innerHTML=top.producto?`<div class="card"><h4>Producto más vendido</h4><strong>${esc(top.producto.codigo)} · ${esc(top.producto.nombre)} · ${esc(top.producto.unidad)}</strong><p>${cantidad(top.producto.cantidad_total)} · ${dinero.format(top.producto.ingresos_generados)}</p></div>`:'<p>Sin ventas en el periodo.</p>';const totalUnidades=r.totales_por_unidad.map(x=>`${cantidad(x.cantidad)} ${esc(x.unidad)}`).join(' + ')||'0';tablaProductosCliente.innerHTML=`<table><thead><tr><th>Cliente</th><th>Código</th><th>Producto</th><th>Unidad</th><th>Cantidad</th><th>Ingresos</th></tr></thead><tbody>${r.datos.map(x=>`<tr><td>${esc(x.cliente)}</td><td>${esc(x.codigo)}</td><td>${esc(x.producto)}</td><td>${esc(x.unidad)}</td><td>${cantidad(x.cantidad_vendida)}</td><td>${dinero.format(x.ingresos_generados)}</td></tr>`).join('')}</tbody><tfoot><tr><th colspan="4">Totales por unidad</th><th>${totalUnidades}</th><th>${dinero.format(r.total_ingresos)}</th></tr></tfoot></table>`;if(graficaProductos)graficaProductos.destroy();graficaProductos=new Chart(document.getElementById('graficaProductos'),{type:'bar',data:{labels:r.datos.slice(0,10).map(x=>x.producto),datasets:[{label:'Cantidad vendida',data:r.datos.slice(0,10).map(x=>x.cantidad_vendida),backgroundColor:'#6f9b85'}]},options:{indexAxis:'y'}})}catch(e){console.error(e)}}
async function cargarGraficasHistoricas(){
  if(usuario?.rol!=='ADMON_GRAL')return;
  try{
    const q=parametrosReporte(),[global,compras]=await Promise.all([
      api(`/stats/productos-global?${q}`),api(`/stats/clientes-compras?${q}`)
    ]);
    if(graficaProductos)graficaProductos.destroy();
    graficaProductos=new Chart(document.getElementById('graficaProductos'),{
      type:'bar',
      data:{labels:global.datos.map(x=>`${x.producto} (${x.unidad})`),datasets:[{label:'Cantidad vendida',data:global.datos.map(x=>x.cantidad_vendida),backgroundColor:'#6f9b85'}]},
      options:{indexAxis:'y',plugins:{tooltip:{callbacks:{afterLabel:c=>`Ingresos: ${dinero.format(global.datos[c.dataIndex].ingresos_generados)}`}}}}
    });
    if(graficaClientes)graficaClientes.destroy();
    graficaClientes=new Chart(document.getElementById('graficaClientes'),{
      type:'bar',
      data:{labels:compras.datos.map(x=>x.cliente),datasets:[{label:'Total comprado',data:compras.datos.map(x=>x.total_comprado),backgroundColor:'#2563a8'}]},
      options:{indexAxis:'y',plugins:{tooltip:{callbacks:{label:c=>dinero.format(c.raw),afterLabel:c=>{const x=compras.datos[c.dataIndex];return `${x.numero_ventas} venta(s) · Última: ${new Date(x.ultima_compra).toLocaleDateString('es-MX')}`}}}}}
    });
  }catch(e){console.error(e);alert(e.message)}
}
document.getElementById('filtrosProductosCliente')?.addEventListener('submit',async e=>{e.preventDefault();const productoSeleccionadoReporte=rpcProducto.value;await cargarReporteProductos();rpcProducto.value=productoSeleccionadoReporte;await cargarGraficasHistoricas()});
document.getElementById('exportarProductosCsv')?.addEventListener('click',()=>{const filas=[['Cliente','Código','Producto','Unidad','Cantidad vendida','Ingresos'],...reporteProductosActual.map(x=>[x.cliente,x.codigo,x.producto,x.unidad,x.cantidad_vendida,x.ingresos_generados])],csv=filas.map(f=>f.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\r\n'),a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv'}));a.download='productos-por-cliente.csv';a.click();URL.revokeObjectURL(a.href)});

// Respaldo y traslado de datos
const formatoBytes=bytes=>{const n=Number(bytes);if(!Number.isFinite(n)||n<0)return '—';if(n<1024)return `${n} B`;const unidades=['KB','MB','GB'];let valor=n/1024,indice=0;while(valor>=1024&&indice<unidades.length-1){valor/=1024;indice++}return `${valor.toLocaleString('es-MX',{maximumFractionDigits:2})} ${unidades[indice]}`};
const fechaLegible=valor=>valor?new Date(valor).toLocaleString('es-MX'):'—';
const abreviarId=valor=>valor?`${String(valor).slice(0,8)}…${String(valor).slice(-4)}`:'—';

function mensajeTecnicoAmigable(error){
  const texto=String(error?.message||error||'No fue posible completar la operación');
  if(/analysis|análisis.*(venció|expir)|token/i.test(texto))return 'El análisis expiró. Analice nuevamente el archivo antes de restaurar.';
  if(/mariadb-dump|ENOENT|herramienta de respaldo/i.test(texto))return 'No se encontró la herramienta de respaldo de MariaDB.';
  if(/mariadb|base de datos|ECONN|acceso denegado/i.test(texto))return 'No fue posible acceder a la base de datos.';
  if(/hash|dañad|corrupt|ZIP|manifiesto|archivo.*válido/i.test(texto))return 'El archivo seleccionado no corresponde a un respaldo válido o está dañado.';
  if(/tamaño|excede|LIMIT_FILE_SIZE/i.test(texto))return 'El archivo supera el tamaño máximo permitido.';
  if(/conectar con el servidor|Failed to fetch|NetworkError/i.test(texto))return 'No fue posible conectar con el servidor.';
  return texto.replace(/\b(spawn|ENOENT|ER_[A-Z_]+)\b[^\n]*/g,'No fue posible completar la operación').slice(0,300);
}

function mostrarMensajeRespaldo(texto,tipo='exito'){
  const contenedor=document.getElementById('mensajeRespaldos');
  if(!contenedor)return;
  contenedor.textContent=texto;
  contenedor.className=`mensaje-respaldo ${tipo}`;
  contenedor.classList.remove('hidden');
}
function limpiarMensajeRespaldo(){document.getElementById('mensajeRespaldos')?.classList.add('hidden')}

const selectorEscrituras=[
  '#pos #agregarCaptura','#pos #vender','#pos .boton-eliminar-producto','#pos .cantidad-carrito',
  '#editorOrden input','#editorOrden select','#editorOrden textarea','#editorOrden button:not(#ordenCerrarEditor)',
  '#clienteForm input','#clienteForm textarea','#clienteForm button[type="submit"]',
  '#cuentas #abrirPago','#modalPago #confirmarPago','#inventario #movimientoForm input',
  '#inventario #movimientoForm select','#inventario #movimientoForm button',
  '#inventario #abrirPagoProveedor','#formPagoProveedor input','#formPagoProveedor select','#formPagoProveedor textarea',
  '#formPagoProveedor button[type="submit"]','#formCancelarCompra textarea','#formCancelarCompra button[type="submit"]',
  '#formCancelarPagoProveedor textarea','#formCancelarPagoProveedor button[type="submit"]',
  '.editar-cliente','.eliminar-cliente','.orden-cancelar','.orden-pos','.cancelar-pago','.aplicar-pago-cliente'
].join(',');
const formulariosEscritura=new Set(['editorOrden','clienteForm','formPago','movimientoForm','formPagoProveedor','formCancelarCompra','formCancelarPagoProveedor']);

function aplicarBloqueoVisualEntregada(entregada){
  document.body.classList.toggle('instancia-entregada',entregada);
  document.getElementById('barraInstanciaEntregada')?.classList.toggle('hidden',!entregada);
  document.querySelectorAll(selectorEscrituras).forEach(control=>{
    if(entregada&&!control.disabled){control.disabled=true;control.dataset.disabledEntregada='1'}
    else if(!entregada&&control.dataset.disabledEntregada==='1'){control.disabled=false;delete control.dataset.disabledEntregada}
  });
}

function aplicarEstadoInstancia(instancia){
  if(!instancia)return;
  estadoInstanciaPOS=instancia;
  const estado=instancia.restauracion_en_progreso?'RESTAURACION_EN_PROGRESO':instancia.estado||'ACTIVA';
  const chip=document.getElementById('estadoInstancia');
  if(chip){chip.textContent=estado.replaceAll('_',' ');chip.className=`estado-chip ${estado==='ACTIVA'?'ok':estado==='ENTREGADA'?'error':'warning'}`}
  const asignar=(id,valor)=>{const nodo=document.getElementById(id);if(nodo)nodo.textContent=valor};
  asignar('hostnameInstancia',instancia.hostname||'—');
  asignar('instanceIdInstancia',abreviarId(instancia.instance_id));
  asignar('ultimoGeneradoInstancia',fechaLegible(instancia.ultimo_respaldo_generado));
  asignar('ultimoRestauradoInstancia',fechaLegible(instancia.ultimo_respaldo_restaurado));
  const entregada=estado==='ENTREGADA'||Number(instancia.bloqueada)===1;
  aplicarBloqueoVisualEntregada(entregada);
  document.getElementById('panelReactivarInstancia')?.classList.toggle('hidden',!entregada);
  const generar=document.getElementById('generarRespaldo');
  if(generar)generar.disabled=estado==='RESTAURACION_EN_PROGRESO'||reinicioRespaldoPendiente;
}

async function cargarEstadoRespaldos({silencioso=false}={}){
  if(!usuario)return;
  try{const data=await api('/backups/status');aplicarEstadoInstancia(data.instance);return data.instance}
  catch(error){if(!silencioso)mostrarMensajeRespaldo(mensajeTecnicoAmigable(error),'error');return null}
}

async function cargarHistorialRespaldos(){
  if(usuario?.rol!=='ADMON_GRAL')return;
  const cuerpo=document.getElementById('historialRespaldos');if(!cuerpo)return;
  cuerpo.innerHTML='<tr><td colspan="6">Consultando historial…</td></tr>';
  try{
    const data=await api('/backups/history?limit=100');
    cuerpo.innerHTML=data.history.length?data.history.map(item=>`<tr><td>${esc(fechaLegible(item.creado_en))}</td><td>${esc(item.accion||'—')}</td><td>${esc(item.nombre_archivo||'—')}</td><td>${esc(item.hostname||'—')}</td><td>${esc(item.username||'—')}</td><td><span class="resultado-chip ${item.resultado==='EXITOSO'?'ok':item.resultado==='RECUPERADO'?'warning':'error'}">${esc(item.resultado||'—')}</span></td></tr>`).join(''):'<tr><td colspan="6">Sin operaciones registradas.</td></tr>';
  }catch(error){cuerpo.innerHTML=`<tr><td colspan="6">${esc(mensajeTecnicoAmigable(error))}</td></tr>`}
}

function nombreDescarga(contentDisposition){
  if(!contentDisposition)return `POS_Aguacates_${new Date().toISOString().slice(0,19).replaceAll(':','-')}.zip`;
  const utf=contentDisposition.match(/filename\*=UTF-8''([^;]+)/i),simple=contentDisposition.match(/filename="?([^";]+)"?/i);
  try{return decodeURIComponent((utf?.[1]||simple?.[1]||'').trim())||'POS_Aguacates.zip'}catch{return simple?.[1]||'POS_Aguacates.zip'}
}

async function solicitarDescargaRespaldo(){
  let response;
  try{response=await fetch(`${API}/backups/export`,{method:'POST',headers:{Authorization:`Bearer ${token}`}})}
  catch{throw new Error('No fue posible conectar con el servidor')}
  if(response.status===401){cerrarSesion();throw new Error('Tu sesión expiró')}
  if(!response.ok){
    const tipo=response.headers.get('content-type')||'',data=tipo.includes('json')?await response.json().catch(()=>({})):await response.text();
    throw new Error((typeof data==='object'?data.error:data)||'No fue posible generar el respaldo');
  }
  return {blob:await response.blob(),nombre:nombreDescarga(response.headers.get('content-disposition')),backupId:response.headers.get('x-backup-id')};
}

document.getElementById('generarRespaldo')?.addEventListener('click',async()=>{
  limpiarMensajeRespaldo();
  const boton=document.getElementById('generarRespaldo'),progreso=document.getElementById('progresoExportacion');
  boton.disabled=true;progreso.classList.remove('hidden');
  try{
    const descarga=await solicitarDescargaRespaldo();
    if(!descarga.backupId)throw new Error('El servidor no devolvió el identificador del respaldo');
    const url=URL.createObjectURL(descarga.blob),enlace=document.createElement('a');
    enlace.href=url;enlace.download=descarga.nombre;document.body.appendChild(enlace);enlace.click();enlace.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    backupIdDescargado=descarga.backupId;
    document.getElementById('nombreExportacion').textContent=descarga.nombre;
    document.getElementById('fechaExportacion').textContent=fechaLegible(new Date());
    document.getElementById('tamanoExportacion').textContent=formatoBytes(descarga.blob.size);
    document.getElementById('datosExportacion').classList.remove('hidden');
    document.getElementById('abrirConfirmacionEntrega').classList.remove('hidden');
    mostrarMensajeRespaldo('Respaldo generado. En la ventana de guardado elija la memoria USB. La computadora todavía sigue ACTIVA.','exito');
    await Promise.all([cargarEstadoRespaldos({silencioso:true}),cargarHistorialRespaldos()]);
  }catch(error){mostrarMensajeRespaldo(mensajeTecnicoAmigable(error),'error')}
  finally{progreso.classList.add('hidden');boton.disabled=reinicioRespaldoPendiente}
});

const modalEntrega=document.getElementById('modalConfirmarEntrega');
function cerrarModalEntrega(){modalEntrega?.classList.add('hidden');document.getElementById('passwordEntrega').value='';document.getElementById('confirmarEntrega').checked=false;document.getElementById('marcarEntregada').disabled=true}
document.getElementById('abrirConfirmacionEntrega')?.addEventListener('click',()=>{if(!backupIdDescargado)return mostrarMensajeRespaldo('Primero genere y descargue un respaldo.','advertencia');modalEntrega.classList.remove('hidden');document.getElementById('passwordEntrega').focus()});
document.getElementById('cerrarConfirmacionEntrega')?.addEventListener('click',cerrarModalEntrega);
modalEntrega?.addEventListener('click',e=>{if(e.target===modalEntrega)cerrarModalEntrega()});
function validarEntrega(){document.getElementById('marcarEntregada').disabled=!(document.getElementById('confirmarEntrega').checked&&document.getElementById('passwordEntrega').value)}
document.getElementById('confirmarEntrega')?.addEventListener('change',validarEntrega);
document.getElementById('passwordEntrega')?.addEventListener('input',validarEntrega);
document.getElementById('marcarEntregada')?.addEventListener('click',async()=>{
  const boton=document.getElementById('marcarEntregada');boton.disabled=true;
  try{
    await api('/backups/mark-transferred',{method:'POST',body:JSON.stringify({backupId:backupIdDescargado,password_admin:document.getElementById('passwordEntrega').value})});
    cerrarModalEntrega();document.getElementById('abrirConfirmacionEntrega').classList.add('hidden');
    mostrarMensajeRespaldo('La computadora quedó ENTREGADA. Ya no se pueden registrar cambios.','advertencia');
    await Promise.all([cargarEstadoRespaldos(),cargarHistorialRespaldos()]);
  }catch(error){mostrarMensajeRespaldo(mensajeTecnicoAmigable(error),'error');validarEntrega()}
});

function carritoImpideRestauracion(){
  if(!carrito.length)return false;
  mostrarMensajeRespaldo('Debe finalizar o vaciar la venta actual antes de restaurar un respaldo.','error');return true;
}
function reiniciarAnalisisRespaldo(){
  analisisRespaldoActual=null;document.getElementById('resultadoAnalisis')?.classList.add('hidden');
  document.getElementById('textoConfirmarRestauracion').value='';document.getElementById('passwordRestauracion').value='';
  document.getElementById('confirmarRespaldoAntiguo').checked=false;document.getElementById('restaurarRespaldo').disabled=true;
}
function seleccionarArchivoRespaldo(file){
  reiniciarAnalisisRespaldo();
  if(!file){archivoRespaldoSeleccionado=null;document.getElementById('datosArchivoRespaldo').textContent='Ningún archivo seleccionado.';document.getElementById('analizarRespaldo').disabled=true;return}
  const ext=file.name.toLowerCase().split('.').pop();
  if(!['zip','sql'].includes(ext)){archivoRespaldoSeleccionado=null;document.getElementById('analizarRespaldo').disabled=true;return mostrarMensajeRespaldo('Seleccione un archivo ZIP o SQL generado para POS Aguacates.','error')}
  archivoRespaldoSeleccionado=file;document.getElementById('datosArchivoRespaldo').textContent=`${file.name} · ${formatoBytes(file.size)}`;
  document.getElementById('analizarRespaldo').disabled=false;limpiarMensajeRespaldo();
}

const zonaArchivo=document.getElementById('zonaArchivoRespaldo'),inputArchivo=document.getElementById('archivoRespaldo');
zonaArchivo?.addEventListener('click',()=>inputArchivo.click());
zonaArchivo?.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();inputArchivo.click()}});
inputArchivo?.addEventListener('change',()=>seleccionarArchivoRespaldo(inputArchivo.files[0]));
['dragenter','dragover'].forEach(tipo=>zonaArchivo?.addEventListener(tipo,e=>{e.preventDefault();zonaArchivo.classList.add('arrastrando')}));
['dragleave','drop'].forEach(tipo=>zonaArchivo?.addEventListener(tipo,e=>{e.preventDefault();zonaArchivo.classList.remove('arrastrando');if(tipo==='drop')seleccionarArchivoRespaldo(e.dataTransfer.files[0])}));

function dibujarAnalisis(data){
  analisisRespaldoActual={token:data.analysisToken,comparison:data.comparison,backup:data.backup};
  const backup=data.backup||{},comparison=data.comparison||{};
  document.getElementById('analisisFecha').textContent=fechaLegible(backup.createdAt);
  document.getElementById('analisisEquipo').textContent=backup.hostname||'Metadata no disponible';
  document.getElementById('analisisVersion').textContent=backup.appVersion||backup.schemaVersion||'No verificada';
  document.getElementById('analisisTamano').textContent=formatoBytes(backup.sqlSize);
  document.getElementById('analisisUltimaVenta').textContent=backup.lastKnownSaleId?`Venta #${backup.lastKnownSaleId}${backup.lastKnownSaleAt?` · ${fechaLegible(backup.lastKnownSaleAt)}`:''}`:'No disponible';
  const chip=document.getElementById('analisisComparacion');chip.textContent=comparison.label||comparison.status||'NO SE PUEDE DETERMINAR';chip.className=`estado-chip ${comparison.status==='NEWER'?'ok':comparison.status==='OLDER'?'error':'warning'}`;
  document.getElementById('advertenciasAnalisis').innerHTML=(comparison.warnings||[]).map(x=>`<div class="mensaje-respaldo advertencia">${esc(x)}</div>`).join('');
  document.getElementById('grupoConfirmarAntiguo').classList.toggle('hidden',comparison.status!=='OLDER');
  document.getElementById('resultadoAnalisis').classList.remove('hidden');validarConfirmacionRestauracion();
}

document.getElementById('analizarRespaldo')?.addEventListener('click',async()=>{
  if(carritoImpideRestauracion()||!archivoRespaldoSeleccionado)return;
  const boton=document.getElementById('analizarRespaldo'),progreso=document.getElementById('progresoAnalisis');
  boton.disabled=true;progreso.classList.remove('hidden');reiniciarAnalisisRespaldo();
  try{
    const form=new FormData();form.append('backup',archivoRespaldoSeleccionado);
    const data=await api('/backups/analyze',{method:'POST',body:form});dibujarAnalisis(data);
    mostrarMensajeRespaldo('El respaldo fue analizado. Revise cuidadosamente la comparación antes de continuar.','exito');
    await cargarHistorialRespaldos();
  }catch(error){mostrarMensajeRespaldo(mensajeTecnicoAmigable(error),'error')}
  finally{progreso.classList.add('hidden');boton.disabled=!archivoRespaldoSeleccionado}
});

function validarConfirmacionRestauracion(){
  const antigua=analisisRespaldoActual?.comparison?.status==='OLDER';
  const valido=analisisRespaldoActual?.token&&document.getElementById('textoConfirmarRestauracion').value.trim()==='RESTAURAR'&&document.getElementById('passwordRestauracion').value&&(!antigua||document.getElementById('confirmarRespaldoAntiguo').checked)&&!reinicioRespaldoPendiente;
  document.getElementById('restaurarRespaldo').disabled=!valido;
}
['textoConfirmarRestauracion','passwordRestauracion'].forEach(id=>document.getElementById(id)?.addEventListener('input',validarConfirmacionRestauracion));
document.getElementById('confirmarRespaldoAntiguo')?.addEventListener('change',validarConfirmacionRestauracion);
document.getElementById('restaurarRespaldo')?.addEventListener('click',async()=>{
  if(carritoImpideRestauracion()||!analisisRespaldoActual?.token)return;
  const boton=document.getElementById('restaurarRespaldo');boton.disabled=true;
  mostrarMensajeRespaldo('Creando el respaldo de emergencia y restaurando. No cierre esta ventana.','proceso');
  const tokenUsado=analisisRespaldoActual.token;analisisRespaldoActual.token=null;
  try{
    const data=await api('/backups/restore',{method:'POST',body:JSON.stringify({analysisToken:tokenUsado,confirmacion:document.getElementById('textoConfirmarRestauracion').value.trim(),password_admin:document.getElementById('passwordRestauracion').value,confirmarAntiguo:document.getElementById('confirmarRespaldoAntiguo').checked})});
    reinicioRespaldoPendiente=Boolean(data.restartRequired);archivoRespaldoSeleccionado=null;inputArchivo.value='';reiniciarAnalisisRespaldo();
    document.getElementById('datosArchivoRespaldo').textContent='Ningún archivo seleccionado.';document.getElementById('analizarRespaldo').disabled=true;
    mostrarMensajeRespaldo('La restauración fue completada correctamente.','exito');
    document.getElementById('avisoReinicioRespaldo').classList.toggle('hidden',!reinicioRespaldoPendiente);
    document.getElementById('respaldos').classList.toggle('restauracion-bloqueada',reinicioRespaldoPendiente);
    document.body.classList.toggle('reinicio-pendiente',reinicioRespaldoPendiente);
    await cargarHistorialRespaldos();
  }catch(error){
    const mensaje=mensajeTecnicoAmigable(error);reiniciarAnalisisRespaldo();
    mostrarMensajeRespaldo(`${mensaje} Por seguridad, analice nuevamente el archivo antes de reintentar.`,'error');
  }finally{validarConfirmacionRestauracion()}
});

document.getElementById('comprobarSistemaRespaldo')?.addEventListener('click',async()=>{
  const boton=document.getElementById('comprobarSistemaRespaldo');boton.disabled=true;
  try{
    const healthResponse=await fetch('/health',{cache:'no-store'}),health=await healthResponse.json().catch(()=>({}));
    if(!healthResponse.ok||!health.ok)throw new Error('El sistema todavía no está disponible');
    const instancia=await cargarEstadoRespaldos();if(!instancia)throw new Error('No fue posible comprobar el estado de esta computadora');
    reinicioRespaldoPendiente=false;document.getElementById('avisoReinicioRespaldo').classList.add('hidden');document.getElementById('respaldos').classList.remove('restauracion-bloqueada');document.body.classList.remove('reinicio-pendiente');
    aplicarEstadoInstancia(instancia);mostrarMensajeRespaldo('El sistema y la base de datos respondieron correctamente.','exito');
  }catch(error){mostrarMensajeRespaldo(mensajeTecnicoAmigable(error),'advertencia')}
  finally{boton.disabled=false}
});

function validarReactivacion(){document.getElementById('reactivarInstancia').disabled=!(document.getElementById('motivoReactivacion').value.trim().length>=10&&document.getElementById('passwordReactivacion').value)}
document.getElementById('motivoReactivacion')?.addEventListener('input',validarReactivacion);
document.getElementById('passwordReactivacion')?.addEventListener('input',validarReactivacion);
document.getElementById('reactivarInstancia')?.addEventListener('click',async()=>{
  const boton=document.getElementById('reactivarInstancia');boton.disabled=true;
  try{
    await api('/backups/reactivate',{method:'POST',body:JSON.stringify({motivo:document.getElementById('motivoReactivacion').value.trim(),password_admin:document.getElementById('passwordReactivacion').value})});
    document.getElementById('motivoReactivacion').value='';document.getElementById('passwordReactivacion').value='';
    mostrarMensajeRespaldo('La computadora fue reactivada. Verifique que ninguna otra computadora continúe trabajando con otra copia.','advertencia');
    await Promise.all([cargarEstadoRespaldos(),cargarHistorialRespaldos()]);
  }catch(error){mostrarMensajeRespaldo(mensajeTecnicoAmigable(error),'error');validarReactivacion()}
});

document.getElementById('actualizarEstadoRespaldos')?.addEventListener('click',()=>cargarEstadoRespaldos());
document.getElementById('actualizarHistorialRespaldos')?.addEventListener('click',cargarHistorialRespaldos);
document.querySelectorAll('.ir-respaldos').forEach(b=>b.addEventListener('click',()=>mostrar('respaldos')));
document.addEventListener('submit',e=>{if((estadoInstanciaPOS?.estado!=='ENTREGADA'&&!reinicioRespaldoPendiente)||!formulariosEscritura.has(e.target.id))return;e.preventDefault();e.stopImmediatePropagation();mostrarMensajeRespaldo(reinicioRespaldoPendiente?'Debe volver a comprobar el sistema antes de registrar operaciones.':'Esta computadora está ENTREGADA y no puede registrar cambios.','error');mostrar('respaldos')},true);
document.addEventListener('click',e=>{if((estadoInstanciaPOS?.estado!=='ENTREGADA'&&!reinicioRespaldoPendiente)||!e.target.closest(selectorEscrituras))return;e.preventDefault();e.stopImmediatePropagation();mostrarMensajeRespaldo(reinicioRespaldoPendiente?'Debe volver a comprobar el sistema antes de registrar operaciones.':'Esta computadora está ENTREGADA y no puede registrar cambios.','error');mostrar('respaldos')},true);

    try{usuario=JSON.parse(localStorage.getItem('usuarioPOS'))}catch{} if(token&&usuario)api('/auth/me').then(r=>{usuario=r.usuario;localStorage.setItem('usuarioPOS',JSON.stringify(usuario));iniciarApp()}).catch(()=>cerrarSesion());

// Pantallas administrativas agregadas; todas consumen APIs locales protegidas.
let productosAdmin=[],proveedoresAdmin=[],compraNueva=[];
const compraProducto=document.getElementById('compraProducto'),compraProductoBuscar=document.getElementById('compraProductoBuscar'),
  resultadosProductoCompra=document.getElementById('resultadosProductoCompra'),productoCompraSeleccionado=document.getElementById('productoCompraSeleccionado'),
  compraCantidad=document.getElementById('compraCantidad'),compraCosto=document.getElementById('compraCosto'),
  compraEditandoId=document.getElementById('compraEditandoId'),compraFormTitulo=document.getElementById('compraFormTitulo'),
  cancelarEdicionCompra=document.getElementById('cancelarEdicionCompra');
const botonPagoProveedor=document.createElement('button');botonPagoProveedor.id='abrirPagoProveedor';botonPagoProveedor.type='button';botonPagoProveedor.textContent='Pago a proveedores';nuevoProveedor?.before(botonPagoProveedor);
const filas=(items,render,vacio='Sin registros.')=>items.length?items.map(render).join(''):`<p>${vacio}</p>`;
async function adminProductos(){productosAdmin=await api('/productos?incluir_inactivos=1');productosAdminLista.innerHTML=filas(productosAdmin,p=>`<div class="row"><span>${esc(p.codigo)} · ${esc(p.nombre)} · ${dinero.format(p.precio_venta)} · stock ${cantidad(p.stock)} · ${Number(p.proveedores_asociados||0)} proveedor(es) ${p.activo?'':'(INACTIVO)'}</span><span><button data-pe="${p.id}">Editar</button><button data-ps="${p.id}" data-on="${p.activo?0:1}">${p.activo?'Desactivar':'Activar'}</button></span></div>`);}
async function adminProveedores(){const buscar=encodeURIComponent(document.getElementById('buscarProveedor')?.value.trim()||''),estado=document.getElementById('estadoProveedor')?.value||'ACTIVOS';proveedoresAdmin=await api(`/proveedores?buscar=${buscar}&estado=${estado}`);const activos=estado==='ACTIVOS'&&!buscar?proveedoresAdmin:await api('/proveedores?estado=ACTIVOS');const options=activos.filter(p=>p.activo).map(p=>`<option value="${p.id}">${esc(p.nombre)}</option>`).join('');productoProveedor.innerHTML='<option value="">Sin proveedor</option>'+options;compraProveedor.innerHTML='<option value="">Proveedor activo</option>'+options;proveedoresLista.innerHTML=`<table><thead><tr><th>Proveedor</th><th>Contacto</th><th>Teléfono</th><th>RFC</th><th>Productos</th><th>Última compra</th><th>Deuda</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${proveedoresAdmin.length?proveedoresAdmin.map(p=>`<tr><td><strong>${esc(p.nombre)}</strong><br><small>${esc(p.razon_social||'')}</small></td><td>${esc(p.contacto||'—')}<br><small>${esc(p.correo||'')}</small></td><td>${esc(p.telefono||'—')}</td><td>${esc(p.rfc||'—')}</td><td>${Number(p.productos||0)}</td><td>${p.ultima_compra?new Date(p.ultima_compra).toLocaleDateString('es-MX'):'—'}</td><td>${dinero.format(p.deuda_pendiente||0)}</td><td><span class="estado-chip ${p.activo?'ok':'error'}">${p.activo?'Activo':'Inactivo'}</span></td><td><button data-rv="${p.id}">Detalle</button> <button data-re="${p.id}">Editar</button> <button data-rs="${p.id}" data-on="${p.activo?0:1}">${p.activo?'Desactivar':'Activar'}</button></td></tr>`).join(''):'<tr><td colspan="9">No hay proveedores con estos filtros.</td></tr>'}</tbody></table>`;}
async function adminCompras(){const d=await api('/compras');comprasLista.innerHTML=filas(d,c=>`<div class="row"><span>${esc(c.folio)} · ${esc(c.proveedor||'')} · ${dinero.format(c.total)} · ${esc(c.estado)}<br><small>${c.estado_cuenta==='PENDIENTE'?`Por pagar: ${dinero.format(c.saldo_pendiente)}`:c.estado_cuenta==='PAGADA'?'Pagada':c.estado_cuenta==='CANCELADA'?'Deuda cancelada':'Sin cuenta'}</small></span><span>${c.estado==='ACTIVA'?`<button data-ce="${c.id}">Editar</button> <button data-cc="${c.id}" class="danger">Eliminar</button>`:''}</span></div>`);if(!productos.length)await cargarProductos();}
async function adminUsuarios(){const d=await api('/usuarios');usuariosLista._data=d;usuariosLista.innerHTML=filas(d,u=>`<div class="row"><span>${esc(u.nombre)} · ${esc(u.username)} · ${esc(u.rol)} ${u.activo?'':'(INACTIVO)'}</span><span><button data-ue="${u.id}">Editar</button><button data-us="${u.id}" data-on="${u.activo?0:1}">${u.activo?'Desactivar':'Activar'}</button><button data-up="${u.id}">Contraseña</button></span></div>`);}
async function adminConfiguracion(){const c=await api('/configuracion');configNombre.value=c.nombre_comercial||'';configRazon.value=c.razon_social||'';configDireccion.value=c.direccion||'';configTelefono.value=c.telefono||'';configRfc.value=c.rfc||'';configMensaje.value=c.mensaje_ticket||'';configPapel.value=c.papel_mm||80;configStockMinimo.value=c.stock_minimo_default||0;configVencimiento.value=c.vencimiento_dias??30;configPolitica.value=c.politica_credito||'';}
document.querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',async()=>{try{if(b.dataset.section==='productosAdmin')await Promise.all([adminProductos(),adminProveedores()]);if(b.dataset.section==='proveedores')await adminProveedores();if(b.dataset.section==='compras'){await Promise.all([adminProveedores(),adminCompras()]);compraProveedor.focus()}if(b.dataset.section==='usuarios')await adminUsuarios();if(b.dataset.section==='configuracion')await adminConfiguracion();if(b.dataset.section==='reportesAdmin'){reportesDescargas.innerHTML=['ventas','pagos','cartera','inventario','productos','compras','cancelaciones'].map(t=>`<button data-csv="${t}">Descargar ${t}.csv</button>`).join('');await cargarReporteComprasProveedor()}}catch(x){alert(x.message);}}));
document.querySelectorAll('[data-inventory-view]').forEach(b=>b.addEventListener('click',()=>{const vista=b.dataset.inventoryView;document.querySelectorAll('[data-inventory-panel]').forEach(panel=>panel.classList.toggle('hidden',panel.dataset.inventoryPanel!==vista));document.querySelectorAll('#inventario [data-inventory-view]').forEach(tab=>tab.classList.toggle('activo',tab.dataset.inventoryView===vista))}));
productoAdminForm?.addEventListener('submit',async e=>{e.preventDefault();const id=productoAdminId.value,b={codigo:productoCodigo.value,nombre:productoNombre.value,descripcion:productoDescripcion.value,precio_venta:productoPrecio.value,costo:productoCosto.value,unidad:productoUnidad.value,kilos_por_caja:productoKilosCaja.value,stock_minimo:productoMinimo.value,proveedor_id:productoProveedor.value||null};if(!Number.isInteger(Number(b.precio_venta))||!Number.isInteger(Number(b.costo)))return alert('Precio y costo deben ser pesos enteros');try{const r=await api(id?`/productos/${id}`:'/productos',{method:id?'PUT':'POST',body:JSON.stringify(b)}),productoId=Number(id||r.id),principal=Number(productoProveedor.value||0);await api(`/productos/${productoId}/proveedores`,{method:'PUT',body:JSON.stringify({proveedor_principal_id:principal||null,proveedores:principal?[{proveedor_id:principal}]:[]})});e.target.reset();productoAdminId.value='';await adminProductos();}catch(x){alert(x.message);}});
productosAdminLista?.addEventListener('click',async e=>{const id=Number(e.target.dataset.pe||e.target.dataset.ps),p=productosAdmin.find(x=>x.id===id);try{if(e.target.dataset.pe){Object.assign(productoAdminId,{value:p.id});productoCodigo.value=p.codigo;productoNombre.value=p.nombre;productoDescripcion.value=p.descripcion||'';productoPrecio.value=p.precio_venta;productoCosto.value=p.costo;productoUnidad.value=String(p.unidad).toUpperCase();productoMinimo.step=pasoCantidad(p.unidad);productoKilosCaja.value=p.kilos_por_caja||'';productoMinimo.value=p.stock_minimo;productoProveedor.value=p.proveedor_id||'';}if(e.target.dataset.ps){await api(`/productos/${id}/estado`,{method:'PATCH',body:JSON.stringify({activo:e.target.dataset.on==='1'})});await adminProductos();}}catch(x){alert(x.message);}});
function abrirFormularioProveedor(p=null){proveedorForm.classList.remove('hidden');proveedorFormTitulo.textContent=p?'Editar proveedor':'Nuevo proveedor';proveedorId.value=p?.id||'';proveedorNombre.value=p?.nombre||'';proveedorRazonSocial.value=p?.razon_social||'';proveedorContacto.value=p?.contacto||'';proveedorTelefono.value=p?.telefono||'';proveedorCorreo.value=p?.correo||'';proveedorRfc.value=p?.rfc||'';proveedorDireccion.value=p?.direccion||'';proveedorNotas.value=p?.notas||'';proveedorMensaje.classList.add('hidden');setTimeout(()=>proveedorNombre.focus(),0)}
nuevoProveedor?.addEventListener('click',()=>abrirFormularioProveedor());cancelarProveedor?.addEventListener('click',()=>{proveedorForm.reset();proveedorId.value='';proveedorForm.classList.add('hidden')});buscarProveedor?.addEventListener('input',()=>{clearTimeout(buscarProveedor._timer);buscarProveedor._timer=setTimeout(()=>adminProveedores().catch(x=>console.error(x)),250)});estadoProveedor?.addEventListener('change',()=>adminProveedores().catch(x=>console.error(x)));
proveedorForm?.addEventListener('submit',async e=>{e.preventDefault();const boton=guardarProveedor;if(boton.disabled)return;const id=proveedorId.value,b={nombre:proveedorNombre.value,razon_social:proveedorRazonSocial.value,contacto:proveedorContacto.value,telefono:proveedorTelefono.value,correo:proveedorCorreo.value,rfc:proveedorRfc.value,direccion:proveedorDireccion.value,notas:proveedorNotas.value};boton.disabled=true;proveedorMensaje.classList.add('hidden');try{await api(id?`/proveedores/${id}`:'/proveedores',{method:id?'PUT':'POST',body:JSON.stringify(b)});e.target.reset();proveedorId.value='';e.target.classList.add('hidden');await adminProveedores();}catch(x){proveedorMensaje.textContent=x.message;proveedorMensaje.classList.remove('hidden')}finally{boton.disabled=false}});
proveedoresLista?.addEventListener('click',async e=>{
  const id=Number(e.target.dataset.re||e.target.dataset.rs||e.target.dataset.rv),p=proveedoresAdmin.find(x=>x.id===id);
  try{
    if(e.target.dataset.re)abrirFormularioProveedor(p);
    if(e.target.dataset.rs){await api(`/proveedores/${id}/estado`,{method:'PATCH',body:JSON.stringify({activo:e.target.dataset.on==='1'})});await adminProveedores()}
    if(e.target.dataset.rv){
      const [d,cuentaDirecta]=await Promise.all([api(`/proveedores/${id}`),api(`/cuentas-proveedores?proveedor_id=${id}`)]);proveedorDetalle.classList.remove('hidden');
      const cuentas=(d.cuentas?.length?d.cuentas:cuentaDirecta.cuentas)||[],pagos=(d.pagos?.length?d.pagos:cuentaDirecta.pagos)||[];
      const movimientos=d.movimientos?.length?d.movimientos:[...cuentas.map(c=>({id:`C-${c.id}`,fecha:c.fecha,tipo:'COMPRA',folio:c.folio,cargo:c.estado==='CANCELADA'?0:Number(c.total_deuda),abono:0,estado:c.estado,descripcion:c.estado==='CANCELADA'?'Compra cancelada':'Compra registrada',usuario:'—'})),...pagos.map(p=>({id:`P-${p.id}`,fecha:p.fecha,tipo:'PAGO',folio:p.folio||`Cuenta ${p.cuenta_id}`,cargo:0,abono:p.estado==='ACTIVO'?Number(p.monto):0,estado:p.estado,descripcion:[p.metodo_pago,p.referencia&&`Ref. ${p.referencia}`,p.observaciones].filter(Boolean).join(' · '),usuario:p.usuario||'—'}))].sort((a,b)=>new Date(a.fecha)-new Date(b.fecha)||String(a.id).localeCompare(String(b.id)));
      let saldoProveedor=0;movimientos.forEach(m=>{if(m.saldo==null){saldoProveedor=Number((saldoProveedor+Number(m.cargo||0)-Number(m.abono||0)).toFixed(2));m.saldo=saldoProveedor}});
      const estadoCuenta=movimientos.length?`<div class="tabla-contenedor"><table><thead><tr><th>Fecha</th><th>Movimiento</th><th>Folio</th><th>Cargo</th><th>Abono</th><th>Saldo</th><th>Detalle</th><th>Usuario</th><th>Acción</th></tr></thead><tbody>${movimientos.map(m=>`<tr><td>${new Date(m.fecha).toLocaleString('es-MX')}</td><td>${esc(m.tipo)} · ${esc(m.estado)}</td><td>${esc(m.id)} / ${esc(m.folio||'—')}</td><td>${dinero.format(m.cargo)}</td><td>${dinero.format(m.abono)}</td><td>${dinero.format(m.saldo)}</td><td>${esc(m.descripcion||'')}</td><td>${esc(m.usuario||'—')}</td><td>${m.tipo==='PAGO'&&m.estado==='ACTIVO'?`<button type="button" class="danger" data-cpp="${esc(String(m.id).replace(/^P-/,''))}">Eliminar pago</button>`:'—'}</td></tr>`).join('')}</tbody></table></div>`:'<p>Sin movimientos de cuenta.</p>';
      proveedorDetalle.innerHTML=`<div class="inventario-encabezado"><h3>${esc(d.proveedor.nombre)}</h3><button type="button" data-cerrar-detalle>Cerrar</button></div><div class="detalle-resumen"><div><span>Deuda pendiente</span><strong>${dinero.format(d.proveedor.deuda_pendiente)}</strong></div><div><span>Total comprado</span><strong>${dinero.format(d.proveedor.total_comprado)}</strong></div><div><span>Última compra</span><strong>${d.proveedor.ultima_compra?new Date(d.proveedor.ultima_compra).toLocaleDateString('es-MX'):'Sin compras'}</strong></div><div><span>Contacto</span><strong>${esc(d.proveedor.contacto||'—')}</strong></div></div><p>${esc(d.proveedor.notas||'Sin notas')}</p><h4>Estado de cuenta</h4>${estadoCuenta}<h4>Productos suministrados</h4>${filas(d.productos,x=>`<div class="row"><span>${esc(x.codigo)} · ${esc(x.nombre)} ${x.principal?'(principal)':''}</span><strong>${x.costo_ultimo==null?'—':dinero.format(x.costo_ultimo)}</strong></div>`)}<h4>Compras relacionadas</h4>${filas(d.compras,x=>`<div class="row"><span>${esc(x.folio)} · ${new Date(x.fecha).toLocaleDateString('es-MX')}</span><strong>${dinero.format(x.total)} · ${esc(x.estado)}</strong></div>`)}`;
      proveedorDetalle.dataset.proveedorId=id;proveedorDetalle.scrollIntoView({behavior:'smooth'});
    }
  }catch(x){proveedorMensaje.textContent=x.message;proveedorMensaje.classList.remove('hidden')}
});
proveedorDetalle?.addEventListener('click',e=>{if(e.target.dataset.cerrarDetalle!==undefined)proveedorDetalle.classList.add('hidden');const pago=e.target.closest('[data-cpp]');if(pago)abrirEliminarPagoProveedor(Number(pago.dataset.cpp))});
let cuentasPagoProveedor=[],pagosProveedorRecientes=[],deudaTotalProveedores=0;
function proveedoresPendientesPago(){
  const mapa=new Map();
  cuentasPagoProveedor.forEach(c=>{
    const id=Number(c.proveedor_id),admin=proveedoresAdmin.find(p=>Number(p.id)===id)||{};
    if(!mapa.has(id))mapa.set(id,{id,nombre:c.proveedor,rfc:admin.rfc||'',telefono:admin.telefono||'',contacto:admin.contacto||''});
  });
  return [...mapa.values()];
}
function pintarHistorialPagosProveedor(proveedorId=0){
  const pagos=proveedorId?pagosProveedorRecientes.filter(p=>Number(p.proveedor_id)===proveedorId):pagosProveedorRecientes;
  historialPagosProveedores.innerHTML=filas(pagos,p=>`<div class="row"><span>${new Date(p.fecha).toLocaleString('es-MX')} · ${esc(p.proveedor)} · ${esc(p.metodo_pago)}${p.referencia?` · ${esc(p.referencia)}`:''} · ${esc(p.estado)}</span><span><strong>${dinero.format(p.monto)}</strong>${p.estado==='ACTIVO'?` <button type="button" class="danger" data-cpp="${p.id}">Eliminar</button>`:''}</span></div>`,'No hay pagos registrados para este proveedor.');
}
function seleccionarProveedorPago(proveedor){
  proveedorPagoId.value=proveedor.id;
  buscarProveedorPago.value=proveedor.nombre;
  resultadosProveedorPago.classList.add('hidden');
  const cuentas=cuentasPagoProveedor.filter(c=>Number(c.proveedor_id)===Number(proveedor.id));
  const deuda=cuentas.reduce((total,c)=>total+Number(c.saldo_pendiente),0);
  resumenDeudaProveedores.innerHTML=`<div class="detalle-resumen"><div><span>Deuda de ${esc(proveedor.nombre)}</span><strong>${dinero.format(deuda)}</strong></div><div><span>Compras pendientes</span><strong>${cuentas.length}</strong></div></div>`;
  cuentaPagoProveedor.disabled=!cuentas.length;
  cuentaPagoProveedor.innerHTML=cuentas.length?'<option value="">Selecciona una compra</option>'+cuentas.map(c=>`<option value="${c.id}" data-saldo="${c.saldo_pendiente}">${esc(c.folio)} · saldo ${dinero.format(c.saldo_pendiente)}</option>`).join(''):'<option value="">Este proveedor no tiene compras pendientes</option>';
  montoPagoProveedor.value='';montoPagoProveedor.max='';
  confirmarPagoProveedor.disabled=!cuentas.length;
  pintarHistorialPagosProveedor(Number(proveedor.id));
  if(cuentas.length)cuentaPagoProveedor.focus();
}
function buscarProveedoresParaPago(){
  proveedorPagoId.value='';cuentaPagoProveedor.disabled=true;confirmarPagoProveedor.disabled=true;
  cuentaPagoProveedor.innerHTML='<option value="">Selecciona primero un proveedor</option>';
  const termino=buscarProveedorPago.value.trim().toLocaleLowerCase('es-MX');
  if(!termino){resultadosProveedorPago.classList.add('hidden');return}
  const coincidencias=proveedoresPendientesPago().filter(p=>[p.nombre,p.rfc,p.telefono,p.contacto].some(v=>String(v||'').toLocaleLowerCase('es-MX').includes(termino))).slice(0,12);
  resultadosProveedorPago.innerHTML=coincidencias.length?coincidencias.map(p=>`<button type="button" class="resultado-proveedor-pago" data-proveedor-pago="${p.id}"><strong>${esc(p.nombre)}</strong><small>${esc([p.rfc,p.telefono,p.contacto].filter(Boolean).join(' · ')||'Proveedor con deuda pendiente')}</small></button>`).join(''):'<p class="muted">No hay proveedores con compras pendientes que coincidan.</p>';
  resultadosProveedorPago.classList.remove('hidden');
}
async function cargarPagosProveedores({conservarProveedor=false}={}){
  const seleccionado=conservarProveedor?Number(proveedorPagoId.value):0,d=await api('/cuentas-proveedores');
  deudaTotalProveedores=Number(d.deuda_total||0);cuentasPagoProveedor=d.cuentas.filter(c=>c.estado==='PENDIENTE'&&Number(c.saldo_pendiente)>0);pagosProveedorRecientes=d.pagos;
  const proveedor=proveedoresPendientesPago().find(p=>p.id===seleccionado);
  if(proveedor){seleccionarProveedorPago(proveedor);return}
  proveedorPagoId.value='';buscarProveedorPago.value='';resultadosProveedorPago.classList.add('hidden');
  resumenDeudaProveedores.innerHTML=`<div class="detalle-resumen"><div><span>Deuda total a proveedores</span><strong>${dinero.format(deudaTotalProveedores)}</strong></div><div><span>Compras pendientes</span><strong>${cuentasPagoProveedor.length}</strong></div></div>`;
  cuentaPagoProveedor.disabled=true;cuentaPagoProveedor.innerHTML='<option value="">Busca y selecciona un proveedor</option>';confirmarPagoProveedor.disabled=true;pintarHistorialPagosProveedor();
}
buscarProveedorPago?.addEventListener('input',buscarProveedoresParaPago);
resultadosProveedorPago?.addEventListener('click',e=>{const boton=e.target.closest('[data-proveedor-pago]');if(!boton)return;const proveedor=proveedoresPendientesPago().find(p=>p.id===Number(boton.dataset.proveedorPago));if(proveedor)seleccionarProveedorPago(proveedor)});
botonPagoProveedor?.addEventListener('click',async()=>{try{await cargarPagosProveedores();modalPagoProveedor.classList.remove('hidden');buscarProveedorPago.focus()}catch(x){alert(x.message)}});cerrarPagoProveedor?.addEventListener('click',()=>modalPagoProveedor.classList.add('hidden'));modalPagoProveedor?.addEventListener('click',e=>{if(e.target===modalPagoProveedor)modalPagoProveedor.classList.add('hidden')});
historialPagosProveedores?.addEventListener('click',e=>{const pago=e.target.closest('[data-cpp]');if(pago)abrirEliminarPagoProveedor(Number(pago.dataset.cpp))});
cuentaPagoProveedor?.addEventListener('change',()=>{const option=cuentaPagoProveedor.selectedOptions[0],saldo=Number(option?.dataset.saldo||0);montoPagoProveedor.max=saldo||'';montoPagoProveedor.value=saldo?saldo.toFixed(2):''});metodoPagoProveedor?.addEventListener('change',()=>{const requiere=metodoPagoProveedor.value!=='EFECTIVO';grupoReferenciaProveedor.classList.toggle('hidden',!requiere);referenciaPagoProveedor.required=requiere;if(!requiere)referenciaPagoProveedor.value=''});
formPagoProveedor?.addEventListener('submit',async e=>{e.preventDefault();const boton=confirmarPagoProveedor;if(boton.disabled)return;const proveedorId=Number(proveedorPagoId.value),option=cuentaPagoProveedor.selectedOptions[0],saldo=Number(option?.dataset.saldo||0),monto=Number(montoPagoProveedor.value);if(!proveedorId||!cuentaPagoProveedor.value)return alert('Selecciona un proveedor y una compra pendiente');if(!Number.isFinite(monto)||monto<=0||monto>saldo)return alert('El monto debe ser positivo y no superar el saldo');if(metodoPagoProveedor.value!=='EFECTIVO'&&!referenciaPagoProveedor.value.trim())return alert('Captura la referencia del pago');boton.disabled=true;try{await api('/cuentas-proveedores/pagos',{method:'POST',body:JSON.stringify({cuenta_id:Number(cuentaPagoProveedor.value),monto,metodo_pago:metodoPagoProveedor.value,referencia:referenciaPagoProveedor.value.trim(),observaciones:observacionesPagoProveedor.value})});metodoPagoProveedor.value='EFECTIVO';referenciaPagoProveedor.value='';observacionesPagoProveedor.value='';grupoReferenciaProveedor.classList.add('hidden');await Promise.all([cargarPagosProveedores({conservarProveedor:true}),adminProveedores(),cargarDashboard()]);alert('Pago a proveedor registrado correctamente')}catch(x){alert(x.message)}finally{boton.disabled=false}});
function abrirEliminarPagoProveedor(id){const modal=document.getElementById('modalCancelarPagoProveedor');document.getElementById('cancelarPagoProveedorId').value=String(id);document.getElementById('formCancelarPagoProveedor').reset();document.getElementById('cancelarPagoProveedorId').value=String(id);modal.classList.remove('hidden');setTimeout(()=>document.getElementById('motivoCancelarPagoProveedor').focus(),0)}
function cerrarEliminarPagoProveedor(){document.getElementById('modalCancelarPagoProveedor').classList.add('hidden');document.getElementById('formCancelarPagoProveedor').reset()}
document.getElementById('cerrarCancelarPagoProveedor')?.addEventListener('click',cerrarEliminarPagoProveedor);document.getElementById('volverCancelarPagoProveedor')?.addEventListener('click',cerrarEliminarPagoProveedor);document.getElementById('modalCancelarPagoProveedor')?.addEventListener('click',e=>{if(e.target.id==='modalCancelarPagoProveedor')cerrarEliminarPagoProveedor()});
document.getElementById('formCancelarPagoProveedor')?.addEventListener('submit',async e=>{e.preventDefault();const id=Number(document.getElementById('cancelarPagoProveedorId').value),motivo=document.getElementById('motivoCancelarPagoProveedor').value.trim(),boton=document.getElementById('confirmarCancelarPagoProveedor');if(!id||motivo.length<5)return alert('Escribe un motivo de al menos 5 caracteres');boton.disabled=true;try{await api(`/cuentas-proveedores/pagos/${id}/cancelar`,{method:'POST',body:JSON.stringify({motivo})});const proveedorId=Number(proveedorPagoId.value||proveedorDetalle.dataset.proveedorId||0);cerrarEliminarPagoProveedor();await Promise.all([cargarPagosProveedores({conservarProveedor:true}),adminProveedores(),adminCompras(),cargarDashboard()]);if(proveedorId)document.querySelector(`[data-rv="${proveedorId}"]`)?.click();alert('Pago eliminado y saldo de la compra restaurado')}catch(x){alert(x.message)}finally{boton.disabled=false}});
function productosCoincidentesCompra(){const q=compraProductoBuscar.value.trim().toLocaleLowerCase('es-MX');return q?productos.filter(p=>p.activo!==0&&[p.codigo,p.nombre].some(v=>String(v||'').toLocaleLowerCase('es-MX').includes(q))).slice(0,12):[]}
function seleccionarProductoCompra(producto){compraProducto.value=producto.id;compraProductoBuscar.value=`${producto.codigo} · ${producto.nombre}`;productoCompraSeleccionado.textContent=`Seleccionado: ${producto.codigo} · ${producto.nombre} · ${producto.unidad}`;resultadosProductoCompra.classList.add('hidden');configurarPasoCantidad(compraCantidad,producto.unidad);compraCantidad.focus();compraCantidad.select()}
function buscarProductosCompra(){compraProducto.value='';productoCompraSeleccionado.textContent='Selecciona una coincidencia.';const encontrados=productosCoincidentesCompra();if(!compraProductoBuscar.value.trim()){resultadosProductoCompra.classList.add('hidden');return}resultadosProductoCompra.innerHTML=encontrados.length?encontrados.map(p=>`<button type="button" class="resultado-producto-compra" data-producto-compra="${p.id}"><strong>${esc(p.codigo)}</strong><span>${esc(p.nombre)}</span><small>${esc(p.unidad)} · stock ${cantidad(p.stock)}</small></button>`).join(''):'<p class="muted">No hay productos que coincidan.</p>';resultadosProductoCompra.classList.remove('hidden')}
compraProductoBuscar?.addEventListener('input',buscarProductosCompra);
resultadosProductoCompra?.addEventListener('click',e=>{const boton=e.target.closest('[data-producto-compra]'),producto=productos.find(p=>p.id===Number(boton?.dataset.productoCompra));if(producto)seleccionarProductoCompra(producto)});
compraProductoBuscar?.addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();e.stopPropagation();const producto=productosCoincidentesCompra()[0];if(producto)seleccionarProductoCompra(producto)});
compraCantidad?.addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();e.stopPropagation();compraCosto.focus();compraCosto.select()});
productoUnidad?.addEventListener('change',()=>{productoMinimo.step=pasoCantidad(productoUnidad.value)});
function agregarProductoCompra(){const p=productos.find(x=>x.id===Number(compraProducto.value)),q=Number(compraCantidad.value),c=Number(compraCosto.value);if(!p)return alert('Busca y selecciona un producto');if(!esCantidadValida(q,p.unidad))return alert(mensajeCantidad(p.unidad));if(!Number.isInteger(c)||c<0)return alert('El costo unitario debe ser un número entero');compraNueva.push({producto_id:p.id,nombre:p.nombre,cantidad:q,costo:c});compraDetalle.innerHTML=filas(compraNueva,(x,i)=>`<div class="row"><span>${esc(x.nombre)} · ${cantidad(x.cantidad)} · ${dinero.format(x.costo)}</span><button type="button" data-cq="${i}">Quitar</button></div>`);compraProducto.value='';compraProductoBuscar.value='';compraCantidad.value='';compraCosto.value='';productoCompraSeleccionado.textContent='Escribe para buscar otro producto.';compraProductoBuscar.focus()}
agregarCompraProducto?.addEventListener('click',agregarProductoCompra);
compraCosto?.addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();e.stopPropagation();agregarProductoCompra()});
function pintarDetalleCompra(){const soloCabecera=compraForm.dataset.soloCabecera==='1';compraDetalle.innerHTML=filas(compraNueva,(x,i)=>`<div class="row"><span>${esc(x.nombre)} · ${cantidad(x.cantidad)} · ${dinero.format(x.costo)}</span><button type="button" data-cq="${i}" ${soloCabecera?'disabled':''}>Quitar</button></div>`)}
function limpiarEdicionCompra(){compraForm.reset();compraEditandoId.value='';compraFormTitulo.textContent='Nueva compra';confirmarCompra.textContent='Confirmar compra';cancelarEdicionCompra.classList.add('hidden');delete compraForm.dataset.soloCabecera;delete compraForm.dataset.totalOriginal;[compraProveedor,compraProductoBuscar,compraCantidad,compraCosto,agregarCompraProducto].forEach(c=>c.disabled=false);compraNueva=[];compraDetalle.innerHTML='';productoCompraSeleccionado.textContent='Escribe para buscar un producto.'}
async function editarCompra(id){const d=await api(`/compras/${id}`),c=d.compra;compraEditandoId.value=id;compraForm.dataset.totalOriginal=String(c.total);compraFormTitulo.textContent=`Editar compra ${c.folio} · total original ${dinero.format(c.total)}`;confirmarCompra.textContent='Guardar cambios';cancelarEdicionCompra.classList.remove('hidden');compraProveedor.value=c.proveedor_id;compraFolio.value=c.folio||'';compraReferencia.value=c.referencia||'';compraObservaciones.value=c.observaciones||'';compraNueva=d.productos.map(x=>({producto_id:Number(x.producto_id),nombre:x.nombre,cantidad:Number(x.cantidad),costo:Number(x.precio_compra)}));const soloCabecera=Number(c.pagos_activos)>0;compraForm.dataset.soloCabecera=soloCabecera?'1':'0';[compraProveedor,compraProductoBuscar,compraCantidad,compraCosto,agregarCompraProducto].forEach(control=>control.disabled=soloCabecera);productoCompraSeleccionado.textContent=soloCabecera?'Esta compra tiene pagos: solo se pueden editar folio, referencia y observaciones.':'Puedes aumentar el total, pero no reducirlo.';pintarDetalleCompra();compraForm.scrollIntoView({behavior:'smooth',block:'start'});compraFolio.focus()}
cancelarEdicionCompra?.addEventListener('click',limpiarEdicionCompra);
compraDetalle?.addEventListener('click',e=>{if(e.target.dataset.cq!==undefined&&!e.target.disabled){compraNueva.splice(Number(e.target.dataset.cq),1);pintarDetalleCompra()}});
compraForm?.addEventListener('submit',async e=>{e.preventDefault();if(!compraNueva.length)return alert('Agrega productos');const boton=confirmarCompra;if(boton.disabled)return;const id=Number(compraEditandoId.value),totalNuevo=compraNueva.reduce((s,x)=>s+Number(x.cantidad)*Number(x.costo),0),totalOriginal=Number(compraForm.dataset.totalOriginal||0);if(id&&totalNuevo+0.005<totalOriginal)return alert(`El nuevo total (${dinero.format(totalNuevo)}) no puede ser menor al total original (${dinero.format(totalOriginal)})`);const k=crypto.randomUUID(),body={proveedor_id:Number(compraProveedor.value),folio:compraFolio.value,referencia:compraReferencia.value,observaciones:compraObservaciones.value,idempotency_key:k,productos:compraNueva.map(x=>({...x,unidad:productos.find(p=>p.id===x.producto_id)?.unidad}))};boton.disabled=true;try{await api(id?`/compras/${id}`:'/compras',{method:id?'PUT':'POST',headers:id?{}:{'Idempotency-Key':k},body:JSON.stringify(body)});limpiarEdicionCompra();await Promise.all([adminCompras(),cargarInventario(),adminProveedores(),cargarDashboard()]);alert(id?'Compra actualizada correctamente':'Compra registrada correctamente')}catch(x){alert(x.message)}finally{boton.disabled=false}});
function cerrarModalCancelarCompra(){modalCancelarCompra.classList.add('hidden');formCancelarCompra.reset();cancelarCompraId.value=''}
comprasLista?.addEventListener('click',async e=>{const editar=e.target.closest('[data-ce]'),cancelar=e.target.closest('[data-cc]');if(editar){try{await editarCompra(Number(editar.dataset.ce))}catch(x){alert(x.message)}}if(cancelar){cancelarCompraId.value=cancelar.dataset.cc;modalCancelarCompra.classList.remove('hidden');setTimeout(()=>motivoCancelarCompra.focus(),0)}});
cerrarCancelarCompra?.addEventListener('click',cerrarModalCancelarCompra);cancelarCancelarCompra?.addEventListener('click',cerrarModalCancelarCompra);modalCancelarCompra?.addEventListener('click',e=>{if(e.target===modalCancelarCompra)cerrarModalCancelarCompra()});
formCancelarCompra?.addEventListener('submit',async e=>{e.preventDefault();const id=Number(cancelarCompraId.value),motivo=motivoCancelarCompra.value.trim(),boton=confirmarCancelarCompra;if(!id||motivo.length<5)return alert('Escribe un motivo de al menos 5 caracteres');boton.disabled=true;try{await api(`/compras/${id}/cancelar`,{method:'POST',body:JSON.stringify({motivo})});cerrarModalCancelarCompra();await Promise.all([adminCompras(),adminProveedores(),cargarDashboard()]);alert('Compra eliminada administrativamente; inventario y deuda fueron revertidos')}catch(x){alert(x.message)}finally{boton.disabled=false}});
usuarioAdminForm?.addEventListener('submit',async e=>{e.preventDefault();const id=usuarioAdminId.value,b={nombre:usuarioNombre.value,username:usuarioUsername.value,rol:usuarioRol.value,password:usuarioPassword.value};try{await api(id?`/usuarios/${id}`:'/usuarios',{method:id?'PUT':'POST',body:JSON.stringify(b)});e.target.reset();usuarioAdminId.value='';usuarioPassword.required=true;await adminUsuarios();alert(id?'Usuario actualizado correctamente':'Usuario creado correctamente')}catch(x){alert(x.message);}});
function cerrarModalAccionUsuario(){modalAccionUsuario.classList.add('hidden');formAccionUsuario.reset();accionUsuarioId.value='';accionUsuarioTipo.value=''}
function abrirModalAccionUsuario(id,tipo){const u=usuariosLista._data.find(x=>x.id===id);accionUsuarioId.value=String(id);accionUsuarioTipo.value=tipo;const password=tipo==='password';tituloAccionUsuario.textContent=password?'Cambiar contraseña':'Desactivar usuario';textoAccionUsuario.textContent=password?`Define una nueva contraseña para ${u.username}.`:`Indica por qué se desactivará a ${u.username}.`;grupoPasswordUsuario.classList.toggle('hidden',!password);grupoMotivoUsuario.classList.toggle('hidden',password);passwordAccionUsuario.required=password;motivoAccionUsuario.required=!password;confirmarAccionUsuario.className=password?'primary':'danger';modalAccionUsuario.classList.remove('hidden');setTimeout(()=>password?passwordAccionUsuario.focus():motivoAccionUsuario.focus(),0)}
usuariosLista?.addEventListener('click',async e=>{const id=Number(e.target.dataset.ue||e.target.dataset.us||e.target.dataset.up);try{if(e.target.dataset.ue){const u=usuariosLista._data.find(x=>x.id===id);usuarioAdminId.value=u.id;usuarioNombre.value=u.nombre;usuarioUsername.value=u.username;usuarioRol.value=u.rol;usuarioPassword.value='';usuarioPassword.required=false;}if(e.target.dataset.us){const activo=e.target.dataset.on==='1';if(activo){await api(`/usuarios/${id}/estado`,{method:'PATCH',body:JSON.stringify({activo:true,motivo:'Reactivación administrativa'})});await adminUsuarios()}else abrirModalAccionUsuario(id,'desactivar')}if(e.target.dataset.up)abrirModalAccionUsuario(id,'password')}catch(x){alert(x.message);}});
cerrarAccionUsuario?.addEventListener('click',cerrarModalAccionUsuario);cancelarAccionUsuario?.addEventListener('click',cerrarModalAccionUsuario);modalAccionUsuario?.addEventListener('click',e=>{if(e.target===modalAccionUsuario)cerrarModalAccionUsuario()});
formAccionUsuario?.addEventListener('submit',async e=>{e.preventDefault();const id=Number(accionUsuarioId.value),tipo=accionUsuarioTipo.value,boton=confirmarAccionUsuario;if(boton.disabled)return;boton.disabled=true;try{if(tipo==='password')await api(`/usuarios/${id}/password`,{method:'PUT',body:JSON.stringify({password:passwordAccionUsuario.value})});else await api(`/usuarios/${id}/estado`,{method:'PATCH',body:JSON.stringify({activo:false,motivo:motivoAccionUsuario.value.trim()})});cerrarModalAccionUsuario();await adminUsuarios();alert(tipo==='password'?'Contraseña actualizada correctamente':'Usuario desactivado correctamente')}catch(x){alert(x.message)}finally{boton.disabled=false}});
configuracionForm?.addEventListener('submit',async e=>{e.preventDefault();try{await api('/configuracion',{method:'PUT',body:JSON.stringify({nombre_comercial:configNombre.value,razon_social:configRazon.value,direccion:configDireccion.value,telefono:configTelefono.value,rfc:configRfc.value,mensaje_ticket:configMensaje.value,moneda:'MXN',papel_mm:Number(configPapel.value),stock_minimo_default:Number(configStockMinimo.value),vencimiento_dias:Number(configVencimiento.value),politica_credito:configPolitica.value})});alert('Configuración guardada');}catch(x){alert(x.message);}});
async function cargarReporteComprasProveedor(){
  const inicio=document.getElementById('reporteProveedorInicio'),fin=document.getElementById('reporteProveedorFin');
  if(!inicio.value){const hoy=new Date();inicio.value=`${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-01`}
  if(!fin.value)fin.value=new Date().toISOString().slice(0,10);
  const q=new URLSearchParams({fecha_inicio:inicio.value,fecha_fin:fin.value}),r=await api(`/stats/compras-por-proveedor?${q}`);
  document.getElementById('resumenComprasProveedor').innerHTML=`<div><span>Total comprado</span><strong>${dinero.format(r.total_general)}</strong></div><div><span>Compras activas</span><strong>${Number(r.numero_compras)}</strong></div><div><span>Proveedores</span><strong>${r.datos.length}</strong></div>`;
  document.getElementById('tablaComprasProveedor').innerHTML=`<table><thead><tr><th>Proveedor</th><th>Compras</th><th>Total comprado</th><th>Promedio</th><th>Primera compra</th><th>Última compra</th></tr></thead><tbody>${r.datos.length?r.datos.map(x=>`<tr><td>${esc(x.proveedor)}</td><td>${Number(x.numero_compras)}</td><td>${dinero.format(x.total_comprado)}</td><td>${dinero.format(x.promedio_compra)}</td><td>${x.primera_compra?new Date(x.primera_compra).toLocaleDateString('es-MX'):'—'}</td><td>${x.ultima_compra?new Date(x.ultima_compra).toLocaleDateString('es-MX'):'—'}</td></tr>`).join(''):'<tr><td colspan="6">No hay compras activas en el periodo.</td></tr>'}</tbody><tfoot><tr><th>Total</th><th>${Number(r.numero_compras)}</th><th>${dinero.format(r.total_general)}</th><th colspan="3"></th></tr></tfoot></table>`;
}
async function cargarGraficaProveedores(){
  if(usuario?.rol!=='ADMON_GRAL')return;
  try{const r=await api('/stats/compras-por-proveedor?limite=10'),canvas=document.getElementById('graficaProveedores');if(graficaProveedores)graficaProveedores.destroy();graficaProveedores=new Chart(canvas,{type:'bar',data:{labels:r.datos.map(x=>x.proveedor),datasets:[{label:'Total comprado',data:r.datos.map(x=>Number(x.total_comprado)),backgroundColor:'#6f9b85'}]},options:{indexAxis:'y',scales:{x:{beginAtZero:true,ticks:{callback:v=>dinero.format(v)}}},plugins:{tooltip:{callbacks:{label:c=>`Comprado: ${dinero.format(c.raw)}`}}}}})}catch(e){console.error('No fue posible cargar la gráfica de proveedores',e)}
}
document.getElementById('filtroComprasProveedor')?.addEventListener('submit',e=>{e.preventDefault();cargarReporteComprasProveedor().catch(x=>alert(x.message))});
document.getElementById('exportarComprasProveedor')?.addEventListener('click',async()=>{try{const q=new URLSearchParams({fecha_inicio:document.getElementById('reporteProveedorInicio').value,fecha_fin:document.getElementById('reporteProveedorFin').value}),r=await fetch(`/reportes/compras-proveedores.csv?${q}`,{headers:{Authorization:`Bearer ${token}`}});if(!r.ok)throw new Error((await r.json()).error||'No fue posible exportar');const a=document.createElement('a');a.href=URL.createObjectURL(await r.blob());a.download='compras-por-proveedor.csv';a.click();URL.revokeObjectURL(a.href)}catch(x){alert(x.message)}});
reportesDescargas?.addEventListener('click',async e=>{if(!e.target.dataset.csv)return;try{const r=await fetch(`/reportes/${e.target.dataset.csv}.csv`,{headers:{Authorization:`Bearer ${token}`}});if(!r.ok)throw new Error((await r.json()).error);const a=document.createElement('a');a.href=URL.createObjectURL(await r.blob());a.download=`${e.target.dataset.csv}.csv`;a.click();URL.revokeObjectURL(a.href);}catch(x){alert(x.message);}});
consultaLocalForm?.addEventListener('submit',async e=>{e.preventDefault();try{const r=await api('/chatbot',{method:'POST',body:JSON.stringify({pregunta:consultaLocalPregunta.value})});consultaLocalRespuesta.innerHTML=`<p>${esc(r.respuesta)}</p><pre>${esc(JSON.stringify(r.datos||r.ejemplos||'',null,2))}</pre>`;}catch(x){alert(x.message);}});
document.getElementById('preguntasConsultaLocal')?.addEventListener('click',e=>{const boton=e.target.closest('[data-pregunta]');if(!boton)return;consultaLocalPregunta.value=boton.dataset.pregunta;consultaLocalPregunta.focus();consultaLocalForm.requestSubmit();});
cargarPredicciones?.addEventListener('click',async()=>{try{const r=await api('/prediccion');prediccionesLista.innerHTML=filas(r.predicciones,p=>`<div class="prediccion-producto"><div class="row"><span>${esc(p.nombre)} (${esc(p.unidad)})</span><strong>${cantidad(p.estimado_proxima_semana)} ± ${cantidad(p.incertidumbre)}</strong></div><small>${esc(p.observacion)}</small></div>`)+`<p class="muted">${esc(r.limitaciones)}</p>`;}catch(x){alert(x.message);}});

// En formularios operativos, Enter avanza sin guardar accidentalmente.
function siguienteControlFormulario(actual){
  const formulario=actual.closest('form');
  if(!formulario||formulario.id==='loginForm')return null;
  const controles=[...formulario.querySelectorAll('input:not([type="hidden"]),select,textarea,button')].filter(control=>{
    if(control.disabled||control.hidden||control.matches('[data-enter-native]'))return false;
    return control.getClientRects().length>0;
  });
  const indice=controles.indexOf(actual);
  return indice>=0?controles[indice+1]||null:null;
}
document.addEventListener('keydown',e=>{
  if(e.key!=='Enter'||e.defaultPrevented||e.isComposing||e.ctrlKey||e.altKey||e.metaKey)return;
  const actual=e.target;
  if(!actual.matches('input:not([type="checkbox"]):not([type="radio"]),select:not([multiple])')||actual.closest('#loginForm')||actual.dataset.enterNative!==undefined)return;
  const siguiente=siguienteControlFormulario(actual);
  if(!siguiente)return;
  e.preventDefault();
  siguiente.focus();
  if(siguiente.matches('input:not([type="date"]):not([type="checkbox"]):not([type="radio"])'))siguiente.select?.();
});

cargarDashboard=async function(){try{const d=await api('/stats'),metricas=document.getElementById('metricas'),canvas=document.getElementById('graficaSemanal');const cards=[['Ventas hoy',d.ventas_hoy],['Ingresos hoy',dinero.format(d.ingresos_hoy)],['Ventas semana',d.ventas_semana],['Ingresos semana',dinero.format(d.ingresos_semana)],['Ventas mes',d.ventas_mes],['Ingresos mes',dinero.format(d.ingresos_mes)],['Contado hoy',d.contado_hoy],['Crédito hoy',d.credito_hoy],['Pagos mes',dinero.format(d.pagos_mes)],['Compras mes',dinero.format(d.compras_mes)],['Deuda clientes',dinero.format(d.deuda_total)],['Deuda proveedores',dinero.format(d.deuda_proveedores)],['Stock bajo',d.stock_bajo]];metricas.innerHTML=cards.map(x=>`<div class="card"><h3>${esc(x[0])}</h3><h2>${esc(x[1])}</h2></div>`).join('')+`<div class="card"><small>Actualizado ${esc(new Date(d.actualizado_en).toLocaleString('es-MX'))}</small></div>`;const mapa=new Map(d.semanal.map(x=>[String(x.dia).slice(0,10),Number(x.total)])),labels=[],values=[];for(let i=6;i>=0;i--){const f=new Date();f.setHours(0,0,0,0);f.setDate(f.getDate()-i);const k=`${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,'0')}-${String(f.getDate()).padStart(2,'0')}`;labels.push(f.toLocaleDateString('es-MX',{weekday:'short',day:'2-digit'}));values.push(mapa.get(k)||0)}if(grafica)grafica.destroy();grafica=new Chart(canvas,{type:'bar',data:{labels,datasets:[{label:'Ventas',data:values,backgroundColor:'#6f9b85'}]},options:{scales:{y:{beginAtZero:true,ticks:{callback:v=>dinero.format(v)}}}}});}catch(e){alert(e.message)}};
