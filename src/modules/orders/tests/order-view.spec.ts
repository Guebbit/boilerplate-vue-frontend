/**
 * @module
 * Mounts the real order detail page against a real, memory-history router — same template as
 * `products/tests/product-view.spec.ts`. Scoped to one thing: each line's picture comes from
 * `item.current`, resolved live against the catalogue, never a frozen `item.product.imageUrl` —
 * see SECURITY_HOLES_7_STORAGE_QUOTA (decision 2). `watchOrder` is stubbed so the store's own
 * fetch never runs; the order is seeded directly into the dictionary instead.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import Order from '@/modules/orders/views/Order.vue';
import { useOrdersStore } from '@/modules/orders/store';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import type { Order as OrderType } from '@types';

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
 * Satisfies `watchOrder`'s `WatchStopHandle` return type without setting up a real watcher —
 * same as `product-view.spec.ts`'s `noopStopHandle`.
 */
const noopStopHandle = () => undefined;

/**
 * Mounts the detail page with `order` already the store's `currentOrder`, `actions` included so
 * `useOrderActionsRefetch` finds nothing missing and never forces a second, unmocked fetch.
 *
 * @param order - The shape under test.
 * @returns The mounted wrapper.
 */
const mountOrder = (order: OrderType) => {
    const store = useOrdersStore();
    vi.spyOn(store, 'watchOrder').mockImplementation(() => noopStopHandle);
    store.addOrder(order);
    store.selectedOrderId = order.id;

    return mount(Order, {
        props: { id: order.id },
        global: {
            plugins: [router, vuetify, i18n],
            // `PaymentPanel`/`ShipmentPanel` fetch their own data as soon as an order id is
            // available — decoration on this page, not what is under test, and there is no
            // mocked transport here for either to talk to.
            stubs: {
                LayoutDefault: { template: '<div><slot /></div>' },
                PaymentPanel: true,
                ShipmentPanel: true
            }
        }
    });
};

/** One line, everything but `current` fixed — only what each case asserts on changes. */
const lineWith = (current: OrderType['items'][number]['current']): OrderType['items'][number] => ({
    product: { id: 'p1', title: 'Gadget', price: 9.99, taxRate: 0 },
    quantity: 1,
    locale: 'en',
    current,
    taxAmount: 0,
    netAmount: 9.99
});

const BASE_ORDER: Omit<OrderType, 'items'> = {
    id: 'o1',
    email: 'buyer@example.com',
    status: 'pending',
    totalItems: 1,
    totalQuantity: 1,
    totalPrice: 9.99,
    netTotal: 9.99,
    taxTotal: 0,
    shippingNetAmount: 0,
    shippingTaxAmount: 0,
    taxSummary: [],
    actions: { transitions: [], cancel: false, pay: false }
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en').then(() => router.push('/en/orders/o1').then(() => router.isReady()));
});

describe('the invoice buttons', () => {
    it('are both enabled, with their normal labels, for any order — the render is synchronous now', () => {
        const wrapper = mountOrder({ ...BASE_ORDER, items: [lineWith(null)] });

        const downloadButton = wrapper.get('[data-test=order-download-invoice]');
        expect(downloadButton.attributes('disabled')).toBeUndefined();
        expect(downloadButton.text()).toContain('Download invoice');

        const viewButton = wrapper.get('[data-test=order-view-invoice]');
        expect(viewButton.attributes('disabled')).toBeUndefined();
        expect(viewButton.text()).toContain('View invoice');

        wrapper.unmount();
    });
});

describe('the invoice number', () => {
    it('is absent when the order carries none', () => {
        const wrapper = mountOrder({ ...BASE_ORDER, items: [lineWith(null)] });

        expect(wrapper.find('[data-test=order-invoice-number]').exists()).toBe(false);

        wrapper.unmount();
    });

    it('shows next to the invoice button once the order has one', () => {
        const wrapper = mountOrder({
            ...BASE_ORDER,
            invoiceNumber: '2026-000041',
            items: [lineWith(null)]
        });

        expect(wrapper.get('[data-test=order-invoice-number]').text()).toContain('2026-000041');

        wrapper.unmount();
    });
});

describe('the VAT summary', () => {
    it('is absent on a pre-VAT order — no taxSummary at all', () => {
        const wrapper = mountOrder({ ...BASE_ORDER, items: [lineWith(null)] });

        expect(wrapper.find('[data-test=order-tax-summary]').exists()).toBe(false);
    });

    it('shows one row per rate, and the net/tax totals, once taxSummary is present', () => {
        const wrapper = mountOrder({
            ...BASE_ORDER,
            netTotal: 8.18,
            taxTotal: 1.81,
            taxSummary: [{ rate: 0.22, netAmount: 8.18, taxAmount: 1.81, grossAmount: 9.99 }],
            items: [lineWith(null)]
        });

        const summary = wrapper.get('[data-test=order-tax-summary]');
        expect(summary.text()).toContain('22%');
        expect(summary.text()).toContain('VAT summary');

        wrapper.unmount();
    });
});

describe('an order line’s picture', () => {
    it('renders the live imageUrl when the product still has one', () => {
        const wrapper = mountOrder({
            ...BASE_ORDER,
            items: [lineWith({ imageUrl: '/images/live.jpg' })]
        });

        const image = wrapper.get('[data-test=lazy-image]');
        expect(image.attributes('data-placeholder')).toBeUndefined();
        expect(image.find('img').attributes('src')).toContain('/images/live.jpg');
    });

    it('falls back to the placeholder once the product is gone (`current: null`)', () => {
        const wrapper = mountOrder({ ...BASE_ORDER, items: [lineWith(null)] });

        expect(wrapper.get('[data-test=lazy-image]').attributes('data-placeholder')).toBe('true');
    });
});
