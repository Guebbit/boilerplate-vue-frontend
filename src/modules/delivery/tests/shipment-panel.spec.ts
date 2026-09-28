/**
 * @module
 * `ShipmentPanel.vue` — the order page's ship/deliver corner. Mounts the real component with the
 * delivery store's own fetches stubbed.
 *
 * Scoped to what is this component's own logic: which of the four template branches renders off
 * the `canShip`/`canDeliver`/`override` props (FA36/B3) — not `deliveryStore.start`/`.ship`/
 * `.deliver` themselves, which `delivery/tests/store.spec.ts` already covers, and not the server's
 * own eligibility rules behind those props, which `orders`' own suites cover.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useCoreStore } from '@guebbit/vue-toolkit';
import ShipmentPanel from '@/modules/delivery/components/ShipmentPanel.vue';
import { useDeliveryStore } from '@/modules/delivery/store.ts';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import { OrderStatus } from '@types';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/**
 * Mounts the panel with the delivery store's own fetches stubbed — spied BEFORE mounting, the
 * same reasoning `order-edit-view.spec.ts` documents: `onMounted` calls them with the reference
 * the store held at that point, so a spy attached after mount would never replace it.
 *
 * @param props - `orderId` plus whatever each case overrides.
 */
const mountPanel = (props: {
    orderId: string;
    shippingMethodId?: string;
    canStart?: boolean;
    canFulfill?: boolean;
    canShip?: boolean;
    canDeliver?: boolean;
    override?: OrderStatus[];
}) => {
    const store = useDeliveryStore();
    vi.spyOn(store, 'fetchMethods').mockResolvedValue(undefined);
    vi.spyOn(store, 'fetchShipmentForOrder').mockResolvedValue(undefined);

    return mount(ShipmentPanel, {
        props,
        global: { plugins: [vuetify, i18n] }
    });
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('the start-fulfilment door (Q6)', () => {
    it('offers "Start fulfilment" when `actions.start` says so', () => {
        const wrapper = mountPanel({ orderId: 'o1', canStart: true });

        expect(wrapper.find('[data-test=mark-started]').exists()).toBe(true);
        expect(wrapper.find('[data-test=mark-shipped]').exists()).toBe(false);
    });

    it('never offers it when `actions.start` is false', () => {
        const wrapper = mountPanel({ orderId: 'o1', canStart: false });

        expect(wrapper.find('[data-test=mark-started]').exists()).toBe(false);
    });

    it('calls the delivery store and emits `moved` on click', () => {
        const start = vi.spyOn(useDeliveryStore(), 'start').mockResolvedValue(undefined);
        const wrapper = mountPanel({ orderId: 'o1', canStart: true });

        return wrapper
            .get('[data-test=mark-started]')
            .trigger('click')
            .then(() => {
                expect(start).toHaveBeenCalledWith('o1');
                expect(wrapper.emitted('moved')).toHaveLength(1);
            });
    });
});

describe('the digital-fulfilment door', () => {
    it('offers "Mark fulfilled" when `actions.fulfill` says so', () => {
        const wrapper = mountPanel({ orderId: 'o1', canFulfill: true });

        expect(wrapper.find('[data-test=mark-fulfilled]').exists()).toBe(true);
        expect(wrapper.find('[data-test=mark-shipped]').exists()).toBe(false);
    });

    it('never offers it when `actions.fulfill` is false', () => {
        const wrapper = mountPanel({ orderId: 'o1', canFulfill: false });

        expect(wrapper.find('[data-test=mark-fulfilled]').exists()).toBe(false);
    });

    it('calls the delivery store and emits `moved` on click', () => {
        const fulfill = vi.spyOn(useDeliveryStore(), 'fulfill').mockResolvedValue(undefined);
        const wrapper = mountPanel({ orderId: 'o1', canFulfill: true });

        return wrapper
            .get('[data-test=mark-fulfilled]')
            .trigger('click')
            .then(() => {
                expect(fulfill).toHaveBeenCalledWith('o1');
                expect(wrapper.emitted('moved')).toHaveLength(1);
            });
    });

    /**
     * The same catch FA35 gave `markShipped`/`markDelivered`, covered for `markFulfilled` too.
     */
    it('shows a 409 as the inline error, instead of silently doing nothing', () => {
        const wrapper = mountPanel({ orderId: 'o1', canFulfill: true });
        vi.spyOn(useDeliveryStore(), 'fulfill').mockRejectedValue(new Error('not digital-only'));

        return wrapper
            .find('[data-test=mark-fulfilled]')
            .trigger('click')
            .then(() => wrapper.vm.$nextTick())
            .then(() => {
                expect(wrapper.find('[data-test=shipment-panel-error]').text()).toContain(
                    'not digital-only'
                );
            });
    });
});

describe('with no shipment yet', () => {
    it('offers the ordinary ship form when `actions.ship` says so', () => {
        const wrapper = mountPanel({ orderId: 'o1', canShip: true });

        expect(wrapper.find('[data-test=mark-shipped]').exists()).toBe(true);
        expect(wrapper.find('[data-test=force-ship-toggle]').exists()).toBe(false);
    });

    it('stays a plain "not shipped yet" notice with neither `actions.ship` nor an override target', () => {
        const wrapper = mountPanel({ orderId: 'o1', canShip: false, override: [] });

        expect(wrapper.find('[data-test=mark-shipped]').exists()).toBe(false);
        expect(wrapper.text()).toContain('Not shipped yet');
    });

    it("offers the force-ship form once the caller's own `actions.override` reaches `shipped`", () => {
        const wrapper = mountPanel({
            orderId: 'o1',
            canShip: false,
            override: [OrderStatus.shipped]
        });

        expect(wrapper.find('[data-test=mark-shipped]').exists()).toBe(true);
        expect(wrapper.find('[data-test=force-ship-toggle]').exists()).toBe(true);
    });

    /**
     * FA35: `ship`/`deliver` used to be `.then` chains with no `.catch` at all — a 422 (tracking
     * required), a 409 (someone shipped it first) or a step-up failure showed nothing.
     */
    it('shows a 409 on ship as the inline error, instead of silently doing nothing', () => {
        const wrapper = mountPanel({ orderId: 'o1', canShip: true });
        vi.spyOn(useDeliveryStore(), 'ship').mockRejectedValue(new Error('already shipped'));

        return wrapper
            .find('[data-test=mark-shipped]')
            .trigger('click')
            .then(() => wrapper.vm.$nextTick())
            .then(() => {
                expect(wrapper.find('[data-test=shipment-panel-error]').text()).toContain(
                    'already shipped'
                );
            });
    });
});

describe('with a shipment already recorded', () => {
    it('offers mark-delivered when `actions.deliver` says so', () => {
        const wrapper = mountPanel({ orderId: 'o1', canDeliver: true });
        useDeliveryStore().shipment = { id: 's1', orderId: 'o1', status: 'shipped' };

        return wrapper.vm.$nextTick().then(() => {
            expect(wrapper.find('[data-test=mark-delivered]').exists()).toBe(true);
        });
    });

    it('offers no further action with neither `actions.deliver` nor an override target', () => {
        const wrapper = mountPanel({ orderId: 'o1', canDeliver: false, override: [] });
        useDeliveryStore().shipment = { id: 's1', orderId: 'o1', status: 'delivered' };

        return wrapper.vm.$nextTick().then(() => {
            expect(wrapper.find('[data-test=mark-delivered]').exists()).toBe(false);
            expect(wrapper.find('[data-test=force-deliver-toggle]').exists()).toBe(false);
        });
    });

    /**
     * The same catch `markShipped` already has, covered for `markDelivered` too.
     */
    it('shows a 409 on deliver as the inline error, instead of silently doing nothing', () => {
        const wrapper = mountPanel({ orderId: 'o1', canDeliver: true });
        useDeliveryStore().shipment = { id: 's1', orderId: 'o1', status: 'shipped' };
        vi.spyOn(useDeliveryStore(), 'deliver').mockRejectedValue(new Error('already delivered'));

        return wrapper.vm
            .$nextTick()
            .then(() => wrapper.find('[data-test=mark-delivered]').trigger('click'))
            .then(() => wrapper.vm.$nextTick())
            .then(() => {
                expect(wrapper.find('[data-test=shipment-panel-error]').text()).toContain(
                    'already delivered'
                );
            });
    });

    /**
     * mark-delivered had no in-flight guard at all — a double click could send two deliver
     * requests while the first was still out.
     */
    it('disables mark-delivered while a deliver call is in flight', () => {
        const wrapper = mountPanel({ orderId: 'o1', canDeliver: true });
        useDeliveryStore().shipment = { id: 's1', orderId: 'o1', status: 'shipped' };

        return wrapper.vm.$nextTick().then(() => {
            expect(
                wrapper.find('[data-test=mark-delivered]').attributes('disabled')
            ).toBeUndefined();
            useCoreStore().setLoading('delivery', true);
            return wrapper.vm.$nextTick().then(() => {
                expect(
                    wrapper.find('[data-test=mark-delivered]').attributes('disabled')
                ).toBeDefined();
            });
        });
    });
});

/**
 * FA24: the store's `shipment` ref is shared across every order this panel instance is ever
 * given — `Order.vue` reuses the same instance across orders (`watchOrder`, no remount on a route
 * param change alone) — so it must both re-fetch on a new `orderId` and refuse to render a parcel
 * left over from the order it just moved on from.
 */
describe('re-checking the record belongs to this order (FA24)', () => {
    it('re-fetches when orderId changes without a remount', () => {
        const store = useDeliveryStore();
        const wrapper = mountPanel({ orderId: 'o1' });
        expect(store.fetchShipmentForOrder).toHaveBeenCalledWith('o1');

        return wrapper.setProps({ orderId: 'o2' }).then(() => {
            expect(store.fetchShipmentForOrder).toHaveBeenCalledWith('o2');
        });
    });

    it('stops showing a parcel once orderId moves on, even before the new fetch resolves', () => {
        const store = useDeliveryStore();
        const wrapper = mountPanel({ orderId: 'o1' });
        store.shipment = { id: 's1', orderId: 'o1', status: 'shipped' };

        return wrapper.vm
            .$nextTick()
            .then(() => {
                expect(wrapper.find('[data-test=shipment-status]').exists()).toBe(true);
                // fetchShipmentForOrder is stubbed to resolve without touching store.shipment, so
                // order 'o1's record is still the only thing in the store — a stand-in for a slow
                // response landing after the caller has already moved on.
                return wrapper.setProps({ orderId: 'o2' });
            })
            .then(() => wrapper.vm.$nextTick())
            .then(() => {
                expect(wrapper.find('[data-test=shipment-status]').exists()).toBe(false);
            });
    });
});
