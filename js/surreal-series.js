/**
 * surreal-series.js — Surreal Art Series page
 *
 * Fetches surrealPiece documents from Sanity (GROQ), with a graceful
 * fallback to the data embedded in projects.json. Builds full-screen
 * viewport-height piece sections with GSAP hover interactions.
 *
 * Interaction model (per piece):
 *   • Image fills 100vw × 100vh, slow drift loop (sine.inOut yoyo)
 *   • mouseenter → pause drift, artwork slides to 50% left, story panel
 *     slides in from right with accent-color tint
 *   • mouseleave → reverse, resume drift
 *   • Mobile → static layout, no hover panel
 */

'use strict';

/* ────────────────────────────────────────────────────────────────────
   CONFIG
   ─────────────────────────────────────────────────────────────────── */
const SS_SANITY_PROJECT_ID = 'lu1mcd6s';
const SS_SANITY_DATASET    = 'production';
const SS_SANITY_API_VER    = '2024-01-01';

/** Fallback accent colors keyed by slug fragment or order */
const FALLBACK_ACCENTS = {
  'cirrus'  : '#0a0c1a',
  'abyss'   : '#060a14',
  'neural'  : '#060d1f',
  'byte'    : '#060d1f',
  'veil'    : '#140308',
};

/** Fallback mood labels keyed on index */
const FALLBACK_MOODS = ['Memory', 'Isolation', 'Technology', 'Identity', 'Chaos'];

/* ────────────────────────────────────────────────────────────────────
   SANITY QUERY
   ─────────────────────────────────────────────────────────────────── */
const SURREAL_QUERY = `
*[_type == "surrealPiece"] | order(number asc) {
  title,
  "slug": slug.current,
  number,
  year,
  subtitle,
  storyPreview,
  story,
  mood,
  accentColor,
  "imageUrl": image.asset->url
}
`.trim();

async function fetchSurrealPieces() {
  const url =
    'https://' + SS_SANITY_PROJECT_ID + '.apicdn.sanity.io' +
    '/v' + SS_SANITY_API_VER +
    '/data/query/' + SS_SANITY_DATASET +
    '?query=' + encodeURIComponent(SURREAL_QUERY);

  const res = await fetch(url);
  if (!res.ok) throw new Error('[surreal-series] Sanity error ' + res.status);
  const json = await res.json();
  return (json.result || []).filter(p => p && p.title);
}

/* ────────────────────────────────────────────────────────────────────
   LOCAL FALLBACK — map projects.json "surreal-series" pieces array
   ─────────────────────────────────────────────────────────────────── */
async function fetchFallbackPieces() {
  const res  = await fetch('data/projects.json');
  const all  = await res.json();
  const proj = all.find(p => p.slug === 'surreal-series');
  if (!proj || !proj.pieces) return [];
  return proj.pieces.map((p, i) => ({
    title     : p.title,
    slug      : p.title.toLowerCase().replace(/\s+/g, '-'),
    number    : i + 1,
    year      : Number(proj.year) || 2025,
    subtitle  : '',
    storyPreview: p.description,
    story     : p.description,
    mood      : FALLBACK_MOODS[i] || 'Identity',
    accentColor: pickFallbackAccent(p.image),
    imageUrl  : p.image,
  }));
}

function pickFallbackAccent(imagePath) {
  if (!imagePath) return '#0d0d0d';
  const key = Object.keys(FALLBACK_ACCENTS).find(k => imagePath.includes(k));
  return key ? FALLBACK_ACCENTS[key] : '#0d0d0d';
}

/* ────────────────────────────────────────────────────────────────────
   RENDER PIECES INTO DOM
   ─────────────────────────────────────────────────────────────────── */
function sanitize(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function padNum(n) {
  return String(n).padStart(2, '0');
}

function renderStorySection(pieces, container) {
  const total = pieces.length;

  const rows = pieces.map((piece, i) => {
    const num     = sanitize(padNum(i + 1));
    const title   = sanitize(piece.title || '');
    const preview = sanitize(piece.storyPreview || '');
    const story   = sanitize(piece.story || '');
    const year    = sanitize(String(piece.year || ''));
    const mood    = sanitize(piece.mood || '');
    const imgSrc  = piece.imageUrl || '';
    const accent  = /^#[0-9a-fA-F]{3,8}$/.test(piece.accentColor || '')
      ? piece.accentColor
      : pickFallbackAccent(piece.imageUrl);
    return [
      `<div class="surreal-row" id="piece-${sanitize(piece.slug || String(i))}" data-index="${i}" data-accent="${accent}" role="listitem">`,
      `  <span class="surreal-row__num" aria-label="Piece ${num} of ${sanitize(padNum(total))}">${num} / ${sanitize(padNum(total))}</span>`,
      `  <h2 class="surreal-row__title">${title}</h2>`,
      `  <div class="surreal-row__divider" aria-hidden="true"></div>`,
      imgSrc ? `  <img class="surreal-row__img" src="${imgSrc}" alt="${title}" loading="lazy" decoding="async">` : '',
      preview ? `  <p class="surreal-row__preview">${preview}</p>` : '',
      story   ? `  <p class="surreal-row__story">${story}</p>`   : '',
      `  <span class="surreal-row__meta">${[year, mood].filter(Boolean).join(' · ')}</span>`,
      `</div>`,
    ].filter(Boolean).join('\n');
  }).join('\n');

  const photos = pieces.map((piece, i) => {
    const title   = sanitize(piece.title || '');
    const imgSrc  = piece.imageUrl || '';
    const loading = i === 0 ? 'eager' : 'lazy';
    return imgSrc
      ? `<img class="sr-photo" data-index="${i}" src="${imgSrc}" alt="${title}" loading="${loading}" decoding="async">`
      : `<div class="sr-photo sr-photo--empty" data-index="${i}" role="presentation"></div>`;
  }).join('\n');

  const firstAccent = /^#[0-9a-fA-F]{3,8}$/.test(pieces[0] && pieces[0].accentColor || '')
    ? pieces[0].accentColor
    : '#0c0c0e';

  container.innerHTML = [
    `<section class="story-section surreal-layout" aria-label="Surreal Art pieces">`,
    `  <div class="surreal-list" role="list">`,
    rows.split('\n').map(l => '    ' + l).join('\n'),
    `  </div>`,
    `  <div class="sr-right-panel" aria-hidden="true">`,
    `    <div class="sr-photo-stage" style="--sr-accent:${firstAccent}">`,
    photos.split('\n').map(l => '      ' + l).join('\n'),
    `    </div>`,
    `  </div>`,
    `</section>`,
  ].join('\n');
}

/* ────────────────────────────────────────────────────────────────────
   STORY LAYOUT — ScrollTrigger pin + scroll-driven image transitions
   ─────────────────────────────────────────────────────────────────── */
function initStoryLayout(prefersReducedMotion) {
  if (typeof ScrollTrigger === 'undefined') return;

  const section    = document.querySelector('.story-section');
  const rightPanel = document.querySelector('.sr-right-panel');
  const photoStage = document.querySelector('.sr-photo-stage');
  const rows       = Array.from(document.querySelectorAll('.surreal-row'));
  const photos     = Array.from(document.querySelectorAll('.sr-photo'));

  if (!section || !rightPanel || !rows.length || !photos.length) return;

  // ── Initialise: all photos hidden, first photo visible ───────────
  gsap.set(photos, { autoAlpha: 0 });
  gsap.set(photos[0], { autoAlpha: 1 });
  if (rows[0]) rows[0].classList.add('is-active');

  // ── Reduced-motion: static layout only, no further animation ─────
  if (prefersReducedMotion) return;

  // ── GSAP matchMedia — per-breakpoint teardown only ───────────────────
  // CSS sticky (position: sticky; top: 70px; height: calc(100vh - 70px))
  // handles pinning on desktop natively — avoids Lenis scroll-timing lag
  // that caused GSAP pin to misfire at 2× navHeight offset.
  const mm = gsap.matchMedia();

  mm.add('(min-width: 1024px)', () => {
    return () => {};
  });

  // ── Per-row ScrollTriggers: crossfade images ──────────────────────
  function showPhoto(index) {
    rows.forEach(r => r.classList.remove('is-active'));
    rows[index].classList.add('is-active');

    gsap.to(photos, { autoAlpha: 0, duration: 0.4 });
    gsap.to(photos[index], { autoAlpha: 1, duration: 0.4 });

    if (photoStage) {
      gsap.to(photoStage, {
        backgroundColor : rows[index].dataset.accent || '#0c0c0e',
        duration        : 0.8,
        ease            : 'power2.inOut',
      });
    }
  }

  rows.forEach((row, i) => {
    if (!photos[i]) return;

    ScrollTrigger.create({
      trigger      : row,
      start        : 'top center',
      end          : 'bottom center',
      onEnter()    { showPhoto(i); },
      onEnterBack(){ showPhoto(i); },
    });
  });
}

/* ────────────────────────────────────────────────────────────────────
   HERO ENTRANCE ANIMATION
   ─────────────────────────────────────────────────────────────────── */
function initHeroEntrance() {
  if (typeof ScrollTrigger === 'undefined') return;

  const items = [
    document.querySelector('.ss-hero__eyebrow'),
    document.querySelector('.ss-hero__title'),
    document.querySelector('.ss-hero__subtitle'),
  ].filter(Boolean);

  if (!items.length) return;

  gsap.from(items, {
    opacity  : 0,
    y        : 30,
    stagger  : 0.12,
    duration : 0.9,
    ease     : 'power3.out',
    delay    : 0.4,
  });
}

/* ────────────────────────────────────────────────────────────────────
   MOBILE ROW ANIMATIONS — per-row timeline reveal (≤ 1023px only)
   ─────────────────────────────────────────────────────────────────── */
function initMobileAnimations() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  const mm = gsap.matchMedia();

  mm.add('(max-width: 1023px)', () => {
    document.querySelectorAll('.surreal-row').forEach(row => {
      const img     = row.querySelector('.surreal-row__img');
      const num     = row.querySelector('.surreal-row__num');
      const title   = row.querySelector('.surreal-row__title');
      const divider = row.querySelector('.surreal-row__divider');
      const textEls = Array.from(row.querySelectorAll(
        '.surreal-row__preview, .surreal-row__story, .surreal-row__meta'
      ));

      const tl = gsap.timeline({
        scrollTrigger: { trigger: row, start: 'top 88%', once: true }
      });

      // 1. Image — scale-fade reveal (pulls in from slight zoom)
      if (img) {
        tl.fromTo(img,
          { autoAlpha: 0, scale: 1.06, transformOrigin: 'center center' },
          { autoAlpha: 1, scale: 1,    duration: 1.1,  ease: 'power3.out' },
          0
        );
      }

      // 2. Piece number — slide from left
      if (num) {
        tl.fromTo(num,
          { autoAlpha: 0, x: -14 },
          { autoAlpha: 1, x: 0,   duration: 0.55, ease: 'power2.out' },
          0.12
        );
      }

      // 3. Title — slide up
      if (title) {
        tl.fromTo(title,
          { autoAlpha: 0, y: 22 },
          { autoAlpha: 1, y: 0,   duration: 0.7,  ease: 'power3.out' },
          0.2
        );
      }

      // 4. Divider — horizontal line wipe
      if (divider) {
        tl.fromTo(divider,
          { scaleX: 0, transformOrigin: 'left center' },
          { scaleX: 1, duration: 0.65, ease: 'expo.out' },
          0.35
        );
      }

      // 5. Body text & meta — cascade fade-up
      if (textEls.length) {
        tl.fromTo(textEls,
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, stagger: 0.09, duration: 0.6, ease: 'power2.out' },
          0.42
        );
      }
    });
  });
}

/* ────────────────────────────────────────────────────────────────────
   SMOOTH SCROLL (Lenis — mirrors main.js pattern)
   ─────────────────────────────────────────────────────────────────── */
function initLenis() {
  if (typeof Lenis === 'undefined') return null;
  const lenis = new Lenis({
    duration  : 1.2,
    easing    : (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    direction : 'vertical',
    smooth    : true,
  });
  // GSAP ticker owns the loop — eliminates rAF/ScrollTrigger lag on fast scroll
  gsap.ticker.add((time) => { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);
  // Tell ScrollTrigger to use Lenis scroll position for all calculations so
  // pins fire at the correct viewport offset (fixes the 2× navHeight offset bug)
  ScrollTrigger.scrollerProxy(document.body, {
    scrollTop(value) {
      if (arguments.length) { lenis.scrollTo(value, { immediate: true }); }
      return lenis.scroll;
    },
    getBoundingClientRect() {
      return { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
    },
  });
  lenis.on('scroll', ScrollTrigger.update);
  return lenis;
}

/* ────────────────────────────────────────────────────────────────────
   OUTRO — "Back to all work" navigation
   ─────────────────────────────────────────────────────────────────── */
function initOutro() {
  const btn  = document.getElementById('ss-next-project');
  const back = document.getElementById('ss-nav-back');

  function goHome(e) {
    e.preventDefault();
    if (typeof window.navigateTo === 'function') {
      window.navigateTo('index.html');
    } else {
      window.location.href = 'index.html';
    }
  }

  if (btn)  btn.addEventListener('click',  goHome);
  if (back) back.addEventListener('click', goHome);
}

/* ────────────────────────────────────────────────────────────────────
   BOOTSTRAP
   ─────────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  gsap.registerPlugin(ScrollTrigger);

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  const container = document.getElementById('ss-pieces');
  if (!container) return;

  initLenis();
  initOutro();

  // ── Load pieces (Sanity first, local fallback) ────────────────────
  let pieces = [];
  try {
    pieces = await fetchSurrealPieces();
    if (!pieces.length) throw new Error('empty result');
  } catch (_) {
    try {
      pieces = await fetchFallbackPieces();
    } catch (fallbackErr) {
      console.error('[surreal-series] Could not load pieces:', fallbackErr);
    }
  }

  if (!pieces.length) {
    container.innerHTML = '<p style="color:var(--color-text-muted);padding:4rem var(--gutter)">No pieces found.</p>';
    return;
  }

  // ── Render ────────────────────────────────────────────────────────
  renderStorySection(pieces, container);

  // ── Animations ───────────────────────────────────────────────────
  if (!prefersReducedMotion) {
    initHeroEntrance();
    initStoryLayout(false);
    initMobileAnimations();
  } else {
    // Reduced motion: static first image, no transitions
    initStoryLayout(true);
  }

  ScrollTrigger.refresh();

  // Scroll to a specific piece if URL has a hash (e.g. surreal-series.html#piece-abyss)
  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) {
      setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
  }
});
