/**
 * `PageSizeSelect.vue` (FA84) — the `v-select` over row counts every paginated list repeated by
 * hand. Its only real logic: the default 10/25/50 set a caller can override, mapped into
 * `{ value, label }` items, and a plain `v-model` forwarded onto Vuetify's own.
 *
 * Asserted through the mounted `VSelect`'s own `items`/`modelValue` props rather than by opening
 * its dropdown: the overlay teleports to `document.body` the same way `v-dialog` does (see
 * `reauth-dialog.spec.ts`), and what is under test here is this component's mapping, not
 * Vuetify's own menu.
 */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { VSelect } from 'vuetify/components';
import PageSizeSelect from '@/ui/molecules/PageSizeSelect.vue';
import { DEFAULT_PAGE_SIZES } from '@/ui/molecules/page-size-options.ts';
import vuetify from '@/ui/vuetify';

const mountSelect = (props: Record<string, unknown> = {}) =>
    mount(PageSizeSelect, {
        props: { label: 'Page size', modelValue: 10, ...props },
        global: { plugins: [vuetify] }
    });

describe('PageSizeSelect — the offered sizes', () => {
    it('offers the default 10/25/50 set when no sizes prop is given', () => {
        const items = mountSelect().findComponent(VSelect).props('items');

        expect(items).toEqual(DEFAULT_PAGE_SIZES.map((value) => ({ value, label: String(value) })));
    });

    it('offers a caller-given set instead, when one is passed', () => {
        const items = mountSelect({ sizes: [20, 50, 100] })
            .findComponent(VSelect)
            .props('items');

        expect(items).toEqual([
            { value: 20, label: '20' },
            { value: 50, label: '50' },
            { value: 100, label: '100' }
        ]);
    });
});

describe('PageSizeSelect — the label', () => {
    it('renders the given, already-translated label — no i18n of its own', () => {
        const wrapper = mountSelect({ label: 'Dimensione pagina' });

        expect(wrapper.text()).toContain('Dimensione pagina');
    });
});

describe('PageSizeSelect — the test hook', () => {
    it('carries data-test="page-size" itself, so every caller gets it for free', () => {
        expect(mountSelect().findComponent(VSelect).attributes('data-test')).toBe('page-size');
    });
});

describe('PageSizeSelect — the model', () => {
    it('forwards the given modelValue onto the underlying v-select', () => {
        const select = mountSelect({ modelValue: 25 }).findComponent(VSelect);

        expect(select.props('modelValue')).toBe(25);
    });

    it('emits update:modelValue when the underlying v-select changes, unmodified', () => {
        const wrapper = mountSelect({ modelValue: 10 });

        wrapper.findComponent(VSelect).vm.$emit('update:modelValue', 25);

        expect(wrapper.emitted('update:modelValue')).toEqual([[25]]);
    });
});
