/**
 * main.js — Homepage
 *
 * Execution order (critical for GSAP correctness):
 *   1. DOMContentLoaded
 *   2. Register GSAP plugins
 *   3. Add .js-ready to body (enables CSS initial states)
 *   4. Init Lenis smooth scroll
 *   5. Fetch projects.json
 *   6. renderProjects() → writes cards into DOM
 *   7. initFilterBtns() → bind filter interaction
 *   8. playLoader() → runs loading animation
 *      └─ onComplete → revealPage()
 *         └─ initHeroAnimations()
 *         └─ initScrollAnimations()  ← ScrollTrigger set up AFTER render
 *         └─ ScrollTrigger.refresh()  ← recalculate page heights
 */

'use strict';

/* ─── Safety: clear loader on any uncaught error ─────────────────── */
window.addEventListener('error', () => skipLoader());
window.addEventListener('unhandledrejection', () => skipLoader());

/* ─── Register GSAP Plugins ──────────────────────────────────────── */
gsap.registerPlugin(ScrollTrigger);

/* ─── Reduced Motion Check ───────────────────────────────────────── */
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;
/* Cleanup fn for Surreal Art hover preview; set when list is active */
let _surrealPreviewDestroy = null;
/* Lenis instance — stored for use in filter scroll restore */
let _lenis = null;
/* Track last known mouse position so we can trigger hover when items appear
   under a stationary cursor (browser doesn't fire mouseenter in that case). */
let _mouseX = -1;
let _mouseY = -1;
document.addEventListener('mousemove', e => { _mouseX = e.clientX; _mouseY = e.clientY; }, { passive: true });
/* Called after the Surreal list entrance animation completes */
let _triggerSurrealHoverAtCursor = null;
/* ─── Bootstrap ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {

  document.body.classList.add('js-ready', 'is-loading');

  // Init Lenis smooth scroll
  const lenis = initLenis();

  // Bind nav toggle (mobile menu)
  initNavToggle();

  // Bind scroll-based nav style
  initNavScroll(lenis);

  // Safety timeout — never leave user stuck on loader
  const loaderTimeout = setTimeout(() => skipLoader(), 5000);

  // Kick off about fetch in parallel — will be applied before animations start
  const aboutFetchPromise = fetchAbout().catch(() => null);

  // Fetch and render projects — Sanity with 4s timeout, falls back to local JSON
  try {
    let projects;
    try {
      projects = (await fetchProjects()) || [];
    } catch (_sanityErr) {
      // Sanity unavailable or timed out — load local JSON directly
      const local = await fetch('data/projects.json').then(r => r.json());
      projects = local || [];
    }

    // Sanity only has surrealPiece docs — not a project doc for the series.
    // Always ensure surreal-series appears in the grid by merging from local JSON.
    const hasSurreal = projects.some(p => normalizeCategory(p.category) === 'Surreal Art');
    if (!hasSurreal) {
      try {
        const local = await fetch('data/projects.json').then(r => r.json());
        const entry = local.find(p => p.slug === 'surreal-series');
        if (entry) projects.push(entry);
      } catch (_) { /* local JSON unavailable — skip */ }
    }

    if (!projects.length) {
      const grid = document.getElementById('projects-grid');
      if (grid) {
        grid.innerHTML = '<p style="color:var(--color-text-muted);padding:2rem 0">No projects found.</p>';
      }
    } else {
      renderProjects(projects);
      renderFeaturedWork(projects);
      initFeaturedPanelClicks();
      // Populate gallery strip with individual surrealPiece docs from Sanity
      // (falls back to local pieces[] if Sanity is unavailable)
      const galleryItems = await fetchSurrealGalleryItems();
      if (galleryItems.length) {
        renderSurrealListView(galleryItems);
        initSurrealThumbnailRotation(galleryItems);
      }
      initFilterBtns(projects);
      initCursorPreview();
    }
  } catch (err) {
    console.error('[Portfolio] Failed to load projects:', err);
    const grid = document.getElementById('projects-grid');
    if (grid) {
      grid.innerHTML = '<p style="color:var(--color-text-muted);padding:2rem 0">Projects unavailable. Please check back soon.</p>';
    }
  }

  // Apply about data before animations start so SplitType picks up the correct text
  const aboutData = await aboutFetchPromise;
  applyAboutData(aboutData);

  // MAD-style cinematic entrance — loader panel wipes off screen, then hero reveals
  if (!prefersReducedMotion) {
    playLoader(() => {
      clearTimeout(loaderTimeout);
      revealPage(() => {
        initHeroAnimations();
        initScrollAnimations();
        ScrollTrigger.refresh();
      });
    });
  } else {
    clearTimeout(loaderTimeout);
    // Hide loader instantly without removing js-ready — keeps CSS initial states
    // so scroll-triggered GSAP animations still have something to animate from.
    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
    document.body.classList.remove('is-loading');
    // Instantly reveal elements normally shown by the loader/hero entrance
    gsap.set('#nav', { y: 0 });
    gsap.set('.line-mask > *', { y: 0 });
    gsap.set('.hero__scroll', { opacity: 1 });
    // Split hero name chars and snap them to visible
    document.querySelectorAll('.hero__name-word').forEach(word => {
      new SplitType(word, { types: 'chars' });
    });
    gsap.set('.hero__name .char', { y: 0 });
    gsap.set('.hero__meta', { opacity: 1 });
    initScrollAnimations();
    ScrollTrigger.refresh();
  }
});


/* =====================================================================
   LENIS SMOOTH SCROLL
   ===================================================================== */
function initLenis() {
  const lenis = new Lenis({
    lerp: 0.08,
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    touchMultiplier: 2,
  });

  // Lenis RAF loop — feed time into GSAP ticker for ScrollTrigger sync
  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  _lenis = lenis;
  return lenis;
}


/* =====================================================================
   DATA FETCH
   Tries Sanity CMS first; falls back to local data/projects.json.
   Configure SANITY_PROJECT_ID in sanity-client.js to enable Sanity.
   ===================================================================== */
async function fetchProjects() {
  if (window.SanityClient && window.SanityClient.isConfigured()) {
    return window.SanityClient.fetchProjects();
  }
  const res = await fetch('data/projects.json');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * Fetch the About singleton from Sanity.
 * Returns null if Sanity is unconfigured or the document doesn't exist yet.
 */
async function fetchAbout() {
  if (window.SanityClient && window.SanityClient.isConfigured()) {
    return window.SanityClient.fetchAbout();
  }
  return null;
}

/**
 * Apply about data returned from Sanity to the #about section DOM.
 * All text is set via textContent / node creation to prevent XSS.
 * Falls back gracefully — any missing field is simply skipped.
 */
function applyAboutData(data) {
  if (!data) return;

  /* -- Heading -------------------------------------------------------- */
  const headingEl = document.querySelector('.about__heading');
  if (headingEl) {
    if (data.heading) {
      headingEl.textContent = data.heading;
      if (data.headingAccent) {
        headingEl.appendChild(document.createElement('br'));
        const em = document.createElement('em');
        em.textContent = data.headingAccent;
        headingEl.appendChild(em);
      }
    }
  }

  /* -- Bio paragraphs ------------------------------------------------- */
  const textEl = document.querySelector('.about__text');
  if (textEl && Array.isArray(data.bio) && data.bio.length) {
    textEl.querySelectorAll('.about__para').forEach(p => p.remove());
    const disciplinesEl = textEl.querySelector('.about__disciplines');
    data.bio.forEach(text => {
      const p = document.createElement('p');
      p.className = 'about__para';
      p.textContent = text;
      textEl.insertBefore(p, disciplinesEl);
    });
  }

  /* -- Disciplines ---------------------------------------------------- */
  const disciplinesEl = document.querySelector('.about__disciplines');
  if (disciplinesEl && Array.isArray(data.disciplines) && data.disciplines.length) {
    disciplinesEl.textContent = '';
    data.disciplines.forEach(d => {
      const row   = document.createElement('div');
      row.className = 'about__discipline';
      const label = document.createElement('span');
      label.className = 'about__discipline-label';
      label.textContent = d.label || '';
      const items = document.createElement('span');
      items.className = 'about__discipline-items';
      items.textContent = d.items || '';
      row.appendChild(label);
      row.appendChild(items);
      disciplinesEl.appendChild(row);
    });
  }

  /* -- Portrait image ------------------------------------------------- */
  if (data.portraitImage) {
    const img = document.querySelector('.about__portrait-img');
    if (img) {
      img.src = data.portraitImage;
      if (data.portraitAlt) img.alt = data.portraitAlt;
    }
  }

  /* -- Portrait caption ----------------------------------------------- */
  if (data.portraitCaption) {
    const caption = document.querySelector('.about__portrait-caption');
    if (caption) caption.textContent = data.portraitCaption;
  }
}

/**
 * Fetch the individual surrealPiece documents from Sanity for the gallery strip.
 * Falls back to the pieces[] array inside projects.json surreal-series entry.
 */
async function fetchSurrealGalleryItems() {
  const projectId = 'lu1mcd6s';
  const dataset   = 'production';
  const apiVer    = '2024-01-01';
  const query     = '*[_type=="surrealPiece"]|order(number asc){title,"slug":slug.current,number,year,"imageUrl":image.asset->url}';
  const url       = `https://${projectId}.apicdn.sanity.io/v${apiVer}/data/query/${dataset}?query=${encodeURIComponent(query)}`;

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('surreal timeout')), 4000)
  );
  try {
    const res  = await Promise.race([fetch(url), timeout]);
    if (!res.ok) throw new Error('Sanity ' + res.status);
    const json = await res.json();
    const items = (json.result || []).filter(p => p && p.title);
    if (items.length) {
      return items.map(p => ({
        title      : p.title,
        coverImage : p.imageUrl || '',
        year       : p.year ? String(p.year) : '2025',
        slug       : p.slug || '',
        category   : 'Surreal Art',
      }));
    }
  } catch (_) { /* fall through to local */ }

  // Local fallback — expand pieces[] from surreal-series entry
  try {
    const local = await fetch('data/projects.json').then(r => r.json());
    const entry = local.find(p => p.slug === 'surreal-series');
    if (entry?.pieces?.length) {
      return entry.pieces.map(piece => ({
        title      : piece.title,
        coverImage : piece.image,
        year       : entry.year || '2025',
        slug       : piece.title ? piece.title.toLowerCase().replace(/\s+/g, '-') : '',
        category   : 'Surreal Art',
      }));
    }
  } catch (_) { /* nothing available */ }
  return [];
}


/* =====================================================================
   CONTENT SANITIZATION
   Escapes HTML entities in Sanity-sourced strings before DOM injection.
   Prevents XSS from untrusted CMS content.
   ===================================================================== */
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  const el = document.createElement('div');
  el.textContent = str;
  return el.innerHTML;
}

/* Strips trailing commas from tag strings. */
function stripTrailingComma(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/,\s*$/, '');
}

/* Replaces known CMS placeholder values with correct copy. */
function normalizePlaceholder(str) {
  if (typeof str !== 'string') return str;
  if (/tewtwetwetwetwetwe/i.test(str)) {
    return 'A typographic exploration of disconnection and modern alienation. Identity fragments across digital and physical space.';
  }
  return str;
}

/* Canonical category names matching filter buttons' data-filter values. */
const CATEGORY_MAP = {
  'Branding': 'Branding',
  'BRANDING': 'Branding',
  'Surreal Art': 'Surreal Art',
  'SURREAL ART': 'Surreal Art',
  'Surreal art': 'Surreal Art',
  'Visual Design': 'Visual Design',
  'VISUAL DESIGN': 'Visual Design',
  'Visual design': 'Visual Design',
};

function normalizeCategory(cat) {
  return CATEGORY_MAP[cat] || cat || '';
}

/* =====================================================================
   RENDER: PROJECT CARDS
   All cards are written into #projects-grid from JSON.
   This must complete before any ScrollTrigger is created.
   ===================================================================== */
function renderProjects(projects) {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  const cards = projects.map((project) => {
    const imgSrc    = sanitizeText(project.coverImage || '');
    const subtitle  = sanitizeText(stripTrailingComma(project.subtitle || ''));
    const category  = normalizeCategory(project.category);
    const title     = sanitizeText(project.title || '');
    const slug      = sanitizeText(project.slug || '');
    const ariaLabel = `View ${title}${subtitle ? ' \u2014 ' + subtitle : ''}`;
    const imgHtml   = imgSrc
      ? `<img class="work-card__img" src="${imgSrc}" alt="${title}" loading="lazy">`
      : `<div class="work-card__img-placeholder"></div>`;

    // Surreal Art series gets its own dedicated page
    const isSurrealSeries = slug === 'surreal-series';
    const href = isSurrealSeries
      ? 'surreal-series.html'
      : `case-study?project=${slug}`;

    return [
      `<li class="work-card" data-category="${category}"${isSurrealSeries ? ' data-project="surreal-series"' : ''}>`,
      `  <a class="work-card__link" href="${href}" aria-label="${ariaLabel}"${isSurrealSeries ? ' data-surreal-series="true"' : ''}>`,
      `    <div class="work-card__image-wrap">`,
      `      ${imgHtml}`,
      `    </div>`,
      `    <div class="work-card__body">`,
      `      <h3 class="work-card__title">${title}</h3>`,
      `      ${subtitle ? `<p class="work-card__desc">${subtitle}</p>` : ''}`,
      `      <span class="work-card__type">${category}</span>`,
      `    </div>`,
      `  </a>`,
      `</li>`,
    ].join('\n');
  });

  grid.innerHTML = `<ul class="works-grid">\n${cards.join('\n')}\n</ul>`;

  // Intercept surreal-series card clicks to use page transition
  grid.querySelectorAll('[data-surreal-series="true"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof window.navigateTo === 'function') {
        window.navigateTo('surreal-series.html');
      } else {
        window.location.href = 'surreal-series.html';
      }
    });
  });
}



/* =====================================================================
   RENDER: FEATURED WORK PANELS
   Renders full-viewport panels for projects where featured === true.
   Called once during bootstrap, before initScrollAnimations().
   ===================================================================== */
function renderFeaturedWork(projects) {
  const container = document.getElementById('featured-panels');
  if (!container) return;

  const featured = projects.filter(p => p.featured);
  if (!featured.length) return;

  const html = featured.map((project, index) => {
    const num = String(index + 1).padStart(2, '0');
    const title = sanitizeText((project.title || '').replace(/\n/g, ' '));
    const subtitle = sanitizeText(stripTrailingComma(project.subtitle || ''));
    const slug = sanitizeText(project.slug || '');
    const excerpt = sanitizeText(normalizePlaceholder(project.excerpt || ''));
    const heroImg = sanitizeText(project.heroImage || '');
    const isSurrealFeatured = slug === 'surreal-series';
    const featuredHref = isSurrealFeatured ? 'surreal-series.html' : `case-study?project=${slug}`;
    return `
      <article class="featured-panel" id="featured-${slug}">
        <div class="featured-panel__inner">
          <div class="featured-panel__text">
            <span class="featured-panel__num">${num}</span>
            <h3 class="featured-panel__title">${title}</h3>
            <p class="featured-panel__sub">${subtitle}</p>
            <p class="featured-panel__overview">${excerpt}</p>
            <a href="${featuredHref}" class="featured-panel__cta">
              View Project
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                <path d="M1 5h12M9 1l4 4-4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </a>
          </div>
          <div class="featured-panel__image-wrap">
            ${heroImg
              ? `<img src="${heroImg}" alt="${title}${subtitle ? ' \u2014 ' + subtitle : ''}" class="featured-panel__img" loading="lazy" width="1200" height="800" />`
              : '<div class="img-placeholder featured-panel__img" aria-hidden="true"></div>'
            }
          </div>
        </div>
      </article>
    `.trim();
  }).join('\n');

  container.innerHTML = html;
}


/* =====================================================================
   FEATURED PANEL CLICK HANDLER
   Makes the entire featured-panel card navigate to the case study,
   not just the "View Project" CTA button.
   ===================================================================== */
function initFeaturedPanelClicks() {
  document.querySelectorAll('.featured-panel').forEach(panel => {
    const link = panel.querySelector('.featured-panel__cta');
    if (!link) return;

    // Intercept CTA link clicks to use the page-transition curtain
    link.addEventListener('click', e => {
      e.preventDefault();
      if (typeof window.navigateTo === 'function') {
        window.navigateTo(link.href);
      } else {
        window.location.href = link.href;
      }
    });

    // Clicking anywhere else on the panel also navigates with transition
    panel.addEventListener('click', e => {
      if (e.target.closest('.featured-panel__cta')) return;
      if (typeof window.navigateTo === 'function') {
        window.navigateTo(link.href);
      } else {
        window.location.href = link.href;
      }
    });
  });
}

/* =====================================================================
   RENDER: SURREAL ART GALLERY STRIP
   Builds horizontal portrait-strip panels injected into #sr-gallery-track.
   Called once during bootstrap after renderProjects().
   ===================================================================== */
function renderSurrealListView(projects) {
  const track = document.getElementById('sr-gallery-track');
  if (!track || !projects?.length) return;

  track.innerHTML = projects.map((project, i) => {
    const title  = sanitizeText(project.title || '');
    const year   = sanitizeText(project.year  || '');
    const imgSrc = sanitizeText(project.coverImage || '');
    const slug   = sanitizeText(project.slug || project.id || '');
    const href   = slug ? `surreal-series.html#piece-${slug}` : 'surreal-series.html';
    const imgTag = imgSrc
      ? `<img src="${imgSrc}" alt="${title}" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async">`
      : '';
    return [
      `<a class="sr-strip" href="${href}" data-index="${i}" data-slug="${slug}" data-title="${title}" data-year="${year}" aria-label="View ${title}">`,
      imgTag,
      `</a>`,
    ].join('\n');
  }).join('\n');

  // Populate info bar with initial (first) project
  const progress = document.getElementById('sr-info-progress');
  const titleEl  = document.getElementById('sr-info-title');
  const yearEl   = document.getElementById('sr-info-year');
  if (progress) {
    progress.innerHTML = projects.map((_, i) =>
      `<span class="sr-dot${i === 0 ? ' is-active' : ''}"></span>`
    ).join('');
  }
  if (titleEl) titleEl.textContent = sanitizeText(projects[0]?.title || '');
  if (yearEl)  yearEl.textContent  = sanitizeText(projects[0]?.year  || '');
}


/* =====================================================================
   SURREAL SERIES THUMBNAIL ROTATION
   Crossfades through the 6 Sanity artwork images on the Surreal Series
   card every 2.5 s. Only affects that one card; all others stay static.
   ===================================================================== */
function initSurrealThumbnailRotation(galleryItems) {
  const images = galleryItems.map(item => item.coverImage).filter(Boolean);
  if (images.length < 2) return;

  const card = document.querySelector('[data-project="surreal-series"] .work-card__img');
  if (!card) return;

  let current = 0;
  setInterval(() => {
    card.style.opacity = '0';
    setTimeout(() => {
      current = (current + 1) % images.length;
      card.src = images[current];
      card.style.opacity = '1';
    }, 400);
  }, 2500);
}


/* =====================================================================
   SHOW SURREAL PROJECT CARDS IN GRID
   While the gallery strip is visible, also show surreal project cards
   below it. Hides the grid entirely if there are no surreal cards.
   ===================================================================== */
function showSurrealProjectCards() {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll('.work-card'));
  const surrealCards = cards.filter(c => c.dataset.category === 'Surreal Art');

  if (!surrealCards.length) {
    grid.style.display = 'none';
    return;
  }

  grid.style.display = '';
  cards.forEach(card => {
    card.classList.toggle('is-hidden', card.dataset.category !== 'Surreal Art');
  });
}


/* =====================================================================
   FILTER BUTTONS
   Handles All / Branding / Surreal Art / Visual Design filter tabs.
   ===================================================================== */
function initFilterBtns(projects) {
  const btns = Array.from(document.querySelectorAll('.filter-btn'));
  const grid = document.getElementById('projects-grid');
  if (!btns.length || !grid) return;

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      const savedScrollY = window.scrollY;

      // Update button active states
      btns.forEach(b => {
        b.classList.remove('is-active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('is-active');
      btn.setAttribute('aria-pressed', 'true');

      // Tear down any active surreal preview listeners
      if (_surrealPreviewDestroy) {
        _surrealPreviewDestroy();
        _surrealPreviewDestroy = null;
      }

      if (filter === 'Surreal Art') {
        // Show the horizontal gallery strip; clicking a piece goes to surreal-series.html
        const listView = document.getElementById('surreal-list-view');
        const workSection = grid.closest('.work') || document.querySelector('.work');
        if (workSection) workSection.classList.add('has-gallery');

        if (!prefersReducedMotion) {
          gsap.to(grid, { opacity: 0, duration: 0.3, onComplete: () => {
            grid.style.display = 'none';
            gsap.set(grid, { opacity: 1 });
          }});
          if (listView) {
            listView.style.display = 'flex';
            listView.setAttribute('aria-hidden', 'false');
            gsap.set('.sr-strip', { opacity: 0, x: 40 });
            gsap.to('.sr-strip', {
              opacity: 1, x: 0, stagger: 0.08, duration: 0.6, delay: 0.3, ease: 'power3.out',
              onComplete: () => gsap.set('.sr-strip', { clearProps: 'opacity,x' })
            });
            initSurrealHover();
          }
        } else {
          grid.style.display = 'none';
          if (listView) {
            listView.style.display = 'flex';
            listView.setAttribute('aria-hidden', 'false');
            gsap.set('.sr-strip', { opacity: 1, x: 0 });
          }
          initSurrealHover();
        }
        return;
      } else {
        // Non-surreal filter: hide gallery, filter project cards
        const listView = document.getElementById('surreal-list-view');
        const workSection = grid.closest('.work') || document.querySelector('.work');
        if (workSection) workSection.classList.remove('has-gallery');
        if (listView) {
          listView.style.display = 'none';
          listView.setAttribute('aria-hidden', 'true');
        }

        const cards = Array.from(grid.querySelectorAll('.work-card'));
        grid.style.display = '';
        if (filter.toLowerCase() === 'all') {
          cards.forEach(card => card.classList.remove('is-hidden'));
        } else {
          cards.forEach(card => {
            card.classList.toggle('is-hidden', card.dataset.category !== filter);
          });
        }

        // Animate filtered cards in — always reset opacity/transform first
        // so cards that were already animated by ScrollTrigger (once:true) don't stay invisible
        const visible = Array.from(grid.querySelectorAll('.work-card:not(.is-hidden)'));
        if (visible.length) {
          if (!prefersReducedMotion) {
            gsap.fromTo(grid, { opacity: 0 }, { opacity: 1, duration: 0.4 });
            gsap.fromTo(visible,
              { opacity: 0, y: 24 },
              { opacity: 1, y: 0, stagger: 0.05, duration: 0.5, ease: 'power3.out' }
            );
          } else {
            gsap.set(grid, { opacity: 1 });
            gsap.set(visible, { opacity: 1, y: 0 });
          }
        }
        // Also reset any hidden cards so they don't retain stale GSAP inline styles
        const hidden = Array.from(grid.querySelectorAll('.work-card.is-hidden'));
        gsap.set(hidden, { opacity: 0, y: 20 });
      }

      ScrollTrigger.refresh();
      // Restore scroll position — layout change from showing/hiding gallery
      // can cause a jump; Lenis re-anchors to the saved position.
      if (_lenis) {
        _lenis.scrollTo(savedScrollY, { immediate: true });
      } else {
        window.scrollTo({ top: savedScrollY, behavior: 'instant' });
      }
    });
  });
}


/* =====================================================================
   NAVIGATION
   ===================================================================== */
function initNavToggle() {
  const toggle = document.getElementById('nav-toggle');
  const mobile = document.getElementById('nav-mobile');
  if (!toggle || !mobile) return;

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    mobile.setAttribute('aria-hidden', String(expanded));
    mobile.classList.toggle('is-open', !expanded);
  });

  // Close mobile nav when a link is clicked
  mobile.querySelectorAll('.nav__mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', 'false');
      mobile.setAttribute('aria-hidden', 'true');
      mobile.classList.remove('is-open');
    });
  });
}

function initNavScroll(lenis) {
  const nav = document.getElementById('nav');
  if (!nav) return;

  ScrollTrigger.create({
    start: 'top -80px',
    onEnter: () => nav.classList.add('is-scrolled'),
    onLeaveBack: () => nav.classList.remove('is-scrolled'),
  });
}


/* =====================================================================
   LOADING SCREEN ANIMATION
   Uses stroke-dashoffset technique — identical visual result to DrawSVGPlugin.
   To upgrade to Club GSAP DrawSVGPlugin, replace the path tweens with:
     gsap.from('.loader__path', { drawSVG: '0%', duration: 1.2, stagger: 0.25, ease: 'power3.inOut' })
   ===================================================================== */
function playLoader(onComplete) {
  const loader = document.getElementById('loader');
  const bar = document.querySelector('.loader__bar');
  if (!loader) { onComplete?.(); return; }

  const tl = gsap.timeline({
    onComplete: () => {
      // MAD-style cinematic exit — loader panel slides up off-screen,
      // revealing the hero beneath like a curtain rising.
      gsap.to(loader, {
        y: '-100%',
        duration: 0.9,
        ease: 'power4.inOut',
        onComplete: () => {
          loader.style.display = 'none';
          document.body.classList.remove('is-loading');
          onComplete?.();
        },
      });
    },
  });

  const textEl = loader.querySelector('.loader__text');

  // 1. Draw the stroke (stroke-dashoffset → 0)
  tl.to(textEl, {
    strokeDashoffset: 0,
    duration: 1.8,
    ease: 'power3.inOut',
  });

  // 2. Fill floods in, stroke dissolves out — feels like ink settling
  tl.to(textEl, {
    attr: { 'fill-opacity': 1, 'stroke-width': 0 },
    duration: 0.55,
    ease: 'power2.out',
  }, '-=0.35');

  // Progress bar fill (runs alongside draw)
  tl.to(bar, {
    width: '100%',
    duration: 1.4,
    ease: 'power2.out',
  }, '<-=1.6');

  // Short hold at 100%
  tl.to({}, { duration: 0.3 });
}

/* Instant skip for reduced motion or error states.
   IMPORTANT: also removes js-ready so CSS hidden states are cleared
   and content is always visible regardless of animation state. */
function skipLoader() {
  const loader = document.getElementById('loader');
  if (loader) loader.style.display = 'none';
  document.body.classList.remove('is-loading', 'js-ready');
}


/* =====================================================================
   PAGE REVEAL — runs once after loader exits
   ===================================================================== */
function revealPage(onComplete) {
  const tl = gsap.timeline({ onComplete });

  // Nav slides down from off-screen top
  tl.to('#nav', {
    y: 0,
    duration: 0.9,
    ease: 'power3.out',
  });

  // Short pause before firing onComplete (which starts hero + scroll animations)
  tl.to({}, { duration: 0.1 });
}


/* =====================================================================
   HERO ANIMATIONS
   Uses SplitType to split hero name into chars, then staggers them in.
   ===================================================================== */
function initHeroAnimations() {
  // Split hero name words into characters
  const nameWords = document.querySelectorAll('.hero__name-word');
  const splitInstances = [];

  nameWords.forEach(word => {
    const st = new SplitType(word, { types: 'chars' });
    splitInstances.push(st);
  });

  const tl = gsap.timeline({ delay: 0.05 });

  // Chars rise up from overflow-hidden clip
  const chars = document.querySelectorAll('.hero__name-word .char');
  tl.to(chars, {
    y: 0,
    duration: 0.65,
    stagger: 0.013,
    ease: 'power4.out',
  });

  // Eyebrow line-mask emerge (translateY 105% → 0)
  tl.to('.hero__eyebrow', {
    y: 0,
    duration: 0.7,
    ease: 'power4.out',
  }, '-=0.4');

  // Tagline line-mask emerge
  tl.to('.hero__tagline', {
    y: 0,
    duration: 0.7,
    ease: 'power4.out',
  }, '-=0.55');

  // CTA line-mask emerge
  tl.to('.hero__cta', {
    y: 0,
    duration: 0.65,
    ease: 'power4.out',
  }, '-=0.5');

  // Scroll indicator fades in
  tl.to('.hero__scroll', {
    opacity: 1,
    duration: 0.4,
    ease: 'power2.out',
  }, '-=0.25');

  // Hero meta sidebar fades in after the main entrance
  tl.to('.hero__meta', {
    opacity: 1,
    duration: 0.5,
    ease: 'power2.out',
  }, '-=0.3');

  // Full-bleed slideshow — Ken Burns zoom + crossfade rotation + scroll parallax
  const heroSlides = document.querySelectorAll('.hero__bg-slide');
  if (heroSlides.length) {
    const SHOW = 4.5;  // seconds each slide is fully visible
    const FADE = 1.6;  // crossfade duration
    const ZOOM = 0.06; // Ken Burns: scale(1) → scale(1.06)

    gsap.set(heroSlides, { opacity: 0, scale: 1 });

    if (!prefersReducedMotion) {
      let current = 0;

      const advance = () => {
        const cur = heroSlides[current];
        const nextIdx = (current + 1) % heroSlides.length;
        const nxt = heroSlides[nextIdx];

        // Ken Burns: slowly zoom the active slide over its full display time
        gsap.fromTo(cur,
          { scale: 1 },
          { scale: 1 + ZOOM, duration: SHOW + FADE, ease: 'none' }
        );

        // After SHOW seconds, crossfade to the next slide
        gsap.delayedCall(SHOW, () => {
          gsap.set(nxt, { opacity: 0, scale: 1 });
          gsap.to(nxt, { opacity: 1, duration: FADE, ease: 'power2.inOut' });
          gsap.to(cur, {
            opacity: 0,
            duration: FADE,
            ease: 'power2.inOut',
            onComplete: () => {
              current = nextIdx;
              advance();
            },
          });
        });
      };

      // Fade in first slide on load, then start the loop
      gsap.to(heroSlides[0], {
        opacity: 1,
        duration: FADE,
        ease: 'power2.inOut',
        delay: 0.15,
        onComplete: advance,
      });

      // Scroll parallax: slides drift upward slightly slower than the page
      gsap.to('.hero__bg-slides', {
        scrollTrigger: {
          trigger: '.hero',
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
        y: -80,
        ease: 'none',
      });

    } else {
      // Reduced motion: just show the first slide
      gsap.set(heroSlides[0], { opacity: 1 });
    }
  }
}


/* =====================================================================
   SCROLL ANIMATIONS
   All ScrollTrigger instances created here, AFTER renderProjects().
   The scroll-based animations fire as sections enter the viewport.
   ===================================================================== */
function initScrollAnimations() {

  /* -- Hero parallax: content drifts up slowly as you scroll away ------- */
  const heroInner = document.querySelector('.hero__inner');
  if (heroInner) {
    gsap.to(heroInner, {
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
      y: -80,
      ease: 'none',
    });
  }

  /* -- Statement section: line-mask clip reveals on scroll -------------- */
  const stmtLines = document.querySelectorAll('.statement__line');
  if (stmtLines.length) {
    gsap.to(stmtLines, {
      scrollTrigger: {
        trigger: '.statement',
        start: 'top 72%',
        once: true,
      },
      y: 0,
      duration: 1.1,
      stagger: 0.18,
      ease: 'power4.out',
    });
  }

  /* -- Work cards: stagger up on enter --------------------------------- */
  const workRows = document.querySelectorAll('.work-card');
  if (workRows.length) {
    ScrollTrigger.batch(workRows, {
      start: 'top 92%',
      once: true,
      onEnter: batch => {
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.04,
          ease: 'power3.out',
        });
      },
    });
  }

  /* -- Work section heading ------------------------------------------- */
  animateRevealUp('.work__heading', { trigger: '.work__header' });

  /* -- About section --------------------------------------------------- */
  const aboutHeading = document.querySelector('.about__heading');
  if (aboutHeading) {
    const split = new SplitType(aboutHeading, { types: 'lines' });
    if (!prefersReducedMotion) {
      gsap.from(split.lines, {
        scrollTrigger: {
          trigger: aboutHeading,
          start: 'top 80%',
          once: true,
        },
        opacity: 0,
        y: 18,
        duration: 0.55,
        stagger: 0.08,
        ease: 'power3.out',
      });
    }
  }

  animateRevealUp('.about__para', { trigger: '.about__text', stagger: 0.15 });
  animateRevealUp('.about__discipline', { trigger: '.about__disciplines', stagger: 0.1 });

  // Portrait slides in from right
  const portrait = document.querySelector('.about__portrait-frame');
  if (portrait && !prefersReducedMotion) {
    gsap.from(portrait, {
      scrollTrigger: { trigger: portrait, start: 'top 80%', once: true },
      x: 24,
      opacity: 0,
      duration: 0.7,
      ease: 'power3.out',
    });
  }

  /* -- Contact section ------------------------------------------------- */
  const contactWords = document.querySelectorAll('.contact__word');
  if (contactWords.length) {
    if (!prefersReducedMotion) {
      gsap.fromTo(contactWords,
        { clipPath: 'inset(100% 0 0 0)' },
        {
          scrollTrigger: { trigger: '.contact', start: 'top 75%', once: true },
          clipPath: 'inset(0% 0 0 0)',
          stagger: 0.15,
          duration: 0.9,
          ease: 'power4.out',
        }
      );
    } else {
      // Ensure words are visible without animation
      gsap.set(contactWords, { clipPath: 'inset(0% 0 0 0)' });
    }
  }

  if (!prefersReducedMotion) {
    gsap.from('.contact__email', {
      scrollTrigger: { trigger: '.contact__left', start: 'top 80%', once: true },
      opacity: 0,
      duration: 0.6,
      ease: 'power3.out',
    });

    const contactInfoEls = [
      ...document.querySelectorAll('.contact__avail-label'),
      ...document.querySelectorAll('.contact__services li'),
    ];
    if (contactInfoEls.length) {
      gsap.from(contactInfoEls, {
        scrollTrigger: { trigger: '.contact__right', start: 'top 80%', once: true },
        opacity: 0,
        duration: 0.5,
        stagger: 0.08,
        ease: 'power3.out',
      });
    }

    gsap.from('.contact__social-link', {
      scrollTrigger: { trigger: '.contact__socials', start: 'top 85%', once: true },
      opacity: 0,
      duration: 0.4,
      stagger: 0.06,
      ease: 'power3.out',
    });
  }

  /* -- Featured work panels -------------------------------------------- */
  document.querySelectorAll('.featured-panel').forEach(panel => {
    const titleEl  = panel.querySelector('.featured-panel__title');
    const imgWrap  = panel.querySelector('.featured-panel__image-wrap');
    const img      = panel.querySelector('.featured-panel__img');
    const otherEls = [
      panel.querySelector('.featured-panel__num'),
      panel.querySelector('.featured-panel__sub'),
      panel.querySelector('.featured-panel__overview'),
      panel.querySelector('.featured-panel__cta'),
    ].filter(Boolean);

    if (!prefersReducedMotion) {
      // Title: SplitType lines, x + opacity from left
      if (titleEl) {
        const split = new SplitType(titleEl, { types: 'lines' });
        gsap.fromTo(split.lines,
          { x: -40, opacity: 0 },
          {
            scrollTrigger: { trigger: panel, start: 'top 72%', once: true },
            x: 0,
            opacity: 1,
            duration: 0.7,
            stagger: 0.1,
            ease: 'power3.out',
          }
        );
      }

      // Supporting text: staggered x + opacity
      if (otherEls.length) {
        gsap.fromTo(otherEls,
          { x: -30, opacity: 0 },
          {
            scrollTrigger: { trigger: panel, start: 'top 68%', once: true },
            x: 0,
            opacity: 1,
            duration: 0.6,
            stagger: 0.08,
            ease: 'power3.out',
          }
        );
      }

      // Image: clip-path wipe in from right
      if (imgWrap) {
        gsap.fromTo(imgWrap,
          { clipPath: 'inset(0 100% 0 0)' },
          {
            scrollTrigger: { trigger: panel, start: 'top 65%', once: true },
            clipPath: 'inset(0 0% 0 0)',
            duration: 1.1,
            ease: 'power4.out',
          }
        );
      }
    }

    // Parallax on the img itself (scrub — always runs)
    if (img) {
      gsap.fromTo(img,
        { y: -60 },
        {
          scrollTrigger: {
            trigger: panel,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
          y: 60,
          ease: 'none',
        }
      );
    }
  });
}


/* =====================================================================
   ANIMATION HELPERS
   ===================================================================== */

/**
 * Animates elements matching `selector` up from offset on scroll.
 * Uses gsap.from() so no CSS pre-hidden state is required on the elements.
 * @param {string} selector  - CSS selector for elements to animate
 * @param {object} opts      - trigger (CSS selector), stagger (number)
 */
function animateRevealUp(selector, opts = {}) {
  if (prefersReducedMotion) return; // elements are already visible; skip from() to avoid opacity:0 stuck state
  const els = document.querySelectorAll(selector);
  if (!els.length) return;

  const trigger = opts.trigger ? document.querySelector(opts.trigger) : els[0];
  if (!trigger) return;

  gsap.from(Array.from(els), {
    scrollTrigger: {
      trigger,
      start: 'top 85%',
      once: true,
    },
    opacity: 0,
    y: 20,
    duration: 0.5,
    stagger: opts.stagger ?? 0,
    ease: 'power3.out',
  });
}


/* =====================================================================
   CURSOR PREVIEW
   Floating image that follows the cursor over project cards.
   ===================================================================== */
function initCursorPreview() {
  // Only on pointer devices
  if (!window.matchMedia('(hover: hover)').matches) return;

  const preview = document.getElementById('cursor-preview');
  const previewImg = document.getElementById('cursor-preview-img');
  if (!preview || !previewImg) return;

  let mouseX = 0, mouseY = 0;
  let currentX = 0, currentY = 0;
  let isVisible = false;
  let rafId = null;

  // Smooth following via lerp in rAF
  function lerp(a, b, t) { return a + (b - a) * t; }

  function loop() {
    currentX = lerp(currentX, mouseX, 0.1);
    currentY = lerp(currentY, mouseY, 0.1);
    preview.style.left = currentX + 'px';
    preview.style.top  = currentY + 'px';
    rafId = requestAnimationFrame(loop);
  }

  document.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  grid.addEventListener('mouseover', e => {
    const card = e.target.closest('.project-card');
    if (!card) return;

    const img = card.querySelector('.project-card__img');
    if (!img || !img.src) return;

    if (!isVisible || previewImg.src !== img.src) {
      previewImg.src = img.src;
    }

    if (!isVisible) {
      isVisible = true;
      preview.classList.add('is-visible');
      if (!rafId) loop();
    }
  });

  grid.addEventListener('mouseleave', () => {
    isVisible = false;
    preview.classList.remove('is-visible');
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  });

  // Also hide when mouse leaves a card (but stays in grid)
  grid.addEventListener('mouseout', e => {
    if (!e.relatedTarget || !e.relatedTarget.closest('.project-card')) {
      isVisible = false;
      preview.classList.remove('is-visible');
    }
  });
}


/* =====================================================================
   SURREAL ART HOVER PREVIEW
   GSAP quickTo cursor following for the editorial list view.
   Returns a cleanup function; call it before switching away from
   the Surreal Art filter.
   ===================================================================== */
function initSurrealPreview() {
  if (!window.matchMedia('(hover: hover)').matches) return () => {};

  const cursor = document.getElementById('surreal-cursor');
  const img    = document.getElementById('surreal-preview-img');
  const grid   = document.getElementById('projects-grid');
  if (!cursor || !img || !grid) return () => {};

  // GSAP owns transforms on the img (centering handled by CSS .surreal-cursor__inner)
  gsap.set(cursor, { x: -9999, y: -9999 }); // park off-screen initially
  gsap.set(img, { opacity: 0, scale: 0.9 });

  const xTo = gsap.quickTo(cursor, 'x', { duration: 0.15, ease: 'power2.out' });
  const yTo = gsap.quickTo(cursor, 'y', { duration: 0.15, ease: 'power2.out' });

  function onMouseMove(e) {
    xTo(e.clientX);
    yTo(e.clientY);
  }

  document.addEventListener('mousemove', onMouseMove);

  grid.querySelectorAll('.surreal-row').forEach(row => {
    const titleEl = row.querySelector('.surreal-row__title');

    row.addEventListener('mouseenter', e => {
      const src = row.dataset.img || '';
      if (img.src !== src) img.src = src;
      xTo(e.clientX);
      yTo(e.clientY);
      gsap.to(img, { opacity: 1, scale: 1, duration: 0.4, ease: 'power3.out' });
      if (titleEl) gsap.to(titleEl, { color: 'var(--color-accent)', x: 12, duration: 0.3, ease: 'power3.out' });
    });

    row.addEventListener('mouseleave', () => {
      gsap.to(img, { opacity: 0, scale: 0.9, duration: 0.3, ease: 'power2.in' });
      if (titleEl) gsap.to(titleEl, { color: 'var(--color-text)', x: 0, duration: 0.25, ease: 'power2.out' });
    });
  });

  // Return cleanup function
  return () => {
    document.removeEventListener('mousemove', onMouseMove);
    gsap.killTweensOf(cursor);
    gsap.set(img, { opacity: 0 });
  };
}


/* =====================================================================
   SURREAL GALLERY — POINTER DRAG INTERACTION
   Horizontal strip: pointer drag with inertia, wheel-to-scroll,
   strip hover scales image. Click (no drag) → case study.
   ===================================================================== */
function initSurrealHover() {
  const gallery = document.getElementById('sr-gallery');
  const track   = document.getElementById('sr-gallery-track');
  if (!gallery || !track) return;

  // Mobile uses native CSS scroll-snap — no JS drag needed
  if (window.innerWidth <= 768) {
    _surrealPreviewDestroy   = null;
    _triggerSurrealHoverAtCursor = null;
    return;
  }

  let isDragging      = false;
  let isHovering      = false;
  let startX          = 0;
  let startClickX     = 0;
  let currentX        = 0;
  let velocity        = 0;
  let lastX           = 0;
  let raf             = null;
  let autoRaf         = null;
  let pointerMoved    = false;
  let wheelSnapTimer  = null;
  let loopW           = 0;
  let firstRealOff    = 0;

  // ── Clone real strips to the end of the track so scrolling wraps seamlessly ──
  function buildClones() {
    track.querySelectorAll('.sr-strip-clone').forEach(el => el.remove());
    const reals = Array.from(track.querySelectorAll('.sr-strip:not(.sr-strip-clone)'));
    reals.forEach(s => {
      const clone = s.cloneNode(true);
      clone.classList.add('sr-strip-clone');
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('tabindex', '-1');
      // Prevent any focusable children inside the clone from being reachable
      clone.querySelectorAll('a, button, [tabindex]').forEach(el => el.setAttribute('tabindex', '-1'));
      track.appendChild(clone);
    });
    const firstReal  = track.querySelector('.sr-strip:not(.sr-strip-clone)');
    const firstClone = track.querySelector('.sr-strip-clone');
    firstRealOff = firstReal  ? firstReal.offsetLeft  : 0;
    loopW        = (firstReal && firstClone) ? firstClone.offsetLeft - firstReal.offsetLeft : 0;
  }

  buildClones();

  function getRealStrips() {
    return Array.from(track.querySelectorAll('.sr-strip:not(.sr-strip-clone)'));
  }

  // Soft clamp: allow the full real + clone set but not beyond
  function clampX(val) {
    const min = loopW ? -(firstRealOff + loopW) : -(track.scrollWidth - gallery.offsetWidth);
    return Math.max(min, Math.min(0, val));
  }

  // Teleport currentX back into the real-strip range when in clone territory
  function normalizeLoop() {
    if (!loopW) return;
    if (currentX <= -(firstRealOff + loopW - 1)) {
      currentX += loopW;
      gsap.set(track, { x: currentX });
    }
  }

  // Return currentX normalized into real range (for computation, no DOM change)
  function normX() {
    if (loopW && currentX < -(firstRealOff + loopW - 1)) return currentX + loopW;
    return currentX;
  }

  function snapToNearest() {
    const reals = getRealStrips();
    if (!reals.length) return;
    normalizeLoop();
    const snapPositions = reals.map(s => -s.offsetLeft);
    let best = snapPositions[0];
    let minDist = Math.abs(snapPositions[0] - currentX);
    snapPositions.forEach(pos => {
      const d = Math.abs(pos - currentX);
      if (d < minDist) { minDist = d; best = pos; }
    });
    if (Math.abs(best - currentX) < 1) { updateActiveStrip(); return; }
    currentX = best;
    gsap.to(track, { x: currentX, duration: 0.45, ease: 'power3.out', onComplete: updateActiveStrip });
  }

  function updateActiveStrip() {
    const reals  = getRealStrips();
    const nx     = normX();
    const center = gallery.offsetWidth / 2;
    let activeIdx = 0;
    let minDist   = Infinity;
    reals.forEach((strip, i) => {
      const mid  = strip.offsetLeft + nx + strip.offsetWidth / 2;
      const dist = Math.abs(mid - center);
      if (dist < minDist) { minDist = dist; activeIdx = i; }
    });
    const active = reals[activeIdx];
    if (!active) return;
    const titleEl = document.getElementById('sr-info-title');
    const yearEl  = document.getElementById('sr-info-year');
    if (titleEl) titleEl.textContent = active.dataset.title || '';
    if (yearEl)  yearEl.textContent  = active.dataset.year  || '';
    document.querySelectorAll('#sr-info-progress .sr-dot').forEach((dot, i) => {
      dot.classList.toggle('is-active', i === activeIdx);
    });
  }

  // ── Auto-scroll loop ─────────────────────────────────────────────────────────
  const AUTO_SPEED = 0.5; // px per frame (~30 px/s at 60 fps)

  function autoTick() {
    if (!isDragging && !isHovering) {
      currentX -= AUTO_SPEED;
      normalizeLoop();
      gsap.set(track, { x: currentX });
      updateActiveStrip();
    }
    autoRaf = requestAnimationFrame(autoTick);
  }

  autoRaf = requestAnimationFrame(autoTick);

  // ── Pointer drag ─────────────────────────────────────────────────────────────
  function onPointerDown(e) {
    startClickX  = e.clientX;
    pointerMoved = false;
    isDragging   = true;
    startX       = e.clientX - currentX;
    lastX        = e.clientX;
    velocity     = 0;
    gallery.classList.add('is-dragging');
    gallery.setPointerCapture(e.pointerId);
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    clearTimeout(wheelSnapTimer);
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    if (Math.abs(e.clientX - startClickX) > 6) pointerMoved = true;
    velocity = e.clientX - lastX;
    lastX    = e.clientX;
    currentX = clampX(e.clientX - startX);
    gsap.set(track, { x: currentX });
    updateActiveStrip();
  }

  function onRelease(e) {
    if (!isDragging) return;
    isDragging = false;
    gallery.classList.remove('is-dragging');

    // Tap/click (no significant drag) — navigate to that project's case study.
    // We hit-test here rather than relying on a click event because
    // setPointerCapture() redirects click to the gallery element, not the strip.
    if (!pointerMoved && e) {
      const galleryLeft = gallery.getBoundingClientRect().left;
      const clickXInTrack = (e.clientX - galleryLeft) - currentX;
      const allStrips = Array.from(track.querySelectorAll('.sr-strip'));
      const hit = allStrips.find(
        s => clickXInTrack >= s.offsetLeft && clickXInTrack < s.offsetLeft + s.offsetWidth
      );
      if (hit) {
        if (typeof window.navigateTo === 'function') {
          window.navigateTo('surreal-series.html');
        } else {
          window.location.href = 'surreal-series.html';
        }
        return;
      }
    }

    (function inertia() {
      velocity *= 0.92;
      currentX  = clampX(currentX + velocity);
      gsap.set(track, { x: currentX });
      if (Math.abs(velocity) > 0.3) raf = requestAnimationFrame(inertia);
      else { raf = null; snapToNearest(); }
    }());
  }

  function onWheel(e) {
    e.preventDefault();
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    clearTimeout(wheelSnapTimer);
    velocity = 0;
    currentX = clampX(currentX - (e.deltaY || e.deltaX));
    gsap.to(track, { x: currentX, duration: 0.35, ease: 'power2.out' });
    updateActiveStrip();
    wheelSnapTimer = setTimeout(snapToNearest, 350);
  }

  // ── Pause auto-scroll on gallery hover ──────────────────────────────────────
  const onGalleryEnter = () => { isHovering = true; };
  const onGalleryLeave = () => { isHovering = false; };
  gallery.addEventListener('mouseenter', onGalleryEnter);
  gallery.addEventListener('mouseleave', onGalleryLeave);

  // ── Hover scale on real strips only ─────────────────────────────────────────
  const strips = getRealStrips();

  const enterHandlers = strips.map(strip => {
    const img = strip.querySelector('img');
    const fn  = () => {
      if (img && !isDragging && !prefersReducedMotion)
        gsap.to(img, { scale: 1.05, duration: 0.6, ease: 'power3.out' });
    };
    strip.addEventListener('mouseenter', fn);
    return fn;
  });

  const leaveHandlers = strips.map(strip => {
    const img = strip.querySelector('img');
    const fn  = () => { if (img) gsap.to(img, { scale: 1, duration: 0.6, ease: 'power3.out' }); };
    strip.addEventListener('mouseleave', fn);
    return fn;
  });

  // Navigation is handled via hit-test in onRelease — no per-strip click listeners needed.

  gallery.addEventListener('pointerdown', onPointerDown);
  gallery.addEventListener('pointermove', onPointerMove);
  gallery.addEventListener('pointerup', onRelease);
  gallery.addEventListener('pointercancel', onRelease);
  gallery.addEventListener('wheel', onWheel, { passive: false });

  _triggerSurrealHoverAtCursor = null;
  _surrealPreviewDestroy = () => {
    if (raf)     { cancelAnimationFrame(raf);     raf     = null; }
    if (autoRaf) { cancelAnimationFrame(autoRaf); autoRaf = null; }
    clearTimeout(wheelSnapTimer);
    track.querySelectorAll('.sr-strip-clone').forEach(el => el.remove());
    gsap.set(track, { x: 0 });
    currentX = 0;
    gallery.removeEventListener('mouseenter', onGalleryEnter);
    gallery.removeEventListener('mouseleave', onGalleryLeave);
    gallery.removeEventListener('pointerdown', onPointerDown);
    gallery.removeEventListener('pointermove', onPointerMove);
    gallery.removeEventListener('pointerup', onRelease);
    gallery.removeEventListener('pointercancel', onRelease);
    gallery.removeEventListener('wheel', onWheel);
    strips.forEach((strip, i) => {
      strip.removeEventListener('mouseenter', enterHandlers[i]);
      strip.removeEventListener('mouseleave', leaveHandlers[i]);
    });
    _surrealPreviewDestroy       = null;
    _triggerSurrealHoverAtCursor = null;
  };
}

