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

export default defineConfig({
  name   : 'portfolio-studio',
  title  : 'Portfolio CMS',

  projectId: 'lu1mcd6s',
  dataset  : 'production',

  plugins: [
    structureTool(),
    visionTool(),   // lets you run GROQ queries live inside the Studio
  ],

  schema: {
    types: schemaTypes,
  },
});
