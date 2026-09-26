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
import { useCoreStore } from '@guebbit/vue-toolkit';
import Product from '@/modules/products/views/Product.vue';
import { useProductsStore } from '@/modules/products/store';
import { useCartStore } from '@/modules/cart';
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

    it('adds to cart by incrementing a line already there, not resetting it to 1 (FA30)', async () => {
        signIn();
        const product = {
            id: 'p-in-stock',
            title: 'Available widget',
            price: 9.99,
            onHand: 5,
            reserved: 1,
            available: 4
        };
        const cart = useCartStore();
        const fetchedCart = {
            items: [{ productId: product.id, quantity: 3 }],
            summary: { itemsCount: 1, totalQuantity: 3, total: 29.97 }
        };
        // `POST /cart` SETS a line's quantity — the fresh fetch answers 3 already on this line, so
        // the click must send 4, never a bare 1.
        const fetchCartSpy = vi.spyOn(cart, 'fetchCart').mockImplementation(() => {
            cart.cart = fetchedCart;
            return Promise.resolve(fetchedCart);
        });
        const upsertSpy = vi.spyOn(cart, 'upsertCartItem').mockResolvedValue(fetchedCart);

        const wrapper = mountProduct(product);
        await wrapper.get('[data-test=add-to-cart]').trigger('click');
        await flushPromises();

        expect(fetchCartSpy).toHaveBeenCalled();
        expect(upsertSpy).toHaveBeenCalledWith(product.id, 4);
    });

    it('reads the cart fresh rather than trusting a previous account\'s in-memory copy (PL-62)', async () => {
        signIn();
        const product = {
            id: 'p-in-stock',
            title: 'Available widget',
            price: 9.99,
            onHand: 5,
            reserved: 1,
            available: 4
        };
        const cart = useCartStore();
        // A stale line left behind by whoever used this browser tab before — a different
        // account's cart, still sitting in the store's memory because logout resets only the
        // profile store. If the click trusted this, it would send 6 (5 + 1) into the NEW
        // account's cart instead of the fresh answer's 1 (0 + 1).
        cart.cart = {
            items: [{ productId: product.id, quantity: 5 }],
            summary: { itemsCount: 1, totalQuantity: 5, total: 49.95 }
        };
        const freshCart = { items: [], summary: { itemsCount: 0, totalQuantity: 0, total: 0 } };
        vi.spyOn(cart, 'fetchCart').mockImplementation(() => {
            cart.cart = freshCart;
            return Promise.resolve(freshCart);
        });
        const upsertSpy = vi.spyOn(cart, 'upsertCartItem').mockResolvedValue(freshCart);

        const wrapper = mountProduct(product);
        await wrapper.get('[data-test=add-to-cart]').trigger('click');
        await flushPromises();

        expect(upsertSpy).toHaveBeenCalledWith(product.id, 1);
    });

    it('disables add-to-cart while a cart write is already in flight (FA39)', async () => {
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

        // The cart store's own `loading` — the flag `upsertCartItem` runs under — not a local
        // one, so a double-click while the first request is still out cannot fire a second.
        useCoreStore().setLoading('cart', true);
        await wrapper.vm.$nextTick();

        expect(wrapper.get('[data-test=add-to-cart]').attributes('disabled')).toBeDefined();
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
