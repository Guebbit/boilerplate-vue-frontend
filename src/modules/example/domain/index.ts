/**
 * @module
 * In any module: the domain barrel — this module's pure rules, imported by its screens. A module
 * gets a `domain/` folder once a rule clears the floor (2+ callers, or a trap).
 * Here: one reading rule, `publicationOf`.
 * See: docs/theory/domain-layer.md
 */

export { publicationOf } from './publication';
export type { Publication, PublicationState } from './publication';
