/**
 * @module
 * `ProductCard.vue` — the shopper's catalogue tile. What it must get right: the price and the
 * availability read off the product, the title is the (only) link to the product page, the
 * contributed `product-actions` render on it without the products module knowing who they are, a
 * guest is told to sign in, and nothing on it is a staff control.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';
import type { Component } from 'vue';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import { SLOTS_KEY } from '@/kernel/slots';
import { useSessionStore } from '@/infrastructure/session.ts';
import ProductCard from '@/modules/products/components/ProductCard.vue';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aProduct } from '../../../../tests/support/unit/fixtures.ts';
import type { Product } from '@types';

wireModulesIntoCore();

/**
 * The real app router, so the title link resolves to the real `ProductTarget` route.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * A stand-in for a contributed button: prints the id of the product it was handed.
 */
const SlotProbe = defineComponent({
    props: { product: { type: Object, required: true } },
    setup: (props) => () => h('button', { 'data-test': 'slot-probe' }, String(props.product.id))
});

/**
 * Mounts a card for `product`, with `contributions` in the `product-actions` slot.
 */
const mountCard = (product: Product, contributions: Component[] = []) =>
    mount(ProductCard, {
        props: { product },
        global: {
            plugins: [router, vuetify, i18n],
            provide: { [SLOTS_KEY as symbol]: { 'product-actions': contributions } }
        }
    });

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en').then(() => router.push('/en/products').then(() => router.isReady()));
});

describe('ProductCard — what a shopper reads', () => {
    it('shows the price in the product’s own currency', () => {
        const wrapper = mountCard(aProduct({ price: 120, currency: 'EUR' }));

        expect(wrapper.get('[data-test=product-card-price]').text()).toMatch(/120/);
        expect(wrapper.get('[data-test=product-card-price]').text()).toMatch(/€|EUR/);
    });

    it('marks a product with nothing left as out of stock', () => {
        const wrapper = mountCard(aProduct({ available: 0 }));

        expect(wrapper.get('[data-test=product-card-availability]').text()).toBe('Out of stock');
    });

    it.each([[3], [undefined]])(
        'marks a product with %j available as in stock — an absent count is unconstrained',
        (available) => {
            const wrapper = mountCard(aProduct({ available }));

            expect(wrapper.get('[data-test=product-card-availability]').text()).toBe('In stock');
        }
    );

    it('links the title, and only the title, to the product page', () => {
        const wrapper = mountCard(aProduct({ id: 'p9', title: 'Oak stool' }));
        const link = wrapper.get('[data-test=product-card-link]');

        expect(link.text()).toBe('Oak stool');
        expect(link.attributes('href')).toBe('/en/products/p9');
        expect(wrapper.findAll('a')).toHaveLength(1);
    });

    it('carries no staff control', () => {
        const wrapper = mountCard(aProduct());

        expect(wrapper.find('[data-test=row-edit]').exists()).toBe(false);
        expect(wrapper.find('[data-test=row-delete]').exists()).toBe(false);
    });
});

describe('ProductCard — the contributed actions', () => {
    it('renders every contribution, handing each the product', () => {
        const wrapper = mountCard(aProduct({ id: 'p-slot' }), [SlotProbe]);

        expect(wrapper.get('[data-test=slot-probe]').text()).toBe('p-slot');
    });

    it('tells a guest to sign in', () => {
        expect(mountCard(aProduct()).find('[data-test=product-card-login]').exists()).toBe(true);
    });

    it('does not tell a signed-in shopper to sign in', () => {
        const session = useSessionStore();
        session.accessToken = 'test-token';
        session.viewer = { id: 'u1', email: 'shopper@example.com', role: 'customer' };

        expect(mountCard(aProduct()).find('[data-test=product-card-login]').exists()).toBe(false);
    });
});
