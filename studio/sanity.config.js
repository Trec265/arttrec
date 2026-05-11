/**
 * sanity.config.js
 *
 * SETUP: Replace 'YOUR_PROJECT_ID' with your actual project ID.
 * Find it at https://sanity.io/manage → your project → API tab.
 *
 * Also update the matching value in ../sanity-client.js on the frontend.
 */

import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemas';

/* ── Singleton types — only one document of each should ever exist ── */
const SINGLETONS = ['about'];

export default defineConfig({
  name   : 'portfolio-studio',
  title  : 'Portfolio CMS',

  projectId: 'lu1mcd6s',
  dataset  : 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            /* Singleton: About page — always edits the same fixed document */
            S.listItem()
              .title('About')
              .id('about')
              .child(
                S.document()
                  .schemaType('about')
                  .documentId('singleton-about')
                  .title('About'),
              ),

            S.divider(),

            /* All other document types (projects, surreal pieces, etc.) */
            ...S.documentTypeListItems().filter(
              (item) => !SINGLETONS.includes(item.getId()),
            ),
          ]),
    }),
    visionTool(),   // lets you run GROQ queries live inside the Studio
  ],

  schema: {
    types: schemaTypes,
  },
});
