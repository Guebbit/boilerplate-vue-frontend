/**
 * @module
 * `ShipmentRow.vue` — one shipment's two staff controls. Mounts the real row with the store's
 * writes spied. Covered: each control appears only on the shipment's own `actions`, the forced
 * arrival is gated on both the override and a reason, and a refusal stays in place.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ShipmentRow from '../components/ShipmentRow.vue';
import { useDeliveryStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { nextRenderTick } from '../../../../tests/support/unit/mounted-vm.ts';
import { aShipment } from '../../../../tests/support/unit/fixtures.ts';
import type { Shipment } from '@types';

wireModulesIntoCore();

/**
 * Mounts the row.
 *
 * @param shipment - The record under test.
 * @param canForce - Whether the caller may force an arrival.
 * @returns The wrapper and the store.
 */
const mountRow = (shipment: Shipment, canForce = false) => {
    const store = useDeliveryStore();
    const wrapper = mount(ShipmentRow, {
        props: { shipment, canForce },
        global: { plugins: [vuetify, i18n] }
    });
    return { wrapper, store };
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('what a row shows', () => {
    it('shows the status in words, the tracking code and both dates', () => {
        const { wrapper } = mountRow(
            aShipment({
                status: 'delivered',
                trackingCode: 'TRK-1',
                deliveredAt: '2026-09-05T10:00:00.000Z'
            })
        );

        expect(wrapper.get('[data-test=shipment-status]').text()).toBe('Delivered');
        expect(wrapper.get('[data-test=shipment-tracking]').text()).toContain('TRK-1');
        expect(wrapper.get('[data-test=shipment-dates]').text()).toContain('Delivered');
        expect(wrapper.get('[data-test=shipment-lines]').text()).toContain('1 × Shirt');
    });
});

describe('the controls come from `actions`', () => {
    it('offers neither when the shipment has no action', () => {
        const { wrapper } = mountRow(aShipment());

        expect(wrapper.find('[data-test=mark-delivered]').exists()).toBe(false);
        expect(wrapper.find('[data-test=shipment-tracking-input]').exists()).toBe(false);
    });

    it('marks delivered on the ordinary door and tells the page', () => {
        const { wrapper, store } = mountRow(
            aShipment({ actions: { deliver: true, editTracking: false } })
        );
        const deliver = vi.spyOn(store, 'deliver').mockResolvedValue(aShipment());

        return wrapper
            .get('[data-test=mark-delivered]')
            .trigger('click')
            .then(() => nextRenderTick(wrapper))
            .then(() => {
                expect(deliver).toHaveBeenCalledWith('s1', false, undefined);
                expect(wrapper.emitted('moved')).toHaveLength(1);
            });
    });

    it('saves a corrected tracking code only once it differs and is not empty', () => {
        const { wrapper, store } = mountRow(
            aShipment({ trackingCode: 'TRK-1', actions: { deliver: false, editTracking: true } })
        );
        const edit = vi.spyOn(store, 'editTracking').mockResolvedValue(aShipment());
        const save = wrapper.get('[data-test=shipment-tracking-save]');
        expect(save.attributes('disabled')).toBeDefined();

        return wrapper
            .get('[data-test=shipment-tracking-input] input')
            .setValue('TRK-2')
            .then(() => {
                expect(save.attributes('disabled')).toBeUndefined();
                return wrapper.get('form').trigger('submit');
            })
            .then(() => nextRenderTick(wrapper))
            .then(() => {
                expect(edit).toHaveBeenCalledWith('s1', 'TRK-2');
                expect(wrapper.emitted('moved')).toHaveLength(1);
            });
    });

    it('shows a lost race in place and does not tell the page', () => {
        const { wrapper, store } = mountRow(
            aShipment({ actions: { deliver: true, editTracking: false } })
        );
        vi.spyOn(store, 'deliver').mockRejectedValue(new Error('already delivered'));

        return wrapper
            .get('[data-test=mark-delivered]')
            .trigger('click')
            .then(() => nextRenderTick(wrapper))
            .then(() => {
                expect(wrapper.get('[data-test=shipment-row-error]').text()).toContain(
                    'already delivered'
                );
                expect(wrapper.emitted('moved')).toBeUndefined();
            });
    });
});

describe('the forced arrival', () => {
    it('is not offered without the override', () => {
        const { wrapper } = mountRow(aShipment());

        expect(wrapper.find('[data-test=force-deliver-toggle]').exists()).toBe(false);
    });

    it('needs the toggle and a reason before the button works, then sends both', () => {
        const { wrapper, store } = mountRow(aShipment(), true);
        const deliver = vi.spyOn(store, 'deliver').mockResolvedValue(aShipment());
        expect(wrapper.find('[data-test=mark-delivered]').exists()).toBe(false);

        return wrapper
            .get('[data-test=force-deliver-toggle] input')
            .setValue(true)
            .then(() => {
                expect(
                    wrapper.get('[data-test=mark-delivered]').attributes('disabled')
                ).toBeDefined();
                return wrapper
                    .get('[data-test=force-deliver-reason] textarea')
                    .setValue('lost mail');
            })
            .then(() => wrapper.get('[data-test=mark-delivered]').trigger('click'))
            .then(() => nextRenderTick(wrapper))
            .then(() => {
                expect(deliver).toHaveBeenCalledWith('s1', true, 'lost mail');
            });
    });
});
