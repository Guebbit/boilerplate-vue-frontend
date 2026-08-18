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
    upsertCartItem,
    updateCartItemById,
    removeCartItem,
    clearCart,
    checkout as apiCheckout,
    reorder as apiReorder
} from '@api';
import { analyticsEvents } from '@/infrastructure/observability/events.ts';

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

vi.mock('@api', () => ({
    getCart: vi.fn(() => Promise.resolve({ data: CART })),
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

        it('tracks the add event with the product and quantity', () =>
            useCartStore()
                .upsertCartItem('p1', 2)
                .then(() => {
                    expect(track).toHaveBeenCalledWith(analyticsEvents.CART_ITEM_ADDED, {
                        product_id: 'p1',
                        quantity: 2
                    });
                }));
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
        it('replaces the local cart with the emptied one and tracks the removal', () => {
            const store = useCartStore();

            return store
                .fetchCart()
                .then(() => store.removeCartItem('p1'))
                .then(() => {
                    expect(removeCartItem).toHaveBeenCalledWith('p1');
                    expect(store.cartItems).toEqual([]);
                    expect(track).toHaveBeenCalledWith(analyticsEvents.CART_ITEM_REMOVED, {
                        product_id: 'p1'
                    });
                });
        });
    });

    describe('clearCart', () => {
        it('sends no body and tracks `cart_cleared` when clearing everything', () =>
            useCartStore()
                .clearCart()
                .then(() => {
                    expect(clearCart).toHaveBeenCalledWith(undefined);
                    expect(track).toHaveBeenCalledWith(analyticsEvents.CART_CLEARED);
                }));

        it('sends a productId body and tracks nothing when removing one line', () =>
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

        it('tracks the created order id and total, read from the nested envelope', () =>
            // That path is optional all the way down, so a shape change would emit an event with
            // undefined fields rather than fail.
            useCartStore()
                .checkout()
                .then(() => {
                    expect(track).toHaveBeenCalledWith(analyticsEvents.CHECKOUT_COMPLETED, {
                        order_id: 'o1',
                        total_price: 19.98
                    });
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

        it('tracks `checkout_failed` with the API error code, and still rejects', () => {
            vi.mocked(apiCheckout).mockRejectedValueOnce({
                status: 409,
                errors: [{ code: 'CART_EMPTY' }]
            });

            // The rejection has to reach the caller as well as the tracker: the view turns it into
            // the toast the user sees, so an event emitted by a swallowed error would be a failure
            // reported to analytics and to nobody else.
            return expect(useCartStore().checkout())
                .rejects.toMatchObject({ status: 409 })
                .then(() => {
                    expect(track).toHaveBeenCalledWith(analyticsEvents.CHECKOUT_FAILED, {
                        reason: 'CART_EMPTY'
                    });
                });
        });

        it('falls back to the status when the failure carries no code', () => {
            vi.mocked(apiCheckout).mockRejectedValueOnce({ status: 500, errors: [] });

            return expect(useCartStore().checkout())
                .rejects.toMatchObject({ status: 500 })
                .then(() => {
                    expect(track).toHaveBeenCalledWith(analyticsEvents.CHECKOUT_FAILED, {
                        reason: 'http_500'
                    });
                });
        });

        /**
         * The optional chaining on `response.data?.order?.id` earns its keep here and nowhere
         * else. A 200 that carries no order is not a shape this client should crash on — the
         * cart was still emptied server-side, and a `TypeError` thrown out of the analytics call
         * would turn a successful checkout into a failed promise the view reports as an error.
         *
         * Without the `?.` this test throws instead of emitting undefined fields.
         */
        it('survives a success envelope with no order in it', () => {
            vi.mocked(apiCheckout).mockResolvedValueOnce({ data: {} } as never);

            return useCartStore()
                .checkout()
                .then(() => {
                    expect(track).toHaveBeenCalledWith(analyticsEvents.CHECKOUT_COMPLETED, {
                        order_id: undefined,
                        total_price: undefined
                    });
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

        it('tracks the reorder against the order it came from', () =>
            useCartStore()
                .reorder('o1')
                .then(() => {
                    expect(track).toHaveBeenCalledWith(analyticsEvents.CART_REORDERED, {
                        order_id: 'o1'
                    });
                }));
    });

    /**
     * Pinia identifies a store by the string given to `defineStore`. Nothing else in this suite
     * would notice it changing, since every test reaches the store through `useCartStore()`.
     */
    it('is registered under the "cart" id', () => {
        expect(useCartStore().$id).toBe('cart');
    });
});
