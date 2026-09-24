/* Lectura y navegación de las dos ediciones en pantallas pequeñas. */
(() => {
  const tabs = document.getElementById('tabs');
  const app = document.getElementById('app');
  if (!tabs || !app) return;

  const picker = document.createElement('div');
  picker.className = 'mobile-module-picker';
  const label = document.createElement('label');
  label.htmlFor = 'mobileModuleSelect';
  label.textContent = 'Ir a una sección';
  const select = document.createElement('select');
  select.id = 'mobileModuleSelect';
  select.setAttribute('aria-label', 'Seleccionar sección del proyecto');
  picker.append(label, select);
  tabs.before(picker);

  function syncPicker() {
    const buttons = [...tabs.querySelectorAll('button[data-tab]')];
    if (select.options.length !== buttons.length) {
      select.replaceChildren(...buttons.map((button) => {
        const option = document.createElement('option');
        option.value = button.dataset.tab;
        option.textContent = button.textContent.trim().replace(/^⌂\s*/, '');
        return option;
      }));
    }
    select.value = tabs.querySelector('.tab.active')?.dataset.tab || 'home';
  }

  select.addEventListener('change', () => {
    tabs.querySelector(`button[data-tab="${select.value}"]`)?.click();
  });

  function addPanHints() {
    app.querySelectorAll('.table-scroll, .chart-wrap, .network-wrap').forEach((view) => {
      if (!view.getClientRects().length || view.scrollWidth <= view.clientWidth + 12) return;
      if (view.previousElementSibling?.classList.contains('mobile-pan-hint')) return;
      const hint = document.createElement('p');
      hint.className = 'mobile-pan-hint';
      hint.textContent = view.classList.contains('network-wrap')
        ? '↔ Arrastra el fondo para recorrer la malla. Toca un nodo para moverlo; usa + y − para el zoom.'
        : '↔ Desliza esta vista a los lados para consultar todos los datos.';
      view.before(hint);
    });
  }

  function buildMobileGantt() {
    const table = app.querySelector('.gantt-card .gantt-table');
    if (!table) return;
    const body = table.closest('.card-body');
    const original = table.closest('.table-scroll');
    const cards = document.createElement('div');
    cards.className = 'mobile-gantt-cards';
    cards.setAttribute('aria-label', 'Carta Gantt en tarjetas');
    const title = document.createElement('div');
    title.className = 'mobile-gantt-title';
    title.textContent = 'Actividades y fechas · lectura móvil';
    cards.appendChild(title);

    [...table.tBodies[0].rows].forEach((row) => {
      const cells = [...row.cells];
      const card = document.createElement('article');
      card.className = 'mobile-gantt-item';
      const top = document.createElement('div');
      top.className = 'mobile-gantt-top';
      const code = document.createElement('span');
      code.textContent = `EDT ${cells[0].textContent.trim()} · ${cells[1].textContent.trim()}`;
      const duration = document.createElement('b');
      duration.textContent = cells[3].textContent.trim();
      top.append(code, duration);
      const name = document.createElement('strong');
      name.className = 'mobile-gantt-name';
      name.textContent = cells[2].textContent.trim();
      const dates = document.createElement('div');
      dates.className = 'mobile-gantt-dates';
      dates.textContent = `${cells[4].textContent.trim()} → ${cells[5].textContent.trim()}`;
      const track = document.createElement('div');
      track.className = 'mobile-gantt-track';
      const bar = document.createElement('i');
      const sourceBar = cells[6].querySelector('.gantt-bar');
      if (sourceBar) {
        bar.style.left = sourceBar.style.left;
        bar.style.width = sourceBar.style.width;
        if (sourceBar.classList.contains('critical')) bar.classList.add('critical');
      }
      track.appendChild(bar);
      card.append(top, name, dates, track);
      cards.appendChild(card);
    });

    body.insertBefore(cards, original);
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'mobile-gantt-table-toggle';
    toggle.textContent = 'Ver tabla completa ↔';
    toggle.setAttribute('aria-expanded', 'false');
    original.before(toggle);
    toggle.addEventListener('click', () => {
      const open = original.classList.toggle('mobile-table-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Ocultar tabla completa' : 'Ver tabla completa ↔';
      requestAnimationFrame(addPanHints);
    });
  }

  function refresh() {
    syncPicker();
    buildMobileGantt();
    requestAnimationFrame(() => requestAnimationFrame(addPanHints));
  }

  document.addEventListener('es3:render', refresh);
  app.addEventListener('toggle', () => requestAnimationFrame(addPanHints), true);
  refresh();
})();
