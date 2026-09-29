/* Specific rubric views use the project's original CPMEngine and DiagramRenderer. */
(() => {
 'use strict';
 const D=window.APP_DATA,engine=window.CPMEngine,Renderer=window.DiagramRenderer;
 if(!D||!engine||!Renderer)return;
 const e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const f=v=>(Math.abs(Number(v))<1e-8?0:Number(v)).toLocaleString('es-CL',{minimumFractionDigits:2,maximumFractionDigits:2});
 const selections={cpm:'specific',pert:'specific'};
 function sources(mode){
  return (mode==='pert'?D.pertActivities:D.activities).map(a=>{
   const x={...a};
   if(mode==='cpm'){
    const d=document.querySelector(`.cpm-duration[data-id="${a.id}"]`),p=document.querySelector(`.cpm-pred[data-id="${a.id}"]`);
    if(d)x.duration=Number(d.value);if(p)x.pred=p.value;
   }else{
    for(const key of ['to','tm','tp']){const input=document.querySelector(`.pert-val[data-id="${a.id}"][data-key="${key}"]`);if(input)x[key]=Number(input.value);}
    x.duration=(x.to+4*x.tm+x.tp)/6;
   }
   return x;
  });
 }
 function mount(){
  const app=document.getElementById('app');if(!app||app.querySelector('.rubric-networks'))return;
  const mode=app.querySelector('#recalculateCPM')?'cpm':app.querySelector('#recalculatePERT')?'pert':null;if(!mode)return;
  const stage=mode==='cpm'?'Obra Gruesa':'Terminaciones';
  const panel=document.createElement('section');panel.className='card rubric-networks';
  panel.innerHTML=`<div class="card-head"><div><span class="overline">RÚBRICA ES3 · IND. ${mode==='cpm'?'3':'4'}</span><h3>${mode==='cpm'?'CPM de obra gruesa':'PERT de terminaciones'}</h3><p>Vista exigida y red total complementaria, con el motor de tu generador.</p></div><label>Alcance<select class="rubric-scope"><option value="specific">${stage} · exigido</option><option value="total">Proyecto completo · complemento</option></select></label></div><div class="card-body"><div class="rubric-summary"></div><div class="network-controls"><button class="button button-primary rubric-fit">Ajustar toda la malla</button><button class="button button-light rubric-plus">Acercar</button><button class="button button-light rubric-minus">Alejar</button><button class="button button-light rubric-svg">SVG</button><button class="button button-light rubric-png">PNG</button><button class="button button-light rubric-copy">Copiar datos para tu generador</button><a class="button button-light" href="ES3_Grupo4_Mallas_CPM_PERT.pdf" target="_blank" rel="noopener">PDF de las cuatro mallas</a></div><p>Arrastra nodos para ordenar la red. Arriba: IT / FT. Abajo: ITa / FTa. Rojo = ruta crítica. Azul = no crítica.</p><div class="rubric-canvas"><svg id="rubric-svg-${mode}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Malla ${mode.toUpperCase()}"></svg></div><div class="rubric-explanation note explain"></div><details class="rubric-detail"><summary>Ver tabla de tiempos y holguras</summary><div class="table-scroll rubric-result"></div></details><details class="rubric-detail"><summary>Ver todas las partidas y su nodo de programación</summary><div class="table-scroll rubric-coverage"></div></details><details class="rubric-detail"><summary>Cómo se calcula y qué exige la rúbrica</summary><p>La rúbrica pide tabla y malla CPM de todas las partidas de obra gruesa (C11) y tabla y malla PERT de todas las partidas de terminaciones (C12). No exige ambos cálculos del proyecto completo: se mantienen como complemento.</p><p>IT = máximo FT de predecesoras. FT = IT + duración. FTa = mínimo ITa de sucesoras. ITa = FTa − duración. HT = ITa − IT = FTa − FT. PERT calcula te = (to + 4 tm + tp) / 6 y varianza = ((tp − to) / 6)². No se redondean los valores antes del cálculo.</p><p>El Paso 2 entrega duraciones de paquetes. El presupuesto se desglosa íntegramente para comprobar cobertura, pero no se inventan duraciones ni tres tiempos independientes para sus subpartidas. Si la docente exige un nodo por cada ítem, deben definirse esos rendimientos y precedencias antes de desagregar la malla.</p><p>Las imágenes insertadas en el Excel y el PDF son capturas estáticas del cálculo base. Si modificas datos en la web, exporta nuevamente las imágenes y actualiza la entrega.</p></details></div>`;
  app.prepend(panel);app.querySelectorAll('.cpm-layout .network-card,.pert-layout .network-card').forEach(x=>x.hidden=true);
  const summary=app.querySelector('.section-summary h3');if(summary)summary.textContent=mode==='cpm'?'CPM · obra gruesa y proyecto completo':'PERT · terminaciones y proyecto completo';
  const select=panel.querySelector('.rubric-scope');select.value=selections[mode];
  const svg=panel.querySelector('svg'),renderer=new Renderer(svg.id,svg.parentElement.id||'app',`ES3_${mode}`);let selected=[],result;
  const draw=()=>{
   const all=sources(mode);const specific=select.value==='specific';selections[mode]=select.value;
   selected=specific?all.filter(a=>D.activities.find(x=>x.id===a.id)?.stage===stage):all;const ids=new Set(selected.map(a=>a.id));
   selected=selected.map(a=>({...a,external:(a.pred||'').split(/[,\-\s]+/).filter(p=>p&&p!=='—'&&!ids.has(p)),predecessors:(a.pred||'').split(/[,\-\s]+/).filter(p=>ids.has(p))}));
   result=engine.calculate(selected,{preserveDecimals:mode==='pert'});result.diagramType=mode;renderer.render(result);renderer.resetView();
   const budget=(D.sheets['07_Presupuesto']||[]).filter(r=>r[0]&&r[2]&&ids.has(r[1]));
   panel.querySelector('.rubric-summary').innerHTML=`<div class="metric"><div class="label">${specific?'Plazo sectorial local':'Plazo total'}</div><div class="value">${f(result.projectDuration)} días</div></div><div class="metric"><div class="label">Paquetes / partidas trazadas</div><div class="value">${selected.length} / ${budget.length}</div></div><div class="metric"><div class="label">Ruta crítica</div><strong>${e(result.primaryCriticalPath.join(' → '))}</strong></div>`;
   panel.querySelector('.rubric-explanation').innerHTML=specific?`<strong>Día 0 local de la etapa.</strong> Entradas externas: ${e(selected.filter(a=>a.external.length).map(a=>`${a.id} depende de ${a.external.join(', ')}`).join('; '))}. Estas relaciones están en la red total. No sumar este plazo al programa de 150 días ni interpretar las holguras sectoriales como holguras del proyecto.`:'<strong>Proyecto completo.</strong> Se conservan todos los vínculos entre etapas. El plazo PERT esperado puede superar el programa determinístico de 150 días.';
   panel.querySelector('.rubric-result').innerHTML=`<table><thead><tr>${['Nodo','Partida','Pred. locales','Duración / te','IT','FT','ITa','FTa','HT','HL','Crítica'].map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${selected.map(a=>{const r=result.activities[a.id];return `<tr class="${r.isCritical?'critical-row':''}"><td>${e(a.id)}</td><td>${e(a.name)}</td><td>${e(r.predecessors.join(', ')||'—')}</td>${['duration','ES','EF','LS','LF','TF','FF'].map(k=>`<td>${f(r[k])}</td>`).join('')}<td>${r.isCritical?'SÍ':'NO'}</td></tr>`;}).join('')}</tbody></table>`;
   panel.querySelector('.rubric-coverage').innerHTML=`<p>La duración del paquete abarca estas subpartidas; no es una duración individual de cada ítem.</p><table><thead><tr><th>Código presupuesto</th><th>Nodo</th><th>Partida</th><th>Unidad</th><th>Cantidad</th></tr></thead><tbody>${budget.map(r=>`<tr><td>${e(r[0])}</td><td>${e(r[1])}</td><td>${e(r[2])}</td><td>${e(r[3])}</td><td>${f(r[4])}</td></tr>`).join('')}</tbody></table>`;
  };
  select.addEventListener('change',draw);panel.querySelector('.rubric-fit').onclick=()=>renderer.resetView();panel.querySelector('.rubric-plus').onclick=()=>renderer.zoomBy(1.2);panel.querySelector('.rubric-minus').onclick=()=>renderer.zoomBy(.8);panel.querySelector('.rubric-svg').onclick=()=>renderer.exportSVG();panel.querySelector('.rubric-png').onclick=()=>renderer.exportPNG();
  panel.querySelector('.rubric-copy').onclick=async()=>{const text=selected.map(a=>[a.id,a.predecessors.join('-')||'—',mode==='pert'?a.tm:a.duration,...(mode==='pert'?[a.to,a.tp,a.tm]:[])].join('\t')).join('\n');try{await navigator.clipboard.writeText(text);panel.querySelector('.rubric-copy').textContent='Datos copiados';}catch(_){window.prompt('Copia los datos:',text);}};
  draw();
 }
 const styles=document.createElement('style');styles.textContent='.cpm-layout .network-card[hidden],.pert-layout .network-card[hidden]{display:none!important}.rubric-networks~.cpm-layout,.rubric-networks~.pert-layout{grid-template-columns:minmax(0,1fr)}.rubric-networks{margin-bottom:24px}.rubric-networks select{display:block;padding:10px;border-radius:10px;max-width:100%;font:inherit}.rubric-summary{display:grid;grid-template-columns:1fr 1fr 2fr;gap:16px;margin-bottom:18px}.rubric-summary .metric{padding:16px;background:rgba(100,150,190,.1);border-radius:14px}.rubric-canvas{height:540px;overflow:hidden;border-radius:16px;background:#fafbfe;border:1px solid #dbeafe}.rubric-canvas svg{width:100%;height:100%;touch-action:none}.rubric-detail{margin-top:16px;padding:14px;border:1px solid rgba(120,160,190,.3);border-radius:12px}.rubric-detail summary{cursor:pointer;font-weight:700}.rubric-detail .table-scroll{margin-top:15px}.rubric-networks label{min-width:220px}.rubric-networks .network-controls{flex-wrap:wrap}@media(max-width:700px){.rubric-summary{grid-template-columns:1fr}.rubric-canvas{height:380px}.rubric-networks .card-head{display:block}.rubric-networks label{display:block;margin-top:12px}}';document.head.append(styles);
 new MutationObserver(mount).observe(document.getElementById('app'),{childList:true});mount();
})();
