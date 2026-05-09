/**
 * surrealPiece.js — Sanity schema for individual Surreal Art pieces
 *
 * Document type: 'surrealPiece'
 * Powers the /surreal-series case page.
 */

import { defineType, defineField } from 'sanity';

export default defineType({
  name: 'surrealPiece',
  title: 'Surreal Piece',
  type: 'document',

  // Order by number ascending in the Studio sidebar
  orderings: [
    {
      title: 'Display Order (ascending)',
      name: 'numberAsc',
      by: [{ field: 'number', direction: 'asc' }],
    },
  ],

  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'e.g. "Echoes"',
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
      validation: Rule => Rule.required(),
    }),

    defineField({
      name: 'number',
      title: 'Display Order',
      type: 'number',
      description: '1, 2, 3, 4 — determines sort order on the case page',
      validation: Rule => Rule.required().integer().positive(),
    }),

    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
      description: 'e.g. 2024',
      validation: Rule => Rule.required().integer().min(2000).max(2100),
    }),

    defineField({
      name: 'subtitle',
      title: 'Subtitle — Poetic one-liner (optional)',
      type: 'string',
      description: 'A short evocative phrase shown under the title. e.g. "Where silence speaks loudest"',
    }),

    defineField({
      name: 'storyPreview',
      title: 'Hook — One punchy sentence (shown on the page, bold & bright)',
      type: 'string',
      description: 'Max 100 characters. This is the FIRST thing visitors read. Make it personal and direct. e.g. "Made this when I couldn\'t sleep — everything felt fractured."',
      validation: Rule => Rule.max(100),
    }),

    defineField({
      name: 'story',
      title: 'Story — Why you made this piece (shown below the hook, dimmer)',
      type: 'text',
      rows: 5,
      description: '2–4 sentences explaining the concept, feeling, or context behind the piece. This is where you go deeper. e.g. "I was processing a lot of noise — political, personal, digital. The layered textures represent how information overloads identity. The figure disappears not because it\'s gone, but because it stopped being seen."',
    }),

    defineField({
      name: 'mood',
      title: 'Mood',
      type: 'string',
      options: {
        list: [
          { title: 'Isolation',      value: 'isolation'      },
          { title: 'Identity',       value: 'identity'       },
          { title: 'Technology',     value: 'technology'     },
          { title: 'Nature',         value: 'nature'         },
          { title: 'Memory',         value: 'memory'         },
          { title: 'Chaos',          value: 'chaos'          },
          { title: 'Transcendence',  value: 'transcendence'  },
        ],
        layout: 'radio',
      },
    }),

    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
    }),

    defineField({
      name: 'accentColor',
      title: 'Accent Color',
      type: 'string',
      description: 'Hex color for story panel tint, e.g. #0f0a1a',
    }),
  ],

  preview: {
    select: {
      title:    'title',
      subtitle: 'subtitle',
      media:    'image',
    },
    prepare({ title, subtitle, media }) {
      return { title, subtitle, media };
    },
  },
});
