const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const formatQuantity=value=>new Intl.NumberFormat('es-MX',{maximumFractionDigits:2}).format(Number(value)||0);

async function iaApi(path,options={}){
  const token=localStorage.getItem('tokenPOS')||sessionStorage.getItem('tokenPOS');
  const response=await fetch(path,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:`Bearer ${token}`}:{})}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'No fue posible consultar la IA');
  return data;
}

function mountAiDashboard(){
  const section=document.getElementById('consultasLocales');
  if(!section||document.getElementById('iaDashboard'))return;
  const panel=document.createElement('div');
  panel.id='iaDashboard';panel.className='panel ia-dashboard';
  panel.innerHTML=`<div class="row"><div><h3>Copiloto del negocio</h3><p class="muted">Analiza ventas, cartera, tendencias e inventario sin modificar tus datos.</p></div><span id="iaEstado" class="ia-badge">Comprobando IA…</span></div><button id="cargarResumenIa" type="button" class="primary">Generar diagnóstico</button><div id="iaResumen"></div><form id="iaAsistenteForm"><label for="iaPregunta"><strong>Pregunta al copiloto</strong></label><div class="ia-pregunta"><input id="iaPregunta" placeholder="¿Qué debería revisar hoy?" maxlength="500" required><button class="primary">Preguntar</button></div><div id="iaRespuesta"></div></form>`;
  section.insertBefore(panel,section.children[1]||null);
  const estado=panel.querySelector('#iaEstado'),resumen=panel.querySelector('#iaResumen'),respuesta=panel.querySelector('#iaRespuesta');
  iaApi('/ia/estado').then(result=>{estado.textContent=result.modo==='LOCAL'?'IA local':'IA generativa + local';estado.classList.add('activo')}).catch(()=>{estado.textContent='Inicia sesión para usar IA'});
  panel.querySelector('#cargarResumenIa').addEventListener('click',async event=>{event.currentTarget.disabled=true;resumen.innerHTML='<p>Analizando datos…</p>';try{const result=await iaApi('/ia/resumen');const cards=(result.recomendaciones||[]).map(item=>`<article class="ia-recomendacion prioridad-${escapeHtml(item.prioridad.toLowerCase())}"><span>${escapeHtml(item.prioridad)} · ${escapeHtml(item.tipo)}</span><strong>${escapeHtml(item.producto||'Negocio')}</strong><p>${escapeHtml(item.mensaje)}</p>${item.cantidad_sugerida?`<small>Reabasto sugerido: ${formatQuantity(item.cantidad_sugerida)}</small>`:''}</article>`).join('');resumen.innerHTML=`<div class="ia-diagnostico"><strong>Diagnóstico</strong><p>${escapeHtml(result.resumen_ejecutivo)}</p></div><h4>Acciones sugeridas</h4>${cards||'<p>No se detectaron acciones prioritarias.</p>'}`;}catch(error){resumen.innerHTML=`<p class="error">${escapeHtml(error.message)}</p>`}finally{event.currentTarget.disabled=false}});
  panel.querySelector('#iaAsistenteForm').addEventListener('submit',async event=>{event.preventDefault();respuesta.innerHTML='<p>Preparando respuesta…</p>';try{const result=await iaApi('/ia/asistente',{method:'POST',body:JSON.stringify({pregunta:panel.querySelector('#iaPregunta').value})});const local=String(result.proveedor).startsWith('LOCAL');respuesta.innerHTML=`<div class="ia-diagnostico"><p>${escapeHtml(result.respuesta)}</p><small>${local?'Análisis local':'Respuesta generada con IA'} · Verifica las recomendaciones antes de actuar.</small>${result.advertencia?`<p class="muted">OpenAI no estuvo disponible: ${escapeHtml(result.advertencia)}.</p>`:''}</div>`}catch(error){respuesta.innerHTML=`<p class="error">${escapeHtml(error.message)}</p>`}});
}

mountAiDashboard();
