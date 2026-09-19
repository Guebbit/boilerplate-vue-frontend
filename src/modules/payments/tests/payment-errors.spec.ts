/**
 * @module
 * Payment error classification — `src/modules/payments/domain/payment-errors.ts`.
 *
 * No `mount`, no Pinia, no HTTP: a rejected value in, a verdict out — same shape as
 * `cart/tests/checkout-errors.spec.ts`.
 */
import { describe, it, expect } from 'vitest';
import { classifyPaymentError } from '@/modules/payments/domain';

describe('classifyPaymentError', () => {
    it('reads every unavailable line off ORDER_PRODUCT_UNAVAILABLE', () => {
        const verdict = classifyPaymentError({
            status: 409,
            errors: [
                {
                    code: 'ORDER_PRODUCT_UNAVAILABLE',
                    message: 'x',
                    details: {
                        lines: [
                            { productId: 'p1', title: 'Widget' },
                            { productId: 'p2', title: 'Gadget' }
                        ]
                    }
                }
            ]
        });

        expect(verdict).toEqual({
            kind: 'product-unavailable',
            lines: [
                { productId: 'p1', title: 'Widget' },
                { productId: 'p2', title: 'Gadget' }
            ]
        });
    });

    it('drops a line missing a title rather than throwing — unlike the cart, an order line always has one', () => {
        const verdict = classifyPaymentError({
            status: 409,
            errors: [
                {
                    code: 'ORDER_PRODUCT_UNAVAILABLE',
                    message: 'x',
                    details: { lines: [{ productId: 'p1' }] }
                }
            ]
        });

        expect(verdict).toEqual({ kind: 'product-unavailable', lines: [] });
    });

    it('falls back to "other" for a refusal with no dedicated response — PAYMENT_ORDER_NOT_PAYABLE', () => {
        expect(
            classifyPaymentError({
                status: 409,
                errors: [{ code: 'PAYMENT_ORDER_NOT_PAYABLE', message: 'x' }]
            })
        ).toEqual({ kind: 'other' });
    });

    it('falls back to "other" for a transport failure carrying no errors field at all', () => {
        expect(classifyPaymentError(new Error('Network Error'))).toEqual({ kind: 'other' });
    });

    it('falls back to "other" for a bare, non-object rejection', () => {
        expect(classifyPaymentError('rejected')).toEqual({ kind: 'other' });
        expect(classifyPaymentError(undefined)).toEqual({ kind: 'other' });
    });
});
