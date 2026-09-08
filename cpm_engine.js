/**
 * CPM Engine - Motor de Cálculo para el Método de la Ruta Crítica
 */
class CPMEngine {
  static calculate(rawActivities) {
    if (!rawActivities || rawActivities.length === 0) {
      throw new Error("No se proporcionaron actividades para calcular.");
    }

    const activities = {};
    const actList = [];

    rawActivities.forEach(item => {
      const id = String(item.id || '').trim().toUpperCase();
      if (!id) return;

      const duration = Math.round(parseFloat(item.duration));
      if (isNaN(duration) || duration < 0) {
        throw new Error(`La duración de la actividad '${id}' debe ser un número válido mayor o igual a 0.`);
      }

      let preds = [];
      if (Array.isArray(item.predecessors)) {
        preds = item.predecessors;
      } else if (typeof item.predecessors === 'string') {
        preds = item.predecessors.split(/[,\-\s\/]+/).map(p => p.trim());
      }
      preds = preds
        .map(p => String(p).trim().toUpperCase())
        .filter(p => p && p !== '-' && p !== '—' && p !== id);

      activities[id] = {
        id,
        name: item.name || id,
        duration,
        predecessors: Array.from(new Set(preds)),
        successors: [],
        ES: 0, // IT (Inicio Temprano)
        EF: 0, // FT (Fin Temprano)
        LS: 0, // ITa (Inicio Tardío)
        LF: 0, // FTa (Fin Tardío)
        TF: 0, // Holgura Total (HT)
        FF: 0, // Holgura Libre (HL)
        isCritical: false,
        layer: 0
      };
      actList.push(id);
    });

    if (actList.length === 0) {
      throw new Error("No se ingresaron actividades con identificadores válidos.");
    }

    // Validar dependencias existentes
    for (const id of actList) {
      for (const pred of activities[id].predecessors) {
        if (!activities[pred]) {
          throw new Error(`La predecesora '${pred}' de la partida '${id}' no existe en la lista de actividades.`);
        }
        activities[pred].successors.push(id);
      }
    }

    // Ordenamiento topológico (Kahn's Algorithm) y detección de bucles
    const inDegree = {};
    actList.forEach(id => { inDegree[id] = activities[id].predecessors.length; });

    const queue = actList.filter(id => inDegree[id] === 0);
    const sorted = [];

    while (queue.length > 0) {
      const current = queue.shift();
      sorted.push(current);

      for (const succ of activities[current].successors) {
        inDegree[succ]--;
        if (inDegree[succ] === 0) {
          queue.push(succ);
        }
      }
    }

    if (sorted.length !== actList.length) {
      const cyclics = actList.filter(id => inDegree[id] > 0);
      throw new Error(`Se detectó una dependencia circular (bucle) que involucra a las actividades: ${cyclics.join(', ')}.`);
    }

    // Paso hacia adelante (Forward Pass)
    for (const id of sorted) {
      const act = activities[id];
      if (act.predecessors.length === 0) {
        act.ES = 0;
        act.layer = 0;
      } else {
        let maxEF = -Infinity;
        let maxPredLayer = 0;
        for (const predId of act.predecessors) {
          const pred = activities[predId];
          if (pred.EF > maxEF) maxEF = pred.EF;
          if (pred.layer > maxPredLayer) maxPredLayer = pred.layer;
        }
        act.ES = Math.round(maxEF);
        act.layer = maxPredLayer + 1;
      }
      act.EF = Math.round(act.ES + act.duration);
    }

    // Duración total del proyecto
    let projectDuration = 0;
    for (const id of actList) {
      if (activities[id].EF > projectDuration) {
        projectDuration = Math.round(activities[id].EF);
      }
    }

    // Paso hacia atrás (Backward Pass)
    for (let i = sorted.length - 1; i >= 0; i--) {
      const id = sorted[i];
      const act = activities[id];

      if (act.successors.length === 0) {
        act.LF = projectDuration;
      } else {
        let minLS = Infinity;
        for (const succId of act.successors) {
          const succ = activities[succId];
          if (succ.LS < minLS) minLS = succ.LS;
        }
        act.LF = Math.round(minLS);
      }
      act.LS = Math.round(act.LF - act.duration);

      // Holguras
      act.TF = Math.round(act.LS - act.ES);

      let minSuccES = act.successors.length === 0 
        ? projectDuration 
        : Math.min(...act.successors.map(sId => activities[sId].ES));
      act.FF = Math.round(minSuccES - act.EF);

      // Actividad crítica si Holgura Total es 0
      act.isCritical = Math.abs(act.TF) < 0.0001;
    }

    // Buscar rutas críticas completas
    const criticalPaths = this._findCriticalPaths(activities, sorted);

    return {
      projectDuration,
      activities,
      sortedIds: sorted,
      criticalPaths,
      primaryCriticalPath: criticalPaths[0] || []
    };
  }

  static _findCriticalPaths(activities, sorted) {
    const startNodes = sorted.filter(id => activities[id].isCritical && activities[id].predecessors.filter(p => activities[p].isCritical).length === 0);
    const paths = [];

    function dfs(currentId, currentPath) {
      const act = activities[currentId];
      const criticalSuccs = act.successors.filter(succId => {
        const succ = activities[succId];
        return succ.isCritical && Math.abs(succ.ES - act.EF) < 0.0001;
      });

      if (criticalSuccs.length === 0) {
        paths.push([...currentPath]);
        return;
      }

      for (const nextId of criticalSuccs) {
        currentPath.push(nextId);
        dfs(nextId, currentPath);
        currentPath.pop();
      }
    }

    for (const start of startNodes) {
      dfs(start, [start]);
    }

    return paths;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CPMEngine;
}
if (typeof window !== 'undefined') {
  window.CPMEngine = CPMEngine;
}
