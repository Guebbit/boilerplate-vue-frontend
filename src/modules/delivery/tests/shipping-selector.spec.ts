/**
 * @module
 * `ShippingSelector.vue` — the cart's method picker. Scoped to what is this component's own
 * logic: that it fetches the shared, unfiltered methods list once on mount — not the fetch
 * itself, already covered in `delivery/tests/store.spec.ts`.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ShippingSelector from '@/modules/delivery/components/ShippingSelector.vue';
import { useDeliveryStore } from '@/modules/delivery/store.ts';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';

const mountSelector = (itemsTotal: number) => {
    const store = useDeliveryStore();
    vi.spyOn(store, 'fetchMethods').mockResolvedValue([]);

    return {
        store,
        wrapper: mount(ShippingSelector, {
            props: { itemsTotal },
            global: { plugins: [vuetify, i18n] }
        })
    };
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('ShippingSelector', () => {
    it('fetches the methods list once on mount, unfiltered', () => {
        const { store } = mountSelector(20);
        expect(store.fetchMethods).toHaveBeenCalledWith();
        expect(store.fetchMethods).toHaveBeenCalledTimes(1);
    });

    /**
     * The order page's `ShipmentPanel` calls `fetchMethods()` from the same shared delivery
     * store, before the cart ever mounts this component. A guard that skips the fetch whenever
     * the list is already non-empty would leave the cart trusting a list another page fetched.
     */
    it('fetches on mount even when the shared methods list is already populated', () => {
        const store = useDeliveryStore();
        store.methods = [{ id: 'standard', price: 500, tracked: false, requiresAddress: true }];
        vi.spyOn(store, 'fetchMethods').mockResolvedValue([]);

        mount(ShippingSelector, {
            props: { itemsTotal: 20 },
            global: { plugins: [vuetify, i18n] }
        });

        expect(store.fetchMethods).toHaveBeenCalledTimes(1);
    });
});
