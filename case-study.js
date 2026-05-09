/**
 * case-study.js — Case Study Page
 *
 * Execution order:
 *   1. DOMContentLoaded
 *   2. Register GSAP plugins + Lenis
 *   3. Read ?project= param from URL
 *   4. Fetch projects.json
 *   5. Find project by slug (404 → redirect if not found)
 *   6. renderCaseStudy(project, allProjects) → writes all DOM
 *   7. initCaseStudyAnimations() → set up GSAP
 *   8. ScrollTrigger.refresh()
 */

'use strict';

/* ─── Safety: remove js-ready on any error so content stays visible ─ */
window.addEventListener('error', () => {
  document.body.classList.remove('js-ready');
});

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

/* ─── Bootstrap ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  if (!prefersReducedMotion) {
    document.body.classList.add('js-ready');
  }

  const lenis = initLenis();
  initNavToggle();
  initNavScroll();
  initBackLinks();

  // Read project slug from URL: case-study.html?project=onira
  const slug = new URLSearchParams(window.location.search).get('project');

  if (!slug) {
    redirectHome();
    return;
  }

  try {
    const projects = await fetchProjects();
    const project = projects.find(p => p.slug === slug);

    if (!project) {
      redirectHome();
      return;
    }

    // Find next project data
    const nextProject = projects.find(p => p.slug === project.nextProject) || null;

    // Update page <title>, description, and OG tags
    document.title = `${project.title} — ${project.subtitle} · Cleanwell Mwalwanda`;
    const ogTitle = document.getElementById('og-title');
    if (ogTitle) ogTitle.setAttribute('content', document.title);
    const description = project.excerpt || project.overview || document.title;
    const metaDesc = document.getElementById('meta-description');
    if (metaDesc) metaDesc.setAttribute('content', description);
    const ogDesc = document.getElementById('og-description');
    if (ogDesc) ogDesc.setAttribute('content', description);

    // OG image — use heroImage (absolute CDN URL or resolved local path)
    const ogImg = document.getElementById('og-image');
    if (ogImg && project.heroImage) {
      const imgUrl = project.heroImage.startsWith('http')
        ? project.heroImage
        : `${window.location.origin}/${project.heroImage}`;
      ogImg.setAttribute('content', imgUrl);
    }
    const ogUrl = document.getElementById('og-url');
    if (ogUrl) ogUrl.setAttribute('content', window.location.href);

    // Render all content into the DOM
    renderCaseStudy(project, nextProject);

    if (!prefersReducedMotion) {
      initCaseStudyAnimations();
    }

    ScrollTrigger.refresh();

  } catch (err) {
    console.error('[Case Study] Failed to load:', err);
    document.body.classList.remove('js-ready');
    redirectHome();
  }
});


/* =====================================================================
   LENIS
   ===================================================================== */
function initLenis() {
  const lenis = new Lenis({
    duration: 1.2,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}


/* =====================================================================
   DATA
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

function redirectHome() {
  window.location.replace('index.html');
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

  mobile.querySelectorAll('.nav__mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', 'false');
      mobile.setAttribute('aria-hidden', 'true');
      mobile.classList.remove('is-open');
    });
  });
}

function initNavScroll() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  ScrollTrigger.create({
    start: 'top -80px',
    onEnter: () => nav.classList.add('is-scrolled'),
    onLeaveBack: () => nav.classList.remove('is-scrolled'),
  });
}

/* Intercept "back to work" links, footer back link, and nav links to use page transition */
function initBackLinks() {
  const selectors = ['.cs-back-link', '.site-footer__back', '.nav__link', '.nav__mobile-link'];
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(link => {
      link.addEventListener('click', e => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:')) return;
        e.preventDefault();
        if (typeof window.navigateTo === 'function') {
          window.navigateTo(href);
        } else {
          window.location.href = href;
        }
      });
    });
  });
}


/* =====================================================================
   CONTENT SANITIZATION
   Escapes HTML entities in all Sanity-sourced strings before DOM injection.
   ===================================================================== */
function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  const el = document.createElement('div');
  el.textContent = str;
  return el.innerHTML;
}

function stripTrailingComma(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/,\s*$/, '');
}

function normalizePlaceholder(str) {
  if (typeof str !== 'string') return str;
  if (/tewtwetwetwetwetwe/i.test(str)) {
    return 'A typographic exploration of disconnection and modern alienation. Identity fragments across digital and physical space.';
  }
  return str;
}

/* Missing-image fallback — never a blank white rectangle. */
function imgOrPlaceholder(src, alt, cls, width, height) {
  const safeSrc = (src && src !== 'null') ? sanitizeText(src) : '';
  const safeAlt = sanitizeText(alt || '');
  if (safeSrc) {
    return `<img src="${safeSrc}" alt="${safeAlt}" class="${cls}" loading="lazy" width="${width}" height="${height}" />`;
  }
  return `<div class="img-placeholder ${cls}" aria-hidden="true"></div>`;
}

/* =====================================================================
   EDITORIAL SECTION HELPERS
   Builds numbered image sections for non-surreal (editorial) projects.
   Falls back to auto-generating sections from project.images[] when
   project.sections[] is not present.
   ===================================================================== */
function getDefaultSectionLabels(category) {
  const c = (category || '').toLowerCase();
  if (c.includes('brand')) {
    return ['Identity', 'Color & Typography', 'Product', 'Packaging', 'In Use'];
  }
  if (c.includes('visual')) {
    return ['Concept', 'Design', 'Details', 'Final'];
  }
  return ['Overview', 'Design', 'Details', 'In Use'];
}

function buildEditorialSections(project) {
  // Use structured sections if provided
  if (project.sections && project.sections.length) {
    return project.sections.map((s, i) => ({
      number : s.number || String(i + 1).padStart(2, '0'),
      title  : s.title  || `Section ${i + 1}`,
      layout : (s.images && s.images.length >= 2) ? 'pair' : 'single',
      images : (s.images || []).map(img => (typeof img === 'string' ? img : (img.src || img.url || ''))),
      caption: s.caption || '',
    }));
  }

  // Auto-build: one full-width section per label, padded to full label set.
  // Each label slot gets one image (or null for a placeholder).
  const images = (project.images || []).filter(src => src && src !== 'null');
  const labels = getDefaultSectionLabels(project.category);

  return labels.map((title, i) => ({
    number : String(i + 1).padStart(2, '0'),
    title,
    layout : 'single',
    images : images[i] ? [images[i]] : [],
    caption: '',
  }));
}

function renderEditorialSections(project) {
  const container = document.getElementById('cs-sections');
  if (!container) return;

  const sections = buildEditorialSections(project);
  if (!sections.length) return;

  container.innerHTML = sections.map((section, i) => {
    const labelText = `${sanitizeText(section.number)} — ${sanitizeText(section.title)}`;
    const imgs      = (section.images || []).filter(Boolean);
    const layout    = section.layout === 'pair' && imgs.length >= 2 ? 'pair' : 'single';
    const aspectCls = layout === 'pair' ? 'cs-section__img-wrap--landscape-short' : 'cs-section__img-wrap--landscape';

    const imagesHtml = imgs.map(src =>
      `<div class="cs-section__img-wrap ${aspectCls}">
        ${imgOrPlaceholder(src, sanitizeText(project.title || ''), '', '1200', '800')}
      </div>`
    ).join('');

    const captionHtml = section.caption
      ? `<p class="cs-section__caption">${sanitizeText(section.caption)}</p>` : '';

    return `
      <section class="cs-section" data-index="${i}" aria-label="${labelText}">
        <div class="cs-section__inner">
          <span class="cs-section__label">${labelText}</span>
          <div class="cs-section__images cs-section__images--${layout}">
            ${imagesHtml}
          </div>
          ${captionHtml}
        </div>
      </section>`;
  }).join('\n');

  container.removeAttribute('hidden');
}


/* =====================================================================
   RENDER: CASE STUDY
   Writes all project content into the pre-built HTML shell.
   ===================================================================== */
function renderCaseStudy(project, nextProject) {
  const isGalleryMode = project.galleryMode === true ||
    (project.category && project.category.toLowerCase().includes('surreal'));

  /* --- Meta tags row ------------------------------------------------ */
  const metaEl = document.getElementById('cs-meta');
  if (metaEl) {
    const metaParts = isGalleryMode
      ? [project.category, project.year, ...(project.tags || [])]
      : [project.category, project.year, project.role || (project.tags || [])[0]];
    const tags = metaParts.filter(Boolean).map(t => stripTrailingComma(t));
    metaEl.innerHTML = tags.map(tag =>
      `<span class="cs-hero__meta-tag">${sanitizeText(tag)}</span>`
    ).join('');
  }

  /* --- Title + subtitle --------------------------------------------- */
  const titleEl = document.getElementById('cs-project-title');
  if (titleEl) titleEl.textContent = project.title || '';

  const subEl = document.getElementById('cs-subtitle');
  if (subEl) subEl.textContent = stripTrailingComma(project.subtitle || '');

  /* --- Nav title (cs-only) ------------------------------------------ */
  const navTitleEl = document.getElementById('cs-nav-title');
  if (navTitleEl) navTitleEl.textContent = project.title || '';

  /* --- Hero image ---------------------------------------------------- */
  const heroImgWrap = document.getElementById('cs-hero-image');
  if (heroImgWrap) {
    heroImgWrap.innerHTML = imgOrPlaceholder(
      project.heroImage,
      `${project.title || ''} \u2014 ${project.subtitle || ''}`,
      '',
      '1400',
      '600'
    );
  }

  /* --- Details panel ------------------------------------------------- */
  const detailsEl = document.getElementById('cs-details');
  if (detailsEl) {
    const details = [
      { label: 'Project',  value: stripTrailingComma(project.subtitle || '') },
      { label: 'Year',     value: project.year || '' },
      { label: 'Category', value: project.category || '' },
      { label: 'Skills',   value: (project.tags || []).map(t => stripTrailingComma(t)).join(', ') },
    ].filter(d => d.value);
    detailsEl.innerHTML = details.map(d => `
      <div class="cs-detail-row">
        <p class="cs-detail-label">${sanitizeText(d.label)}</p>
        <p class="cs-detail-value">${sanitizeText(d.value)}</p>
      </div>
    `).join('');
  }

  /* --- Overview text ------------------------------------------------- */
  const overviewEl = document.getElementById('cs-overview-text');
  if (overviewEl && project.overview) {
    overviewEl.innerHTML = `<p>${sanitizeText(normalizePlaceholder(project.overview))}</p>`;
  }

  /* --- Editorial mode vs gallery mode -------------------------------- */
  if (!isGalleryMode) {
    /* ====== EDITORIAL MODE (non-surreal projects) ====== */

    // Hide old sections — replaced by editorial shells
    const overviewSection = document.getElementById('cs-overview');
    if (overviewSection) overviewSection.hidden = true;

    // Brief (project.brief preferred; falls back to overview)
    const briefContent = project.brief || project.overview || '';
    const briefSection = document.getElementById('cs-brief');
    const briefTextEl  = document.getElementById('cs-brief-text');
    if (briefSection && briefTextEl && briefContent) {
      briefTextEl.textContent = normalizePlaceholder(briefContent);
      briefSection.removeAttribute('hidden');
    }

    // Challenge
    const challengeContent = project.challenge || '';
    const challengeSection = document.getElementById('cs-challenge');
    const challengeTextEl  = document.getElementById('cs-challenge-text');
    if (challengeSection && challengeTextEl && challengeContent) {
      challengeTextEl.textContent = normalizePlaceholder(challengeContent);
      challengeSection.removeAttribute('hidden');
    }

    // Numbered editorial image sections
    renderEditorialSections(project);

    // Outcome (project.outcome preferred; falls back to solution)
    const outcomeContent = project.outcome || project.solution || '';
    const outcomeSection = document.getElementById('cs-outcome');
    const outcomeTextEl  = document.getElementById('cs-outcome-text');
    if (outcomeSection && outcomeTextEl && outcomeContent) {
      outcomeTextEl.textContent = outcomeContent;
      outcomeSection.removeAttribute('hidden');
    }

    // Visit link (optional)
    const visitLinkEl = document.getElementById('cs-visit-link');
    if (visitLinkEl && project.visitLink) {
      visitLinkEl.href = sanitizeText(project.visitLink);
      visitLinkEl.removeAttribute('hidden');
    }

  } else {
    /* ====== GALLERY MODE (surreal art — unchanged) ====== */

    // Ensure editorial shells stay hidden
    ['cs-brief', 'cs-challenge', 'cs-sections', 'cs-outcome'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.setAttribute('hidden', '');
    });
  }

  /* --- Narrative (Challenge + Solution) — hidden in both modes ------- */
  const narrativeEl = document.getElementById('cs-narrative');
  if (narrativeEl) narrativeEl.hidden = true;

  /* --- Gallery images — always hidden (editorial uses cs-sections) --- */
  const galleryEl = document.getElementById('cs-gallery');
  if (galleryEl) galleryEl.hidden = true;

  /* --- Pieces ------------------------------------------------------- */
  const piecesSection = document.getElementById('cs-pieces');
  const piecesList    = document.getElementById('cs-pieces-list');

  if (project.pieces?.length && piecesSection && piecesList) {
    piecesSection.hidden = false;

    if (isGalleryMode) {
      /* Gallery mode: full-viewport pieces with overlay */
      piecesSection.classList.add('cs-pieces--gallery');
      piecesList.innerHTML = project.pieces.map((piece, i) => {
        const num = String(i + 1).padStart(2, '0');
        const pieceTitle = sanitizeText(piece.title || '');
        const pieceSrc   = sanitizeText((piece.image && piece.image !== 'null') ? piece.image : '');
        return `
          <div class="piece-row--gallery" data-index="${i}">
            ${pieceSrc
              ? `<img src="${pieceSrc}" alt="${pieceTitle}" class="piece-row__img" loading="${i === 0 ? 'eager' : 'lazy'}" />`
              : '<div class="img-placeholder piece-row__img" aria-hidden="true"></div>'
            }
            <div class="piece-gradient-overlay" aria-hidden="true"></div>
            <span class="piece-counter" aria-hidden="true">${num}</span>
            <div class="piece-caption">
              <span class="piece-caption__num">${num}</span>
              <span class="piece-caption__title">${pieceTitle}</span>
            </div>
            ${i < project.pieces.length - 1
              ? `<div class="piece-divider" aria-hidden="true">
                  <svg viewBox="0 0 1200 1" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                    <line x1="0" y1="0.5" x2="1200" y2="0.5" stroke="currentColor" stroke-opacity="0.2"/>
                  </svg>
                </div>`
              : ''
            }
          </div>
        `.trim();
      }).join('\n');
    } else {
      /* Standard mode: piece with text + image side-by-side */
      piecesList.innerHTML = project.pieces.map((piece, i) => {
        const num = String(i + 1).padStart(2, '0');
        const pieceTitle = sanitizeText(piece.title || '');
        const pieceDesc  = sanitizeText(normalizePlaceholder(piece.description || ''));
        return `
          <div class="cs-piece">
            <span class="cs-piece__num">${num}</span>
            <div class="cs-piece__content">
              <div class="cs-piece__text">
                <h3 class="cs-piece__title">${pieceTitle}</h3>
                <p class="cs-piece__description">${pieceDesc}</p>
              </div>
              <div class="cs-piece__img-wrap">
                ${imgOrPlaceholder(piece.image, pieceTitle, '', '600', '450')}
              </div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  /* --- Gallery cursor (gallery mode only) --------------------------- */
  if (isGalleryMode) {
    const cursorEl = document.createElement('div');
    cursorEl.className = 'gallery-cursor';
    cursorEl.id = 'gallery-cursor';
    cursorEl.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursorEl);
  }

  /* --- Next project teaser ------------------------------------------ */
  if (nextProject) {
    const nextLink  = document.getElementById('cs-next-link');
    const nextTitle = document.getElementById('cs-next-title');
    const nextSub   = document.getElementById('cs-next-sub');
    const nextImg   = document.getElementById('cs-next-image');

    const nextSlug = sanitizeText(nextProject.slug || '');
    const nextHref = nextSlug === 'surreal-series' ? 'surreal-series.html' : `case-study?project=${nextSlug}`;
    if (nextLink) {
      nextLink.href = nextHref;
      nextLink.addEventListener('click', e => {
        e.preventDefault();
        if (typeof window.navigateTo === 'function') {
          window.navigateTo(nextHref);
        } else {
          window.location.href = nextHref;
        }
      });
    }
    if (nextTitle) nextTitle.textContent = nextProject.title || '';
    if (nextSub)   nextSub.textContent   = stripTrailingComma(nextProject.subtitle || '');
    if (nextImg) {
      nextImg.innerHTML = imgOrPlaceholder(
        nextProject.coverImage, nextProject.title || '', '', '400', '300'
      );
    }
  } else {
    const nextSection = document.getElementById('cs-next');
    if (nextSection) nextSection.hidden = true;
  }
}


/* =====================================================================
   CASE STUDY ANIMATIONS
   All GSAP/ScrollTrigger work — called after renderCaseStudy().
   ===================================================================== */
function initCaseStudyAnimations() {

  /* -- Nav slides down from off-screen -------------------------------- */
  gsap.to('#nav', {
    y: 0,
    duration: 0.9,
    ease: 'power3.out',
  });

  /* -- Hero: title chars animate up ----------------------------------- */
  const title = document.querySelector('.cs-hero__title');
  if (title) {
    const split = new SplitType(title, { types: 'lines' });
    gsap.from(split.lines, {
      y: 60,
      opacity: 0,
      duration: 1.1,
      stagger: 0.1,
      ease: 'power4.out',
      delay: 0.2,
    });
  }

  gsap.from('.cs-hero__meta-tag', {
    opacity: 0,
    y: 12,
    duration: 0.6,
    stagger: 0.08,
    ease: 'power3.out',
    delay: 0.1,
  });

  gsap.from('.cs-hero__subtitle', {
    opacity: 0,
    y: 16,
    duration: 0.7,
    ease: 'power3.out',
    delay: 0.6,
  });

  /* -- Hero image parallax ------------------------------------------- */
  const heroImg = document.querySelector('.cs-hero__image-wrap img');
  if (heroImg) {
    gsap.fromTo(heroImg,
      { y: 0, scale: 1.06 },
      {
        scrollTrigger: {
          trigger: '.cs-hero__image-wrap',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
        y: -60,
        scale: 1,
        ease: 'none',
      }
    );
  }

  /* -- Overview text -------------------------------------------------- */
  const overviewText = document.querySelector('.cs-overview__text p');
  if (overviewText) {
    const split = new SplitType(overviewText, { types: 'lines' });
    gsap.from(split.lines, {
      scrollTrigger: {
        trigger: overviewText,
        start: 'top 80%',
        once: true,
      },
      opacity: 0,
      y: 24,
      duration: 0.9,
      stagger: 0.1,
      ease: 'power3.out',
    });
  }

  /* -- Details rows --------------------------------------------------- */
  gsap.from('.cs-detail-row', {
    scrollTrigger: {
      trigger: '.cs-overview__details',
      start: 'top 80%',
      once: true,
    },
    opacity: 0,
    x: -20,
    duration: 0.7,
    stagger: 0.1,
    ease: 'power3.out',
  });

  /* -- Narrative blocks ----------------------------------------------- */
  gsap.from('.cs-narrative__block', {
    scrollTrigger: {
      trigger: '.cs-narrative',
      start: 'top 80%',
      once: true,
    },
    opacity: 0,
    y: 30,
    duration: 0.9,
    stagger: 0.18,
    ease: 'power3.out',
  });

  /* -- Editorial: brief text ------------------------------------------ */
  const briefText = document.querySelector('.cs-brief__text');
  if (briefText) {
    gsap.from(briefText, {
      scrollTrigger: { trigger: briefText, start: 'top 82%', once: true },
      opacity: 0,
      y: 28,
      duration: 1.0,
      ease: 'power3.out',
    });
  }

  /* -- Editorial: challenge text -------------------------------------- */
  const challengeText = document.querySelector('.cs-challenge__text');
  if (challengeText) {
    gsap.from(challengeText, {
      scrollTrigger: { trigger: challengeText, start: 'top 84%', once: true },
      opacity: 0,
      y: 20,
      duration: 0.9,
      ease: 'power3.out',
    });
  }

  /* -- Editorial: numbered sections ----------------------------------- */
  document.querySelectorAll('.cs-section').forEach(section => {
    const label = section.querySelector('.cs-section__label');
    const imgs  = section.querySelectorAll('.cs-section__img-wrap');

    if (label) {
      gsap.from(label, {
        scrollTrigger: { trigger: section, start: 'top 88%', once: true },
        opacity: 0,
        x: -12,
        duration: 0.6,
        ease: 'power3.out',
      });
    }

    if (imgs.length) {
      gsap.from(imgs, {
        scrollTrigger: { trigger: section, start: 'top 85%', once: true },
        opacity: 0,
        y: 40,
        duration: 1.0,
        stagger: 0.12,
        ease: 'power3.out',
        delay: 0.1,
      });
    }
  });

  /* -- Editorial: outcome --------------------------------------------- */
  const outcomeText = document.querySelector('.cs-outcome__text');
  if (outcomeText) {
    gsap.from(outcomeText, {
      scrollTrigger: { trigger: outcomeText, start: 'top 82%', once: true },
      opacity: 0,
      y: 24,
      duration: 1.0,
      ease: 'power3.out',
    });
  }

  /* -- Gallery images fade/scale in ----------------------------------- */
  const galleryImgs = document.querySelectorAll('.cs-gallery__img-wrap');
  if (galleryImgs.length) {
    ScrollTrigger.batch(galleryImgs, {
      start: 'top 88%',
      once: true,
      onEnter: batch => {
        gsap.from(batch, {
          opacity: 0,
          y: 30,
          duration: 0.9,
          stagger: 0.12,
          ease: 'power3.out',
        });
      },
    });
  }

  /* -- Pieces --------------------------------------------------------- */
  const pieces = document.querySelectorAll('.cs-piece');
  if (pieces.length) {
    pieces.forEach(piece => {
      gsap.from(piece, {
        scrollTrigger: {
          trigger: piece,
          start: 'top 85%',
          once: true,
        },
        opacity: 0,
        y: 40,
        duration: 0.9,
        ease: 'power3.out',
      });
    });
  }

  /* -- Next project teaser -------------------------------------------- */
  gsap.from('.cs-next__title', {
    scrollTrigger: {
      trigger: '.cs-next',
      start: 'top 82%',
      once: true,
    },
    opacity: 0,
    y: 30,
    duration: 1.0,
    ease: 'power3.out',
  });
}
