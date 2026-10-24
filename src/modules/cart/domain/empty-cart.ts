/**
 * @module
 * The known-empty cart a successful checkout leaves behind: the server always empties the cart on
 * success, so the local copy is set to this shape instead of being guessed or re-read.
 */
import type { CartResponse } from '@types';

/**
 * What the local cart becomes once checkout empties it server-side. Takes the currency as an
 * argument rather than hardcoding one: the shop's currency does not change just because the
 * basket emptied.
 *
 * @param currency - ISO-4217 code the emptied cart's zeroed summary should still carry.
 * @returns The known-empty cart shape.
 */
export const emptyCart = (currency: string): CartResponse => ({
    items: [],
    summary: {
        itemsCount: 0,
        totalQuantity: 0,
        itemsTotal: 0,
        shippingCost: 0,
        totalPrice: 0,
        currency,
        expectedTotal: { amount: 0, currency }
    },
    shipping: { required: false, selected: null, options: [] },
    checkoutable: false
});
