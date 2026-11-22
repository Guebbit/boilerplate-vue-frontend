/**
 * @module
 * Products — domain layer. Pure rules, lint-guaranteed free of Vue, Pinia, axios and every tier.
 * @see docs/understand/domain-layer.md
 */

export { LOW_STOCK_THRESHOLD, shelfStateOf } from './shelf-state';
export type { ShelfState } from './shelf-state';

export { lineStatusOf } from './line-status';
export type { LineFacts, LineStatus } from './line-status';
