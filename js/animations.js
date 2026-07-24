/* =====================================================================
   animations.js — Shared animation utilities
   Runs on BOTH index.html and case-study.html.
   All effects wrapped in gsap.matchMedia() for reduced-motion safety.
   ===================================================================== */

(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* -------------------------------------------------------------------
     PAGE TRANSITION — internal link clicks route through navigateTo()
     The curtain itself (entry reveal, exit cover, reduced-motion and
     first-visit-only skip logic) is owned by page-transition.js. This
     just wires up plain <a> links — e.g. the nav bar — that don't call
     window.navigateTo() themselves, so they get the same curtain and
     skip-after-first-visit behavior as the JS-driven links.
  ------------------------------------------------------------------- */
  function initPageTransition() {
    const curtain = document.getElementById('page-curtain');
    if (!curtain) return;

    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('http')) return;
      if (link.hasAttribute('target')) return;

      link.addEventListener('click', function (e) {
        e.preventDefault();
        const dest = this.href;
        if (typeof window.navigateTo === 'function') {
          window.navigateTo(dest);
        } else {
          window.location.href = dest;
        }
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
     SHARED SCROLL REVEAL — ScrollTrigger.batch wrapper for dynamically
     rendered content (project cards, etc).
     Exposed on window.PortfolioReveal so main.js / case-study.js can
     call it *after* they've inserted DOM content — a plain init()-time
     querySelectorAll would run before that content exists, since cards
     are rendered async (Sanity/JSON fetch) well after DOMContentLoaded.
  ------------------------------------------------------------------- */
  function batchReveal(selector, { start = 'top 92%', stagger = 0.04 } = {}) {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

    const els = document.querySelectorAll(selector);
    if (!els.length) return;

    if (prefersReduced.matches) {
      gsap.set(els, { opacity: 1, y: 0 });
      return;
    }

    ScrollTrigger.batch(els, {
      start,
      once: true,
      onEnter: batch => gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: 0.45,
        stagger,
        ease: 'power3.out',
      }),
    });
  }

  window.PortfolioReveal = { batchReveal };

  /* -------------------------------------------------------------------
     BOOTSTRAP
  ------------------------------------------------------------------- */
  function init() {
    if (typeof gsap === 'undefined') return; // guard: GSAP not loaded

    initPageTransition();
    initLoaderCounter();
    initGalleryCursor();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
