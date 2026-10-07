/**
 * @module
 * What the cart page does when a lost order answer leads to a refusal that says the screen is out
 * of date: `CART_EMPTY` and `IDEMPOTENCY_IN_FLIGHT` read the cart again so the page stops offering a
 * basket the server no longer holds, an attempt still running is waited for and replayed under the
 * same key, and a bare 500 is settled by reading the cart.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { getCart, setCartShippingMethod, checkout as apiCheckout } from '@api';
import { useSessionStore, type SessionViewer } from '@/infrastructure/session.ts';
import { loadLocale } from '@/i18n';
import { asStub } from '../../../../tests/support/stub.ts';
import { IN_FLIGHT_RETRY_DELAYS_MS } from '../store.ts';
import { aCart, apiRejection, answered } from '../../../../tests/support/unit/cart-fixtures.ts';
import { anOrder } from '../../../../tests/support/unit/fixtures.ts';
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

afterEach(() => {
    vi.useRealTimers();
});

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
 * Opens the page over a basket, picks `pickup` (no address, so the button is live), and lets
 * the next read answer with what the server now holds.
 *
 * @param serverNow - The cart a read answers with after the refusal
 */
const openThenRefuse = async (serverNow: ReturnType<typeof aCart>) => {
    vi.mocked(getCart).mockResolvedValueOnce(answered(aCart([['p1', 2]])));
    const page = await mountCartPage(aCart([['p1', 2]]));
    await page.pickShipping('pickup', false);
    vi.mocked(getCart).mockResolvedValue(answered(serverNow));
    return page;
};

describe('a refusal that says the screen is out of date', () => {
    it('reads the cart again when the server says it is empty, so the page stops offering what is not there', async () => {
        // The first attempt went through, its answer was lost, and the retry is refused.
        const page = await openThenRefuse(aCart([]));
        vi.mocked(apiCheckout).mockRejectedValueOnce(apiRejection(409, 'CART_EMPTY'));

        await page.wrapper.get('[data-test=cart-checkout]').trigger('click');
        await flushPromises();

        expect(page.wrapper.findAll('[data-test=cart-item]')).toHaveLength(0);
    });

    it('waits for a first attempt that is still running, then reads the cart again when it never ends', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout'] });
        const page = await openThenRefuse(aCart([]));
        vi.mocked(apiCheckout).mockRejectedValue(apiRejection(409, 'IDEMPOTENCY_IN_FLIGHT'));

        const clicked = page.wrapper.get('[data-test=cart-checkout]').trigger('click');
        await vi.advanceTimersByTimeAsync(
            IN_FLIGHT_RETRY_DELAYS_MS.reduce((sum, ms) => sum + ms, 0)
        );
        await clicked;
        await flushPromises();

        // One try, then one more after each wait, all under the same key.
        expect(apiCheckout).toHaveBeenCalledTimes(1 + IN_FLIGHT_RETRY_DELAYS_MS.length);
        expect(page.wrapper.findAll('[data-test=cart-item]')).toHaveLength(0);
    });

    it('lands on the order once the first attempt ends and the same key replays it', async () => {
        vi.useFakeTimers({ toFake: ['setTimeout'] });
        const page = await openThenRefuse(aCart([]));
        vi.mocked(apiCheckout)
            .mockRejectedValueOnce(apiRejection(409, 'IDEMPOTENCY_IN_FLIGHT'))
            .mockResolvedValueOnce(answered(anOrder({ id: 'o1' })));

        const clicked = page.wrapper.get('[data-test=cart-checkout]').trigger('click');
        await vi.advanceTimersByTimeAsync(IN_FLIGHT_RETRY_DELAYS_MS[0] ?? 0);
        await clicked;
        await flushPromises();

        expect(apiCheckout).toHaveBeenCalledTimes(2);
        const keys = vi
            .mocked(apiCheckout)
            .mock.calls.map(
                ([, config]) =>
                    (config?.headers as Record<string, unknown> | undefined)?.['Idempotency-Key']
            );
        expect(keys[1]).toBe(keys[0]);
        await vi.waitFor(() => {
            expect(router.currentRoute.value.params.id).toBe('o1');
        });
    });

    it('goes to the orders when a bare 500 left the cart empty: the order was written', async () => {
        const page = await openThenRefuse(aCart([]));
        vi.mocked(apiCheckout).mockRejectedValueOnce(apiRejection(500, 'INTERNAL'));

        await page.wrapper.get('[data-test=cart-checkout]').trigger('click');
        await flushPromises();

        await vi.waitFor(() => {
            expect(router.currentRoute.value.name).toBe('OrdersList');
        });
    });

    it('stays on the cart when a bare 500 left it full: nothing was written, and the attempt is over', async () => {
        const page = await openThenRefuse(aCart([['p1', 2]]));
        vi.mocked(apiCheckout).mockRejectedValue(apiRejection(500, 'INTERNAL'));

        await page.wrapper.get('[data-test=cart-checkout]').trigger('click');
        await flushPromises();
        await page.wrapper.get('[data-test=cart-checkout]').trigger('click');
        await flushPromises();

        const keys = vi
            .mocked(apiCheckout)
            .mock.calls.map(
                ([, config]) =>
                    (config?.headers as Record<string, unknown> | undefined)?.['Idempotency-Key']
            );
        expect(router.currentRoute.value.name).toBe('Cart');
        // A recorded 500 is replayed for as long as the server keeps the key: the retry needs a new one.
        expect(keys[1]).not.toBe(keys[0]);
    });
});
