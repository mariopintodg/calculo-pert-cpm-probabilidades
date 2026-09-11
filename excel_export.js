/**
 * EXCEL EXPORT ENGINE - SUITE INTEGRAL PERT • CPM • PROBABILIDAD
 * Utiliza SheetJS (xlsx.full.min.js) para generar archivos .xlsx profesionales
 * tanto individuales por módulo como un Libro Ejecutivo Consolidado Multihoja.
 */

const ExcelExporter = {

  // 1. Exportar Ejercicio de Probabilidad Individual a Excel (.xlsx)
  exportProbabilityExercise(solution) {
    if (!solution || !solution.success) {
      alert("No hay un ejercicio resuelto para exportar.");
      return;
    }

    const { inputs, results } = solution;
    const data = [
      ["CONSTRUCTORA VICTORIA • CONTROL Y GESTIÓN DE OBRAS", "", "", ""],
      ["INFORME DE EJERCICIO DE PROBABILIDAD Y RIESGO", "", "", ""],
      ["Fecha de generación:", new Date().toLocaleString(), "", ""],
      ["", "", "", ""],
      ["1. DATOS DE ENTRADA (ACTIVIDAD)", "", "", ""],
      ["Concepto", "Parámetro", "Valor", "Unidad"],
      ["Nombre de la Actividad", "Actividad", inputs.name || "Preparación de terreno", ""],
      ["Tiempo Optimista", "a", inputs.a, "días"],
      ["Tiempo Más Probable", "m", inputs.m, "días"],
      ["Tiempo Pesimista", "b", inputs.b, "días"],
      ["Plazo Estipulado (Bases)", "Td", inputs.td, "días"],
      ["", "", "", ""],
      ["2. RESULTADOS Y PREGUNTAS RESUELTAS", "", "", ""],
      ["Pregunta", "Fórmula Teórica", "Reemplazo Numérico", "Resultado"],
      [
        "a) Tiempo Esperado (Te)",
        "Te = (a + 4m + b) / 6",
        `Te = (${inputs.a} + 4*${inputs.m} + ${inputs.b}) / 6`,
        Number(results.te.toFixed(4))
      ],
      [
        "b) Varianza (σ²)",
        "σ² = ((b - a) / 6)²",
        `σ² = ((${inputs.b} - ${inputs.a}) / 6)² = (${results.diffBa}/6)²`,
        Number(results.variance.toFixed(4))
      ],
      [
        "c) Desviación Estándar (σ)",
        "σ = (b - a) / 6 = √σ²",
        `σ = (${inputs.b} - ${inputs.a}) / 6 = ${results.diffBa}/6`,
        Number(results.sigma.toFixed(4))
      ],
      [
        "d) Valor Normalizado Z",
        "Z = (Td - Te) / σ",
        `Z = (${inputs.td} - ${results.te.toFixed(2)}) / ${results.sigma.toFixed(2)}`,
        Number(results.z.toFixed(4))
      ],
      [
        "e.1) Probabilidad de Cumplir",
        "P(T <= Td) = Φ(Z)",
        `Φ(${results.z.toFixed(2)})`,
        `${results.pctCumplir.toFixed(2)}%`
      ],
      [
        "e.2) Riesgo de Retraso",
        "Riesgo = 1 - P(T <= Td)",
        `1 - ${(results.pctCumplir / 100).toFixed(4)}`,
        `${results.riesgo.toFixed(2)}%`
      ],
      ["", "", "", ""],
      ["3. DIAGNÓSTICO EJECUTIVO DE GESTIÓN", "", "", ""],
      [
        results.riesgo <= 10 ? "RIESGO BAJO (SEGURO)" : results.riesgo <= 30 ? "RIESGO MODERADO" : "RIESGO CRÍTICO",
        `El cumplimiento en ${inputs.td} días es de ${results.pctCumplir.toFixed(2)}% con un valor Z de ${results.z.toFixed(2)}.`,
        "",
        ""
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 32 }, { wch: 30 }, { wch: 45 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Probabilidad_Paso_a_Paso");
    XLSX.writeFile(wb, `Ejercicio_Probabilidad_${(inputs.name || 'Actividad').replace(/\s+/g, '_')}.xlsx`);
  },

  // 2. Exportar Tabla PERT a Excel (.xlsx)
  exportPertTable(activities) {
    if (!activities || activities.length === 0) {
      alert("No hay actividades en la tabla PERT para exportar.");
      return;
    }

    const data = [
      ["SUITE INTEGRAL: PERT - CPM - PROBABILIDAD", "", "", "", "", "", "", "", ""],
      ["TABLA DE ESTIMACIÓN DE TIEMPOS PERT", "", "", "", "", "", "", "", ""],
      ["Fecha:", new Date().toLocaleString(), "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", ""],
      [
        "PARTIDAS",
        "PREDECESORA",
        "DURACIÓN (m)",
        "a (optimista)",
        "m (probable)",
        "b (pesimista)",
        "Te (Esperado)",
        "Varianza (σ²)",
        "Desv. Estándar (σ)"
      ]
    ];

    let sumDur = 0, sumA = 0, sumM = 0, sumB = 0, sumTe = 0, sumVar = 0;

    activities.forEach(act => {
      const a = parseFloat(act.a) || 0;
      const m = parseFloat(act.m) || 0;
      const b = parseFloat(act.b) || 0;
      const te = (a + 4 * m + b) / 6;
      const v = Math.pow((b - a) / 6, 2);
      const sd = (b - a) / 6;
      const dur = parseFloat(act.duracion) || 0;

      sumDur += dur;
      sumA += a;
      sumM += m;
      sumB += b;
      sumTe += te;
      sumVar += v;

      data.push([
        act.partida,
        act.predecesora || "—",
        dur,
        a,
        m,
        b,
        Number(te.toFixed(4)),
        Number(v.toFixed(4)),
        Number(sd.toFixed(4))
      ]);
    });

    const totalSd = Math.sqrt(sumVar);

    data.push(["", "", "", "", "", "", "", "", ""]);
    data.push([
      "TOTALES DEL PROYECTO",
      "—",
      sumDur,
      sumA,
      sumM,
      sumB,
      Number(sumTe.toFixed(4)),
      Number(sumVar.toFixed(4)),
      Number(totalSd.toFixed(4))
    ]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
      { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 20 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tabla_PERT");
    XLSX.writeFile(wb, "Tabla_PERT_Completa.xlsx");
  },

  // 3. Exportar Resultados CPM a Excel (.xlsx)
  exportCpmResults(cpmResult) {
    if (!cpmResult || !cpmResult.sortedIds) {
      alert("No hay resultados CPM disponibles para exportar.");
      return;
    }

    const { projectDuration, criticalPaths, activities, sortedIds } = cpmResult;
    const cpChain = criticalPaths && criticalPaths.length > 0 ? criticalPaths[0].join(" → ") : "No determinada";

    const data = [
      ["SUITE INTEGRAL: PERT - CPM - PROBABILIDAD", "", "", "", "", "", "", "", "", ""],
      ["INFORME DE RUTA CRÍTICA Y HOLGURAS (MÉTODO CPM)", "", "", "", "", "", "", "", "", ""],
      ["Fecha de generación:", new Date().toLocaleString(), "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", ""],
      ["DURACIÓN TOTAL DEL PROYECTO:", `${projectDuration} días`, "", "", "", "", "", "", "", ""],
      ["RUTA CRÍTICA IDENTIFICADA:", cpChain, "", "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", "", "", ""],
      [
        "PARTIDA",
        "PREDECESORAS",
        "DURACIÓN (d)",
        "IT (ES - Inicio Temprano)",
        "FT (EF - Fin Temprano)",
        "ITa (LS - Inicio Tardío)",
        "FTa (LF - Fin Tardío)",
        "HOLGURA TOTAL (HT)",
        "HOLGURA LIBRE (HL)",
        "¿ES CRÍTICA?"
      ]
    ];

    sortedIds.forEach(id => {
      const act = activities[id];
      data.push([
        act.id,
        act.predecessors.join(", ") || "—",
        act.duration,
        act.ES,
        act.EF,
        act.LS,
        act.LF,
        act.TF,
        act.FF,
        act.isCritical ? "SÍ (CRÍTICA)" : "NO"
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 14 }, { wch: 22 }, { wch: 20 },
      { wch: 22 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 16 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resultados_CPM");
    XLSX.writeFile(wb, "Analisis_Ruta_Critica_CPM.xlsx");
  },

  // 4. Exportar Probabilidad del Proyecto Completo a Excel (.xlsx)
  exportProjectProb(projData) {
    if (!projData) return;

    const data = [
      ["SUITE INTEGRAL: PERT - CPM - PROBABILIDAD", "", ""],
      ["EVALUACIÓN DE PROBABILIDAD Z DEL PROYECTO", "", ""],
      ["Fecha:", new Date().toLocaleString(), ""],
      ["", "", ""],
      ["Parámetro", "Valor", "Detalle"],
      ["Base del Análisis", projData.modeLabel, ""],
      ["Tiempo Esperado (Te Ref)", Number(projData.te.toFixed(4)), "días"],
      ["Desviación Estándar (σ Ref)", Number(projData.sd.toFixed(4)), "días"],
      ["Plazo Contractual Meta (Td)", projData.td, "días"],
      ["Valor Normalizado Z", Number(projData.z.toFixed(4)), "desviaciones estándar"],
      ["Probabilidad de Éxito P(T <= Td)", `${projData.pct.toFixed(2)}%`, "Certeza de terminar a tiempo"],
      ["Riesgo de Atraso (1 - P)", `${projData.risk.toFixed(2)}%`, "Probabilidad de exceder el plazo contractual"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Probabilidad_Proyecto");
    XLSX.writeFile(wb, "Probabilidad_Proyecto_Z.xlsx");
  },

  // 5. 🏆 EXPORTAR INFORME MAESTRO CONSOLIDADO (LIBRO MULTIHOJA .xlsx)
  exportMasterReport(probSolution, pertActivities, cpmResult, projProbData) {
    const wb = XLSX.utils.book_new();

    // HOJA 1: RESUMEN EJECUTIVO
    const resumenData = [
      ["SUITE INTEGRAL: GESTIÓN DE PROYECTOS PERT • CPM • PROBABILIDAD", "", ""],
      ["INFORME MAESTRO CONSOLIDADO", "", ""],
      ["Generado el:", new Date().toLocaleString(), ""],
      ["", "", ""],
      ["1. INDICADORES GENERALES DEL PROYECTO", "", ""],
      ["Métrica", "Valor", "Unidad / Estado"],
      ["Número de Actividades Planificadas", pertActivities ? pertActivities.length : 0, "actividades"],
      ["Duración Total del Proyecto (CPM)", cpmResult ? `${cpmResult.projectDuration} días` : "--", ""],
      ["Ruta Crítica Identificada", cpmResult && cpmResult.criticalPaths[0] ? cpmResult.criticalPaths[0].join(" → ") : "--", ""],
      ["", "", ""],
      ["2. PROBABILIDAD DE CUMPLIMIENTO GLOBAL", "", ""],
      ["Plazo Meta Contractual (Td)", projProbData ? `${projProbData.td} días` : "--", ""],
      ["Tiempo Esperado de Ruta Crítica (Te)", projProbData ? `${projProbData.te.toFixed(2)} días` : "--", ""],
      ["Desviación Estándar Crítica (σ)", projProbData ? `${projProbData.sd.toFixed(2)} días` : "--", ""],
      ["Valor Normalizado Z", projProbData ? projProbData.z.toFixed(2) : "--", ""],
      ["Probabilidad de Cumplir a Tiempo", projProbData ? `${projProbData.pct.toFixed(2)}%` : "--", ""],
      ["Riesgo de Atraso Estimado", projProbData ? `${projProbData.risk.toFixed(2)}%` : "--", ""]
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    wsResumen['!cols'] = [{ wch: 38 }, { wch: 30 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen_Ejecutivo");

    // HOJA 2: TABLA PERT
    if (pertActivities && pertActivities.length > 0) {
      const pertData = [
        ["TABLA DE ESTIMACIÓN PERT (PARTIDAS, DURACIÓN Y PARÁMETROS a, b, m)", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", ""],
        ["PARTIDA", "PREDECESORA", "DURACIÓN (m)", "a (optimista)", "b (pesimista)", "m (probable)", "Te (Esperado)", "Varianza (σ²)", "Desv. (σ)"]
      ];
      let sumD = 0, sumTe = 0, sumV = 0;
      pertActivities.forEach(act => {
        const a = parseFloat(act.a) || 0;
        const m = parseFloat(act.m) || 0;
        const b = parseFloat(act.b) || 0;
        const te = (a + 4 * m + b) / 6;
        const v = Math.pow((b - a) / 6, 2);
        const sd = (b - a) / 6;
        const dur = parseFloat(act.duracion) || 0;
        sumD += dur; sumTe += te; sumV += v;
        pertData.push([act.partida, act.predecesora, dur, a, b, m, Number(te.toFixed(4)), Number(v.toFixed(4)), Number(sd.toFixed(4))]);
      });
      pertData.push(["", "", "", "", "", "", "", "", ""]);
      pertData.push(["TOTALES", "—", sumD, "—", "—", "—", Number(sumTe.toFixed(4)), Number(sumV.toFixed(4)), Number(Math.sqrt(sumV).toFixed(4))]);
      const wsPert = XLSX.utils.aoa_to_sheet(pertData);
      wsPert['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, wsPert, "Tabla_PERT");
    }

    // HOJA 3: CPM Y HOLGURAS
    if (cpmResult && cpmResult.sortedIds) {
      const cpmData = [
        ["MÉTODO DE LA RUTA CRÍTICA (CPM) - MATRIZ DE HOLGURAS", "", "", "", "", "", "", "", "", ""],
        ["Ruta Crítica:", cpmResult.criticalPaths[0] ? cpmResult.criticalPaths[0].join(" → ") : "--", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", ""],
        ["PARTIDA", "PREDECESORAS", "DURACIÓN", "IT (ES)", "FT (EF)", "ITa (LS)", "FTa (LF)", "HOLGURA TOTAL (HT)", "HOLGURA LIBRE (HL)", "¿ES CRÍTICA?"]
      ];
      cpmResult.sortedIds.forEach(id => {
        const act = cpmResult.activities[id];
        cpmData.push([
          act.id, act.predecessors.join(", ") || "—", act.duration,
          act.ES, act.EF, act.LS, act.LF, act.TF, act.FF,
          act.isCritical ? "SÍ (CRÍTICA)" : "NO"
        ]);
      });
      const wsCpm = XLSX.utils.aoa_to_sheet(cpmData);
      wsCpm['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 20 }, { wch: 20 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, wsCpm, "Matriz_CPM");
    }

    // HOJA 4: EJERCICIO DETALLADO DE PROBABILIDAD (PIZARRA)
    if (probSolution && probSolution.success) {
      const { inputs, results } = probSolution;
      const probData = [
        ["EJERCICIO DE PROBABILIDAD RESUELTO PASO A PASO", "", "", ""],
        ["Actividad:", inputs.name || "Preparación de terreno", "", ""],
        ["", "", "", ""],
        ["Parámetro", "Símbolo", "Valor", "Unidad"],
        ["Tiempo Optimista", "a", inputs.a, "días"],
        ["Tiempo Más Probable", "m", inputs.m, "días"],
        ["Tiempo Pesimista", "b", inputs.b, "días"],
        ["Tiempo Estipulado", "Td", inputs.td, "días"],
        ["", "", "", ""],
        ["Pregunta", "Fórmula", "Reemplazo", "Resultado"],
        ["a) Tiempo Esperado", "Te = (a + 4m + b)/6", `(${inputs.a} + 4*${inputs.m} + ${inputs.b})/6`, Number(results.te.toFixed(4))],
        ["b) Varianza", "σ² = ((b-a)/6)²", `((${inputs.b}-${inputs.a})/6)²`, Number(results.variance.toFixed(4))],
        ["c) Desviación Estándar", "σ = (b-a)/6", `(${inputs.b}-${inputs.a})/6`, Number(results.sigma.toFixed(4))],
        ["d) Valor Z", "Z = (Td - Te)/σ", `(${inputs.td} - ${results.te.toFixed(2)})/${results.sigma.toFixed(2)}`, Number(results.z.toFixed(4))],
        ["e) Probabilidad Cumplir", "P(T <= Td) = Φ(Z)", `Φ(${results.z.toFixed(2)})`, `${results.pctCumplir.toFixed(2)}%`],
        ["e) Riesgo de Retraso", "Riesgo = 1 - P", `1 - ${(results.pctCumplir/100).toFixed(4)}`, `${results.riesgo.toFixed(2)}%`]
      ];
      const wsProb = XLSX.utils.aoa_to_sheet(probData);
      wsProb['!cols'] = [{ wch: 28 }, { wch: 26 }, { wch: 32 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, wsProb, "Ejercicio_Pizarra_Paso_a_Paso");
    }

    XLSX.writeFile(wb, "Informe_Maestro_Consolidado_PERT_CPM.xlsx");
  }
};
