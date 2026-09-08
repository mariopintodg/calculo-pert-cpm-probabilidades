/**
 * CHARTS MODULE - CONSTRUCTORA VICTORIA BRANDING
 * Gráficos vectoriales SVG de alta definición y totalmente responsivos
 * utilizando los colores corporativos: Naranja Victoria (#ff7200) y Azul Cerúleo (#289dd2)
 */

const ChartsEngine = {

  // 1. Campana de Gauss en Alta Definición (Constructora Victoria)
  renderGaussianBell(te, sigma, td, z, pctCumplir) {
    const width = 720;
    const height = 280;
    const padding = { top: 35, right: 40, bottom: 50, left: 40 };

    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const minX = te - 3.8 * sigma;
    const maxX = te + 3.8 * sigma;

    function toSvgX(val) {
      return padding.left + ((val - minX) / (maxX - minX)) * plotWidth;
    }

    function pdf(x) {
      const exp = -0.5 * Math.pow((x - te) / sigma, 2);
      return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(exp);
    }

    const maxPdf = pdf(te);

    function toSvgY(p) {
      return padding.top + plotHeight - (p / (maxPdf * 1.18)) * plotHeight;
    }

    const points = [];
    const steps = 160;
    const dx = (maxX - minX) / steps;

    for (let i = 0; i <= steps; i++) {
      const curX = minX + i * dx;
      const curY = pdf(curX);
      points.push({ x: curX, y: curY, svgX: toSvgX(curX), svgY: toSvgY(curY) });
    }

    const curveD = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.svgX.toFixed(1)} ${pt.svgY.toFixed(1)}`).join(' ');

    const clampedTd = Math.max(minX, Math.min(maxX, td));
    const fillPoints = points.filter(pt => pt.x <= clampedTd);
    const tdSvgX = toSvgX(clampedTd);
    const tdSvgY = toSvgY(pdf(clampedTd));

    let shadedAreaCumplir = '';
    if (fillPoints.length > 0) {
      const basePath = fillPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.svgX.toFixed(1)} ${pt.svgY.toFixed(1)}`).join(' ');
      shadedAreaCumplir = `${basePath} L ${tdSvgX.toFixed(1)} ${tdSvgY.toFixed(1)} L ${tdSvgX.toFixed(1)} ${(padding.top + plotHeight).toFixed(1)} L ${toSvgX(minX).toFixed(1)} ${(padding.top + plotHeight).toFixed(1)} Z`;
    }

    const rightPoints = points.filter(pt => pt.x >= clampedTd);
    let shadedAreaRiesgo = '';
    if (rightPoints.length > 0) {
      const basePathR = rightPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.svgX.toFixed(1)} ${pt.svgY.toFixed(1)}`).join(' ');
      shadedAreaRiesgo = `M ${tdSvgX.toFixed(1)} ${(padding.top + plotHeight).toFixed(1)} L ${tdSvgX.toFixed(1)} ${tdSvgY.toFixed(1)} ${basePathR.replace(/^M/, 'L')} L ${toSvgX(maxX).toFixed(1)} ${(padding.top + plotHeight).toFixed(1)} Z`;
    }

    const yBase = padding.top + plotHeight;
    const teSvgX = toSvgX(te);

    // Sigmas
    const sigmas = [-2, -1, 1, 2].map(s => {
      const val = te + s * sigma;
      return { s, val, x: toSvgX(val), y: toSvgY(pdf(val)) };
    });

    let sigmasHtml = sigmas.map(item => `
      <line x1="${item.x.toFixed(1)}" y1="${item.y.toFixed(1)}" x2="${item.x.toFixed(1)}" y2="${yBase}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2 2" />
      <text x="${item.x.toFixed(1)}" y="${yBase + 14}" text-anchor="middle" font-size="9" font-weight="600" fill="#94a3b8">${item.s > 0 ? '+' : ''}${item.s}&sigma;</text>
      <text x="${item.x.toFixed(1)}" y="${yBase + 26}" text-anchor="middle" font-size="9" fill="#64748b">${item.val.toFixed(1)}</text>
    `).join('');

    return `
      <svg viewBox="0 0 ${width} ${height}" class="pro-svg-chart" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad-cump-pro" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.65"/>
            <stop offset="100%" stop-color="#10b981" stop-opacity="0.10"/>
          </linearGradient>
          <linearGradient id="grad-risk-pro" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ef4444" stop-opacity="0.65"/>
            <stop offset="100%" stop-color="#ef4444" stop-opacity="0.10"/>
          </linearGradient>
          <filter id="shadow-curve-victoria" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#289dd2" flood-opacity="0.4"/>
          </filter>
        </defs>

        <!-- Eje horizontal base -->
        <line x1="${padding.left}" y1="${yBase}" x2="${width - padding.right}" y2="${yBase}" stroke="#94a3b8" stroke-width="1.5" />

        <!-- Líneas guía de desviaciones estándar -->
        ${sigmasHtml}

        <!-- Áreas de Probabilidad sombreadas -->
        ${shadedAreaCumplir ? `<path d="${shadedAreaCumplir}" fill="url(#grad-cump-pro)" />` : ''}
        ${shadedAreaRiesgo ? `<path d="${shadedAreaRiesgo}" fill="url(#grad-risk-pro)" />` : ''}

        <!-- Curva Normal en Azul Cerúleo Victoria -->
        <path d="${curveD}" fill="none" stroke="#289dd2" stroke-width="3" filter="url(#shadow-curve-victoria)" />

        <!-- Media Te en Naranja Victoria -->
        <line x1="${teSvgX}" y1="${toSvgY(maxPdf)}" x2="${teSvgX}" y2="${yBase}" stroke="#ff7200" stroke-width="2" stroke-dasharray="4 3" />
        <circle cx="${teSvgX}" cy="${toSvgY(maxPdf)}" r="5" fill="#ff7200" stroke="#ffffff" stroke-width="1.5" />
        <rect x="${teSvgX - 34}" y="${yBase + 4}" width="68" height="17" rx="4" fill="#fff7ed" stroke="#fed7aa" stroke-width="1" />
        <text x="${teSvgX}" y="${yBase + 16}" text-anchor="middle" font-size="10" font-weight="900" fill="#c2410c">Te = ${te.toFixed(2)}</text>
        <text x="${teSvgX}" y="${yBase + 32}" text-anchor="middle" font-size="9" fill="#64748b">(Media &mu;)</text>

        <!-- Corte Plazo Estipulado Td -->
        <line x1="${tdSvgX}" y1="${padding.top - 2}" x2="${tdSvgX}" y2="${yBase}" stroke="#0f172a" stroke-width="2.5" />
        <rect x="${tdSvgX - 38}" y="${padding.top - 24}" width="76" height="20" rx="5" fill="#0f172a" />
        <text x="${tdSvgX}" y="${padding.top - 10}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#ffffff">Td = ${td.toFixed(2)} d</text>
        <text x="${tdSvgX}" y="${yBase + 44}" text-anchor="middle" font-size="11" font-weight="800" fill="#0f172a">Z = ${z.toFixed(2)}</text>

        <!-- Etiquetas de leyenda de áreas -->
        <g transform="translate(${padding.left + 15}, ${padding.top + 15})">
          <rect x="0" y="0" width="12" height="12" rx="3" fill="#10b981" />
          <text x="18" y="10" font-size="10.5" font-weight="700" fill="#065f46">Cumplimiento P(T &le; ${td}): ${pctCumplir.toFixed(1)}%</text>
        </g>
        <g transform="translate(${width - padding.right - 170}, ${padding.top + 15})">
          <rect x="0" y="0" width="12" height="12" rx="3" fill="#ef4444" />
          <text x="18" y="10" font-size="10.5" font-weight="700" fill="#991b1b">Riesgo Retraso: ${(100 - pctCumplir).toFixed(1)}%</text>
        </g>
      </svg>
    `;
  },

  // 2. Radial Risk Gauge
  renderRiskGauge(pctCumplir) {
    const width = 280;
    const height = 180;
    const cx = 140;
    const cy = 140;
    const r = 100;
    const strokeWidth = 18;

    const angle = Math.max(0, Math.min(100, pctCumplir)) * 1.8;
    const needleRad = (180 - angle) * (Math.PI / 180);
    const needleLen = r - 15;
    const nx = cx + needleLen * Math.cos(needleRad);
    const ny = cy - needleLen * Math.sin(needleRad);

    let statusColor = '#10b981';
    let statusText = 'Excelente / Muy Seguro';
    if (pctCumplir < 50) {
      statusColor = '#ef4444';
      statusText = 'Alto Riesgo de Retraso';
    } else if (pctCumplir < 80) {
      statusColor = '#f59e0b';
      statusText = 'Margen Moderado';
    }

    return `
      <svg viewBox="0 0 ${width} ${height}" class="pro-gauge-svg" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gauge-grad-victoria" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#ef4444" />
            <stop offset="45%" stop-color="#f59e0b" />
            <stop offset="75%" stop-color="#289dd2" />
            <stop offset="100%" stop-color="#10b981" />
          </linearGradient>
        </defs>

        <path d="M 40 140 A 100 100 0 0 1 240 140" fill="none" stroke="#e2e8f0" stroke-width="${strokeWidth}" stroke-linecap="round" />
        <path d="M 40 140 A 100 100 0 0 1 240 140" fill="none" stroke="url(#gauge-grad-victoria)" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="0.9" />

        <text x="35" y="162" font-size="10" font-weight="700" fill="#94a3b8">0%</text>
        <text x="140" y="30" text-anchor="middle" font-size="10" font-weight="700" fill="#94a3b8">50%</text>
        <text x="245" y="162" text-anchor="end" font-size="10" font-weight="700" fill="#94a3b8">100%</text>

        <line x1="${cx}" y1="${cy}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="#0f172a" stroke-width="3.2" stroke-linecap="round" />
        <circle cx="${cx}" cy="${cy}" r="7" fill="#ff7200" />
        <circle cx="${cx}" cy="${cy}" r="3" fill="#ffffff" />

        <text x="${cx}" y="115" text-anchor="middle" font-size="24" font-weight="900" font-family="'Fira Code', monospace" fill="${statusColor}">
          ${pctCumplir.toFixed(1)}%
        </text>
        <text x="${cx}" y="132" text-anchor="middle" font-size="10" font-weight="700" text-transform="uppercase" fill="#64748b">
          ${statusText}
        </text>
      </svg>
    `;
  },

  // 3. Diagrama Comparativo de Tiempos PERT (Constructora Victoria)
  renderPertComparisonBar(a, m, b, te, td) {
    const width = 680;
    const height = 120;
    const minVal = Math.min(a, td) * 0.85;
    const maxVal = Math.max(b, td) * 1.12;

    function toScaleX(v) {
      return 50 + ((v - minVal) / (maxVal - minVal)) * (width - 100);
    }

    const xA = toScaleX(a);
    const xM = toScaleX(m);
    const xB = toScaleX(b);
    const xTe = toScaleX(te);
    const xTd = toScaleX(td);

    return `
      <svg viewBox="0 0 ${width} ${height}" class="pro-bar-chart" xmlns="http://www.w3.org/2000/svg">
        <!-- Rango de Incertidumbre a -> b con suave tono naranja -->
        <rect x="${xA}" y="48" width="${xB - xA}" height="14" rx="7" fill="#fff7ed" stroke="#fed7aa" stroke-width="1.8" />
        
        <line x1="40" y1="55" x2="${width - 40}" y2="55" stroke="#cbd5e1" stroke-width="1.5" stroke-dasharray="3 3" />

        <!-- Optimista (a) -->
        <circle cx="${xA}" cy="55" r="6" fill="#10b981" />
        <text x="${xA}" y="36" text-anchor="middle" font-size="10" font-weight="700" fill="#047857">a = ${a}d</text>
        <text x="${xA}" y="80" text-anchor="middle" font-size="9" fill="#64748b">Optimista</text>

        <!-- Más Probable (m) en Azul Victoria -->
        <circle cx="${xM}" cy="55" r="6" fill="#289dd2" />
        <text x="${xM}" y="36" text-anchor="middle" font-size="10" font-weight="800" fill="#0284c7">m = ${m}d</text>
        <text x="${xM}" y="80" text-anchor="middle" font-size="9" fill="#64748b">Más Probable</text>

        <!-- Pesimista (b) -->
        <circle cx="${xB}" cy="55" r="6" fill="#ef4444" />
        <text x="${xB}" y="36" text-anchor="middle" font-size="10" font-weight="700" fill="#b91c1c">b = ${b}d</text>
        <text x="${xB}" y="80" text-anchor="middle" font-size="9" fill="#64748b">Pesimista</text>

        <!-- Indicador Te (Esperado) en Naranja Victoria -->
        <polygon points="${xTe - 6},48 ${xTe + 6},48 ${xTe},62" fill="#ff7200" />
        <circle cx="${xTe}" cy="55" r="4.5" fill="#ea580c" />
        <rect x="${xTe - 36}" y="6" width="72" height="18" rx="4" fill="#ff7200" />
        <text x="${xTe}" y="19" text-anchor="middle" font-size="10.5" font-weight="900" fill="#ffffff">Te = ${te.toFixed(2)}d</text>

        <!-- Indicador Td (Plazo bases) -->
        <line x1="${xTd}" y1="28" x2="${xTd}" y2="82" stroke="#0f172a" stroke-width="2.5" />
        <circle cx="${xTd}" cy="28" r="4" fill="#0f172a" />
        <text x="${xTd}" y="100" text-anchor="middle" font-size="11" font-weight="800" fill="#0f172a">Td = ${td}d (Plazo)</text>
      </svg>
    `;
  },

  // 4. Cronograma de Barras Gantt (Constructora Victoria)
  renderGanttChart(cpmResult) {
    if (!cpmResult || !cpmResult.sortedIds) return '';
    const { sortedIds, activities, projectDuration } = cpmResult;

    const rowHeight = 32;
    const headerHeight = 40;
    const leftMargin = 100;
    const rightMargin = 40;
    const totalHeight = headerHeight + sortedIds.length * rowHeight + 20;
    const width = 740;
    const barAreaWidth = width - leftMargin - rightMargin;

    function toGanttX(time) {
      return leftMargin + (time / projectDuration) * barAreaWidth;
    }

    const timeSteps = Math.min(10, projectDuration);
    const stepVal = projectDuration / timeSteps;
    let gridLinesHtml = '';

    for (let i = 0; i <= timeSteps; i++) {
      const t = Math.round(i * stepVal);
      const gx = toGanttX(t);
      gridLinesHtml += `
        <line x1="${gx}" y1="${headerHeight}" x2="${gx}" y2="${totalHeight - 15}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="2 2" />
        <text x="${gx}" y="${headerHeight - 8}" text-anchor="middle" font-size="9" font-weight="600" fill="#94a3b8">${t}d</text>
      `;
    }

    let rowsHtml = '';
    sortedIds.forEach((id, idx) => {
      const act = activities[id];
      const y = headerHeight + idx * rowHeight;
      const xStart = toGanttX(act.ES);
      const barWidth = Math.max(4, toGanttX(act.EF) - xStart);
      // Naranja Victoria para ruta crítica, Azul Cerúleo para partidas no críticas
      const barColor = act.isCritical ? '#ff7200' : '#289dd2';
      const slackWidth = toGanttX(act.LF) - toGanttX(act.EF);

      rowsHtml += `
        <text x="${leftMargin - 12}" y="${y + 18}" text-anchor="end" font-size="11" font-weight="800" fill="${act.isCritical ? '#ff7200' : '#1e293b'}">
          ${act.id} ${act.isCritical ? '★' : ''}
        </text>

        ${slackWidth > 0 ? `
          <rect x="${toGanttX(act.EF)}" y="${y + 7}" width="${slackWidth}" height="14" rx="3" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2 2" />
        ` : ''}

        <rect x="${xStart}" y="${y + 5}" width="${barWidth}" height="18" rx="4" fill="${barColor}" />
        <text x="${xStart + barWidth / 2}" y="${y + 17}" text-anchor="middle" font-size="9.5" font-weight="800" fill="#ffffff">
          ${act.duration}d
        </text>
      `;
    });

    return `
      <svg viewBox="0 0 ${width} ${totalHeight}" class="pro-gantt-svg" xmlns="http://www.w3.org/2000/svg">
        ${gridLinesHtml}
        ${rowsHtml}
      </svg>
    `;
  },

  // 5. Curva S de Probabilidad Acumulada
  renderSCurve(te, sigma, td) {
    const width = 640;
    const height = 220;
    const padding = { top: 25, right: 35, bottom: 40, left: 50 };
    const plotW = width - padding.left - padding.right;
    const plotH = height - padding.top - padding.bottom;

    const minX = te - 3.2 * sigma;
    const maxX = te + 3.2 * sigma;

    function toX(val) {
      return padding.left + ((val - minX) / (maxX - minX)) * plotW;
    }
    function toY(prob) {
      return padding.top + plotH - prob * plotH;
    }

    const points = [];
    const steps = 80;
    const dx = (maxX - minX) / steps;

    for (let i = 0; i <= steps; i++) {
      const cx = minX + i * dx;
      const z = (cx - te) / sigma;
      const prob = standardNormalCDF(z);
      points.push({ x: toX(cx), y: toY(prob), prob });
    }

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    const zTd = (td - te) / sigma;
    const probTd = standardNormalCDF(zTd);
    const xTd = toX(Math.max(minX, Math.min(maxX, td)));
    const yTd = toY(probTd);

    return `
      <svg viewBox="0 0 ${width} ${height}" class="pro-scurve-svg" xmlns="http://www.w3.org/2000/svg">
        <line x1="${padding.left}" y1="${padding.top + plotH}" x2="${width - padding.right}" y2="${padding.top + plotH}" stroke="#cbd5e1" stroke-width="1.5" />
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + plotH}" stroke="#cbd5e1" stroke-width="1.5" />

        <text x="${padding.left - 8}" y="${toY(1) + 4}" text-anchor="end" font-size="9" fill="#94a3b8">100%</text>
        <line x1="${padding.left}" y1="${toY(1)}" x2="${width - padding.right}" y2="${toY(1)}" stroke="#f1f5f9" stroke-width="1" />
        <text x="${padding.left - 8}" y="${toY(0.5) + 4}" text-anchor="end" font-size="9" fill="#94a3b8">50%</text>
        <line x1="${padding.left}" y1="${toY(0.5)}" x2="${width - padding.right}" y2="${toY(0.5)}" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3 3" />
        <text x="${padding.left - 8}" y="${toY(0) + 4}" text-anchor="end" font-size="9" fill="#94a3b8">0%</text>

        <!-- Curva S en Azul Victoria -->
        <path d="${pathD}" fill="none" stroke="#289dd2" stroke-width="3.2" />

        <!-- Punto Td en Naranja Victoria -->
        <line x1="${xTd.toFixed(1)}" y1="${yTd.toFixed(1)}" x2="${xTd.toFixed(1)}" y2="${padding.top + plotH}" stroke="#ff7200" stroke-width="1.8" stroke-dasharray="3 3" />
        <line x1="${padding.left}" y1="${yTd.toFixed(1)}" x2="${xTd.toFixed(1)}" y2="${yTd.toFixed(1)}" stroke="#ff7200" stroke-width="1.8" stroke-dasharray="3 3" />
        <circle cx="${xTd.toFixed(1)}" cy="${yTd.toFixed(1)}" r="6" fill="#ff7200" stroke="#ffffff" stroke-width="2" />

        <text x="${xTd.toFixed(1)}" y="${padding.top + plotH + 18}" text-anchor="middle" font-size="10" font-weight="800" fill="#0f172a">Td = ${td}d</text>
        <text x="${padding.left + 8}" y="${yTd.toFixed(1) - 6}" font-size="10.5" font-weight="900" fill="#c2410c">${(probTd * 100).toFixed(1)}%</text>
      </svg>
    `;
  }
};
