/* Presentación audiovisual breve del proyecto. Se muestra en cada carga de página. */
(() => {
  const body = document.body;
  if (!body || body.dataset.introReady === 'true') return;
  body.dataset.introReady = 'true';

  const overlay = document.createElement('div');
  overlay.className = `project-intro${body.classList.contains('tech-edition') ? ' intro-tech' : ''}`;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'Presentación del proyecto Grupo 4');
  overlay.innerHTML = `<div class="intro-shell">
    <div class="intro-topline"><span class="intro-live"><i aria-hidden="true"></i> PRESENTACIÓN DEL PROYECTO</span><span>00 / 13 · GRUPO 4</span></div>
    <div class="intro-media">
      <video class="intro-video" autoplay muted playsinline preload="auto" aria-label="Video de presentación del proyecto Sede Social El Bosque">
        <source src="intro-grupo4-sede-social-el-bosque.webm?v=20260929-intro-1" type="video/webm">
      </video>
      <div class="intro-fallback-art"><img src="grupo4_retrato.png?v=20260924-g4-2" alt="Integrantes del Grupo 4"></div>
      <div class="intro-vignette"></div>
      <div class="intro-overlay-copy"><span>PLANIFICACIÓN Y CONTROL DE OBRAS · GRUPO 4</span><h1>SEDE SOCIAL<br><em>EL BOSQUE</em></h1><p>Andacollo · Región de Coquimbo</p><small>Mario Pinto · Gerardo Pavez · Tomas Correa · Eliasin Roman</small></div>
    </div>
    <div class="intro-bottom"><span>MODELO INTEGRADO ES3 · 150 DÍAS CORRIDOS</span><button type="button" class="intro-skip">Omitir presentación <b aria-hidden="true">↗</b></button></div>
    <div class="intro-progress" aria-hidden="true"><i></i></div>
  </div>`;
  body.appendChild(overlay);
  body.classList.add('intro-open');

  const video = overlay.querySelector('.intro-video');
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    body.classList.remove('intro-open');
    overlay.classList.add('is-closing');
    window.setTimeout(() => overlay.remove(), 460);
  };
  overlay.querySelector('.intro-skip').addEventListener('click', close);
  video.addEventListener('ended', close, { once: true });
  video.addEventListener('error', () => overlay.classList.add('video-fallback'), { once: true });
  video.play().catch(() => overlay.classList.add('video-fallback'));

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    video.pause();
    overlay.classList.add('video-fallback');
    window.setTimeout(close, 2200);
  } else {
    window.setTimeout(close, 7600);
  }
})();
