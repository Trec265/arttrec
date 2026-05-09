---
description: Project context and rules for Cleanwell Mwalwanda's portfolio
applyTo: '**'
---

# Portfolio — Copilot Instructions

## Stack
- Vanilla JS (no frameworks)
- GSAP 3 with ScrollTrigger for all animations
- Projects loaded dynamically from projects.json
- Sanity CMS for content management
- Sanity client in sanity-client.js
- Case study pages in case-study.html / case-study.js
- Styles in style.css

## File Map
- `main.js` — all core JS: filter, animations, nav, scroll
- `projects.json` — single source of truth for all project data
- `index.html` — main markup
- `case-study.html` / `case-study.js` — individual project pages
- `sanity-client.js` — Sanity CMS connection
- `migrate-to-sanity.js` — data migration script
- `compress-images.js` — image optimization script
- `style.css` — all styles
- `vendor/` — third party libraries
- `assets/` — images and static files
- `data/` — local data files

## Key DOM Elements
- `#projects-grid` — the project cards grid
- `#surreal-list-view` — editorial surreal series list
- `.project-card` — individual project cards
- `data-category` — category attribute on each card

## Coding Rules
- Never hardcode project titles, IDs, or categories
- Always read categories from `data-category` attribute
- Filter cards using `is-hidden` class only, never `display:none` directly
- Always handle both animated and reduced-motion paths in GSAP code
- Use `gsap.context()` for animation cleanup
- Use `gsap.timeline()` for sequenced animations
- Call `ScrollTrigger.refresh()` after any DOM changes
- Respect `prefers-reduced-motion` on all animations
- When editing `initFilterBtns`, always check ALL / BRANDING / SURREAL ART / VISUAL DESIGN paths