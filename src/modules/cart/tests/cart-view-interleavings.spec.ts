/**
 * @module
 * The cart page over the real store, in the orders of events that hold: the shipping radio seeded
 * from the server, a step settled before the order leaves, a lost answer retried as the same request.
 *
 * Answers crossed or arriving for another person are covered by `store-stale-answer.spec.ts` and
 * `store-late-answer.spec.ts`; the shipping radio's own cases by `cart-view-shipping-radio.spec.ts`.
 *
 * ── Split with `cart-view.spec.ts` ───────────────────────────────────────────────────────────
 * That file stubs the store's methods and owns what each refusal RENDERS. This one runs the real
 * store and owns what the page and the store do to each other.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { getCart, updateCartItemById, setCartShippingMethod, checkout as apiCheckout } from '@api';
import { useSessionStore, type SessionViewer } from '@/infrastructure/session.ts';
import { loadLocale } from '@/i18n';
import { asStub } from '../../../../tests/support/stub.ts';
import {
    aCart,
    gate,
    lostAnswer,
    answered,
    type Answer
} from '../../../../tests/support/unit/cart-fixtures.ts';
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

afterEach(() => {
    // Puts back what a case spied on (`router.push`, the products read) for the next one.
    vi.restoreAllMocks();
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

/**
 * The `Idempotency-Key` and the body of every checkout request the page sent.
 *
 * @returns One `[key, body]` pair per request, in order
 */
const sent = () =>
    vi
        .mocked(apiCheckout)
        .mock.calls.map(([body, config]) => [
            (config?.headers as Record<string, unknown> | undefined)?.['Idempotency-Key'],
            JSON.stringify(body)
        ]);

describe('the shipping radio', () => {
    it('opens on the method the server holds, which is a returning shopper’s earlier choice', async () => {
        vi.mocked(getCart).mockResolvedValue(answered(aCart([['p1', 2]], 'standard')));

        const page = await mountCartPage();

        expect(page.selectedShipping()).toBe('standard');
    });

    it('keeps a pick made after the opening read has answered, and the total carries its cost', async () => {
        vi.mocked(getCart).mockResolvedValue(answered(aCart([['p1', 2]])));
        const page = await mountCartPage(aCart([['p1', 2]]));

        await page.pickShipping('standard', true);

        expect(page.selectedShipping()).toBe('standard');
        // 2 units at 10, plus the 5 the standard method costs: the server's own total.
        expect(page.wrapper.get('[data-test=cart-total]').text()).toContain('25.00');
    });

    it('goes back to what the server holds when it refuses the pick', async () => {
        vi.mocked(getCart).mockResolvedValue(answered(aCart([['p1', 2]])));
        const page = await mountCartPage(aCart([['p1', 2]]));
        vi.mocked(setCartShippingMethod).mockRejectedValueOnce({
            status: 409,
            errors: [{ code: 'CART_SHIPPING_METHOD_WEIGHT' }]
        });

        await page.pickShipping('standard', true);

        expect(page.selectedShipping()).toBeUndefined();
    });
});

describe('a quantity step and the order that follows it', () => {
    it('is sent, and answered, before the order leaves', async () => {
        vi.mocked(getCart).mockResolvedValue(answered(aCart([['p1', 2]])));
        const page = await mountCartPage(aCart([['p1', 2]]));
        await page.pickShipping('pickup', false);
        const step = gate<Answer<typeof updateCartItemById>>();
        vi.mocked(updateCartItemById).mockReturnValueOnce(step.promise);
        vi.mocked(apiCheckout).mockResolvedValue(answered(anOrder({ id: 'o1' })));

        await page.wrapper.get('[data-test=cart-increase]').trigger('click');
        await page.wrapper.get('[data-test=cart-checkout]').trigger('click');
        await calledTimes(updateCartItemById, 1);
        // The order waits for the step's answer: nothing has been placed while it is out.
        await flushPromises();
        expect(apiCheckout).not.toHaveBeenCalled();

        step.resolve(answered(aCart([['p1', 3]])));
        await calledTimes(apiCheckout, 1);

        expect(vi.mocked(updateCartItemById).mock.calls[0]).toEqual(['p1', { quantity: 3 }]);
    });

    it('stops the order when the step did not reach the server, so it is not placed at the old quantity', async () => {
        vi.mocked(getCart).mockResolvedValue(answered(aCart([['p1', 2]])));
        const page = await mountCartPage(aCart([['p1', 2]]));
        await page.pickShipping('pickup', false);
        vi.mocked(updateCartItemById).mockRejectedValueOnce({ status: 503, errors: [] });

        await page.wrapper.get('[data-test=cart-increase]').trigger('click');
        await page.wrapper.get('[data-test=cart-checkout]').trigger('click');
        await flushPromises();

        expect(apiCheckout).not.toHaveBeenCalled();
    });
});

describe('an order whose answer was lost', () => {
    it('can be asked again, and the second request is the first one: same key, same body', async () => {
        vi.mocked(getCart).mockResolvedValue(answered(aCart([['p1', 2]])));
        const page = await mountCartPage(aCart([['p1', 2]]));
        await page.pickShipping('pickup', false);
        vi.mocked(apiCheckout).mockRejectedValueOnce(lostAnswer());
        vi.mocked(apiCheckout).mockResolvedValueOnce(answered(anOrder({ id: 'o1' })));
        const button = () => page.wrapper.get('[data-test=cart-checkout]');

        await button().trigger('click');
        await flushPromises();
        expect(button().attributes('disabled')).toBeUndefined();
        await button().trigger('click');
        await flushPromises();

        const [first, second] = sent();
        expect(second).toEqual(first);
    });

    it('ends on the order’s own page once the retry is answered, and the cart is the empty one the server holds', async () => {
        vi.mocked(getCart).mockResolvedValue(answered(aCart([['p1', 2]])));
        const page = await mountCartPage(aCart([['p1', 2]]));
        await page.pickShipping('pickup', false);
        vi.mocked(apiCheckout).mockRejectedValueOnce(lostAnswer());
        vi.mocked(apiCheckout).mockResolvedValueOnce(answered(anOrder({ id: 'o1' })));
        const push = vi.spyOn(router, 'push').mockResolvedValue(undefined);

        await page.wrapper.get('[data-test=cart-checkout]').trigger('click');
        await flushPromises();
        expect(push).not.toHaveBeenCalled();
        await page.wrapper.get('[data-test=cart-checkout]').trigger('click');
        await flushPromises();

        expect(JSON.stringify(push.mock.calls)).toContain('o1');
        expect(page.cart.cartItems).toEqual([]);
    });
});
