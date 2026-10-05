/**
 * @module
 * The cart page's shipping radio shows what the cart holds, whenever the cart changes: an opening
 * read that answers after a pick does not wipe it, a stale read after a pick does not leave the old
 * cost, and a later read saying the method is gone moves the radio off it.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { getCart, setCartShippingMethod } from '@api';
import { useSessionStore, type SessionViewer } from '@/infrastructure/session.ts';
import { loadLocale } from '@/i18n';
import { asStub } from '../../../../tests/support/stub.ts';
import {
    aCart,
    gate,
    answered,
    type Answer
} from '../../../../tests/support/unit/cart-fixtures.ts';
import { mountCartPage, router } from '../../../../tests/support/unit/mount-cart-page.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@api')>()),
    getCart: vi.fn(),
    updateCartItemById: vi.fn(),
    setCartShippingMethod: vi.fn(),
    checkout: vi.fn()
}));

beforeEach(() => {
    sessionStorage.clear();
    vi.resetAllMocks();
    // A pick is answered with the cart holding it, unless a case holds the answer itself.
    vi.mocked(setCartShippingMethod).mockImplementation(({ shippingMethodId }) =>
        Promise.resolve(answered(aCart([['p1', 2]], shippingMethodId)))
    );
    setActivePinia(createPinia());
    useSessionStore().viewer = asStub<SessionViewer>({ id: 'u1', email: 'u1@example.com' });
    return loadLocale('en').then(() => router.push('/en/cart').then(() => router.isReady()));
});

/**
 * Waits until a mocked API function has been called `times` times.
 *
 * @param api - The mocked function
 * @param times - How many calls to wait for
 * @returns A promise settling once it has
 */
const calledTimes = (api: unknown, times: number) =>
    vi.waitFor(() => {
        expect(api).toHaveBeenCalledTimes(times);
    });

describe('the shipping radio when the page opens over a cart the store already holds', () => {
    /**
     * The shopper adds from the product page and opens the cart: the store already has a cart, so
     * the page renders at once, and the read it opens with is still out while they pick a method.
     */
    it('keeps the method the shopper picked when the opening read answers before the pick does', async () => {
        const opening = gate<Answer<typeof getCart>>();
        const pick = gate<Answer<typeof setCartShippingMethod>>();
        vi.mocked(getCart).mockReturnValueOnce(opening.promise);
        vi.mocked(setCartShippingMethod).mockReturnValueOnce(pick.promise);
        const page = await mountCartPage(aCart([['p1', 2]]));
        await calledTimes(getCart, 1);

        await page.pickShipping('standard', true);
        await calledTimes(setCartShippingMethod, 1);
        opening.resolve(answered(aCart([['p1', 2]], null)));
        await flushPromises();
        pick.resolve(answered(aCart([['p1', 2]], 'standard')));
        await flushPromises();

        expect(page.selectedShipping()).toBe('standard');
        expect(
            page.wrapper.get('[data-test=cart-checkout]').attributes('disabled')
        ).toBeUndefined();
    });

    it('shows the cost of the method the server holds when the opening read answers after the pick', async () => {
        const opening = gate<Answer<typeof getCart>>();
        const pick = gate<Answer<typeof setCartShippingMethod>>();
        vi.mocked(getCart).mockReturnValueOnce(opening.promise);
        vi.mocked(setCartShippingMethod).mockReturnValueOnce(pick.promise);
        const page = await mountCartPage(aCart([['p1', 2]]));
        await calledTimes(getCart, 1);

        await page.pickShipping('standard', true);
        await calledTimes(setCartShippingMethod, 1);
        pick.resolve(answered(aCart([['p1', 2]], 'standard')));
        await flushPromises();
        opening.resolve(answered(aCart([['p1', 2]], null)));
        await flushPromises();

        // 2 units at 10, plus the 5 the standard method costs.
        expect(page.wrapper.get('[data-test=cart-total]').text()).toContain('25.00');
    });

    it('follows the server when a later read says the method is gone', async () => {
        vi.mocked(getCart).mockResolvedValueOnce(answered(aCart([['p1', 2]], 'standard')));
        const page = await mountCartPage(aCart([['p1', 2]], 'standard'));
        expect(page.selectedShipping()).toBe('standard');

        // The basket outgrew the method's weight range elsewhere, and the server cleared it.
        vi.mocked(getCart).mockResolvedValueOnce(answered(aCart([['p1', 2]], null)));
        await page.cart.fetchCart();
        await flushPromises();

        expect(page.selectedShipping()).toBeUndefined();
    });
});
