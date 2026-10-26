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
import { aPayment, aProblem } from '../../../../tests/support/unit/fixtures.ts';
import type { Payment, Refund } from '@types';

wireModulesIntoCore();

/** The real route tree, so the order link resolves. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/** A payment with everything the drawer can show. */
/** A record of the refund the request wrote, for the specs that stub the store's answer. */
const SETTLED_REFUND: Refund = {
    id: 'r-new',
    amount: 100,
    currency: 'EUR',
    status: 'succeeded',
    reason: 'goodwill',
    createdAt: '2026-03-05T10:00:00Z'
};

const FULL: Payment = aPayment({
    providerRef: 'pi_abc123',
    cardLast4: '4242',
    amountRefunded: 10,
    displayStatus: 'refund_pending',
    actions: { pay: false, sync: false, refund: true, settleByHand: [] },
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
            mountDrawer({
                ...FULL,
                actions: { pay: false, sync: false, refund: false, settleByHand: [] }
            })
                .find('[data-test="drawer-refund"]')
                .exists()
        ).toBe(false);
    });

    it('refunds the whole remainder after a confirmation, then tells the list and closes', async () => {
        const store = usePaymentsStore();
        const refund = vi.spyOn(store, 'refundPayment').mockResolvedValue({
            payment: FULL,
            refund: { ...SETTLED_REFUND, status: 'succeeded' }
        });
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
        const wrapper = mountDrawer(FULL);

        await wrapper.get('[data-test="drawer-refund"]').trigger('click');
        await flushPromises();

        expect(refund).toHaveBeenCalledWith(expect.objectContaining({ orderId: 'o1' }));
        expect(wrapper.emitted('changed')).toHaveLength(1);
        expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false]);
    });

    it('stays open when the provider refused the refund, so Mark returned is in reach', async () => {
        const store = usePaymentsStore();
        vi.spyOn(store, 'refundPayment').mockResolvedValue({
            payment: FULL,
            refund: { ...SETTLED_REFUND, status: 'failed', failureReason: 'declined' }
        });
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
        const wrapper = mountDrawer(FULL);

        await wrapper.get('[data-test="drawer-refund"]').trigger('click');
        await flushPromises();

        expect(wrapper.emitted('changed')).toHaveLength(1);
        expect(wrapper.emitted('update:modelValue')?.at(-1)).not.toEqual([false]);
    });

    it('refunds once when the button is pressed twice before the first answer', async () => {
        const refund = vi
            .spyOn(usePaymentsStore(), 'refundPayment')
            .mockResolvedValue({ payment: FULL, refund: SETTLED_REFUND });
        const confirm = vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
        const wrapper = mountDrawer(FULL);
        const button = wrapper.get('[data-test="drawer-refund"]');

        await Promise.all([button.trigger('click'), button.trigger('click')]);
        await flushPromises();

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(refund).toHaveBeenCalledTimes(1);
    });

    it('does nothing when the confirmation is declined', async () => {
        const refund = vi
            .spyOn(usePaymentsStore(), 'refundPayment')
            .mockResolvedValue({ payment: FULL, refund: SETTLED_REFUND });
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(false);
        const wrapper = mountDrawer(FULL);

        await wrapper.get('[data-test="drawer-refund"]').trigger('click');
        await flushPromises();

        expect(refund).not.toHaveBeenCalled();
        expect(wrapper.emitted('changed')).toBeUndefined();
    });

    it('shows a refused refund in the drawer, which stays open', async () => {
        vi.spyOn(usePaymentsStore(), 'refundPayment').mockRejectedValue(
            aProblem(403, [{ code: 'FORBIDDEN', message: 'You may not refund this buyer.' }])
        );
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

    describe('a hand-paid refund waiting for the operator', () => {
        const OWED: Payment = aPayment({
            provider: 'manual',
            method: 'cash',
            displayStatus: 'refund_pending',
            amountRefunded: 50,
            actions: { pay: false, sync: false, refund: false, settleByHand: ['r-owed'] },
            refunds: [
                {
                    id: 'r-owed',
                    amount: 50,
                    currency: 'EUR',
                    status: 'pending',
                    reason: 'return',
                    createdAt: '2026-03-05T10:00:00Z'
                },
                {
                    id: 'r-other',
                    amount: 5,
                    currency: 'EUR',
                    status: 'pending',
                    reason: 'goodwill',
                    createdAt: '2026-03-05T11:00:00Z'
                }
            ]
        });

        it('offers "Mark returned" for the records the server names, and only those', () => {
            const wrapper = mountDrawer(OWED);

            expect(wrapper.find('[data-test="drawer-mark-returned-r-owed"]').exists()).toBe(true);
            expect(wrapper.find('[data-test="drawer-mark-returned-r-other"]').exists()).toBe(false);
        });

        it('settles that record after a confirmation naming the amount, then tells the list', async () => {
            const settle = vi
                .spyOn(usePaymentsStore(), 'settleRefundByHand')
                .mockResolvedValue(OWED);
            const confirm = vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
            const wrapper = mountDrawer(OWED);

            await wrapper.get('[data-test="drawer-mark-returned-r-owed"]').trigger('click');
            await flushPromises();

            expect(confirm.mock.calls[0][0].message).toContain('€50.00');
            expect(settle).toHaveBeenCalledWith(OWED, 'r-owed');
            expect(wrapper.emitted('changed')).toHaveLength(1);
        });

        it('does nothing when the confirmation is declined', async () => {
            const settle = vi
                .spyOn(usePaymentsStore(), 'settleRefundByHand')
                .mockResolvedValue(OWED);
            vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(false);
            const wrapper = mountDrawer(OWED);

            await wrapper.get('[data-test="drawer-mark-returned-r-owed"]').trigger('click');
            await flushPromises();

            expect(settle).not.toHaveBeenCalled();
        });

        it('shows a refused settlement in the drawer, which stays open', async () => {
            vi.spyOn(usePaymentsStore(), 'settleRefundByHand').mockRejectedValue(
                aProblem(409, [{ code: 'PAYMENT_REFUND_NOT_OPEN', message: 'Already settled.' }])
            );
            vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
            const wrapper = mountDrawer(OWED);

            await wrapper.get('[data-test="drawer-mark-returned-r-owed"]').trigger('click');
            await flushPromises();

            expect(wrapper.get('[data-test="drawer-refund-error"]').text()).toContain(
                'Already settled.'
            );
            expect(wrapper.emitted('update:modelValue')).toBeUndefined();
        });
    });
});
