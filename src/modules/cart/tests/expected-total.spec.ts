/**
 * @module
 * The checkout attempt's fingerprint (`src/modules/cart/domain/checkout-attempt.ts`), which holds
 * the total the checkout names. Pure, so no mount and no store.
 */
import { describe, expect, it } from 'vitest';
import { checkoutFingerprint } from '../domain';
import type { CartResponse } from '@types';
import { asStub } from '../../../../tests/support/stub.ts';

describe('checkoutFingerprint', () => {
    const cart = asStub<CartResponse>({ items: [], shipping: {} });

    /**
     * The fingerprint of an order whose shown total is `amount`, decimal text.
     *
     * @param amount - the shown total
     * @returns the fingerprint
     */
    const at = (amount: string) =>
        checkoutFingerprint({ expectedTotal: { amount, currency: 'EUR' } }, cart);

    it('differs when only the shown total differs', () => {
        expect(at('19.98')).not.toBe(at('24.50'));
        expect(at('19.98')).toBe(at('19.98'));
    });

    it('reads a bare checkout with no cart loaded as no body, no lines, no shipping', () => {
        expect(JSON.parse(checkoutFingerprint(undefined, undefined))).toEqual({
            body: null,
            lines: []
        });
    });

    it('lists the cart lines and the shipping method the checkout would use', () => {
        const filled = asStub<CartResponse>({
            items: [{ productId: 'p1', quantity: 2 }],
            shipping: { selected: 'standard' }
        });

        expect(JSON.parse(checkoutFingerprint(undefined, filled))).toEqual({
            body: null,
            lines: [['p1', 2]],
            shipping: 'standard'
        });
    });

    it('differs when a line or the shipping method differs, the body being equal', () => {
        const one = asStub<CartResponse>({
            items: [{ productId: 'p1', quantity: 1 }],
            shipping: { selected: 'pickup' }
        });
        const two = asStub<CartResponse>({
            items: [{ productId: 'p1', quantity: 2 }],
            shipping: { selected: 'pickup' }
        });
        const shipped = asStub<CartResponse>({
            items: [{ productId: 'p1', quantity: 1 }],
            shipping: { selected: 'standard' }
        });

        expect(checkoutFingerprint(undefined, one)).not.toBe(checkoutFingerprint(undefined, two));
        expect(checkoutFingerprint(undefined, one)).not.toBe(
            checkoutFingerprint(undefined, shipped)
        );
    });
});
