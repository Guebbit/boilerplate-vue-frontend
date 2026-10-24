/**
 * @module
 * The total a buyer is shown right before "Place order", in the form `POST /cart/checkout` wants
 * it: integer minor units plus the currency. The cart's summary already carries it
 * (`summary.expectedTotal`), so the client echoes it and converts nothing; the server compares it
 * with what it would charge and refuses with 409 `CART_TOTAL_CHANGED` when they differ. What is
 * left here reads an amount the server named back into a decimal for display. Pure: the
 * currency's decimals come in as an argument, so nothing here reaches `Intl`.
 * See `docs/modules/cart-checkout.md`.
 */
import type { CheckoutRequest } from '@types';

/**
 * A money amount in integer minor units (cents) with its ISO-4217 currency, as the wire carries it.
 */
export type ExpectedTotal = CheckoutRequest['expectedTotal'];

/**
 * Converts integer minor units back to a decimal amount, for display.
 *
 * @param minor - Amount in minor units.
 * @param digits - The currency's decimal places.
 * @returns The decimal amount.
 */
export const fromMinorUnits = (minor: number, digits: number): number => minor / 10 ** digits;
