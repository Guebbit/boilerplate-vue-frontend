/**
 * @module
 * The staff moves render from `Return.actions` alone, and each sends what the store expects. The
 * store's calls are spied — the transport is `store.spec.ts`'s job.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useSessionStore } from '@/infrastructure/session.ts';
import { VSelect } from 'vuetify/components';
import { emitOn } from '../../../../tests/support/unit/mounted-vm.ts';
import ReturnStaffActions from '../components/ReturnStaffActions.vue';
import { useReturnsStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aReturn, aProblem } from '../../../../tests/support/unit/fixtures.ts';
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
    vi.spyOn(store, 'close').mockResolvedValue(aReturn());
    vi.spyOn(store, 'cancel').mockResolvedValue(aReturn());
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
                actions: {
                    approve: true,
                    decline: true,
                    receive: false,
                    close: false,
                    cancel: false
                }
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
                actions: {
                    approve: true,
                    decline: true,
                    receive: false,
                    close: false,
                    cancel: false
                }
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
                actions: {
                    approve: true,
                    decline: true,
                    receive: false,
                    close: false,
                    cancel: false
                }
            })
        );

        emitOn(wrapper.getComponent(VSelect), 'update:modelValue', 'no_defect_found');
        await flushPromises();
        await wrapper.get('[data-test=return-decline-form]').trigger('submit');
        await flushPromises();

        expect(store.decline).toHaveBeenCalledWith('r1', 'no_defect_found', undefined);
    });

    it('receives with no body when nothing is kept back', async () => {
        const { wrapper, store } = mountActions(
            aReturn({
                actions: {
                    approve: false,
                    decline: false,
                    receive: true,
                    close: false,
                    cancel: false
                }
            })
        );

        await wrapper.get('[data-test=return-receive-form]').trigger('submit');
        await flushPromises();

        expect(store.receive).toHaveBeenCalledWith('r1', undefined);
    });

    it('says the money is still owed when the receipt answers received', async () => {
        const { wrapper, store } = mountActions(
            aReturn({
                actions: {
                    approve: false,
                    decline: false,
                    receive: true,
                    close: false,
                    cancel: false
                }
            })
        );
        vi.mocked(store.receive).mockResolvedValue(aReturn({ status: 'received' }));

        await wrapper.get('[data-test=return-receive-form]').trigger('submit');
        await flushPromises();

        const toasts = useNotificationsStore().history.map(({ message }) => message);
        expect(toasts.some((message) => message.includes('refund is not settled yet'))).toBe(true);
    });

    it('receives with the handling deduction as a number', async () => {
        const { wrapper, store } = mountActions(
            aReturn({
                actions: {
                    approve: false,
                    decline: false,
                    receive: true,
                    close: false,
                    cancel: false
                }
            })
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
                actions: {
                    approve: true,
                    decline: false,
                    receive: false,
                    close: false,
                    cancel: false
                }
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
                actions: {
                    approve: false,
                    decline: true,
                    receive: false,
                    close: false,
                    cancel: false
                }
            })
        );
        vi.mocked(store.decline).mockRejectedValue(new Error('connection lost'));

        emitOn(wrapper.getComponent(VSelect), 'update:modelValue', 'no_defect_found');
        await flushPromises();
        await wrapper.get('[data-test=return-decline-form]').trigger('submit');
        await flushPromises();

        expect(wrapper.emitted('changed')).toBeUndefined();
        expect(wrapper.get('[data-test=return-move-error]').text()).toContain('connection lost');
    });

    it('shows the general error when a receive is rejected with no field errors', async () => {
        const { wrapper, store } = mountActions(
            aReturn({
                actions: {
                    approve: false,
                    decline: false,
                    receive: true,
                    close: false,
                    cancel: false
                }
            })
        );
        vi.mocked(store.receive).mockRejectedValue(new Error('already received'));

        await wrapper.get('[data-test=return-receive-form]').trigger('submit');
        await flushPromises();

        expect(wrapper.get('[data-test=return-move-error]').text()).toContain('already received');
    });

    it('puts a field error the server names on its field, with no general error', async () => {
        const { wrapper, store } = mountActions(
            aReturn({
                actions: {
                    approve: false,
                    decline: false,
                    receive: true,
                    close: false,
                    cancel: false
                }
            })
        );
        vi.mocked(store.receive).mockRejectedValue(
            aProblem(422, [
                {
                    code: 'VALIDATION_ERROR',
                    message: 'Deduction exceeds the refund',
                    details: { field: 'handlingDeduction' },
                    field: 'handlingDeduction'
                }
            ])
        );

        await wrapper.get('[data-test=return-receive-deduction] input').setValue('99');
        await wrapper.get('[data-test=return-receive-form]').trigger('submit');
        await flushPromises();

        expect(wrapper.get('[data-test=return-receive-deduction]').text()).toContain(
            'Deduction exceeds the refund'
        );
        expect(wrapper.find('[data-test=return-move-error]').exists()).toBe(false);
    });

    it('offers the hand close only when the server says it would work', () => {
        const idle = mountActions(aReturn());
        const open = mountActions(
            aReturn({
                status: 'received',
                actions: {
                    approve: false,
                    decline: false,
                    receive: false,
                    close: true,
                    cancel: false
                }
            })
        );

        expect(idle.wrapper.find('[data-test=return-close-form]').exists()).toBe(false);
        expect(open.wrapper.find('[data-test=return-close-form]').exists()).toBe(true);
    });

    it('closes with no note when none is written, and tells the page', async () => {
        const { wrapper, store } = mountActions(
            aReturn({
                status: 'received',
                actions: {
                    approve: false,
                    decline: false,
                    receive: false,
                    close: true,
                    cancel: false
                }
            })
        );

        await wrapper.get('[data-test=return-close-form]').trigger('submit');
        await flushPromises();

        expect(store.close).toHaveBeenCalledWith('r1', undefined);
        expect(wrapper.emitted('changed')).toHaveLength(1);
    });

    it('closes with the note the staff member wrote', async () => {
        const { wrapper, store } = mountActions(
            aReturn({
                status: 'received',
                actions: {
                    approve: false,
                    decline: false,
                    receive: false,
                    close: true,
                    cancel: false
                }
            })
        );

        await wrapper.get('[data-test=return-close-note] input').setValue('Paid in cash');
        await wrapper.get('[data-test=return-close-form]').trigger('submit');
        await flushPromises();

        expect(store.close).toHaveBeenCalledWith('r1', 'Paid in cash');
    });

    it('shows a refused close in place and tells nobody', async () => {
        const { wrapper, store } = mountActions(
            aReturn({
                status: 'received',
                actions: {
                    approve: false,
                    decline: false,
                    receive: false,
                    close: true,
                    cancel: false
                }
            })
        );
        vi.mocked(store.close).mockRejectedValue(
            aProblem(409, [{ code: 'RETURN_NOT_CLOSABLE', message: 'Already closed.' }])
        );

        await wrapper.get('[data-test=return-close-form]').trigger('submit');
        await flushPromises();

        expect(wrapper.get('[data-test=return-move-error]').text()).toContain('Already closed.');
        expect(wrapper.emitted('changed')).toBeUndefined();
    });

    it('offers the cancel only when the server says it would work', () => {
        const idle = mountActions(aReturn());
        const open = mountActions(
            aReturn({
                status: 'approved',
                actions: {
                    approve: false,
                    decline: false,
                    receive: false,
                    close: false,
                    cancel: true
                }
            })
        );

        expect(idle.wrapper.find('[data-test=return-cancel-form]').exists()).toBe(false);
        expect(open.wrapper.find('[data-test=return-cancel-form]').exists()).toBe(true);
    });

    it('cancels with no note when none is written, and tells the page', async () => {
        const { wrapper, store } = mountActions(
            aReturn({
                status: 'approved',
                actions: {
                    approve: false,
                    decline: false,
                    receive: false,
                    close: false,
                    cancel: true
                }
            })
        );

        await wrapper.get('[data-test=return-cancel-form]').trigger('submit');
        await flushPromises();

        expect(store.cancel).toHaveBeenCalledWith('r1', undefined);
        expect(wrapper.emitted('changed')).toHaveLength(1);
    });

    it('cancels with the note the staff member wrote', async () => {
        const { wrapper, store } = mountActions(
            aReturn({
                status: 'approved',
                actions: {
                    approve: false,
                    decline: false,
                    receive: false,
                    close: false,
                    cancel: true
                }
            })
        );

        await wrapper.get('[data-test=return-cancel-note] input').setValue('Never sent');
        await wrapper.get('[data-test=return-cancel-form]').trigger('submit');
        await flushPromises();

        expect(store.cancel).toHaveBeenCalledWith('r1', 'Never sent');
    });

    it('shows a refused cancel in place and tells nobody', async () => {
        const { wrapper, store } = mountActions(
            aReturn({
                status: 'approved',
                actions: {
                    approve: false,
                    decline: false,
                    receive: false,
                    close: false,
                    cancel: true
                }
            })
        );
        vi.mocked(store.cancel).mockRejectedValue(
            aProblem(409, [{ code: 'RETURN_NOT_CANCELABLE', message: 'Already canceled.' }])
        );

        await wrapper.get('[data-test=return-cancel-form]').trigger('submit');
        await flushPromises();

        expect(wrapper.get('[data-test=return-move-error]').text()).toContain('Already canceled.');
        expect(wrapper.emitted('changed')).toBeUndefined();
    });

    it('receives with a lowered restock count for a broken line, and nothing else', async () => {
        const { wrapper, store } = mountActions(
            aReturn({
                actions: {
                    approve: false,
                    decline: false,
                    receive: true,
                    close: false,
                    cancel: false
                }
            })
        );

        await wrapper.get('[data-test=return-receive-restock-p1] input').setValue('0');
        await wrapper.get('[data-test=return-receive-form]').trigger('submit');
        await flushPromises();

        expect(store.receive).toHaveBeenCalledWith('r1', {
            lines: [{ productId: 'p1', restock: 0 }]
        });
    });

    it('prefills each line with its quantity and sends the deduction beside a lowered count', async () => {
        const { wrapper, store } = mountActions(
            aReturn({
                lines: [
                    { productId: 'p1', quantity: 3, title: 'Shirt', unitPrice: 30 },
                    { productId: 'p2', quantity: 1, title: 'Mug', unitPrice: 10 }
                ],
                actions: {
                    approve: false,
                    decline: false,
                    receive: true,
                    close: false,
                    cancel: false
                }
            })
        );
        expect(
            (wrapper.get('[data-test=return-receive-restock-p1] input').element as HTMLInputElement)
                .value
        ).toBe('3');

        await wrapper.get('[data-test=return-receive-restock-p1] input').setValue('2');
        await wrapper.get('[data-test=return-receive-deduction] input').setValue('4.5');
        await wrapper.get('[data-test=return-receive-form]').trigger('submit');
        await flushPromises();

        expect(store.receive).toHaveBeenCalledWith('r1', {
            handlingDeduction: 4.5,
            lines: [{ productId: 'p1', restock: 2 }]
        });
    });

    it('refuses a restock count over the line, and sends nothing', async () => {
        const { wrapper, store } = mountActions(
            aReturn({
                actions: {
                    approve: false,
                    decline: false,
                    receive: true,
                    close: false,
                    cancel: false
                }
            })
        );

        await wrapper.get('[data-test=return-receive-restock-p1] input').setValue('2');
        await wrapper.get('[data-test=return-receive-form]').trigger('submit');
        await flushPromises();

        expect(store.receive).not.toHaveBeenCalled();
        expect(wrapper.get('[data-test=return-receive-restock-error]').text()).toContain(
            'whole number from 0'
        );
    });

    it('shows staff how many units went back on sale, and shows the buyer nothing', () => {
        const received = aReturn({
            status: 'closed',
            lines: [{ productId: 'p1', quantity: 2, title: 'Shirt', unitPrice: 30, restocked: 1 }]
        });
        const buyerView = mountActions(received);
        expect(buyerView.wrapper.find('[data-test=return-restocked]').exists()).toBe(false);

        const session = useSessionStore();
        session.accessToken = 'test-token';
        session.viewer = { id: 'u2', email: 'staff@example.com', role: 'owner' };
        session.setAbilities({ tenant: [['read', 'Return']], platform: [] });
        const staffView = mountActions(received);

        expect(staffView.wrapper.get('[data-test=return-restocked]').text()).toContain(
            'Shirt: restocked 1 of 2'
        );
    });

    it('declines with a code and the message beside it', async () => {
        const { wrapper, store } = mountActions(
            aReturn({
                status: 'requested',
                actions: {
                    approve: true,
                    decline: true,
                    receive: false,
                    close: false,
                    cancel: false
                }
            })
        );

        emitOn(wrapper.getComponent(VSelect), 'update:modelValue', 'other');
        await wrapper
            .get('[data-test=return-decline-message] textarea')
            .setValue('Sold as a bundle');
        await wrapper.get('[data-test=return-decline-form]').trigger('submit');
        await flushPromises();

        expect(store.decline).toHaveBeenCalledWith('r1', 'other', 'Sold as a bundle');
    });

    it('asks for a message when the code is other, and sends nothing without it', async () => {
        const { wrapper, store } = mountActions(
            aReturn({
                status: 'requested',
                actions: {
                    approve: true,
                    decline: true,
                    receive: false,
                    close: false,
                    cancel: false
                }
            })
        );

        emitOn(wrapper.getComponent(VSelect), 'update:modelValue', 'other');
        await wrapper.get('[data-test=return-decline-form]').trigger('submit');
        await flushPromises();

        expect(store.decline).not.toHaveBeenCalled();
        expect(wrapper.get('[data-test=return-decline-form]').text()).toContain(
            'Write a message to the buyer'
        );
    });
});
