/**
 * @module
 * The total a buyer is shown right before "Place order", in the form `POST /cart/checkout` wants
 * it: integer minor units plus the currency. The server compares it with what it would charge and
 * refuses with 409 `CART_TOTAL_CHANGED` when they differ. Pure: the currency's decimals come in
 * as an argument, so nothing here reaches `Intl`. See `docs/modules/cart-checkout.md`.
 */
import type { CartSummaryResponse, CheckoutRequest } from '@types';

/**
 * A money amount in integer minor units (cents) with its ISO-4217 currency, as the wire carries it.
 */
export type ExpectedTotal = CheckoutRequest['expectedTotal'];

/**
 * Converts a decimal amount to integer minor units.
 *
 * Rounds instead of truncating: `0.56 * 100` is `56.00000000000001` and `1.13 * 100` is
 * `112.99999999999999`, so `Math.floor` would lose a cent the buyer was shown.
 *
 * @param amount - Decimal amount, already at the currency's own precision.
 * @param digits - The currency's decimal places (2 for EUR, 0 for JPY, 3 for KWD).
 * @returns The amount in minor units.
 */
export const toMinorUnits = (amount: number, digits: number): number =>
    Math.round(amount * 10 ** digits);

/**
 * Converts integer minor units back to a decimal amount, for display.
 *
 * @param minor - Amount in minor units.
 * @param digits - The currency's decimal places.
 * @returns The decimal amount.
 */
export const fromMinorUnits = (minor: number, digits: number): number => minor / 10 ** digits;

/**
 * The total the cart on screen shows, as the checkout request must name it.
 *
 * @param summary - The cart summary currently shown (items plus shipping).
 * @param digits - The summary currency's decimal places.
 * @returns The expected total.
 */
export const expectedTotalOf = (summary: CartSummaryResponse, digits: number): ExpectedTotal => ({
    amount: toMinorUnits(summary.totalPrice, digits),
    currency: summary.currency
});
