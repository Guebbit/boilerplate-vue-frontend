/**
 * @module
 * `ReportLostDialog.vue` — staff reporting a parcel lost or damaged. Mounts the real dialog with
 * `v-dialog` stubbed inline and the store's `markLost` spied. Covered: no report without a reason,
 * the two reasons on offer, the note and the buyer's message sent apart and trimmed, the optional
 * fields left out when empty, and a refusal staying in the dialog.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { VSelect } from 'vuetify/components';
import { createPinia, setActivePinia } from 'pinia';
import ReportLostDialog from '../components/ReportLostDialog.vue';
import { useDeliveryStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { emitOn, nextRenderTick } from '../../../../tests/support/unit/mounted-vm.ts';
import { aShipment } from '../../../../tests/support/unit/fixtures.ts';

wireModulesIntoCore();

/**
 * Mounts the dialog closed, then opens it through `v-model`.
 *
 * @returns The wrapper and the spied `markLost`.
 */
const openDialog = () => {
    const markLost = vi.spyOn(useDeliveryStore(), 'markLost').mockResolvedValue(aShipment());
    const wrapper = mount(ReportLostDialog, {
        props: { modelValue: false, shipment: aShipment() },
        global: {
            plugins: [vuetify, i18n],
            stubs: { VDialog: { template: '<div><slot /></div>' } }
        }
    });
    return wrapper.setProps({ modelValue: true }).then(() => ({ wrapper, markLost }));
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('ReportLostDialog', () => {
    it('cannot be sent until a reason is chosen', () =>
        openDialog().then(({ wrapper, markLost }) => {
            expect(
                wrapper.get('[data-test=report-lost-submit]').attributes('disabled')
            ).toBeDefined();
            return wrapper
                .get('form')
                .trigger('submit')
                .then(() => {
                    expect(markLost).not.toHaveBeenCalled();
                });
        }));

    it('offers lost and damaged', () =>
        openDialog().then(({ wrapper }) => {
            const items = wrapper.findComponent(VSelect).props('items') as { value: string }[];

            expect(items.map(({ value }) => value)).toEqual(['lost', 'damaged']);
        }));

    it('sends the reason, the note and the buyer’s message apart, trimmed, then closes', () =>
        openDialog().then(({ wrapper, markLost }) => {
            emitOn(wrapper.findComponent(VSelect), 'update:modelValue', 'damaged');
            return nextRenderTick(wrapper)
                .then(() =>
                    wrapper.get('[data-test=report-lost-note] textarea').setValue(' box crushed ')
                )
                .then(() =>
                    wrapper
                        .get('[data-test=report-lost-message] textarea')
                        .setValue(' Sending it again. ')
                )
                .then(() => wrapper.get('form').trigger('submit'))
                .then(() => nextRenderTick(wrapper))
                .then(() => {
                    expect(markLost).toHaveBeenCalledWith('s1', {
                        reason: 'damaged',
                        note: 'box crushed',
                        message: 'Sending it again.'
                    });
                    expect(wrapper.emitted('reported')).toHaveLength(1);
                    expect(wrapper.emitted('update:modelValue')).toEqual([[false]]);
                });
        }));

    it('leaves both texts out when empty, and shows a refusal in place', () =>
        openDialog().then(({ wrapper, markLost }) => {
            markLost.mockRejectedValue(new Error('DELIVERY_NOT_LOSABLE'));
            emitOn(wrapper.findComponent(VSelect), 'update:modelValue', 'lost');
            return nextRenderTick(wrapper)
                .then(() => wrapper.get('form').trigger('submit'))
                .then(() => nextRenderTick(wrapper))
                .then(() => {
                    expect(markLost).toHaveBeenCalledWith('s1', { reason: 'lost' });
                    expect(wrapper.get('[data-test=report-lost-error]').text()).toContain(
                        'DELIVERY_NOT_LOSABLE'
                    );
                    expect(wrapper.emitted('reported')).toBeUndefined();
                });
        }));
});
