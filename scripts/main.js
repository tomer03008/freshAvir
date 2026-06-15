const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(max-width: 768px)').matches;
const isCoarsePointer = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
const saveData = Boolean(navigator.connection?.saveData);
const liteMode = isMobile || isCoarsePointer || saveData;

// Always start at top on refresh so on-scroll animations play from their initial state
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

const ready = (fn) => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
};

ready(() => {
  initNav();
  initDrawer();
  initHeroVideo();
  initHeroStage();
  initProblemStage();
  initReveals();
  initCounters();
  initBeforeAfter();
  initFaq();
  initSmoothScroll();
  initProcess();
  initScrollProgress();
  initCtaParallax();
  initHeroParallax();
  initDustLayer();
});

function initHeroStage() {
  const stage = document.querySelector('[data-hero-stage]');
  if (!stage) return;
  // Wait one frame so fonts/layout settle, then fire the choreography
  requestAnimationFrame(() => {
    requestAnimationFrame(() => stage.classList.add('is-ready'));
  });
}

function initProblemStage() {
  const stage = document.querySelector('[data-problem-stage]');
  if (!stage) return;

  const visual = stage.querySelector('.problem__visual');
  const markers = [...stage.querySelectorAll('.problem__marker')];
  const items = [...stage.querySelectorAll('[data-problem-item]')];

  if (prefersReducedMotion) {
    visual?.style.setProperty('--dirt', '0.65');
    markers.forEach((m) => m.classList.add('is-active'));
    items.forEach((i) => i.classList.add('is-visible', 'is-active'));
    return;
  }

  // Dirt overlay accumulates from 0 → 1 across the section
  if (window.gsap && window.ScrollTrigger && visual && !liteMode) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    window.ScrollTrigger.create({
      trigger: stage,
      start: 'top 75%',
      end: 'bottom 60%',
      scrub: 0.4,
      onUpdate: (self) => {
        visual.style.setProperty('--dirt', String(self.progress));
      },
    });

    if (!prefersReducedMotion) {
      window.gsap.to('.problem__visual--secondary', {
        y: -45,
        scrollTrigger: {
          trigger: stage,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });
    }
  } else if (visual) {
    visual.style.setProperty('--dirt', '0.55');
  }

  // Reveal markers + activate matching items in order
  if (!('IntersectionObserver' in window)) {
    markers.forEach((m) => m.classList.add('is-active'));
    items.forEach((i) => i.classList.add('is-visible', 'is-active'));
    return;
  }

  const itemObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const idx = Number(entry.target.dataset.problemItem || 0);
      entry.target.classList.add('is-visible');
      window.setTimeout(() => entry.target.classList.add('is-active'), 180);
      const marker = markers.find((m) => Number(m.dataset.marker) === idx);
      if (marker) window.setTimeout(() => marker.classList.add('is-active'), 220);
      itemObserver.unobserve(entry.target);
    });
  }, { threshold: 0.45 });

  items.forEach((i) => itemObserver.observe(i));
}

function initNav() {
  const nav = document.querySelector('#nav');
  if (!nav) return;

  const update = () => nav.classList.toggle('is-scrolled', window.scrollY > 16);
  update();
  window.addEventListener('scroll', update, { passive: true });
}

function initDrawer() {
  const drawer = document.querySelector('#drawer');
  const burger = document.querySelector('#burger');
  const close = document.querySelector('#drawer-close');
  if (!drawer || !burger || !close) return;

  const openDrawer = () => {
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add('is-open'));
    burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    close.focus();
  };

  const closeDrawer = () => {
    drawer.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    window.setTimeout(() => {
      if (!drawer.classList.contains('is-open')) drawer.hidden = true;
    }, 320);
  };

  burger.addEventListener('click', openDrawer);
  close.addEventListener('click', closeDrawer);
  drawer.addEventListener('click', (event) => {
    if (event.target === drawer) closeDrawer();
  });
  drawer.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeDrawer));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !drawer.hidden) closeDrawer();
  });
}

function initHeroVideo() {
  const video = document.querySelector('.hero__video');
  if (!video) return;

  if (prefersReducedMotion) {
    video.pause();
    return;
  }

  if (saveData) {
    video.pause();
    video.removeAttribute('autoplay');
    return;
  }

  if (liteMode) {
    video.preload = 'metadata';
  }

  const play = () => {
    video.play().catch(() => {});
  };

  if (video.readyState >= 2) play();
  else video.addEventListener('loadeddata', play, { once: true });
}

function initReveals() {
  // Stagger audience items
  document.querySelectorAll('.audience__item').forEach((el, i) => {
    el.style.transitionDelay = `${(i % 3) * 90}ms, 0s, 0s, ${(i % 3) * 90}ms`;
  });

  // Stagger technology cards
  document.querySelectorAll('.tech__card').forEach((el, i) => {
    el.style.transitionDelay = `${(i % 3) * 120}ms`;
  });

  // Stagger why-us list rows (delay clip-path, opacity, transform; keep hovers instant)
  document.querySelectorAll('.why__row').forEach((el, i) => {
    el.style.transitionDelay = `0s, 0s, ${i * 100}ms, ${i * 100}ms, ${i * 100}ms`;
  });

  // Stagger Before/After cards
  document.querySelectorAll('.ba__card').forEach((el, i) => {
    el.style.transitionDelay = `${i * 150}ms`;
  });

  const revealTargets = [
    ...document.querySelectorAll('[data-reveal], [data-reveal-stagger], .problem__item, .ba__card, .why__row, .audience__item')
  ];

  if (!revealTargets.length) return;

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach((element) => element.classList.add('is-visible'));
    document.querySelectorAll('[data-reveal-stagger]').forEach((element) => element.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });

  revealTargets.forEach((element) => observer.observe(element));
}

function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  if (!counters.length) return;

  const animate = (element) => {
    const target = Number(element.dataset.count || 0);
    if (!target) return;
    if (prefersReducedMotion) {
      element.textContent = String(target);
      return;
    }

    const duration = 1200;
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = String(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if (!('IntersectionObserver' in window)) {
    counters.forEach(animate);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animate(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.5 });

  counters.forEach((counter) => observer.observe(counter));
}

function initBeforeAfter() {
  const cards = document.querySelectorAll('.ba__card');
  if (!cards.length) return;

  cards.forEach((card) => {
    const viewer = card.querySelector('[data-ba-viewer]');
    const handle = card.querySelector('.ba__handle');
    if (!viewer) return;

    const setReveal = (percent) => {
      const safe = Math.max(0, Math.min(100, percent));
      viewer.style.setProperty('--ba-reveal', `${safe}%`);
      viewer.style.setProperty('--ba-reveal-num', String(safe / 100));
      const fill = card.querySelector('.ba__progress-fill');
      if (fill) fill.style.setProperty('--ba-reveal', `${safe}%`);
      card.classList.toggle('is-revealing', safe > 1 && safe < 99);
      card.classList.toggle('is-complete', safe >= 99);
      if (handle) handle.setAttribute('aria-valuenow', String(Math.round(safe)));
    };

    setReveal(0);

    // Card lifts in immediately when visible
    if ('IntersectionObserver' in window) {
      const cardObs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          card.classList.add('is-visible');
          cardObs.unobserve(card);
        });
      }, { threshold: 0.15 });
      cardObs.observe(card);
    } else {
      card.classList.add('is-visible');
    }

    if (prefersReducedMotion) {
      setReveal(82);
      return;
    }

    // ---- Auto-play loop, stops the moment user interacts ----
    const REVEAL_DUR = 2400;
    const HOLD_AFTER = 1800;
    const RETURN_DUR = 700;
    const HOLD_BEFORE = 1200;
    const TOTAL = REVEAL_DUR + HOLD_AFTER + RETURN_DUR + HOLD_BEFORE;

    const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const easeInQuart = (t) => t * t * t * t;

    let rafId = null;
    let cycleStart = 0;
    let userControlled = false;
    let isDragging = false;

    const tick = (now) => {
      if (userControlled) return;
      if (!cycleStart) cycleStart = now;
      const elapsed = (now - cycleStart) % TOTAL;
      let p;
      if (elapsed < REVEAL_DUR) {
        p = easeInOutCubic(elapsed / REVEAL_DUR) * 100;
      } else if (elapsed < REVEAL_DUR + HOLD_AFTER) {
        p = 100;
      } else if (elapsed < REVEAL_DUR + HOLD_AFTER + RETURN_DUR) {
        const t = (elapsed - REVEAL_DUR - HOLD_AFTER) / RETURN_DUR;
        p = (1 - easeInQuart(t)) * 100;
      } else {
        p = 0;
      }
      setReveal(p);
      rafId = requestAnimationFrame(tick);
    };

    const start = () => {
      if (rafId || userControlled) return;
      cycleStart = 0;
      rafId = requestAnimationFrame(tick);
    };

    const stop = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    };

    const takeOver = () => {
      if (!userControlled) {
        userControlled = true;
        stop();
        card.classList.add('is-user-controlled');
      }
    };

    // ---- Drag interaction (horizontal) ----
    const updateFromX = (clientX) => {
      const rect = viewer.getBoundingClientRect();
      // reveal grows left→right: 0% = full dirty, 100% = fully clean (clean appears on left)
      const pct = ((clientX - rect.left) / rect.width) * 100;
      setReveal(pct);
    };

    const onPointerDown = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      takeOver();
      isDragging = true;
      try { viewer.setPointerCapture(e.pointerId); } catch (_) {}
      card.classList.add('is-dragging');
      updateFromX(e.clientX);
      e.preventDefault();
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      updateFromX(e.clientX);
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      try { viewer.releasePointerCapture(e.pointerId); } catch (_) {}
      card.classList.remove('is-dragging');
    };

    viewer.addEventListener('pointerdown', onPointerDown);
    viewer.addEventListener('pointermove', onPointerMove);
    viewer.addEventListener('pointerup', onPointerUp);
    viewer.addEventListener('pointercancel', onPointerUp);

    // Click on viewer (without drag) — jump to that point + take over
    viewer.addEventListener('click', (e) => {
      if (isDragging) return;
      takeOver();
      updateFromX(e.clientX);
    });

    // Keyboard support
    handle?.addEventListener('keydown', (e) => {
      const current = Number(handle.getAttribute('aria-valuenow') || 0);
      let next = current;
      if (e.key === 'ArrowRight') next = current + 5;
      else if (e.key === 'ArrowLeft') next = current - 5;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = 100;
      else return;
      e.preventDefault();
      takeOver();
      setReveal(next);
    });

    // Run auto-play only while card is in view + user hasn't taken over
    if ('IntersectionObserver' in window) {
      const playObs = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) start();
          else stop();
        });
      }, { threshold: 0.25 });
      playObs.observe(card);
    } else {
      start();
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else if (!userControlled) {
        const r = card.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) start();
      }
    });
  });
}

function initScrollProgress() {
  if (prefersReducedMotion || liteMode) return;

  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  document.body.appendChild(progressBar);

  const update = () => {
    const winScroll = window.scrollY || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
    progressBar.style.width = `${scrolled}%`;
  };

  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initFaq() {
  const items = document.querySelectorAll('.faq__item');
  if (!items.length) return;

  const sync = (item) => {
    const answer = item.querySelector('.faq__a');
    const isOpen = item.open;
    item.classList.toggle('is-open', isOpen);
    if (!answer) return;
    answer.style.maxBlockSize = isOpen ? `${answer.scrollHeight}px` : '0px';
  };

  items.forEach((item) => {
    sync(item);
    item.addEventListener('toggle', () => sync(item));
  });

  window.addEventListener('resize', () => {
    items.forEach((item) => {
      if (item.open) sync(item);
    });
  }, { passive: true });
}

function initProcess() {
  const section = document.querySelector('.process');
  if (!section) return;

  const play = () => section.classList.add('is-playing');

  if (prefersReducedMotion) {
    play();
    return;
  }

  if (!('IntersectionObserver' in window)) {
    play();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      play();
      observer.unobserve(section);
    });
  }, { threshold: 0.28, rootMargin: '0px 0px -6% 0px' });

  observer.observe(section);
}

function initSmoothScroll() {
  if (prefersReducedMotion || liteMode || !window.Lenis) return;

  const lenis = new window.Lenis({
    duration: 0.95,
    smoothWheel: true,
    wheelMultiplier: 0.82,
    touchMultiplier: 1.15
  });

  window.__siteLenis = lenis;

  if (window.gsap && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);

    window.ScrollTrigger.scrollerProxy(document.documentElement, {
      scrollTop(value) {
        if (arguments.length) {
          lenis.scrollTo(value, { immediate: true });
        }
        return lenis.scroll;
      },
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight
        };
      },
      pinType: document.documentElement.style.transform ? 'transform' : 'fixed'
    });

    lenis.on('scroll', window.ScrollTrigger.update);
    window.ScrollTrigger.addEventListener('refresh', () => lenis.resize());
    window.gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    window.gsap.ticker.lagSmoothing(0);
    return;
  }

  const raf = (time) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}

function initDustLayer() {
  if (prefersReducedMotion || liteMode) {
    const canvas = document.querySelector('#dust-canvas');
    if (canvas) canvas.style.display = 'none';
    return;
  }

  const start = () => {
    import('./dust.js')
      .then((module) => module.initDust({ reducedMotion: prefersReducedMotion }))
      .catch(() => {
        const canvas = document.querySelector('#dust-canvas');
        if (canvas) canvas.style.display = 'none';
      });
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(start, { timeout: 1800 });
  } else {
    window.setTimeout(start, 900);
  }
}

function initCtaParallax() {
  if (liteMode || prefersReducedMotion || !window.gsap || !window.ScrollTrigger) return;
  window.gsap.registerPlugin(window.ScrollTrigger);
  window.gsap.to('.cta-final__bg img', {
    scale: 1.15,
    scrollTrigger: {
      trigger: '.cta-final',
      start: 'top bottom',
      end: 'bottom top',
      scrub: true
    }
  });
}

function initHeroParallax() {
  if (liteMode || prefersReducedMotion || !window.gsap || !window.ScrollTrigger) return;
  window.gsap.registerPlugin(window.ScrollTrigger);
  window.gsap.to('.hero__video', {
    scale: 1.18,
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: true
    }
  });
}
