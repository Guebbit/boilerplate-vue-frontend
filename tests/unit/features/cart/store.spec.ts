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
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useCartStore } from '@/features/cart/store';
import { getCart, upsertCartItem, updateCartItemById, removeCartItem, clearCart } from '@api';
import { analyticsEvents } from '@/stores/observability';

const track = vi.fn();

vi.mock('@/stores/observability', () => ({
    useObservabilityStore: () => ({ track }),
    analyticsEvents: {
        CART_ITEM_ADDED: 'cart_item_added',
        CART_ITEM_REMOVED: 'cart_item_removed',
        CART_CLEARED: 'cart_cleared'
    }
}));

const CART = {
    items: [{ productId: 'p1', quantity: 2 }],
    summary: { itemsCount: 1, totalQuantity: 2, total: 19.98 }
};

const EMPTY_CART = { items: [], summary: { itemsCount: 0, totalQuantity: 0, total: 0 } };

vi.mock('@api', () => ({
    getCart: vi.fn(() => Promise.resolve({ data: CART })),
    upsertCartItem: vi.fn(() => Promise.resolve({ data: CART })),
    updateCartItemById: vi.fn(() => Promise.resolve({ data: CART })),
    removeCartItem: vi.fn(() => Promise.resolve({ data: EMPTY_CART })),
    clearCart: vi.fn(() => Promise.resolve({ data: EMPTY_CART }))
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
        it('stores the payload and derives items, summary and count from it', async () => {
            const store = useCartStore();
            await store.fetchCart();

            expect(getCart).toHaveBeenCalled();
            expect(store.cartItems).toEqual(CART.items);
            expect(store.cartSummary).toEqual(CART.summary);
            expect(store.cartCount).toBe(1);
        });
    });

    describe('upsertCartItem', () => {
        it('sends the product and quantity and replaces the local cart', async () => {
            const store = useCartStore();
            await store.upsertCartItem('p1', 2);

            expect(upsertCartItem).toHaveBeenCalledWith({ productId: 'p1', quantity: 2 });
            expect(store.cartItems).toEqual(CART.items);
        });

        it('tracks the add event with the product and quantity', async () => {
            const store = useCartStore();
            await store.upsertCartItem('p1', 2);

            expect(track).toHaveBeenCalledWith(analyticsEvents.CART_ITEM_ADDED, {
                product_id: 'p1',
                quantity: 2
            });
        });
    });

    describe('updateCartItem', () => {
        it('sends only the quantity, with the product in the path', async () => {
            const store = useCartStore();
            await store.updateCartItem('p1', 5);

            expect(updateCartItemById).toHaveBeenCalledWith('p1', { quantity: 5 });
        });

        it('emits no analytics event', async () => {
            const store = useCartStore();
            await store.updateCartItem('p1', 5);

            expect(track).not.toHaveBeenCalled();
        });
    });

    describe('removeCartItem', () => {
        it('replaces the local cart with the emptied one and tracks the removal', async () => {
            const store = useCartStore();
            await store.fetchCart();
            await store.removeCartItem('p1');

            expect(removeCartItem).toHaveBeenCalledWith('p1');
            expect(store.cartItems).toEqual([]);
            expect(track).toHaveBeenCalledWith(analyticsEvents.CART_ITEM_REMOVED, {
                product_id: 'p1'
            });
        });
    });

    describe('clearCart', () => {
        it('sends no body and tracks `cart_cleared` when clearing everything', async () => {
            const store = useCartStore();
            await store.clearCart();

            expect(clearCart).toHaveBeenCalledWith(undefined);
            expect(track).toHaveBeenCalledWith(analyticsEvents.CART_CLEARED);
        });

        it('sends a productId body and tracks nothing when removing one line', async () => {
            const store = useCartStore();
            await store.clearCart('p1');

            expect(clearCart).toHaveBeenCalledWith({ productId: 'p1' });
            expect(track).not.toHaveBeenCalled();
        });
    });
});
