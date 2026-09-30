/**
 * `SortSelect.vue` — the default order first (value `null`, not `undefined`: FA51), then the
 * caller's options, and a plain `v-model` onto Vuetify's own select.
 */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { VSelect } from 'vuetify/components';
import SortSelect from '@/ui/molecules/SortSelect.vue';
import vuetify from '@/ui/vuetify';

const mountSelect = (modelValue: string | null = null) =>
    mount(SortSelect, {
        props: {
            label: 'Sort by',
            defaultLabel: 'Newest first',
            options: [{ value: '-price', title: 'Price: high to low' }],
            modelValue
        },
        global: { plugins: [vuetify] }
    });

describe('SortSelect', () => {
    it('offers the default order first, with a null value, then the options', () => {
        const items = mountSelect().findComponent(VSelect).props('items');

        expect(items).toEqual([
            { value: null, title: 'Newest first' },
            { value: '-price', title: 'Price: high to low' }
        ]);
    });

    it('forwards the model to the select, and its change back out', () => {
        const wrapper = mountSelect('-price');
        const select = wrapper.findComponent(VSelect);

        expect(select.props('modelValue')).toBe('-price');

        select.vm.$emit('update:modelValue', null);

        expect(wrapper.emitted('update:modelValue')).toEqual([[null]]);
    });
});
