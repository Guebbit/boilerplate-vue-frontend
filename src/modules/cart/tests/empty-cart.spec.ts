/**
 * @module
 * `domain/empty-cart.ts` — the known-empty cart a successful checkout leaves: every count is
 * zero, the currency is the one passed in, and nothing is left to ship.
 */
import { describe, expect, it } from 'vitest';
import { emptyCart } from '../domain';

describe('emptyCart', () => {
    it('carries the currency and zeroes every count', () => {
        expect(emptyCart('EUR', '0.00')).toEqual({
            items: [],
            summary: {
                itemsCount: 0,
                totalQuantity: 0,
                itemsTotal: '0.00',
                shippingCost: '0.00',
                totalPrice: '0.00',
                currency: 'EUR'
            },
            shipping: { required: false, options: [] },
            checkoutable: false
        });
    });

    it('writes the zero it is given at every money field, so a JPY cart stays whole', () => {
        const { summary } = emptyCart('JPY', '0');

        expect([summary.itemsTotal, summary.shippingCost, summary.totalPrice]).toEqual([
            '0',
            '0',
            '0'
        ]);
    });
});
