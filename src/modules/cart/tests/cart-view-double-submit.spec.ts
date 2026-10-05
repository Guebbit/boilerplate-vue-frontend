/**
 * @module
 * While "Place order" is out, the page is shut: the steppers are disabled, a step inside its
 * debounce window never fires after the order, and two presses in one task send one checkout.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { getCart, updateCartItemById, setCartShippingMethod, checkout as apiCheckout } from '@api';
import { useSessionStore, type SessionViewer } from '@/infrastructure/session.ts';
import { loadLocale } from '@/i18n';
import { asStub } from '../../../../tests/support/stub.ts';
import {
    aCart,
    gate,
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
 * Opens the page, makes the button live, and holds the checkout request.
 *
 * @returns The page, and the way to answer the checkout
 */
const placingAnOrder = async () => {
    vi.mocked(getCart).mockResolvedValue(answered(aCart([['p1', 2]])));
    const page = await mountCartPage(aCart([['p1', 2]]));
    await page.pickShipping('pickup', false);
    const order = gate<Answer<typeof apiCheckout>>();
    vi.mocked(apiCheckout).mockReturnValueOnce(order.promise);
    return { page, order };
};

describe('while an order is being placed', () => {
    it('does not let the shopper step a quantity the order was already made from', async () => {
        const { page } = await placingAnOrder();

        await page.wrapper.get('[data-test=cart-checkout]').trigger('click');
        await calledTimes(apiCheckout, 1);
        await flushPromises();

        expect(page.wrapper.get('[data-test=cart-increase]').attributes('disabled')).toBeDefined();
        expect(page.wrapper.get('[data-test=cart-decrease]').attributes('disabled')).toBeDefined();
    });

    it('sends nothing that changes the cart once the order exists, even for a step taken a moment before it', async () => {
        const { page, order } = await placingAnOrder();
        await page.wrapper.get('[data-test=cart-checkout]').trigger('click');
        await calledTimes(apiCheckout, 1);

        // A step inside its debounce window while the request is out.
        await page.wrapper.get('[data-test=cart-increase]').trigger('click');
        order.resolve(answered(anOrder({ id: 'o1' })));
        await flushPromises();
        // The router leaves the page for the order's own: the page is unmounted, which flushes.
        page.wrapper.unmount();
        await flushPromises();

        expect(updateCartItemById).not.toHaveBeenCalled();
    });

    it('sends one checkout for two clicks made before the page could re-render', async () => {
        const { page } = await placingAnOrder();
        const button = page.wrapper.get('[data-test=cart-checkout]');

        // Both dispatched in the same task: no re-render, so no `disabled`, in between.
        await Promise.all([button.trigger('click'), button.trigger('click')]);
        await flushPromises();

        expect(apiCheckout).toHaveBeenCalledTimes(1);
    });
});
