/**
 * @module
 * `ShipmentRow.vue` — one shipment's two staff controls. Mounts the real row with the store's
 * writes spied. Covered: each control appears only on the shipment's own `actions`, and a refusal stays in place.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ShipmentRow from '../components/ShipmentRow.vue';
import { formatAddressLine } from '@/infrastructure/utils/formatters.ts';
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
 * @returns The wrapper and the store.
 */
const mountRow = (shipment: Shipment, orderAddress?: string) => {
    const store = useDeliveryStore();
    const wrapper = mount(ShipmentRow, {
        props: { shipment, orderAddress },
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

describe('a parcel reported lost', () => {
    const lost = {
        status: 'lost' as const,
        lostAt: '2026-09-03T10:00:00.000Z',
        lostReason: 'lost' as const,
        lostMessage: 'We are sending a new one on Monday.'
    };

    it('says so in words, with the message the buyer was given', () => {
        const { wrapper } = mountRow(aShipment(lost));

        expect(wrapper.get('[data-test=shipment-status]').text()).toBe('Lost in transit');
        expect(wrapper.get('[data-test=shipment-lost-reason]').text()).toContain('Lost');
        expect(wrapper.get('[data-test=shipment-lost-message]').text()).toContain(
            'sending a new one on Monday'
        );
    });

    it('shows staff note only when the server sent it', () => {
        const buyer = mountRow(aShipment(lost));
        const staff = mountRow(aShipment({ ...lost, lostNote: 'carrier claim 42' }));

        expect(buyer.wrapper.find('[data-test=shipment-lost-note]').exists()).toBe(false);
        expect(staff.wrapper.get('[data-test=shipment-lost-note]').text()).toContain(
            'carrier claim 42'
        );
    });

    it('names a damaged parcel as damaged', () => {
        const { wrapper } = mountRow(aShipment({ ...lost, lostReason: 'damaged' }));

        expect(wrapper.get('[data-test=shipment-lost-reason]').text()).toContain('Damaged');
    });

    it('offers the arrival only while the server says the parcel can still arrive', () => {
        const stuck = mountRow(aShipment(lost));
        const open = mountRow(
            aShipment({
                ...lost,
                actions: { deliver: true, update: true, markLost: false }
            })
        );

        expect(stuck.wrapper.find('[data-test=mark-delivered]').exists()).toBe(false);
        expect(open.wrapper.find('[data-test=mark-delivered]').exists()).toBe(true);
    });
});

describe('reporting a loss', () => {
    it('offers the button only on the server’s markLost flag', () => {
        const offered = mountRow(
            aShipment({
                actions: { deliver: true, update: true, markLost: true }
            })
        );
        const absent = mountRow(aShipment());

        expect(offered.wrapper.find('[data-test=open-report-lost]').exists()).toBe(true);
        expect(absent.wrapper.find('[data-test=open-report-lost]').exists()).toBe(false);
    });
});

describe('where the parcel went', () => {
    const OLD = {
        fullName: 'Ada Lovelace',
        street: '12 Analytical Engine Rd',
        city: 'Milano',
        zip: '20100',
        country: 'IT'
    };

    it('names the destination when the order now ships elsewhere', () => {
        const { wrapper } = mountRow(aShipment({ destination: OLD }), 'Someone, 1 New St, Roma');

        expect(wrapper.get('[data-test=shipment-destination]').text()).toContain(
            '12 Analytical Engine Rd'
        );
    });

    it('says nothing while the destination is still where the order ships, or when there is none', () => {
        const matching = mountRow(aShipment({ destination: OLD }), formatAddressLine(OLD));

        expect(matching.wrapper.find('[data-test=shipment-destination]').exists()).toBe(false);
        expect(
            mountRow(aShipment()).wrapper.find('[data-test=shipment-destination]').exists()
        ).toBe(false);
    });
});

describe('a tracked parcel still waiting for its code', () => {
    it('shows the missing-code chip only while the server says it is awaiting one', () => {
        const waiting = mountRow(aShipment({ awaitingTracking: true }));
        const coded = mountRow(aShipment({ trackingCode: 'TRK-1' }));

        expect(waiting.wrapper.get('[data-test=shipment-awaiting-tracking]').text()).toBe(
            'Tracking code missing'
        );
        expect(coded.wrapper.find('[data-test=shipment-awaiting-tracking]').exists()).toBe(false);
    });

    it('sets the first code from the same form, even once delivered', () => {
        const { wrapper, store } = mountRow(
            aShipment({
                status: 'delivered',
                awaitingTracking: false,
                actions: { deliver: false, update: true, markLost: false }
            })
        );
        const edit = vi.spyOn(store, 'editTracking').mockResolvedValue(aShipment());

        return wrapper
            .get('[data-test=shipment-tracking-input] input')
            .setValue('TRK-NEW')
            .then(() => wrapper.get('form').trigger('submit'))
            .then(() => nextRenderTick(wrapper))
            .then(() => {
                expect(edit).toHaveBeenCalledWith('s1', 'TRK-NEW');
            });
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
            aShipment({
                actions: { deliver: true, update: false, markLost: false }
            })
        );
        const deliver = vi.spyOn(store, 'deliver').mockResolvedValue(aShipment());

        return wrapper
            .get('[data-test=mark-delivered]')
            .trigger('click')
            .then(() => nextRenderTick(wrapper))
            .then(() => {
                expect(deliver).toHaveBeenCalledWith('s1');
                expect(wrapper.emitted('moved')).toHaveLength(1);
            });
    });

    it('saves a corrected tracking code only once it differs and is not empty', () => {
        const { wrapper, store } = mountRow(
            aShipment({
                trackingCode: 'TRK-1',
                actions: { deliver: false, update: true, markLost: false }
            })
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
            aShipment({
                actions: { deliver: true, update: false, markLost: false }
            })
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
