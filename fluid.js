(() => {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('[data-menu-button]');
  const navLinks = document.querySelector('[data-nav-links]');
  const hero = document.querySelector('[data-hero]');

  const setYear = () => {
    document.querySelectorAll('[data-year]').forEach((node) => {
      node.textContent = String(new Date().getFullYear());
    });
  };

  const updateHeader = () => {
    header?.classList.toggle('scrolled', window.scrollY > 24);
  };

  const closeMenu = () => {
    if (!menuButton || !navLinks) return;
    menuButton.setAttribute('aria-expanded', 'false');
    navLinks.classList.remove('mobile-open');
    document.body.classList.remove('menu-open');
  };

  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!open));
    navLinks?.classList.toggle('mobile-open', !open);
    document.body.classList.toggle('menu-open', !open);
  });

  navLinks?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) closeMenu();
  }, { passive: true });

  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();
  setYear();

  if (!reducedMotion && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('motion-ready');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

    document.querySelectorAll('.reveal:not(.in-view)').forEach((element) => observer.observe(element));
  } else {
    document.querySelectorAll('.reveal').forEach((element) => element.classList.add('in-view'));
  }

  if (!reducedMotion) {
    window.addEventListener('pointermove', (event) => {
      const x = (event.clientX / window.innerWidth) * 100;
      const y = (event.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty('--pointer-x', `${x}%`);
      document.documentElement.style.setProperty('--pointer-y', `${y}%`);

      if (hero) {
        const rect = hero.getBoundingClientRect();
        const hx = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const hy = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        hero.style.setProperty('--hero-x', hx.toFixed(3));
        hero.style.setProperty('--hero-y', hy.toFixed(3));
      }
    }, { passive: true });

    document.querySelectorAll('.magnetic').forEach((button) => {
      button.addEventListener('pointermove', (event) => {
        const rect = button.getBoundingClientRect();
        const x = (event.clientX - rect.left - rect.width / 2) * 0.12;
        const y = (event.clientY - rect.top - rect.height / 2) * 0.12;
        button.style.setProperty('--mag-x', `${x.toFixed(2)}px`);
        button.style.setProperty('--mag-y', `${y.toFixed(2)}px`);
      });
      button.addEventListener('pointerleave', () => {
        button.style.setProperty('--mag-x', '0px');
        button.style.setProperty('--mag-y', '0px');
      });
    });

    document.querySelectorAll('.interactive-card').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty('--card-x', `${x}%`);
        card.style.setProperty('--card-y', `${y}%`);
      });
    });
  }

  const canvas = document.getElementById('waveCanvas');
  if (!canvas || reducedMotion) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let animationFrame = 0;
  let lastTime = 0;
  let pointerTarget = 0;
  let pointerValue = 0;
  let visible = true;

  const layers = [
    { y: .29, amp: .085, speed: .00019, freq: 1.15, phase: .2, top: '#ead4ca', bottom: '#e7c4b5', alpha: .74, line: 'rgba(117,76,59,.25)', blur: 0 },
    { y: .41, amp: .12, speed: .00023, freq: 1.42, phase: 1.6, top: '#f0c68a', bottom: '#e9a24d', alpha: .73, line: 'rgba(136,76,35,.35)', blur: .25 },
    { y: .54, amp: .115, speed: .00029, freq: 1.02, phase: 2.8, top: '#e9a471', bottom: '#e87b46', alpha: .79, line: 'rgba(144,58,33,.48)', blur: 0 },
    { y: .67, amp: .09, speed: .00036, freq: 1.52, phase: .9, top: '#db6a49', bottom: '#c74735', alpha: .88, line: 'rgba(105,37,30,.55)', blur: 0 },
    { y: .79, amp: .07, speed: .00044, freq: 1.2, phase: 3.9, top: '#bb433a', bottom: '#92353a', alpha: .95, line: 'rgba(89,29,34,.65)', blur: 0 }
  ];

  const resizeCanvas = () => {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const waveY = (x, layer, time) => {
    const n = x / width;
    const base = height * layer.y;
    const first = Math.sin((n * Math.PI * 2 * layer.freq) + time * layer.speed + layer.phase);
    const second = Math.sin((n * Math.PI * 2 * (layer.freq * .53)) - time * layer.speed * .72 + layer.phase * 1.7);
    const third = Math.cos((n * Math.PI * 2 * .37) + time * layer.speed * .36);
    const pointerShape = Math.exp(-Math.pow((n - pointerValue) * 4.1, 2)) * height * .034;
    return base + (first * .58 + second * .28 + third * .14) * height * layer.amp - pointerShape;
  };

  const drawLayer = (layer, time) => {
    const gradient = ctx.createLinearGradient(0, height * layer.y - height * layer.amp, 0, height);
    gradient.addColorStop(0, layer.top);
    gradient.addColorStop(1, layer.bottom);

    ctx.save();
    ctx.globalAlpha = layer.alpha;
    ctx.filter = layer.blur ? `blur(${layer.blur}px)` : 'none';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, waveY(0, layer, time));

    const step = Math.max(8, width / 150);
    for (let x = step; x <= width + step; x += step) {
      ctx.lineTo(x, waveY(x, layer, time));
    }

    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = Math.min(1, layer.alpha + .08);
    ctx.beginPath();
    ctx.moveTo(0, waveY(0, layer, time));
    for (let x = step; x <= width + step; x += step) {
      ctx.lineTo(x, waveY(x, layer, time));
    }
    ctx.strokeStyle = layer.line;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = .23;
    ctx.beginPath();
    ctx.moveTo(0, waveY(0, layer, time) - 2.5);
    for (let x = step; x <= width + step; x += step) {
      ctx.lineTo(x, waveY(x, layer, time) - 2.5);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.92)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  };

  const render = (time) => {
    if (!visible) return;
    if (!lastTime) lastTime = time;
    lastTime = time;
    pointerValue += (pointerTarget - pointerValue) * .035;
    ctx.clearRect(0, 0, width, height);

    const haze = ctx.createLinearGradient(0, 0, 0, height);
    haze.addColorStop(0, 'rgba(255,255,255,0)');
    haze.addColorStop(.28, 'rgba(246,213,189,.13)');
    haze.addColorStop(1, 'rgba(175,60,47,.12)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, width, height);

    layers.forEach((layer) => drawLayer(layer, time));
    animationFrame = requestAnimationFrame(render);
  };

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    pointerTarget = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  }, { passive: true });

  canvas.addEventListener('pointerleave', () => { pointerTarget = .5; });

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !animationFrame) animationFrame = requestAnimationFrame(render);
    if (!visible && animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  }, { threshold: 0 });

  visibilityObserver.observe(canvas);
  window.addEventListener('resize', resizeCanvas, { passive: true });
  resizeCanvas();
  pointerTarget = .52;
  pointerValue = .52;
  animationFrame = requestAnimationFrame(render);
})();