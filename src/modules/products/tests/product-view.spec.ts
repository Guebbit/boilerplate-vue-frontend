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
import { defineComponent, h } from 'vue';
import type { Component } from 'vue';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import { SLOTS_KEY } from '@/kernel/slots';
import { useSessionStore } from '@/infrastructure/session.ts';
import Product from '@/modules/products/views/Product.vue';
import { useProductsStore } from '@/modules/products/store';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { noopWatchHandle } from '../../../../tests/support/unit/watch-handle.ts';
import type { Product as ProductType } from '@types';

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
 * A stand-in for a contributed slot component: prints the id of the product it was handed.
 */
const SlotProbe = defineComponent({
    props: { product: { type: Object, required: true } },
    setup: (props) => () => h('span', { 'data-test': 'slot-probe' }, String(props.product.id))
});

/**
 * Mounts the detail page with `product` already the store's `currentProduct` — nothing depends on
 * the route's own fetch, which is what lets a single spec cover a shape the demo dataset does not
 * happen to seed today.
 *
 * @param product - The shape under test.
 * @param contributions - What other modules would put in the `product-actions` slot.
 * @returns The mounted wrapper.
 */
const mountProduct = (product: ProductType, contributions: Component[] = []) => {
    const products = useProductsStore();
    vi.spyOn(products, 'watchProduct').mockImplementation(() => noopWatchHandle());
    products.addProduct(product);
    products.selectedProductId = product.id;

    return mount(Product, {
        props: { id: product.id },
        global: {
            plugins: [router, vuetify, i18n],
            // An `InjectionKey` is a typed symbol; the mount options want the plain one.
            provide: { [SLOTS_KEY as symbol]: { 'product-actions': contributions } }
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
    it('shows an out-of-stock product as sold out', () => {
        const wrapper = mountProduct({
            id: 'p-out-of-stock',
            title: 'Sold out widget',
            price: 9.99,
            currency: 'EUR',
            inStock: false,
            lowStock: false,
            onHand: 3,
            reserved: 3,
            available: 0
        });

        expect(wrapper.get('[data-test=product-stock]').text()).toContain('Out of stock');
    });

    it('shows the stock left for an in-stock product', () => {
        const wrapper = mountProduct({
            id: 'p-in-stock',
            title: 'Available widget',
            price: 9.99,
            currency: 'EUR',
            inStock: true,
            lowStock: false,
            onHand: 5,
            reserved: 1,
            available: 4
        });

        expect(wrapper.get('[data-test=product-stock]').text()).not.toContain('Out of stock');
        expect(wrapper.get('[data-test=product-stock]').text()).toContain('4');
    });

    // A shopper's product carries the flags only — no counters to print.
    it('shows only "In stock" to a reader without the counters', () => {
        const wrapper = mountProduct({
            id: 'p-flags-only',
            title: 'Widget',
            price: 9.99,
            currency: 'EUR',
            inStock: true,
            lowStock: false
        });

        expect(wrapper.get('[data-test=product-stock]').text()).toContain('In stock');
    });

    it('warns "Low stock" when the server raises the flag, with no number', () => {
        const wrapper = mountProduct({
            id: 'p-low',
            title: 'Widget',
            price: 9.99,
            currency: 'EUR',
            inStock: true,
            lowStock: true
        });

        expect(wrapper.get('[data-test=product-stock]').text()).toContain('Low stock');
    });
});

describe('the product-actions slot', () => {
    it('renders every contributed component, handing each the product', () => {
        const wrapper = mountProduct(
            {
                id: 'p-slot',
                title: 'Slotted widget',
                price: 1,
                currency: 'EUR',
                inStock: true,
                lowStock: false
            },
            [SlotProbe]
        );

        expect(wrapper.get('[data-test=slot-probe]').text()).toBe('p-slot');
    });

    it('renders nothing extra when no module contributes', () => {
        const wrapper = mountProduct({
            id: 'p-bare',
            title: 'Bare widget',
            price: 1,
            currency: 'EUR',
            inStock: true,
            lowStock: false
        });

        expect(wrapper.find('[data-test=slot-probe]').exists()).toBe(false);
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
            currency: 'EUR',
            inStock: true,
            lowStock: false
        });

        expect(wrapper.text()).toContain('—');
    });

    it('renders the real description when the product has one', () => {
        const wrapper = mountProduct({
            id: 'p-rich',
            title: 'Full widget',
            price: 1,
            currency: 'EUR',
            inStock: true,
            lowStock: false,
            description: 'Everything a widget could want',
            categories: ['tools']
        });

        expect(wrapper.text()).toContain('Everything a widget could want');
    });
});

/** Signs the viewer in holding exactly these abilities. */
const signInWith = (tenant: [string, string][]) => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'someone@example.com', role: 'customer' };
    session.setAbilities({ tenant, platform: [] });
};

describe('the edit button', () => {
    const widget: ProductType = {
        id: 'p-edit',
        title: 'Widget',
        price: 1,
        currency: 'EUR',
        inStock: true,
        lowStock: false
    };

    it('is hidden from a shopper, who would only meet a guard refusal', () => {
        signInWith([['read', 'Product']]);

        expect(mountProduct(widget).find('[data-test=go-to-edit]').exists()).toBe(false);
    });

    it('is hidden from a guest', () => {
        expect(mountProduct(widget).find('[data-test=go-to-edit]').exists()).toBe(false);
    });

    it('is shown to staff who may update products', () => {
        signInWith([['update', 'Product']]);

        expect(mountProduct(widget).find('[data-test=go-to-edit]').exists()).toBe(true);
    });
});
