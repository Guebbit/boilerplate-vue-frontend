/**
 * @module
 * `ShippingSelector.vue` — the cart's method picker. Scoped to what is this component's own
 * logic: when it (re)fetches methods, off the `weight` prop the cart hands it — not the fetch
 * itself, already covered in `delivery/tests/store.spec.ts`.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ShippingSelector from '@/modules/delivery/components/ShippingSelector.vue';
import { useDeliveryStore } from '@/modules/delivery/store.ts';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';

const mountSelector = (itemsTotal: number, weight?: number) => {
    const store = useDeliveryStore();
    vi.spyOn(store, 'fetchMethods').mockResolvedValue([]);

    return {
        store,
        wrapper: mount(ShippingSelector, {
            props: { itemsTotal, weight },
            global: { plugins: [vuetify, i18n] }
        })
    };
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('ShippingSelector', () => {
    it('fetches once on mount with whatever weight it was handed', () => {
        const { store } = mountSelector(20, 1500);
        expect(store.fetchMethods).toHaveBeenCalledWith(1500);
        expect(store.fetchMethods).toHaveBeenCalledTimes(1);
    });

    it('fetches with no weight param when mounted before the cart has resolved one', () => {
        const { store } = mountSelector(20);
        expect(store.fetchMethods).toHaveBeenCalledWith(undefined);
    });

    /**
     * The cart's `resolveTitles` settles AFTER this component mounts, not before it, so the first
     * fetch routinely runs with `weight` still `undefined` — a re-fetch once it resolves is the
     * only way the methods list ever reflects the real basket weight.
     */
    it('re-fetches once the weight prop changes from undefined to a number', () => {
        const { store, wrapper } = mountSelector(20);
        expect(store.fetchMethods).toHaveBeenCalledTimes(1);

        return wrapper.setProps({ weight: 1500 }).then(() => {
            expect(store.fetchMethods).toHaveBeenCalledTimes(2);
            expect(store.fetchMethods).toHaveBeenLastCalledWith(1500);
        });
    });

    /**
     * B8: the order page's `ShipmentPanel` calls `fetchMethods()` UNWEIGHTED, populating the
     * shared delivery store's `methods` before the cart ever mounts this component. A guard that
     * skips the fetch whenever the list is already non-empty would leave the cart showing that
     * stale, unfiltered list instead of one scoped to its own basket weight.
     */
    it('fetches on mount even when the shared methods list is already populated', () => {
        const store = useDeliveryStore();
        store.methods = [{ id: 'standard', price: 500, tracked: false, requiresAddress: true }];
        vi.spyOn(store, 'fetchMethods').mockResolvedValue([]);

        mount(ShippingSelector, {
            props: { itemsTotal: 20, weight: 1500 },
            global: { plugins: [vuetify, i18n] }
        });

        expect(store.fetchMethods).toHaveBeenCalledWith(1500);
    });

    it('does not re-fetch when the weight prop stays the same', () => {
        const { store, wrapper } = mountSelector(20, 1500);
        expect(store.fetchMethods).toHaveBeenCalledTimes(1);

        return wrapper.setProps({ weight: 1500 }).then(() => {
            expect(store.fetchMethods).toHaveBeenCalledTimes(1);
        });
    });
});
