/**
 * schemas/project.js
 *
 * Document schema for portfolio projects.
 * Mirrors the structure in data/projects.json exactly so the frontend
 * works with both data sources without any code changes.
 */

export default {
  name : 'project',
  title: 'Project',
  type : 'document',

  orderings: [
    {
      title: 'Display Order',
      name : 'orderAsc',
      by   : [{ field: 'order', direction: 'asc' }],
    },
  ],

  /* ── Studio groups (tabs) ──────────────────────────────────── */
  groups: [
    { name: 'basics',   title: 'Basics',   default: true },
    { name: 'images',   title: 'Images' },
    { name: 'content',  title: 'Content' },
    { name: 'sections', title: 'Sections' },
    { name: 'advanced', title: 'Advanced' },
  ],

  fields: [
    /* ── BASICS tab ────────────────────────────────────────────── */
    {
      name      : 'title',
      title     : 'Title',
      type      : 'string',
      group     : 'basics',
      description: 'The project name shown throughout the portfolio.',
      placeholder: 'e.g. Kuonix',
      validation: Rule => Rule.required(),
    },
    {
      name   : 'slug',
      title  : 'Slug',
      type   : 'slug',
      group  : 'basics',
      options: { source: 'title', maxLength: 96 },
      validation: Rule => Rule.required(),
      description: 'Auto-generated from the title. Used in the URL: /case-study?project=<slug>',
      placeholder: 'e.g. kuonix',
    },
    {
      name : 'subtitle',
      title: 'Subtitle',
      type : 'string',
      group: 'basics',
      description: 'e.g. "Spirits, Art & Identity" — shown under the title',
      placeholder: 'e.g. Brand Identity',
    },
    {
      name   : 'category',
      title  : 'Category',
      type   : 'string',
      group  : 'basics',
      description: 'Choose the primary discipline for this project.',
      options: {
        list: [
          { title: 'Branding',      value: 'Branding' },
          { title: 'Surreal Art',   value: 'Surreal Art' },
          { title: 'Visual Design', value: 'Visual Design' },
        ],
        layout: 'radio',
      },
      validation: Rule => Rule.required(),
    },
    {
      name : 'year',
      title: 'Year',
      type : 'string',
      group: 'basics',
      description: 'The year the project was created or published.',
      placeholder: 'e.g. 2026',
      validation: Rule => Rule.required(),
    },
    {
      name   : 'tags',
      title  : 'Tags / Skills',
      type   : 'array',
      group  : 'basics',
      of     : [{ type: 'string' }],
      options: { layout: 'tags' },
      description: 'e.g. Brand Identity, Typography, Packaging — shown in the case-study details panel',
    },
    {
      name : 'role',
      title: 'Your Role',
      type : 'string',
      group: 'basics',
      description: 'e.g. "Brand Designer" or "Art Director"',
      placeholder: 'e.g. Brand Designer',
    },
    {
      name        : 'featured',
      title       : 'Featured',
      type        : 'boolean',
      group       : 'basics',
      initialValue: false,
      description : 'Featured projects appear in the large hero panel on the home page',
    },
    {
      name       : 'order',
      title      : 'Display Order',
      type       : 'number',
      group      : 'basics',
      description: 'Lower numbers appear first (1, 2, 3 …)',
      placeholder: 'e.g. 1',
    },

    /* ── IMAGES tab ────────────────────────────────────────────── */
    {
      name   : 'coverImage',
      title  : 'Cover Image',
      type   : 'image',
      group  : 'images',
      options: { hotspot: true },
      description: 'Shown on the project card grid and the home page featured panel',
      validation: Rule => Rule.required(),
    },
    {
      name   : 'heroImage',
      title  : 'Hero Image',
      type   : 'image',
      group  : 'images',
      options: { hotspot: true },
      description: 'Large full-bleed image at the top of the case-study page',
      validation: Rule => Rule.required(),
    },
    {
      name : 'images',
      title: 'Gallery Images',
      type : 'array',
      group: 'images',
      of   : [{ type: 'image', options: { hotspot: true } }],
      description: 'Project images used in the case-study sections. If you add Case Study Sections below, upload images there instead.',
    },

    /* ── CONTENT tab ───────────────────────────────────────────── */
    {
      name : 'excerpt',
      title: 'Card Excerpt',
      type : 'text',
      group: 'content',
      rows : 2,
      description: '📌 HOME PAGE — shown on the project card in the grid and on the large featured panel. Keep it to 1–2 punchy sentences.',
      placeholder: 'A complete brand identity for...',
      validation: Rule => Rule.max(200).warning('Keep excerpts under 200 characters'),
    },
    {
      name : 'brief',
      title: 'Brief  ➜  appears just below the hero image',
      type : 'text',
      group: 'content',
      rows : 3,
      description: '📄 CASE STUDY — first thing the reader sees after the hero. Set the scene: what was the project, who is it for, what was the goal. 2–3 sentences. (Branding / Visual Design only)',
      placeholder: 'Describe the project, audience, and goal...',
    },
    {
      name : 'challenge',
      title: 'Challenge  ➜  appears after the Brief',
      type : 'text',
      group: 'content',
      rows : 4,
      description: '📄 CASE STUDY — the design problem or tension you were solving. This sits between the Brief and the image sections. 2–4 sentences. (Branding / Visual Design only)',
      placeholder: 'What problem or tension did the design need to solve?',
    },
    {
      name : 'outcome',
      title: 'Outcome  ➜  appears at the very bottom, after all images',
      type : 'text',
      group: 'content',
      rows : 3,
      description: '📄 CASE STUDY — the final word. What did the work achieve or mean? 1–2 sentences max. (Branding / Visual Design only)',
      placeholder: 'What did the work achieve or communicate?',
    },
    {
      name : 'overview',
      title: 'Overview  ➜  main body text on the case study page',
      type : 'text',
      group: 'content',
      rows : 5,
      description: '📄 CASE STUDY — used instead of Brief/Challenge/Outcome for Surreal Art projects. One block of text shown under the hero.',
      placeholder: 'Introduce the project and its central idea...',
    },
    {
      name : 'visitLink',
      title: 'Visit Site URL  ➜  link button at the bottom',
      type : 'url',
      group: 'content',
      description: '📄 CASE STUDY — adds a "Visit Site" button at the very end. Leave blank and a "Back to top" arrow appears instead.',
      placeholder: 'https://example.com',
    },

    /* ── SECTIONS tab ──────────────────────────────────────────── */
    {
      name       : 'sections',
      title      : 'Case Study Sections',
      type       : 'array',
      group      : 'sections',
      description: 'Branding / Visual Design — upload images into each section in order. Rename or delete sections you don\'t need. Sections are numbered automatically.',
      of: [
        {
          type  : 'object',
          name  : 'caseSection',
          title : 'Section',
          fields: [
            {
              name      : 'title',
              title     : 'Section Title',
              type      : 'string',
              description: 'A short editorial label for this image group, e.g. Identity or In Use.',
              placeholder: 'e.g. Identity',
              validation: Rule => Rule.required(),
            },
            {
              name   : 'images',
              title  : 'Images',
              type   : 'array',
              of     : [{ type: 'image', options: { hotspot: true } }],
              description: '1 image = full-width. 2 images = side-by-side.',
            },
            {
              name : 'caption',
              title: 'Caption',
              type : 'string',
              description: 'Optional caption shown below the images',
              placeholder: 'Optional context for these images...',
            },
          ],
          preview: {
            select: { title: 'title', media: 'images.0' },
            prepare({ title, media }) {
              return { title, media };
            },
          },
        },
      ],
      initialValue: [
        { _type: 'caseSection', _key: 'identity',  title: 'Identity' },
        { _type: 'caseSection', _key: 'color',     title: 'Color & Typography' },
        { _type: 'caseSection', _key: 'product',   title: 'Product' },
        { _type: 'caseSection', _key: 'packaging', title: 'Packaging' },
        { _type: 'caseSection', _key: 'inuse',     title: 'In Use' },
      ],
    },

    {
      name       : 'pieces',
      title      : 'Series Pieces',
      type       : 'array',
      group      : 'sections',
      description: 'Surreal Art — individual works in the series',
      of: [
        {
          type  : 'object',
          name  : 'piece',
          title : 'Piece',
          fields: [
            { name: 'title',       title: 'Title',       type: 'string', description: 'Name of the individual work.', placeholder: 'e.g. Cirrus State of Mind', validation: Rule => Rule.required() },
            { name: 'description', title: 'Description', type: 'text', rows: 3, description: 'Short description shown beside the work.', placeholder: 'Describe this piece in 2–4 sentences...' },
            { name: 'image',       title: 'Image',       type: 'image', options: { hotspot: true }, description: 'Artwork image used in the series.', validation: Rule => Rule.required() },
            {
              name: 'story',
              title: 'Story',
              type: 'text',
              rows: 4,
              description: 'The concept behind this piece. 2–4 sentences shown in the surreal list view.',
              placeholder: 'Explain the concept, feeling, or context behind this piece...',
            },
            {
              name: 'tools',
              title: 'Tools',
              type: 'string',
              description: 'e.g. Photoshop · Digital Art',
              placeholder: 'e.g. Photoshop · Digital Art',
            },
            {
              name: 'localImage',
              title: 'Original Image Path',
              type: 'string',
              readOnly: true,
              description: 'Migration reference — upload the image above and ignore this',
            },
          ],
          preview: {
            select: { title: 'title', media: 'image' },
          },
        },
      ],
    },

    /* ── ADVANCED tab ──────────────────────────────────────────── */
    {
      name       : 'nextProject',
      title      : 'Next Project',
      type       : 'reference',
      group      : 'advanced',
      to         : [{ type: 'project' }],
      description: 'Project shown in the "Next Project" footer of the case study',
    },
    {
      name : 'solution',
      title: 'Solution (legacy)',
      type : 'text',
      group: 'advanced',
      rows : 4,
      description: 'Legacy field — use Outcome instead. Kept as a fallback.',
      placeholder: 'Legacy solution text, if still needed...',
    },
  ],

  preview: {
    select: {
      title   : 'title',
      subtitle: 'subtitle',
      media   : 'coverImage',
    },
    prepare({ title, subtitle, media }) {
      return {
        title: title || 'Untitled project',
        subtitle: subtitle || 'No subtitle',
        media,
      };
    },
  },
};
