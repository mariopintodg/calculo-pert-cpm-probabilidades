/**
 * DiagramRenderer - Renderizado SVG para el diagrama de red CPM (AON)
 * con estética idéntica al diagrama del usuario (Imagen 1)
 */
class DiagramRenderer {
  constructor(svgElementId, containerId, fileBaseName = 'diagrama_cpm_aon') {
    this.svg = document.getElementById(svgElementId);
    this.container = document.getElementById(containerId);
    this.instanceKey = String(svgElementId).replace(/[^a-z0-9_-]/gi, '-');
    this.fileBaseName = fileBaseName;
    this.data = null;
    this.nodePositions = {};
    this.nodeRadius = 26;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.mainGroup = null;

    this._setupInteractions();
  }

  render(cpmResult) {
    this.data = cpmResult;
    this._calculateLayout();
    this.draw();
  }

  _calculateLayout() {
    if (!this.data) return;
    const { activities, sortedIds } = this.data;

    // Agrupar actividades por capa topológica
    const layers = {};
    let maxLayer = 0;

    sortedIds.forEach(id => {
      const act = activities[id];
      const layer = act.layer;
      if (!layers[layer]) layers[layer] = [];
      layers[layer].push(id);
      if (layer > maxLayer) maxLayer = layer;
    });

    const layerKeys = Object.keys(layers).map(Number).sort((a, b) => a - b);

    const xSpacing = 145;
    const ySpacing = 110;
    const offsetX = 80;

    let maxNodesInLayer = 0;
    layerKeys.forEach(l => {
      if (layers[l].length > maxNodesInLayer) maxNodesInLayer = layers[l].length;
    });

    const totalHeight = Math.max(520, (maxNodesInLayer + 1) * ySpacing + 40);

    this.nodePositions = {};

    layerKeys.forEach(l => {
      const ids = layers[l];
      const layerHeight = (ids.length - 1) * ySpacing;
      const startY = (totalHeight - layerHeight) / 2;

      ids.forEach((id, index) => {
        this.nodePositions[id] = {
          x: offsetX + l * xSpacing,
          y: startY + index * ySpacing
        };
      });
    });

    this.contentWidth = offsetX + (maxLayer + 1) * xSpacing + 80;
    this.contentHeight = totalHeight;
  }

  draw() {
    if (!this.data) return;
    const { activities } = this.data;

    this.svg.innerHTML = '';

    // Marcadores de flechas y patrón de cuadrícula
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
      <marker id="arrow-blue-${this.instanceKey}" viewBox="0 0 10 10" refX="7" refY="5"
        markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#2563eb" />
      </marker>
      <marker id="arrow-red-${this.instanceKey}" viewBox="0 0 10 10" refX="7" refY="5"
        markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#dc2626" />
      </marker>
      <pattern id="grid-paper-${this.instanceKey}" width="22" height="22" patternUnits="userSpaceOnUse">
        <rect width="22" height="22" fill="#fafbfe" />
        <path d="M 22 0 L 0 0 0 22" fill="none" stroke="#e0e7ff" stroke-width="0.75" />
      </pattern>
    `;
    this.svg.appendChild(defs);

    // Fondo tipo cuaderno milimetrado
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("width", "100%");
    bgRect.setAttribute("height", "100%");
    bgRect.setAttribute("fill", `url(#grid-paper-${this.instanceKey})`);
    this.svg.appendChild(bgRect);

    // Grupo de transformación principal (Zoom y Paneo)
    const mainGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    mainGroup.setAttribute("id", `${this.instanceKey}-main-graph-group`);
    this.mainGroup = mainGroup;
    mainGroup.setAttribute("transform", `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
    this.svg.appendChild(mainGroup);

    // 1. Conexiones (Flechas)
    const connectionsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    connectionsGroup.setAttribute("id", "connections-group");
    mainGroup.appendChild(connectionsGroup);

    Object.keys(activities).forEach(sourceId => {
      const source = activities[sourceId];
      const sourcePos = this.nodePositions[sourceId];

      source.successors.forEach(targetId => {
        const target = activities[targetId];
        const targetPos = this.nodePositions[targetId];

        const isCriticalEdge = source.isCritical && target.isCritical && Math.abs(target.ES - source.EF) < 0.0001;
        const path = this._createCurvedPath(sourcePos, targetPos, isCriticalEdge);
        connectionsGroup.appendChild(path);
      });
    });

    // 2. Nodos
    const nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    nodesGroup.setAttribute("id", "nodes-group");
    mainGroup.appendChild(nodesGroup);

    Object.keys(activities).forEach(id => {
      const act = activities[id];
      const pos = this.nodePositions[id];
      const nodeEl = this._createNodeElement(act, pos);
      nodesGroup.appendChild(nodeEl);
    });
  }

  _createCurvedPath(p1, p2, isCritical) {
    const r = this.nodeRadius;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 1) {
      return document.createElementNS("http://www.w3.org/2000/svg", "path");
    }

    const sx = p1.x + (dx / dist) * r;
    const sy = p1.y + (dy / dist) * r;
    const tx = p2.x - (dx / dist) * (r + 4);
    const ty = p2.y - (dy / dist) * (r + 4);

    const cx1 = sx + (tx - sx) * 0.45;
    const cy1 = sy;
    const cx2 = sx + (tx - sx) * 0.55;
    const cy2 = ty;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const d = `M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tx} ${ty}`;
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");

    if (isCritical) {
      path.setAttribute("stroke", "#dc2626");
      path.setAttribute("stroke-width", "2.8");
      path.setAttribute("marker-end", `url(#arrow-red-${this.instanceKey})`);
      path.setAttribute("class", "critical-edge");
    } else {
      path.setAttribute("stroke", "#2563eb");
      path.setAttribute("stroke-width", "1.6");
      path.setAttribute("marker-end", `url(#arrow-blue-${this.instanceKey})`);
      path.setAttribute("class", "normal-edge");
    }

    return path;
  }

  _createNodeElement(act, pos) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", `node-group ${act.isCritical ? 'critical-node' : 'normal-node'}`);
    g.setAttribute("data-id", act.id);
    g.setAttribute("cursor", "grab");

    const r = this.nodeRadius;
    const strokeColor = act.isCritical ? "#dc2626" : "#2563eb";
    const fillColor = "#ffffff";
    const textColor = act.isCritical ? "#991b1b" : "#1e40af";
    const subtextColor = act.isCritical ? "#b91c1c" : "#1d4ed8";

    // Círculo principal
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", pos.x);
    circle.setAttribute("cy", pos.y);
    circle.setAttribute("r", r);
    circle.setAttribute("fill", fillColor);
    circle.setAttribute("stroke", strokeColor);
    circle.setAttribute("stroke-width", act.isCritical ? "2.5" : "1.8");
    circle.setAttribute("filter", "drop-shadow(0 2px 4px rgba(0,0,0,0.06))");
    g.appendChild(circle);

    // Texto central: ID de la actividad
    const textName = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textName.setAttribute("x", pos.x);
    textName.setAttribute("y", pos.y - 1);
    textName.setAttribute("text-anchor", "middle");
    textName.setAttribute("dominant-baseline", "middle");
    textName.setAttribute("font-family", "'Segoe UI', 'Comic Neue', sans-serif");
    textName.setAttribute("font-size", "15");
    textName.setAttribute("font-weight", "bold");
    textName.setAttribute("fill", textColor);
    textName.textContent = act.id;
    g.appendChild(textName);

    // Texto central inferior: Duración d=...
    const textDur = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textDur.setAttribute("x", pos.x);
    textDur.setAttribute("y", pos.y + 13);
    textDur.setAttribute("text-anchor", "middle");
    textDur.setAttribute("font-family", "'Segoe UI', 'Comic Neue', sans-serif");
    textDur.setAttribute("font-size", "10");
    textDur.setAttribute("font-weight", "600");
    textDur.setAttribute("fill", textColor);
    const isPertDiagram = this.data && this.data.diagramType === 'pert';
    const formatPertTime = value => Number(value).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const durationText = isPertDiagram ? formatPertTime(act.duration) : Math.round(act.duration);
    textDur.textContent = `${isPertDiagram ? 'Te=' : 'd='}${durationText}`;
    g.appendChild(textDur);

    // Texto ARRIBA: IT | FT
    const textTop = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textTop.setAttribute("x", pos.x);
    textTop.setAttribute("y", pos.y - r - 6);
    textTop.setAttribute("text-anchor", "middle");
    textTop.setAttribute("font-family", "'Segoe UI', monospace");
    textTop.setAttribute("font-size", "11.5");
    textTop.setAttribute("font-weight", "bold");
    textTop.setAttribute("fill", subtextColor);
    textTop.textContent = isPertDiagram ? `${formatPertTime(act.ES)} | ${formatPertTime(act.EF)}` : `${Math.round(act.ES)} | ${Math.round(act.EF)}`;
    g.appendChild(textTop);

    // Texto ABAJO: ITa | FTa
    const textBottom = document.createElementNS("http://www.w3.org/2000/svg", "text");
    textBottom.setAttribute("x", pos.x);
    textBottom.setAttribute("y", pos.y + r + 16);
    textBottom.setAttribute("text-anchor", "middle");
    textBottom.setAttribute("font-family", "'Segoe UI', monospace");
    textBottom.setAttribute("font-size", "11.5");
    textBottom.setAttribute("font-weight", "bold");
    textBottom.setAttribute("fill", subtextColor);
    textBottom.textContent = isPertDiagram ? `${formatPertTime(act.LS)} | ${formatPertTime(act.LF)}` : `${Math.round(act.LS)} | ${Math.round(act.LF)}`;
    g.appendChild(textBottom);

    return g;
  }

  _setupInteractions() {
    let activeNode = null;
    let dragStartOffset = { x: 0, y: 0 };

    this.svg.addEventListener('mousedown', (e) => {
      const nodeGroup = e.target.closest('.node-group');
      if (nodeGroup) {
        activeNode = nodeGroup.getAttribute('data-id');
        nodeGroup.setAttribute("cursor", "grabbing");
        const pos = this.nodePositions[activeNode];
        const svgRect = this.svg.getBoundingClientRect();
        const mouseX = (e.clientX - svgRect.left - this.panX) / this.zoom;
        const mouseY = (e.clientY - svgRect.top - this.panY) / this.zoom;
        dragStartOffset = { x: mouseX - pos.x, y: mouseY - pos.y };
        e.stopPropagation();
        return;
      }

      this.isDragging = true;
      this.startX = e.clientX - this.panX;
      this.startY = e.clientY - this.panY;
    });

    window.addEventListener('mousemove', (e) => {
      if (activeNode) {
        const svgRect = this.svg.getBoundingClientRect();
        const mouseX = (e.clientX - svgRect.left - this.panX) / this.zoom;
        const mouseY = (e.clientY - svgRect.top - this.panY) / this.zoom;
        this.nodePositions[activeNode].x = mouseX - dragStartOffset.x;
        this.nodePositions[activeNode].y = mouseY - dragStartOffset.y;
        this.draw();
        return;
      }

      if (this.isDragging) {
        this.panX = e.clientX - this.startX;
        this.panY = e.clientY - this.startY;
        const group = this.mainGroup;
        if (group) {
          group.setAttribute("transform", `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
        }
      }
    });

    window.addEventListener('mouseup', () => {
      if (activeNode) {
        const el = this.svg.querySelector(`[data-id="${activeNode}"]`);
        if (el) el.setAttribute("cursor", "grab");
        activeNode = null;
      }
      this.isDragging = false;
    });

    // Soporte para dispositivos móviles (Touch events)
    let touchStartX = 0;
    let touchStartY = 0;
    let initialPinchDist = 0;

    this.svg.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        touchStartX = e.touches[0].clientX - this.panX;
        touchStartY = e.touches[0].clientY - this.panY;
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        initialPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    }, { passive: true });

    this.svg.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        this.panX = e.touches[0].clientX - touchStartX;
        this.panY = e.touches[0].clientY - touchStartY;
        const group = this.mainGroup;
        if (group) {
          group.setAttribute("transform", `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
        }
      } else if (e.touches.length === 2 && initialPinchDist > 0) {
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = currentDist / initialPinchDist;
        this.zoom = Math.min(Math.max(0.3, this.zoom * (factor > 1 ? 1.02 : 0.98)), 3);
        const group = this.mainGroup;
        if (group) {
          group.setAttribute("transform", `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
        }
      }
    }, { passive: true });

    this.svg.addEventListener('touchend', () => {
      this.isDragging = false;
      initialPinchDist = 0;
    }, { passive: true });
  }

  zoomIn() {
    this.zoom = Math.min(this.zoom * 1.2, 3);
    const group = this.mainGroup;
    if (group) group.setAttribute("transform", `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
  }

  zoomOut() {
    this.zoom = Math.max(this.zoom / 1.2, 0.3);
    const group = this.mainGroup;
    if (group) group.setAttribute("transform", `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
  }

  zoomBy(factor) {
    const safeFactor = Number(factor);
    if (!Number.isFinite(safeFactor) || safeFactor <= 0) return;
    this.zoom = Math.min(Math.max(this.zoom * safeFactor, 0.3), 3);
    if (this.mainGroup) this.mainGroup.setAttribute("transform", `translate(${this.panX}, ${this.panY}) scale(${this.zoom})`);
  }

  resetView() {
    if (!this.contentWidth || !this.contentHeight) return;
    const svgRect = this.svg.getBoundingClientRect();
    const padding = 30;
    const scaleX = (svgRect.width - padding * 2) / this.contentWidth;
    const scaleY = (svgRect.height - padding * 2) / this.contentHeight;
    this.zoom = Math.min(Math.max(0.4, Math.min(scaleX, scaleY)), 1.15);
    this.panX = (svgRect.width - this.contentWidth * this.zoom) / 2;
    this.panY = (svgRect.height - this.contentHeight * this.zoom) / 2;
    this.draw();
  }

  exportSVG() {
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(this.svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${this.fileBaseName}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportPNG() {
    const svgRect = this.svg.getBoundingClientRect();
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(this.svg);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const URLObj = window.URL || window.webkitURL || window;
    const blobURL = URLObj.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = svgRect.width * 2;
      canvas.height = svgRect.height * 2;
      const context = canvas.getContext("2d");
      context.scale(2, 2);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, svgRect.width, svgRect.height);

      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `${this.fileBaseName}.png`;
      a.click();
    };
    image.src = blobURL;
  }
}

if (typeof window !== 'undefined') {
  window.DiagramRenderer = DiagramRenderer;
}
