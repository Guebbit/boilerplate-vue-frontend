/**
 * @module
 * Products — domain layer. Pure rules, lint-guaranteed free of Vue, Pinia, axios and every tier.
 * See `docs/theory/domain-layer.md`.
 */

export { shelfStateOf } from './shelf-state';
export type { ShelfState } from './shelf-state';
export { toDateTimeLocal, fromDateTimeLocal, isReleaseDateSlip } from './release-date';
