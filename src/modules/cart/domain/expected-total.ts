/**
 * @module
 * The total a buyer is shown right before "Place order", in the form `POST /cart/checkout` wants
 * it: a decimal string at the currency's places plus the currency. The client echoes the cart
 * summary's `totalPrice` and `currency`; the server compares them by minor units with what it
 * would charge and refuses with 409 `CART_TOTAL_CHANGED` when they differ.
 * @see docs/modules/cart.md
 */
import type { CheckoutRequest } from '@types';

/**
 * A money amount (decimal string at the currency's places) with its ISO-4217 currency, as the wire
 * carries it.
 */
export type ExpectedTotal = CheckoutRequest['expectedTotal'];
