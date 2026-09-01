/**
 * @module
 * Checkout error classification — `src/modules/cart/domain/checkout-errors.ts`.
 *
 * No `mount`, no Pinia, no HTTP: a rejected value in, a verdict out. `cart-view.spec.ts` proves
 * the view acts on the verdict; these prove the verdict is the right one, including the shapes a
 * malformed or absent `errors` field can take, since the value crosses a wire boundary untyped.
 */
import { describe, it, expect } from 'vitest';
import { classifyCheckoutError } from '@/modules/cart/domain';

describe('classifyCheckoutError', () => {
    it('names CART_CHANGED', () => {
        expect(
            classifyCheckoutError({ status: 409, errors: [{ code: 'CART_CHANGED', message: 'x' }] })
        ).toEqual({ kind: 'cart-changed' });
    });

    it('names CART_ADDRESS_NOT_FOUND', () => {
        expect(
            classifyCheckoutError({
                status: 404,
                errors: [{ code: 'CART_ADDRESS_NOT_FOUND', message: 'x' }]
            })
        ).toEqual({ kind: 'address-not-found' });
    });

    it('reads every shortfall line off CART_INSUFFICIENT_STOCK', () => {
        const verdict = classifyCheckoutError({
            status: 409,
            errors: [
                {
                    code: 'CART_INSUFFICIENT_STOCK',
                    message: 'x',
                    details: {
                        lines: [
                            { productId: 'p1', title: 'Widget', requested: 5, available: 2 },
                            { productId: 'p2', title: 'Gadget', requested: 1, available: 0 }
                        ]
                    }
                }
            ]
        });

        expect(verdict).toEqual({
            kind: 'insufficient-stock',
            lines: [
                { productId: 'p1', title: 'Widget', requested: 5, available: 2 },
                { productId: 'p2', title: 'Gadget', requested: 1, available: 0 }
            ]
        });
    });

    it('drops a shortfall line that does not match the shape rather than throwing', () => {
        const verdict = classifyCheckoutError({
            status: 409,
            errors: [
                {
                    code: 'CART_INSUFFICIENT_STOCK',
                    message: 'x',
                    details: { lines: [{ productId: 'p1', title: 'Widget' /* no counts */ }] }
                }
            ]
        });

        expect(verdict).toEqual({ kind: 'insufficient-stock', lines: [] });
    });

    it('falls back to "other" for a refusal with no dedicated response — CART_EMPTY', () => {
        expect(
            classifyCheckoutError({ status: 409, errors: [{ code: 'CART_EMPTY', message: 'x' }] })
        ).toEqual({ kind: 'other' });
    });

    it('falls back to "other" for a transport failure carrying no errors field at all', () => {
        expect(classifyCheckoutError(new Error('Network Error'))).toEqual({ kind: 'other' });
    });

    it('falls back to "other" for a bare, non-object rejection', () => {
        expect(classifyCheckoutError('rejected')).toEqual({ kind: 'other' });
        expect(classifyCheckoutError(undefined)).toEqual({ kind: 'other' });
    });
});
