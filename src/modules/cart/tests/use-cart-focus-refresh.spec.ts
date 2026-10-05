/**
 * @module
 * The cart page's refresh on return: a window focus or a tab becoming visible reads the cart once,
 * a tab going hidden reads nothing, a write in flight is not read over, and nothing is left
 * listening once the page is gone.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { effectScope } from 'vue';
import type { EffectScope } from 'vue';
import { useCartFocusRefresh } from '@/modules/cart/composables/use-cart-focus-refresh';
import { useCartStore } from '@/modules/cart/store';
import { getCart } from '@api';
import { aCart, answered } from '../../../../tests/support/unit/cart-fixtures.ts';
import { ACTIONS, issue } from '../../../../tests/support/unit/cart-interleave.ts';
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
 * The scope standing in for the cart page's setup, stopped after each case.
 */
let scope: EffectScope | undefined;

/**
 * Opens the "cart page".
 *
 * @returns The cart store the refresh drives
 */
const openPage = () => {
    const store = useCartStore();
    scope = effectScope();
    scope.run(useCartFocusRefresh);
    return store;
};

/**
 * Sets what the tab reports for `document.visibilityState` and fires the event, as the browser does.
 *
 * @param state - The new visibility
 */
const setVisibility = (state: 'visible' | 'hidden') => {
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state);
    document.dispatchEvent(new Event('visibilitychange'));
};

beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
    vi.resetAllMocks();
    vi.mocked(getCart).mockResolvedValue(answered(aCart([['p1', 2]])));
});

afterEach(() => {
    scope?.stop();
    scope = undefined;
    vi.restoreAllMocks();
});

describe('coming back to the cart page', () => {
    it('reads the cart when the window gets focus', async () => {
        const store = openPage();

        globalThis.dispatchEvent(new Event('focus'));
        await vi.waitFor(() => {
            expect(store.cartItems).toHaveLength(1);
        });

        expect(getCart).toHaveBeenCalledTimes(1);
    });

    it('reads the cart when the tab becomes visible', async () => {
        const store = openPage();

        setVisibility('visible');
        await vi.waitFor(() => {
            expect(store.cartItems).toHaveLength(1);
        });

        expect(getCart).toHaveBeenCalledTimes(1);
    });

    it('reads nothing when the tab goes hidden', () => {
        openPage();

        setVisibility('hidden');

        expect(getCart).not.toHaveBeenCalled();
    });

    it('does not read over a write in flight', async () => {
        const store = openPage();
        const step = await issue(store, ACTIONS.update);
        vi.mocked(getCart).mockClear();

        globalThis.dispatchEvent(new Event('focus'));
        step.answer(aCart([['p1', 5]]));
        await step.settled;

        expect(getCart).not.toHaveBeenCalled();
        expect(store.cartItems[0]?.quantity).toBe(5);
    });

    it('leaves nothing listening once the page is gone', () => {
        openPage();
        scope?.stop();

        globalThis.dispatchEvent(new Event('focus'));
        setVisibility('visible');

        expect(getCart).not.toHaveBeenCalled();
    });
});
