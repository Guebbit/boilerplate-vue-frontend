/**
 * @module
 * Cart — domain layer. Pure rules, lint-guaranteed free of Vue, Pinia, axios and every tier.
 * See `docs/theory/domain-layer.md`.
 */

export { MIN_LINE_QUANTITY, steppedQuantity } from './quantity';
export { classifyCheckoutError } from './checkout-errors';
export { checkoutFingerprint } from './checkout-attempt';
export { expectedTotalOf, fromMinorUnits, toMinorUnits } from './expected-total';
export type { ExpectedTotal } from './expected-total';
export {
    MAX_GUEST_LINES,
    MAX_GUEST_LINE_QUANTITY,
    addGuestLine,
    guestCartQuantity,
    parseGuestCart,
    parseStoredGuestCart,
    parseMergeAttempt,
    removeGuestLines,
    setGuestLineQuantity,
    subtractGuestLines
} from './guest-cart';
export { changedMergeLines, mergeReportKind } from './merge-report';
export type { MergeReportKind, MergeReportLine } from './merge-report';
export { stockPollIntervalMs } from './stock-poll';
export type { GuestCartLine, MergeAttempt } from './guest-cart';

/**
 * The checkout-error vocabulary, re-exported so callers import from the domain barrel.
 */
export type {
    CheckoutErrorVerdict,
    CheckoutShortfallLine,
    UnavailableCartLine
} from './checkout-errors';
