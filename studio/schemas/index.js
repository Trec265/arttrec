/**
 * schemas/index.js
 * Export all schema types for sanity.config.js
 */

import project from './project';
import surrealPiece from './surrealPiece';

export const schemaTypes = [project, surrealPiece];
