# Final Audit — arttrec Portfolio
Date: 2026-09-07

## Critical (broken — fix immediately)
- [ ] Offline homepage fallback is unavailable by design — `js/main.js` — project loading is intentionally Sanity-only per the current product decision. If offline resilience is required later, add an explicit fallback strategy with approval.
- [ ] Case-study pages have no local JSON fallback — `js/case-study.js` — project loading is intentionally Sanity-only per the current product decision.
- [x] Homepage OG/Twitter image is missing — fixed in `index.html` by using the existing `assets/images/bg.jpg` asset.
- [ ] Project content is represented by Unsplash stock photography in the local source — `data/projects.json` — the cover, hero, and gallery paths for multiple portfolio projects point to `*-unsplash.jpg`. This is employer-visible and becomes the live fallback whenever Sanity is unavailable.

## High (employer-visible — fix before sharing portfolio)
- [x] Static About, Contact, and Surreal Series OG/Twitter images used an Unsplash/project image — fixed in `about.html`, `contact.html`, and `surreal-series.html` by using the existing branded background asset. A dedicated social card would still be preferable.
- [ ] The requested Cigarettes & Candlelight route name does not match the data slug — `data/projects.json`, `sitemap.xml` — data and sitemap use `cigarettes-candlelight`, while the audit target says `cigarettes-and-candlelight`. Choose one canonical slug and redirect/alias the other.
- [ ] Sitemap URLs are inconsistent with canonical URLs — `sitemap.xml`, `surreal-series.html`, dynamic `case-study.js` — clean routes (`/about`, `/contact`, `/case-study`) are mixed with `.html` and query-string URLs. Normalize the sitemap to the deployed canonical URL strategy.
- [x] Contact form options did not match the requested service taxonomy — fixed in `contact.html` to Brand Identity, Art Direction, Packaging Design, Surreal Art Commission, and Other.
- [ ] About page renders five service cards although the verification brief expects four — `about.html` — decide whether the fifth Software Engineering card is intentional or should be consolidated.
- [ ] Invalid case-study fallback redirects silently to the homepage — `js/case-study.js` — this is graceful navigation but gives no explanation or not-found state to the visitor.
- [ ] Case-study social metadata is generated only after JavaScript runs — `case-study.html`, `js/case-study.js` — crawlers that do not execute the page script receive placeholder title/description and empty OG image values.

## Medium (polish — fix when possible)
- [ ] `--fg-dim` is used for readable labels and metadata in several global and page-scoped selectors — `css/style.css`, `about.html`, `contact.html` — it fails normal-text WCAG AA and should be reserved for decorative/quiet text.
- [ ] Some desktop page sections remain more vertically spacious than their content density supports — About, Contact, and case-study editorial sections — a follow-up visual pass could tighten rhythm without changing the premium direction.
- [ ] Surreal fallback records in `data/projects.json` do not include `year` or `accentColor` per piece — `data/projects.json` — runtime derives these values, but the local content model is less complete than the Sanity schema.
- [ ] Surreal series has a 2px horizontal overflow at exactly 900px in the current viewport audit — `css/style.css` — likely caused by the viewport-based desktop layout edge; verify before changing because the brief treats this page as intentionally viewport-driven.
- [ ] The current Playwright suite contains legacy selectors and conditional assertions (`#surreal-list`, `.surreal-item`) that do not match the current rendered gallery classes — `tests/portfolio.spec.js` — coverage should be updated to assert the actual `.sr-strip`/story layout.
- [ ] Static page-scoped CSS duplicates design tokens and shared component rules — `about.html`, `contact.html`, `css/style.css` — consolidation would reduce drift, but requires a deliberate styling refactor.

## Low (minor — nice to have)
- [ ] Static case-study shell has a generic title and description before JavaScript runs — `case-study.html` — provide a more useful fallback title for direct sharing without a project parameter.
- [ ] Some content comments and descriptions contain implementation/page-placement language — `studio/schemas/project.js` — useful for the current editor workflow but less reusable as a multi-channel content model.
- [ ] Local data uses `id` values that duplicate `slug` values — `data/projects.json` — harmless today, but one identifier should be canonical unless an external integration requires both.

## Content Model Notes
- Embedded `pieces[]` in `studio/schemas/project.js` duplicates the standalone `surrealPiece` document type in `studio/schemas/surrealPiece.js`. Keep one source of truth. Recommended model: retain standalone `surrealPiece` documents for reusable gallery pieces and reference them from a Surreal Series project document.
- `project.nextProject` correctly uses a Sanity reference, but local JSON uses slug strings. Keep the frontend adapter boundary explicit so the content model remains reference-based while the fallback remains portable.
- `project.sections[]` is meaningfully structured, but its `layout` is inferred from image count in frontend code rather than modeled as content intent. Consider a future migration to an explicit section layout only if editors need that control.
- `category` and `tags` are currently free-text/array values with a category option list but no shared taxonomy document. A controlled taxonomy is preferable if filtering and cross-channel reuse grow.
- `about.disciplines[].items` is a display string containing multiple skills rather than a reusable list. This is acceptable for the current single-page use, but not ideal for structured reuse.
- Editor experience is generally strong: required titles/slugs/categories, slug auto-generation, hotspot-enabled images, clear field descriptions, orderings for projects and surreal pieces, and a singleton About structure are present.
- Do not modify Sanity schemas without approval because existing documents and migration scripts would need coordinated changes.

## Passed
- Homepage, About, Contact, Case Study, and Surreal Series source pages exist and load through the local server.
- Homepage currently renders the restored Surreal Art card and the Surreal Art filter activates the gallery view.
- Homepage project cards now load only from the Sanity response; the current live response renders six project cards.
- Project data contains eight records; all required base fields (`id`, `slug`, `title`, `category`, `coverImage`, `excerpt`) are present.
- Project overview, challenge, and solution fields are populated in the local JSON records.
- All local image paths referenced by projects and surreal pieces exist on disk.
- Surreal fallback contains five pieces with titles and image paths; runtime supplies fallback year, mood, and accent colors.
- Main page scripts sanitize CMS text before injecting it into HTML.
- Dynamic image rendering avoids empty or `null` image sources and supplies placeholders for missing images.
- Hero background images are decorative with `alt=""` and `aria-hidden="true"`.
- Marquee elements are marked `aria-hidden="true"`.
- Homepage filter controls use a grouped control and `aria-pressed`.
- Homepage project grid uses `aria-live="polite"`.
- Form fields on the Contact page have associated labels.
- Skip links exist on all five main HTML pages.
- Local GSAP, ScrollTrigger, Lenis, and SplitType vendor files are used instead of CDN script requests.
- Loader safety timeout is configured for five seconds.
- Reduced-motion branches exist across the primary animation entry points.
- Homepage, About, Contact, Case Study, and Surreal Series have favicons and the same theme color.
- Homepage, About, and Contact contain JSON-LD structured data.
- `robots.txt` allows crawling and points to the sitemap.
- No visible lorem ipsum, TODO, or FIXME copy was found in the rendered/content source audit.
- Playwright regression suite passes: 54 tests.
- The 1440px browser audit found no console errors for the primary pages.

## Contrast Ratios
- `--fg` (#ede8e0) on `--bg` (#0c0b09): **16.13:1** — pass AA
- `--fg-muted` (#9e958a) on `--bg` (#0c0b09): **6.67:1** — pass AA
- `--fg-dim` (#5c5650) on `--bg` (#0c0b09): **2.72:1** — fail AA for normal text; acceptable only for decorative/large quiet text
- `--accent` (#c8a882) on `--bg` (#0c0b09): **8.79:1** — pass AA
