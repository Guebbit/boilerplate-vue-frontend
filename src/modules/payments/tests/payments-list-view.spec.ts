/**
 * @module
 * The staff payments page: which tabs a build offers, how the active one lands in the URL, what
 * the "Awaiting transfer" slot does when nothing fills it, and how a row becomes the drawer. The
 * tab bodies have their own specs; here they are stubbed to markers.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import PaymentsList from '../views/PaymentsList.vue';
import { useSessionStore } from '@/infrastructure/session.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aPayment } from '../../../../tests/support/unit/fixtures.ts';
import { emitOn } from '../../../../tests/support/unit/mounted-vm.ts';
import { anOrder } from '../../../../tests/support/unit/fixtures.ts';

wireModulesIntoCore();

/** The real route tree. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/** The bodies and the drawer, replaced by markers; the real ones are specced elsewhere. */
const STUBS = {
    PaymentsTable: { name: 'PaymentsTable', template: '<div data-test="all-body" />' },
    AwaitingTransfersTable: {
        name: 'AwaitingTransfersTable',
        template: '<div data-test="awaiting-body" />'
    },
    RefundsTable: { template: '<div data-test="refunds-body" />' },
    AttentionList: { template: '<div data-test="attention-body" />' },
    PaymentDrawer: {
        name: 'PaymentDrawer',
        props: ['modelValue', 'payment'],
        template: '<div data-test="drawer" :data-open="modelValue" :data-id="payment?.id" />'
    },
    OrderReferenceSearch: { name: 'OrderReferenceSearch', template: '<div />' }
};

/**
 * Mounts the page at a URL.
 *
 * @param url - Where to land.
 */
const mountAt = (url: string) =>
    router.push(url).then(() => {
        const wrapper = mount(PaymentsList, {
            global: {
                plugins: [router, vuetify, i18n],
                stubs: STUBS
            }
        });
        return flushPromises().then(() => wrapper);
    });

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('PaymentsList — the tabs', () => {
    it('offers all four tabs', async () => {
        const wrapper = await mountAt('/en/sales/payments');

        expect(wrapper.findAll('[role=tab]').map((tab) => tab.text())).toEqual([
            'All',
            'Awaiting transfer',
            'Refunds',
            'Needs attention'
        ]);
    });

    it('opens on All', async () => {
        const wrapper = await mountAt('/en/sales/payments');

        expect(wrapper.find('[data-test="all-body"]').exists()).toBe(true);
    });

    it('opens on the tab the URL names', async () => {
        const wrapper = await mountAt('/en/sales/payments?tab=awaiting');

        expect(wrapper.get('[data-test="awaiting-body"]').isVisible()).toBe(true);
    });

    it('ignores a tab name it does not know', async () => {
        const wrapper = await mountAt('/en/sales/payments?tab=nonsense');

        expect(wrapper.get('[data-test="all-body"]').isVisible()).toBe(true);
    });

    it('writes the chosen tab into the URL, and nothing for All', async () => {
        const wrapper = await mountAt('/en/sales/payments');

        await wrapper.get('[data-test="payments-tab-refunds"]').trigger('click');
        await flushPromises();
        expect(router.currentRoute.value.query.tab).toBe('refunds');
        expect(wrapper.get('[data-test="refunds-body"]').isVisible()).toBe(true);

        await wrapper.get('[data-test="payments-tab-all"]').trigger('click');
        await flushPromises();
        expect(router.currentRoute.value.query.tab).toBeUndefined();
    });
});

describe('PaymentsList — the drawer and the reference lookup', () => {
    it('opens the drawer on the payment a row picked', async () => {
        const wrapper = await mountAt('/en/sales/payments');
        expect(wrapper.get('[data-test="drawer"]').attributes('data-open')).toBe('false');

        emitOn(
            wrapper.findComponent({ name: 'PaymentsTable' }),
            'select',
            aPayment({ id: 'pay-9' })
        );
        await flushPromises();

        expect(wrapper.get('[data-test="drawer"]').attributes('data-open')).toBe('true');
        expect(wrapper.get('[data-test="drawer"]').attributes('data-id')).toBe('pay-9');
    });

    it('opens the drawer on a payment picked from the awaiting tab', async () => {
        const wrapper = await mountAt('/en/sales/payments?tab=awaiting');

        emitOn(
            wrapper.findComponent({ name: 'AwaitingTransfersTable' }),
            'select',
            aPayment({ id: 'pay-7' })
        );
        await flushPromises();

        expect(wrapper.get('[data-test="drawer"]').attributes('data-id')).toBe('pay-7');
    });

    it('offers the reference lookup only to someone who can record a payment', async () => {
        const hidden = await mountAt('/en/sales/payments');
        expect(hidden.findComponent({ name: 'OrderReferenceSearch' }).exists()).toBe(false);

        const session = useSessionStore();
        session.accessToken = 'test-token';
        session.viewer = { id: 'u1', email: 'operator@example.com', role: 'owner' };
        session.setAbilities({ tenant: [['create', 'Payment']], platform: [] });
        const shown = await mountAt('/en/sales/payments');
        expect(shown.findComponent({ name: 'OrderReferenceSearch' }).exists()).toBe(true);
    });

    it('jumps to the order’s edit page when the lookup finds one', async () => {
        const session = useSessionStore();
        session.accessToken = 'test-token';
        session.viewer = { id: 'u1', email: 'operator@example.com', role: 'owner' };
        session.setAbilities({ tenant: [['create', 'Payment']], platform: [] });
        const wrapper = await mountAt('/en/sales/payments');

        emitOn(
            wrapper.findComponent({ name: 'OrderReferenceSearch' }),
            'found',
            anOrder({ id: 'o5' })
        );

        await vi.waitFor(() => {
            expect(router.currentRoute.value.fullPath).toBe('/en/orders/o5/edit');
        });
    });
});
