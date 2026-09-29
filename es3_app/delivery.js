/* ES3: datos conciliados del libro de entrega. Ambas ediciones comparten esta fuente. */
(() => {
  const D=window.APP_DATA, data=D.delivery;
  if(!data)return;
  const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n=x=>typeof x==='number'?x.toLocaleString('es-CL',{minimumFractionDigits:2,maximumFractionDigits:2}):esc(x);
  const cash=x=>typeof x==='number'?'$ '+n(x):esc(x);
  const pct=x=>typeof x==='number'?n(x*100)+'%':esc(x);
  const table=(heads,rows)=>`<div class="table-scroll"><table><thead><tr>${heads.map(x=>`<th>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const card=(title,copy,content)=>`<section class="card delivery-card"><div class="card-head"><div><span class="overline">Excel y web concordantes · Grupo 4</span><h3>${title}</h3><p>${copy}</p></div></div><div class="card-body">${content}</div></section>`;
  function update(tab){
    const app=document.querySelector('#app');if(!app||app.querySelector('.delivery-card'))return;
    const rubric={'11':'11','12':'12','13':'13'};
    if(rubric[tab]){const label=app.querySelector('.section-summary .overline');if(label)label.textContent='ES3 · IND. '+rubric[tab];}
    if(tab==='home'){
      app.insertAdjacentHTML('afterbegin',card('Planificación y control de obra · ES3','Sede Social El Bosque. Programa de 150 días corridos, desde la estructura organizacional hasta el control presupuestario.',`<a class="button button-primary" href="${esc(data.download)}" download>Descargar libro ES3</a><p>Incluye rendimientos, redes CPM y PERT, carta Gantt, presupuesto, curvas S, flujo de caja, estados de pago, riesgos y control de costos.</p>`));
    }
    if(tab==='11'){
      app.insertAdjacentHTML('afterbegin',card('Estados de pago · 6 períodos','Calendario y montos calculados desde el programa de obra y el presupuesto compensado. Los cortes siguen el flujo de caja y el avance se valoriza por partida.',`${table(['N°','Corte','Conformidad prevista','Cobro previsto','Neto facturable','IVA','Factura bruta','Retención','Anticipo','Líquido previsto','Neto facturado acum.','Avance facturado','Condición'],data.eepp.map(r=>r.map((x,i)=>i===11?pct(x):i>=4&&i<=10?cash(x):esc(x))))}<details style="margin-top:18px"><summary>Criterio de cálculo</summary><p>Factura = neto facturable + IVA. Líquido = factura menos retención, amortización de anticipo y multas formalizadas. El modelo considera reserva de cierre y retención de garantía.</p><p>La medición por partida se respalda con cubicaciones, controles de calidad y aprobación de la inspección técnica.</p></details>`));
      const first=app.querySelector('.eepp-kpis .metric');if(first)first.innerHTML='<div class="label">Partidas contractuales</div><div class="value">140</div><div class="hint">No se suman m², m³ y unidades</div>';
      const last=app.querySelector('.eepp-kpis .metric:last-child');if(last)last.innerHTML='<div class="label">Avance facturado final</div><div class="value">'+pct(data.eepp.at(-1)[11])+'</div><div class="hint">Valor facturado / oferta neta</div>';
    }
    if(tab==='13'){
      app.insertAdjacentHTML('afterbegin',card('Control de costo y plazo · ES3 indicador 13','Escenario de control proyectado a marzo de 2027 en CLP netos. Actualiza los valores con las mediciones y costos del período.',`${table(['Actividad','Terminación','PP al corte','CR proyectado','VG','VC','IRC','VP = VG − PP','IRP = VG / PP'],data.control.map(r=>[esc(r[0]),esc(r[1]),cash(r[4]),cash(r[6]),cash(r[7]),cash(r[8]),n(r[9]),cash(r[14]),n(r[15])]))}<p>VC negativa indica costo mayor al valor ganado. IRC menor que 1 señala sobrecosto. VP negativa indica atraso valorizado. IRP menor que 1 señala avance inferior al plan. Los índices globales se calculan con los totales.</p><details><summary>Criterios de medición de terminaciones</summary><p>Revestimientos, cielos y pavimentos: m² aceptados por recinto. Pintura: superficie con todas las manos terminadas. Puertas y ventanas: unidades instaladas y aceptadas. El costo corresponde al mismo alcance que el presupuesto y se compara sin IVA.</p></details>`));
      app.querySelectorAll('.control-bar-row').forEach((element,i)=>{if(typeof data.control[i]?.[9]!=='number'){element.querySelector('b').textContent='n.a.';element.querySelector('.bar-track i').style.width='0';}});
    }
  }
  document.addEventListener('es3:render',e=>update(e.detail.tab));
  update(document.querySelector('#tabs .active')?.dataset.tab||'home');
})();
