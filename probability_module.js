/**
 * MÓDULO DE PROBABILIDAD PERT - EJERCICIO PASO A PASO
 * Resolución premium enriquecida con gráficos y exportación Excel.
 */

// Distribución Normal Estándar Acumulada Phi(z) - Abramowitz & Stegun
function standardNormalCDF(z) {
  if (isNaN(z)) return 0;
  if (z > 6) return 1;
  if (z < -6) return 0;
  
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * x);
  const erf = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return 0.5 * (1.0 + sign * erf);
}

// Máximo Común Divisor para simplificar fracciones
function gcd(x, y) {
  x = Math.round(Math.abs(x));
  y = Math.round(Math.abs(y));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

// Formatear decimales
function fmt(num, decimals = 2) {
  if (isNaN(num) || num === null || num === undefined) return '--';
  return Number(num).toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

// Variable global para guardar la última solución resuelta
let currentProbabilitySolution = null;

// Resolver el ejercicio completo
function solveSingleProbability(a, m, b, td, name = 'Preparación de terreno') {
  const errors = [];
  if (isNaN(a) || a <= 0) errors.push('El tiempo optimista (a) debe ser un número positivo mayor a 0.');
  if (isNaN(m) || m <= 0) errors.push('El tiempo más probable (m) debe ser un número positivo mayor a 0.');
  if (isNaN(b) || b <= 0) errors.push('El tiempo pesimista (b) debe ser un número positivo mayor a 0.');
  if (isNaN(td) || td <= 0) errors.push('El tiempo estipulado (Td) debe ser un número positivo mayor a 0.');
  if (a > m) errors.push('El tiempo optimista (a = ' + a + ') no puede ser mayor que el tiempo más probable (m = ' + m + ').');
  if (m > b) errors.push('El tiempo más probable (m = ' + m + ') no puede ser mayor que el tiempo pesimista (b = ' + b + ').');

  if (errors.length > 0) {
    return { success: false, errors: errors };
  }

  // a) Te = (a + 4m + b) / 6
  const numTe = a + 4 * m + b;
  const te = numTe / 6;
  const gTe = gcd(numTe, 6);
  const fracTe = gTe > 1 && (numTe % 6 !== 0) ? (numTe / gTe) + '/' + (6 / gTe) : (numTe % 6 === 0 ? '' + (numTe / 6) : numTe + '/6');

  // b) Varianza = ((b - a) / 6)^2 = (b - a)^2 / 36
  const diffBa = b - a;
  const variance = Math.pow(diffBa / 6, 2);
  const diffBaSq = diffBa * diffBa;
  const gVar = gcd(diffBaSq, 36);
  const fracVar = gVar > 1 && (diffBaSq % 36 !== 0) ? (diffBaSq / gVar) + '/' + (36 / gVar) : (diffBaSq % 36 === 0 ? '' + (diffBaSq / 36) : diffBaSq + '/36');

  // c) Desviación estándar = (b - a) / 6
  const sigma = diffBa / 6;
  const gSigma = gcd(diffBa, 6);
  const fracSigma = gSigma > 1 && (diffBa % 6 !== 0) ? (diffBa / gSigma) + '/' + (6 / gSigma) : (diffBa % 6 === 0 ? '' + (diffBa / 6) : diffBa + '/6');

  // d) Valor Z = (Td - Te) / sigma
  const diffTdTe = td - te;
  const z = diffTdTe / sigma;

  // e) Probabilidades
  const probCumplir = standardNormalCDF(z);
  const pctCumplir = probCumplir * 100;
  const riesgo = (1 - probCumplir) * 100;

  const sol = {
    success: true,
    inputs: { a: a, m: m, b: b, td: td, name: name },
    results: {
      te: te,
      numTe: numTe,
      fracTe: fracTe,
      diffBa: diffBa,
      diffBaSq: diffBaSq,
      variance: variance,
      fracVar: fracVar,
      sigma: sigma,
      fracSigma: fracSigma,
      diffTdTe: diffTdTe,
      z: z,
      probCumplir: probCumplir,
      pctCumplir: pctCumplir,
      riesgo: riesgo
    }
  };

  currentProbabilitySolution = sol;
  return sol;
}

// Renderizar la resolución completa paso a paso con gráficos premium
function renderSolutionHTML(solution) {
  if (!solution.success) {
    let errList = solution.errors.map(function(e) { return '<li>' + e + '</li>'; }).join('');
    return '<div class="prob-alert-error"><h4>⚠️ Revisa los siguientes campos:</h4><ul>' + errList + '</ul></div>';
  }

  const inputs = solution.inputs;
  const results = solution.results;
  const a = inputs.a, m = inputs.m, b = inputs.b, td = inputs.td, name = inputs.name;
  const te = results.te, numTe = results.numTe, fracTe = results.fracTe;
  const diffBa = results.diffBa, diffBaSq = results.diffBaSq, variance = results.variance, fracVar = results.fracVar;
  const sigma = results.sigma, fracSigma = results.fracSigma;
  const diffTdTe = results.diffTdTe, z = results.z;
  const pctCumplir = results.pctCumplir, riesgo = results.riesgo;

  let badgeColor = 'badge-success';
  let veredictoTexto = 'Riesgo Bajo (Alta Probabilidad de Cumplimiento)';
  if (riesgo > 50) {
    badgeColor = 'badge-danger';
    veredictoTexto = 'Riesgo Crítico (Probabilidad desfavorable de cumplir)';
  } else if (riesgo > 20) {
    badgeColor = 'badge-warning';
    veredictoTexto = 'Riesgo Moderado (Requiere supervisión y holgura)';
  }

  let html = '';
  html += '<div class="solution-header-card">';
  html += '  <div class="solution-title-row">';
  html += '    <div>';
  html += '      <span class="badge badge-primary">RESOLUCIÓN OFICIAL PASO A PASO</span>';
  html += '      <h2 class="solution-main-title">' + (name || 'Actividad en Obra') + '</h2>';
  html += '    </div>';
  html += '    <div class="header-actions-btn">';
  html += '      <button class="btn btn-success btn-sm" onclick="ExcelExporter.exportProbabilityExercise(currentProbabilitySolution)" title="Descargar este ejercicio en Microsoft Excel (.xlsx)">📊 Exportar este Ejercicio a Excel (.xlsx)</button>';
  html += '      <button class="btn btn-outline btn-sm" onclick="window.print()" title="Imprimir o guardar como PDF">🖨️ Imprimir / PDF</button>';
  html += '    </div>';
  html += '  </div>';

  html += '  <div class="data-recap-grid">';
  html += '    <div class="data-pill"><span class="data-pill-label">a (Optimista)</span><span class="data-pill-val">' + a + ' días</span></div>';
  html += '    <div class="data-pill"><span class="data-pill-label">m (Más Probable)</span><span class="data-pill-val">' + m + ' días</span></div>';
  html += '    <div class="data-pill"><span class="data-pill-label">b (Pesimista)</span><span class="data-pill-val">' + b + ' días</span></div>';
  html += '    <div class="data-pill highlight-pill"><span class="data-pill-label">Td (Plazo Estipulado)</span><span class="data-pill-val">' + td + ' días</span></div>';
  html += '  </div>';
  html += '</div>';

  // Gráfico 1: Comparativo Horizontal de Tiempos PERT
  html += '<div class="card visual-card">';
  html += '  <div class="visual-card-header">';
  html += '    <h4>Gráfico Comparativo de Tiempos (a, m, b, Te vs Td)</h4>';
  html += '    <span class="note">Muestra la posición relativa del plazo de bases (Td) frente al rango de incertidumbre</span>';
  html += '  </div>';
  html += '  <div class="chart-container-fluid">' + ChartsEngine.renderPertComparisonBar(a, m, b, te, td) + '</div>';
  html += '</div>';

  html += '<div class="step-cards-container">';

  // Paso a) Te
  html += '  <div class="step-card">';
  html += '    <div class="step-number">a</div>';
  html += '    <div class="step-content">';
  html += '      <h3 class="step-title">Calcule Te (Tiempo Esperado)</h3>';
  html += '      <div class="math-box">';
  html += '        <div class="math-formula"><strong>Fórmula:</strong> &nbsp; <span class="math-tex">T<sub>e</sub> = <span class="frac"><span class="top">a + 4m + b</span><span class="bottom">6</span></span></span></div>';
  html += '        <div class="math-replacement"><strong>Reemplazo:</strong> &nbsp; <span class="math-tex">T<sub>e</sub> = <span class="frac"><span class="top">' + a + ' + 4(' + m + ') + ' + b + '</span><span class="bottom">6</span></span> = <span class="frac"><span class="top">' + a + ' + ' + (4 * m) + ' + ' + b + '</span><span class="bottom">6</span></span> = <span class="frac"><span class="top">' + numTe + '</span><span class="bottom">6</span></span>' + (fracTe !== (numTe + '/6') ? ' = ' + fracTe : '') + '</span></div>';
  html += '        <div class="math-final-result"><span>Resultado:</span> <strong class="highlight-val">T<sub>e</sub> = ' + fmt(te, 2) + ' días</strong> <span class="exact-note">(' + fmt(te, 4) + ' exacto)</span></div>';
  html += '      </div>';
  html += '    </div>';
  html += '  </div>';

  // Paso b) Varianza
  html += '  <div class="step-card">';
  html += '    <div class="step-number">b</div>';
  html += '    <div class="step-content">';
  html += '      <h3 class="step-title">Calcule Varianza (&sigma;&sup2;)</h3>';
  html += '      <div class="math-box">';
  html += '        <div class="math-formula"><strong>Fórmula:</strong> &nbsp; <span class="math-tex">&sigma;<sup>2</sup> = (<span class="frac"><span class="top">b - a</span><span class="bottom">6</span></span>)<sup>2</sup> = <span class="frac"><span class="top">(b - a)<sup>2</sup></span><span class="bottom">36</span></span></span></div>';
  html += '        <div class="math-replacement"><strong>Reemplazo:</strong> &nbsp; <span class="math-tex">&sigma;<sup>2</sup> = (<span class="frac"><span class="top">' + b + ' - ' + a + '</span><span class="bottom">6</span></span>)<sup>2</sup> = (<span class="frac"><span class="top">' + diffBa + '</span><span class="bottom">6</span></span>)<sup>2</sup> = <span class="frac"><span class="top">' + diffBaSq + '</span><span class="bottom">36</span></span>' + (fracVar !== (diffBaSq + '/36') ? ' = ' + fracVar : '') + '</span></div>';
  html += '        <div class="math-final-result"><span>Resultado:</span> <strong class="highlight-val">&sigma;<sup>2</sup> = ' + fmt(variance, 2) + ' días<sup>2</sup></strong></div>';
  html += '      </div>';
  html += '    </div>';
  html += '  </div>';

  // Paso c) Desviación Estándar
  html += '  <div class="step-card">';
  html += '    <div class="step-number">c</div>';
  html += '    <div class="step-content">';
  html += '      <h3 class="step-title">Calcule Desviación Estándar (&sigma;)</h3>';
  html += '      <div class="math-box">';
  html += '        <div class="math-formula"><strong>Fórmula:</strong> &nbsp; <span class="math-tex">&sigma; = &radic;<span class="radicand">&sigma;<sup>2</sup></span> = <span class="frac"><span class="top">b - a</span><span class="bottom">6</span></span></span></div>';
  html += '        <div class="math-replacement"><strong>Reemplazo:</strong> &nbsp; <span class="math-tex">&sigma; = &radic;<span class="radicand">' + fmt(variance, 2) + '</span> = <span class="frac"><span class="top">' + diffBa + '</span><span class="bottom">6</span></span>' + (fracSigma !== (diffBa + '/6') ? ' = ' + fracSigma : '') + '</span></div>';
  html += '        <div class="math-final-result"><span>Resultado:</span> <strong class="highlight-val">&sigma; = ' + fmt(sigma, 2) + ' días</strong> <span class="exact-note">(' + fmt(sigma, 4) + ' exacto)</span></div>';
  html += '      </div>';
  html += '    </div>';
  html += '  </div>';

  // Paso d) Valor Z
  html += '  <div class="step-card">';
  html += '    <div class="step-number">d</div>';
  html += '    <div class="step-content">';
  html += '      <h3 class="step-title">Saque el valor Z</h3>';
  html += '      <div class="math-box">';
  html += '        <div class="math-formula"><strong>Fórmula:</strong> &nbsp; <span class="math-tex">Z = <span class="frac"><span class="top">T<sub>d</sub> - T<sub>e</sub></span><span class="bottom">&sigma;</span></span></span></div>';
  html += '        <div class="math-replacement"><strong>Reemplazo:</strong> &nbsp; <span class="math-tex">Z = <span class="frac"><span class="top">' + td + ' - ' + fmt(te, 4) + '</span><span class="bottom">' + fmt(sigma, 4) + '</span></span> = <span class="frac"><span class="top">' + fmt(diffTdTe, 4) + '</span><span class="bottom">' + fmt(sigma, 4) + '</span></span></span></div>';
  html += '        <div class="math-final-result"><span>Resultado:</span> <strong class="highlight-val">Z = ' + fmt(z, 2) + '</strong> <span class="exact-note">(' + fmt(z, 4) + ' valor continuo)</span></div>';
  html += '      </div>';
  html += '    </div>';
  html += '  </div>';

  // Paso e) Probabilidad y Riesgo
  html += '  <div class="step-card highlight-step-card">';
  html += '    <div class="step-number">e</div>';
  html += '    <div class="step-content">';
  html += '      <h3 class="step-title">¿Cuál es la probabilidad de cumplir con el tiempo estipulado? ¿Cuál es el riesgo?</h3>';
  
  html += '      <div class="prob-executive-duo">';
  // Tacómetro / Velocímetro Radial
  html += '        <div class="gauge-card-box">';
  html += '          <div class="gauge-title">Tacómetro de Certeza vs Riesgo</div>';
  html +=            ChartsEngine.renderRiskGauge(pctCumplir);
  html += '        </div>';

  // Métricas destacadas
  html += '        <div class="results-duo-grid">';
  html += '          <div class="result-duo-box success-box">';
  html += '            <div class="duo-icon">🎯</div>';
  html += '            <div class="duo-info">';
  html += '              <span class="duo-label">Probabilidad de Cumplir: P(T &le; ' + td + ' días)</span>';
  html += '              <div class="duo-math">P(Z &le; ' + fmt(z, 2) + ') = &Phi;(' + fmt(z, 2) + ')</div>';
  html += '              <div class="duo-percentage success-text">' + fmt(pctCumplir, 2) + '%</div>';
  html += '              <p class="duo-desc">Existe un <strong>' + fmt(pctCumplir, 2) + '%</strong> de probabilidad de finalizar la actividad en ' + td + ' días o menos.</p>';
  html += '            </div>';
  html += '          </div>';
  html += '          <div class="result-duo-box risk-box">';
  html += '            <div class="duo-icon">⚠️</div>';
  html += '            <div class="duo-info">';
  html += '              <span class="duo-label">Riesgo de Incumplimiento (Retraso)</span>';
  html += '              <div class="duo-math">Riesgo = 1 - P(T &le; ' + td + ') = 1 - ' + fmt(pctCumplir / 100, 4) + '</div>';
  html += '              <div class="duo-percentage risk-text">' + fmt(riesgo, 2) + '%</div>';
  html += '              <p class="duo-desc">Existe un <strong>' + fmt(riesgo, 2) + '%</strong> de riesgo de superar el plazo estipulado.</p>';
  html += '            </div>';
  html += '          </div>';
  html += '        </div>';
  html += '      </div>';

  html += '      <div class="management-verdict">';
  html += '        <span class="badge ' + badgeColor + '">' + veredictoTexto + '</span>';
  html += '        <span>' + (riesgo <= 10 
    ? 'El plazo de <strong>' + td + ' días</strong> es muy holgado respecto al tiempo esperado (' + fmt(te, 2) + ' días). El riesgo de demora es despreciable.' 
    : (riesgo <= 30 
      ? 'El plazo de <strong>' + td + ' días</strong> es viable con un margen de seguridad razonable (' + fmt(pctCumplir, 2) + '%).' 
      : '¡Atención de Dirección! El plazo de <strong>' + td + ' días</strong> presenta un alto riesgo de atraso (' + fmt(riesgo, 2) + '%). Se aconseja compresión de tiempos o asignación de mayores recursos.')
  ) + '</span>';
  html += '      </div>';

  // Gráfico 2: Campana de Gauss de Alta Definición
  html += '      <div class="gaussian-section">';
  html += '        <div class="gaussian-section-header">';
  html += '          <h4 class="gaussian-title">Campana de Gauss (Distribución Normal con Punto de Corte en Td = ' + td + ' días)</h4>';
  html += '          <span class="note">Verde: Probabilidad acumulada | Rojo: Cola de riesgo</span>';
  html += '        </div>';
  html += '        <div class="gaussian-container">' + ChartsEngine.renderGaussianBell(te, sigma, td, z, pctCumplir) + '</div>';
  html += '      </div>';

  html += '    </div>';
  html += '  </div>';

  html += '</div>';

  // Acciones al pie
  const escapedName = (name || 'Actividad').replace(/['\\"]/g, '');
  html += '<div class="prob-actions-bottom">';
  html += '  <button class="btn btn-success" onclick="ExcelExporter.exportProbabilityExercise(currentProbabilitySolution)">';
  html += '    📊 Exportar este Ejercicio a Excel (.xlsx)';
  html += '  </button>';
  html += '  <button class="btn btn-primary" onclick="sendToPertTable(\'' + escapedName + '\', ' + a + ', ' + m + ', ' + b + ')">';
  html += '    📥 Enviar esta actividad a la Tabla PERT & CPM';
  html += '  </button>';
  html += '</div>';

  return html;
}
