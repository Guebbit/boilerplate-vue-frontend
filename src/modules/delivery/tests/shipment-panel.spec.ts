/**
 * @module
 * `ShipmentPanel.vue` — the order page's shipping corner. Mounts the real panel (and the real
 * cards under it) with the delivery store's own fetches stubbed.
 *
 * Scoped to the panel's own logic: which cards render for THIS order, the "arrives in N
 * shipments" line, the order-level "start fulfilment" door and the re-fetch on a new `orderId`.
 * The cards' own buttons are `fulfillment-order-card.spec.ts`'s; the store calls are
 * `store.spec.ts`'s; the server's own eligibility rules behind every `actions` flag are the
 * backend's.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ShipmentPanel from '../components/ShipmentPanel.vue';
import { useDeliveryStore } from '../store.ts';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { nextRenderTick } from '../../../../tests/support/unit/mounted-vm.ts';
import { aFulfillmentOrder, aShipment } from '../../../../tests/support/unit/fixtures.ts';

wireModulesIntoCore();

/**
 * Mounts the panel with the delivery store's own fetches stubbed — spied BEFORE mounting: the
 * panel calls them at setup with the reference the store held at that point.
 *
 * @param props - `orderId` plus whatever each case overrides.
 * @returns The wrapper and the store.
 */
const mountPanel = (props: { orderId: string; canStart?: boolean }) => {
    const store = useDeliveryStore();
    vi.spyOn(store, 'fetchMethods').mockResolvedValue(undefined);
    vi.spyOn(store, 'fetchFulfillmentForOrder').mockResolvedValue(undefined);

    const wrapper = mount(ShipmentPanel, {
        props,
        global: { plugins: [vuetify, i18n] }
    });
    return { wrapper, store };
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('what the panel lists', () => {
    it('says nothing has shipped yet while there is no fulfillment order', () => {
        const { wrapper } = mountPanel({ orderId: 'o1' });

        expect(wrapper.find('[data-test=fulfillment-order-card]').exists()).toBe(false);
        expect(wrapper.get('[data-test=shipment-panel-empty]').text()).toContain('Nothing to ship');
    });

    it('renders one card per fulfillment order, each with only its own shipments', () => {
        const { wrapper, store } = mountPanel({ orderId: 'o1' });
        store.fulfillmentOrders = [
            aFulfillmentOrder({ id: 'fo1', number: 1 }),
            aFulfillmentOrder({ id: 'fo2', number: 2 })
        ];
        store.shipments = [
            aShipment({ id: 's1', fulfillmentOrderId: 'fo1' }),
            aShipment({ id: 's2', fulfillmentOrderId: 'fo1', number: 2 })
        ];

        return nextRenderTick(wrapper).then(() => {
            const cards = wrapper.findAll('[data-test=fulfillment-order-card]');
            expect(cards).toHaveLength(2);
            expect(cards[0]?.findAll('[data-test=shipment-row]')).toHaveLength(2);
            expect(cards[1]?.findAll('[data-test=shipment-row]')).toHaveLength(0);
        });
    });

    /**
     * The store's lists are shared across every order this instance is ever given: a slow
     * response for the order just left must not render as this one's.
     */
    it('refuses to show a record left over from another order', () => {
        const { wrapper, store } = mountPanel({ orderId: 'o2' });
        store.fulfillmentOrders = [aFulfillmentOrder({ orderId: 'o1' })];

        return nextRenderTick(wrapper).then(() => {
            expect(wrapper.find('[data-test=fulfillment-order-card]').exists()).toBe(false);
        });
    });
});

describe('"arrives in N shipments"', () => {
    it('is said only when there are two or more', () => {
        const { wrapper, store } = mountPanel({ orderId: 'o1' });
        store.fulfillmentOrders = [aFulfillmentOrder({ id: 'fo1' })];

        return nextRenderTick(wrapper)
            .then(() => {
                expect(wrapper.find('[data-test=shipment-count]').exists()).toBe(false);
                store.fulfillmentOrders = [
                    aFulfillmentOrder({ id: 'fo1' }),
                    aFulfillmentOrder({ id: 'fo2', number: 2 })
                ];
                return nextRenderTick(wrapper);
            })
            .then(() => {
                expect(wrapper.get('[data-test=shipment-count]').text()).toBe(
                    'Arrives in 2 shipments'
                );
            });
    });
});

describe('the start-fulfilment door', () => {
    it('offers "Start fulfilment" only when `actions.start` says so', () => {
        expect(
            mountPanel({ orderId: 'o1', canStart: true })
                .wrapper.find('[data-test=mark-started]')
                .exists()
        ).toBe(true);
        expect(
            mountPanel({ orderId: 'o1', canStart: false })
                .wrapper.find('[data-test=mark-started]')
                .exists()
        ).toBe(false);
    });

    it('starts, re-reads the fulfilment (every `actions` flag depends on the order) and emits `moved`', () => {
        const { wrapper, store } = mountPanel({ orderId: 'o1', canStart: true });
        const start = vi.spyOn(store, 'start').mockResolvedValue(undefined);

        return wrapper
            .get('[data-test=mark-started]')
            .trigger('click')
            .then(() => nextRenderTick(wrapper))
            .then(() => {
                expect(start).toHaveBeenCalledWith('o1');
                expect(store.fetchFulfillmentForOrder).toHaveBeenCalledTimes(2);
                expect(wrapper.emitted('moved')).toHaveLength(1);
            });
    });

    it('shows a refusal as the inline error, instead of silently doing nothing', () => {
        const { wrapper, store } = mountPanel({ orderId: 'o1', canStart: true });
        vi.spyOn(store, 'start').mockRejectedValue(new Error('not paid'));

        return wrapper
            .get('[data-test=mark-started]')
            .trigger('click')
            .then(() => nextRenderTick(wrapper))
            .then(() => {
                expect(wrapper.get('[data-test=shipment-panel-error]').text()).toContain(
                    'not paid'
                );
                expect(wrapper.emitted('moved')).toBeUndefined();
            });
    });
});

describe('following the order', () => {
    it('re-fetches when orderId changes without a remount', () => {
        const { wrapper, store } = mountPanel({ orderId: 'o1' });
        expect(store.fetchFulfillmentForOrder).toHaveBeenCalledWith('o1');

        return wrapper.setProps({ orderId: 'o2' }).then(() => {
            expect(store.fetchFulfillmentForOrder).toHaveBeenCalledWith('o2');
        });
    });
});
