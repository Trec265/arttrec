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

  fields: [
    /* ── Identity ──────────────────────────────────────────────── */
    {
      name      : 'title',
      title     : 'Title',
      type      : 'string',
      validation: Rule => Rule.required(),
    },
    {
      name   : 'slug',
      title  : 'Slug',
      type   : 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: Rule => Rule.required(),
      description: 'Used in the URL: case-study?project=<slug>',
    },
    {
      name : 'subtitle',
      title: 'Subtitle',
      type : 'string',
      description: 'e.g. "Spirits, Art & Identity" or "Digital Art"',
    },
    {
      name : 'year',
      title: 'Year',
      type : 'string',
    },
    {
      name   : 'category',
      title  : 'Category',
      type   : 'string',
      options: {
        list: [
          { title: 'Branding',      value: 'Branding' },
          { title: 'Surreal Art',   value: 'Surreal Art' },
          { title: 'Visual Design', value: 'Visual Design' },
        ],
      },
      validation: Rule => Rule.required(),
    },
    {
      name   : 'tags',
      title  : 'Tags',
      type   : 'array',
      of     : [{ type: 'string' }],
      options: { layout: 'tags' },
      description: 'Skills shown in the case-study details panel',
    },

    /* ── Images ────────────────────────────────────────────────── */
    {
      name   : 'coverImage',
      title  : 'Cover Image',
      type   : 'image',
      options: { hotspot: true },
      description: 'Shown on the project card grid',
    },
    {
      name   : 'heroImage',
      title  : 'Hero Image',
      type   : 'image',
      options: { hotspot: true },
      description: 'Large hero at the top of the case-study page',
    },
    {
      name: 'images',
      title: 'Gallery Images',
      type: 'array',
      of  : [{ type: 'image', options: { hotspot: true } }],
      description: 'Additional project images shown in the case-study gallery',
    },

    /* ── Listing flags ─────────────────────────────────────────── */
    {
      name        : 'featured',
      title       : 'Featured',
      type        : 'boolean',
      initialValue: false,
      description : 'Featured projects appear in the full-viewport panel section',
    },
    {
      name       : 'order',
      title      : 'Display Order',
      type       : 'number',
      description: 'Lower numbers appear first (1, 2, 3 …)',
    },

    /* ── Text content ──────────────────────────────────────────── */
    {
      name : 'excerpt',
      title: 'Excerpt',
      type : 'text',
      rows : 3,
      description: 'One or two sentences shown on project cards and featured panels',
    },
    {
      name : 'role',
      title: 'Role',
      type : 'string',
      description: 'Your role on the project, e.g. "Brand Designer" or "Art Director"',
    },
    {
      name : 'brief',
      title: 'Brief',
      type : 'text',
      rows : 3,
      description: 'Editorial — 2–3 lines of concise project context shown below the hero (non-surreal projects). Falls back to Overview if empty.',
    },
    {
      name : 'outcome',
      title: 'Outcome',
      type : 'text',
      rows : 3,
      description: 'Editorial — 1–2 lines explaining the result or significance. Falls back to Solution if empty.',
    },
    {
      name : 'visitLink',
      title: 'Visit Site URL',
      type : 'url',
      description: 'Optional "Visit Site" link shown at the bottom of the case study',
    },
    {
      name : 'overview',
      title: 'Overview',
      type : 'text',
      rows : 5,
    },
    {
      name : 'challenge',
      title: 'Challenge',
      type : 'text',
      rows : 5,
    },
    {
      name : 'solution',
      title: 'Solution',
      type : 'text',
      rows : 5,
    },

    /* ── Editorial sections (non-surreal case studies) ─────────── */
    {
      name       : 'sections',
      title      : 'Case Study Sections',
      type       : 'array',
      description: 'Structured numbered sections for editorial case studies. Leave empty to auto-generate from gallery images.',
      of: [
        {
          type  : 'object',
          name  : 'caseSection',
          title : 'Section',
          fields: [
            {
              name : 'number',
              title: 'Number',
              type : 'string',
              description: 'e.g. "01", "02"',
            },
            {
              name      : 'title',
              title     : 'Title',
              type      : 'string',
              description: 'e.g. "Identity", "Color & Typography", "In Use"',
              validation: Rule => Rule.required(),
            },
            {
              name   : 'images',
              title  : 'Images',
              type   : 'array',
              of     : [{ type: 'image', options: { hotspot: true } }],
              description: '1 image = full-width. 2 images = side-by-side pair.',
            },
            {
              name : 'caption',
              title: 'Caption',
              type : 'string',
              description: 'Optional caption below the images',
            },
          ],
          preview: {
            select: { title: 'title', subtitle: 'number', media: 'images.0' },
            prepare({ title, subtitle, media }) {
              return { title, subtitle: subtitle ? `${subtitle} \u2014 ${title}` : title, media };
            },
          },
        },
      ],
    },

    /* ── Series pieces (Surreal Art) ───────────────────────────── */
    {
      name       : 'pieces',
      title      : 'Series Pieces',
      type       : 'array',
      description: 'Individual works within a series (e.g. Surreal Photo Manipulation Series)',
      of: [
        {
          type  : 'object',
          name  : 'piece',
          title : 'Piece',
          fields: [
            { name: 'title',       title: 'Title',       type: 'string' },
            { name: 'description', title: 'Description', type: 'text', rows: 3 },
            { name: 'image',       title: 'Image',       type: 'image', options: { hotspot: true } },
            {
              name: 'localImage',
              title: 'Original Image Path',
              type: 'string',
              readOnly: true,
              description: 'Original migrated local path — upload image above then ignore',
            },
            {
              name: 'story',
              title: 'Story',
              type: 'text',
              rows: 4,
              description: 'The concept behind this piece. 2–4 sentences shown in the surreal list view.',
            },
            {
              name: 'tools',
              title: 'Tools',
              type: 'string',
              description: 'e.g. Photoshop · Digital Art',
            },
          ],
          preview: {
            select: { title: 'title', media: 'image' },
          },
        },
      ],
    },

    /* ── Navigation ────────────────────────────────────────────── */
    {
      name       : 'nextProject',
      title      : 'Next Project',
      type       : 'reference',
      to         : [{ type: 'project' }],
      description: 'Project shown in the "Next Project" footer of the case study',
    },

    /* ── Migration helpers (read-only reminders of original file paths) ── */
    {
      name       : 'localCoverImage',
      title      : 'Original Cover Image Path',
      type       : 'string',
      readOnly   : true,
      description: 'Original local path from migration — upload the image above then this field can be ignored',
    },
    {
      name       : 'localHeroImage',
      title      : 'Original Hero Image Path',
      type       : 'string',
      readOnly   : true,
      description: 'Original local path from migration — upload the image above then this field can be ignored',
    },
    {
      name       : 'localImages',
      title      : 'Original Gallery Image Paths',
      type       : 'string',
      readOnly   : true,
      description: 'Pipe-separated list of original local paths — upload images above then ignore',
    },
  ],

  preview: {
    select: {
      title   : 'title',
      subtitle: 'subtitle',
      media   : 'coverImage',
    },
  },
};
