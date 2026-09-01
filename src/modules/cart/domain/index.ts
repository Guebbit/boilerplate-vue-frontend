/**
 * @module
 * Cart — domain layer. Pure rules, lint-guaranteed free of Vue, Pinia, axios and every tier.
 * See `docs/theory/domain-layer.md`.
 */

export { MIN_LINE_QUANTITY, steppedQuantity } from './quantity';
export { classifyCheckoutError } from './checkout-errors';
export type { CheckoutErrorVerdict, CheckoutShortfallLine } from './checkout-errors';
