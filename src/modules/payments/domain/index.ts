/**
 * @module
 * Payments — domain layer. Pure rules, lint-guaranteed free of Vue, Pinia, axios and every tier.
 * See `docs/theory/domain-layer.md`.
 */

export { classifyPaymentError } from './payment-errors';

/**
 * The payment-error vocabulary, re-exported so callers import from the domain barrel.
 */
export type { PaymentErrorVerdict, UnavailableOrderLine } from './payment-errors';
