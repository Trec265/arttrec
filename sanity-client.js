/**
 * sanity-client.js
 *
 * Browser-compatible Sanity HTTP API client (no bundler required).
 * Loaded as a plain <script> before main.js / case-study.js.
 *
 * ─── SETUP ───────────────────────────────────────────────────────────
 * 1. Go to https://sanity.io/manage and open your project.
 * 2. Copy the Project ID from the project dashboard.
 * 3. Replace 'YOUR_PROJECT_ID' below with your real project ID.
 * 4. If your dataset is not named 'production', update SANITY_DATASET.
 *
 * Until SANITY_PROJECT_ID is set, the site gracefully falls back to
 * loading data from data/projects.json — nothing breaks.
 * ─────────────────────────────────────────────────────────────────────
 */

(function (global) {
  'use strict';

  /* ── Configuration ─────────────────────────────────────────────── */
  var SANITY_PROJECT_ID = 'lu1mcd6s';
  var SANITY_DATASET    = 'production';
  var SANITY_API_VER    = '2024-01-01';

  /* ── Internal helpers ──────────────────────────────────────────── */
  function isConfigured() {
    return (
      typeof SANITY_PROJECT_ID === 'string' &&
      SANITY_PROJECT_ID.length > 0 &&
      SANITY_PROJECT_ID !== 'YOUR_PROJECT_ID'
    );
  }

  function buildQueryUrl(query) {
    // Use the CDN endpoint for read-only public queries (faster, cached)
    var host = SANITY_PROJECT_ID + '.apicdn.sanity.io';
    return (
      'https://' + host +
      '/v' + SANITY_API_VER +
      '/data/query/' + SANITY_DATASET +
      '?query=' + encodeURIComponent(query)
    );
  }

  /* ── GROQ query — shaped to match data/projects.json exactly ──── */
  var ALL_PROJECTS_QUERY = [
    '*[_type == "project"] | order(order asc, _createdAt asc) {',
    '  "id": slug.current,',
    '  "slug": slug.current,',
    '  title,',
    '  subtitle,',
    '  year,',
    '  category,',
    '  tags,',
    '  "coverImage": select(',
    '    defined(coverImage.asset) => coverImage.asset->url,',
    '    localCoverImage',
    '  ),',
    '  "heroImage": select(',
    '    defined(heroImage.asset) => heroImage.asset->url,',
    '    localHeroImage',
    '  ),',
    '  featured,',
    '  excerpt,',
    '  overview,',
    '  challenge,',
    '  solution,',
    '  "images": select(',
    '    defined(images) && length(images) > 0 => images[].asset->url,',
    '    localImages != null => string::split(localImages, "|")',
    '  ),',
    '  "sections": sections[] {',
    '    title,',
    '    caption,',
    '    "images": images[].asset->url',
    '  },',
    '  brief,',
    '  outcome,',
    '  "pieces": pieces[] {',
    '    title,',
    '    description,',
    '    "image": select(',
    '      defined(image.asset) => image.asset->url,',
    '      localImage',
    '    )',
    '  },',
    '  "nextProject": nextProject->slug.current',
    '}',
  ].join('\n');

  /* ── Public API ────────────────────────────────────────────────── */
  async function fetchProjects() {
    var timeout = new Promise(function(_, reject) {
      setTimeout(function() { reject(new Error('[SanityClient] timeout')); }, 4000);
    });
    var res = await Promise.race([fetch(buildQueryUrl(ALL_PROJECTS_QUERY)), timeout]);
    if (!res.ok) {
      throw new Error('[SanityClient] API error ' + res.status);
    }
    var json = await res.json();
    return json.result || [];
  }

  global.SanityClient = {
    isConfigured : isConfigured,
    fetchProjects: fetchProjects,
    /** Exposed so other scripts can read the config if needed */
    projectId    : function () { return SANITY_PROJECT_ID; },
    dataset      : function () { return SANITY_DATASET; },
  };

})(window);
