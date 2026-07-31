function imprimirCuandoEsteListo() {
  const imagenes = [...document.images];
  imagenes.filter(imagen => imagen.complete && imagen.naturalWidth === 0)
    .forEach(imagen => { imagen.style.display = 'none'; });
  const pendientes = imagenes.filter(imagen => !imagen.complete);
  if (!pendientes.length) {
    window.focus();
    window.print();
    return;
  }
  let restantes = pendientes.length;
  const terminar = () => {
    restantes -= 1;
    if (restantes === 0) {
      window.focus();
      window.print();
    }
  };
  pendientes.forEach(imagen => {
    imagen.addEventListener('load', terminar, { once: true });
    imagen.addEventListener('error', () => {
      imagen.style.display = 'none';
      terminar();
    }, { once: true });
  });
}

window.addEventListener('load', imprimirCuandoEsteListo, { once: true });
window.addEventListener('afterprint', () => window.close(), { once: true });
