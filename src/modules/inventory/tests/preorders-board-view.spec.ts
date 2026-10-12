/**
 * @module
 * The staff preorder board page: which tabs a viewer has (the products tab reads stock, the orders
 * tab only needs the page's own key), how the tab and the product filter land in and come out of the
 * URL, and the hand-off from the products tab to the orders tab. The tab bodies are stubbed.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import PreordersBoard from '../views/PreordersBoard.vue';
import { useSessionStore } from '@/infrastructure/session.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { emitOn } from '../../../../tests/support/unit/mounted-vm.ts';

wireModulesIntoCore();

/** The real route tree. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/** The two tab bodies, replaced by markers that show what they were handed. */
const STUBS = {
    PreorderProductsTable: {
        name: 'PreorderProductsTable',
        template: '<div data-test="products-body" />'
    },
    PreorderFulfillmentTable: {
        name: 'PreorderFulfillmentTable',
        props: ['productId', 'productLabel'],
        template:
            '<div data-test="orders-body" :data-product="productId" :data-label="productLabel" />'
    }
};

/**
 * Mounts the page at a URL, for a viewer with these abilities.
 *
 * @param url - Where to land.
 * @param abilities - What the viewer may do.
 */
const mountAt = (url: string, abilities: [string, string][]) => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'staff@example.com', role: 'admin' };
    session.setAbilities({ tenant: abilities, platform: [] });
    return router.push(url).then(() => {
        const wrapper = mount(PreordersBoard, {
            global: { plugins: [router, vuetify, i18n], stubs: STUBS }
        });
        return flushPromises().then(() => wrapper);
    });
};

/** A viewer who reads orders and stock. */
const BOTH: [string, string][] = [
    ['read', 'Order'],
    ['read', 'StockLevel']
];

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('PreordersBoard tabs', () => {
    it('opens on the products tab for a viewer who reads stock', () =>
        mountAt('/en/sales/preorders', BOTH).then((wrapper) => {
            expect(wrapper.findAll('[data-test^=preorders-tab-]')).toHaveLength(2);
            expect(wrapper.find('[data-test=products-body]').exists()).toBe(true);
        }));

    it('offers an orders reader without stock only the orders tab', () =>
        mountAt('/en/sales/preorders', [['read', 'Order']]).then((wrapper) => {
            expect(wrapper.find('[data-test=preorders-tab-products]').exists()).toBe(false);
            expect(wrapper.find('[data-test=products-body]').exists()).toBe(false);
            expect(wrapper.find('[data-test=orders-body]').exists()).toBe(true);
        }));

    it('lands on the tab the URL names, and records a click in it', () =>
        mountAt('/en/sales/preorders?tab=orders', BOTH).then((wrapper) => {
            expect(wrapper.find('[data-test=orders-body]').exists()).toBe(true);

            return wrapper
                .get('[data-test=preorders-tab-products]')
                .trigger('click')
                .then(flushPromises)
                .then(() => {
                    expect(router.currentRoute.value.query.tab).toBeUndefined();
                });
        }));
});

describe('PreordersBoard product filter', () => {
    it('takes the product from the URL', () =>
        mountAt('/en/sales/preorders?tab=orders&productId=p7', BOTH).then((wrapper) => {
            expect(wrapper.get('[data-test=orders-body]').attributes('data-product')).toBe('p7');
        }));

    it('moves to the orders tab on that product when the products tab asks, and writes it down', () =>
        mountAt('/en/sales/preorders', BOTH).then((wrapper) => {
            emitOn(
                wrapper.findComponent({ name: 'PreorderProductsTable' }),
                'showOrders',
                'p1',
                'Desk'
            );
            return flushPromises().then(() => {
                const body = wrapper.get('[data-test=orders-body]');

                expect(body.attributes('data-product')).toBe('p1');
                expect(body.attributes('data-label')).toBe('Desk');
                expect(router.currentRoute.value.query).toMatchObject({
                    tab: 'orders',
                    productId: 'p1'
                });
            });
        }));

    it('forgets the product when the orders tab lets it go', () =>
        mountAt('/en/sales/preorders?tab=orders&productId=p7', BOTH).then((wrapper) => {
            emitOn(wrapper.findComponent({ name: 'PreorderFulfillmentTable' }), 'clearProduct');
            return flushPromises().then(() => {
                expect(
                    wrapper.get('[data-test=orders-body]').attributes('data-product')
                ).toBeUndefined();
                expect(router.currentRoute.value.query.productId).toBeUndefined();
            });
        }));
});
