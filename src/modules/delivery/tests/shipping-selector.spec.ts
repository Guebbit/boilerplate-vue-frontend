/**
 * @module
 * `ShippingSelector.vue` — the cart's method picker. Scoped to what is this component's own
 * logic: that it renders one radio per `options` entry, already priced by the caller (FA-D6/B3,
 * never re-derived here), and that it still fetches the shared, unfiltered methods list once on
 * mount — for the ship-to list and the free-above hint, not the fetch itself, already covered in
 * `delivery/tests/store.spec.ts`.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ShippingSelector from '@/modules/delivery/components/ShippingSelector.vue';
import { useDeliveryStore } from '@/modules/delivery/store.ts';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import { formatCurrency } from '@/infrastructure/utils/formatters.ts';
import vuetify from '@/ui/vuetify';

/**
 * Two fitting, already-priced options — the shape the cart's `shipping.options` carries.
 */
const OPTIONS = [
    { id: 'standard', price: 5, requiresAddress: true, tracked: false },
    { id: 'pickup', price: 0, requiresAddress: false, tracked: false }
];

/**
 * Mounts the selector with `options`/`currency` — never `itemsTotal`: pricing is the server's,
 * off the cart's own answer, not a prop this component re-derives from.
 *
 * @param options - The priced, fitting options to render.
 */
const mountSelector = (options = OPTIONS) => {
    const store = useDeliveryStore();
    vi.spyOn(store, 'fetchMethods').mockResolvedValue([]);

    return {
        store,
        wrapper: mount(ShippingSelector, {
            props: { options, currency: 'EUR' },
            global: { plugins: [vuetify, i18n] }
        })
    };
};

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('ShippingSelector', () => {
    it('fetches the methods list once on mount, for the ship-to list and the free-above hint', () => {
        const { store } = mountSelector();
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
        store.methods = [
            { id: 'standard', price: 500, currency: 'EUR', tracked: false, requiresAddress: true }
        ];
        vi.spyOn(store, 'fetchMethods').mockResolvedValue([]);

        mount(ShippingSelector, {
            props: { options: OPTIONS, currency: 'EUR' },
            global: { plugins: [vuetify, i18n] }
        });

        expect(store.fetchMethods).toHaveBeenCalledTimes(1);
    });

    it('renders one radio per option, priced exactly as given', () => {
        const { wrapper } = mountSelector();

        expect(wrapper.get('[data-test=shipping-method-standard]').text()).toContain(
            formatCurrency(5, 'EUR')
        );
        expect(wrapper.get('[data-test=shipping-method-pickup]').text()).toContain(
            formatCurrency(0, 'EUR')
        );
    });

    it("offers only the options given — never the store's wider unfiltered catalogue", () => {
        const { wrapper } = mountSelector([OPTIONS[0]]);

        expect(wrapper.find('[data-test=shipping-method-pickup]').exists()).toBe(false);
    });

    /**
     * `options` carries no `freeAbove` — only the price already computed against it — so the
     * "free, and why" hint cross-references the unfiltered catalogue to tell a threshold actually
     * crossed apart from a method that is simply always free (`pickup`).
     */
    it('shows the free-earned hint only once a real threshold is crossed', () => {
        const store = useDeliveryStore();
        vi.spyOn(store, 'fetchMethods').mockResolvedValue([]);
        store.methods = [
            {
                id: 'standard',
                price: 5,
                currency: 'EUR',
                freeAbove: 100,
                tracked: false,
                requiresAddress: true
            },
            { id: 'pickup', price: 0, currency: 'EUR', tracked: false, requiresAddress: false }
        ];

        const wrapper = mount(ShippingSelector, {
            props: {
                options: [
                    { id: 'standard', price: 0, requiresAddress: true, tracked: false },
                    { id: 'pickup', price: 0, requiresAddress: false, tracked: false }
                ],
                currency: 'EUR'
            },
            global: { plugins: [vuetify, i18n] }
        });

        const freeEarned = i18n.global.t('shipping-selector.free-earned');
        expect(wrapper.get('[data-test=shipping-method-standard]').text()).toContain(freeEarned);
        expect(wrapper.get('[data-test=shipping-method-pickup]').text()).not.toContain(freeEarned);
    });
});
