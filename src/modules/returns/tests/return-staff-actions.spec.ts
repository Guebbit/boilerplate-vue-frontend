/**
 * @module
 * The staff moves render from `Return.actions` alone, and each sends what the store expects. The
 * store's calls are spied — the transport is `store.spec.ts`'s job.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ReturnStaffActions from '@/modules/returns/components/ReturnStaffActions.vue';
import { useReturnsStore } from '@/modules/returns/store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aReturn } from '../../../../tests/support/unit/fixtures.ts';
import type { Return } from '@types';

wireModulesIntoCore();

/**
 * Mounts the component over a return, the store's moves spied before mount.
 *
 * @param item - the return, carrying the `actions` a case is about
 * @returns the wrapper and the store
 */
const mountActions = (item: Return) => {
    const store = useReturnsStore();
    vi.spyOn(store, 'approve').mockResolvedValue(aReturn());
    vi.spyOn(store, 'decline').mockResolvedValue(aReturn());
    vi.spyOn(store, 'receive').mockResolvedValue(aReturn());
    const wrapper = mount(ReturnStaffActions, {
        props: { item },
        global: { plugins: [vuetify, i18n] }
    });
    return { wrapper, store };
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('ReturnStaffActions', () => {
    it('renders nothing for a caller with no move open', () => {
        const { wrapper } = mountActions(aReturn());

        expect(wrapper.find('[data-test=return-approve]').exists()).toBe(false);
        expect(wrapper.find('[data-test=return-decline-form]').exists()).toBe(false);
        expect(wrapper.find('[data-test=return-receive-form]').exists()).toBe(false);
    });

    it('approves and tells the page', async () => {
        const { wrapper, store } = mountActions(
            aReturn({
                status: 'requested',
                actions: { approve: true, decline: true, receive: false }
            })
        );

        await wrapper.get('[data-test=return-approve]').trigger('click');
        await flushPromises();

        expect(store.approve).toHaveBeenCalledWith('r1');
        expect(wrapper.emitted('changed')).toHaveLength(1);
    });

    it('refuses to decline without a reason', async () => {
        const { wrapper, store } = mountActions(
            aReturn({
                status: 'requested',
                actions: { approve: true, decline: true, receive: false }
            })
        );

        await wrapper.get('[data-test=return-decline-form]').trigger('submit');
        await flushPromises();

        expect(store.decline).not.toHaveBeenCalled();
    });

    it('declines with the reason the customer will be told', async () => {
        const { wrapper, store } = mountActions(
            aReturn({
                status: 'requested',
                actions: { approve: true, decline: true, receive: false }
            })
        );

        await wrapper.get('[data-test=return-decline-reason] input').setValue('Worn');
        await wrapper.get('[data-test=return-decline-form]').trigger('submit');
        await flushPromises();

        expect(store.decline).toHaveBeenCalledWith('r1', 'Worn');
    });

    it('receives with no body when nothing is kept back', async () => {
        const { wrapper, store } = mountActions(
            aReturn({ actions: { approve: false, decline: false, receive: true } })
        );

        await wrapper.get('[data-test=return-receive-form]').trigger('submit');
        await flushPromises();

        expect(store.receive).toHaveBeenCalledWith('r1', undefined);
    });

    it('receives with the handling deduction as a number', async () => {
        const { wrapper, store } = mountActions(
            aReturn({ actions: { approve: false, decline: false, receive: true } })
        );

        await wrapper.get('[data-test=return-receive-deduction] input').setValue('4.5');
        await wrapper.get('[data-test=return-receive-form]').trigger('submit');
        await flushPromises();

        expect(store.receive).toHaveBeenCalledWith('r1', { handlingDeduction: 4.5 });
    });

    it('blocks the moves in place when the server refuses', async () => {
        const { wrapper, store } = mountActions(
            aReturn({
                status: 'requested',
                actions: { approve: true, decline: false, receive: false }
            })
        );
        vi.mocked(store.approve).mockRejectedValue(new Error('already decided'));

        await wrapper.get('[data-test=return-approve]').trigger('click');
        await flushPromises();

        expect(wrapper.emitted('changed')).toBeUndefined();
        expect(wrapper.find('[data-test=return-move-error]').exists()).toBe(true);
    });

    it('shows the general error when a decline is rejected with no field errors', async () => {
        const { wrapper, store } = mountActions(
            aReturn({
                status: 'requested',
                actions: { approve: false, decline: true, receive: false }
            })
        );
        vi.mocked(store.decline).mockRejectedValue(new Error('connection lost'));

        await wrapper.get('[data-test=return-decline-reason] input').setValue('Worn');
        await wrapper.get('[data-test=return-decline-form]').trigger('submit');
        await flushPromises();

        expect(wrapper.emitted('changed')).toBeUndefined();
        expect(wrapper.get('[data-test=return-move-error]').text()).toContain('connection lost');
    });

    it('shows the general error when a receive is rejected with no field errors', async () => {
        const { wrapper, store } = mountActions(
            aReturn({ actions: { approve: false, decline: false, receive: true } })
        );
        vi.mocked(store.receive).mockRejectedValue(new Error('already received'));

        await wrapper.get('[data-test=return-receive-form]').trigger('submit');
        await flushPromises();

        expect(wrapper.get('[data-test=return-move-error]').text()).toContain('already received');
    });

    it('puts a field error the server names on its field, with no general error', async () => {
        const { wrapper, store } = mountActions(
            aReturn({ actions: { approve: false, decline: false, receive: true } })
        );
        vi.mocked(store.receive).mockRejectedValue({
            success: false,
            status: 422,
            message: 'Unprocessable Entity',
            errors: [
                {
                    code: 'VALIDATION_ERROR',
                    message: 'Deduction exceeds the refund',
                    details: { field: 'handlingDeduction' },
                    field: 'handlingDeduction'
                }
            ]
        });

        await wrapper.get('[data-test=return-receive-deduction] input').setValue('99');
        await wrapper.get('[data-test=return-receive-form]').trigger('submit');
        await flushPromises();

        expect(wrapper.get('[data-test=return-receive-deduction]').text()).toContain(
            'Deduction exceeds the refund'
        );
        expect(wrapper.find('[data-test=return-move-error]').exists()).toBe(false);
    });
});
