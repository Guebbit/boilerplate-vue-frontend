/**
 * @module
 * Mounts the real detail page against a real, memory-history router — every product SHAPE the API
 * can answer with, rather than the one row a fixture happens to seed.
 *
 * The router is REAL — `createMemoryHistory` over `collectModuleRoutes(enabledModules)`, the same
 * nesting `app/router/index.ts` builds — same template as `wishlist-view.spec.ts`. `watchProduct`
 * is stubbed so the store's own fetch never runs; the shape under test is seeded directly into
 * the dictionary instead, which is what lets one spec exercise every branch in milliseconds.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import Product from '@/modules/products/views/Product.vue';
import { useProductsStore } from '@/modules/products/store';
import { useCartStore } from '@/modules/cart';
import { useWishlistStore } from '@/modules/wishlist';
import { useSessionStore } from '@/infrastructure/session.ts';
import { addCartItem } from '@api';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { nextRenderTick } from '../../../../tests/support/unit/mounted-vm.ts';
import { noopWatchHandle } from '../../../../tests/support/unit/watch-handle.ts';
import type { Product as ProductType } from '@types';

/**
 * `addCartItem` alone is wrapped, real implementation and all (`vi.fn(actual.addCartItem)`
 * calls through unless a test overrides it): every other case in this file spies on the STORE's
 * own `addCartItem` action instead, which never reaches this. Only the in-flight-guard test
 * below needs a controllable, genuinely pending API call — `cart.loading` is real, TanStack-tracked
 * state now, so nothing short of an actual in-flight request can make it true.
 */
vi.mock('@api', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@api')>();
    return { ...actual, addCartItem: vi.fn(actual.addCartItem) };
});

wireModulesIntoCore();

/**
 * A cart with nothing in it — what a stubbed cart write resolves with.
 */
const EMPTY_CART = {
    items: [],
    summary: {
        itemsCount: 0,
        totalQuantity: 0,
        itemsTotal: 0,
        shippingCost: 0,
        totalPrice: 0,
        currency: 'EUR'
    },
    shipping: { required: false, selected: null, options: [] }
};

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
 * A signed-in visitor, so the add-to-cart button is present rather than hidden behind a login prompt.
 */
const signIn = () => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'shopper@example.com', role: 'customer' };
};

/**
 * Mounts the detail page with `product` already the store's `currentProduct` — nothing depends on
 * the route's own fetch, which is what lets a single spec cover a shape the demo dataset does not
 * happen to seed today.
 *
 * @param product - The shape under test.
 * @returns The mounted wrapper.
 */
const mountProduct = (product: ProductType) => {
    const products = useProductsStore();
    vi.spyOn(products, 'watchProduct').mockImplementation(() => noopWatchHandle());
    products.addProduct(product);
    products.selectedProductId = product.id;

    // Decoration on this page, not what is under test — stubbed so a signed-in mount does not
    // fire a real fetch the mocked transport has nothing to answer.
    vi.spyOn(useWishlistStore(), 'fetchWishlist').mockResolvedValue([]);

    return mount(Product, {
        props: { id: product.id },
        global: {
            plugins: [router, vuetify, i18n],
            stubs: { LayoutDefault: { template: '<div><slot /></div>' } }
        }
    });
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en').then(() =>
        router.push('/en/products/placeholder').then(() => router.isReady())
    );
});

describe('the shelf', () => {
    it('blocks buying what is out of stock', () => {
        signIn();
        const wrapper = mountProduct({
            id: 'p-out-of-stock',
            title: 'Sold out widget',
            price: 9.99,
            currency: 'EUR',
            onHand: 3,
            reserved: 3,
            available: 0
        });

        expect(wrapper.get('[data-test=add-to-cart]').attributes('disabled')).toBeDefined();
        expect(wrapper.get('[data-test=product-stock]').text()).toContain('Out of stock');
    });

    it('allows buying what is in stock', () => {
        signIn();
        const wrapper = mountProduct({
            id: 'p-in-stock',
            title: 'Available widget',
            price: 9.99,
            currency: 'EUR',
            onHand: 5,
            reserved: 1,
            available: 4
        });

        expect(wrapper.get('[data-test=add-to-cart]').attributes('disabled')).toBeUndefined();
        expect(wrapper.get('[data-test=product-stock]').text()).not.toContain('Out of stock');
    });

    // `POST /cart` is "add": the server grows a line the shopper already has, so the click sends
    // the ONE unit it means and never reads the cart to compute a total.
    it('adds one unit and leaves the arithmetic to the server (FA30)', async () => {
        signIn();
        const product = {
            id: 'p-in-stock',
            title: 'Available widget',
            price: 9.99,
            currency: 'EUR',
            onHand: 5,
            reserved: 1,
            available: 4
        };
        const cart = useCartStore();
        const fetchCartSpy = vi.spyOn(cart, 'fetchCart');
        const addSpy = vi.spyOn(cart, 'addCartItem').mockResolvedValue(EMPTY_CART);

        const wrapper = mountProduct(product);
        await wrapper.get('[data-test=add-to-cart]').trigger('click');
        await flushPromises();

        expect(addSpy).toHaveBeenCalledWith(product.id, 1);
        expect(fetchCartSpy).not.toHaveBeenCalled();
    });

    it("never lets a previous account's in-memory cart shape the quantity it sends", async () => {
        signIn();
        const product = {
            id: 'p-in-stock',
            title: 'Available widget',
            price: 9.99,
            currency: 'EUR',
            onHand: 5,
            reserved: 1,
            available: 4
        };
        const cart = useCartStore();
        // A stale line left behind by whoever used this browser tab before — a different
        // account's cart, still sitting in the store's memory because logout resets only the
        // profile store. A client that computed `existing + 1` from it would send 6.
        cart.cart = {
            ...EMPTY_CART,
            items: [{ productId: product.id, quantity: 5 }]
        };
        const addSpy = vi.spyOn(cart, 'addCartItem').mockResolvedValue(EMPTY_CART);

        const wrapper = mountProduct(product);
        await wrapper.get('[data-test=add-to-cart]').trigger('click');
        await flushPromises();

        expect(addSpy).toHaveBeenCalledWith(product.id, 1);
    });

    it('disables add-to-cart while a cart write is already in flight (FA39)', async () => {
        signIn();
        const wrapper = mountProduct({
            id: 'p-in-stock',
            title: 'Available widget',
            price: 9.99,
            currency: 'EUR',
            onHand: 5,
            reserved: 1,
            available: 4
        });

        expect(wrapper.get('[data-test=add-to-cart]').attributes('disabled')).toBeUndefined();

        // A genuinely pending API call — the cart store's own `loading` is real, TanStack-tracked
        // state now, so nothing short of an actual in-flight `addCartItem` request moves it. A
        // double-click while the first is still out must not fire a second.
        let release: ((error: Error) => void) | undefined;
        const gate = new Promise<never>((_resolve, reject) => {
            release = reject;
        });
        vi.mocked(addCartItem).mockReturnValueOnce(gate);

        await wrapper.get('[data-test=add-to-cart]').trigger('click');
        await flushPromises();
        await nextRenderTick(wrapper);

        expect(wrapper.get('[data-test=add-to-cart]').attributes('disabled')).toBeDefined();

        release?.(new Error('network down'));
        await flushPromises();
    });
});

describe('a barebones product', () => {
    /*
     * The shape `POST /products` answers with when only the required fields are sent — no
     * description, no categories, no tags. The e2e suite's `ProductRole` had a `minimal` value
     * for this shape with no caller anywhere; asserting it here instead of over a browser and a
     * database is what removed the last reason to keep it.
     */
    it('renders the detail page without a description, falling back to the empty-value glyph', () => {
        const wrapper = mountProduct({
            id: 'p-minimal',
            title: 'Bare widget',
            price: 1,
            currency: 'EUR'
        });

        expect(wrapper.find('[data-test=add-to-cart]').exists()).toBe(true);
        expect(wrapper.text()).toContain('—');
    });

    it('renders the real description when the product has one', () => {
        const wrapper = mountProduct({
            id: 'p-rich',
            title: 'Full widget',
            price: 1,
            currency: 'EUR',
            description: 'Everything a widget could want',
            categories: ['tools']
        });

        expect(wrapper.text()).toContain('Everything a widget could want');
    });
});
