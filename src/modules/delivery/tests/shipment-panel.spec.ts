/**
 * @module
 * `ShipmentPanel.vue` — the order page's ship/deliver corner. Mounts the real component with the
 * delivery/session stores stubbed, the same template `order-edit-view.spec.ts` uses for
 * `session.can`: a real `createMongoAbility` rather than a boolean flag, so the panel's own
 * `session.can('update', 'Shipment')`/`session.can('override', 'Order')` reads exercise the real
 * CASL check.
 *
 * Scoped to what is this component's own logic: which of the three template branches renders, and
 * the override-forward gate `canOverrideTo` — not `deliveryStore.ship`/`.deliver` themselves,
 * which `delivery/tests/store.spec.ts` already covers.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMongoAbility } from '@casl/ability';
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
});
