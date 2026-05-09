/* =====================================================================
   animations.js — Shared animation utilities
   Runs on BOTH index.html and case-study.html.
   All effects wrapped in gsap.matchMedia() for reduced-motion safety.
   ===================================================================== */

(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* -------------------------------------------------------------------
     PAGE TRANSITION — curtain wipe on internal link clicks
     Uses .page-curtain scaleY from bottom → top on exit, top → bottom
     on load. CSS handles initial state (scaleY:0, origin:bottom).
  ------------------------------------------------------------------- */
  function initPageTransition() {
    const curtain = document.getElementById('page-curtain');
    if (!curtain) return;

    /* Entry: reveal by wiping curtain up (scaleY 1 → 0) after load */
    if (prefersReduced.matches) return;

    gsap.set(curtain, { scaleY: 0, transformOrigin: 'top' });

    const inTl = gsap.timeline({ delay: 0.05 });
    inTl.from(curtain, {
      scaleY: 1,
      duration: 0.65,
      ease: 'power3.inOut',
      transformOrigin: 'top',
    });

    /* Exit: attach to all internal links */
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('http')) return;
      if (link.hasAttribute('target')) return;

      link.addEventListener('click', function (e) {
        e.preventDefault();
        const dest = this.href;
        gsap.set(curtain, { scaleY: 0, transformOrigin: 'bottom' });
        gsap.to(curtain, {
          scaleY: 1,
          duration: 0.55,
          ease: 'power3.inOut',
          onComplete: () => { window.location.href = dest; },
        });
      });
    });
  }

  /* -------------------------------------------------------------------
     LOADER COUNTER — 0 → 100 text counter inside .loader__count
     Plays only when the loader element is in the DOM (index.html).
  ------------------------------------------------------------------- */
  function initLoaderCounter() {
    const countEl = document.querySelector('.loader__count');
    if (!countEl) return;

    const proxy = { val: 0 };
    gsap.to(proxy, {
      val: 100,
      duration: prefersReduced.matches ? 0 : 1.8,
      ease: 'power2.inOut',
      onUpdate() {
        countEl.textContent = Math.round(proxy.val);
      },
    });
  }

  /* -------------------------------------------------------------------
     WORK CARD HOVER — scale 1 → 1.05 on .project-card__img
     Attached via delegation on the grid for dynamically-rendered cards.
  ------------------------------------------------------------------- */
  function initWorkCardHover() {
    if (prefersReduced.matches) return;

    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    grid.addEventListener('mouseenter', handleCardEnter, true);
    grid.addEventListener('mouseleave', handleCardLeave, true);

    function handleCardEnter(e) {
      const img = e.target.closest('.project-card__link')?.querySelector('.project-card__img');
      if (!img) return;
      gsap.to(img, { scale: 1.05, duration: 0.45, ease: 'power2.out' });
    }

    function handleCardLeave(e) {
      const img = e.target.closest('.project-card__link')?.querySelector('.project-card__img');
      if (!img) return;
      gsap.to(img, { scale: 1, duration: 0.45, ease: 'power2.out' });
    }
  }

  /* -------------------------------------------------------------------
     GALLERY CURSOR — small dot follows mouse on .cs-pieces--gallery
     Uses gsap.quickTo for smooth sub-frame tracking.
  ------------------------------------------------------------------- */
  function initGalleryCursor() {
    if (prefersReduced.matches) return;
    const cursor = document.getElementById('gallery-cursor');
    if (!cursor) return;

    const section = document.querySelector('.cs-pieces--gallery');
    if (!section) return;

    let active = false;

    const xTo = gsap.quickTo(cursor, 'x', { duration: 0.25, ease: 'power3.out' });
    const yTo = gsap.quickTo(cursor, 'y', { duration: 0.25, ease: 'power3.out' });

    section.addEventListener('mouseenter', () => {
      if (active) return;
      active = true;
      gsap.to(cursor, { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' });
    });

    section.addEventListener('mouseleave', () => {
      active = false;
      gsap.to(cursor, { opacity: 0, scale: 0.5, duration: 0.3, ease: 'power2.in' });
    });

    section.addEventListener('mousemove', e => {
      xTo(e.clientX);
      yTo(e.clientY);
    });
  }

  /* -------------------------------------------------------------------
     SCROLL-REVEAL — generic fade+slide for utility class .reveal
     Replaces any duplicate scroll reveal setup that may exist in main.js.
     Cards rendered after DOMContentLoaded are handled via initReveal().
  ------------------------------------------------------------------- */
  function initReveal() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    if (prefersReduced.matches) return;

    document.querySelectorAll('.reveal').forEach(el => {
      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 30 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 88%',
            once: true,
          },
        }
      );
    });
  }

  /* -------------------------------------------------------------------
     BOOTSTRAP
  ------------------------------------------------------------------- */
  function init() {
    if (typeof gsap === 'undefined') return; // guard: GSAP not loaded

    initPageTransition();
    initLoaderCounter();
    initWorkCardHover();
    initGalleryCursor();
    initReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
