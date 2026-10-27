/**
 * @module
 * The three tab bodies of the staff payments page — all payments, refunds, needs attention — with
 * the store's reads stubbed: what each asks the API for, and what each shows from the answer.
 * Provider references and failure reasons are rendered when present and never asked about: the
 * server sends them to staff only.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { createMemoryHistory, createRouter, RouterView } from 'vue-router';
import PaymentsTable from '../components/PaymentsTable.vue';
import RefundsTable from '../components/RefundsTable.vue';
import AwaitingTransfersTable from '../components/AwaitingTransfersTable.vue';
import AttentionList from '../components/AttentionList.vue';
import { usePaymentsStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { collectModuleRoutes } from '@/kernel/registry';
import { enabledModules } from '@/modules';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aPayment, aProblem } from '../../../../tests/support/unit/fixtures.ts';
import type { PaymentAttentionItem, RefundListItem } from '@types';

wireModulesIntoCore();

/** The real route tree, so an order link resolves. */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale', component: RouterView, children: collectModuleRoutes(enabledModules) }
    ]
});

/**
 * Mount options shared by every table. The navigation drawer needs a `v-layout` this suite does
 * not render, so it is stubbed to its slot (the attention list embeds the payment drawer).
 */
const GLOBAL = {
    plugins: [router, vuetify, i18n],
    stubs: { VNavigationDrawer: { template: '<aside><slot /></aside>' } }
};

beforeEach(() => {
    setActivePinia(createPinia());
    return router.push('/en/sales/payments').then(() => loadLocale('en'));
});

/** Stubs the page read to answer the given payments, and returns the spy. */
const answerPaymentsWith = (items: ReturnType<typeof aPayment>[]) => {
    const store = usePaymentsStore();
    return vi.spyOn(store, 'fetchPaymentsPage').mockImplementation(() => {
        store.paymentsPage = items;
        store.paymentsTotal = items.length;
        return Promise.resolve(items);
    });
};

/** Stubs the awaiting-transfers read. */
const answerAwaitingWith = (items: ReturnType<typeof aPayment>[]) => {
    const store = usePaymentsStore();
    return vi.spyOn(store, 'fetchAwaitingPage').mockImplementation(() => {
        store.awaitingPage = items;
        store.awaitingTotal = items.length;
        return Promise.resolve(items);
    });
};

/** Stubs the refunds read. */
const answerRefundsWith = (items: RefundListItem[]) => {
    const store = usePaymentsStore();
    return vi.spyOn(store, 'fetchRefundsPage').mockImplementation(() => {
        store.refundsPage = items;
        store.refundsTotal = items.length;
        return Promise.resolve(items);
    });
};

/** Stubs the attention read. */
const answerAttentionWith = (items: PaymentAttentionItem[]) => {
    const store = usePaymentsStore();
    return vi.spyOn(store, 'fetchAttention').mockImplementation(() => {
        store.attention = items;
        return Promise.resolve(items);
    });
};

describe('AwaitingTransfersTable', () => {
    it('asks for the first page and shows deadline, reference, amount and order', async () => {
        const read = answerAwaitingWith([
            aPayment({
                method: 'bank_transfer',
                status: 'requires_action',
                amount: 40,
                nextAction: {
                    type: 'bank_transfer',
                    beneficiary: 'Shop Ltd',
                    iban: 'IT60X0542811101000000123456',
                    reference: 'RF18 5390 0754 7034',
                    payBy: '2026-10-20T10:00:00Z'
                }
            })
        ]);
        const wrapper = mount(AwaitingTransfersTable, { global: GLOBAL });
        await flushPromises();

        expect(read).toHaveBeenCalledWith(1, 10);
        const row = wrapper.get('[data-test="awaiting-row"]').text();
        expect(row).toContain('RF18 5390 0754 7034');
        expect(row).toContain('2026-000001');
        expect(row).toContain('40');
        expect(wrapper.find('[data-test="awaiting-order-link"]').exists()).toBe(true);
    });

    it('says so when no transfer is owed', async () => {
        answerAwaitingWith([]);
        const wrapper = mount(AwaitingTransfersTable, { global: GLOBAL });
        await flushPromises();

        expect(wrapper.text()).toContain('No bank transfer is owed');
    });

    it('emits the payment of the row the visitor picked', async () => {
        answerAwaitingWith([aPayment({ id: 'pay-3', method: 'bank_transfer' })]);
        const wrapper = mount(AwaitingTransfersTable, { global: GLOBAL });
        await flushPromises();

        await wrapper.get('[data-test="awaiting-row"]').trigger('click');

        expect(wrapper.emitted('select')?.[0]?.[0]).toMatchObject({ id: 'pay-3' });
    });
});

describe('PaymentsTable', () => {
    it('shows date, amount, status, method, provider, order, customer and refunded', async () => {
        answerPaymentsWith([
            aPayment({
                amountRefunded: 20,
                displayStatus: 'partially_refunded'
            })
        ]);
        const wrapper = mount(PaymentsTable, { global: GLOBAL });
        await flushPromises();

        const row = wrapper.get('[data-test="payment-row"]');
        expect(row.get('[data-test="payment-status"]').text()).toBe('Partially refunded');
        expect(row.text()).toContain('€50.00');
        expect(row.text()).toContain('€20.00');
        expect(row.text()).toContain('Card');
        expect(row.text()).toContain('fake');
        expect(row.text()).toContain('ada@example.com');
        expect(row.get('[data-test="payment-order-link"]').text()).toBe('2026-000001');
        expect(row.get('[data-test="payment-order-link"]').attributes('href')).toContain(
            '/orders/o1'
        );
    });

    it('asks for the first page, ten at a time, with no filter', async () => {
        const read = answerPaymentsWith([]);
        mount(PaymentsTable, { global: GLOBAL });
        await flushPromises();

        expect(read).toHaveBeenCalledWith(
            expect.objectContaining({
                page: 1,
                pageSize: 10,
                displayStatus: undefined,
                createdFrom: undefined,
                amountMin: undefined
            })
        );
    });

    it('sends every filter, the days as instants and the amounts as numbers', async () => {
        const read = answerPaymentsWith([]);
        const wrapper = mount(PaymentsTable, { global: GLOBAL });
        await flushPromises();

        await wrapper.get('[data-test="filter-provider"] input').setValue(' fake ');
        await wrapper.get('[data-test="filter-order-id"] input').setValue('o9');
        await wrapper.get('[data-test="filter-reference"] input').setValue('TRX-1');
        await wrapper.get('[data-test="filter-created-from"] input').setValue('2026-03-01');
        await wrapper.get('[data-test="filter-created-to"] input').setValue('2026-03-31');
        await wrapper.get('[data-test="filter-received-from"] input').setValue('2026-03-02');
        await wrapper.get('[data-test="filter-amount-min"] input').setValue('10');
        await wrapper.get('[data-test="filter-amount-max"] input').setValue('99.5');
        await wrapper.get('[data-test="payments-search-submit"]').trigger('submit');
        await flushPromises();

        const query = read.mock.calls.at(-1)?.[0];
        expect(query).toMatchObject({
            provider: 'fake',
            orderId: 'o9',
            reference: 'TRX-1',
            amountMin: 10,
            amountMax: 99.5
        });
        expect(new Date(query?.createdFrom ?? '').getTime()).toBe(new Date(2026, 2, 1).getTime());
        expect(new Date(query?.createdTo ?? '').getTime()).toBe(
            new Date(2026, 2, 31, 23, 59, 59, 999).getTime()
        );
        expect(query?.receivedFrom).toBeDefined();
        expect(query?.receivedTo).toBeUndefined();
    });

    it('drops an amount that is not a number rather than sending NaN', async () => {
        const read = answerPaymentsWith([]);
        const wrapper = mount(PaymentsTable, { global: GLOBAL });
        await flushPromises();

        await wrapper.get('[data-test="filter-amount-min"] input').setValue('-5');
        await wrapper.get('[data-test="payments-search-submit"]').trigger('submit');
        await flushPromises();

        expect(read.mock.calls.at(-1)?.[0].amountMin).toBeUndefined();
    });

    it('clears the filters on Reset and reloads', async () => {
        const read = answerPaymentsWith([]);
        const wrapper = mount(PaymentsTable, { global: GLOBAL });
        await flushPromises();
        await wrapper.get('[data-test="filter-order-id"] input').setValue('o9');

        await wrapper.get('[data-test="payments-search-reset"]').trigger('click');
        await flushPromises();

        expect(read.mock.calls.at(-1)?.[0].orderId).toBeUndefined();
    });

    it('sorts by amount from its header, restarting from the first page', async () => {
        const read = answerPaymentsWith([aPayment()]);
        const wrapper = mount(PaymentsTable, { global: GLOBAL });
        await flushPromises();

        await wrapper
            .findAll('th')
            .find((head) => head.text().includes('Amount'))
            ?.trigger('click');
        await flushPromises();

        expect(read.mock.calls.at(-1)?.[0]).toMatchObject({ page: 1, sort: ['amount'] });
    });

    it('leaves a column the API cannot sort by inert', async () => {
        answerPaymentsWith([aPayment()]);
        const wrapper = mount(PaymentsTable, { global: GLOBAL });
        await flushPromises();

        const head = (title: string) =>
            wrapper.findAll('th').find((cell) => cell.text().includes(title));
        expect(head('Amount')?.classes()).toContain('v-data-table__th--sortable');
        expect(head('Provider')?.classes()).not.toContain('v-data-table__th--sortable');
    });

    it('opens the payment of a picked row, and can open the same one again', async () => {
        answerPaymentsWith([aPayment({ id: 'pay-7' })]);
        const wrapper = mount(PaymentsTable, { global: GLOBAL });
        await flushPromises();

        await wrapper.get('[data-test="payment-row"]').trigger('click');
        await wrapper.get('[data-test="payment-row"]').trigger('click');

        expect(
            wrapper.emitted('select')?.map(([payment]) => (payment as { id: string }).id)
        ).toEqual(['pay-7', 'pay-7']);
    });

    it('says so when nothing matches', async () => {
        answerPaymentsWith([]);
        const wrapper = mount(PaymentsTable, { global: GLOBAL });
        await flushPromises();

        expect(wrapper.text()).toContain('No payment matches these filters');
    });

    it('toasts a failed read instead of breaking the page', async () => {
        const store = usePaymentsStore();
        vi.spyOn(store, 'fetchPaymentsPage').mockRejectedValue(
            aProblem(500, [{ code: 'INTERNAL_ERROR', message: 'Server exploded' }])
        );

        const toast = vi.spyOn(useNotificationsStore(), 'addMessage');

        mount(PaymentsTable, { global: GLOBAL });
        await flushPromises();

        expect(toast).toHaveBeenCalledTimes(1);
    });
});

describe('RefundsTable', () => {
    /** One refund, failed. */
    const REFUND: RefundListItem = {
        id: 'r1',
        paymentId: 'pay-1',
        orderId: 'o1',
        amount: 12.5,
        currency: 'EUR',
        status: 'failed',
        reason: 'goodwill',
        providerRefundRef: 're_123',
        failureReason: 'lost_or_stolen_card',
        createdAt: '2026-03-04T10:00:00Z'
    };

    it('shows the refund, the reason it failed in words, and the provider reference', async () => {
        answerRefundsWith([REFUND]);
        const wrapper = mount(RefundsTable, { global: GLOBAL });
        await flushPromises();

        const row = wrapper.get('[data-test="refund-row"]');
        expect(row.text()).toContain('€12.50');
        expect(row.text()).toContain('Failed');
        expect(row.text()).toContain('Goodwill');
        expect(row.get('[data-test="refund-failure-reason"]').text()).toBe(
            'The card was reported lost or stolen'
        );
        expect(row.text()).toContain('re_123');
        expect(row.get('[data-test="refund-order-link"]').attributes('href')).toContain(
            '/orders/o1'
        );
    });

    it('names a refund made in the provider dashboard', async () => {
        answerRefundsWith([{ ...REFUND, status: 'succeeded', reason: 'external' }]);
        const wrapper = mount(RefundsTable, { global: GLOBAL });
        await flushPromises();

        expect(wrapper.get('[data-test="refund-row"]').text()).toContain(
            "Refunded in the provider's dashboard"
        );
    });

    it('says when the provider took a refund back', async () => {
        answerRefundsWith([{ ...REFUND, reversedAt: '2026-03-09T10:00:00Z' }]);
        const wrapper = mount(RefundsTable, { global: GLOBAL });
        await flushPromises();

        expect(wrapper.get('[data-test="refund-reversed-on"]').text()).toContain(
            'Reversed by the provider on'
        );
    });

    it('shows a dash where a refund has no provider reference or failure', async () => {
        answerRefundsWith([
            {
                ...REFUND,
                status: 'succeeded',
                providerRefundRef: undefined,
                failureReason: undefined
            }
        ]);
        const wrapper = mount(RefundsTable, { global: GLOBAL });
        await flushPromises();

        const row = wrapper.get('[data-test="refund-row"]');
        expect(row.find('[data-test="refund-failure-reason"]').exists()).toBe(false);
        expect(row.text()).toContain('—');
    });

    it('sends the chosen filters', async () => {
        const read = answerRefundsWith([]);
        const wrapper = mount(RefundsTable, { global: GLOBAL });
        await flushPromises();
        expect(read.mock.calls[0]?.[0]).toMatchObject({ page: 1, pageSize: 10 });

        await wrapper.get('[data-test="refund-filter-order-id"] input').setValue('o4');
        await wrapper.get('[data-test="refund-filter-created-from"] input').setValue('2026-03-01');
        await wrapper.get('[data-test="refunds-search-submit"]').trigger('submit');
        await flushPromises();

        const query = read.mock.calls.at(-1)?.[0];
        expect(query?.orderId).toBe('o4');
        expect(new Date(query?.createdFrom ?? '').getTime()).toBe(new Date(2026, 2, 1).getTime());
    });

    it('says so when there is no refund', async () => {
        answerRefundsWith([]);
        const wrapper = mount(RefundsTable, { global: GLOBAL });
        await flushPromises();

        expect(wrapper.text()).toContain('No refund matches these filters');
    });
});

describe('AttentionList', () => {
    /** Two problems on one order — nothing on them is unique by itself. */
    const ITEMS: PaymentAttentionItem[] = [
        {
            kind: 'stale_refund',
            orderId: 'o1',
            paymentId: 'pay-1',
            refundId: 'r1',
            amount: 5,
            currency: 'EUR',
            failureReason: 'provider_unavailable',
            since: '2026-03-04T10:00:00Z'
        },
        {
            kind: 'refused_refund',
            orderId: 'o3',
            paymentId: 'pay-3',
            refundId: 'r3',
            amount: 7,
            currency: 'EUR',
            failureReason: 'lost_or_stolen_card',
            since: '2026-03-04T10:00:00Z'
        },
        {
            kind: 'manual_refund_owed',
            orderId: 'o1',
            paymentId: 'pay-1',
            refundId: 'r2',
            amount: 12,
            currency: 'EUR',
            since: '2026-03-04T10:00:00Z'
        }
    ];

    it('says by how much an open refund overshoots what an outside refund left', async () => {
        answerAttentionWith([
            {
                kind: 'refund_exceeds_remaining',
                orderId: 'o5',
                paymentId: 'pay-5',
                refundId: 'r5',
                amount: 50,
                currency: 'EUR',
                exceedsBy: 30,
                since: '2026-03-09T10:00:00Z'
            }
        ]);
        const wrapper = mount(AttentionList, { global: GLOBAL });
        await flushPromises();

        const row = wrapper.get('[data-test="attention-row"]');
        expect(row.get('[data-test="attention-kind"]').text()).toContain('left no room');
        expect(row.get('[data-test="attention-exceeds-by"]').text()).toBe('Over by €30.00');
    });

    it('names a refund the bank sent back, with the reason it bounced', async () => {
        answerAttentionWith([
            {
                kind: 'reversed_refund',
                orderId: 'o4',
                paymentId: 'pay-4',
                refundId: 'r4',
                amount: 9,
                currency: 'EUR',
                failureReason: 'disputed',
                since: '2026-03-09T10:00:00Z'
            }
        ]);
        const wrapper = mount(AttentionList, { global: GLOBAL });
        await flushPromises();

        const row = wrapper.get('[data-test="attention-row"]');
        expect(row.get('[data-test="attention-kind"]').text()).toBe(
            'Sent back by the bank: return the money another way'
        );
        expect(row.get('[data-test="attention-failure-reason"]').text()).toBe(
            "The buyer's bank took the money back in a dispute"
        );
    });

    it('lists every problem, even two with the same order and time', async () => {
        answerAttentionWith(ITEMS);
        const wrapper = mount(AttentionList, { global: GLOBAL });
        await flushPromises();

        const rows = wrapper.findAll('[data-test="attention-row"]');
        expect(rows).toHaveLength(3);
        expect(rows[0]?.get('[data-test="attention-kind"]').text()).toBe(
            "Waiting for the provider's answer"
        );
        expect(rows[0]?.get('[data-test="attention-failure-reason"]').text()).toBe(
            'The payment provider was unavailable'
        );
        expect(rows[0]?.text()).toContain('€5.00');
        expect(rows[1]?.get('[data-test="attention-kind"]').text()).toBe(
            'Refused: return the money another way'
        );
        expect(rows[1]?.get('[data-test="attention-failure-reason"]').text()).toBe(
            'The card was reported lost or stolen'
        );
        expect(rows[2]?.get('[data-test="attention-kind"]').text()).toBe(
            'Money to hand back outside the system'
        );
        expect(rows[2]?.text()).toContain('€12.00');
    });

    it('counts the days left to the legal pay-back deadline of a refused return refund', async () => {
        const inThreeDays = new Date(Date.now() + 3 * 86_400_000 - 3_600_000).toISOString();
        answerAttentionWith([{ ...ITEMS[1], refundDueBy: inThreeDays }, ITEMS[0]]);
        const wrapper = mount(AttentionList, { global: GLOBAL });
        await flushPromises();

        const rows = wrapper.findAll('[data-test="attention-row"]');
        expect(rows[0]?.get('[data-test="attention-deadline"]').text()).toBe(
            '3 days left to pay this back'
        );
        // A refund with no such deadline shows its age only.
        expect(rows[1]?.find('[data-test="attention-deadline"]').exists()).toBe(false);
    });

    it('says how late a refund is once the deadline has gone', async () => {
        const twoDaysAgo = new Date(Date.now() - 2 * 86_400_000 - 3_600_000).toISOString();
        answerAttentionWith([{ ...ITEMS[1], refundDueBy: twoDaysAgo }]);
        const wrapper = mount(AttentionList, { global: GLOBAL });
        await flushPromises();

        expect(wrapper.get('[data-test="attention-deadline"]').text()).toBe(
            'Pay-back deadline passed 2 days ago'
        );
    });

    it('links each problem to its order', async () => {
        answerAttentionWith(ITEMS);
        const wrapper = mount(AttentionList, { global: GLOBAL });
        await flushPromises();

        expect(
            wrapper.findAll('[data-test="attention-order-link"]')[0]?.attributes('href')
        ).toContain('/orders/o1');
    });

    it('points at the audit log for what is not stored state', async () => {
        answerAttentionWith([]);
        const wrapper = mount(AttentionList, { global: GLOBAL });
        await flushPromises();

        expect(wrapper.get('[data-test="attention-audit-note"]').text()).toContain(
            'payment.amount_mismatch'
        );
        expect(wrapper.get('[data-test="attention-audit-note"] a').attributes('href')).toContain(
            '/audit'
        );
    });

    it('says so when nothing needs attention, and reloads on demand', async () => {
        const read = answerAttentionWith([]);
        const wrapper = mount(AttentionList, { global: GLOBAL });
        await flushPromises();
        expect(wrapper.text()).toContain('Nothing needs attention');

        await wrapper.get('[data-test="attention-reload"]').trigger('click');

        expect(read).toHaveBeenCalledTimes(2);
    });

    it('opens the payment’s drawer from any row', async () => {
        answerAttentionWith(ITEMS);
        const read = vi
            .spyOn(usePaymentsStore(), 'readPayment')
            .mockResolvedValue(aPayment({ orderId: 'o1', provider: 'manual', method: 'cash' }));
        const wrapper = mount(AttentionList, { global: GLOBAL });
        await flushPromises();

        const rows = wrapper.findAll('[data-test="attention-row"]');
        expect(rows[0]?.find('[data-test="attention-open-payment"]').exists()).toBe(true);
        await rows[2]?.get('[data-test="attention-open-payment"]').trigger('click');
        await flushPromises();

        expect(read).toHaveBeenCalledWith('pay-1');
        expect(wrapper.find('[data-test="payment-drawer"]').exists()).toBe(true);
    });
});

describe('list state in the URL', () => {
    it('opens the payments tab with the filters its link names', async () => {
        const read = answerPaymentsWith([aPayment()]);
        await router.push('/en/sales/payments?payments-provider=stripe&payments-page=2');
        mount(PaymentsTable, { global: GLOBAL });
        await flushPromises();

        expect(read).toHaveBeenCalledWith(expect.objectContaining({ provider: 'stripe', page: 2 }));
    });

    it('keeps the refunds filters under their own prefix, apart from the payments tab', async () => {
        const read = answerRefundsWith([]);
        await router.push('/en/sales/payments?refunds-status=failed&payments-provider=stripe');
        mount(RefundsTable, { global: GLOBAL });
        await flushPromises();

        expect(read).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
        expect(read).not.toHaveBeenCalledWith(expect.objectContaining({ provider: 'stripe' }));
    });
});
