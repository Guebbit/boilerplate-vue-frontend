/**
 * @module
 * An answer for person A that lands after B (or nobody) is on the tab. The store's per-person reset
 * is a barrier for every request already out: A's cart, A's badge and A's merge report never appear
 * for B.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { getCartSummary, mergeCart } from '@api';
import {
    aCart,
    gate,
    answered,
    type Answer
} from '../../../../tests/support/unit/cart-fixtures.ts';
import { ACTIONS, issue, signInAs } from '../../../../tests/support/unit/cart-interleave.ts';
import { trackStores } from '../../../../tests/support/unit/track-stores.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

vi.mock('@api', () => ({
    getCart: vi.fn(),
    getCartSummary: vi.fn(),
    addCartItem: vi.fn(),
    updateCartItemById: vi.fn(),
    removeCartItem: vi.fn(),
    clearCart: vi.fn(),
    mergeCart: vi.fn(),
    setCartShippingMethod: vi.fn(),
    checkout: vi.fn(),
    reorder: vi.fn()
}));

/**
 * A fresh store, tracked so `afterEach` can dispose it.
 */
const { fresh: freshStore, disposeAll } = trackStores();

beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.resetAllMocks();
});

afterEach(() => {
    disposeAll();
});

describe('answers that arrive after the person they were for is gone', () => {
    /**
     * Each row starts a request as person `a`, lets the tab pass to `b` (or to nobody), then
     * delivers the answer. The cart, the badge and the merge report are `a`'s, and `b` must meet none
     * of them.
     */
    it.each([
        ['the cart read', 'read'],
        ['a quantity step', 'update'],
        ['an add to cart', 'add'],
        ['a shipping pick', 'shipping']
    ] as const)('never shows a late %s to the next person', async (_name, actionName) => {
        await signInAs('a');
        const store = freshStore();
        const request = await issue(store, ACTIONS[actionName]);

        await signInAs('b');
        request.answer(aCart([['secret-of-a', 3]]));
        await request.settled;

        expect(store.cart).toBeUndefined();
        expect(store.badgeQuantity).toBeUndefined();
    });

    it('never shows a late cart read to nobody, after a logout', async () => {
        await signInAs('a');
        const store = freshStore();
        const request = await issue(store, ACTIONS.read);

        await signInAs();
        request.answer(aCart([['secret-of-a', 3]]));
        await request.settled;

        expect(store.cart).toBeUndefined();
    });

    it('never shows a late badge read to the next person', async () => {
        await signInAs('a');
        const store = freshStore();
        const summary = gate<Answer<typeof getCartSummary>>();
        vi.mocked(getCartSummary).mockReturnValueOnce(summary.promise);
        const reading = store.fetchSummary().catch(() => undefined);

        await signInAs('b');
        summary.resolve(answered(aCart([['secret-of-a', 3]]).summary));
        await reading;

        expect(store.badgeQuantity).toBeUndefined();
    });

    it('never gives the next person the previous one’s merge report or cart', async () => {
        await signInAs('a');
        const store = freshStore();
        store.addGuestItem('p1', 2);
        const merge = gate<Answer<typeof mergeCart>>();
        vi.mocked(mergeCart).mockReturnValueOnce(merge.promise);
        const merging = store.mergeGuestCart().catch(() => undefined);
        await vi.waitFor(() => {
            expect(mergeCart).toHaveBeenCalledTimes(1);
        });

        await signInAs('b');
        merge.resolve(
            answered({
                cart: aCart([['p1', 5]]),
                lines: [
                    {
                        productId: 'p1',
                        requested: 2,
                        resulting: 5,
                        reason: 'summed',
                        insufficientStock: false
                    }
                ]
            })
        );
        await merging;

        expect(store.cart).toBeUndefined();
        expect(store.mergeReport).toEqual([]);
    });
});
