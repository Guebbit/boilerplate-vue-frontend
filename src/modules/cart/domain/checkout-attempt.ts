/**
 * @module
 * What makes one checkout attempt "the same call": the server binds an `Idempotency-Key` to the
 * request body and replays the recorded answer for a repeat, so a key may travel again only with
 * the same order. This is the fingerprint of that order, built from everything the order is
 * made from: the body, the cart's lines and the shipping method it plans to use. Pure: no
 * storage, no store. See `docs/modules/cart-checkout.md`.
 */
import type { CartResponse, CheckoutRequest } from '@types';

/**
 * The order a checkout would place, as one string: equal strings are the same attempt.
 *
 * Any change from outside the checkout page (the wishlist, the stock poll, a merge, a reorder)
 * changes the cart, so it changes the fingerprint without each writer having to remember to say so.
 *
 * @param body - The checkout request body, or nothing for a bare checkout.
 * @param cart - The cart the checkout reads, when one is loaded.
 * @returns The fingerprint to compare.
 */
export const checkoutFingerprint = (
    body: CheckoutRequest | undefined,
    cart: CartResponse | undefined
): string =>
    JSON.stringify({
        body: body ?? null,
        lines: (cart?.items ?? []).map(({ productId, quantity }) => [productId, quantity]),
        shipping: cart?.shipping.selected ?? null
    });
