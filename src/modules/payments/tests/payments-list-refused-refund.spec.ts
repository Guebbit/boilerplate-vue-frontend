/**
 * @module
 * The staff payments page with its REAL drawer: a refund the provider refused leaves the drawer
 * open, and it must show the payment as re-read (the refused record and its reason), not the row
 * the drawer was opened on. Only the table and the navigation drawer's layout are stubbed.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import PaymentsList from '../views/PaymentsList.vue';
import { usePaymentsStore } from '../store.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aPayment } from '../../../../tests/support/unit/fixtures.ts';
import { emitOn } from '../../../../tests/support/unit/mounted-vm.ts';

wireModulesIntoCore();

/** The real route tree. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/** A payment the viewer may refund, as the row hands it to the drawer. */
const ROW = aPayment({
    actions: {
        pay: false,
        sync: false,
        refund: true,
        settleRefundByHand: [],
        cancelRefund: [],
        syncRefunds: false
    }
});

/** The same payment after the provider refused a refund, as the re-read answers it. */
const REREAD = aPayment({
    ...ROW,
    refunds: [
        {
            id: 'r1',
            amount: '50.00',
            currency: 'EUR',
            status: 'failed',
            reason: 'goodwill',
            failureReason: 'insufficient_funds',
            createdAt: '2026-03-05T10:00:00Z'
        }
    ]
});

beforeEach(() => {
    setActivePinia(createPinia());
    return router.push('/en/sales/payments').then(() => loadLocale('en'));
});

describe('PaymentsList with its drawer', () => {
    it('shows a refused refund’s reason in the drawer it left open', async () => {
        vi.spyOn(usePaymentsStore(), 'refundPayment').mockResolvedValue({
            payment: REREAD,
            refund: { ...REREAD.refunds[0], failureReason: 'insufficient_funds' }
        });
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
        const wrapper = mount(PaymentsList, {
            global: {
                plugins: [router, vuetify, i18n],
                stubs: {
                    PaymentsTable: { name: 'PaymentsTable', template: '<div />' },
                    VNavigationDrawer: { template: '<aside><slot /></aside>' }
                }
            }
        });
        await flushPromises();
        emitOn(wrapper.findComponent({ name: 'PaymentsTable' }), 'select', ROW);
        await flushPromises();
        expect(wrapper.find('[data-test="drawer-failure-reason"]').exists()).toBe(false);

        await wrapper.get('[data-test="drawer-refund"]').trigger('click');
        await flushPromises();

        expect(wrapper.get('[data-test="drawer-failure-reason"]').text()).toBe(
            'Insufficient funds'
        );
    });
});
