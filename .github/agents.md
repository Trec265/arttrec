---
description: Agent configuration for Cleanwell Mwalwanda's portfolio project
applyTo: '**'
---

# Agent Configuration

## Project Context
- Vanilla JS portfolio site with GSAP 3 and ScrollTrigger
- Projects loaded dynamically from projects.json
- Filter system lives in initFilterBtns() inside main.js
- Sanity CMS for content management
- No frameworks — pure HTML/CSS/JS

## Skills to Always Load
- gsap-framer-scroll-animation
- context-map
- web-coder
- doublecheck

## Agent Behavior Rules

### Before Editing Any File
- ALWAYS run context-map first to identify all related files
- NEVER edit a file without reading it in full first
- Check both animated and reduced-motion paths in any GSAP work

### While Editing
- Never hardcode project titles, IDs, or categories — always read from data-category
- Filter cards using is-hidden class only, never display:none directly
- Always wrap animations in prefers-reduced-motion check
- Use gsap.context() for cleanup, gsap.timeline() for sequences
- Call ScrollTrigger.refresh() after any DOM changes

### After Every Edit
- Run doublecheck on every modified file
- Verify both animated and reduced-motion paths still work
- Confirm the fix does not break ALL / BRANDING / VISUAL DESIGN filter paths

### Commits
- Always use conventional-commit format
- Format: type(scope): description
- Examples: fix(filter): show surreal art project cards dynamically
            feat(nav): add smooth scroll to section anchors