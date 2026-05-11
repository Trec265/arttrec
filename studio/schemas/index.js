/**
 * schemas/index.js
 * Export all schema types for sanity.config.js
 */

import project from './project';
import surrealPiece from './surrealPiece';
import about from './about';

export const schemaTypes = [project, surrealPiece, about];
