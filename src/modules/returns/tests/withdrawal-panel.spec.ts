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
import WithdrawalPanel from '@/modules/returns/components/WithdrawalPanel.vue';
import { useReturnsStore } from '@/modules/returns/store.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aReturn, anOrder } from '../../../../tests/support/unit/fixtures.ts';

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
 * Mounts the panel with the store's calls spied BEFORE mount — the component destructures its
 * actions at setup time.
 *
 * @param props - what the order page would pass
 * @param existing - the returns already opened on the order
 * @returns the wrapper and the store
 */
const mountPanel = (props: { canWithdraw?: boolean; withdrawUntil?: string }, existing = []) => {
    const store = useReturnsStore();
    vi.spyOn(store, 'fetchOrderReturns').mockResolvedValue(existing);
    vi.spyOn(store, 'openReturn').mockResolvedValue({
        kind: 'cancelled',
        order: anOrder({ status: 'cancelled' })
    });
    const wrapper = mount(WithdrawalPanel, {
        props: { orderId: 'o1', ...props },
        global: { plugins: [vuetify, i18n, router] }
    });
    return { wrapper, store };
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
});
