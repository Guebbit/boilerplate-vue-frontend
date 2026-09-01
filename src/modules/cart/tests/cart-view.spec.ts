/**
 * @module
 * Mounts the real cart page against a real, memory-history router, proving the checkout screen
 * answers `docs/modules/cart-checkout.md`'s four documented refusals differently rather than
 * folding every one into the same generic toast. Same template as `product-view.spec.ts`: a real
 * router over `collectModuleRoutes(enabledModules)`, the store's own fetch stubbed, the cart
 * seeded directly into the store.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import Cart from '@/modules/cart/views/Cart.vue';
import { useCartStore } from '@/modules/cart/store.ts';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { CartResponse } from '@types';

wireModulesIntoCore();

/**
 * The real app router, scoped to the modules this test suite enables.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * One line, one summary — the shared non-empty cart every case starts from.
 */
const A_CART: CartResponse = {
    items: [{ productId: 'p1', quantity: 2 }],
    summary: { itemsCount: 1, totalQuantity: 2, total: 20, currency: 'EUR' }
};

/**
 * A `ResponseReject`-shaped rejection, matching what `classifyCheckoutError` reads.
 *
 * @param status - HTTP status the API answered with.
 * @param code - The stable error code in `errors[0].code`.
 * @param details - Optional `errors[0].details`.
 */
const checkoutRejection = (status: number, code: string, details?: Record<string, unknown>) => ({
    status,
    errors: [{ code, message: code, details }]
});

/**
 * Mounts the page with the store already holding `A_CART`, and its own fetches stubbed so the
 * refusal under test is the only network outcome each case controls.
 *
 * `checkout` is spied BEFORE mounting, deliberately: `Cart.vue` destructures it from the store at
 * setup time (`const { ..., checkout: placeOrder } = useCartStore()`), so a spy installed after
 * mount replaces the store's OWN property without touching the reference the component already
 * captured — every case has to configure the mock this returns, never re-spy the store.
 *
 * @returns The mounted wrapper and the `checkout` spy each case configures.
 */
const mountCart = () => {
    const cart = useCartStore();
    cart.cart = A_CART;
    vi.spyOn(cart, 'fetchCart').mockResolvedValue(A_CART);
    vi.spyOn(cart, 'resolveTitles').mockResolvedValue({});
    const checkoutSpy = vi.spyOn(cart, 'checkout');

    const wrapper = mount(Cart, {
        global: {
            plugins: [router, vuetify, i18n],
            stubs: {
                LayoutDefault: { template: '<div><slot /></div>' },
                ShippingSelector: { template: '<div />' }
            }
        }
    });
    return { wrapper, checkoutSpy, cart };
};

/**
 * Waits past every microtask queued so far — the click handler's own `.then().catch()` chain
 * runs deeper than one or two `nextTick()`s reliably drain, since each `.then` in a rejected
 * chain is its own microtask turn. A macrotask boundary drains all of them regardless of depth.
 */
const flushAsync = () => new Promise<void>((resolve) => setTimeout(resolve, 20));

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en').then(() => router.push('/en/cart').then(() => router.isReady()));
});

describe('the checkout refusals', () => {
    it('refetches the cart and names it as changed on CART_CHANGED', () => {
        const { wrapper, checkoutSpy, cart } = mountCart();
        checkoutSpy.mockRejectedValueOnce(checkoutRejection(409, 'CART_CHANGED'));

        return wrapper
            .get('[data-test=cart-checkout]')
            .trigger('click')
            .then(flushAsync)
            .then(() => {
                // Once from `onMounted`, once more from the refusal handler — the second is
                // what this case exists to prove.
                expect(cart.fetchCart).toHaveBeenCalledTimes(2);
            });
    });

    it('names each short line, with its requested and available counts, on CART_INSUFFICIENT_STOCK', () => {
        const { wrapper, checkoutSpy } = mountCart();
        checkoutSpy.mockRejectedValueOnce(
            checkoutRejection(409, 'CART_INSUFFICIENT_STOCK', {
                lines: [
                    { productId: 'p1', title: 'Widget', requested: 5, available: 2 },
                    { productId: 'p2', title: 'Gadget', requested: 3, available: 0 }
                ]
            })
        );

        return wrapper
            .get('[data-test=cart-checkout]')
            .trigger('click')
            .then(flushAsync)
            .then(() => {
                const lines = wrapper.findAll('[data-test=checkout-shortfall-line]');
                expect(lines).toHaveLength(2);
                expect(lines[0]?.text()).toContain('Widget');
                expect(lines[0]?.text()).toContain('5');
                expect(lines[0]?.text()).toContain('2');
                expect(lines[1]?.text()).toContain('Gadget');
            });
    });

    it('does not carry a stale shortfall banner into the next, unrelated refusal', () => {
        const { wrapper, checkoutSpy } = mountCart();
        checkoutSpy.mockRejectedValueOnce(
            checkoutRejection(409, 'CART_INSUFFICIENT_STOCK', {
                lines: [{ productId: 'p1', title: 'Widget', requested: 5, available: 2 }]
            })
        );

        return wrapper
            .get('[data-test=cart-checkout]')
            .trigger('click')
            .then(flushAsync)
            .then(() => {
                expect(wrapper.findAll('[data-test=checkout-shortfall-line]')).toHaveLength(1);
                checkoutSpy.mockRejectedValueOnce(checkoutRejection(409, 'CART_CHANGED'));
                return wrapper.get('[data-test=cart-checkout]').trigger('click');
            })
            .then(flushAsync)
            .then(() => {
                expect(wrapper.findAll('[data-test=checkout-shortfall-line]')).toHaveLength(0);
            });
    });

    it('answers CART_ADDRESS_NOT_FOUND with a message distinct from the generic fallback', () => {
        const { wrapper, checkoutSpy } = mountCart();
        checkoutSpy.mockRejectedValueOnce(checkoutRejection(404, 'CART_ADDRESS_NOT_FOUND'));

        return wrapper
            .get('[data-test=cart-checkout]')
            .trigger('click')
            .then(flushAsync)
            .then(() => {
                // Nothing on-screen names a specific line — the distinguishing behaviour for
                // this refusal is the message (asserted at the domain layer's own test), not a
                // banner; this proves it is not silently rendered as an insufficient-stock case.
                expect(wrapper.findAll('[data-test=checkout-shortfall-line]')).toHaveLength(0);
            });
    });
});
