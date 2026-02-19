/* ═══════════════════════════════════════════
   Ambient Particle Field
   Subtle floating dots with faint connections
   ═══════════════════════════════════════════ */
(function () {
  const canvas = document.createElement('canvas');
  canvas.id = 'particle-canvas';
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  /* ── Settings ── */
  const CFG = {
    count: 60,            // base particle count (scales with screen)
    speed: 0.25,          // max drift speed
    size: [1, 2.2],       // dot radius range
    opacity: [0.08, 0.25],// dot opacity range
    linkDist: 130,        // px — draw line if closer
    linkOpacity: 0.07,    // line opacity at distance 0
    mouse: 180,           // mouse interaction radius
    mouseForce: 0.012,    // gentle push away
    pulse: true,          // subtle size pulsing
  };

  let W, H, particles = [], mouse = { x: -9999, y: -9999 }, dpr = 1, raf;

  /* ── Particle ── */
  class Particle {
    constructor() {
      this.reset(true);
    }
    reset(initial) {
      this.x = Math.random() * W;
      this.y = initial ? Math.random() * H : -10;
      this.r = CFG.size[0] + Math.random() * (CFG.size[1] - CFG.size[0]);
      this.baseR = this.r;
      this.opacity = CFG.opacity[0] + Math.random() * (CFG.opacity[1] - CFG.opacity[0]);
      this.vx = (Math.random() - 0.5) * CFG.speed * 2;
      this.vy = Math.random() * CFG.speed * 0.5 + CFG.speed * 0.15;
      this.phase = Math.random() * Math.PI * 2;
      this.phaseSpeed = 0.008 + Math.random() * 0.012;
    }
    update() {
      /* drift */
      this.x += this.vx;
      this.y += this.vy;

      /* pulse */
      if (CFG.pulse) {
        this.phase += this.phaseSpeed;
        this.r = this.baseR + Math.sin(this.phase) * 0.4;
      }

      /* mouse repel */
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CFG.mouse && dist > 0) {
        const force = (1 - dist / CFG.mouse) * CFG.mouseForce;
        this.vx += (dx / dist) * force;
        this.vy += (dy / dist) * force;
      }

      /* dampen velocity */
      this.vx *= 0.999;
      this.vy *= 0.999;

      /* wrap / recycle */
      if (this.x < -20) this.x = W + 10;
      if (this.x > W + 20) this.x = -10;
      if (this.y > H + 20) this.reset(false);
      if (this.y < -20) this.y = H + 10;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${this.opacity})`;
      ctx.fill();
    }
  }

  /* ── Resize ── */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    /* scale particle count to screen area */
    const target = Math.round(CFG.count * (W * H) / (1920 * 1080));
    while (particles.length < target) particles.push(new Particle());
    while (particles.length > target) particles.pop();
  }

  /* ── Draw connections ── */
  function drawLinks() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CFG.linkDist) {
          const alpha = (1 - dist / CFG.linkDist) * CFG.linkOpacity;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  /* ── Animation loop ── */
  function loop() {
    ctx.clearRect(0, 0, W, H);
    for (const p of particles) {
      p.update();
      p.draw();
    }
    drawLinks();
    raf = requestAnimationFrame(loop);
  }

  /* ── Events ── */
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mouseout', () => { mouse.x = -9999; mouse.y = -9999; });

  /* ── Reduce motion preference ── */
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  function checkMotion() {
    if (mq.matches) {
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, W, H);
      canvas.style.display = 'none';
    } else {
      canvas.style.display = '';
      resize();
      loop();
    }
  }
  mq.addEventListener('change', checkMotion);

  /* ── Boot ── */
  resize();
  checkMotion();
  if (!mq.matches) loop();
})();
