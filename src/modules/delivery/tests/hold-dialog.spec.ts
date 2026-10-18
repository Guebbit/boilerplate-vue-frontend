/**
 * @module
 * `HoldDialog.vue` — staff holding a fulfillment order back. Mounts the real dialog with
 * `v-dialog` stubbed inline and the store's `hold` spied. Covered: no hold without a reason,
 * `awaiting_stock` never on offer, the optional note, and a refusal staying in the dialog.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { VSelect } from 'vuetify/components';
import { createPinia, setActivePinia } from 'pinia';
import HoldDialog from '../components/HoldDialog.vue';
import { useDeliveryStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { emitOn, nextRenderTick } from '../../../../tests/support/unit/mounted-vm.ts';
import { aFulfillmentOrder } from '../../../../tests/support/unit/fixtures.ts';

wireModulesIntoCore();

/**
 * Mounts the dialog closed, then opens it through `v-model`.
 *
 * @returns The wrapper and the spied `hold`.
 */
const openDialog = () => {
    const hold = vi.spyOn(useDeliveryStore(), 'hold').mockResolvedValue(aFulfillmentOrder());
    const wrapper = mount(HoldDialog, {
        props: { modelValue: false, fulfillmentOrder: aFulfillmentOrder() },
        global: {
            plugins: [vuetify, i18n],
            stubs: { VDialog: { template: '<div><slot /></div>' } }
        }
    });
    return wrapper.setProps({ modelValue: true }).then(() => ({ wrapper, hold }));
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('HoldDialog', () => {
    it('cannot be sent until a reason is chosen', () =>
        openDialog().then(({ wrapper, hold }) => {
            expect(wrapper.get('[data-test=hold-submit]').attributes('disabled')).toBeDefined();
            return wrapper
                .get('form')
                .trigger('submit')
                .then(() => {
                    expect(hold).not.toHaveBeenCalled();
                });
        }));

    it('offers the three staff reasons and never awaiting_stock', () =>
        openDialog().then(({ wrapper }) => {
            const items = wrapper.findComponent(VSelect).props('items') as { value: string }[];

            expect(items.map(({ value }) => value)).toEqual([
                'incorrect_address',
                'high_risk',
                'other'
            ]);
        }));

    it('sends the reason and a trimmed note, then closes and tells the page', () =>
        openDialog().then(({ wrapper, hold }) => {
            emitOn(wrapper.findComponent(VSelect), 'update:modelValue', 'high_risk');
            return nextRenderTick(wrapper)
                .then(() => wrapper.get('[data-test=hold-note] textarea').setValue('  check card '))
                .then(() => wrapper.get('form').trigger('submit'))
                .then(() => nextRenderTick(wrapper))
                .then(() => {
                    expect(hold).toHaveBeenCalledWith('fo1', {
                        reason: 'high_risk',
                        note: 'check card'
                    });
                    expect(wrapper.emitted('held')).toHaveLength(1);
                    expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
                });
        }));

    it('sends the buyer’s message apart from the staff note', () =>
        openDialog().then(({ wrapper, hold }) => {
            emitOn(wrapper.findComponent(VSelect), 'update:modelValue', 'high_risk');
            return nextRenderTick(wrapper)
                .then(() => wrapper.get('[data-test=hold-note] textarea').setValue('odd voice'))
                .then(() =>
                    wrapper.get('[data-test=hold-message] textarea').setValue(' Back soon. ')
                )
                .then(() => wrapper.get('form').trigger('submit'))
                .then(() => nextRenderTick(wrapper))
                .then(() => {
                    expect(hold).toHaveBeenCalledWith('fo1', {
                        reason: 'high_risk',
                        note: 'odd voice',
                        message: 'Back soon.'
                    });
                });
        }));

    it('leaves the note out when it is empty, and shows a refusal in place', () =>
        openDialog().then(({ wrapper, hold }) => {
            hold.mockRejectedValue(new Error('DELIVERY_NOT_HOLDABLE'));
            emitOn(wrapper.findComponent(VSelect), 'update:modelValue', 'other');
            return nextRenderTick(wrapper)
                .then(() => wrapper.get('form').trigger('submit'))
                .then(() => nextRenderTick(wrapper))
                .then(() => {
                    expect(hold).toHaveBeenCalledWith('fo1', { reason: 'other' });
                    expect(wrapper.get('[data-test=hold-error]').text()).toContain(
                        'DELIVERY_NOT_HOLDABLE'
                    );
                    expect(wrapper.emitted('held')).toBeUndefined();
                });
        }));
});
