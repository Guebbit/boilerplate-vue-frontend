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
    checkout as apiCheckout
} from '@api';
import { analyticsEvents } from '@/infrastructure/observability';

const track = vi.fn();

vi.mock('@/infrastructure/observability', () => ({
    useObservabilityStore: () => ({ track }),
    analyticsEvents: {
        CART_ITEM_ADDED: 'cart_item_added',
        CART_ITEM_REMOVED: 'cart_item_removed',
        CART_CLEARED: 'cart_cleared',
        CHECKOUT_COMPLETED: 'checkout_completed',
        CHECKOUT_FAILED: 'checkout_failed'
    }
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
    checkout: vi.fn(() => Promise.resolve({ data: { order: ORDER } }))
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
    });
});
