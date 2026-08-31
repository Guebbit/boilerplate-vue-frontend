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
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import Product from '@/modules/products/views/Product.vue';
import { useProductsStore } from '@/modules/products/store';
import { useWishlistStore } from '@/modules/wishlist';
import { useSessionStore } from '@/infrastructure/session.ts';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { Product as ProductType } from '@types';

wireModulesIntoCore();

/**
 * Satisfies `watchProduct`'s `WatchStopHandle` return type without setting up a real watcher.
 */
const noopStopHandle = () => undefined;

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
    session.viewer = { id: 'u1', email: 'shopper@example.com', admin: false };
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
    vi.spyOn(products, 'watchProduct').mockImplementation(() => noopStopHandle);
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
            onHand: 5,
            reserved: 1,
            available: 4
        });

        expect(wrapper.get('[data-test=add-to-cart]').attributes('disabled')).toBeUndefined();
        expect(wrapper.get('[data-test=product-stock]').text()).not.toContain('Out of stock');
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
            price: 1
        });

        expect(wrapper.find('[data-test=add-to-cart]').exists()).toBe(true);
        expect(wrapper.text()).toContain('—');
    });

    it('renders the real description when the product has one', () => {
        const wrapper = mountProduct({
            id: 'p-rich',
            title: 'Full widget',
            price: 1,
            description: 'Everything a widget could want',
            categories: ['tools']
        });

        expect(wrapper.text()).toContain('Everything a widget could want');
    });
});
