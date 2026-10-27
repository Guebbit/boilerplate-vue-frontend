/**
 * @module
 * Recording a withdrawal the buyer stated outside the shop: both the day and the channel are
 * required, the day is never in the future, and what is sent is an instant plus the channel. The
 * store's `openReturn` is spied; the step-up prompt is the http layer's.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { VSelect } from 'vuetify/components';
import RecordWithdrawalDialog from '../components/RecordWithdrawalDialog.vue';
import { useReturnsStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aReturn, aProblem } from '../../../../tests/support/unit/fixtures.ts';
import { emitOn } from '../../../../tests/support/unit/mounted-vm.ts';

wireModulesIntoCore();

/**
 * Mounts the dialog open, with `openReturn` spied.
 */
const mountDialog = () => {
    const openReturn = vi.spyOn(useReturnsStore(), 'openReturn').mockResolvedValue(aReturn());
    const wrapper = mount(RecordWithdrawalDialog, {
        props: { modelValue: true, orderId: 'o1' },
        global: {
            plugins: [vuetify, i18n],
            stubs: { VDialog: { template: '<div><slot /></div>' } }
        },
        attachTo: document.body
    });
    return { wrapper, openReturn };
};

/**
 * Types the day and picks the channel.
 *
 * @param wrapper - the mounted dialog
 * @param day - a `datetime-local` value, or empty
 * @param channel - a channel, or empty
 */
const fill = async (
    wrapper: ReturnType<typeof mountDialog>['wrapper'],
    day: string,
    channel: string
) => {
    await wrapper.get('[data-test=stated-at-date] input').setValue(day);
    emitOn(wrapper.getComponent(VSelect), 'update:modelValue', channel);
    await flushPromises();
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('RecordWithdrawalDialog', () => {
    it('sends the stated day as an instant, with the channel, and tells the page', async () => {
        const { wrapper, openReturn } = mountDialog();

        await fill(wrapper, '2026-01-02T03:04', 'phone');
        await wrapper.get('[data-test=record-withdrawal-form]').trigger('submit');
        await flushPromises();

        expect(openReturn).toHaveBeenCalledWith({
            orderId: 'o1',
            reason: 'withdrawal',
            requestedAt: new Date(2026, 0, 2, 3, 4).toISOString(),
            statedVia: 'phone'
        });
        expect(wrapper.emitted('recorded')).toHaveLength(1);
    });

    it.each([
        ['no day', '', 'email'],
        ['no channel', '2026-01-02T03:04', ''],
        ['a day in the future', '2999-01-01T00:00', 'letter']
    ])('sends nothing with %s', async (_name, day, channel) => {
        const { wrapper, openReturn } = mountDialog();

        await fill(wrapper, day, channel);
        await wrapper.get('[data-test=record-withdrawal-form]').trigger('submit');
        await flushPromises();

        expect(openReturn).not.toHaveBeenCalled();
        expect(wrapper.emitted('recorded')).toBeUndefined();
    });

    it('keeps a refusal in the dialog, such as a window that was already closed that day', async () => {
        const { wrapper, openReturn } = mountDialog();
        openReturn.mockRejectedValue(
            aProblem(409, [{ code: 'RETURN_WINDOW_CLOSED', message: 'Window closed.' }])
        );

        await fill(wrapper, '2026-01-02T03:04', 'other');
        await wrapper.get('[data-test=record-withdrawal-form]').trigger('submit');
        await flushPromises();

        expect(wrapper.get('[data-test=record-withdrawal-error]').text()).toContain(
            'Window closed.'
        );
        expect(wrapper.emitted('recorded')).toBeUndefined();
    });
});
