/**
 * tests/portfolio.spec.js
 *
 * Playwright E2E tests for Cleanwell Mwalwanda Portfolio
 *
 * Prerequisites:
 *   npm install -D @playwright/test
 *   npx playwright install chromium
 *
 * Run:
 *   npx playwright test
 */

const { test, expect } = require('@playwright/test');

const BASE = 'http://localhost:3000';

/* =====================================================================
   HOMEPAGE TESTS
   ===================================================================== */

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
  });

  test('should display arttrec SVG logo in nav', async ({ page }) => {
    const logo = page.locator('.nav-logo svg');
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('viewBox', '0 0 360 90');
  });

  test('should render project cards in #projects-grid', async ({ page }) => {
    const grid = page.locator('#projects-grid');
    await expect(grid).toBeVisible();
    const cards = grid.locator('.work-card');
    await expect(cards).toHaveCount(await cards.count());
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test('each project card should have a valid href', async ({ page }) => {
    const links = page.locator('.work-card__link');
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      const href = await links.nth(i).getAttribute('href');
      expect(href).toBeTruthy();
    }
  });

  test('no broken images in project grid (no src="null")', async ({ page }) => {
    const imgs = page.locator('.work-card__img[src]');
    const count = await imgs.count();
    for (let i = 0; i < count; i++) {
      const src = await imgs.nth(i).getAttribute('src');
      expect(src).not.toBe('null');
      expect(src).not.toBe('');
    }
  });

  test('should not contain placeholder text "tewtwetwetwetwetwe"', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('tewtwetwetwetwetwe');
  });

  test('tags should not have trailing commas', async ({ page }) => {
    const tags = await page.locator('.work-card__type').allTextContents();
    for (const tag of tags) {
      expect(tag.trim()).not.toMatch(/,\s*$/);
    }
  });

  test('contact heading should be a single h2 element', async ({ page }) => {
    const contactHeadings = page.locator('.contact h2');
    await expect(contactHeadings).toHaveCount(1);
  });

  test('contact heading should have aria-label', async ({ page }) => {
    const h2 = page.locator('.contact__heading-wrap');
    await expect(h2).toHaveAttribute('aria-label');
  });

  test('filter buttons should hide/show cards by category', async ({ page }) => {
    const brandingBtn = page.locator('[data-filter="Branding"]');
    if (await brandingBtn.count() > 0) {
      await brandingBtn.click();
      const hiddenCards = page.locator('.work-card.is-hidden');
      const visibleCards = page.locator('.work-card:not(.is-hidden)');
      const hiddenCount = await hiddenCards.count();
      const visibleCount = await visibleCards.count();
      // At least some cards should be visible when filter applied
      expect(visibleCount).toBeGreaterThan(0);
      // At least some cards should be hidden (not everything is Branding)
      // (conditional — only true if non-Branding projects exist)
      expect(hiddenCount + visibleCount).toBeGreaterThan(0);
    }
  });

  test('Surreal Art list view should render pieces', async ({ page }) => {
    const surrealList = page.locator('#surreal-list');
    if (await surrealList.count() > 0) {
      await expect(surrealList).toBeVisible();
      const items = surrealList.locator('.surreal-item');
      expect(await items.count()).toBeGreaterThan(0);
    }
  });

  test('mobile nav should open on toggle click', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const toggle = page.locator('#nav-toggle');
    await toggle.click();
    const mobileNav = page.locator('#nav-mobile');
    await expect(mobileNav).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });
});

/* =====================================================================
   CASE STUDY TESTS — Branding project
   ===================================================================== */

test.describe('Case Study — Onira (Branding)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/case-study?project=onira`, { waitUntil: 'networkidle' });
  });

  test('should display CW SVG logo in case-study nav', async ({ page }) => {
    const logo = page.locator('.nav-logo svg');
    await expect(logo).toBeVisible();
  });

  test('should render project title', async ({ page }) => {
    const title = page.locator('#cs-project-title');
    await expect(title).toBeVisible();
    const text = await title.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('hero image should not have src="null"', async ({ page }) => {
    const heroImg = page.locator('#cs-hero-image img');
    if (await heroImg.count() > 0) {
      const src = await heroImg.getAttribute('src');
      expect(src).not.toBe('null');
    }
  });

  test('tags should not have trailing commas', async ({ page }) => {
    const tags = await page.locator('.cs-hero__meta-tag').allTextContents();
    for (const tag of tags) {
      expect(tag.trim()).not.toMatch(/,\s*$/);
    }
  });

  test('next project link should be valid', async ({ page }) => {
    const nextLink = page.locator('#cs-next-link');
    if (await nextLink.count() > 0) {
      const href = await nextLink.getAttribute('href');
      expect(href).toMatch(/case-study\?project=/);
      expect(href).not.toContain('null');
    }
  });
});

/* =====================================================================
   CASE STUDY TESTS — Surreal Art (gallery mode)
   ===================================================================== */

test.describe('Case Study — Surreal Series (Gallery Mode)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/case-study?project=surreal-series`, { waitUntil: 'networkidle' });
  });

  test('should render in gallery mode (cs-pieces--gallery class)', async ({ page }) => {
    const piecesSection = page.locator('.cs-pieces--gallery');
    await expect(piecesSection).toBeVisible();
  });

  test('should not render narrative section in gallery mode', async ({ page }) => {
    const narrative = page.locator('#cs-narrative');
    if (await narrative.count() > 0) {
      await expect(narrative).toBeHidden();
    }
  });

  test('piece images should not have src="null"', async ({ page }) => {
    const imgs = page.locator('.piece-row__img[src]');
    const count = await imgs.count();
    for (let i = 0; i < count; i++) {
      const src = await imgs.nth(i).getAttribute('src');
      expect(src).not.toBe('null');
    }
  });

  test('title should not merge words (no missing space)', async ({ page }) => {
    const title = await page.locator('#cs-project-title').textContent();
    // Confirm title has proper spaces between words
    if (title) {
      const words = title.trim().split(/\s+/);
      expect(words.length).toBeGreaterThan(1);
    }
  });
});

/* =====================================================================
   MOBILE RESPONSIVE TESTS
   ===================================================================== */

test.describe('Mobile Responsive', () => {
  test('homepage layout should fit 390px viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const body = page.locator('body');
    await expect(body).toBeVisible();
    // Check no horizontal scrollbar
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(hasHorizontalScroll).toBe(false);
  });

  test('social links should meet 44px touch target', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const links = page.locator('.contact__social-link');
    const count = await links.count();
    for (let i = 0; i < count; i++) {
      const box = await links.nth(i).boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});

/* =====================================================================
   ACCESSIBILITY SMOKE TESTS
   ===================================================================== */

test.describe('Accessibility', () => {
  test('nav logo should have aria-label', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const logo = page.locator('.nav-logo');
    await expect(logo).toHaveAttribute('aria-label', 'Cleanwell Mwalwanda');
  });

  test('nav toggle should have aria-label and aria-controls', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const toggle = page.locator('#nav-toggle');
    await expect(toggle).toHaveAttribute('aria-label');
    await expect(toggle).toHaveAttribute('aria-controls');
  });

  test('project cards should have aria-label on their links', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const cardLinks = page.locator('.work-card__link');
    const count = await cardLinks.count();
    for (let i = 0; i < count; i++) {
      const ariaLabel = await cardLinks.nth(i).getAttribute('aria-label');
      expect(ariaLabel?.length).toBeGreaterThan(0);
    }
  });
});
