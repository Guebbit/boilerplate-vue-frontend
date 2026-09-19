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
     * The case `use-poll-invoice-status.ts`'s own doc calls out for the sibling composable: the
     * cart's `resolveTitles` settles AFTER this component mounts, not before it, so the first
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

    it('does not re-fetch when the weight prop stays the same', () => {
        const { store, wrapper } = mountSelector(20, 1500);
        expect(store.fetchMethods).toHaveBeenCalledTimes(1);

        return wrapper.setProps({ weight: 1500 }).then(() => {
            expect(store.fetchMethods).toHaveBeenCalledTimes(1);
        });
    });
});
