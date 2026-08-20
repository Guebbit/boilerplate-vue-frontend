/**
 * Unit tests for the cart store.
 *
 * Unlike products/users, this store owns real state: every action replaces the local cart with
 * the payload the API returned, and three of them emit analytics. Two rules are worth guarding:
 *
 *   - `clearCart(productId)` and `clearCart()` are the *same* endpoint with and without a body,
 *     and only the bodyless call is a "cart cleared" event. Getting that wrong pollutes analytics
 *     in a way no type checks and no e2e assertion would notice.
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
import { analyticsEvents } from '@/infrastructure/observability/analytics-events.ts';

const track = vi.fn();

vi.mock('@/infrastructure/stores/observability.ts', () => ({
    useObservabilityStore: () => ({ track })
}));

const CART = {
    items: [{ productId: 'p1', quantity: 2 }],
    summary: { itemsCount: 1, totalQuantity: 2, total: 19.98 }
};

const EMPTY_CART = { items: [], summary: { itemsCount: 0, totalQuantity: 0, total: 0 } };

const ORDER = { id: 'o1', totalPrice: 19.98 };

/** The reject envelope `onResponseReject` builds — never an `Error`, which is the whole point. */
const apiFailure = (status: number) =>
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the API's error ENVELOPE is this client's rejection contract
    Promise.reject({ success: false, status, message: 'nope', errors: ['nope'] }) as never;

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
                expect(store.badgeQuantity).toBe(1);
            });
        });

        it('reads a 401 as "no cart", leaving the badge empty', () => {
            vi.mocked(getCartSummary).mockReturnValueOnce(apiFailure(401));
            const store = useCartStore();

            return store.fetchSummary().then((summary) => {
                expect(summary).toBeUndefined();
                expect(store.badgeQuantity).toBeUndefined();
            });
        });

        it('lets any other failure through instead of calling it "no cart"', () => {
            vi.mocked(getCartSummary).mockReturnValueOnce(apiFailure(500));
            const store = useCartStore();

            return expect(store.fetchSummary()).rejects.toMatchObject({ status: 500 });
        });
    });

    describe('before anything is fetched', () => {
        it('exposes an empty item list and a zero count', () => {
            const store = useCartStore();

            expect(store.cart).toBeUndefined();
            expect(store.cartItems).toEqual([]);
            expect(store.cartSummary).toBeUndefined();
            expect(store.cartCount).toBe(0);
        });
    });

    describe('fetchCart', () => {
        it('stores the payload and derives items, summary and count from it', () => {
            const store = useCartStore();

            return store.fetchCart().then(() => {
                expect(getCart).toHaveBeenCalled();
                expect(store.cartItems).toEqual(CART.items);
                expect(store.cartSummary).toEqual(CART.summary);
                expect(store.cartCount).toBe(1);
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

        it('emits no analytics event', () =>
            useCartStore()
                .updateCartItem('p1', 5)
                .then(() => {
                    expect(track).not.toHaveBeenCalled();
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
                expect(store.cartCount).toBe(1);
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
                    expect(track).not.toHaveBeenCalled();
                });
        });
    });

    describe('clearCart', () => {
        it('sends no body when clearing everything', () =>
            useCartStore()
                .clearCart()
                .then(() => {
                    expect(clearCart).toHaveBeenCalledWith(undefined);
                    expect(track).not.toHaveBeenCalled();
                }));

        it('sends a productId body when removing one line', () =>
            useCartStore()
                .clearCart('p1')
                .then(() => {
                    expect(clearCart).toHaveBeenCalledWith({ productId: 'p1' });
                    expect(track).not.toHaveBeenCalled();
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
                    expect(store.cartCount).toBe(1);
                    return store.checkout();
                })
                .then(() => {
                    expect(store.cart).toBeUndefined();
                    expect(store.cartItems).toEqual([]);
                    expect(store.cartCount).toBe(0);
                });
        });

        it('reports nothing when the API answered, and still rejects', () => {
            // The backend emitted `checkout_failed` from the handler that made this decision and
            // knows why. Reporting it here as well would write one refusal into Umami as two rows
            // nothing can tell apart — the double count this split exists to prevent.
            //
            // The rejection still has to reach the caller: the view turns it into the toast the
            // user sees, and a swallowed error is a failure reported to nobody.
            vi.mocked(apiCheckout).mockRejectedValueOnce({
                status: 409,
                errors: [{ code: 'CART_EMPTY' }]
            });

            return expect(useCartStore().checkout())
                .rejects.toMatchObject({ status: 409 })
                .then(() => {
                    expect(track).not.toHaveBeenCalled();
                });
        });

        it('reports a status-less rejection as a request that never arrived', () => {
            // No status means no response: the connection dropped, or the request never left the
            // browser. The server cannot know this happened, so it is the one checkout failure
            // this side owns.
            vi.mocked(apiCheckout).mockRejectedValueOnce(new Error('Network Error'));

            return expect(useCartStore().checkout())
                .rejects.toThrow('Network Error')
                .then(() => {
                    expect(track).toHaveBeenCalledWith(analyticsEvents.CHECKOUT_REQUEST_FAILED);
                });
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
                expect(store.cartCount).toBe(1);
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
