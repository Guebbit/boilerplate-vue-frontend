/**
 * @module
 * FA32b: the cart's own line prices — unit price × quantity, in the resolved product's currency.
 * Unlike `cart-view.spec.ts`, the products read runs for REAL here (only `@api`'s
 * `searchProducts` is mocked), since the price is exactly what that lookup resolves.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import Cart from '@/modules/cart/views/Cart.vue';
import { useCartStore } from '@/modules/cart/store.ts';
import { searchProducts } from '@api';
import * as schemas from '@api/schemas';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { contractResponse } from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';
import type { CartResponse } from '@types';

wireModulesIntoCore();

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@api')>()),
    searchProducts: vi.fn(() =>
        Promise.resolve(
            contractResponse(schemas.SearchProductsResponse, {
                items: [{ id: 'p1', title: 'Widget', price: 9.99, currency: 'GBP' }],
                meta: { totalItems: 1, page: 1, pageSize: 1, totalPages: 1 }
            })
        )
    )
}));

const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/** One line of three units — enough to tell the unit price and the line total apart. */
const CART: CartResponse = {
    items: [{ productId: 'p1', quantity: 3 }],
    summary: {
        itemsCount: 1,
        totalQuantity: 3,
        itemsTotal: 29.97,
        shippingCost: 0,
        totalPrice: 29.97,
        currency: 'GBP'
    },
    shipping: { required: false, selected: null, options: [] }
};

const mountCart = () => {
    const cart = useCartStore();
    cart.cart = CART;
    vi.spyOn(cart, 'fetchCart').mockResolvedValue(CART);

    const wrapper = mount(Cart, {
        global: {
            plugins: [router, vuetify, i18n],
            stubs: {
                LayoutDefault: { template: '<div><slot /></div>' },
                ShippingSelector: { template: '<div />' },
                AddressPicker: { template: '<div />' },
                PaymentMethodSelector: { template: '<div />' }
            }
        }
    });
    return flushPromises().then(() => wrapper);
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    return loadLocale('en').then(() => router.push('/en/cart').then(() => router.isReady()));
});

describe('a cart line price (FA32b)', () => {
    it('shows the unit price and the line total once the product resolves', () =>
        mountCart().then((wrapper) => {
            // One batched read for every line, sized to the batch (the endpoint's default page is 10).
            expect(searchProducts).toHaveBeenCalledWith({ id: ['p1'], page: 1, pageSize: 1 });
            const priceText = wrapper.get('[data-test=cart-line-price]').text();
            expect(priceText).toContain('£9.99');
            expect(priceText).toContain('£29.97');
        }));

    it('shows nothing before the product has resolved', () => {
        vi.mocked(searchProducts).mockReturnValue(new Promise(() => undefined));
        const cart = useCartStore();
        cart.cart = CART;
        vi.spyOn(cart, 'fetchCart').mockResolvedValue(CART);

        const wrapper = mount(Cart, {
            global: {
                plugins: [router, vuetify, i18n],
                stubs: {
                    LayoutDefault: { template: '<div><slot /></div>' },
                    ShippingSelector: { template: '<div />' },
                    AddressPicker: { template: '<div />' },
                    PaymentMethodSelector: { template: '<div />' }
                }
            }
        });

        return flushPromises().then(() => {
            expect(wrapper.find('[data-test=cart-line-price]').exists()).toBe(false);
        });
    });
});
