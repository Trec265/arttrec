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
 */

'use strict';

(function () {
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
    if (typeof gsap === 'undefined') {
      // GSAP not loaded yet — try again on next frame
      requestAnimationFrame(revealOnLoad);
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(curtain, { scaleX: 0 });
      return;
    }
    gsap.to(curtain, {
      scaleX: 0,
      duration: 0.85,
      ease: 'power3.inOut',
      delay: 0.1,
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
    if (typeof gsap === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
})();
