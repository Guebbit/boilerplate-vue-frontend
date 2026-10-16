/**
 * @module
 * The withdrawal panel: the button shows only on the server's say-so, asks before it acts, and
 * reports the outcome. The store's own calls are spied, as the sibling component specs do — the
 * transport is `store.spec.ts`'s job.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import WithdrawalPanel from '../components/WithdrawalPanel.vue';
import ReturnRequestForm from '../components/ReturnRequestForm.vue';
import { useReturnsStore } from '../store.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aReturn } from '../../../../tests/support/unit/fixtures.ts';
import { emitOn } from '../../../../tests/support/unit/mounted-vm.ts';
import type { ReturnOptions } from '@types';

wireModulesIntoCore();

/**
 * A router that knows the return route the panel links to.
 */
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: '/:locale/returns/:id', name: 'ReturnTarget', component: { template: '<i />' } }
    ]
});

/**
 * What `GET /returns/options` answers for an order with nothing to return or cancel.
 */
const NO_OPTIONS: ReturnOptions = {
    orderId: 'o1',
    currency: 'EUR',
    returnable: [],
    cancellable: []
};

/**
 * Mounts the panel with the store's calls spied BEFORE mount — the component destructures its
 * actions at setup time.
 *
 * @param props - what the order page would pass
 * @param existing - the returns already opened on the order
 * @param options - what the server says can still be returned and cancelled
 * @returns the wrapper and the store
 */
const mountPanel = (
    props: {
        canWithdraw?: boolean;
        withdrawUntil?: string;
    },
    existing = [],
    options: ReturnOptions = NO_OPTIONS
) => {
    const store = useReturnsStore();
    vi.spyOn(store, 'fetchOrderReturns').mockResolvedValue(existing);
    vi.spyOn(store, 'fetchReturnOptions').mockResolvedValue(options);
    vi.spyOn(store, 'openReturn').mockResolvedValue(
        aReturn({ status: 'closed', reason: 'withdrawal', lines: [] })
    );
    const wrapper = mount(WithdrawalPanel, {
        props: { orderId: 'o1', ...props },
        global: {
            plugins: [vuetify, i18n, router],
            stubs: { VDialog: { template: '<div><slot /></div>' } }
        }
    });
    return { wrapper, store };
};

/**
 * Signs in a caller holding the given abilities, as `OrdersList.spec` does.
 *
 * @param tenant - the `[action, subject]` pairs the caller holds
 */
const signInWith = (tenant: [string, string][]) => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u2', email: 'staff@example.com', role: 'owner' };
    session.setAbilities({ tenant, platform: [] });
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('WithdrawalPanel', () => {
    it('renders nothing when there is no button to show and no return to report', async () => {
        const { wrapper } = mountPanel({ canWithdraw: false });
        await flushPromises();

        expect(wrapper.find('[data-test=withdrawal-panel]').exists()).toBe(false);
    });

    it('offers the button with the deadline the server sent', async () => {
        const { wrapper } = mountPanel({
            canWithdraw: true,
            withdrawUntil: '2026-10-01T10:00:00Z'
        });
        await flushPromises();

        expect(wrapper.find('[data-test=withdraw-button]').exists()).toBe(true);
        expect(wrapper.get('[data-test=withdrawal-until]').text()).toContain('2026');
    });

    it('says the period starts at delivery while the window has no end yet', async () => {
        const { wrapper } = mountPanel({ canWithdraw: true });
        await flushPromises();

        expect(wrapper.get('[data-test=withdrawal-until]').text()).toMatch(/delivered/i);
    });

    it('withdraws only after the confirmation, and tells the page', async () => {
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
        const { wrapper, store } = mountPanel({ canWithdraw: true });
        await flushPromises();

        await wrapper.get('[data-test=withdraw-button]').trigger('click');
        await flushPromises();

        expect(store.openReturn).toHaveBeenCalledWith({ orderId: 'o1', reason: 'withdrawal' });
        expect(wrapper.emitted('opened')).toHaveLength(1);
    });

    it('does nothing when the confirmation is declined', async () => {
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(false);
        const { wrapper, store } = mountPanel({ canWithdraw: true });
        await flushPromises();

        await wrapper.get('[data-test=withdraw-button]').trigger('click');
        await flushPromises();

        expect(store.openReturn).not.toHaveBeenCalled();
        expect(wrapper.emitted('opened')).toBeUndefined();
    });

    it('blocks the button in place with the server’s message when the withdrawal is refused', async () => {
        vi.spyOn(useDialogStore(), 'confirm').mockResolvedValue(true);
        const { wrapper, store } = mountPanel({ canWithdraw: true });
        vi.mocked(store.openReturn).mockRejectedValue(
            Object.assign(new Error('window closed'), {
                response: { data: { message: 'Window closed' } }
            })
        );
        await flushPromises();

        await wrapper.get('[data-test=withdraw-button]').trigger('click');
        await flushPromises();

        expect(wrapper.emitted('opened')).toBeUndefined();
        expect(wrapper.find('[data-test=withdraw-error]').exists()).toBe(true);
    });

    it('lists what became of a withdrawal already opened', async () => {
        const { wrapper } = mountPanel({ canWithdraw: false }, [aReturn()] as never);
        await flushPromises();

        expect(wrapper.findAll('[data-test=order-return]')).toHaveLength(1);
        expect(wrapper.get('[data-test=order-return]').text()).toContain('Withdrawal');
    });

    describe('returns form', () => {
        /**
         * What the server says has shipped and can still come back.
         */
        const RETURNABLE: ReturnOptions = {
            ...NO_OPTIONS,
            returnable: [{ productId: 'p1', title: 'Shirt', quantity: 1 }]
        };

        it('is offered when the server lists something returnable, with no withdrawal button needed', async () => {
            const { wrapper } = mountPanel({}, [], RETURNABLE);
            await flushPromises();

            expect(wrapper.find('[data-test=return-request]').exists()).toBe(true);
            expect(wrapper.find('[data-test=withdraw-button]').exists()).toBe(false);
        });

        it('is not offered while nothing is returnable', async () => {
            const { wrapper } = mountPanel({}, [], NO_OPTIONS);
            await flushPromises();

            expect(wrapper.find('[data-test=withdrawal-panel]').exists()).toBe(false);
        });

        it('hands the form the server’s quantities, uncounted', async () => {
            const { wrapper } = mountPanel({}, [], RETURNABLE);
            await flushPromises();

            expect(wrapper.getComponent(ReturnRequestForm).props('lines')).toEqual(
                RETURNABLE.returnable
            );
        });

        it('tells the page and re-reads the lists when a return was opened', async () => {
            const { wrapper, store } = mountPanel({}, [], RETURNABLE);
            await flushPromises();
            const calls = vi.mocked(store.fetchReturnOptions).mock.calls.length;

            emitOn(wrapper.getComponent(ReturnRequestForm), 'opened');
            await flushPromises();

            expect(wrapper.emitted('opened')).toHaveLength(1);
            expect(vi.mocked(store.fetchReturnOptions).mock.calls.length).toBe(calls + 1);
        });

        it('stays out of the way when the options read is refused', async () => {
            const { wrapper, store } = mountPanel({}, []);
            vi.mocked(store.fetchReturnOptions).mockRejectedValue(new Error('forbidden'));
            await flushPromises();

            expect(wrapper.find('[data-test=withdrawal-panel]').exists()).toBe(false);
        });
    });

    describe('cancelling what has not shipped', () => {
        /**
         * One fulfillment order with a remainder, and what cancelling it would refund.
         */
        const CANCELLABLE: ReturnOptions = {
            ...NO_OPTIONS,
            cancellable: [
                {
                    fulfillmentOrderId: 'fo2',
                    number: 2,
                    lines: [{ productId: 'p2', title: 'Mug', quantity: 1 }],
                    refundAmount: 12.5,
                    shippingRefund: 0,
                    cancel: true
                }
            ]
        };

        it('lets the buyer cancel a remainder as part of their withdrawal', async () => {
            const { wrapper, store } = mountPanel({ canWithdraw: true }, [], CANCELLABLE);
            await flushPromises();
            expect(wrapper.get('[data-test=cancellable-item]').text()).toContain('12.50');
            expect(wrapper.find('[data-test=cancel-hint]').exists()).toBe(true);

            await wrapper.get('[data-test=cancel-remainder-open]').trigger('click');
            await wrapper.get('[data-test=cancel-remainder-confirm]').trigger('click');
            await flushPromises();

            expect(store.openReturn).toHaveBeenCalledWith({
                orderId: 'o1',
                kind: 'cancellation',
                fulfillmentOrderId: 'fo2',
                reason: 'withdrawal'
            });
            expect(wrapper.emitted('opened')).toHaveLength(1);
        });

        it('lets staff holding the refund key do it too, without the withdrawal button', async () => {
            signInWith([['create', 'Refund']]);
            const { wrapper } = mountPanel({ canWithdraw: false }, [], CANCELLABLE);
            await flushPromises();

            expect(wrapper.find('[data-test=cancel-remainder-open]').exists()).toBe(true);
            expect(wrapper.find('[data-test=withdraw-button]').exists()).toBe(false);
            expect(wrapper.find('[data-test=cancel-hint]').exists()).toBe(false);
        });

        it('hides a remainder the server says this caller may not cancel', async () => {
            signInWith([['create', 'Refund']]);
            const [first] = CANCELLABLE.cancellable;
            const refused: ReturnOptions = {
                ...CANCELLABLE,
                cancellable: [{ ...first, cancel: false }]
            };
            const { wrapper } = mountPanel({ canWithdraw: false }, [], refused);
            await flushPromises();

            expect(wrapper.find('[data-test=cancellable-list]').exists()).toBe(false);
        });

        it('offers nothing to a caller who is neither the buyer nor holds the refund key', async () => {
            signInWith([['read', 'Order']]);
            const { wrapper } = mountPanel({ canWithdraw: false }, [], CANCELLABLE);
            await flushPromises();

            expect(wrapper.find('[data-test=cancel-remainder-open]').exists()).toBe(false);
        });
    });
});
