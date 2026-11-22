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
import { useAnalyticsConsentStore } from '@/infrastructure/analytics-consent.ts';
import Product from '../views/ProductTarget.vue';
import { useProductsStore } from '../store';
import { clearAvailability, recordAvailability, recordStockCount } from '@/kernel/availability.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { noopWatchHandle } from '../../../../tests/support/unit/watch-handle.ts';
import type { Product as ProductType, ProductAvailability } from '@types';
import { NO_PRODUCT_ACTIONS, aProduct } from '../../../../tests/support/unit/fixtures.ts';

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
 * happen to seed today. The availability is what `inventory`'s watcher would already have read into
 * the kernel port: no module contributes the watcher here, so nothing is fetched.
 *
 * @param product - The shape under test.
 * @param contributions - What other modules would put in the `product-actions` slot.
 * @param availability - What the availability read answered; in stock unless a case says otherwise,
 *  `null` for a read that has not landed.
 * @returns The mounted wrapper.
 */
const mountProduct = (
    product: ProductType,
    contributions: Component[] = [],
    availability: Partial<ProductAvailability> | null = {}
) => {
    if (availability)
        recordAvailability(
            product.id,
            { productId: product.id, availability: 'in_stock', ...availability },
            0
        );
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
    clearAvailability();
    setActivePinia(createPinia());
    return loadLocale('en').then(() =>
        router.push('/en/products/placeholder').then(() => router.isReady())
    );
});

describe('the shelf', () => {
    it('shows an out-of-stock product as sold out', () => {
        const wrapper = mountProduct(
            {
                id: 'p-out-of-stock',
                title: 'Sold out widget',
                price: '9.99',
                currency: 'EUR',
                actions: NO_PRODUCT_ACTIONS
            },
            [],
            { availability: 'out_of_stock' }
        );

        expect(wrapper.get('[data-test=product-stock]').text()).toContain('Out of stock');
    });

    it('tells the shopper a made-to-order product has no right of withdrawal', () => {
        const wrapper = mountProduct({
            id: 'p-bespoke',
            title: 'Engraved bowl',
            price: '19.99',
            currency: 'EUR',
            actions: NO_PRODUCT_ACTIONS,
            noWithdrawal: true
        });

        expect(wrapper.get('[data-test=product-no-withdrawal]').text()).toContain(
            'no right of withdrawal'
        );
    });

    it('says nothing about withdrawal on an ordinary product', () => {
        const wrapper = mountProduct({
            id: 'p-plain',
            title: 'Plain bowl',
            price: '9.99',
            currency: 'EUR',
            actions: NO_PRODUCT_ACTIONS
        });

        expect(wrapper.find('[data-test=product-no-withdrawal]').exists()).toBe(false);
    });

    it('shows the shelf count beside the signal to a stock reader, as the watcher recorded it', () => {
        recordStockCount('p-in-stock', 4);
        const wrapper = mountProduct({
            id: 'p-in-stock',
            title: 'Available widget',
            price: '9.99',
            currency: 'EUR',
            actions: NO_PRODUCT_ACTIONS
        });

        expect(wrapper.get('[data-test=product-stock]').text()).toContain('4');
    });

    // A shopper has no count recorded: the signal alone.
    it('shows only "In stock" when no shelf count was recorded', () => {
        const wrapper = mountProduct({
            id: 'p-flags-only',
            title: 'Widget',
            price: '9.99',
            currency: 'EUR',
            actions: NO_PRODUCT_ACTIONS
        });

        expect(wrapper.get('[data-test=product-stock]').text()).toContain('In stock');
    });

    it('names the release date of a preorder, from the availability', () => {
        const wrapper = mountProduct(aProduct({ id: 'p-pre' }), [], {
            availability: 'preorder',
            availabilityDate: '2027-03-15'
        });

        expect(wrapper.get('[data-test=product-stock]').text()).toMatch(/2027/);
    });

    it('reads the empty-value glyph until the availability is known', () => {
        const wrapper = mountProduct(aProduct({ id: 'p-unknown' }), [], null);

        expect(wrapper.get('[data-test=product-stock]').text()).toContain('—');
        expect(wrapper.get('[data-test=product-stock]').text()).not.toContain('In stock');
    });
});

/** What the stand-in watcher renders: nothing. */
const renderNothing = () => h('span');

describe('the availability-watch slot', () => {
    /** Records the props the page hands the contributed watcher. */
    const seen: { productIds: readonly string[]; staleTime: number; withStockCount: boolean }[] =
        [];

    /** A stand-in for `inventory`'s watcher: renders nothing and notes what it was given. */
    const WatchProbe = defineComponent({
        props: {
            productIds: { type: Array, required: true },
            staleTime: { type: Number, required: true },
            withStockCount: { type: Boolean, default: false }
        },
        setup: (props) => {
            seen.push({
                productIds: props.productIds as string[],
                staleTime: props.staleTime,
                withStockCount: props.withStockCount
            });
            return renderNothing;
        }
    });

    it('hands the contributed watcher this page’s product, no age allowed, and asks for the shelf count', () => {
        seen.length = 0;
        const product = aProduct({ id: 'p-watched' });
        const products = useProductsStore();
        vi.spyOn(products, 'watchProduct').mockImplementation(() => noopWatchHandle());
        products.addProduct(product);
        products.selectedProductId = product.id;

        mount(Product, {
            props: { id: product.id },
            global: {
                plugins: [router, vuetify, i18n],
                provide: {
                    [SLOTS_KEY as symbol]: { 'availability-watch': [WatchProbe] }
                }
            }
        });

        expect(seen).toEqual([{ productIds: ['p-watched'], staleTime: 0, withStockCount: true }]);
    });
});

describe('the product-actions slot', () => {
    it('renders every contributed component, handing each the product', () => {
        const wrapper = mountProduct(
            {
                id: 'p-slot',
                title: 'Slotted widget',
                price: '1.00',
                currency: 'EUR',
                actions: NO_PRODUCT_ACTIONS
            },
            [SlotProbe]
        );

        expect(wrapper.get('[data-test=slot-probe]').text()).toBe('p-slot');
    });

    it('renders nothing extra when no module contributes', () => {
        const wrapper = mountProduct({
            id: 'p-bare',
            title: 'Bare widget',
            price: '1.00',
            currency: 'EUR',
            actions: NO_PRODUCT_ACTIONS
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
            price: '1.00',
            currency: 'EUR',
            actions: NO_PRODUCT_ACTIONS
        });

        expect(wrapper.text()).toContain('—');
    });

    it('renders the real description when the product has one', () => {
        const wrapper = mountProduct({
            id: 'p-rich',
            title: 'Full widget',
            price: '1.00',
            currency: 'EUR',
            actions: NO_PRODUCT_ACTIONS,
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
        price: '1.00',
        currency: 'EUR',
        actions: { update: false, delete: false, restore: false, hardDelete: false }
    };

    it('is hidden from a shopper, who would only meet a guard refusal', () => {
        signInWith([['read', 'Product']]);

        expect(mountProduct(widget).find('[data-test=go-to-edit]').exists()).toBe(false);
    });

    /**
     * Holding `update:Product` is not enough: a write also needs `update:Translation`, which the
     * server folds into the flag.
     */
    it('follows the flag, not the key', () => {
        signInWith([['update', 'Product']]);

        expect(mountProduct(widget).find('[data-test=go-to-edit]').exists()).toBe(false);
    });

    it('is hidden from a guest', () => {
        expect(mountProduct(widget).find('[data-test=go-to-edit]').exists()).toBe(false);
    });

    it('is shown to staff whose flag says they may update', () => {
        signInWith([['update', 'Product']]);
        const editable = { ...widget, actions: { ...widget.actions, update: true } };

        expect(mountProduct(editable).find('[data-test=go-to-edit]').exists()).toBe(true);
    });
});

describe('the page view', () => {
    it('is reported to the analytics relay once, with the product opened', () => {
        const trackBrowsing = vi.spyOn(useAnalyticsConsentStore(), 'trackBrowsing');

        mountProduct({
            id: 'p-viewed',
            title: 'Viewed widget',
            price: '9.99',
            currency: 'EUR',
            actions: NO_PRODUCT_ACTIONS
        });

        expect(trackBrowsing).toHaveBeenCalledExactlyOnceWith({
            event: 'product_viewed',
            productId: 'p-viewed'
        });
    });
});

/**
 * A staff caller, holding `read:AuditLog` or not.
 *
 * @param canReadAuditLog - Whether to hold the ability.
 */
const signInAsStaff = (canReadAuditLog: boolean) => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'operator1', email: 'operator@example.com', role: 'admin' };
    session.setAbilities({
        tenant: canReadAuditLog ? [['read', 'AuditLog']] : [],
        platform: []
    });
};

/**
 * A bare product to show the page for.
 */
const aShelfProduct = (): ProductType => ({
    id: 'p1',
    title: 'Widget',
    price: '9.99',
    currency: 'EUR',
    actions: NO_PRODUCT_ACTIONS
});

describe('the "History" link', () => {
    it('links to the audit log filtered on the product, for a caller who may read it', () => {
        signInAsStaff(true);

        const wrapper = mountProduct(aShelfProduct());

        expect(wrapper.get('[data-test=product-history]').attributes('href')).toBe(
            '/en/audit?target=p1'
        );
    });

    it('is absent for a caller without read:AuditLog', () => {
        signInAsStaff(false);

        const wrapper = mountProduct(aShelfProduct());

        expect(wrapper.find('[data-test=product-history]').exists()).toBe(false);
    });
});
