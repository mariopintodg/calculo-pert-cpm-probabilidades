/* Suite ES3 · tablero didáctico para planificación y control de obras. */
(function () {
  'use strict';

  const D = window.APP_DATA;
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const numberValue = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
  const num = (value) => Number.isFinite(Number(value)) ? Number(value).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  const money = (value) => Number.isFinite(Number(value)) ? '$ ' + Number(value).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  const pct = (value) => Number.isFinite(Number(value)) ? (Number(value) * 100).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%' : '—';
  const date = (value) => {
    if (!value) return '—';
    const parsed = new Date(String(value).slice(0, 10) + 'T12:00:00');
    return Number.isNaN(parsed.getTime()) ? esc(value) : parsed.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const dateISO = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const addDays = (iso, days) => { const d = new Date(String(iso).slice(0, 10) + 'T12:00:00'); d.setDate(d.getDate() + Number(days || 0)); return dateISO(d); };
  const safeId = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
  const csvCell = (value) => '"' + String(value ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';

  const TABS = [
    ['01', 'Organigrama', '01_Organigrama', 'Gobernanza, control y ejecución del proyecto', 'organigrama'],
    ['02', 'Roles', '02_Matriz Roles', 'Responsabilidades, entregables e indicadores', 'roles'],
    ['03', 'Rendimientos', '03_Rendimientos', 'Cuadrillas, productividad y duración', 'rendimientos'],
    ['04', 'CPM y red', '04_CPM_Proyecto_Completo', 'Ruta crítica con malla AON interactiva', 'cpm'],
    ['05', 'Carta Gantt', '05_Carta Gantt', 'Cronograma maestro de 150 días', 'gantt'],
    ['06', 'PERT', '06_PERT_Proyecto', 'Tres tiempos e incertidumbre de plazo', 'pert'],
    ['07', 'Presupuesto', '07_Presupuesto', 'Costo directo y oferta compensada', 'presupuesto'],
    ['08', 'Curvas S', '08_Curvas_S', 'Avance físico y financiero', 'curvas'],
    ['09', 'Flujo caja', '09_Flujo_Caja', 'Cobros, pagos y capital de trabajo', 'flujo'],
    ['10', 'Compromisos', '10_Lookahead', 'Programación de compromisos de corto plazo', 'lookahead'],
    ['11', 'EEPP', '11_EEPP_Obra_Gruesa', 'Estados de pago proyectados', 'eepp'],
    ['12', 'Riesgos', '12_Riesgos', 'Matriz de riesgos y respuestas', 'riesgos'],
    ['13', 'Control', '13_Control_Terminaciones', 'Valor ganado y alertas de costo', 'control'],
  ];
  const TAB_BY_SHEET = Object.fromEntries(TABS.map((tab) => [tab[2], tab]));

  const NOTES = {
    '01_Organigrama': 'La imagen corresponde al organigrama integral de la hoja original y se acompaña con una lectura simple de gobernanza, control y producción.',
    '02_Matriz Roles': 'Cada tarjeta vincula cargo, dependencia, funciones y entregables/KPI. La tabla completa queda disponible para revisión y exportación.',
    '03_Rendimientos': 'La duración base se calcula como Cantidad / (Rendimiento diario × N° de cuadrillas). Las tarjetas agrupan las partidas por macro-etapa.',
    '04_CPM_Proyecto_Completo': 'CPM calcula hacia adelante IT/FT y hacia atrás ITa/FTa. Holgura total = ITa − IT. Los nodos se pueden mover con el mouse.',
    '05_Carta Gantt': 'Las barras se calculan desde el CPM o desde el tiempo esperado PERT. Cambiar una duración modifica la red y las fechas al volver a abrir esta vista.',
    '06_PERT_Proyecto': 'PERT usa te = (to + 4×tm + tp) / 6 y varianza = ((tp − to) / 6)². El diagrama se basa en los tiempos esperados.',
    '07_Presupuesto': 'El presupuesto compensado muestra costo directo, gastos generales, utilidad, IVA y el factor multiplicador editable.',
    '08_Curvas_S': 'La curva física pondera jornadas de las 22 actividades. La curva financiera distribuye costo directo y venta neta durante la ejecución.',
    '09_Flujo_Caja': 'El flujo separa cobros, egresos, saldo operativo, saldo acumulado y necesidad máxima de capital.',
    '10_Lookahead': 'La programación de compromisos de corto plazo transforma el programa en acciones diarias con responsables, recursos, permisos y liberación.',
    '11_EEPP_Obra_Gruesa': 'Cada estado de pago conserva cantidad contractual, avance del período, avance acumulado, saldo y valorización neta.',
    '12_Riesgos': 'Nivel de riesgo = Probabilidad × Impacto. La matriz y las tarjetas muestran prioridad, respuesta, prevención, contingencia y activación.',
    '13_Control_Terminaciones': 'PP es presupuesto planificado, CR costo real, VG valor ganado, VC = VG − CR e IRC = VG / CR.',
  };

  const METHODOLOGY = {
    home: {
      source: 'La portada toma los datos generales de metadata y de las actividades del archivo Excel convertido a data.js. La hoja 14 de parámetros no se carga en esta aplicación.',
      calculation: 'Los indicadores de plazo, oferta, ahorro y PERT son resúmenes de los módulos. El plazo contractual es 150 días corridos desde el 02-11-2026; la fecha de término se obtiene sumando días calendario.',
      correlation: 'La secuencia de lectura es: Roles y Rendimientos → CPM → PERT/Gantt → Presupuesto → Curvas S/Flujo → Compromisos/EEPP → Riesgos/Control. Si se cambia una duración o la fecha de inicio, las vistas dependientes se actualizan al recalcular.'
    },
    '01': {
      source: 'La imagen corresponde al organigrama original entregado para el proyecto Sede Social El Bosque, conservado como referencia gráfica.',
      calculation: 'No genera montos ni duraciones: define la jerarquía de autoridad, coordinación y ejecución. Por eso se presenta como estructura de gobierno del proyecto.',
      correlation: 'Cada cargo del organigrama debe coincidir con la Matriz de Roles. Esos responsables reaparecen en Rendimientos, Compromisos, Riesgos, EEPP y Control.'
    },
    '02': {
      source: 'Se trasladan las filas de la hoja 02_Matriz Roles: cargo, dependencia, funciones y entregables/KPI.',
      calculation: 'No hay una fórmula monetaria; la matriz convierte la estructura del organigrama en responsabilidades verificables. El KPI es el resultado que permite comprobar si el cargo cumplió.',
      correlation: 'La dependencia explica quién valida o recibe cada entrega. Los responsables alimentan el Lookahead/Compromisos, las acciones de Riesgos y los controles de calidad, seguridad y avance.'
    },
    '03': {
      source: 'La hoja 03_Rendimientos aporta cantidad cubicada, unidad, rendimiento diario, tipo de cuadrilla y número de cuadrillas para cada partida.',
      calculation: 'Duración base = Cantidad ÷ (Rendimiento diario × N° de cuadrillas). La duración planificada además considera precedencias, frentes paralelos, coordinación y la meta contractual de 150 días.',
      correlation: 'La duración planificada se convierte en duración CPM. Las predecesoras ordenan la red; el resultado alimenta las fechas de Gantt, la secuencia PERT y la distribución de costos/avance.'
    },
    '04': {
      source: 'CPM utiliza las 22 actividades del proyecto, sus predecesoras y las duraciones determinísticas provenientes de Rendimientos.',
      calculation: 'Pasada hacia adelante: IT = máximo FT de las predecesoras y FT = IT + duración. Pasada hacia atrás: FTa = mínimo ITa de las sucesoras e ITa = FTa − duración. Holgura total = ITa − IT; si es 0, la actividad es crítica.',
      correlation: 'La ruta crítica alimenta las barras rojas de la Gantt, la red PERT y la priorización de riesgos. Cambiar duración o predecesora modifica la red, las holguras y el término calculado.'
    },
    '05': {
      source: 'La Gantt toma las actividades, EDT, macro-etapa, precedencias y tiempos calculados en CPM o en PERT esperado.',
      calculation: 'Fecha inicio = fecha contractual + IT. Fecha fin = fecha inicio + duración − 1 día. La barra se ubica con IT/escala y su ancho es duración/escala; rojo identifica holgura cero.',
      correlation: 'CPM determina la secuencia; PERT permite cambiar la base a tiempos esperados. La fecha editable de Inicio actualiza todas las fechas sin cambiar la lógica de precedencias.'
    },
    '06': {
      source: 'PERT utiliza para cada actividad tres estimaciones: optimista to, más probable tm y pesimista tp, asociadas a clima, suministro, interferencias, permisos y recepción.',
      calculation: 'Tiempo esperado te = (to + 4×tm + tp) ÷ 6. Varianza = ((tp − to) ÷ 6)² y desviación estándar = √varianza. La red se calcula con las mismas predecesoras, reemplazando la duración CPM por te.',
      correlation: 'La amplitud tp−to representa incertidumbre real y se vincula con Riesgos. El te alimenta la red PERT y puede seleccionarse como base de la Gantt; por eso el término esperado puede superar los 150 días contractuales.'
    },
    '07': {
      source: 'El detalle de partidas proviene de la hoja de presupuesto: cantidades, precios unitarios, costo directo y venta neta. El presupuesto municipal se usa como techo de comparación.',
      calculation: 'Subtotal neto = Costo directo × (1 + GG + utilidad). Oferta compensada = Subtotal neto × (1 + IVA). Ahorro = Presupuesto municipal − Oferta compensada. Los porcentajes GG, utilidad e IVA son editables.',
      correlation: 'Las partidas valorizadas se relacionan con actividades, fechas y EEPP. El costo directo alimenta Curvas S y Flujo de caja; la oferta compensada permite evaluar competitividad sin perder trazabilidad.'
    },
    '08': {
      source: 'La curva usa las 22 semanas de avance físico, costo directo acumulado y venta neta acumulada de la hoja 08_Curvas_S.',
      calculation: 'El avance físico se expresa como porcentaje acumulado. Costo directo y venta neta se normalizan contra su máximo acumulado para comparar las tres magnitudes en una escala común de 0% a 100%.',
      correlation: 'El físico se relaciona con las duraciones y el avance de actividades; el costo directo viene del Presupuesto; la venta neta se conecta con EEPP y Flujo de caja. La separación entre curvas ayuda a detectar desfases.'
    },
    '09': {
      source: 'El flujo mensual toma cobros, materiales, sueldos, subcontratos, equipos, gastos generales y saldos de la hoja 09_Flujo_Caja.',
      calculation: 'Saldo operativo = cobros − egresos. Saldo acumulado = saldo acumulado anterior + saldo operativo. Necesidad de capital = máximo déficit acumulado; ese máximo es el capital de trabajo requerido.',
      correlation: 'Los cobros dependen de EEPP y la producción de Gantt/Curva S. Los egresos dependen del Presupuesto y del avance. Riesgos de suministro o atraso pueden aumentar egresos y desplazar cobros.'
    },
    '10': {
      source: 'La hoja 10_Lookahead se muestra en español como Compromisos y contiene una ventana de 14 días, responsables, recursos, materiales, permisos y accesos.',
      calculation: 'No calcula una duración nueva: transforma actividades próximas en restricciones verificables. “Cumplimiento real” y “Liberación” son estados editables para controlar si la actividad está lista.',
      correlation: 'Cada compromiso debe corresponder a una actividad de la Gantt, a un responsable de Roles y, cuando corresponda, a un riesgo. Liberar restricciones protege la fecha de inicio y evita retrabajos.'
    },
    '11': {
      source: 'EEPP usa las partidas de obra gruesa, cantidades contractuales, cantidades del período, avances acumulados, valorizaciones y saldos de la hoja 11_EEPP_Obra_Gruesa.',
      calculation: 'Avance acumulado = avance anterior + avance del período. Saldo de cantidad = cantidad contractual − acumulada. La valorización del período se obtiene de la cantidad aprobada por su precio de venta; se recomienda validar cada medición con ITO.',
      correlation: 'EEPP convierte avance físico en cobro y conecta Gantt/Curva S con Flujo de caja. El costo y el avance real alimentan la lectura de Control de valor ganado.'
    },
    '12': {
      source: 'La matriz usa eventos externos de Andacollo, probabilidad P de 1 a 5, impacto I de 1 a 5, responsable y respuesta.',
      calculation: 'Nivel de riesgo = P × I. Nivel 1–4 bajo, 5–9 moderado, 10–16 alto y 17–25 crítico. La prevención reduce la probabilidad; la contingencia reduce el impacto cuando se activa el evento.',
      correlation: 'Los riesgos justifican los rangos to/tm/tp de PERT y se vinculan con actividades afectadas, responsables de Roles y restricciones del Lookahead. El mapa prioriza qué debe gestionarse primero.'
    },
    '13': {
      source: 'Control utiliza presupuesto por terminación, porcentaje planificado, avance medido y costo real incurrido de la hoja 13_Control_Terminaciones.',
      calculation: 'PP = presupuesto × plan. VG = presupuesto × avance medido. VC = VG − CR. IRC = VG ÷ CR. IRC menor que 1 indica que el costo real está superando el valor ganado; el semáforo marca dónde intervenir.',
      correlation: 'Presupuesto entrega la base económica; Gantt y EEPP entregan plan y avance; Flujo muestra caja; Riesgos explica causas posibles. Por eso Control es la lectura final de desempeño, no una tabla aislada.'
    },
  };

  const state = {
    tab: 'home',
    activities: D.activities.map((activity) => ({ ...activity })),
    pertActivities: D.pertActivities.map((activity) => ({ ...activity })),
    lastCPM: null,
    lastPERT: null,
    startDate: D.metadata.start,
    ganttMode: 'cpm',
    layouts: { cpm: {}, pert: {} },
    zoom: { cpm: 0.48, pert: 0.48 },
    budgetFactors: { gg: 0.15, utility: 0.10, iva: 0.19 },
    lookaheadRows: null,
    theme: localStorage.getItem('es3-theme') || 'dark',
  };

  const widget = (label, value, hint, tone = 'cyan', icon = '◈') => `<article class="insight-widget tone-${tone}"><span class="widget-glint" aria-hidden="true"></span><div class="widget-top"><span>${esc(label)}</span><span class="widget-icon" aria-hidden="true">${icon}</span></div><strong>${value}</strong><small>${esc(hint)}</small></article>`;
  function dashboardWidgets(tab) {
    const m = D.metadata;
    const cpm = calculateCPM(state.activities);
    const critical = cpm.critical.length;
    const riskRows = rowsByHeader('12_Riesgos', 'ID').filter((row) => /^R\d+/.test(String(row[0])));
    const riskHigh = riskRows.filter((row) => numberValue(row[6]) >= 10).length;
    const roleRows = rowsByHeader('02_Matriz Roles', 'Cargo').filter((row) => String(row[1] || '').trim() && !String(row[1]).startsWith('Base documental:'));
    const cards = {
      '01': [['Cargos definidos', String(roleRows.length), 'Organigrama y matriz de roles', 'cyan', '♧'], ['Módulos del proyecto', String(TABS.length), 'Indicadores ES3 conectados', 'blue', '▣'], ['Frentes de obra', '4', 'Faenas, gruesa, instalaciones y terminaciones', 'green', '▦']],
      '02': [['Roles en la matriz', String(roleRows.length), 'Cargos con funciones y entregables', 'cyan', '♧'], ['Actividades', String(state.activities.length), 'Responsables vinculados al programa', 'blue', '▣'], ['Plazo del proyecto', `${m.days} d`, 'Base de coordinación', 'amber', '◷']],
      '03': [['Partidas programadas', String(state.activities.length), 'Duración ligada al CPM', 'cyan', '▦'], ['Cuadrillas y frentes', '4 etapas', 'Producción en paralelo', 'blue', '♧'], ['Plazo objetivo', `${m.days} d`, 'Días corridos', 'amber', '◷']],
      '04': [['Plazo CPM', `${num(cpm.projectFinish)} d`, 'Resultado con duraciones editables', 'cyan', '◷'], ['Actividades críticas', String(critical), 'Holgura total igual a cero', 'rose', '◆'], ['Nodos', String(state.activities.length), 'Precedencias y trabajo paralelo', 'blue', '⌘']],
      '05': [['Plazo base', `${m.days} d`, `${date(state.startDate)} al ${date(addDays(state.startDate, m.days - 1))}`, 'cyan', '◷'], ['Partidas', String(state.activities.length), 'Barras según CPM o PERT', 'blue', '▦'], ['Ruta crítica', String(critical), 'Actividades que fijan el término', 'rose', '◆']],
      '06': [['PERT esperado', `${num(m.pertExpected)} d`, 'Con incertidumbre de tres tiempos', 'cyan', 'σ'], ['Plazo CPM', `${num(cpm.projectFinish)} d`, 'Base determinística', 'blue', '◷'], ['Diferencia', `${num(m.pertExpected - cpm.projectFinish)} d`, 'PERT menos CPM', 'amber', '↗']],
      '07': [['Oferta compensada', money(m.offer), 'Con IVA incluido', 'cyan', '$'], ['Techo municipal', money(m.municipalBudget), 'Base de comparación', 'blue', '▤'], ['Ahorro estimado', pct(m.savingsPct), money(m.savings), 'green', '↘']],
      '08': [['Avance físico final', '100,00%', 'Curva programada al término', 'cyan', '◒'], ['Oferta valorizada', money(m.offer), 'Referencia económica del proyecto', 'blue', '$'], ['Horizonte', '22 semanas', '150 días corridos', 'green', '▦']],
      '09': [['Capital de trabajo', money(m.workingCapital), 'Máximo déficit proyectado', 'rose', '$'], ['Oferta', money(m.offer), 'Base de cobros programados', 'blue', '▤'], ['Plazo', `${m.days} d`, 'Pagos y cobros mensuales', 'cyan', '◷']],
      '10': [['Ventana inicial', '14 días', 'Primeros compromisos diarios', 'cyan', '▦'], ['Actividades CPM', String(state.activities.length), 'Fuente del plan', 'blue', '⌘'], ['Inicio', date(state.startDate), 'Fecha contractual editable', 'green', '◷']],
      '11': [['Oferta total', money(m.offer), 'Base contractual de referencia', 'cyan', '$'], ['Plazo', `${m.days} d`, 'Cortes de avance y cobro', 'blue', '◷'], ['Obra gruesa', '8 partidas', 'Actividades D a K del programa', 'amber', '▦']],
      '12': [['Riesgos externos', String(riskRows.length), 'Eventos del emplazamiento', 'cyan', '◇'], ['Prioridad alta', String(riskHigh), 'Nivel P × I de 10 o más', 'rose', '◆'], ['Escala', '1 a 25', 'Probabilidad × impacto', 'amber', '▤']],
      '13': [['Oferta compensada', money(m.offer), 'Marco económico general', 'cyan', '$'], ['Terminaciones', '6 partidas', 'Actividades Q a V', 'blue', '▦'], ['Umbral crítico', '> 5%', 'Desviación de costo simulada', 'rose', '◆']],
    };
    return `<div class="module-widgets" aria-label="Indicadores de ${esc(TABS.find(t => t[0] === tab)?.[1] || 'módulo')}">${(cards[tab] || []).map((card) => widget(...card)).join('')}</div>`;
  }

  function currentMeta() {
    if (state.tab === 'home') return ['INICIO', 'Panel general del proyecto', 'Una lectura visual del programa, los costos y el control de obra.'];
    const tab = TABS.find((item) => item[0] === state.tab);
    return [tab ? 'HOJA ' + tab[0] : 'PROYECTO', tab ? tab[1] : 'Proyecto', tab ? tab[3] : ''];
  }

  function renderTabs() {
    $('#tabs').innerHTML = '<button class="tab ' + (state.tab === 'home' ? 'active' : '') + '" data-tab="home">⌂ Inicio</button>' + TABS.map(([number, label]) => `<button class="tab ${state.tab === number ? 'active' : ''}" data-tab="${number}"><span class="num">${number}</span>${esc(label)}</button>`).join('');
  }

  function renderHeader() {
    const [eyebrow, title, subtitle] = currentMeta();
    $('#sectionEyebrow').textContent = eyebrow;
    $('#sectionTitle').textContent = title;
    $('#sectionSubtitle').textContent = subtitle;
    $('#sourceName').textContent = D.sourceFile;
  }

  function render() {
    document.documentElement.dataset.theme = state.theme;
    renderTabs();
    renderHeader();
    const target = $('#app');
    if (state.tab === 'home') target.innerHTML = overview();
    else if (state.tab === '01') target.innerHTML = organigramaView();
    else if (state.tab === '02') target.innerHTML = rolesView();
    else if (state.tab === '03') target.innerHTML = rendimientoView();
    else if (state.tab === '04') target.innerHTML = cpmView();
    else if (state.tab === '05') target.innerHTML = ganttView();
    else if (state.tab === '06') target.innerHTML = pertView();
    else if (state.tab === '07') target.innerHTML = presupuestoView();
    else if (state.tab === '08') target.innerHTML = curvasView();
    else if (state.tab === '09') target.innerHTML = flujoView();
    else if (state.tab === '10') target.innerHTML = lookaheadView();
    else if (state.tab === '11') target.innerHTML = eeppView();
    else if (state.tab === '12') target.innerHTML = riesgosView();
    else if (state.tab === '13') target.innerHTML = controlView();
    else target.innerHTML = genericSheetView(TABS.find((item) => item[0] === state.tab)?.[2]);
    if (state.tab !== 'home') target.innerHTML = dashboardWidgets(state.tab) + target.innerHTML;
    target.innerHTML += methodologyBlock(state.tab);
    bindCommon();
    if (state.tab === '04') bindCPM();
    if (state.tab === '05') bindGantt();
    if (state.tab === '06') bindPERT();
    if (state.tab === '07') bindPresupuesto();
    if (state.tab === '08') bindCurvas();
    if (state.tab === '09') bindFlujo();
    if (state.tab === '10') bindLookahead();
    if (state.tab === '11') bindEEPP();
    if (state.tab === '12') bindRiesgos();
    if (state.tab === '13') bindControl();
    if (state.tab === '02' || state.tab === '03') bindSearch();
  }

  function bindCommon() {
    document.querySelectorAll('[data-tab]').forEach((element) => element.addEventListener('click', () => { state.tab = element.dataset.tab; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
    $('#exportView')?.addEventListener('click', exportCurrentView);
    $('#projectStart')?.addEventListener('change', (event) => { state.startDate = event.target.value || D.metadata.start; state.lookaheadRows = null; render(); });
    $('#themeToggle')?.addEventListener('click', () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('es3-theme', state.theme); render(); });
  }

  function overview() {
    const m = D.metadata;
    const rows = rowsByHeader('08_Curvas_S', 'Semana').filter((row) => Number.isFinite(Number(row[0])) && Number(row[0]) >= 1 && Number(row[0]) <= 22);
    const physical = rows.map((row) => numberValue(row[4]) * 100);
    const financial = rows.map((row) => m.offer ? numberValue(row[8]) / (m.offer / 1.19) * 100 : 0);
    const cpm = calculateCPM(state.activities);
    const chart = rows.length ? lineChart([{ label: 'Físico', color: '#28dec3', values: physical }, { label: 'Venta neta', color: '#57a9ff', values: financial }], 100) : '<p>La serie semanal no está disponible.</p>';
    const progress = Math.min(100, Math.max(0, 100 * m.offer / m.municipalBudget));
    return `<div class="dashboard-stage"><div class="dashboard-intro"><div><span class="dashboard-kicker">TABLERO GENERAL · GRUPO 4</span><h3>Planificación de la Sede Social El Bosque</h3><p>Programa, oferta y control del mismo proyecto, con los datos de las hojas ES3.</p></div><button class="theme-toggle" id="themeToggle" aria-label="Cambiar tema">${state.theme === 'dark' ? '☀ Tema claro' : '☾ Tema oscuro'}</button></div>
    <div class="insight-grid insight-grid-home">${widget('Plazo CPM', `${num(cpm.projectFinish)} días`, `${date(state.startDate)} a ${date(addDays(state.startDate, cpm.projectFinish - 1))}`, 'cyan', '◷')}${widget('Oferta compensada', money(m.offer), 'IVA incluido · presupuesto detallado', 'blue', '$')}${widget('Ahorro al mandante', pct(m.savingsPct), money(m.savings) + ' respecto del presupuesto municipal', 'green', '↘')}${widget('PERT esperado', `${num(m.pertExpected)} días`, 'Duraciones con incertidumbre', 'amber', 'σ')}</div>
    <div class="dashboard-visuals"><article class="dashboard-panel dashboard-trend"><div class="dash-panel-heading"><div><span class="dashboard-kicker">PROGRAMACIÓN</span><h4>Curvas S acumuladas</h4><p>22 semanas · avance físico y venta neta en porcentaje del total.</p></div><span class="dash-pill">150 días</span></div>${chart}<div class="dash-legend"><span><i class="legend-line" style="background:#28dec3"></i>Físico</span><span><i class="legend-line" style="background:#57a9ff"></i>Venta neta</span></div></article><article class="dashboard-panel dashboard-budget"><div class="dash-panel-heading"><div><span class="dashboard-kicker">OFERTA</span><h4>Presupuesto y holgura</h4><p>Comparación con el techo municipal.</p></div></div><div class="budget-ring" style="--ring-value:${progress}%"><div><strong>${pct(m.offer / m.municipalBudget)}</strong><span>del presupuesto</span></div></div><div class="budget-comparison"><div><span>Oferta</span><strong>${money(m.offer)}</strong></div><div><span>Techo municipal</span><strong>${money(m.municipalBudget)}</strong></div><div class="savings"><span>Diferencia favorable</span><strong>${money(m.savings)}</strong></div></div></article></div>
    <div class="dashboard-bottom"><article class="dashboard-panel"><div class="dash-panel-heading"><div><span class="dashboard-kicker">SECUENCIA</span><h4>Ruta crítica CPM</h4><p>${cpm.critical.length} actividades sin holgura determinan el plazo.</p></div></div><div class="critical-path-chips">${cpm.critical.map((id) => `<span>${esc(id)}</span>`).join('')}</div><button class="dash-link" data-tab="04">Ver red y holguras →</button></article><article class="dashboard-panel"><div class="dash-panel-heading"><div><span class="dashboard-kicker">CAJA</span><h4>Capital de trabajo</h4><p>Déficit máximo proyectado en el flujo mensual.</p></div></div><div class="dashboard-large-number">${money(m.workingCapital)}</div><button class="dash-link" data-tab="09">Abrir flujo de caja →</button></article></div></div>
    <div class="dashboard-grid">
      <div class="card dashboard-main"><div class="card-head"><div><span class="overline">Lectura rápida</span><h3>Controla el proyecto por capas</h3><p>Parte por la organización, revisa la red y termina en costos, riesgos y desempeño.</p></div><button class="button button-primary" data-tab="04">Abrir malla CPM</button></div><div class="card-body"><div class="journey-grid">${TABS.map(([number, label, , description]) => `<button class="journey" data-tab="${number}"><span class="journey-number">${number}</span><span><strong>${esc(label)}</strong><small>${esc(description)}</small></span><span class="journey-arrow">↗</span></button>`).join('')}</div></div></div>
      <div class="card"><div class="card-head"><div><span class="overline">Control editable</span><h3>Fecha de inicio del proyecto</h3><p>Modificarla actualiza las fechas de la Gantt.</p></div></div><div class="card-body"><label class="field-label" for="projectStart">Inicio contractual</label><input class="large-input" id="projectStart" type="date" value="${esc(state.startDate)}"><div class="formula-card"><strong>Ruta crítica inicial</strong><span>A → B → D → E → F → G → I → J → L → Q → R → T → V</span></div><div class="source-line">Los precios, avances simulados y supuestos están explicados dentro de sus módulos.</div></div></div>
    </div>
    <div class="card guidance-card"><div class="card-head"><div><span class="overline">Guía de lectura</span><h3>Qué significa cada módulo</h3></div></div><div class="card-body"><div class="guide-columns"><div><b>CPM</b><span>Secuencia, holguras y camino que gobierna el plazo.</span></div><div><b>PERT</b><span>Rango optimista, probable y pesimista de cada partida.</span></div><div><b>Gantt</b><span>Fechas y barras de ejecución para presentar el plan.</span></div><div><b>Control</b><span>Presupuesto, caja, riesgos, estados de pago y valor ganado.</span></div></div></div></div>`;
  }

  function methodologyBlock(tab) {
    const item = METHODOLOGY[tab] || METHODOLOGY.home;
    return `<details class="methodology-card"><summary><span class="methodology-mark">?</span><span><strong>Cómo se hizo esta hoja</strong><small>Fuente de datos · cálculo · correlación con el proyecto</small></span><span class="methodology-chevron">⌄</span></summary><div class="methodology-body"><article><span class="overline">01 · Fuente</span><p>${esc(item.source)}</p></article><article><span class="overline">02 · Cálculo</span><p>${esc(item.calculation)}</p></article><article><span class="overline">03 · Correlación</span><p>${esc(item.correlation)}</p></article></div></details>`;
  }

  function organigramaView() {
    return `<div class="module-grid org-layout"><div class="card image-card"><div class="card-head"><div><span class="overline">Imagen fuente</span><h3>Organigrama integral del proyecto</h3><p>Se conserva la composición original y se presenta con lectura web de alta resolución.</p></div><span class="status-chip status-blue">ES3 · IND. 1</span></div><div class="card-body"><figure class="org-figure"><img src="organigrama_fuente.jpg" alt="Organigrama integral del proyecto de construcción Sede Social El Bosque"><figcaption>Construcción Sede Social El Bosque · Andacollo, Región de Coquimbo</figcaption></figure></div></div><div class="card"><div class="card-head"><div><span class="overline">Cómo leerlo</span><h3>Cadena de decisión y producción</h3></div></div><div class="card-body"><div class="org-layers"><div class="org-layer layer-navy"><b>01 · Gobernanza</b><span>Mandante, ITO y Dirección de Obra.</span></div><div class="org-layer layer-blue"><b>02 · Gestión integral</b><span>Administrador de Obra integra contrato, programa y costos.</span></div><div class="org-layer layer-mix"><b>03 · Control funcional</b><span>Jefe de Terreno, Oficina Técnica/BIM, PAC y SSOMA.</span></div><div class="org-layer layer-light"><b>04 · Ejecución</b><span>Bodeguero, capataces, cuadrillas y subcontratos.</span></div></div><div class="note explain"><strong>Regla de coordinación.</strong> La producción se libera cuando Oficina Técnica, PAC, SSOMA e ITO han validado las condiciones necesarias para ejecutar y recibir la partida.</div></div></div></div><div class="card org-read-card"><div class="card-head"><div><span class="overline">Flujos transversales</span><h3>Tres conversaciones que mantienen alineada la obra</h3></div></div><div class="card-body"><div class="flow-cards"><div class="flow-card teal"><b>Control</b><span>ITO → inspección → observaciones → corrección → V°B° → recepción.</span></div><div class="flow-card green"><b>Información</b><span>Oficina Técnica/BIM → planos vigentes → RFI → coordinación → submittals.</span></div><div class="flow-card orange"><b>Producción</b><span>Jefe de Terreno → capataces → cuadrillas → ejecución segura.</span></div></div></div></div>`;
  }

  function roleRows() {
    const rows = D.sheets['02_Matriz Roles'] || [];
    const header = rows.findIndex((row) => String(row[1] || '').trim() === 'Cargo');
    return header < 0 ? [] : rows.slice(header + 1).filter((row) => row[1]);
  }

  function rolesView() {
    const rows = roleRows();
    return `<div class="section-summary"><div><span class="overline">Matriz de roles</span><h3>Quién decide, quién coordina y quién ejecuta</h3><p>Las tarjetas están ordenadas desde el mandante hasta el terreno. Cada KPI se puede leer sin recorrer una fila interminable.</p></div><div class="mini-stat"><b>${rows.length}</b><span>cargos definidos</span></div></div><div class="role-grid">${rows.map((row, index) => `<article class="role-card role-${index % 5}"><div class="role-top"><span class="role-index">${String(index + 1).padStart(2, '0')}</span><span class="status-chip">Responsabilidad</span></div><h3>${esc(row[1])}</h3><div class="role-dependency"><small>Dependencia directa</small><strong>${cellText(row[2])}</strong></div><div class="role-block"><small>Funciones principales</small><p>${cellText(row[3])}</p></div><div class="role-block role-kpi"><small>Entregables / KPI</small><p>${cellText(row[4])}</p></div></article>`).join('')}</div><div class="card table-card role-table-card"><div class="card-head"><div><span class="overline">Vista de matriz</span><h3>Tabla completa de responsabilidades</h3></div><button class="button button-light" id="exportRoles">CSV</button></div><div class="card-body"><div class="toolbar"><input class="search" id="roleSearch" placeholder="Buscar cargo, función o KPI…"><span class="muted">${rows.length} cargos · concordante con el organigrama</span></div><div class="table-scroll"><table id="roleTable"><thead><tr><th>Cargo</th><th>Dependencia directa</th><th>Funciones principales</th><th>Entregables / KPI</th></tr></thead><tbody>${rows.map((row) => `<tr data-search="${esc(row.join(' '))}">${row.slice(1, 5).map((cell) => `<td>${cellHTML(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div></div>`;
  }

  function rendimientoRows() {
    const rows = D.sheets['03_Rendimientos'] || [];
    return rows.slice(4).filter((row) => /^\d+$/.test(String(row[0] ?? '').trim()) && row[2]).map((row) => ({ item: row[0], stage: row[1], name: row[2], quantity: row[3], unit: row[4], crew: row[5], productivity: row[6], crews: row[7], base: row[8], weight: row[9], planned: row[10] }));
  }

  function rendimientoView() {
    const rows = rendimientoRows();
    const stages = [...new Set(rows.map((row) => row.stage))];
    const stageColors = ['blue', 'green', 'purple', 'orange', 'teal'];
    return `<div class="section-summary"><div><span class="overline">ES3 · IND. 2</span><h3>Rendimientos por cuadrilla, ordenados por macro-etapa</h3><p>Solo se muestran las 22 partidas reales. Las filas resumen del Excel quedan fuera para evitar ceros y campos que no corresponden a una actividad.</p></div><div class="mini-stat"><b>${num(rows.length, 0)}</b><span>partidas con rendimiento</span></div></div><div class="stage-summary">${stages.map((stage, index) => { const group = rows.filter((row) => row.stage === stage); const weight = group[0]?.weight || 0; return `<div class="stage-card ${stageColors[index % stageColors.length]}"><span>${esc(stage)}</span><b>${num(group.length, 0)}</b><small>${num(group.reduce((sum, row) => sum + numberValue(row.planned), 0))} días · objetivo ${pct(weight)}</small></div>`; }).join('')}</div><div class="card performance-guide"><div class="card-head"><div><span class="overline">Antes de leer la tabla</span><h3>Qué significa “lote”, mínimo y ponderación</h3><p>En Chile, “lote” se usa como unidad global cuando una actividad se contrata o se recibe completa, no por m², m³ o unidad física.</p></div></div><div class="card-body"><div class="guide-columns guide-columns-three"><div><b>Lote (global)</b><span>1.00 lote = el paquete completo de faena, servicio provisorio, prueba o entrega. Ejemplo: 0.50 lote/día significa que se completa medio paquete por día; la base es 1.00 ÷ 0.50 = 2.00 días.</span></div><div><b>Duración mínima/base</b><span>Se obtiene con Cantidad ÷ (Rendimiento diario × cuadrillas). Es un mínimo productivo teórico; no incluye esperas, permisos, curado, coordinación ni liberación de calidad.</span></div><div><b>Ponderación objetivo</b><span>Es la participación planificada de la macro-etapa en el programa: Instalación 8.00%, Obra Gruesa 38.00%, Instalaciones 22.00% y Terminaciones 32.00%. Suma 100.00%. Los ceros anteriores eran filas resumen mal leídas, no partidas sin ponderación.</span></div></div></div></div><div class="toolbar module-toolbar"><input class="search" id="rendSearch" placeholder="Buscar partida, cuadrilla o macro-etapa…"><span class="muted">Duración base = cantidad ÷ (rendimiento diario × cuadrillas)</span></div><div class="performance-groups">${stages.map((stage, index) => `<details class="performance-group" open data-stage-group="${esc(stage)}"><summary><span class="summary-dot ${stageColors[index % stageColors.length]}"></span><strong>${esc(stage)}</strong><span>${num(rows.filter((row) => row.stage === stage).length, 0)} partidas · objetivo ${pct(rows.find((row) => row.stage === stage)?.weight || 0)}</span><span class="summary-chevron">⌄</span></summary><div class="performance-list">${rows.filter((row) => row.stage === stage).map((row) => `<article class="performance-row" data-search="${esc(Object.values(row).join(' '))}"><div class="performance-id">${esc(row.item)}</div><div class="performance-name"><strong>${esc(row.name)}</strong><small>${esc(row.crew)}</small></div><div class="performance-stat"><small>Cantidad</small><b>${num(row.quantity)} ${esc(String(row.unit).toLowerCase() === 'lote' ? 'lote (global)' : row.unit)}</b></div><div class="performance-stat"><small>Rendimiento</small><b>${num(row.productivity)} / día</b></div><div class="performance-stat"><small>Cuadrillas</small><b>${num(row.crews)} </b></div><div class="performance-stat emphasis"><small>Duración planificada</small><b>${num(row.planned)} días</b></div></article>`).join('')}</div></details>`).join('')}</div><div class="note explain"><strong>Lectura didáctica.</strong> La duración planificada incorpora secuencia, frentes paralelos, coordinación y la meta contractual de 150 días corridos. Por eso puede ser mayor que la duración base.</div>`;
  }

  function parsePred(value) { return String(value || '').replace(/[—–]/g, '').split(/[\-,;]+/).map((item) => item.trim().toUpperCase()).filter(Boolean); }

  function calculateCPM(activities, durationKey = 'duration') {
    const byId = Object.fromEntries(activities.map((activity) => [activity.id, activity]));
    const preds = Object.fromEntries(activities.map((activity) => [activity.id, parsePred(activity.pred).filter((pred) => byId[pred])]));
    const successors = Object.fromEntries(activities.map((activity) => [activity.id, []]));
    activities.forEach((activity) => preds[activity.id].forEach((pred) => successors[pred].push(activity.id)));
    const result = Object.fromEntries(activities.map((activity) => [activity.id, { id: activity.id, duration: numberValue(activity[durationKey]), ES: 0, EF: 0, LS: 0, LF: 0, slack: 0, free: 0 }]));
    const done = new Set();
    const order = [];
    let guard = 0;
    while (order.length < activities.length && guard++ < activities.length * 4) {
      const next = activities.find((activity) => !done.has(activity.id) && preds[activity.id].every((pred) => done.has(pred)));
      if (!next) { activities.filter((activity) => !done.has(activity.id)).forEach((activity) => { done.add(activity.id); order.push(activity.id); }); break; }
      const current = result[next.id];
      current.ES = preds[next.id].length ? Math.max(...preds[next.id].map((pred) => result[pred].EF)) : 0;
      current.EF = current.ES + current.duration;
      done.add(next.id); order.push(next.id);
    }
    const projectFinish = Math.max(...activities.map((activity) => result[activity.id].EF), 0);
    [...order].reverse().forEach((id) => {
      const current = result[id];
      current.LF = successors[id].length ? Math.min(...successors[id].map((successor) => result[successor].LS)) : projectFinish;
      current.LS = current.LF - current.duration;
      current.slack = current.LS - current.ES;
      current.free = successors[id].length ? Math.max(0, Math.min(...successors[id].map((successor) => result[successor].ES)) - current.EF) : 0;
    });
    const critical = activities.filter((activity) => Math.abs(result[activity.id].slack) < 0.0001).map((activity) => activity.id);
    return { byId: result, preds, succ: successors, order, projectFinish, critical };
  }

  function criticalRoute(calc) { return calc.critical.join(' → '); }

  function cpmView() {
    const calc = calculateCPM(state.activities);
    state.lastCPM = calc;
    return `<div class="section-summary compact-summary"><div><span class="overline">ES3 · IND. 3</span><h3>Red de precedencias completa y ruta crítica</h3><p>Modifica una duración o una predecesora. Después de recalcular, la malla, las holguras y la Gantt se actualizan.</p></div><div class="interactive-badge">⠿ Arrastra los nodos</div></div><div class="cpm-layout"><div class="card input-panel"><div class="card-head"><div><span class="overline">Entrada editable</span><h3>Actividades CPM</h3><p>22 partidas · días corridos</p></div></div><div class="card-body"><div class="toolbar"><button class="button button-primary" id="recalculateCPM">⚡ Recalcular red</button><button class="button button-light" id="pasteCPM">📋 Pegar desde Excel</button></div><div class="note explain"><strong>Formato.</strong> Use guion o coma para separar predecesoras. El sistema calcula hacia adelante y hacia atrás automáticamente.</div><div class="input-scroll"><table class="input-table"><thead><tr><th>Act.</th><th>Predecesora</th><th>Duración</th></tr></thead><tbody>${state.activities.map((activity) => `<tr><td><input class="cpm-id" value="${esc(activity.id)}" readonly></td><td><input class="cpm-pred" data-id="${esc(activity.id)}" value="${esc(activity.pred || '—')}"></td><td><input class="cpm-duration duration" data-id="${esc(activity.id)}" type="number" step="0.01" value="${numberValue(activity.duration)}"></td></tr>`).join('')}</tbody></table></div></div></div><div class="card network-card"><div class="card-head"><div><span class="overline">Malla AON</span><h3>CPM · diagrama de actividades</h3><p>Arrastra cada círculo para ordenar visualmente la red y conserva la lectura de IT/FT e ITa/FTa.</p></div><div class="network-legend"><span><i class="dot dot-red"></i>Ruta crítica</span><span><i class="dot dot-blue"></i>Relación no crítica</span></div></div><div class="card-body">${networkControls('cpm')}${networkSVG(state.activities, calc, 'cpm')}</div></div></div><div class="summary-strip"><div class="highlight"><span class="label">Tiempo total</span><span class="value">${num(calc.projectFinish, 0)} d</span><small>CPM determinístico</small></div><div class="critical-box"><strong>Ruta crítica identificada</strong><span>${esc(criticalRoute(calc))}</span><small>${calc.critical.length} actividades con holgura cero</small></div></div><div class="card calc-table"><div class="card-head"><div><span class="overline">Resultado numérico</span><h3>Tiempos y holguras</h3><p>IT inicio temprano · FT fin temprano · ITa inicio tardío · FTa fin tardío.</p></div><button class="button button-light" id="exportCPM">CSV</button></div><div class="table-scroll">${cpmResultsTable(state.activities, calc)}</div></div><div class="note explain"><strong>Cómo se interpreta.</strong> La ruta crítica es la cadena que gobierna el plazo: si una actividad roja se retrasa y no se recupera, se retrasa el término del proyecto.</div>`;
  }

  function cpmResultsTable(activities, calc) { return `<table><thead><tr><th>Partida</th><th>Predecesoras</th><th>Duración</th><th>IT</th><th>FT</th><th>ITa</th><th>FTa</th><th>Holgura total</th><th>Holgura libre</th><th>Crítica</th></tr></thead><tbody>${activities.map((activity) => { const row = calc.byId[activity.id]; const critical = Math.abs(row.slack) < .0001; return `<tr class="${critical ? 'critical-row' : ''}"><td><strong>${esc(activity.id)}</strong><br><small>${esc(activity.name)}</small></td><td>${esc(activity.pred || '—')}</td><td>${num(row.duration)}</td><td>${num(row.ES)}</td><td>${num(row.EF)}</td><td>${num(row.LS)}</td><td>${num(row.LF)}</td><td><strong>${num(row.slack)}</strong></td><td>${num(row.free)}</td><td><span class="tag ${critical ? 'tag-critical' : 'tag-normal'}">${critical ? 'SÍ' : 'NO'}</span></td></tr>`; }).join('')}</tbody></table>`; }

  function networkControls(kind) { return `<div class="network-controls"><span class="network-help">Mueve los nodos libremente · Ajustar encaja la red · zoom 45–220%</span><button class="button button-light button-small" data-network-action="fit" data-kind="${kind}">Ajustar</button><button class="icon-button" data-network-action="minus" data-kind="${kind}" aria-label="Alejar">−</button><span class="zoom-label" data-zoom-label="${kind}">${Math.round(state.zoom[kind] * 100)}%</span><button class="icon-button" data-network-action="plus" data-kind="${kind}" aria-label="Acercar">+</button><button class="button button-light button-small" data-network-action="reset" data-kind="${kind}">Reordenar</button></div>`; }

  function networkLayout(activities, calc, kind) {
    const rank = {};
    const getRank = (id) => { if (rank[id] !== undefined) return rank[id]; const preds = calc.preds[id] || []; rank[id] = preds.length ? Math.max(...preds.map((pred) => getRank(pred) + 1)) : 0; return rank[id]; };
    activities.forEach((activity) => getRank(activity.id));
    const groups = {};
    activities.forEach((activity) => (groups[rank[activity.id]] ||= []).push(activity.id));
    const maxRank = Math.max(...Object.keys(groups).map(Number), 0);
    const maxGroup = Math.max(...Object.values(groups).map((group) => group.length), 1);
    const width = Math.max(1500, 180 + (maxRank + 1) * 150);
    const height = Math.max(680, 220 + maxGroup * 120);
    const stored = state.layouts[kind] || {};
    const positions = {};
    Object.entries(groups).forEach(([rankNumber, ids]) => ids.forEach((id, index) => { const defaultPosition = { x: 90 + Number(rankNumber) * 145, y: 120 + index * 115 + Math.max(0, (height - 220 - ids.length * 115) / 2) }; positions[id] = stored[id] || defaultPosition; }));
    state.layouts[kind] = { ...stored, ...positions };
    return { positions, width, height };
  }

  function networkSVG(activities, calc, kind) {
    const layout = networkLayout(activities, calc, kind);
    const criticalIds = new Set(calc.critical);
    const edges = activities.flatMap((activity) => calc.succ[activity.id].map((successor) => { const p = layout.positions[activity.id]; const q = layout.positions[successor]; const critical = criticalIds.has(activity.id) && criticalIds.has(successor) && Math.abs(calc.byId[successor].ES - calc.byId[activity.id].EF) < 0.001; return `<path class="edge ${critical ? 'edge-critical' : ''}" data-edge-from="${esc(activity.id)}" data-edge-to="${esc(successor)}" d="${edgePath(p, q)}" marker-end="url(#arrow-${kind})"></path>`; })).join('');
    const nodes = activities.map((activity) => { const position = layout.positions[activity.id]; const result = calc.byId[activity.id]; const critical = criticalIds.has(activity.id); return `<g class="node ${critical ? 'node-critical' : ''}" data-node="${esc(activity.id)}" data-x="${position.x}" data-y="${position.y}" transform="translate(${position.x},${position.y})"><title>${esc(activity.id)} · ${esc(activity.name)}</title><circle r="31"></circle><text y="-5" class="node-id">${esc(activity.id)}</text><text y="12" class="node-d">d=${num(result.duration)}</text><text y="-44" class="node-time">${num(result.ES)} | ${num(result.EF)}</text><text y="49" class="node-time">${num(result.LS)} | ${num(result.LF)}</text></g>`; }).join('');
    return `<div class="network-wrap"><svg class="network-svg" data-kind="${kind}" viewBox="0 0 ${layout.width} ${layout.height}" style="width:${layout.width}px;height:${layout.height}px;zoom:${state.zoom[kind]}" role="img" aria-label="Malla ${kind === 'cpm' ? 'CPM' : 'PERT'}"><defs><marker id="arrow-${kind}" markerWidth="9" markerHeight="9" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#4f8bd9"></path></marker></defs>${edges}${nodes}</svg></div>`;
  }

  function edgePath(p, q) { const mid = (p.x + q.x) / 2; return `M ${p.x + 32} ${p.y} C ${mid} ${p.y}, ${mid} ${q.y}, ${q.x - 32} ${q.y}`; }

  function bindNetwork(kind) {
    const svg = document.querySelector(`.network-svg[data-kind="${kind}"]`);
    if (!svg) return;
    const readPoint = (event) => { const matrix = svg.getScreenCTM(); if (!matrix) return null; const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse()); return { x: point.x, y: point.y }; };
    const updateEdges = () => { const points = Object.fromEntries([...svg.querySelectorAll('.node')].map((node) => [node.dataset.node, { x: numberValue(node.dataset.x), y: numberValue(node.dataset.y) }])); svg.querySelectorAll('[data-edge-from]').forEach((edge) => { const from = points[edge.dataset.edgeFrom]; const to = points[edge.dataset.edgeTo]; if (from && to) edge.setAttribute('d', edgePath(from, to)); }); };
    const stopDrag = (node, event) => { node.classList.remove('dragging'); try { node.releasePointerCapture(event.pointerId); } catch (_) {} state.layouts[kind][node.dataset.node] = { x: numberValue(node.dataset.x), y: numberValue(node.dataset.y) }; };
    svg.querySelectorAll('.node').forEach((node) => {
      node.addEventListener('pointerdown', (event) => { event.preventDefault(); const point = readPoint(event); if (!point) return; node.setPointerCapture(event.pointerId); node.dataset.dx = numberValue(node.dataset.x) - point.x; node.dataset.dy = numberValue(node.dataset.y) - point.y; node.classList.add('dragging'); });
      node.addEventListener('pointermove', (event) => { if (!node.classList.contains('dragging')) return; const point = readPoint(event); if (!point) return; const x = Math.max(40, Math.min(numberValue(svg.viewBox.baseVal.width) - 40, point.x + numberValue(node.dataset.dx))); const y = Math.max(48, Math.min(numberValue(svg.viewBox.baseVal.height) - 48, point.y + numberValue(node.dataset.dy))); node.dataset.x = x; node.dataset.y = y; node.setAttribute('transform', `translate(${x},${y})`); updateEdges(); });
      node.addEventListener('pointerup', (event) => stopDrag(node, event));
      node.addEventListener('pointercancel', (event) => stopDrag(node, event));
    });
    document.querySelectorAll(`[data-network-action][data-kind="${kind}"]`).forEach((button) => button.addEventListener('click', () => { const action = button.dataset.networkAction; if (action === 'reset') { state.layouts[kind] = {}; render(); return; } if (action === 'fit') { state.zoom[kind] = .48; svg.style.zoom = state.zoom[kind]; const label = document.querySelector(`[data-zoom-label="${kind}"]`); if (label) label.textContent = '48%'; return; } state.zoom[kind] = Math.max(.45, Math.min(2.2, state.zoom[kind] + (action === 'plus' ? .15 : -.15))); svg.style.zoom = state.zoom[kind]; const label = document.querySelector(`[data-zoom-label="${kind}"]`); if (label) label.textContent = Math.round(state.zoom[kind] * 100) + '%'; }));
  }

  function bindCPM() {
    $('#recalculateCPM')?.addEventListener('click', () => { readCPMInputs(); state.lookaheadRows = null; render(); });
    $('#pasteCPM')?.addEventListener('click', async () => { let text = ''; try { text = await navigator.clipboard.readText(); } catch (_) { text = window.prompt('Pegue tres columnas: Partida, Predecesora, Duración'); } if (!text) return; const rows = text.trim().split(/\r?\n/).map((line) => line.split(/\t|;/)); const parsed = rows.filter((row) => row.length >= 3 && /^[A-Za-z]+$/.test(String(row[0]).trim())).map((row) => ({ id: String(row[0]).trim().toUpperCase(), pred: String(row[1] || '').trim(), duration: Number(String(row[2]).replace(',', '.')) || 0 })); if (parsed.length) { state.activities = parsed.map((item, index) => ({ ...(state.activities[index] || {}), ...item, name: state.activities[index]?.name || item.id })); render(); } });
    $('#exportCPM')?.addEventListener('click', () => { readCPMInputs(); const calc = calculateCPM(state.activities); downloadCSV('cpm_resultados.csv', cpmCSV(state.activities, calc)); });
    bindNetwork('cpm');
  }

  function readCPMInputs() { state.activities.forEach((activity) => { const predecessor = document.querySelector(`.cpm-pred[data-id="${activity.id}"]`); const duration = document.querySelector(`.cpm-duration[data-id="${activity.id}"]`); if (predecessor) activity.pred = predecessor.value; if (duration) activity.duration = Number(duration.value) || 0; }); }
  function cpmCSV(activities, calc) { const rows = [['Partida', 'Predecesoras', 'Duración (d)', 'IT', 'FT', 'ITa', 'FTa', 'Holgura total', 'Holgura libre', 'Crítica']]; activities.forEach((activity) => { const row = calc.byId[activity.id]; rows.push([activity.id, activity.pred || '—', row.duration, row.ES, row.EF, row.LS, row.LF, row.slack, row.free, Math.abs(row.slack) < .0001 ? 'SÍ' : 'NO']); }); return rows.map((row) => row.map(csvCell).join(';')).join('\n'); }

  function pertView() {
    const normalized = state.pertActivities.map((activity) => ({ ...activity, te: (numberValue(activity.to) + 4 * numberValue(activity.tm) + numberValue(activity.tp)) / 6 }));
    const calc = calculateCPM(normalized, 'te');
    state.lastPERT = calc;
    return `<div class="section-summary compact-summary"><div><span class="overline">ES3 · IND. 4</span><h3>PERT con red basada en tiempos esperados</h3><p>Los nodos y holguras se calculan con te; cambia to, tm o tp y vuelve a generar la malla.</p></div><div class="interactive-badge">σ Incertidumbre realista</div></div><div class="pert-layout"><div class="card input-panel"><div class="card-head"><div><span class="overline">Tres puntos</span><h3>Estimaciones editables</h3><p>Optimista · probable · pesimista</p></div></div><div class="card-body"><div class="formula-card"><strong>Fórmula PERT</strong><span>te = (to + 4 tm + tp) / 6</span><span>Varianza = ((tp − to) / 6)²</span></div><div class="input-scroll"><table class="input-table"><thead><tr><th>Act.</th><th>to</th><th>tm</th><th>tp</th></tr></thead><tbody>${state.pertActivities.map((activity) => `<tr><td><strong>${esc(activity.id)}</strong></td><td><input class="pert-val" data-id="${esc(activity.id)}" data-key="to" type="number" step="0.01" value="${numberValue(activity.to)}"></td><td><input class="pert-val" data-id="${esc(activity.id)}" data-key="tm" type="number" step="0.01" value="${numberValue(activity.tm)}"></td><td><input class="pert-val" data-id="${esc(activity.id)}" data-key="tp" type="number" step="0.01" value="${numberValue(activity.tp)}"></td></tr>`).join('')}</tbody></table></div><button class="button button-primary" id="recalculatePERT" style="margin-top:14px">⚡ Recalcular PERT</button></div></div><div class="card network-card"><div class="card-head"><div><span class="overline">Malla esperada</span><h3>PERT · diagrama de actividades</h3><p>Arrastra los nodos y usa el zoom para presentar la red con claridad.</p></div><div class="network-legend"><span><i class="dot dot-red"></i>Ruta crítica</span><span><i class="dot dot-blue"></i>Relación no crítica</span></div></div><div class="card-body">${networkControls('pert')}${networkSVG(normalized, calc, 'pert')}</div></div></div><div class="summary-strip"><div class="highlight"><span class="label">Plazo esperado</span><span class="value">${num(calc.projectFinish)} d</span><small>Con tiempos esperados PERT</small></div><div class="critical-box"><strong>Ruta crítica PERT</strong><span>${esc(criticalRoute(calc))}</span><small>La incertidumbre se concentra en esta cadena.</small></div></div><div class="card calc-table"><div class="card-head"><div><span class="overline">Resultado numérico</span><h3>Tabla PERT multiactividad</h3><p>El rango entre to y tp representa suministro, clima, interferencias, retrabajos y recepción.</p></div><button class="button button-light" id="exportPERT">CSV</button></div><div class="table-scroll">${pertResultsTable(state.pertActivities, normalized, calc)}</div></div>`;
  }

  function pertResultsTable(input, normalized, calc) { return `<table><thead><tr><th>Partida</th><th>Pred.</th><th>to</th><th>tm</th><th>tp</th><th>te</th><th>Varianza</th><th>Desv. estándar</th><th>IT</th><th>FT</th><th>ITa</th><th>FTa</th><th>Holgura</th><th>Crítica</th><th>Riesgo dominante</th></tr></thead><tbody>${input.map((activity, index) => { const normalizedActivity = normalized[index]; const row = calc.byId[activity.id]; const critical = Math.abs(row.slack) < .0001; const variance = Math.pow((numberValue(activity.tp) - numberValue(activity.to)) / 6, 2); return `<tr class="${critical ? 'critical-row' : ''}"><td><strong>${esc(activity.id)}</strong><br><small>${esc(activity.name)}</small></td><td>${esc(activity.pred || '—')}</td><td>${num(activity.to)}</td><td>${num(activity.tm)}</td><td>${num(activity.tp)}</td><td><strong>${num(normalizedActivity.te)}</strong></td><td>${num(variance)}</td><td>${num(Math.sqrt(variance))}</td><td>${num(row.ES)}</td><td>${num(row.EF)}</td><td>${num(row.LS)}</td><td>${num(row.LF)}</td><td>${num(row.slack)}</td><td><span class="tag ${critical ? 'tag-critical' : 'tag-normal'}">${critical ? 'SÍ' : 'NO'}</span></td><td>${esc(activity.risk)}</td></tr>`; }).join('')}</tbody></table>`; }

  function bindPERT() { document.querySelectorAll('.pert-val').forEach((element) => element.addEventListener('change', () => { const activity = state.pertActivities.find((item) => item.id === element.dataset.id); if (activity) activity[element.dataset.key] = Number(element.value) || 0; })); $('#recalculatePERT')?.addEventListener('click', () => render()); $('#exportPERT')?.addEventListener('click', () => downloadCSV('pert_resultados.csv', pertCSV())); bindNetwork('pert'); }
  function pertCSV() { const normalized = state.pertActivities.map((activity) => ({ ...activity, te: (numberValue(activity.to) + 4 * numberValue(activity.tm) + numberValue(activity.tp)) / 6 })); const calc = calculateCPM(normalized, 'te'); const rows = [['Partida', 'Predecesoras', 'to', 'tm', 'tp', 'te', 'Varianza', 'Desv. estándar', 'IT', 'FT', 'ITa', 'FTa', 'Holgura', 'Crítica']]; state.pertActivities.forEach((activity) => { const row = calc.byId[activity.id]; const te = (numberValue(activity.to) + 4 * numberValue(activity.tm) + numberValue(activity.tp)) / 6; const variance = Math.pow((numberValue(activity.tp) - numberValue(activity.to)) / 6, 2); rows.push([activity.id, activity.pred || '—', activity.to, activity.tm, activity.tp, te, variance, Math.sqrt(variance), row.ES, row.EF, row.LS, row.LF, row.slack, Math.abs(row.slack) < .0001 ? 'SÍ' : 'NO']); }); return rows.map((row) => row.map(csvCell).join(';')).join('\n'); }

  function ganttView() {
    const normalized = state.pertActivities.map((activity) => ({ ...activity, te: (numberValue(activity.to) + 4 * numberValue(activity.tm) + numberValue(activity.tp)) / 6 }));
    const source = state.ganttMode === 'pert' ? normalized : state.activities;
    const calc = calculateCPM(source, state.ganttMode === 'pert' ? 'te' : 'duration');
    const scale = Math.max(D.metadata.days, Math.ceil(calc.projectFinish));
    const rows = source.map((activity) => ({ ...activity, ...calc.byId[activity.id], start: addDays(state.startDate, calc.byId[activity.id].ES), finish: addDays(state.startDate, Math.max(calc.byId[activity.id].EF - 1, 0)), critical: Math.abs(calc.byId[activity.id].slack) < .0001 }));
    const detailRows = presupuestoRows().filter((row) => row[1] && row[2] && row[9] && row[10]);
    return `<div class="section-summary compact-summary"><div><span class="overline">ES3 · IND. 5</span><h3>Carta Gantt maestra con escala adaptable</h3><p>Elige CPM o PERT esperado y observa cómo cambian las barras y fechas del mismo proyecto.</p></div><div class="interactive-badge">${state.ganttMode === 'pert' ? 'Base PERT' : 'Base CPM'}</div></div><div class="card gantt-card"><div class="card-head"><div><span class="overline">Cronograma integrado</span><h3>150 días corridos · ${state.ganttMode === 'pert' ? 'tiempos esperados' : 'duraciones CPM'}</h3><p>Rojo = ruta crítica · azul = actividades con holgura. La tabla principal resume las 22 actividades y el desglose inferior abre cada partida presupuestaria.</p></div><div class="toolbar compact-toolbar"><label class="inline-field">Base de cálculo<select id="ganttMode"><option value="cpm" ${state.ganttMode === 'cpm' ? 'selected' : ''}>CPM determinístico</option><option value="pert" ${state.ganttMode === 'pert' ? 'selected' : ''}>PERT · te esperado</option></select></label><button class="button button-light" id="exportGantt">CSV</button></div></div><div class="card-body"><div class="gantt-summary"><div class="metric"><div class="label">Inicio</div><div class="value">${date(state.startDate)}</div><div class="hint">editable desde Inicio</div></div><div class="metric"><div class="label">Término de la vista</div><div class="value">${date(addDays(state.startDate, Math.ceil(calc.projectFinish) - 1))}</div><div class="hint">${num(calc.projectFinish)} días calculados</div></div><div class="metric"><div class="label">Actividades</div><div class="value">${num(rows.length)}</div><div class="hint">red completa</div></div><div class="metric"><div class="label">Críticas</div><div class="value">${num(calc.critical.length)}</div><div class="hint">holgura cero</div></div></div><div class="table-scroll"><table class="gantt-table"><thead><tr><th>EDT</th><th>Macro-etapa</th><th>Actividad</th><th>Duración</th><th>Inicio</th><th>Fin</th><th>Escala gráfica</th></tr><tr><th colspan="6"></th><th><div class="gantt-header-track"><span>0</span><span>${Math.round(scale / 3)} d</span><span>${Math.round(scale * 2 / 3)} d</span><span>${scale} d</span></div></th></tr></thead><tbody>${rows.map((activity) => `<tr><td>${esc(activity.edt)}</td><td><span class="stage-pill">${esc(activity.stage)}</span></td><td><strong>${esc(activity.name)}</strong></td><td>${num(activity.duration)} d</td><td>${date(activity.start)}</td><td>${date(activity.finish)}</td><td><div class="gantt-track" style="--gantt-scale:${scale}"><div class="gantt-bar ${activity.critical ? 'critical' : ''}" style="left:${(activity.ES / scale) * 100}%;width:${Math.max((activity.duration / scale) * 100, .7)}%" title="${esc(activity.id)} · ${num(activity.duration)} días"></div></div></td></tr>`).join('')}</tbody></table></div></div></div><div class="legend-row"><span><i class="dot dot-red"></i>Ruta crítica</span><span><i class="dot dot-blue"></i>Actividad con holgura</span><span>La escala se recalcula si PERT supera los 150 días.</span></div><details class="gantt-detail-card"><summary><strong>Ver desglose de partidas presupuestarias</strong><span>${num(detailRows.length)} partidas con fecha</span><span class="summary-chevron">⌄</span></summary><div class="table-scroll"><table><thead><tr><th>Código</th><th>Actividad CPM</th><th>Partida / alcance</th><th>Unidad</th><th>Cantidad</th><th>Inicio</th><th>Fin</th></tr></thead><tbody>${detailRows.map((row) => `<tr><td><strong>${esc(row[0])}</strong></td><td>${esc(row[1])}</td><td>${esc(row[2])}</td><td>${esc(row[3])}</td><td>${num(row[4])}</td><td>${date(row[9])}</td><td>${date(row[10])}</td></tr>`).join('')}</tbody></table></div></details>`;
  }

  function bindGantt() { $('#ganttMode')?.addEventListener('change', (event) => { state.ganttMode = event.target.value; render(); }); $('#exportGantt')?.addEventListener('click', () => downloadCSV('carta_gantt.csv', ganttCSV())); }
  function ganttCSV() { const source = state.ganttMode === 'pert' ? state.pertActivities.map((activity) => ({ ...activity, te: (numberValue(activity.to) + 4 * numberValue(activity.tm) + numberValue(activity.tp)) / 6 })) : state.activities; const calc = calculateCPM(source, state.ganttMode === 'pert' ? 'te' : 'duration'); const rows = [['Partida', 'Actividad', 'Duración', 'Inicio', 'Fin', 'Crítica']]; source.forEach((activity) => { const row = calc.byId[activity.id]; rows.push([activity.id, activity.name, row.duration, addDays(state.startDate, row.ES), addDays(state.startDate, Math.max(row.EF - 1, 0)), Math.abs(row.slack) < .0001 ? 'SÍ' : 'NO']); }); return rows.map((row) => row.map(csvCell).join(';')).join('\n'); }

  function presupuestoRows() { const rows = D.sheets['07_Presupuesto'] || []; const end = rows.findIndex((row) => String(row[0] || '').includes('COMPENSACIÓN')); return rows.slice(3, end > 0 ? end : rows.length).filter((row) => row[0] && row[2]); }
  function presupuestoSummary(label) { const row = (D.sheets['07_Presupuesto'] || []).find((item) => String(item[0] || '').trim() === label); return numberValue(row?.[7]); }
  function presupuestoView() {
    const details = presupuestoRows();
    const directCost = presupuestoSummary('Costo directo') || 72760094.11764702;
    const factors = state.budgetFactors;
    const netEstimate = directCost * (1 + factors.gg + factors.utility);
    const factor = (1 + factors.gg + factors.utility) * (1 + factors.iva);
    const compensated = directCost * factor;
    const saving = D.metadata.municipalBudget - compensated;
    return `<div class="section-summary"><div><span class="overline">ES3 · IND. 6</span><h3>Presupuesto estimado compensado</h3><p>El factor se puede cambiar para ensayar una oferta competitiva sin perder trazabilidad del costo directo.</p></div><div class="mini-stat"><b>${num(details.length)}</b><span>partidas valorizadas</span></div></div><div class="budget-control-grid"><div class="card factor-card"><div class="card-head"><div><span class="overline">Supuestos editables</span><h3>Factor de estimación</h3><p>El monto se recalcula al cambiar los porcentajes.</p></div></div><div class="card-body"><div class="factor-fields"><label>GG %<input data-budget-factor="gg" type="number" step="0.1" value="${(factors.gg * 100).toLocaleString('en-US')}"></label><label>Utilidad %<input data-budget-factor="utility" type="number" step="0.1" value="${(factors.utility * 100).toLocaleString('en-US')}"></label><label>IVA %<input data-budget-factor="iva" type="number" step="0.1" value="${(factors.iva * 100).toLocaleString('en-US')}"></label></div><div class="factor-equation"><span>Factor total</span><strong>(1 + GG + utilidad) × (1 + IVA) = ${num(factor)}</strong></div><div class="source-line">GG base 15.00%, utilidad propuesta 10.00% e IVA 19.00% según la hoja fuente.</div></div></div><div class="budget-formula-card"><span class="overline">Resultado</span><h3>Oferta estimada compensada</h3><div class="big-money">${money(compensated)}</div><div class="formula-lines"><span>Costo directo <b>${money(directCost)}</b></span><span>Subtotal neto <b>${money(netEstimate)}</b></span><span>Factor aplicado <b>${num(factor)}</b></span><span>Ahorro frente al presupuesto municipal <b class="${saving >= 0 ? 'positive' : 'negative'}">${money(saving)}</b></span></div></div></div><div class="budget-compensation-line card"><div><span class="overline">Compensación visible</span><h3>Del costo directo a la oferta competitiva</h3><p>Este renglón deja explícito qué monto se multiplica, por qué factor y a qué resultado llega.</p></div><strong>${money(directCost)} × ${num(factor)} = ${money(compensated)}</strong><small>Factor = (1.00 + ${pct(factors.gg)} + ${pct(factors.utility)}) × (1.00 + ${pct(factors.iva)})</small></div><div class="budget-metrics metric-grid"><div class="metric"><div class="label">Costo directo</div><div class="value">${money(directCost)}</div><div class="hint">Suma de partidas</div></div><div class="metric"><div class="label">Gastos generales</div><div class="value">${money(directCost * factors.gg)}</div><div class="hint">${pct(factors.gg)} del costo directo</div></div><div class="metric"><div class="label">Utilidad</div><div class="value">${money(directCost * factors.utility)}</div><div class="hint">${pct(factors.utility)} propuesta</div></div><div class="metric"><div class="label">Presupuesto municipal</div><div class="value">${money(D.metadata.municipalBudget)}</div><div class="hint">Techo de comparación</div></div></div><div class="card table-card"><div class="card-head"><div><span class="overline">Detalle de costos</span><h3>Partidas y precios referenciales</h3><p>Los datos se conservan desde la base; los precios son orientativos para el ejercicio académico.</p></div><button class="button button-light" id="exportBudget">CSV</button></div><div class="card-body"><div class="toolbar"><input class="search" id="budgetSearch" placeholder="Buscar código, actividad o alcance…"><span class="muted">${num(details.length)} partidas · código municipal conservado</span></div><div class="table-scroll"><table id="budgetTable"><thead><tr><th>Código</th><th>Act.</th><th>Partida / alcance</th><th>Unidad</th><th>Cantidad</th><th>P.U. con IVA</th><th>Costo directo</th><th>Venta neta</th><th>Inicio</th><th>Fin</th></tr></thead><tbody>${details.map((row) => `<tr data-search="${esc(row.join(' '))}"><td><strong>${esc(row[0])}</strong></td><td>${esc(row[1])}</td><td>${esc(row[2])}</td><td>${esc(row[3])}</td><td>${num(row[4])}</td><td>${money(row[5])}</td><td>${money(row[7])}</td><td>${money(row[8])}</td><td>${date(row[9])}</td><td>${date(row[10])}</td></tr>`).join('')}</tbody></table></div></div></div>`;
  }

  function budgetUnitComparison() { const factor = (1 + state.budgetFactors.gg + state.budgetFactors.utility) * (1 + state.budgetFactors.iva); const rows = presupuestoRows(); return `<div class="card unit-price-card"><div class="card-head"><div><span class="overline">Comparación solicitada</span><h3>Precio unitario normal versus compensado</h3><p>Precio unitario compensado = precio unitario normal neto × factor ${num(factor)}. El precio unitario con IVA de referencia se mantiene en la tabla principal.</p></div></div><div class="card-body"><div class="table-scroll"><table><thead><tr><th>Código</th><th>Partida</th><th>Unidad</th><th>P.U. normal neto</th><th>Factor</th><th>P.U. compensado neto</th></tr></thead><tbody>${rows.map((row) => `<tr><td><strong>${esc(row[0])}</strong></td><td>${esc(row[2])}</td><td>${esc(row[3])}</td><td>${money(row[6])}</td><td>${num(factor)}</td><td><strong class="compensated-price">${money(numberValue(row[6]) * factor)}</strong></td></tr>`).join('')}</tbody></table></div></div></div>`; }
  function bindPresupuesto() { const unitTable = $('#budgetTable')?.closest('.table-card'); if (unitTable) unitTable.insertAdjacentHTML('beforebegin', budgetUnitComparison()); document.querySelectorAll('[data-budget-factor]').forEach((input) => input.addEventListener('change', () => { state.budgetFactors[input.dataset.budgetFactor] = Math.max(0, Number(input.value) / 100 || 0); render(); })); $('#budgetSearch')?.addEventListener('input', filterRows('#budgetTable')); $('#exportBudget')?.addEventListener('click', () => downloadCSV('presupuesto_partidas.csv', presupuestoRows().map((row) => row.map(csvCell).join(';')).join('\n'))); }

  function curvasView() {
    const data = rowsByHeader('08_Curvas_S', 'Semana').filter((row) => /^\d+$/.test(String(row[0] ?? '').trim()) && row[1] && row[2]);
    const last = data[data.length - 1] || [];
    const clamp = (value) => Math.min(100, Math.max(0, Number(value) || 0));
    const physical = data.map((row) => clamp(numberValue(row[4]) * 100));
    const directTop = Math.max(...data.map((row) => numberValue(row[6])), 1);
    const salesTop = Math.max(...data.map((row) => numberValue(row[8])), 1);
    const direct = data.map((row) => clamp(numberValue(row[6]) / directTop * 100));
    const sales = data.map((row) => clamp(numberValue(row[8]) / salesTop * 100));
    return `<div class="section-summary"><div><span class="overline">ES3 · IND. 7</span><h3>Curvas S: avance físico y financiero</h3><p>La curva muestra cómo se acumulan producción, costo directo y venta neta a través de las semanas del programa.</p></div><div class="mini-stat"><b>${num(data.length)}</b><span>semanas modeladas</span></div></div><div class="chart-card card"><div class="card-head"><div><span class="overline">Lectura acumulada</span><h3>Avance del proyecto</h3><p>Las líneas se expresan como porcentaje acumulado del total.</p></div><div class="chart-legend"><span><i class="legend-line blue"></i>Físico</span><span><i class="legend-line orange"></i>Costo directo</span><span><i class="legend-line green"></i>Venta neta</span></div></div><div class="card-body">${lineChart([{ label: 'Físico', color: '#2563eb', values: physical }, { label: 'Costo directo', color: '#f97316', values: direct }, { label: 'Venta neta', color: '#16a34a', values: sales }], 100)}<div class="chart-caption"><span>Inicio: ${date(data[0]?.[1])}</span><strong>Avance físico final: ${pct(last[4])}</strong><span>Término: ${date(last[2])}</span></div></div></div><div class="curve-method-grid"><article><b>01 · Físico acumulado</b><code>Σ jornadas ejecutadas ÷ Σ jornadas totales</code><span>Se ponderan las jornadas planificadas de las 22 actividades; no es un promedio simple de porcentajes.</span></article><article><b>02 · Costo directo</b><code>Σ costo directo al corte ÷ costo directo total</code><span>El numerador viene del presupuesto y se distribuye según el avance semanal.</span></article><article><b>03 · Venta neta</b><code>Σ venta neta al corte ÷ venta neta total</code><span>Permite comparar producción con lo valorizable en EEPP, sin confundir venta con costo.</span></article></div><div class="chart-kpis"><div class="metric"><div class="label">Avance físico final</div><div class="value">${pct(last[4])}</div><div class="hint">ponderado por jornadas</div></div><div class="metric"><div class="label">Costo directo acumulado</div><div class="value">${money(last[6])}</div><div class="hint">al último corte</div></div><div class="metric"><div class="label">Venta neta acumulada</div><div class="value">${money(last[8])}</div><div class="hint">escenario de oferta</div></div></div><div class="card table-card"><div class="card-head"><div><span class="overline">Datos semanales</span><h3>Tabla de avance acumulado</h3></div><button class="button button-light" id="exportCurvas">CSV</button></div><div class="card-body"><div class="table-scroll">${simpleTable(['Semana', 'Desde', 'Hasta', 'Físico período', 'Físico acumulado', 'CD acumulado', 'Venta neta acum.'], data.map((row) => [num(row[0]), date(row[1]), date(row[2]), pct(row[3]), pct(row[4]), money(row[6]), money(row[8])]))}</div></div></div>`;
  }

  function bindCurvas() { $('#exportCurvas')?.addEventListener('click', () => downloadCSV('curvas_s.csv', (D.sheets['08_Curvas_S'] || []).map((row) => row.map(csvCell).join(';')).join('\n'))); }

  function flujoView() {
    const data = rowsByHeader('09_Flujo_Caja', 'Mes').filter((row) => /^\d{4}-\d{2}-\d{2}$/.test(String(row[0] || '').trim()));
    const maxCapital = Math.max(...data.map((row) => numberValue(row[14])), 0);
    const ending = data[data.length - 1] || [];
    const best = data.reduce((max, row) => numberValue(row[11]) > numberValue(max?.[11]) ? row : max, data[0]);
    const totalEgress = data.reduce((sum, row) => sum + numberValue(row[4]) + numberValue(row[5]) + numberValue(row[6]) + numberValue(row[7]) + numberValue(row[8]), 0);
    return `<div class="section-summary"><div><span class="overline">ES3 · IND. 8</span><h3>Flujo de caja mensual</h3><p>Separa lo que se devenga, se factura, se cobra y se paga para visualizar el capital de trabajo.</p></div><div class="mini-stat danger-stat"><b>${money(maxCapital)}</b><span>capital máximo requerido</span></div></div><div class="flow-kpis metric-grid"><div class="metric accent-red"><div class="label">Capital máximo</div><div class="value">${money(maxCapital)}</div><div class="hint">déficit acumulado</div></div><div class="metric"><div class="label">Saldo operativo final</div><div class="value">${money(ending[11])}</div><div class="hint">mes de cierre modelado</div></div><div class="metric"><div class="label">Mejor saldo mensual</div><div class="value">${money(best?.[11])}</div><div class="hint">${date(best?.[0])}</div></div><div class="metric"><div class="label">Cobros netos</div><div class="value">${money(data.reduce((sum, row) => sum + numberValue(row[1]), 0))}</div><div class="hint">EEPP proyectados</div></div></div><div class="chart-card card"><div class="card-head"><div><span class="overline">Tensión financiera</span><h3>Saldo operativo y saldo acumulado</h3><p>Las barras muestran el saldo de cada mes en millones de pesos; la línea violeta muestra cómo se acumula ese saldo.</p></div></div><div class="card-body">${flowChart(data)}<div class="chart-caption"><span>Barra negativa = egresos mayores que cobros</span><span>Capital máximo: ${money(maxCapital)}</span></div></div></div><div class="flow-reading-grid"><article><b>1 · Cobros</b><code>EEPP aprobados + IVA − retenciones</code><span>Es el dinero que entra según estados de pago y condiciones de cobro.</span></article><article><b>2 · Egresos</b><code>Materiales + sueldos + subcontratos + equipos + GG</code><span>Son las salidas necesarias para producir el avance del programa.</span></article><article><b>3 · Saldo operativo</b><code>Cobros − egresos</code><span>Si es negativo, ese mes la obra necesita financiamiento.</span></article><article><b>4 · Capital de trabajo</b><code>Máximo del déficit acumulado</code><span>Referencia de caja que conviene reservar para no detener la obra.</span></article></div><div class="card table-card"><div class="card-head"><div><span class="overline">Detalle mensual</span><h3>Ingresos, egresos y saldos</h3><p>Total de egresos modelados: ${money(totalEgress)}. Todos los importes se muestran con dos decimales.</p></div><button class="button button-light" id="exportFlujo">CSV</button></div><div class="card-body"><div class="table-scroll">${simpleTable(['Mes', 'Cobros netos', 'Materiales', 'Sueldos', 'Subcontratos', 'Equipos', 'GG', 'Saldo operativo', 'Saldo acumulado', 'Necesidad de capital'], data.map((row) => [date(row[0]), money(row[1]), money(row[4]), money(row[5]), money(row[6]), money(row[7]), money(row[8]), money(row[11]), money(row[12]), money(row[14])]))}</div></div></div>`;
  }

  function bindFlujo() { $('#exportFlujo')?.addEventListener('click', () => downloadCSV('flujo_caja.csv', (D.sheets['09_Flujo_Caja'] || []).map((row) => row.map(csvCell).join(';')).join('\n'))); }

  function rowsByHeader(sheetName, label) { const rows = D.sheets[sheetName] || []; const index = rows.findIndex((row) => row.some((cell) => String(cell || '').trim() === label)); return index < 0 ? [] : rows.slice(index + 1); }

  function lookaheadData() {
    if (!state.lookaheadRows) {
      const templates = rowsByHeader('10_Lookahead', 'Fecha').filter((row) => row[0]).reduce((map, row) => { map[String(row[1]).trim().toUpperCase()] = row; return map; }, {});
      const calc = calculateCPM(state.activities);
      const windowSize = 14;
      const totalDays = Math.max(D.metadata.days, Math.ceil(calc.projectFinish));
      const rows = [];
      state.activities.forEach((activity) => {
        const timing = calc.byId[activity.id];
        const windowIndex = Math.min(Math.floor(timing.ES / windowSize), Math.floor((totalDays - 1) / windowSize));
        const windowStartOffset = windowIndex * windowSize;
        const template = templates[activity.id] || [];
        const responsible = template[3] || (activity.stage === 'Terminaciones' ? 'Capataz Terminaciones' : activity.stage === 'Obra Gruesa' ? 'Capataz Obra Gruesa' : activity.stage === 'Instalaciones' ? 'Jefe de Terreno / especialista' : 'Administrador / Jefe de Terreno');
        rows.push({ window: windowIndex + 1, windowStart: addDays(state.startDate, windowStartOffset), windowEnd: addDays(state.startDate, Math.min(totalDays - 1, windowStartOffset + windowSize - 1)), date: addDays(state.startDate, timing.ES), id: activity.id, commitment: template[2] || `Liberar frente y verificar restricciones: ${activity.name}`, responsible, resources: template[4] || `Cuadrilla asignada · ${activity.stage}`, materials: template[5] || `Confirmar materiales y equipos para ${activity.name}`, permits: template[6] || 'Revisar planos vigentes, permiso de trabajo y liberación PAC/SSOMA', access: template[7] || 'Frente despejado, acopios definidos y acceso coordinado', compliance: template[8] || 'No evaluado', release: template[9] || 'Por liberar' });
      });
      state.lookaheadRows = rows.sort((a, b) => a.window - b.window || a.date.localeCompare(b.date));
    }
    return state.lookaheadRows;
  }

  function lookaheadView() {
    const rows = lookaheadData();
    const windows = [...new Set(rows.map((row) => row.window))].map((window) => rows.filter((row) => row.window === window));
    const notEvaluated = rows.filter((row) => String(row.compliance).toLowerCase().includes('no evaluado')).length;
    const released = rows.filter((row) => String(row.release).toLowerCase().includes('liberad')).length;
    return `<div class="section-summary"><div><span class="overline">ES3 · IND. 9 · COMPROMISOS</span><h3>Compromisos de corto plazo para toda la obra</h3><p>En español: cada ventana de 14 días revisa las restricciones de las actividades que comienzan en ese período. Se muestran desde el 02-11-2026 hasta el cierre del proyecto.</p></div><div class="mini-stat"><b>${num(rows.length)}</b><span>compromisos del proyecto</span></div></div><div class="lookahead-kpis metric-grid"><div class="metric"><div class="label">Ventanas</div><div class="value">${num(windows.length)}</div><div class="hint">bloques de 14 días</div></div><div class="metric accent-orange"><div class="label">Por evaluar</div><div class="value">${num(notEvaluated)}</div><div class="hint">cumplimiento real</div></div><div class="metric accent-green"><div class="label">Liberados</div><div class="value">${num(released)}</div><div class="hint">restricciones resueltas</div></div><div class="metric"><div class="label">Responsables</div><div class="value">${num(new Set(rows.map((row) => row.responsible)).size)}</div><div class="hint">roles de terreno</div></div></div><div class="card commitments-card"><div class="card-head"><div><span class="overline">Tablero de restricciones</span><h3>Abre cada ventana de 14 días</h3><p>Los campos “cumplimiento real” y “liberación” son editables. El CSV exporta toda la obra, no solo la primera ventana.</p></div><button class="button button-light" id="exportLookahead">CSV</button></div><div class="card-body"><div class="commitment-windows">${windows.map((group, windowIndex) => `<details class="commitment-window" ${windowIndex === 0 ? 'open' : ''}><summary><span><strong>Ventana ${num(group[0].window)}</strong><small>${date(group[0].windowStart)} → ${date(group[0].windowEnd)}</small></span><b>${num(group.length)} compromisos</b><span class="summary-chevron">⌄</span></summary><div class="commitment-list">${group.map((row) => { const index = rows.indexOf(row); return `<article class="commitment-card"><div class="commitment-date"><b>${date(row.date)}</b><span>${esc(row.id)}</span></div><div class="commitment-main"><h4>${esc(row.commitment)}</h4><div class="commitment-meta"><span><small>Responsable</small>${esc(row.responsible)}</span><span><small>Recursos</small>${esc(row.resources)}</span><span><small>Materiales</small>${esc(row.materials)}</span></div><details><summary>Ver permisos y acceso</summary><div class="restriction-grid"><span><small>Permisos</small>${esc(row.permits)}</span><span><small>Terreno / acceso</small>${esc(row.access)}</span></div></details></div><div class="commitment-edit"><label>Cumplimiento real<select data-lookahead="${index}" data-key="compliance"><option ${row.compliance === 'No evaluado' ? 'selected' : ''}>No evaluado</option><option ${row.compliance === 'Cumplido' ? 'selected' : ''}>Cumplido</option><option ${row.compliance === 'Con observación' ? 'selected' : ''}>Con observación</option></select></label><label>Liberación<select data-lookahead="${index}" data-key="release"><option ${row.release === 'Por liberar' ? 'selected' : ''}>Por liberar</option><option ${row.release === 'Liberado' ? 'selected' : ''}>Liberado</option><option ${row.release === 'Observado' ? 'selected' : ''}>Observado</option></select></label></div></article>`; }).join('')}</div></details>`).join('')}</div></div></div>`;
  }

  function bindLookahead() { document.querySelectorAll('[data-lookahead]').forEach((element) => element.addEventListener('change', () => { state.lookaheadRows[Number(element.dataset.lookahead)][element.dataset.key] = element.value; })); $('#exportLookahead')?.addEventListener('click', () => downloadCSV('compromisos_corto_plazo.csv', lookaheadData().map((row) => Object.values(row).map(csvCell).join(';')).join('\n'))); }

  function fullEEPPRows() {
    const cuts = ['2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28', '2027-03-31'];
    const items = presupuestoRows().filter((row) => /^[A-Z]$/.test(String(row[1] || '').trim()) && row[2] && row[9] && row[10]);
    const day = (value) => new Date(String(value).slice(0, 10) + 'T12:00:00').getTime();
    const rows = [];
    const previous = {};
    cuts.forEach((cut) => items.forEach((item) => {
      const start = day(item[9]);
      const finish = day(item[10]);
      const span = Math.max(1, Math.round((finish - start) / 86400000) + 1);
      const progress = Math.max(0, Math.min(1, (day(cut) - start + 86400000) / (span * 86400000)));
      const prior = previous[item[0]] || 0;
      const periodProgress = Math.max(0, progress - prior);
      previous[item[0]] = progress;
      const quantity = numberValue(item[4]);
      const direct = numberValue(item[7]);
      const sale = numberValue(item[8]);
      const activity = D.activities.find((entry) => entry.id === item[1]);
      rows.push({ cut, code: item[0], activityId: item[1], activityName: activity?.name || item[1], item: item[2], unit: item[3], quantity, periodQuantity: quantity * periodProgress, accumulatedQuantity: quantity * progress, progress, directAccumulated: direct * progress, salePeriod: sale * periodProgress, balanceDirect: direct * (1 - progress), control: progress === 0 ? 'Sin avance' : progress >= 1 ? 'Consistente' : 'En ejecución' });
    }));
    return rows;
  }

  function eeppView() {
    const data = fullEEPPRows();
    const cuts = [...new Set(data.map((row) => row.cut))];
    const items = presupuestoRows().filter((row) => /^[A-Z]$/.test(String(row[1] || '').trim()) && row[2] && row[9] && row[10]);
    const lastCut = data.filter((row) => row.cut === cuts[cuts.length - 1]);
    const totalContract = items.reduce((sum, row) => sum + numberValue(row[4]), 0);
    const periodValue = lastCut.reduce((sum, row) => sum + row.salePeriod, 0);
    const accumulated = lastCut.reduce((sum, row) => sum + row.directAccumulated, 0);
    const averageProgress = lastCut.length ? lastCut.reduce((sum, row) => sum + row.progress, 0) / lastCut.length : 0;
    const table = (rows) => `<div class="table-scroll"><table><thead><tr><th>Código</th><th>Actividad</th><th>Partida</th><th>Unidad</th><th>Cant. contractual</th><th>Cant. período</th><th>Cant. acumulada</th><th>Avance</th><th>CD acumulado</th><th>Venta período</th><th>Saldo CD</th><th>Control</th></tr></thead><tbody>${rows.map((row) => `<tr><td><strong>${esc(row.code)}</strong></td><td>${esc(row.activityId)} · ${esc(row.activityName)}</td><td>${esc(row.item)}</td><td>${esc(row.unit)}</td><td>${num(row.quantity)}</td><td>${num(row.periodQuantity)}</td><td>${num(row.accumulatedQuantity)}</td><td><div class="progress-cell"><span>${pct(row.progress)}</span><div class="progress"><i style="width:${Math.max(0, Math.min(100, row.progress * 100))}%"></i></div></div></td><td>${money(row.directAccumulated)}</td><td>${money(row.salePeriod)}</td><td>${money(row.balanceDirect)}</td><td><span class="tag ${row.control === 'En ejecución' ? 'tag-warn' : 'tag-normal'}">${esc(row.control)}</span></td></tr>`).join('')}</tbody></table></div>`;
    return `<div class="section-summary"><div><span class="overline">ES3 · IND. 10</span><h3>Estados de pago completos, desde inicio a cierre</h3><p>La información se organiza en cinco cortes mensuales. Cada corte abre todas las partidas valorizadas del proyecto, no solo obra gruesa.</p></div><div class="mini-stat"><b>${num(items.length)}</b><span>partidas por corte</span></div></div><div class="eepp-kpis metric-grid"><div class="metric"><div class="label">Cantidad contractual</div><div class="value">${num(totalContract)}</div><div class="hint">suma indicativa de unidades</div></div><div class="metric accent-blue"><div class="label">Venta del último período</div><div class="value">${money(periodValue)}</div><div class="hint">corte ${date(cuts[cuts.length - 1])}</div></div><div class="metric accent-green"><div class="label">Costo directo acumulado</div><div class="value">${money(accumulated)}</div><div class="hint">al cierre proyectado</div></div><div class="metric accent-orange"><div class="label">Avance promedio</div><div class="value">${pct(averageProgress)}</div><div class="hint">lectura indicativa</div></div></div><div class="card table-card"><div class="card-head"><div><span class="overline">Cortes de pago</span><h3>Detalle completo de cantidades y valorización</h3><p>Abre cada corte para revisar cantidad del período, acumulada, CD, venta y saldo. Para pago real, reemplaza los avances por mediciones aprobadas por ITO.</p></div><button class="button button-light" id="exportEEPP">CSV completo</button></div><div class="card-body"><div class="eepp-periods">${cuts.map((cut, index) => { const rows = data.filter((row) => row.cut === cut); return `<details class="eepp-period" ${index === cuts.length - 1 ? 'open' : ''}><summary><span><strong>Corte ${num(index + 1)} · ${date(cut)}</strong><small>${num(rows.length)} partidas · ${money(rows.reduce((sum, row) => sum + row.salePeriod, 0))} venta del período</small></span><b>${pct(rows.reduce((sum, row) => sum + row.progress, 0) / Math.max(1, rows.length))} avance promedio</b><span class="summary-chevron">⌄</span></summary>${table(rows)}</details>`; }).join('')}</div></div></div><div class="eepp-explain-grid"><article><b>Cantidad del período</b><span>Es la cantidad ejecutada entre el corte anterior y el corte actual.</span></article><article><b>Acumulada</b><span>Es la cantidad del período más lo reconocido en los cortes anteriores.</span></article><article><b>Venta del período</b><span>Cantidad del período × precio de venta neto. Es la base valorizable del EEPP.</span></article><article><b>Saldo CD</b><span>Costo directo total − costo directo acumulado. Indica lo que falta por ejecutar.</span></article></div>`;
  }

  function bindEEPP() { $('#exportEEPP')?.addEventListener('click', () => { const rows = fullEEPPRows(); const header = ['Corte', 'Código', 'Actividad', 'Partida', 'Unidad', 'Cantidad contractual', 'Cantidad período', 'Cantidad acumulada', 'Avance', 'CD acumulado', 'Venta período', 'Saldo CD', 'Control']; const lines = [header, ...rows.map((row) => [row.cut, row.code, row.activityId + ' · ' + row.activityName, row.item, row.unit, row.quantity, row.periodQuantity, row.accumulatedQuantity, row.progress, row.directAccumulated, row.salePeriod, row.balanceDirect, row.control])]; downloadCSV('eepp_proyecto_completo.csv', lines.map((line) => line.map(csvCell).join(';')).join('\n')); }); }

  function riesgosView() {
    const base = rowsByHeader('12_Riesgos', 'ID').filter((row) => /^R\d+$/.test(String(row[0] || '').trim()));
    const extraRisks = [
      ['R10', 'Interferencias entre especialidades y planos', 'Cruces entre estructura, instalaciones y terminaciones generan retrabajo o espera.', 'L-M-N-O-P-Q-R-T-U', 3, 4, 12, 'Mitigar', 'Reunión semanal de coordinación, planos vigentes y RFI con responsable.', 'Aislar frente, emitir solución aprobada y reprogramar sin bloquear la ruta crítica.', 'Oficina Técnica / Coordinador BIM', 'RFI pendiente o plano no liberado antes del frente'],
      ['R11', 'Disponibilidad de cuadrillas especialistas', 'La oferta local puede ser limitada y desplazar instalaciones o terminaciones.', 'L-M-P-Q-R-S-T-U', 3, 4, 12, 'Mitigar', 'Precalificar subcontratos, confirmar fechas y mantener alternativa de respaldo.', 'Redistribuir frentes y activar segundo proveedor aprobado.', 'Administrador / Jefe Terreno', 'Proveedor no confirma ingreso o rendimiento mínimo'],
      ['R12', 'Accidente o incidente de seguridad', 'Un incidente puede detener el frente, generar investigación y afectar plazo/costo.', 'Toda la obra', 2, 5, 10, 'Mitigar / transferir', 'AST, inducción, EPP, segregación, orden y limpieza, inspecciones SSOMA.', 'Detener, atender, investigar, corregir y liberar con autorización SSOMA.', 'Encargado SSOMA', 'Incumplimiento crítico o evento reportable'],
      ['R13', 'No conformidad y retrabajo', 'Una partida rechazada consume horas, materiales y holgura disponible.', 'F-G-H-I-K-L-Q-R-S-T-V', 3, 4, 12, 'Mitigar', 'PAC, puntos de inspección, checklists, recepción de materiales y mock-up.', 'Plan de corrección, responsable, fecha compromiso y reinspección ITO.', 'Encargado PAC / Jefe Terreno', 'Ensayo rechazado, observación ITO o checklist incompleto']
    ];
    const data = base.concat(extraRisks);
    const levels = data.map((row) => numberValue(row[6]));
    const critical = data.filter((row) => numberValue(row[6]) >= 17).length;
    return `<div class="section-summary"><div><span class="overline">ES3 · IND. 11</span><h3>Matriz de riesgos externos de Andacollo</h3><p>La prioridad se entiende en un vistazo: probabilidad × impacto, respuesta y activación.</p></div><div class="mini-stat danger-stat"><b>${num(critical)}</b><span>riesgos críticos</span></div></div><div class="risk-dashboard"><div class="card heatmap-card"><div class="card-head"><div><span class="overline">Mapa P × I</span><h3>Prioridad visual</h3><p>Impacto alto arriba; probabilidad alta a la derecha.</p></div></div><div class="card-body"><div class="heatmap-axis"><span>Impacto</span><div class="heatmap">${[5,4,3,2,1].flatMap((impact) => [1,2,3,4,5].map((prob) => { const count = data.filter((row) => numberValue(row[4]) === prob && numberValue(row[5]) === impact).length; const level = prob * impact; return `<div class="heat-cell risk-${riskLevel(level)}" title="P ${prob} × I ${impact}"><b>${count ? num(count) : ''}</b></div>`; })).join('')}</div><span class="heatmap-bottom">Probabilidad baja → alta</span></div><div class="heat-legend"><span><i class="heat low"></i>Bajo</span><span><i class="heat moderate"></i>Moderado</span><span><i class="heat high"></i>Alto</span><span><i class="heat critical"></i>Crítico</span></div></div></div><div class="risk-summary-stack"><div class="risk-stat"><b>${num(data.length)}</b><span>eventos registrados</span></div><div class="risk-stat"><b>${num(levels.reduce((sum, level) => sum + level, 0) / Math.max(1, levels.length))}</b><span>nivel promedio P×I</span></div><div class="risk-stat"><b>${num(data.filter((row) => String(row[7]).toLowerCase().includes('mitigar')).length)}</b><span>con respuesta de mitigación</span></div></div></div><div class="risk-card-grid">${data.map((row) => `<article class="risk-card risk-border-${riskLevel(row[6])}"><div class="risk-card-head"><span class="risk-id">${esc(row[0])}</span><span class="risk-level risk-${riskLevel(row[6])}">${num(row[6])} · ${riskLabel(row[6])}</span></div><h3>${esc(row[1])}</h3><p>${esc(row[2])}</p><div class="risk-fields"><span><small>Partidas afectadas</small>${esc(row[3])}</span><span><small>Responsable</small>${esc(row[10])}</span></div><div class="risk-actions"><div><small>Prevención</small>${esc(row[8])}</div><div><small>Contingencia</small>${esc(row[9])}</div></div><div class="risk-trigger"><b>Activación</b> ${esc(row[11])}</div></article>`).join('')}</div>`;
  }

  function bindRiesgos() {}
  function riskLevel(level) { const value = numberValue(level); return value >= 17 ? 'critical' : value >= 10 ? 'high' : value >= 5 ? 'moderate' : 'low'; }
  function riskLabel(level) { const value = numberValue(level); return value >= 17 ? 'Crítico' : value >= 10 ? 'Alto' : value >= 5 ? 'Moderado' : 'Bajo'; }

  function controlView() {
    const data = rowsByHeader('13_Control_Terminaciones', 'Act.').filter((row) => /^[A-Z]$/.test(String(row[0] || '').trim()));
    const total = data.reduce((sum, row) => sum + numberValue(row[2]), 0);
    const earned = data.reduce((sum, row) => sum + numberValue(row[7]), 0);
    const real = data.reduce((sum, row) => sum + numberValue(row[6]), 0);
    const index = earned / Math.max(1, real);
    const alerts = data.filter((row) => String(row[12]).toLowerCase().includes('crítica')).length;
    return `<div class="section-summary"><div><span class="overline">ES3 · IND. 12</span><h3>Control de terminaciones y valor ganado</h3><p>PP planificado, CR costo real, VG valor ganado, VC variación de costo e IRC índice de rendimiento.</p></div><div class="mini-stat danger-stat"><b>${alerts}</b><span>alertas críticas</span></div></div><div class="control-kpis metric-grid"><div class="metric"><div class="label">Presupuesto total</div><div class="value">${money(total)}</div><div class="hint">partidas controladas</div></div><div class="metric accent-blue"><div class="label">Valor ganado</div><div class="value">${money(earned)}</div><div class="hint">avance valorizado</div></div><div class="metric accent-orange"><div class="label">Costo real</div><div class="value">${money(real)}</div><div class="hint">incurrido simulado</div></div><div class="metric ${index < 1 ? 'accent-red' : 'accent-green'}"><div class="label">IRC global</div><div class="value">${num(index, 2)}</div><div class="hint">${index < 1 ? 'requiere corrección' : 'desempeño favorable'}</div></div></div><div class="card control-board"><div class="card-head"><div><span class="overline">Semáforo de gestión</span><h3>¿Dónde intervenir primero?</h3></div></div><div class="card-body"><div class="control-bars">${data.map((row) => { const irc = numberValue(row[9]); const stateClass = irc < .95 ? 'bad' : irc < 1 ? 'warn' : 'good'; return `<div class="control-bar-row"><div><strong>${esc(row[0])} · ${esc(row[1])}</strong><span>${esc(row[12])}</span></div><div class="bar-track"><i class="${stateClass}" style="width:${Math.min(100, Math.max(8, irc * 100))}%"></i></div><b>${num(irc, 2)}</b></div>`; }).join('')}</div></div></div><div class="card table-card"><div class="card-head"><div><span class="overline">Detalle de desempeño</span><h3>PP, CR, VG, VC e IRC por terminación</h3></div><button class="button button-light" id="exportControl">CSV</button></div><div class="card-body"><div class="table-scroll"><table><thead><tr><th>Act.</th><th>Terminación</th><th>Presupuesto</th><th>Plan %</th><th>Avance %</th><th>CR</th><th>VG</th><th>VC</th><th>IRC</th><th>Sobrecosto</th><th>Estado</th><th>Medida</th></tr></thead><tbody>${data.map((row) => `<tr class="${String(row[12]).toLowerCase().includes('crítica') ? 'critical-row' : ''}"><td><strong>${esc(row[0])}</strong></td><td>${esc(row[1])}</td><td>${money(row[2])}</td><td>${pct(row[3])}</td><td>${pct(row[5])}</td><td>${money(row[6])}</td><td>${money(row[7])}</td><td>${money(row[8])}</td><td><span class="tag ${numberValue(row[9]) < 1 ? 'tag-critical' : 'tag-normal'}">${num(row[9], 2)}</span></td><td>${pct(row[10])}</td><td>${esc(row[12])}</td><td>${esc(row[13])}</td></tr>`).join('')}</tbody></table></div></div></div>`;
  }

  function controlGlossary() { return `<div class="card control-glossary"><div class="card-head"><div><span class="overline">Lectura didáctica</span><h3>Cómo se construye el control</h3><p>Las siglas comparan presupuesto, avance y costo real sobre el mismo alcance y sin IVA.</p></div></div><div class="card-body"><div class="glossary-grid"><article><b>PP · Presupuesto planificado</b><code>Presupuesto total × % planificado</code><span>Cuánto valor debería estar programado al corte.</span></article><article><b>CR · Costo real</b><code>Facturas + consumos + mano de obra incurrida</code><span>Cuánto se ha gastado realmente para producir.</span></article><article><b>VG · Valor ganado</b><code>Presupuesto total × % de avance medido</code><span>Valor presupuestado del trabajo efectivamente ejecutado.</span></article><article><b>VC · Variación de costo</b><code>VG − CR</code><span>Positivo es favorable; negativo significa que costó más de lo que ganó.</span></article><article><b>IRC · Índice de rendimiento de costo</b><code>VG ÷ CR</code><span>IRC = 1.00 es equilibrio; menor que 1.00 alerta sobrecosto; mayor que 1.00 es favorable.</span></article><article><b>Estado y medida</b><code>Semáforo + acción correctiva</code><span>La medida transforma el indicador en una decisión de gestión.</span></article></div></div></div>`; }
  function bindControl() { const board = $('.control-board'); if (board) board.insertAdjacentHTML('beforebegin', controlGlossary()); $('#exportControl')?.addEventListener('click', () => downloadCSV('control_terminaciones.csv', (D.sheets['13_Control_Terminaciones'] || []).map((row) => row.map(csvCell).join(';')).join('\n'))); }

  function genericSheetView(sheetName) { const rows = D.sheets[sheetName] || []; const tab = TAB_BY_SHEET[sheetName]; const maxCols = Math.max(...rows.map((row) => row.length), 1); return `<div class="card table-card"><div class="card-head"><div><span class="overline">${esc(tab?.[0] || '')}</span><h3>${esc(tab?.[1] || sheetName)}</h3><p>${esc(NOTES[sheetName] || 'Datos trasladados desde la hoja correspondiente del Excel.')}</p></div><button class="button button-light" id="exportSheet">CSV</button></div><div class="card-body"><div class="toolbar"><input class="search" id="sheetSearch" placeholder="Buscar dentro de esta hoja…"><span class="muted">${rows.length} filas · ${maxCols} columnas</span></div><div class="table-scroll"><table id="sheetTable"><thead><tr><th>#</th>${Array.from({ length: maxCols }, (_, index) => `<th>${String.fromCharCode(65 + index)}</th>`).join('')}</tr></thead><tbody>${rows.map((row, rowIndex) => `<tr data-search="${esc(row.join(' '))}"><td class="row-num">${rowIndex + 1}</td>${Array.from({ length: maxCols }, (_, index) => `<td>${cellHTML(row[index])}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div></div>`; }

  function simpleTable(headers, rows) { return `<table><thead><tr>${headers.map((header) => `<th>${esc(header)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cellHTML(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`; }
  function cellText(value) { return String(value ?? '—').replace(/\n/g, ' · '); }
  function cellHTML(value) { if (value === '' || value === null || value === undefined) return '<span class="empty">—</span>'; const string = String(value); if (/^SÍ$/i.test(string)) return '<span class="tag tag-critical">SÍ</span>'; if (/^NO$/i.test(string)) return '<span class="tag tag-normal">NO</span>'; if (/^-?\d+(\.\d+)?$/.test(string) && string.length > 6) return esc(Number(string).toLocaleString('es-CL', { maximumFractionDigits: 2 })); return esc(string).replace(/\n/g, '<br>'); }
  function filterRows(selector) { return (event) => { const term = event.target.value.toLowerCase(); document.querySelectorAll(selector + ' tbody tr').forEach((row) => { row.hidden = Boolean(term) && !row.dataset.search.toLowerCase().includes(term); }); }; }
  function bindSearch() { $('#roleSearch')?.addEventListener('input', filterRows('#roleTable')); $('#rendSearch')?.addEventListener('input', (event) => { const term = event.target.value.toLowerCase(); document.querySelectorAll('.performance-row').forEach((row) => { row.hidden = Boolean(term) && !row.dataset.search.toLowerCase().includes(term); }); document.querySelectorAll('.performance-group').forEach((group) => { if (term) group.open = true; }); }); $('#exportRoles')?.addEventListener('click', () => downloadCSV('matriz_roles.csv', (D.sheets['02_Matriz Roles'] || []).map((row) => row.map(csvCell).join(';')).join('\n'))); }

  function lineChart(series, maxValue) {
    const width = 1050, height = 350, pad = { left: 52, right: 25, top: 25, bottom: 42 }, chartWidth = width - pad.left - pad.right, chartHeight = height - pad.top - pad.bottom, count = Math.max(...series.map((item) => item.values.length), 1), x = (index) => pad.left + index * chartWidth / Math.max(1, count - 1), y = (value) => pad.top + chartHeight - (Number(value) / maxValue) * chartHeight;
    const grid = [0, 25, 50, 75, 100].map((tick) => `<line x1="${pad.left}" x2="${width - pad.right}" y1="${y(tick)}" y2="${y(tick)}" class="chart-gridline"></line><text x="${pad.left - 12}" y="${y(tick) + 4}" text-anchor="end" class="chart-axis">${tick}%</text>`).join('');
    const paths = series.map((item) => { const path = item.values.map((value, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(value)}`).join(' '); const dots = item.values.map((value, index) => `<circle cx="${x(index)}" cy="${y(value)}" r="3.2" fill="${item.color}"></circle>`).join(''); return `<path d="${path}" class="chart-line" stroke="${item.color}"></path>${dots}`; }).join('');
    const labels = Array.from({ length: Math.min(6, count) }, (_, index) => { const sourceIndex = Math.round(index * (count - 1) / Math.max(1, Math.min(6, count) - 1)); return `<text x="${x(sourceIndex)}" y="${height - 12}" text-anchor="middle" class="chart-axis">Sem. ${sourceIndex + 1}</text>`; }).join('');
    return `<div class="chart-wrap"><svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Curva acumulada">${grid}${paths}${labels}</svg></div>`;
  }

  function flowChart(data) {
    const width = 1120, height = 430, pad = { left: 78, right: 30, top: 30, bottom: 72 }, chartWidth = width - pad.left - pad.right, chartHeight = height - pad.top - pad.bottom, values = data.map((row) => numberValue(row[11]) / 1000000), accumulated = data.map((row) => numberValue(row[12]) / 1000000), maxAbs = Math.max(...values.map((value) => Math.abs(value)), ...accumulated.map((value) => Math.abs(value)), 1), x = (index) => pad.left + (index + .5) * chartWidth / Math.max(1, data.length), base = pad.top + chartHeight / 2, scale = (chartHeight / 2 - 35) / maxAbs, barWidth = Math.min(62, chartWidth / Math.max(1, data.length) * .55);
    const ticks = [maxAbs, maxAbs / 2, 0, -maxAbs / 2, -maxAbs].map((tick) => { const y = base - tick * scale; return `<line x1="${pad.left}" x2="${width - pad.right}" y1="${y}" y2="${y}" class="chart-gridline"></line><text x="${pad.left - 11}" y="${y + 4}" text-anchor="end" class="chart-axis">${tick > 0 ? '+' : ''}${tick.toFixed(2)} M</text>`; }).join('');
    const bars = data.map((row, index) => { const value = values[index]; const top = value >= 0 ? base - value * scale : base; const heightValue = Math.max(2, Math.abs(value) * scale); const label = new Date(String(row[0]).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-CL', { month: 'short', year: '2-digit' }); return `<rect x="${x(index) - barWidth / 2}" y="${top}" width="${barWidth}" height="${heightValue}" rx="6" class="cash-bar ${value >= 0 ? 'positive-bar' : 'negative-bar'}"><title>${esc(label)} · saldo operativo ${value.toFixed(2)} M</title></rect><text x="${x(index)}" y="${height - 28}" text-anchor="middle" class="chart-axis">${esc(label)}</text>`; }).join('');
    const line = accumulated.map((value, index) => `${index ? 'L' : 'M'} ${x(index)} ${base - value * scale}`).join(' ');
    const labels = `<text x="${pad.left - 11}" y="${base + 4}" text-anchor="end" class="chart-axis">0.00 M</text><line x1="${pad.left}" x2="${width - pad.right}" y1="${base}" y2="${base}" class="chart-baseline"></line><text x="${pad.left}" y="18" class="chart-axis">Millones de pesos · barras: saldo mensual · línea: saldo acumulado</text>`;
    return `<div class="chart-wrap"><svg class="chart-svg flow-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Flujo de caja mensual">${ticks}${labels}${bars}<path d="${line}" class="chart-line" stroke="#7c3aed"></path>${accumulated.map((value, index) => `<circle cx="${x(index)}" cy="${base - value * scale}" r="4.5" fill="#7c3aed"><title>Saldo acumulado: ${value.toFixed(2)} M</title></circle>`).join('')}</svg></div>`;
  }

  function downloadCSV(name, content) { const blob = new Blob([content], { type: 'text/csv;charset=utf-8' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 500); }
  function exportCurrentView() {
    if (state.tab === '04') { readCPMInputs(); const calc = calculateCPM(state.activities); downloadCSV('cpm_resultados.csv', cpmCSV(state.activities, calc)); return; }
    if (state.tab === '06') { downloadCSV('pert_resultados.csv', pertCSV()); return; }
    const tab = TABS.find((item) => item[0] === state.tab);
    if (tab) downloadCSV(safeId(tab[2]) + '.csv', (D.sheets[tab[2]] || []).map((row) => row.map(csvCell).join(';')).join('\n'));
  }

  render();
})();
