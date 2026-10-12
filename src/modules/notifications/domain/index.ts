/**
 * @module
 * Notifications — domain layer. Pure rules, lint-guaranteed free of Vue, Pinia, axios and every
 * tier. See `docs/theory/domain-layer.md`.
 */

export { describeNotification, notificationOrderId, productName } from './describe';

/**
 * The text-building vocabulary, re-exported so callers import from the domain barrel.
 */
export type { DescribableNotification, FormatDate, Translate } from './describe';
