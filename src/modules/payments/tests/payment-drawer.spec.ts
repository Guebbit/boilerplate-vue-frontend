/**
 * @module
 * `PaymentDrawer`: what a row cannot show — refunds, provider references, the card — and the
 * actions the server allows. The refund is the existing endpoint, gated on `actions.refund`, and
 * confirmed first.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import PaymentDrawer from '../components/PaymentDrawer.vue';
import { usePaymentsStore } from '../store.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aPayment } from '../../../../tests/support/unit/fixtures.ts';
import type { Payment } from '@types';

wireModulesIntoCore();

/** The real route tree, so the order link resolves. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/** A payment with everything the drawer can show. */
const FULL: Payment = aPayment({
    providerRef: 'pi_abc123',
    cardLast4: '4242',
    amountRefunded: 10,
    displayStatus: 'refund_pending',
    actions: { pay: false, refund: true },
    refunds: [
        {
            id: 'r1',
            amount: 10,
            currency: 'EUR',
            status: 'failed',
            reason: 'goodwill',
            providerRefundRef: 're_987',
            failureReason: 'insufficient_funds',
            createdAt: '2026-03-05T10:00:00Z'
        }
    ]
});

/**
 * Mounts the drawer open on a payment, with the navigation drawer's layout stubbed (it needs a
 * `v-layout` this test does not render).
 *
 * @param payment - What to show.
 */
const mountDrawer = (payment: Payment | undefined) =>
    mount(PaymentDrawer, {
        props: { payment, modelValue: true },
        global: {
            plugins: [router, vuetify, i18n],
            stubs: { VNavigationDrawer: { template: '<aside><slot /></aside>' } }
        }
    });

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    return router.push('/en/sales/payments').then(() => loadLocale('en'));
});

describe('PaymentDrawer', () => {
    it('shows the provider reference, the card, and each refund with why it failed', () => {
        const wrapper = mountDrawer(FULL);

        expect(wrapper.get('[data-test="drawer-provider-ref"]').text()).toBe('pi_abc123');
        expect(wrapper.text()).toContain('•••• 4242');
        const refund = wrapper.get('[data-test="drawer-refunds"]');
        expect(refund.text()).toContain('€10.00');
        expect(refund.text()).toContain('re_987');
        expect(wrapper.get('[data-test="drawer-failure-reason"]').text()).toBe(
            'Insufficient funds'
        );
    });

    it('renders no provider reference line when the server sent none (a non-staff reader)', () => {
        const wrapper = mountDrawer({ ...FULL, providerRef: undefined });

        expect(wrapper.find('[data-test="drawer-provider-ref"]').exists()).toBe(false);
    });

    it('says so when the payment has no refund', () => {
        const wrapper = mountDrawer(aPayment());

        expect(wrapper.find('[data-test="drawer-no-refunds"]').exists()).toBe(true);
    });

    it('links to the order page, where partial refunds live', () => {
        const wrapper = mountDrawer(FULL);

        expect(wrapper.get('[data-test="drawer-open-order"]').attributes('href')).toContain(
            '/orders/o1/edit'
        );
    });

    it('offers the refund only when the server says it would work', () => {
        expect(mountDrawer(FULL).find('[data-test="drawer-refund"]').exists()).toBe(true);
        expect(
            mountDrawer({ ...FULL, actions: { pay: false, refund: false } })
                .find('[data-test="drawer-refund"]')
                .exists()
        ).toBe(false);
        expect(
            mountDrawer({ ...FULL, actions: undefined })
                .find('[data-test="drawer-refund"]')
                .exists()
        ).toBe(false);
    });

    it('refunds the whole remainder after a confirmation, then tells the list and closes', async () => {
        const store = usePaymentsStore();
        const refund = vi.spyOn(store, 'refundForOrder').mockResolvedValue(FULL);
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
        const wrapper = mountDrawer(FULL);

        await wrapper.get('[data-test="drawer-refund"]').trigger('click');
        await flushPromises();

        expect(refund).toHaveBeenCalledWith('o1');
        expect(wrapper.emitted('changed')).toHaveLength(1);
        expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false]);
    });

    it('does nothing when the confirmation is declined', async () => {
        const refund = vi.spyOn(usePaymentsStore(), 'refundForOrder').mockResolvedValue(FULL);
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(false);
        const wrapper = mountDrawer(FULL);

        await wrapper.get('[data-test="drawer-refund"]').trigger('click');
        await flushPromises();

        expect(refund).not.toHaveBeenCalled();
        expect(wrapper.emitted('changed')).toBeUndefined();
    });

    it('shows a refused refund in the drawer, which stays open', async () => {
        vi.spyOn(usePaymentsStore(), 'refundForOrder').mockRejectedValue({
            success: false,
            status: 403,
            message: 'Forbidden',
            errors: [{ code: 'FORBIDDEN', message: 'You may not refund this buyer.' }]
        });
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
        const wrapper = mountDrawer(FULL);

        await wrapper.get('[data-test="drawer-refund"]').trigger('click');
        await flushPromises();

        expect(wrapper.get('[data-test="drawer-refund-error"]').text()).toContain(
            'You may not refund this buyer.'
        );
        expect(wrapper.emitted('changed')).toBeUndefined();
        expect(wrapper.emitted('update:modelValue')).toBeUndefined();
    });

    it('closes from its own button', async () => {
        const wrapper = mountDrawer(FULL);

        await wrapper.get('[data-test="drawer-close"]').trigger('click');

        expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false]);
    });

    it('renders nothing inside before a payment is picked', () => {
        expect(mountDrawer(undefined).find('[data-test="drawer-open-order"]').exists()).toBe(false);
    });
});
