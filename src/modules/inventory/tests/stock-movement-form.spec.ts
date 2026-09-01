/**
 * @module
 * Mounts the real form component twice — once per `mode` — which is the whole point of the
 * design and the cheapest way to prove the two branches differ: a receipt refuses a non-positive
 * amount, an adjustment refuses a zero delta but carries a negative one through unchanged.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import StockMovementForm from '@/modules/inventory/components/StockMovementForm.vue';
import { useInventoryStore } from '@/modules/inventory/store.ts';
import { useProductsStore } from '@/modules/products';
import { i18n, loadLocale } from '@/infrastructure/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';

wireModulesIntoCore();

/**
 * Stands in for Vuetify's `v-select`: picking a real option needs its teleported overlay open,
 * which is unrelated to what this suite is proving. A native `<select>` keeps the product field
 * genuinely fillable through `setValue` while the amount schema — the actual subject — still runs
 * against the real component.
 */
const V_SELECT_STUB = {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template:
        '<select :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)">' +
        '<option value="p1">Widget</option></select>'
};

/**
 * Mounts one instance of the form, seeded with one product so the select has something to carry.
 *
 * @param mode - Which branch of the schema is under test.
 * @returns The mounted wrapper.
 */
const mountForm = (mode: 'receipt' | 'adjust') => {
    const products = useProductsStore();
    products.addProduct({ id: 'p1', title: 'Widget', price: 9.99 });

    return mount(StockMovementForm, {
        props: { mode },
        global: { plugins: [vuetify, i18n], stubs: { VSelect: V_SELECT_STUB } }
    });
};

/**
 * Fills the product and amount fields, then submits — the shared setup every case starts from.
 *
 * @param wrapper - The mounted form.
 * @param amount - The value typed into the amount field.
 * @param dataTestPrefix - `receipt` or `adjust`, matching the component's own `data-test` split.
 */
const submitAmount = (
    wrapper: ReturnType<typeof mountForm>,
    amount: number | string,
    dataTestPrefix: 'receipt' | 'adjust'
) =>
    wrapper
        .get(`[data-test=${dataTestPrefix}-product]`)
        .setValue('p1')
        .then(() =>
            wrapper.get(
                dataTestPrefix === 'receipt'
                    ? '[data-test=receipt-quantity] input'
                    : '[data-test=adjust-delta] input'
            )
        )
        .then((field) => field.setValue(String(amount)))
        .then(() => wrapper.get('form').trigger('submit'));

beforeEach(() => {
    setActivePinia(createPinia());
    return loadLocale('en');
});

describe('the receipt form', () => {
    it('refuses a non-positive quantity and sends nothing', () => {
        const wrapper = mountForm('receipt');
        const receiveSpy = vi.spyOn(useInventoryStore(), 'receive');

        return submitAmount(wrapper, -5, 'receipt').then(() => {
            expect(wrapper.text()).toContain('A delivery is at least one whole unit');
            expect(receiveSpy).not.toHaveBeenCalled();
        });
    });

    it('refuses a fractional quantity — .int() applies here too', () => {
        const wrapper = mountForm('receipt');
        const receiveSpy = vi.spyOn(useInventoryStore(), 'receive');

        return submitAmount(wrapper, 2.5, 'receipt').then(() => {
            expect(receiveSpy).not.toHaveBeenCalled();
        });
    });
});

describe('the adjustment form', () => {
    it('refuses a zero delta and sends nothing', () => {
        const wrapper = mountForm('adjust');
        const adjustSpy = vi.spyOn(useInventoryStore(), 'adjust');

        return submitAmount(wrapper, 0, 'adjust').then(() => {
            expect(wrapper.text()).toContain('A correction is a whole number other than zero');
            expect(adjustSpy).not.toHaveBeenCalled();
        });
    });

    it('refuses a fractional delta — .int() applies here too', () => {
        const wrapper = mountForm('adjust');
        const adjustSpy = vi.spyOn(useInventoryStore(), 'adjust');

        return submitAmount(wrapper, 2.5, 'adjust').then(() => {
            expect(adjustSpy).not.toHaveBeenCalled();
        });
    });

    it('carries a negative delta through signed, not absolute', () => {
        const wrapper = mountForm('adjust');
        const inventory = useInventoryStore();
        vi.spyOn(inventory, 'adjust').mockResolvedValue(undefined);
        vi.spyOn(useProductsStore(), 'fetchProducts').mockResolvedValue([]);

        return submitAmount(wrapper, -3, 'adjust').then(() => {
            expect(inventory.adjust).toHaveBeenCalledWith('p1', -3, undefined);
        });
    });
});
