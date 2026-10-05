/**
 * @module
 * Two `seedAfterSignIn()` calls in the same breath send the guest cart once: the second joins the
 * first, so the server never sees the same key twice and the shopper never gets a wrong "stays on this
 * device" warning for a merge that is working.
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

describe('a sign-in', () => {
    it('sends the guest cart once, however many times the shell asks to seed', async () => {
        const store = freshStore();
        store.addGuestItem('p1', 2);
        const merge = gate<Answer<typeof mergeCart>>();
        vi.mocked(mergeCart).mockReturnValue(merge.promise);
        vi.mocked(getCartSummary).mockResolvedValue(answered(aCart([]).summary));

        const first = store.seedAfterSignIn();
        const second = store.seedAfterSignIn();
        merge.resolve(answered({ cart: aCart([['p1', 2]]), lines: [] }));
        await Promise.allSettled([first, second]);

        expect(mergeCart).toHaveBeenCalledTimes(1);
    });
});
