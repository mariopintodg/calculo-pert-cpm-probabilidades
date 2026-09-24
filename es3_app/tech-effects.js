(() => {
  const body = document.body;
  if (!body.classList.contains('tech-edition')) return;

  const app = document.getElementById('app');
  const progress = document.getElementById('techScrollProgress');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');
  let revealObserver;
  let pointerFrame = 0;

  function revealContent() {
    if (revealObserver) revealObserver.disconnect();
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return;

    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('tech-reveal-await');
        entry.target.classList.add('tech-reveal-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -24px 0px', threshold: 0.04 });

    app.querySelectorAll('.insight-widget, .dashboard-panel, .card, .section-summary, .role-card, .stage-card, .performance-group, .risk-card, .risk-stat, .commitment-window, .eepp-period, .methodology-card, .journey').forEach((element, index) => {
      element.classList.remove('tech-reveal-visible');
      element.classList.add('tech-reveal-await');
      element.style.setProperty('--tech-reveal-delay', `${Math.min(index % 5, 4) * 65}ms`);
      revealObserver.observe(element);
    });
  }

  function drawChartLines() {
    app.querySelectorAll('path.chart-line').forEach((path) => {
      try {
        path.style.setProperty('--tech-path-length', path.getTotalLength().toFixed(1));
        path.classList.remove('tech-draw');
        void path.getBoundingClientRect();
        path.classList.add('tech-draw');
      } catch (_) {
        // The chart remains readable even if a browser cannot measure its path.
      }
    });
  }

  function updateScrollProgress() {
    const extent = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${extent > 0 ? Math.min(100, Math.max(0, window.scrollY / extent * 100)) : 0}%`;
  }

  function onRender(tab) {
    body.dataset.techTab = tab || '';
    app.classList.remove('tech-page-enter');
    void app.offsetWidth;
    app.classList.add('tech-page-enter');
    revealContent();
    drawChartLines();
    requestAnimationFrame(updateScrollProgress);
  }

  document.addEventListener('es3:render', (event) => onRender(event.detail?.tab));
  onRender(document.querySelector('#tabs .tab.active')?.dataset.tab);

  document.addEventListener('pointermove', (event) => {
    if (reducedMotion.matches || !finePointer.matches || pointerFrame) return;
    const { clientX, clientY } = event;
    pointerFrame = requestAnimationFrame(() => {
      body.style.setProperty('--pointer-x', `${clientX}px`);
      body.style.setProperty('--pointer-y', `${clientY}px`);
      pointerFrame = 0;
    });
  }, { passive: true });

  document.addEventListener('pointerdown', (event) => {
    if (reducedMotion.matches) return;
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    const bounds = button.getBoundingClientRect();
    const spark = document.createElement('span');
    spark.className = 'tech-spark';
    spark.style.left = `${event.clientX - bounds.left}px`;
    spark.style.top = `${event.clientY - bounds.top}px`;
    button.appendChild(spark);
    spark.addEventListener('animationend', () => spark.remove(), { once: true });
  });

  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('resize', updateScrollProgress, { passive: true });
})();
