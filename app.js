/**
 * SUITE INTEGRAL: PERT • CPM • PROBABILIDAD - CONTROLADOR PRINCIPAL
 * Integración de cálculos, gráficos dinámicos SVG, sincronización y exportación Excel.
 */

// Los tiempos visibles de la ventana PERT se muestran con un decimal y redondeo matemático.
const PERT_DISPLAY_DECIMALS = 1;

// La red PERT usa como duración numérica el mismo Te visible en la tabla.
function roundToPertDisplay(value) {
  const factor = 10 ** PERT_DISPLAY_DECIMALS;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

// La varianza se muestra con un decimal, tomando solo las primeras cifras sin redondear.
function fmtTruncated(num, decimals = PERT_DISPLAY_DECIMALS) {
  const factor = 10 ** decimals;
  const truncated = Math.trunc((Number(num) + Number.EPSILON) * factor) / factor;
  return fmt(truncated, decimals);
}

// Datos iniciales para la tabla PERT (15 actividades estándar)
const DEFAULT_PERT_DATA = [
  { partida: 'A', predecesora: '—', duracion: 5, a: 4, m: 5, b: 6 },
  { partida: 'B', predecesora: 'A', duracion: 3, a: 2, m: 3, b: 4 },
  { partida: 'C', predecesora: 'A', duracion: 6, a: 4, m: 6, b: 8 },
  { partida: 'D', predecesora: 'B', duracion: 4, a: 2, m: 4, b: 6 },
  { partida: 'E', predecesora: 'B - C', duracion: 4, a: 3, m: 4, b: 5 },
  { partida: 'F', predecesora: 'C', duracion: 3, a: 1, m: 3, b: 6 },
  { partida: 'G', predecesora: 'D - E', duracion: 5, a: 3, m: 5, b: 8 },
  { partida: 'H', predecesora: 'E - F', duracion: 5, a: 4, m: 5, b: 6 },
  { partida: 'I', predecesora: 'F', duracion: 7, a: 6, m: 7, b: 9 },
  { partida: 'J', predecesora: 'G - H', duracion: 8, a: 7, m: 8, b: 9 },
  { partida: 'K', predecesora: 'H - I', duracion: 5, a: 4, m: 5, b: 6 },
  { partida: 'L', predecesora: 'G', duracion: 3, a: 2, m: 3, b: 4 },
  { partida: 'M', predecesora: 'J - K', duracion: 3, a: 1, m: 3, b: 4 },
  { partida: 'N', predecesora: 'L - M', duracion: 8, a: 7, m: 8, b: 11 },
  { partida: 'O', predecesora: 'N - I', duracion: 4, a: 3, m: 4, b: 6 }
];

// Estado global de la aplicación
let pertActivities = JSON.parse(JSON.stringify(DEFAULT_PERT_DATA));
let lastCpmResult = null;
let diagramRendererInstance = null;
let pertDiagramRendererInstance = null;
let lastPertDiagramResult = null;
let currentProjectProbData = null;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initProbabilityModule();
  initPertTable();
  initCPMModule();
  initPertNetworkModule();
  initProjectProbModule();
  initModals();
  initMasterExport();

  // Resolver automáticamente el ejercicio de probabilidad con los datos de la imagen
  loadSampleExercise();
});

function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.getAttribute('data-tab'));
    });
  });
}

function switchTab(tabId) {
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === tabId);
  });

  // Si se abre el CPM, ajustar el diagrama
  if (tabId === 'tab-cpm' && lastCpmResult && diagramRendererInstance) {
    setTimeout(() => diagramRendererInstance.draw(), 50);
  }
  if (tabId === 'tab-pert' && lastPertDiagramResult && pertDiagramRendererInstance) {
    setTimeout(() => pertDiagramRendererInstance.draw(), 50);
  }
  // Si se abre probabilidad de proyecto, actualizar gráficos
  if (tabId === 'tab-proj-prob') {
    setTimeout(() => updateProjectProbMetrics(), 50);
  }
}

// ==========================================
// MÓDULO 1: EJERCICIO PROBABILIDAD (Pizarra)
// ==========================================
function initProbabilityModule() {
  const btnSolve = document.getElementById('btn-solve-prob');
  const btnSample = document.getElementById('btn-sample-prob');
  const btnClear = document.getElementById('btn-clear-prob');

  if (btnSolve) btnSolve.addEventListener('click', handleSolveProbability);
  if (btnSample) btnSample.addEventListener('click', loadSampleExercise);
  if (btnClear) btnClear.addEventListener('click', clearProbabilityInputs);

  // Escuchar cambios en los inputs para resolver en tiempo real
  ['prob-a', 'prob-m', 'prob-b', 'prob-td', 'prob-name'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        const a = parseFloat(document.getElementById('prob-a').value);
        const m = parseFloat(document.getElementById('prob-m').value);
        const b = parseFloat(document.getElementById('prob-b').value);
        const td = parseFloat(document.getElementById('prob-td').value);
        if (!isNaN(a) && !isNaN(m) && !isNaN(b) && !isNaN(td) && a > 0 && m > 0 && b > 0 && td > 0) {
          handleSolveProbability();
        }
      });
    }
  });
}

function loadSampleExercise() {
  document.getElementById('prob-name').value = 'Preparación de terreno';
  document.getElementById('prob-a').value = '4';
  document.getElementById('prob-m').value = '6';
  document.getElementById('prob-b').value = '10';
  document.getElementById('prob-td').value = '8';
  handleSolveProbability();
}

function clearProbabilityInputs() {
  document.getElementById('prob-name').value = '';
  document.getElementById('prob-a').value = '';
  document.getElementById('prob-m').value = '';
  document.getElementById('prob-b').value = '';
  document.getElementById('prob-td').value = '';
  document.getElementById('prob-solution-container').innerHTML = `
    <div class="empty-state-card">
      <div class="empty-icon">📝</div>
      <h3>Esperando datos del ejercicio</h3>
      <p>Ingresa los valores de tiempo optimista (a), más probable (m), pesimista (b) y estipulado (Td) arriba, o pulsa en <strong>"Cargar Ejemplo de la Pizarra"</strong>.</p>
    </div>
  `;
}

function handleSolveProbability() {
  const name = document.getElementById('prob-name').value.trim() || 'Actividad';
  const a = parseFloat(document.getElementById('prob-a').value);
  const m = parseFloat(document.getElementById('prob-m').value);
  const b = parseFloat(document.getElementById('prob-b').value);
  const td = parseFloat(document.getElementById('prob-td').value);

  const solution = solveSingleProbability(a, m, b, td, name);
  const container = document.getElementById('prob-solution-container');
  container.innerHTML = renderSolutionHTML(solution);
}

// Agregar la actividad del ejercicio a la tabla PERT & CPM
window.sendToPertTable = function(name, a, m, b) {
  let code = name.length <= 2 ? name.toUpperCase() : String.fromCharCode(65 + pertActivities.length);
  if (pertActivities.some(x => x.partida === code)) {
    code = 'ACT-' + (pertActivities.length + 1);
  }

  pertActivities.push({
    partida: code,
    predecesora: pertActivities.length > 0 ? pertActivities[pertActivities.length - 1].partida : '—',
    duracion: Math.round(m),
    a: a,
    m: m,
    b: b
  });

  renderPertTable();
  switchTab('tab-pert');
  alert(`✅ Actividad "${name}" agregada con éxito a la Tabla PERT con identificador [${code}].`);
};

// ==========================================
// MÓDULO 2: TABLA PERT MULTIACTIVIDAD
// ==========================================
function initPertTable() {
  const btnAddRow = document.getElementById('btn-add-row');
  const btnReset = document.getElementById('btn-reset');
  const btnClearTable = document.getElementById('btn-clear-table');
  const btnExportExcel = document.getElementById('btn-export-excel');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnPasteExcel = document.getElementById('btn-paste-excel');
  const btnSyncCpm = document.getElementById('btn-sync-cpm');
  const toggleStats = document.getElementById('toggle-stats');
  const toggleFractions = document.getElementById('toggle-fractions');

  if (btnAddRow) btnAddRow.addEventListener('click', addPertRow);
  if (btnReset) btnReset.addEventListener('click', () => {
    if (confirm('¿Deseas restaurar la tabla con el ejercicio estándar de 15 partidas?')) {
      pertActivities = JSON.parse(JSON.stringify(DEFAULT_PERT_DATA));
      renderPertTable();
    }
  });
  if (btnClearTable) btnClearTable.addEventListener('click', () => {
    if (confirm('¿Vaciar toda la tabla para ingresar partidas a mano?')) {
      pertActivities = [];
      addPertRow();
      renderPertTable();
    }
  });
  if (btnExportExcel) btnExportExcel.addEventListener('click', () => ExcelExporter.exportPertTable(pertActivities));
  if (btnExportCsv) btnExportCsv.addEventListener('click', exportPertToCsv);
  if (btnPasteExcel) btnPasteExcel.addEventListener('click', () => openPasteModal());
  if (btnSyncCpm) btnSyncCpm.addEventListener('click', syncPertToCpm);

  if (toggleStats) toggleStats.addEventListener('change', renderPertTable);
  if (toggleFractions) toggleFractions.addEventListener('change', renderPertTable);
  renderPertTable();
}

function renderPertTable() {
  const tbody = document.getElementById('table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  const showStats = document.getElementById('toggle-stats') ? document.getElementById('toggle-stats').checked : true;
  const showFractions = document.getElementById('toggle-fractions') ? document.getElementById('toggle-fractions').checked : false;
  const decimals = PERT_DISPLAY_DECIMALS;

  let sumDur = 0, sumA = 0, sumM = 0, sumB = 0, sumTe = 0, sumVar = 0;

  pertActivities.forEach((row, index) => {
    const a = parseFloat(row.a) || 0;
    const m = parseFloat(row.m) || 0;
    const b = parseFloat(row.b) || 0;
    const te = (a + 4 * m + b) / 6;
    const diff = b - a;
    const v = Math.pow(diff / 6, 2);
    const sd = diff / 6;

    sumDur += (parseFloat(row.duracion) || 0);
    sumA += a;
    sumM += m;
    sumB += b;
    sumTe += te;
    sumVar += v;

    const numTe = a + 4 * m + b;
    const gTe = gcd(numTe, 6);
    const fracTe = gTe > 1 && (numTe % 6 !== 0) ? `${numTe / gTe}/${6 / gTe}` : (numTe % 6 === 0 ? `${numTe / 6}` : `${numTe}/6`);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="cell-input col-code" value="${row.partida}" onchange="updatePertCell(${index}, 'partida', this.value)"></td>
      <td><input type="text" class="cell-input col-pred" value="${row.predecesora}" onchange="updatePertCell(${index}, 'predecesora', this.value)"></td>
      <td><input type="number" step="0.5" class="cell-input num-cell" value="${row.duracion}" onchange="updatePertCell(${index}, 'duracion', this.value)"></td>
      <td><input type="number" step="0.5" class="cell-input num-cell" value="${row.a}" onchange="updatePertCell(${index}, 'a', this.value)"></td>
      <td><input type="number" step="0.5" class="cell-input num-cell" value="${row.b}" onchange="updatePertCell(${index}, 'b', this.value)"></td>
      <td><input type="number" step="0.5" class="cell-input num-cell" value="${row.m}" onchange="updatePertCell(${index}, 'm', this.value)"></td>
      <td class="num-cell highlight-te cell-clickable" title="Clic para ver desglose paso a paso" onclick="showActivityDetail(${index}, 'te')">
        ${showFractions && fracTe !== `${te.toFixed(PERT_DISPLAY_DECIMALS)}` ? `${fracTe} <small>(${fmt(te, decimals)})</small>` : fmt(te, decimals)}
      </td>
      <td class="num-cell extra-col cell-clickable ${showStats ? '' : 'd-none'}" title="Clic para ver desglose" onclick="showActivityDetail(${index}, 'var')">
        ${fmtTruncated(v, decimals)}
      </td>
      <td class="num-cell extra-col cell-clickable ${showStats ? '' : 'd-none'}" title="Clic para ver desglose" onclick="showActivityDetail(${index}, 'sd')">
        ${fmt(sd, decimals)}
      </td>
      <td class="text-center">
        <button class="btn-delete" title="Eliminar fila" onclick="deletePertRow(${index})">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Totales
  const totalSd = Math.sqrt(sumVar);
  document.getElementById('total-duracion').textContent = fmt(sumDur, 1);
  document.getElementById('total-a').textContent = fmt(sumA, 1);
  document.getElementById('total-m').textContent = fmt(sumM, 1);
  document.getElementById('total-b').textContent = fmt(sumB, 1);
  document.getElementById('total-te').textContent = fmt(sumTe, decimals);
  document.getElementById('total-var').textContent = fmtTruncated(sumVar, decimals);
  document.getElementById('total-sd').textContent = fmt(totalSd, decimals);

  // Tarjetas KPI de cabecera PERT
  const kpiActs = document.getElementById('kpi-total-acts');
  const kpiTe = document.getElementById('kpi-total-te');
  const kpiSd = document.getElementById('kpi-total-sd');
  if (kpiActs) kpiActs.textContent = pertActivities.length;
  if (kpiTe) kpiTe.textContent = `${fmt(sumTe, 1)} d`;
  if (kpiSd) kpiSd.textContent = `${fmt(totalSd, PERT_DISPLAY_DECIMALS)} d`;

  document.querySelectorAll('.extra-col').forEach(el => {
    el.style.display = showStats ? '' : 'none';
  });

  updateProjectProbSelect();
  updatePertNetworkDiagram();
}

function updatePertCell(index, field, value) {
  if (pertActivities[index]) {
    pertActivities[index][field] = value;
    renderPertTable();
  }
}

function addPertRow() {
  const nextLetter = String.fromCharCode(65 + pertActivities.length);
  pertActivities.push({
    partida: nextLetter,
    predecesora: pertActivities.length > 0 ? pertActivities[pertActivities.length - 1].partida : '—',
    duracion: 4,
    a: 2,
    m: 4,
    b: 6
  });
  renderPertTable();
}

function deletePertRow(index) {
  if (pertActivities.length <= 1) {
    alert('La tabla debe contener al menos una fila.');
    return;
  }
  pertActivities.splice(index, 1);
  renderPertTable();
}

// Sincronizar y Enviar a CPM
function syncPertToCpm() {
  if (pertActivities.length === 0) {
    alert('No hay actividades en la tabla para enviar a CPM.');
    return;
  }

  const cpmActivities = pertActivities.map(act => {
    const a = parseFloat(act.a) || 0;
    const m = parseFloat(act.m) || 0;
    const b = parseFloat(act.b) || 0;
    const te = (a + 4 * m + b) / 6;
    return {
      id: act.partida.trim().toUpperCase(),
      name: act.partida.trim().toUpperCase(),
      predecessors: act.predecesora,
      duration: te
    };
  });

  loadActivitiesIntoCPM(cpmActivities);
  switchTab('tab-cpm');
}

function initPertNetworkModule() {
  pertDiagramRendererInstance = new DiagramRenderer('pert-svg', 'pert-diagram-container', 'diagrama_pert_aon');

  const btnZoomIn = document.getElementById('btn-pert-zoom-in');
  const btnZoomOut = document.getElementById('btn-pert-zoom-out');
  const btnResetView = document.getElementById('btn-pert-reset-view');
  const btnExportPng = document.getElementById('btn-pert-export-png');
  const btnExportSvg = document.getElementById('btn-pert-export-svg');

  if (btnZoomIn) btnZoomIn.addEventListener('click', () => pertDiagramRendererInstance.zoomBy(1.2));
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => pertDiagramRendererInstance.zoomBy(0.8));
  if (btnResetView) btnResetView.addEventListener('click', () => pertDiagramRendererInstance.resetView());
  if (btnExportPng) btnExportPng.addEventListener('click', () => pertDiagramRendererInstance.exportPNG());
  if (btnExportSvg) btnExportSvg.addEventListener('click', () => pertDiagramRendererInstance.exportSVG());

  updatePertNetworkDiagram();
}

function buildPertNetworkResult() {
  const items = pertActivities
    .map(act => {
      const a = parseFloat(act.a) || 0;
      const m = parseFloat(act.m) || 0;
      const b = parseFloat(act.b) || 0;
      return {
        id: String(act.partida || '').trim().toUpperCase(),
        name: String(act.partida || '').trim().toUpperCase(),
        predecessors: act.predecesora,
        duration: roundToPertDisplay((a + 4 * m + b) / 6)
      };
    })
    .filter(item => item.id);

  if (items.length === 0) return null;
  const result = CPMEngine.calculate(items, { preserveDecimals: true });
  result.diagramType = 'pert';
  return result;
}

function updatePertNetworkDiagram() {
  if (!pertDiagramRendererInstance) return;

  const alertBox = document.getElementById('pert-network-error');
  if (alertBox) alertBox.style.display = 'none';

  if (pertActivities.length === 0) {
    lastPertDiagramResult = null;
    if (alertBox) {
      alertBox.textContent = 'No hay actividades PERT para generar el diagrama.';
      alertBox.style.display = 'block';
    }
    return;
  }

  try {
    const result = buildPertNetworkResult();
    lastPertDiagramResult = result;
    pertDiagramRendererInstance.render(result);

    document.getElementById('val-pert-total-time').textContent = `${fmt(result.projectDuration, PERT_DISPLAY_DECIMALS)} días`;
    if (result.criticalPaths && result.criticalPaths.length > 0) {
      const cp = result.criticalPaths[0];
      document.getElementById('val-pert-critical-chain').textContent = cp.join(' → ');
      const formulaStr = cp.map(id => fmt(result.activities[id].duration, PERT_DISPLAY_DECIMALS)).join(' + ') + ` = ${fmt(result.projectDuration, PERT_DISPLAY_DECIMALS)} días`;
      document.getElementById('val-pert-critical-formula').textContent = formulaStr;
    } else {
      document.getElementById('val-pert-critical-chain').textContent = 'No determinada';
      document.getElementById('val-pert-critical-formula').textContent = '';
    }
  } catch (err) {
    lastPertDiagramResult = null;
    if (alertBox) {
      alertBox.textContent = `⚠️ No se pudo generar el diagrama PERT: ${err.message}`;
      alertBox.style.display = 'block';
    }
  }
}

// ==========================================
// MÓDULO 3: CPM & DIAGRAMA DE RED & GANTT
// ==========================================
function initCPMModule() {
  diagramRendererInstance = new DiagramRenderer('cpm-svg', 'diagram-container');

  const btnCalc = document.getElementById('btn-cpm-calculate');
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnResetView = document.getElementById('btn-reset-view');
  const btnExportPng = document.getElementById('btn-export-png');
  const btnExportSvg = document.getElementById('btn-export-svg');
  const btnCpmPaste = document.getElementById('btn-cpm-paste');
  const btnCpmExcel = document.getElementById('btn-cpm-excel');
  const btnCpmCsv = document.getElementById('btn-cpm-csv');
  const btnGoProb = document.getElementById('btn-cpm-to-prob');

  if (btnCalc) btnCalc.addEventListener('click', runCpmCalculation);
  if (btnZoomIn) btnZoomIn.addEventListener('click', () => diagramRendererInstance.zoomBy(1.2));
  if (btnZoomOut) btnZoomOut.addEventListener('click', () => diagramRendererInstance.zoomBy(0.8));
  if (btnResetView) btnResetView.addEventListener('click', () => diagramRendererInstance.resetView());
  if (btnExportPng) btnExportPng.addEventListener('click', exportDiagramPng);
  if (btnExportSvg) btnExportSvg.addEventListener('click', exportDiagramSvg);
  if (btnCpmPaste) btnCpmPaste.addEventListener('click', openCpmPasteModal);
  if (btnCpmExcel) btnCpmExcel.addEventListener('click', () => ExcelExporter.exportCpmResults(lastCpmResult));
  if (btnCpmCsv) btnCpmCsv.addEventListener('click', exportCpmToCsv);
  if (btnGoProb) btnGoProb.addEventListener('click', sendCriticalPathToProb);

  syncPertToCpm();
}

function loadActivitiesIntoCPM(activities) {
  const tbody = document.getElementById('cpm-input-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  activities.forEach((item) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="cell-input col-code" value="${item.id}"></td>
      <td><input type="text" class="cell-input col-pred" value="${Array.isArray(item.predecessors) ? item.predecessors.join(' - ') : item.predecessors}"></td>
      <td><input type="number" step="0.1" class="cell-input num-cell" value="${item.duration}"></td>
      <td class="text-center"><button class="btn-delete" onclick="this.closest('tr').remove()">🗑️</button></td>
    `;
    tbody.appendChild(tr);
  });

  runCpmCalculation();
}

function openCpmPasteModal() {
  const modal = document.getElementById('cpm-paste-modal');
  const txt = document.getElementById('cpm-paste-textarea');
  if (txt) txt.value = '';
  if (modal) modal.classList.add('active');
  if (txt) txt.focus();
}

function closeCpmPasteModal() {
  const modal = document.getElementById('cpm-paste-modal');
  if (modal) modal.classList.remove('active');
}

function parseCpmPasteNumber(value) {
  const normalized = String(value || '').trim().replace(',', '.');
  if (!normalized) return NaN;
  return Number(normalized);
}

function parseCpmPasteRows(rawText) {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const activities = [];
  const seenIds = new Set();
  let ignoredRows = 0;

  lines.forEach(line => {
    let cols;
    if (line.includes('\t')) {
      cols = line.split('\t');
    } else if (line.includes(';')) {
      cols = line.split(';');
    } else {
      cols = line.split(/\s{2,}/);
    }
    cols = cols.map(col => col.trim());

    const firstCell = (cols[0] || '').toLowerCase();
    const rowText = cols.join(' ').toLowerCase();
    if (/^(partida|actividades?|id|c[oó]digo)$/.test(firstCell) || (/predecesora/.test(rowText) && /duraci[oó]n/.test(rowText))) {
      ignoredRows++;
      return;
    }

    const id = (cols[0] || '').trim().toUpperCase();
    const predecessors = (cols[1] || '—').trim() || '—';
    const duration = parseCpmPasteNumber(cols[2]);

    if (!id || !Number.isFinite(duration) || duration < 0 || seenIds.has(id)) {
      ignoredRows++;
      return;
    }

    seenIds.add(id);
    activities.push({ id, name: id, predecessors, duration });
  });

  return { activities, ignoredRows };
}

function applyCpmPasteData() {
  const txt = document.getElementById('cpm-paste-textarea');
  const { activities, ignoredRows } = parseCpmPasteRows(txt ? txt.value : '');

  if (activities.length === 0) {
    alert('No se detectaron actividades válidas. Usa las columnas: Partida, Predecesora(s) y Duración.');
    return;
  }

  loadActivitiesIntoCPM(activities);
  closeCpmPasteModal();
  const skippedMessage = ignoredRows > 0 ? ` Se omitieron ${ignoredRows} fila(s) sin formato válido.` : '';
  alert(`✅ Se cargaron ${activities.length} actividades en CPM.${skippedMessage}`);
}

function getCpmInputData() {
  const rows = document.querySelectorAll('#cpm-input-tbody tr');
  const items = [];
  rows.forEach(tr => {
    const inputs = tr.querySelectorAll('input');
    if (inputs.length >= 3) {
      const id = inputs[0].value.trim().toUpperCase();
      const preds = inputs[1].value.trim();
      const dur = parseFloat(inputs[2].value);
      if (id) {
        items.push({
          id: id,
          name: id,
          predecessors: preds,
          duration: isNaN(dur) ? 0 : dur
        });
      }
    }
  });
  return items;
}

function runCpmCalculation() {
  const items = getCpmInputData();
  const alertBox = document.getElementById('cpm-error-alert');
  alertBox.style.display = 'none';

  if (items.length === 0) {
    alertBox.textContent = 'No hay actividades para calcular CPM.';
    alertBox.style.display = 'block';
    return;
  }

  try {
    const result = CPMEngine.calculate(items);
    lastCpmResult = result;

    // Renderizar lámina visual
    diagramRendererInstance.render(result);

    // Actualizar recuadro resumen
    document.getElementById('val-total-time').textContent = `${result.projectDuration} días`;

    if (result.criticalPaths && result.criticalPaths.length > 0) {
      const cp = result.criticalPaths[0];
      document.getElementById('val-critical-chain').textContent = cp.join(' → ');
      const formulaStr = cp.map(id => result.activities[id].duration).join(' + ') + ` = ${result.projectDuration} días`;
      document.getElementById('val-critical-formula').textContent = formulaStr;
    } else {
      document.getElementById('val-critical-chain').textContent = 'No determinada';
      document.getElementById('val-critical-formula').textContent = '';
    }

    // Renderizar tabla de resultados CPM
    renderCpmResultsTable(result);

    // Renderizar Cronograma de Barras Gantt Temprano vs Tardío
    const ganttContainer = document.getElementById('cpm-gantt-container');
    if (ganttContainer) {
      ganttContainer.innerHTML = ChartsEngine.renderGanttChart(result);
    }

  } catch (err) {
    alertBox.textContent = `⚠️ Error en el modelo CPM: ${err.message}`;
    alertBox.style.display = 'block';
  }
}

function renderCpmResultsTable(result) {
  const tbody = document.getElementById('cpm-results-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  result.sortedIds.forEach(id => {
    const act = result.activities[id];
    const tr = document.createElement('tr');
    if (act.isCritical) tr.classList.add('row-critical');

    tr.innerHTML = `
      <td><strong>${act.id}</strong></td>
      <td>${act.predecessors.join(', ') || '—'}</td>
      <td class="num-cell">${fmt(act.duration, 2)}</td>
      <td class="num-cell">${fmt(act.ES, 2)}</td>
      <td class="num-cell">${fmt(act.EF, 2)}</td>
      <td class="num-cell">${fmt(act.LS, 2)}</td>
      <td class="num-cell">${fmt(act.LF, 2)}</td>
      <td class="num-cell ${act.isCritical ? 'highlight-critical-slack' : ''}">${fmt(act.TF, 2)}</td>
      <td class="num-cell">${fmt(act.FF, 2)}</td>
      <td class="text-center">${act.isCritical ? '<span class="badge badge-critical">SÍ (Crítica)</span>' : '<span class="badge badge-normal">No</span>'}</td>
    `;
    tbody.appendChild(tr);
  });
}

function exportDiagramPng() {
  const svg = document.getElementById('cpm-svg');
  if (!svg) return;

  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();

  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    canvas.width = 1600;
    canvas.height = 850;
    ctx.fillStyle = '#fafbfe';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);

    const a = document.createElement('a');
    a.download = 'Diagrama_Red_CPM_AON.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  };
  img.src = url;
}

function exportDiagramSvg() {
  const svg = document.getElementById('cpm-svg');
  if (!svg) return;
  const svgData = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = 'Diagrama_Red_CPM_Vector.svg';
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
}

function sendCriticalPathToProb() {
  if (!lastCpmResult || !lastCpmResult.criticalPaths || lastCpmResult.criticalPaths.length === 0) {
    alert('Primero debes calcular la ruta crítica en el CPM.');
    return;
  }
  switchTab('tab-proj-prob');
  document.getElementById('proj-target-mode').value = 'critical_path';
  updateProjectProbMetrics();
}

// ==========================================
// MÓDULO 4: PROBABILIDAD DEL PROYECTO COMPLETO
// ==========================================
function initProjectProbModule() {
  const targetMode = document.getElementById('proj-target-mode');
  const actSelect = document.getElementById('proj-activity-select');
  const inputTd = document.getElementById('proj-input-td');
  const btnExport = document.getElementById('btn-export-proj-prob');

  if (targetMode) targetMode.addEventListener('change', () => {
    document.getElementById('proj-group-select-act').style.display = targetMode.value === 'single_activity' ? 'block' : 'none';
    updateProjectProbMetrics();
  });

  if (actSelect) actSelect.addEventListener('change', updateProjectProbMetrics);
  if (inputTd) inputTd.addEventListener('input', updateProjectProbMetrics);
  if (btnExport) btnExport.addEventListener('click', () => ExcelExporter.exportProjectProb(currentProjectProbData));

  updateProjectProbMetrics();
}

function updateProjectProbSelect() {
  const select = document.getElementById('proj-activity-select');
  if (!select) return;
  select.innerHTML = '';
  pertActivities.forEach(act => {
    const opt = document.createElement('option');
    opt.value = act.partida;
    opt.textContent = `Partida ${act.partida}`;
    select.appendChild(opt);
  });
}

function updateProjectProbMetrics() {
  const mode = document.getElementById('proj-target-mode') ? document.getElementById('proj-target-mode').value : 'critical_path';
  let refTe = 0;
  let refVar = 0;
  let label = '';

  if (mode === 'critical_path') {
    if (lastCpmResult && lastCpmResult.criticalPaths && lastCpmResult.criticalPaths.length > 0) {
      const cp = lastCpmResult.criticalPaths[0];
      label = `Ruta Crítica (${cp.join(' → ')})`;
      cp.forEach(code => {
        const act = pertActivities.find(x => x.partida.toUpperCase() === code);
        if (act) {
          const a = parseFloat(act.a) || 0;
          const m = parseFloat(act.m) || 0;
          const b = parseFloat(act.b) || 0;
          refTe += (a + 4 * m + b) / 6;
          refVar += Math.pow((b - a) / 6, 2);
        }
      });
    } else {
      refTe = lastCpmResult ? lastCpmResult.projectDuration : 0;
      refVar = 1;
      label = 'Ruta Crítica (Estimada)';
    }
  } else if (mode === 'all_sum') {
    label = 'Suma de Todas las Actividades';
    pertActivities.forEach(act => {
      const a = parseFloat(act.a) || 0;
      const m = parseFloat(act.m) || 0;
      const b = parseFloat(act.b) || 0;
      refTe += (a + 4 * m + b) / 6;
      refVar += Math.pow((b - a) / 6, 2);
    });
  } else {
    const code = document.getElementById('proj-activity-select') ? document.getElementById('proj-activity-select').value : '';
    const act = pertActivities.find(x => x.partida === code) || pertActivities[0];
    if (act) {
      label = `Partida ${act.partida}`;
      const a = parseFloat(act.a) || 0;
      const m = parseFloat(act.m) || 0;
      const b = parseFloat(act.b) || 0;
      refTe = (a + 4 * m + b) / 6;
      refVar = Math.pow((b - a) / 6, 2);
    }
  }

  const refSd = Math.sqrt(refVar) || 1;
  document.getElementById('proj-display-te').textContent = `${fmt(refTe, 2)} d`;
  document.getElementById('proj-display-sd').textContent = `${fmt(refSd, 2)} d`;
  document.getElementById('proj-target-title').textContent = label;

  const tdInput = document.getElementById('proj-input-td');
  if (!tdInput.value && refTe > 0) {
    tdInput.value = Math.ceil(refTe * 1.05);
  }
  const td = parseFloat(tdInput.value);

  if (isNaN(td) || td <= 0 || refSd <= 0) {
    document.getElementById('proj-val-z').textContent = '--';
    document.getElementById('proj-prob-result').textContent = '--%';
    document.getElementById('proj-risk-result').textContent = '--%';
    document.getElementById('proj-gaussian-container').innerHTML = '';
    return;
  }

  const z = (td - refTe) / refSd;
  const prob = standardNormalCDF(z);
  const pct = prob * 100;
  const risk = (1 - prob) * 100;

  document.getElementById('proj-val-z').textContent = fmt(z, 2);
  document.getElementById('proj-prob-result').textContent = `${fmt(pct, 2)}%`;
  document.getElementById('proj-risk-result').textContent = `${fmt(risk, 2)}%`;

  currentProjectProbData = {
    modeLabel: label,
    te: refTe,
    sd: refSd,
    td: td,
    z: z,
    pct: pct,
    risk: risk
  };

  // Renderizar Campana de Gauss del Proyecto
  const gaussContainer = document.getElementById('proj-gaussian-container');
  if (gaussContainer) {
    gaussContainer.innerHTML = ChartsEngine.renderGaussianBell(refTe, refSd, td, z, pct);
  }

  // Renderizar Tacómetro de Riesgo del Proyecto
  const gaugeContainer = document.getElementById('proj-gauge-container');
  if (gaugeContainer) {
    gaugeContainer.innerHTML = ChartsEngine.renderRiskGauge(pct);
  }

  // Renderizar Curva S de Probabilidad Acumulada
  const sCurveContainer = document.getElementById('proj-scurve-container');
  if (sCurveContainer) {
    sCurveContainer.innerHTML = ChartsEngine.renderSCurve(refTe, refSd, td);
  }
}

// Botón Maestro de Exportación Consolidada
function initMasterExport() {
  const btnMaster = document.getElementById('btn-master-excel');
  if (btnMaster) {
    btnMaster.addEventListener('click', () => {
      ExcelExporter.exportMasterReport(
        currentProbabilitySolution,
        pertActivities,
        lastCpmResult,
        currentProjectProbData
      );
    });
  }
}

// ==========================================
// MODALES Y DESGLOSE PASO A PASO
// ==========================================
function initModals() {
  const detailModal = document.getElementById('detail-modal');
  const modalClose = document.getElementById('modal-close');
  if (modalClose && detailModal) {
    modalClose.addEventListener('click', () => detailModal.classList.remove('active'));
    window.addEventListener('click', (e) => {
      if (e.target === detailModal) detailModal.classList.remove('active');
    });
  }

  const pasteModal = document.getElementById('paste-modal');
  const pasteClose = document.getElementById('paste-modal-close');
  const btnCancel = document.getElementById('btn-cancel-paste');
  const btnApply = document.getElementById('btn-apply-paste');

  if (pasteClose && pasteModal) {
    pasteClose.addEventListener('click', () => pasteModal.classList.remove('active'));
    if (btnCancel) btnCancel.addEventListener('click', () => pasteModal.classList.remove('active'));
  if (btnApply) btnApply.addEventListener('click', applyPasteData);

  const cpmPasteModal = document.getElementById('cpm-paste-modal');
  const cpmPasteClose = document.getElementById('cpm-paste-modal-close');
  const btnCancelCpmPaste = document.getElementById('btn-cancel-cpm-paste');
  const btnApplyCpmPaste = document.getElementById('btn-apply-cpm-paste');

  if (cpmPasteClose) cpmPasteClose.addEventListener('click', closeCpmPasteModal);
  if (btnCancelCpmPaste) btnCancelCpmPaste.addEventListener('click', closeCpmPasteModal);
  if (btnApplyCpmPaste) btnApplyCpmPaste.addEventListener('click', applyCpmPasteData);
  if (cpmPasteModal) {
    window.addEventListener('click', (e) => {
      if (e.target === cpmPasteModal) closeCpmPasteModal();
    });
  }
  }

  // Modal de Celular
  const mobileModal = document.getElementById('mobile-modal');
  const btnMobileInfo = document.getElementById('btn-mobile-info');
  const mobileClose = document.getElementById('mobile-modal-close');
  const btnCloseMobile = document.getElementById('btn-close-mobile-info');

  if (btnMobileInfo && mobileModal) {
    btnMobileInfo.addEventListener('click', () => mobileModal.classList.add('active'));
  }
  if (mobileClose && mobileModal) {
    mobileClose.addEventListener('click', () => mobileModal.classList.remove('active'));
  }
  if (btnCloseMobile && mobileModal) {
    btnCloseMobile.addEventListener('click', () => mobileModal.classList.remove('active'));
  }
  if (mobileModal) {
    window.addEventListener('click', (e) => {
      if (e.target === mobileModal) mobileModal.classList.remove('active');
    });
  }
}

window.showActivityDetail = function(index, type) {
  const act = pertActivities[index];
  if (!act) return;
  const a = parseFloat(act.a) || 0;
  const m = parseFloat(act.m) || 0;
  const b = parseFloat(act.b) || 0;
  const te = (a + 4 * m + b) / 6;
  const diff = b - a;
  const v = Math.pow(diff / 6, 2);
  const sd = diff / 6;

  let title = `Desglose Matemático - Partida ${act.partida}`;
  let content = '';

  if (type === 'te') {
    title += ' (Tiempo Esperado)';
    content = `
      <div class="math-box">
        <p><strong>Fórmula de Tiempo Esperado:</strong></p>
        <p class="math-tex">T<sub>e</sub> = (a + 4m + b) / 6</p>
        <p><strong>Reemplazo:</strong></p>
        <p class="math-tex">T<sub>e</sub> = (${a} + 4(${m}) + ${b}) / 6 = (${a} + ${4 * m} + ${b}) / 6 = ${(a + 4 * m + b)} / 6</p>
        <p><strong>Resultado final:</strong> <strong class="highlight-val">${fmt(te, PERT_DISPLAY_DECIMALS)} días</strong></p>
      </div>
    `;
  } else if (type === 'var') {
    title += ' (Varianza)';
    content = `
      <div class="math-box">
        <p><strong>Fórmula de Varianza PERT:</strong></p>
        <p class="math-tex">&sigma;<sup>2</sup> = ((b - a) / 6)<sup>2</sup> = (b - a)<sup>2</sup> / 36</p>
        <p><strong>Reemplazo:</strong></p>
        <p class="math-tex">&sigma;<sup>2</sup> = ((${b} - ${a}) / 6)<sup>2</sup> = (${diff} / 6)<sup>2</sup> = ${diff * diff} / 36</p>
        <p><strong>Resultado final:</strong> <strong class="highlight-val">${fmtTruncated(v, PERT_DISPLAY_DECIMALS)} días<sup>2</sup></strong></p>
      </div>
    `;
  } else if (type === 'sd') {
    title += ' (Desviación Estándar)';
    content = `
      <div class="math-box">
        <p><strong>Fórmula de Desviación Estándar PERT:</strong></p>
        <p class="math-tex">&sigma; = &radic;&sigma;<sup>2</sup> = (b - a) / 6</p>
        <p><strong>Reemplazo:</strong></p>
        <p class="math-tex">&sigma; = (${b} - ${a}) / 6 = ${diff} / 6</p>
        <p><strong>Resultado final:</strong> <strong class="highlight-val">${fmt(sd, PERT_DISPLAY_DECIMALS)} días</strong></p>
      </div>
    `;
  }

  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = content;
  document.getElementById('detail-modal').classList.add('active');
};

function openPasteModal() {
  const modal = document.getElementById('paste-modal');
  const txt = document.getElementById('paste-textarea');
  if (txt) txt.value = '';
  if (modal) modal.classList.add('active');
}

function applyPasteData() {
  const txt = document.getElementById('paste-textarea').value.trim();
  if (!txt) return;

  const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const newActs = [];
  let dataColumns = { duration: 2, a: 3, b: 4, m: 5 };

  lines.forEach(line => {
    const cols = line.split(/[\t;]+/).map(c => c.trim());
    const normalizedHeader = cols.join(' ').toLowerCase();
    if (/partida|duraci[oó]n|optimista|pesimista|probable/i.test(normalizedHeader) && /partida|duraci[oó]n/i.test(normalizedHeader)) {
      const findColumn = (pattern, fallback) => {
        const index = cols.findIndex(col => pattern.test(col.toLowerCase()));
        return index >= 0 ? index : fallback;
      };
      dataColumns = {
        duration: findColumn(/duraci[oó]n/, 2),
        a: findColumn(/optimista|^a(?:\s|$)/, 3),
        b: findColumn(/pesimista|^b(?:\s|$)/, 4),
        m: findColumn(/probable|^m(?:\s|$)/, 5)
      };
      return;
    }

    if (cols.length >= 4) {
      newActs.push({
        partida: cols[0].toUpperCase(),
        predecesora: cols[1] || '—',
        duracion: parseFloat(cols[dataColumns.duration]) || 0,
        a: parseFloat(cols[dataColumns.a]) || 0,
        b: parseFloat(cols[dataColumns.b]) || 0,
        m: parseFloat(cols[dataColumns.m]) || 0
      });
    }
  });

  if (newActs.length > 0) {
    pertActivities = newActs;
    renderPertTable();
    document.getElementById('paste-modal').classList.remove('active');
    alert(`✅ Se importaron correctamente ${newActs.length} actividades.`);
  } else {
    alert('No se detectaron datos válidos. Copia las columnas en orden desde Excel.');
  }
}

function exportPertToCsv() {
  let csv = 'PARTIDAS;PREDECESORA;DURACION;a (optimista);b (pesimista);m (probable);Te;Varianza;Desviacion\n';
  pertActivities.forEach(act => {
    const a = parseFloat(act.a) || 0;
    const m = parseFloat(act.m) || 0;
    const b = parseFloat(act.b) || 0;
    const te = (a + 4 * m + b) / 6;
    const v = Math.pow((b - a) / 6, 2);
    const sd = (b - a) / 6;
    csv += `${act.partida};${act.predecesora};${act.duracion};${a};${b};${m};${te.toFixed(2)};${v.toFixed(2)};${sd.toFixed(2)}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = 'tabla_pert.csv';
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCpmToCsv() {
  if (!lastCpmResult) return;
  let csv = 'Partida;Predecesoras;Duracion;ES;EF;LS;LF;HolguraTotal;HolguraLibre;EsCritica\n';
  lastCpmResult.sortedIds.forEach(id => {
    const act = lastCpmResult.activities[id];
    csv += `${act.id};"${act.predecessors.join(', ')}";${act.duration};${act.ES};${act.EF};${act.LS};${act.LF};${act.TF};${act.FF};${act.isCritical ? 'SI' : 'NO'}\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = 'resultados_cpm_ruta_critica.csv';
  a.href = url;
  a.click();
  URL.revokeObjectURL(url);
}
