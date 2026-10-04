/**
 * @module
 * Cart — domain layer. Pure rules, lint-guaranteed free of Vue, Pinia, axios and every tier.
 * See `docs/theory/domain-layer.md`.
 */

export { MIN_LINE_QUANTITY, steppedQuantity } from './quantity';
export { classifyCheckoutError } from './checkout-errors';
export {
    MAX_GUEST_LINES,
    MAX_GUEST_LINE_QUANTITY,
    addGuestLine,
    guestCartQuantity,
    parseGuestCart,
    removeGuestLines,
    setGuestLineQuantity
} from './guest-cart';
export type { GuestCartLine } from './guest-cart';

/**
 * The checkout-error vocabulary, re-exported so callers import from the domain barrel.
 */
export type {
    CheckoutErrorVerdict,
    CheckoutShortfallLine,
    UnavailableCartLine
} from './checkout-errors';
