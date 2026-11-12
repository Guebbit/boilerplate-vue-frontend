/**
 * @module
 * Orders — domain layer. Pure rules, lint-guaranteed free of Vue, Pinia, axios and every tier.
 * See `docs/theory/domain-layer.md`.
 */

export { isWholeOrder } from './whole-order';
export { reorderOutcome } from './reorder';
export type { ReorderedOrderLine, ReorderOutcome } from './reorder';
export { describeTimelineEntry } from './timeline';
export type { OrderTimelineType, TimelineLine, TimelineTools } from './timeline';
export { exportRefusalOf } from './export-refusal';
export type { ExportRefusal } from './export-refusal';
