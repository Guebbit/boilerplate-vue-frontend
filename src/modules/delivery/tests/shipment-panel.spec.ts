/**
 * @module
 * `ShipmentPanel.vue` — the order page's ship/deliver corner. Mounts the real component with the
 * delivery/session stores stubbed, the same template `order-edit-view.spec.ts` uses for
 * `session.can`: a real `createMongoAbility` rather than a boolean flag, so the panel's own
 * `session.can('update', 'Shipment')`/`session.can('override', 'Order')` reads exercise the real
 * CASL check.
 *
 * Scoped to what is this component's own logic: which of the four template branches renders, and
 * the override-forward gate `canOverrideTo` — not `deliveryStore.start`/`.ship`/`.deliver`
 * themselves, which `delivery/tests/store.spec.ts` already covers.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMongoAbility } from '@casl/ability';
import { useCoreStore } from '@guebbit/vue-toolkit';
import ShipmentPanel from '@/modules/delivery/components/ShipmentPanel.vue';
import { useDeliveryStore } from '@/modules/delivery/store.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/**
 * Signs a session in, holding exactly the rules `rules` grants — `'override'`/`'Order'` for a
 * force-capable admin, empty for an ordinary operator.
 */
const signIn = (rules: { action: string; subject: string }[] = []) => {
    const session = useSessionStore();
    session.accessToken = 'test-token';
    session.viewer = { id: 'u1', email: 'operator@example.com', role: 'admin' };
    session.tenantAbility = createMongoAbility([
        { action: 'update', subject: 'Shipment' },
        ...rules
    ]);
};

/**
 * Mounts the panel with the delivery store's own fetches stubbed — spied BEFORE mounting, the
 * same reasoning `order-edit-view.spec.ts` documents: `onMounted` calls them with the reference
 * the store held at that point, so a spy attached after mount would never replace it.
 *
 * @param props - `orderId` plus whatever each case overrides.
 */
const mountPanel = (props: {
    orderId: string;
    orderStatus?: string;
    shippingMethodId?: string;
    canStart?: boolean;
    canFulfill?: boolean;
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
    it('offers "Start fulfilment" on a paid order when `actions.start` says so', () => {
        signIn();
        const wrapper = mountPanel({ orderId: 'o1', orderStatus: 'paid', canStart: true });

        expect(wrapper.find('[data-test=mark-started]').exists()).toBe(true);
        expect(wrapper.find('[data-test=mark-shipped]').exists()).toBe(false);
    });

    it('never offers it when `actions.start` is false, even on a paid order', () => {
        signIn();
        const wrapper = mountPanel({ orderId: 'o1', orderStatus: 'paid', canStart: false });

        expect(wrapper.find('[data-test=mark-started]').exists()).toBe(false);
    });

    it('calls the delivery store and emits `moved` on click', () => {
        signIn();
        const start = vi.spyOn(useDeliveryStore(), 'start').mockResolvedValue(undefined);
        const wrapper = mountPanel({ orderId: 'o1', orderStatus: 'paid', canStart: true });

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
    it('offers "Mark fulfilled" on a processing, digital-only order when `actions.fulfill` says so', () => {
        signIn();
        const wrapper = mountPanel({ orderId: 'o1', orderStatus: 'processing', canFulfill: true });

        expect(wrapper.find('[data-test=mark-fulfilled]').exists()).toBe(true);
        expect(wrapper.find('[data-test=mark-shipped]').exists()).toBe(false);
    });

    it('never offers it when `actions.fulfill` is false, even while processing', () => {
        signIn();
        const wrapper = mountPanel({ orderId: 'o1', orderStatus: 'processing', canFulfill: false });

        expect(wrapper.find('[data-test=mark-fulfilled]').exists()).toBe(false);
    });

    it('calls the delivery store and emits `moved` on click', () => {
        signIn();
        const fulfill = vi.spyOn(useDeliveryStore(), 'fulfill').mockResolvedValue(undefined);
        const wrapper = mountPanel({ orderId: 'o1', orderStatus: 'processing', canFulfill: true });

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
        signIn();
        const wrapper = mountPanel({ orderId: 'o1', orderStatus: 'processing', canFulfill: true });
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
    it('offers the ordinary ship form once the order reaches processing', () => {
        signIn();
        const wrapper = mountPanel({ orderId: 'o1', orderStatus: 'processing' });

        expect(wrapper.find('[data-test=mark-shipped]').exists()).toBe(true);
        expect(wrapper.find('[data-test=force-ship-toggle]').exists()).toBe(false);
    });

    it('stays a plain "not shipped yet" notice before processing, with no override permission', () => {
        signIn();
        const wrapper = mountPanel({ orderId: 'o1', orderStatus: 'paid' });

        expect(wrapper.find('[data-test=mark-shipped]').exists()).toBe(false);
        expect(wrapper.text()).toContain('Not shipped yet');
    });

    /**
     * The bug this file exists to catch: an override holder used to see a shippable form on ANY
     * status without a shipment — pending, cancelled, delivered — even though the backend's own
     * `canOverrideTo` refuses `cancelled` outright (not in the overridable sequence at all).
     */
    it('hides the force-ship form for a cancelled order even with the override permission', () => {
        signIn([{ action: 'override', subject: 'Order' }]);
        const wrapper = mountPanel({ orderId: 'o1', orderStatus: 'cancelled' });

        expect(wrapper.find('[data-test=mark-shipped]').exists()).toBe(false);
        expect(wrapper.find('[data-test=force-ship-toggle]').exists()).toBe(false);
    });

    it('offers the force-ship form for a paid order — earlier than shipped in the sequence', () => {
        signIn([{ action: 'override', subject: 'Order' }]);
        const wrapper = mountPanel({ orderId: 'o1', orderStatus: 'paid' });

        expect(wrapper.find('[data-test=mark-shipped]').exists()).toBe(true);
        expect(wrapper.find('[data-test=force-ship-toggle]').exists()).toBe(true);
    });

    /**
     * FA35: `ship`/`deliver` used to be `.then` chains with no `.catch` at all — a 422 (tracking
     * required), a 409 (someone shipped it first) or a step-up failure showed nothing.
     */
    it('shows a 409 on ship as the inline error, instead of silently doing nothing', () => {
        signIn();
        const wrapper = mountPanel({ orderId: 'o1', orderStatus: 'processing' });
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
    it('offers mark-delivered once the parcel is shipped', () => {
        signIn();
        const wrapper = mountPanel({ orderId: 'o1', orderStatus: 'shipped' });
        useDeliveryStore().shipment = { id: 's1', orderId: 'o1', status: 'shipped' };

        return wrapper.vm.$nextTick().then(() => {
            expect(wrapper.find('[data-test=mark-delivered]').exists()).toBe(true);
        });
    });

    it('offers no further action once delivered', () => {
        signIn([{ action: 'override', subject: 'Order' }]);
        const wrapper = mountPanel({ orderId: 'o1', orderStatus: 'delivered' });
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
        signIn();
        const wrapper = mountPanel({ orderId: 'o1', orderStatus: 'shipped' });
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
        signIn();
        const wrapper = mountPanel({ orderId: 'o1', orderStatus: 'shipped' });
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
