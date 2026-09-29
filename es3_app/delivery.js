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
    if(tab==='home'){
      app.insertAdjacentHTML('afterbegin',card('Entrega ES3','Descarga el libro revisado. Los porcentajes exactos de clase y los datos de adjudicación deben confirmarse; no se atribuyen calificaciones ni certificaciones.',`<a class="button button-primary" href="${esc(data.download)}" download>Descargar Excel de entrega</a><details style="margin-top:16px"><summary>Revisión de los 16 indicadores de la rúbrica</summary>${table(['Ind.','Requisito','Evidencia','Observación'],data.review.map(r=>r.map(esc)))}</details>`));
    }
    if(tab==='11'){
      app.insertAdjacentHTML('afterbegin',card('Carátula de estados de pago · 6 períodos','Proyección académica sobre las 140 partidas. Los cortes de facturación son los del flujo de caja; los detalles mensuales inferiores describen producción, no cobros adicionales.',`${table(['N°','Corte','Conformidad prevista','Cobro previsto','Neto facturable','IVA','Factura bruta','Retención','Anticipo','Líquido previsto','Neto facturado acum.','Avance facturado','Condición'],data.eepp.map(r=>r.map((x,i)=>i===11?pct(x):i>=4&&i<=10?cash(x):esc(x))))}<details style="margin-top:18px"><summary>Cómo se calcula y qué falta para certificar</summary><p>Factura = neto facturable + IVA. Líquido = factura − retención − amortización anticipo − multas documentadas. El último pago reserva el 10% según el modelo; la retención de 5% es un supuesto a confirmar, no una tasa contractual acreditada.</p><p>Para certificar: ID de licitación, contratista y RUT, decreto, acta de entrega, cubicaciones aceptadas, ensayos, F30-1, factura y firmas ITO/Municipalidad. No se incluyen datos del ejemplo de Graneros.</p></details>`));
      const first=app.querySelector('.eepp-kpis .metric');if(first)first.innerHTML='<div class="label">Partidas contractuales</div><div class="value">140</div><div class="hint">No se suman m², m³ y unidades</div>';
      const last=app.querySelector('.eepp-kpis .metric:last-child');if(last)last.innerHTML='<div class="label">Avance facturado final</div><div class="value">'+pct(data.eepp.at(-1)[11])+'</div><div class="hint">Valor facturado / oferta neta</div>';
    }
    if(tab==='13')app.insertAdjacentHTML('afterbegin',card('Control de costo y plazo · ES3 indicador 13','Mismo corte y alcance que el Excel. CR y avance medido son simulados; los importes están en CLP netos, no UF.',`${table(['Actividad','Terminación','PP al corte','CR simulado','VG','VC','IRC','VP = VG − PP','IRP = VG / PP'],data.control.map(r=>[esc(r[0]),esc(r[1]),cash(r[4]),cash(r[6]),cash(r[7]),cash(r[8]),n(r[9]),cash(r[14]),n(r[15])]))}<p>VP negativa: atraso valorizado, no días de atraso. IRP menor que 1: avance inferior al plan. n.a.: no hay presupuesto programado al corte. Los índices globales se calculan con totales, no promediando índices por partida.</p><details><summary>Criterios de medición de terminaciones</summary><p>Revestimientos, cielos y pavimentos: m² aceptados por recinto. Pintura: superficie con todas las manos terminadas. Puertas y ventanas: unidades instaladas y aceptadas. No reconocer como ejecución el material acopiado ni retrabajos. Los costos comparados deben corresponder al mismo alcance y excluir IVA.</p></details>`));
  }
  document.addEventListener('es3:render',e=>update(e.detail.tab));
  update(document.querySelector('#tabs .active')?.dataset.tab||'home');
})();
