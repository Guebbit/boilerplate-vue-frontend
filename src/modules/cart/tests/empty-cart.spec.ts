/**
 * @module
 * `domain/empty-cart.ts` — the known-empty cart a successful checkout leaves: every count is
 * zero, the currency is the one passed in, and nothing is left to ship.
 */
import { describe, expect, it } from 'vitest';
import { emptyCart } from '../domain';

describe('emptyCart', () => {
    it('carries the currency and zeroes every count', () => {
        expect(emptyCart('EUR')).toEqual({
            items: [],
            summary: {
                itemsCount: 0,
                totalQuantity: 0,
                itemsTotal: 0,
                shippingCost: 0,
                totalPrice: 0,
                currency: 'EUR',
                expectedTotal: { amount: 0, currency: 'EUR' }
            },
            shipping: { required: false, selected: null, options: [] },
            checkoutable: false
        });
    });
});
