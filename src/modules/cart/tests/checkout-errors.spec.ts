/**
 * @module
 * Checkout error classification — `src/modules/cart/domain/checkout-errors.ts`.
 *
 * No `mount`, no Pinia, no HTTP: a rejected value in, a verdict out. `cart-view.spec.ts` proves
 * the view acts on the verdict; these prove the verdict is the right one, including the shapes a
 * malformed or absent `errors` field can take, since the value crosses a wire boundary untyped.
 */
import { describe, it, expect } from 'vitest';
import { classifyCheckoutError } from '../domain';

describe('classifyCheckoutError', () => {
    it('names CART_CHANGED', () => {
        expect(
            classifyCheckoutError({ status: 409, errors: [{ code: 'CART_CHANGED', message: 'x' }] })
        ).toEqual({ kind: 'cart-changed' });
    });

    it('names CART_TOTAL_CHANGED with the totals the server compared', () => {
        expect(
            classifyCheckoutError({
                status: 409,
                errors: [
                    {
                        code: 'CART_TOTAL_CHANGED',
                        message: 'x',
                        details: {
                            expected: { amount: 1998, currency: 'EUR' },
                            actual: { amount: 2450, currency: 'EUR' }
                        }
                    }
                ]
            })
        ).toEqual({
            kind: 'total-changed',
            expected: { amount: 1998, currency: 'EUR' },
            actual: { amount: 2450, currency: 'EUR' }
        });
    });

    it('still names CART_TOTAL_CHANGED when its details are missing or malformed', () => {
        const verdict = { kind: 'total-changed', expected: undefined, actual: undefined };
        expect(
            classifyCheckoutError({ status: 409, errors: [{ code: 'CART_TOTAL_CHANGED' }] })
        ).toEqual(verdict);
        expect(
            classifyCheckoutError({
                status: 409,
                errors: [
                    {
                        code: 'CART_TOTAL_CHANGED',
                        details: { expected: { amount: '19.98', currency: 'EUR' }, actual: 5 }
                    }
                ]
            })
        ).toEqual(verdict);
    });

    it('names CART_ADDRESS_NOT_FOUND', () => {
        expect(
            classifyCheckoutError({
                status: 404,
                errors: [{ code: 'CART_ADDRESS_NOT_FOUND', message: 'x' }]
            })
        ).toEqual({ kind: 'address-not-found' });
    });

    it('names CART_BILLING_ADDRESS_REQUIRED', () => {
        expect(
            classifyCheckoutError({
                status: 422,
                errors: [{ code: 'CART_BILLING_ADDRESS_REQUIRED', message: 'x' }]
            })
        ).toEqual({ kind: 'billing-address-required' });
    });

    it('names CART_SHIPPING_METHOD_WEIGHT', () => {
        expect(
            classifyCheckoutError({
                status: 409,
                errors: [{ code: 'CART_SHIPPING_METHOD_WEIGHT', message: 'x' }]
            })
        ).toEqual({ kind: 'shipping-method-weight' });
    });

    it('names CART_SHIP_TO_COUNTRY_NOT_SUPPORTED', () => {
        expect(
            classifyCheckoutError({
                status: 422,
                errors: [{ code: 'CART_SHIP_TO_COUNTRY_NOT_SUPPORTED', message: 'x' }]
            })
        ).toEqual({ kind: 'ship-to-country-not-supported' });
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
                            {
                                productId: 'p1',
                                title: 'Widget',
                                requested: 5,
                                availability: 'insufficient_stock'
                            },
                            {
                                productId: 'p2',
                                title: 'Gadget',
                                requested: 1,
                                availability: 'unavailable'
                            }
                        ]
                    }
                }
            ]
        });

        expect(verdict).toEqual({
            kind: 'insufficient-stock',
            lines: [
                {
                    productId: 'p1',
                    title: 'Widget',
                    requested: 5,
                    availability: 'insufficient_stock'
                },
                {
                    productId: 'p2',
                    title: 'Gadget',
                    requested: 1,
                    availability: 'unavailable'
                }
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
                    details: { lines: [{ productId: 'p1', title: 'Widget' /* no quantity */ }] }
                }
            ]
        });

        expect(verdict).toEqual({ kind: 'insufficient-stock', lines: [] });
    });

    it('reads every unavailable line off CART_PRODUCT_UNAVAILABLE, title included', () => {
        const verdict = classifyCheckoutError({
            status: 404,
            errors: [
                {
                    code: 'CART_PRODUCT_UNAVAILABLE',
                    message: 'x',
                    details: { lines: [{ productId: 'p1', title: 'Widget' }] }
                }
            ]
        });

        expect(verdict).toEqual({
            kind: 'product-unavailable',
            lines: [{ productId: 'p1', title: 'Widget' }]
        });
    });

    it('keeps an unavailable line with no title — a hard-deleted product has none', () => {
        const verdict = classifyCheckoutError({
            status: 404,
            errors: [
                {
                    code: 'CART_PRODUCT_UNAVAILABLE',
                    message: 'x',
                    details: { lines: [{ productId: 'p1' }] }
                }
            ]
        });

        expect(verdict).toEqual({
            kind: 'product-unavailable',
            lines: [{ productId: 'p1', title: undefined }]
        });
    });

    it('drops an unavailable line missing even a productId rather than throwing', () => {
        const verdict = classifyCheckoutError({
            status: 404,
            errors: [
                {
                    code: 'CART_PRODUCT_UNAVAILABLE',
                    message: 'x',
                    details: { lines: [{ title: 'Widget' }] }
                }
            ]
        });

        expect(verdict).toEqual({ kind: 'product-unavailable', lines: [] });
    });

    it('names the unpaid orders CART_OPEN_ORDER_LIMIT lists, dropping anything that is not an id', () => {
        const verdict = classifyCheckoutError({
            status: 409,
            errors: [
                {
                    code: 'CART_OPEN_ORDER_LIMIT',
                    message: 'x',
                    details: { orderIds: ['o1', 7, 'o2'] }
                }
            ]
        });

        expect(verdict).toEqual({ kind: 'open-order-limit', orderIds: ['o1', 'o2'] });
    });

    it('reads CART_OPEN_ORDER_LIMIT with no details as a refusal naming no order', () => {
        const verdict = classifyCheckoutError({
            status: 409,
            errors: [{ code: 'CART_OPEN_ORDER_LIMIT', message: 'x' }]
        });

        expect(verdict).toEqual({ kind: 'open-order-limit', orderIds: [] });
    });

    it("reads CART_PURCHASE_HOLD as a hold, leaving the reason and date to the buyer's own record", () => {
        expect(
            classifyCheckoutError({
                status: 409,
                errors: [
                    {
                        code: 'CART_PURCHASE_HOLD',
                        message: 'x',
                        details: { until: '2999-01-01T00:00:00.000Z', reason: 'staff' }
                    }
                ]
            })
        ).toEqual({ kind: 'purchase-hold' });
    });

    it('reads CART_EMPTY as the sign a lost answer hid an order', () => {
        expect(
            classifyCheckoutError({ status: 409, errors: [{ code: 'CART_EMPTY', message: 'x' }] })
        ).toEqual({ kind: 'cart-empty' });
    });

    it('reads IDEMPOTENCY_IN_FLIGHT as "the first attempt is still running"', () => {
        expect(
            classifyCheckoutError({
                status: 409,
                errors: [{ code: 'IDEMPOTENCY_IN_FLIGHT', message: 'x' }]
            })
        ).toEqual({ kind: 'in-flight' });
    });

    it('reads a bare 500 as a server error that may or may not have written the order', () => {
        expect(classifyCheckoutError({ status: 500, errors: [] })).toEqual({
            kind: 'server-error'
        });
    });

    it('does not read a 503 as a bare 500: the server did not act', () => {
        expect(classifyCheckoutError({ status: 503, errors: [] })).toEqual({ kind: 'other' });
    });

    it('falls back to "other" for a refusal with no dedicated response — a shipping method that is gone', () => {
        expect(
            classifyCheckoutError({
                status: 404,
                errors: [{ code: 'CART_SHIPPING_METHOD_NOT_FOUND', message: 'x' }]
            })
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
