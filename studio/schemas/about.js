/**
 * schemas/about.js
 *
 * Singleton document for the About section on the portfolio homepage.
 * Only one document of this type should ever exist (ID: singleton-about).
 * The structure builder in sanity.config.js enforces this by pointing
 * directly at that fixed document ID.
 *
 * Fields mirror what the frontend renders in the #about section of index.html.
 */

import { defineType, defineField } from 'sanity';

export default defineType({
  name : 'about',
  title: 'About',
  type : 'document',

  groups: [
    { name: 'copy',        title: 'Copy',        default: true },
    { name: 'portrait',    title: 'Portrait' },
    { name: 'disciplines', title: 'Disciplines' },
  ],

  fields: [

    /* ── COPY ──────────────────────────────────────────────────────── */
    defineField({
      name : 'heading',
      title: 'Heading',
      type : 'string',
      group: 'copy',
      description: 'Main heading line, e.g. "Designer who thinks in systems."',
      validation: Rule => Rule.required(),
    }),

    defineField({
      name : 'headingAccent',
      title: 'Heading Accent (italic)',
      type : 'string',
      group: 'copy',
      description: 'Displayed as italic text on the second line, e.g. "Artist who works in dreams."',
    }),

    defineField({
      name : 'bio',
      title: 'Bio Paragraphs',
      type : 'array',
      group: 'copy',
      of   : [{ type: 'text', rows: 4 }],
      description: 'Each item becomes a separate paragraph. Drag to reorder.',
      validation: Rule => Rule.min(1),
    }),

    /* ── PORTRAIT ───────────────────────────────────────────────────── */
    defineField({
      name   : 'portraitImage',
      title  : 'Portrait Image',
      type   : 'image',
      group  : 'portrait',
      options: { hotspot: true },
      description: 'Your portrait photo. Recommended aspect ratio: 4×5 (e.g. 480×600 px).',
    }),

    defineField({
      name : 'portraitAlt',
      title: 'Portrait Alt Text',
      type : 'string',
      group: 'portrait',
      description: 'Descriptive text for screen readers, e.g. "Cleanwell Mwalwanda, designer".',
    }),

    defineField({
      name : 'portraitCaption',
      title: 'Portrait Caption',
      type : 'string',
      group: 'portrait',
      description: 'Shown below the photo, e.g. "Cleanwell Mwalwanda · 2026".',
    }),

    /* ── DISCIPLINES ────────────────────────────────────────────────── */
    defineField({
      name : 'disciplines',
      title: 'Disciplines',
      type : 'array',
      group: 'disciplines',
      of   : [
        {
          type  : 'object',
          name  : 'discipline',
          title : 'Discipline',
          fields: [
            defineField({
              name : 'label',
              title: 'Label',
              type : 'string',
              description: 'Short category name, e.g. "Design"',
              validation: Rule => Rule.required(),
            }),
            defineField({
              name : 'items',
              title: 'Items',
              type : 'string',
              description: 'Skills in this area, separated by · or commas, e.g. "Brand Identity · Typography"',
            }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'items' },
          },
        },
      ],
      description: 'Discipline rows shown below the bio. Drag to reorder.',
    }),

  ],
});
