/**
 * page-transition.js
 *
 * Thin horizontal curtain that wipes across the screen when navigating
 * between pages. Works in all browsers — vanilla JS + GSAP only.
 *
 * Usage
 * -----
 * Include this script BEFORE main.js / surreal-series.js (or at body start).
 * Call `navigateTo(url)` instead of setting window.location.href directly.
 *
 * On every page:
 *   1. The curtain is injected and covers the screen (scaleX = 1, immediate).
 *   2. Once GSAP is ready, it animates scaleX 1 → 0 (reveal the new page).
 *
 * When navigating away:
 *   1. Call navigateTo(url)  — animates scaleX 0 → 1 (cover the screen).
 *   2. When animation completes, sets window.location.href = url.
 *
 * First-visit-only intro
 * -----------------------
 * The curtain wipe (and, on the homepage, the SVG loader in main.js) is only
 * meant to play the first time a visitor enters the site in a given browser
 * session — not on every refresh or internal navigation. A sessionStorage
 * flag (`window.__arttrecHasVisited`) tracks this: it's read synchronously
 * here, before DOMContentLoaded, so main.js can check it too. It's cleared
 * when the tab/browser is closed, so the intro plays again on the next visit.
 */

'use strict';

(function () {
  /* ── First-visit tracking (sessionStorage; resets when the tab closes) ── */
  const VISITED_KEY = 'arttrec:visited';
  let hasVisitedBefore;
  try {
    hasVisitedBefore = sessionStorage.getItem(VISITED_KEY) === '1';
  } catch (_e) {
    // Storage unavailable (privacy mode, etc.) — fall back to always animating.
    hasVisitedBefore = false;
  }
  window.__arttrecHasVisited = hasVisitedBefore;

  function markVisited() {
    hasVisitedBefore = true;
    window.__arttrecHasVisited = true;
    try { sessionStorage.setItem(VISITED_KEY, '1'); } catch (_e) { /* ignore */ }
  }

  /* ── Create or reuse curtain element ────────────────────────────── */
  const existing = document.getElementById('page-curtain');
  const curtain  = existing || document.createElement('div');
  if (!existing) {
    curtain.id              = 'page-curtain';
    curtain.setAttribute('aria-hidden', 'true');
    document.documentElement.appendChild(curtain);
  }
  curtain.style.cssText = [
    'position:fixed',
    'inset:0',
    'background:#0d0d0d',
    'z-index:9999',
    'transform:scaleX(1)',
    'transform-origin:right center',
    'pointer-events:none',
    'will-change:transform',
  ].join(';');

  /* ── Reveal on load (scaleX 1 → 0) ──────────────────────────────── */
  function revealOnLoad() {
    // Not the first visit this session — skip the wipe, just show the page.
    if (hasVisitedBefore) {
      if (typeof gsap === 'undefined') {
        curtain.style.transform = 'scaleX(0)';
      } else {
        gsap.set(curtain, { scaleX: 0 });
      }
      return;
    }
    if (typeof gsap === 'undefined') {
      // GSAP not loaded yet — try again on next frame
      requestAnimationFrame(revealOnLoad);
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(curtain, { scaleX: 0 });
      markVisited();
      return;
    }
    gsap.to(curtain, {
      scaleX: 0,
      duration: 0.85,
      ease: 'power3.inOut',
      delay: 0.1,
      onComplete: markVisited,
    });
  }

  // Kick off as soon as possible — don't wait for DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', revealOnLoad);
  } else {
    revealOnLoad();
  }

  /* ── navigateTo(url) — cover screen, then navigate ──────────────── */
  window.navigateTo = function navigateTo(url) {
    if (
      hasVisitedBefore ||
      typeof gsap === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      window.location.href = url;
      return;
    }
    gsap.set(curtain, { transformOrigin: 'left center', scaleX: 0 });
    gsap.to(curtain, {
      scaleX: 1,
      duration: 0.6,
      ease: 'power3.inOut',
      onComplete: function () {
        window.location.href = url;
      },
    });
  };

  window.navigateToWithHash = function navigateToWithHash(url) {
    const target = typeof url === 'string' ? url : '';
    if (!target) return;
    if (
      hasVisitedBefore ||
      typeof gsap === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      window.location.href = target;
      return;
    }
    gsap.set(curtain, { transformOrigin: 'left center', scaleX: 0 });
    gsap.to(curtain, {
      scaleX: 1,
      duration: 0.6,
      ease: 'power3.inOut',
      onComplete: function () {
        window.location.href = target;
      },
    });
  };
})();
