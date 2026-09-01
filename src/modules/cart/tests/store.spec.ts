/**
 * @module
 * Unit tests for the cart store.
 *
 * Unlike products/users, this store owns real state: every action replaces the local cart with
 * the payload the API returned. Two rules are worth guarding:
 *
 *   - `clearCart()` is bodyless and hits `DELETE /cart/all`, a separate URL from
 *     `removeCartItem(productId)`'s `DELETE /cart/:productId` — the two used to be one
 *     overloaded endpoint, and collapsing them back into an optional-body call would restore the
 *     failure a stripped body used to cause: silently clearing everything instead of one line.
 *   - the summary getters must survive an unfetched cart, since the header renders the item
 *     count before anything has been loaded.
 *   - checkout reports BOTH outcomes. The backend emits `checkout_completed` and `checkout_failed`
 *     from one handler and the funnel is built across the two repos, so a rejection this side
 *     swallowed would read as a user abandoning checkout rather than checkout refusing them.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useCartStore } from '@/modules/cart/store';
import {
    getCart,
    getCartSummary,
    upsertCartItem,
    updateCartItemById,
    removeCartItem,
    clearCart,
    checkout as apiCheckout,
    reorder as apiReorder
} from '@api';
const CART = {
    items: [{ productId: 'p1', quantity: 2 }],
    summary: { itemsCount: 1, totalQuantity: 2, total: 19.98 }
};

const EMPTY_CART = { items: [], summary: { itemsCount: 0, totalQuantity: 0, total: 0 } };

const ORDER = { id: 'o1', totalPrice: 19.98 };

/**
 * The reject envelope `onResponseReject` builds — never an `Error`, which is the whole point.
 */
const apiFailure = (status: number) =>
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the API's error ENVELOPE is this client's rejection contract
    Promise.reject({
        success: false,
        status,
        message: 'nope',
        errors: [{ code: 'STUB_ERROR', message: 'nope' }]
    }) as never;

vi.mock('@api', () => ({
    getCart: vi.fn(() => Promise.resolve({ data: CART })),
    getCartSummary: vi.fn(() => Promise.resolve({ data: CART.summary })),
    upsertCartItem: vi.fn(() => Promise.resolve({ data: CART })),
    updateCartItemById: vi.fn(() => Promise.resolve({ data: CART })),
    removeCartItem: vi.fn(() => Promise.resolve({ data: EMPTY_CART })),
    clearCart: vi.fn(() => Promise.resolve({ data: EMPTY_CART })),
    checkout: vi.fn(() => Promise.resolve({ data: { order: ORDER } })),
    reorder: vi.fn(() => Promise.resolve({ data: CART }))
}));

describe('useCartStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    /**
     * The header's badge, and the one read where a failure is an ordinary state: a guest has no
     * cart, so 401 empties it. Only 401 — a 500 emptied here shows a full cart as empty.
     */
    describe('fetchSummary', () => {
        it('seeds the badge from the summary endpoint', () => {
            const store = useCartStore();

            return store.fetchSummary().then(() => {
                // Units, not lines: one line of two is a badge saying 2.
                expect(store.badgeQuantity).toBe(2);
                expect(store.badgeTotal).toBe(19.98);
            });
        });

        it('reads a 401 as "no cart", leaving the badge empty', () => {
            vi.mocked(getCartSummary).mockReturnValueOnce(apiFailure(401));
            const store = useCartStore();

            return store.fetchSummary().then((summary) => {
                expect(summary).toBeUndefined();
                expect(store.badgeQuantity).toBeUndefined();
                expect(store.badgeTotal).toBeUndefined();
            });
        });

        it('lets any other failure through instead of calling it "no cart"', () => {
            vi.mocked(getCartSummary).mockReturnValueOnce(apiFailure(500));
            const store = useCartStore();

            return expect(store.fetchSummary()).rejects.toMatchObject({ status: 500 });
        });
    });

    describe('before anything is fetched', () => {
        it('exposes an empty item list and no summary', () => {
            const store = useCartStore();

            expect(store.cart).toBeUndefined();
            expect(store.cartItems).toEqual([]);
            expect(store.cartSummary).toBeUndefined();
        });
    });

    describe('fetchCart', () => {
        it('stores the payload and derives items, summary and count from it', () => {
            const store = useCartStore();

            return store.fetchCart().then(() => {
                expect(getCart).toHaveBeenCalled();
                expect(store.cartItems).toEqual(CART.items);
                expect(store.cartSummary).toEqual(CART.summary);
                expect(store.cartSummary?.itemsCount).toBe(1);
            });
        });
    });

    describe('upsertCartItem', () => {
        it('sends the product and quantity and replaces the local cart', () => {
            const store = useCartStore();

            return store.upsertCartItem('p1', 2).then(() => {
                expect(upsertCartItem).toHaveBeenCalledWith({ productId: 'p1', quantity: 2 });
                expect(store.cartItems).toEqual(CART.items);
            });
        });
    });

    describe('updateCartItem', () => {
        it('sends only the quantity, with the product in the path', () =>
            useCartStore()
                .updateCartItem('p1', 5)
                .then(() => {
                    expect(updateCartItemById).toHaveBeenCalledWith('p1', { quantity: 5 });
                }));

        /**
         * The endpoint recalculates the summary, so the response is the whole cart and not just
         * the edited line. Without this, an implementation that fired the request and threw the
         * answer away would pass both tests above while leaving the totals on screen stale.
         */
        it('replaces the local cart with the recalculated response', () => {
            const store = useCartStore();

            return store.updateCartItem('p1', 5).then((result) => {
                expect(store.cart).toEqual(CART);
                expect(store.cartSummary?.itemsCount).toBe(1);
                expect(result).toEqual(CART);
            });
        });
    });

    describe('removeCartItem', () => {
        it('replaces the local cart with the emptied one', () => {
            const store = useCartStore();

            return store
                .fetchCart()
                .then(() => store.removeCartItem('p1'))
                .then(() => {
                    expect(removeCartItem).toHaveBeenCalledWith('p1');
                    expect(store.cartItems).toEqual([]);
                });
        });
    });

    describe('clearCart', () => {
        it('takes no arguments — clearing is DELETE /cart/all, not an optional body', () =>
            useCartStore()
                .clearCart()
                .then(() => {
                    expect(clearCart).toHaveBeenCalledWith();
                }));
    });

    describe('checkout', () => {
        it('calls the endpoint with no payload when none is given', () =>
            useCartStore()
                .checkout()
                .then(() => {
                    expect(apiCheckout).toHaveBeenCalledWith(undefined);
                }));

        it('returns the checkout envelope, order included', () =>
            useCartStore()
                .checkout({ notes: 'leave at door' })
                .then((result) => {
                    expect(apiCheckout).toHaveBeenCalledWith({ notes: 'leave at door' });
                    expect(result).toEqual({ order: ORDER });
                }));

        it('empties the local cart, because the server emptied the real one', () => {
            const store = useCartStore();

            return store
                .fetchCart()
                .then(() => {
                    expect(store.cartSummary?.itemsCount).toBe(1);
                    return store.checkout();
                })
                .then(() => {
                    expect(store.cart).toBeUndefined();
                    expect(store.cartItems).toEqual([]);
                    expect(store.cartSummary).toBeUndefined();
                });
        });

        it('lets a refusal the API answered reach the caller', () => {
            // The rejection has to survive the store: the view turns it into the toast the user
            // sees, and a swallowed error is a failure reported to nobody.
            vi.mocked(apiCheckout).mockRejectedValueOnce({
                status: 409,
                errors: [{ code: 'CART_EMPTY' }]
            });

            return expect(useCartStore().checkout()).rejects.toMatchObject({ status: 409 });
        });

        it('lets a request that never arrived reach the caller too', () => {
            // No status means no response: the connection dropped, or the request never left the
            // browser. Faro's fetch instrumentation already records it, so the store adds nothing
            // and only has to keep the rejection intact.
            vi.mocked(apiCheckout).mockRejectedValueOnce(new Error('Network Error'));

            return expect(useCartStore().checkout()).rejects.toThrow('Network Error');
        });

        /**
         * A 200 carrying no order is not a shape this client should crash on: the cart was still
         * emptied server-side, so the success path must run to the end and resolve.
         */
        it('survives a success envelope with no order in it', () => {
            const store = useCartStore();
            vi.mocked(apiCheckout).mockResolvedValueOnce({ data: {} } as never);

            return store
                .fetchCart()
                .then(() => store.checkout())
                .then((result) => {
                    expect(result).toEqual({});
                    expect(store.cart).toBeUndefined();
                });
        });
    });

    /**
     * Reorder copies one of the caller's own orders back into the cart. The response is the
     * updated cart rather than the order, because products that left the catalogue are skipped
     * server-side — replacing the local copy with the answer is what makes that skip visible.
     */
    describe('reorder', () => {
        it('sends the order id and replaces the local cart with the response', () => {
            const store = useCartStore();

            return store.reorder('o1').then((result) => {
                expect(apiReorder).toHaveBeenCalledWith('o1');
                expect(store.cart).toEqual(CART);
                expect(store.cartSummary?.itemsCount).toBe(1);
                expect(result).toEqual(CART);
            });
        });
    });

    /**
     * Pinia identifies a store by the string given to `defineStore`. Nothing else in this suite
     * would notice it changing, since every test reaches the store through `useCartStore()`.
     */
    it('is registered under the "cart" id', () => {
        expect(useCartStore().$id).toBe('cart');
    });
});
