/**
 * @module
 * The total a checkout names (`src/modules/cart/domain/expected-total.ts`): integer minor units
 * read back as a decimal for display, and the checkout attempt's fingerprint. Pure, so no mount
 * and no store.
 */
import { describe, expect, it } from 'vitest';
import { checkoutFingerprint, fromMinorUnits } from '../domain';
import type { CartResponse } from '@types';
import { asStub } from '../../../../tests/support/stub.ts';

describe('fromMinorUnits', () => {
    it.each([
        [1998, 2, 19.98],
        [0, 2, 0],
        [1500, 0, 1500],
        [1234, 3, 1.234]
    ])('reads %s at %s decimals as %s', (minor, digits, amount) => {
        expect(fromMinorUnits(minor, digits)).toBe(amount);
    });
});

describe('checkoutFingerprint', () => {
    const cart = asStub<CartResponse>({ items: [], shipping: { selected: null } });

    /**
     * The fingerprint of an order whose shown total is `amount` minor units.
     *
     * @param amount - the shown total
     * @returns the fingerprint
     */
    const at = (amount: number) =>
        checkoutFingerprint({ expectedTotal: { amount, currency: 'EUR' } }, cart);

    it('differs when only the shown total differs', () => {
        expect(at(1998)).not.toBe(at(2450));
        expect(at(1998)).toBe(at(1998));
    });

    it('reads a bare checkout with no cart loaded as no body, no lines, no shipping', () => {
        expect(JSON.parse(checkoutFingerprint(undefined, undefined))).toEqual({
            body: null,
            lines: [],
            shipping: null
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
