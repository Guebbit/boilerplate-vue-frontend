/**
 * @module
 * `AwaitingTransferTable`, the payments page's "Awaiting transfer" tab: it lists ORDERS owed a bank
 * transfer, and each row opens `payments`' own offline form. The form is stubbed — its own spec
 * covers recording — so what is pinned is the queue, the dialog around it, and the reload once a
 * payment is recorded.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import AwaitingTransferTable from '../components/AwaitingTransferTable.vue';
import { useOrdersStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { anOrder } from '../../../../tests/support/unit/fixtures.ts';
import { emitOn } from '../../../../tests/support/unit/mounted-vm.ts';
import type { Order } from '@types';

wireModulesIntoCore();

/** The real route tree, so the order link resolves. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/** Two transfers owed, the first due sooner. */
const OWED: Order[] = [
    anOrder({
        id: 'o1',
        orderNumber: '2026-000001',
        email: 'ada@example.com',
        totalPrice: 40,
        payBy: '2026-10-20T10:00:00Z'
    }),
    anOrder({ id: 'o2', orderNumber: '2026-000002', totalPrice: 15, payBy: undefined })
];

/**
 * Mounts the tab with the store's read stubbed to answer `orders`.
 *
 * @param orders - What the queue holds.
 * @returns The wrapper and the read's spy.
 */
const mountTab = (orders: Order[] = OWED) => {
    const store = useOrdersStore();
    const read = vi.spyOn(store, 'fetchAwaitingTransfers').mockImplementation(() => {
        store.awaitingTransfers = orders;
        store.awaitingTransfersTotal = orders.length;
        return Promise.resolve(orders);
    });
    const wrapper = mount(AwaitingTransferTable, {
        global: {
            plugins: [router, vuetify, i18n],
            stubs: {
                RecordOfflinePaymentForm: {
                    name: 'RecordOfflinePaymentForm',
                    props: ['orderId'],
                    template: '<div data-test="offline-form" :data-order="orderId" />'
                },
                // The dialog teleports its content; render it in place.
                VDialog: {
                    props: ['modelValue'],
                    template: '<div v-if="modelValue"><slot /></div>'
                }
            }
        }
    });
    return { wrapper, read };
};

beforeEach(() => {
    setActivePinia(createPinia());
    return router.push('/en/sales/payments').then(() => loadLocale('en'));
});

describe('AwaitingTransferTable', () => {
    it('lists the owed transfers with their number, customer, total and deadline', async () => {
        const { wrapper, read } = mountTab();
        await flushPromises();

        expect(read).toHaveBeenCalledWith(1, 10);
        const rows = wrapper.findAll('[data-test="awaiting-row"]');
        expect(rows).toHaveLength(2);
        expect(rows[0]?.get('[data-test="awaiting-order-link"]').text()).toBe('2026-000001');
        expect(rows[0]?.get('[data-test="awaiting-order-link"]').attributes('href')).toContain(
            '/orders/o1'
        );
        expect(rows[0]?.text()).toContain('ada@example.com');
        expect(rows[0]?.text()).toContain('€40.00');
        // An order without a deadline shows a dash instead of an invalid date.
        expect(rows[1]?.text()).toContain('—');
    });

    it('says so when no transfer is owed', async () => {
        const { wrapper } = mountTab([]);
        await flushPromises();

        expect(wrapper.text()).toContain('No bank transfer is owed');
    });

    it('opens the offline form for the row that was clicked, and no other', async () => {
        const { wrapper } = mountTab();
        await flushPromises();
        expect(wrapper.find('[data-test="offline-form"]').exists()).toBe(false);

        await wrapper.findAll('[data-test="awaiting-record"]')[1]?.trigger('click');

        expect(wrapper.get('[data-test="offline-form"]').attributes('data-order')).toBe('o2');
    });

    it('reloads the queue and closes the dialog once the payment is recorded', async () => {
        const { wrapper, read } = mountTab();
        await flushPromises();
        await wrapper.findAll('[data-test="awaiting-record"]')[0]?.trigger('click');

        emitOn(wrapper.findComponent({ name: 'RecordOfflinePaymentForm' }), 'recorded');
        await flushPromises();

        expect(read).toHaveBeenCalledTimes(2);
        expect(wrapper.find('[data-test="offline-form"]').exists()).toBe(false);
    });

    it('closes the dialog from its own button without reloading', async () => {
        const { wrapper, read } = mountTab();
        await flushPromises();
        await wrapper.findAll('[data-test="awaiting-record"]')[0]?.trigger('click');

        await wrapper.get('[data-test="awaiting-record-close"]').trigger('click');

        expect(wrapper.find('[data-test="offline-form"]').exists()).toBe(false);
        expect(read).toHaveBeenCalledTimes(1);
    });
});
