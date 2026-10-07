/**
 * @module
 * The total a checkout names (`src/modules/cart/domain/expected-total.ts`): decimal to integer
 * minor units with no float drift, and back. Pure, so no mount and no store.
 */
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { checkoutFingerprint, expectedTotalOf, fromMinorUnits, toMinorUnits } from '../domain';
import type { CartResponse } from '@types';
import { asStub } from '../../../../tests/support/stub.ts';

describe('toMinorUnits', () => {
    it.each([
        [0.56, 2, 56],
        [1.06, 2, 106],
        [1.13, 2, 113],
        [4.35, 2, 435],
        [19.98, 2, 1998],
        [0, 2, 0],
        [1500, 0, 1500],
        [1.234, 3, 1234]
    ])('turns %s at %s decimals into %s', (amount, digits, minor) => {
        expect(toMinorUnits(amount, digits)).toBe(minor);
    });

    it('is exact for every amount a two-decimal currency can show', () => {
        fc.assert(
            fc.property(fc.integer({ min: 0, max: 100_000_000 }), (cents) => {
                // The decimal the server's own read would hold for that many cents.
                const shown = Number((cents / 100).toFixed(2));
                expect(toMinorUnits(shown, 2)).toBe(cents);
            })
        );
    });

    it('round-trips through fromMinorUnits', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: 100_000_000 }),
                fc.constantFrom(0, 2, 3),
                (minor, digits) => {
                    expect(toMinorUnits(fromMinorUnits(minor, digits), digits)).toBe(minor);
                }
            )
        );
    });
});

describe('expectedTotalOf', () => {
    it('names the total price (shipping included) in minor units, with its currency', () => {
        expect(
            expectedTotalOf(
                {
                    itemsCount: 1,
                    totalQuantity: 1,
                    itemsTotal: 0.56,
                    shippingCost: 0.5,
                    totalPrice: 1.06,
                    currency: 'EUR'
                },
                2
            )
        ).toEqual({ amount: 106, currency: 'EUR' });
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
