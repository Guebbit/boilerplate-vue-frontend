/**
 * `ListSearchActions.vue` — the Search/Reset row closing every admin list's filter form. Search
 * submits the enclosing form (the form's own `@submit.prevent` starts the search), Reset emits,
 * `loading` spins Search and locks Reset, and the default slot lands after both buttons.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ListSearchActions from '@/ui/molecules/ListSearchActions.vue';
import vuetify from '@/ui/vuetify';
import { i18n, loadLocale } from '@/i18n';

beforeAll(() => loadLocale('en'));

/** Mounts the row; `props` and the default slot are optional. */
const mountRow = (props: Record<string, unknown> = {}, slot = '') =>
    mount(ListSearchActions, {
        props,
        slots: slot ? { default: slot } : {},
        global: { plugins: [vuetify, i18n] }
    });

describe('ListSearchActions — the buttons', () => {
    it('renders a submit Search and a Reset, with their test hooks', () => {
        const wrapper = mountRow();

        expect(wrapper.get('[data-test="search-submit"]').attributes('type')).toBe('submit');
        expect(wrapper.get('[data-test="search-reset"]').attributes('type')).toBe('button');
    });

    it('emits reset when Reset is pressed', async () => {
        const wrapper = mountRow();

        await wrapper.get('[data-test="search-reset"]').trigger('click');

        expect(wrapper.emitted('reset')).toHaveLength(1);
    });

    it('emits nothing on Search: the enclosing form owns the search', async () => {
        const wrapper = mountRow();

        await wrapper.get('[data-test="search-submit"]').trigger('click');

        expect(wrapper.emitted()).not.toHaveProperty('reset');
    });
});

describe('ListSearchActions — hook prefix', () => {
    it('namespaces both hooks, so two rows on one page stay distinct', () => {
        const wrapper = mountRow({ hookPrefix: 'refunds' });

        expect(wrapper.find('[data-test="refunds-search-submit"]').exists()).toBe(true);
        expect(wrapper.find('[data-test="refunds-search-reset"]').exists()).toBe(true);
        expect(wrapper.find('[data-test="search-submit"]').exists()).toBe(false);
    });
});

describe('ListSearchActions — loading', () => {
    it('keeps both buttons live when no loading is passed', () => {
        const wrapper = mountRow();

        expect(wrapper.get('[data-test="search-reset"]').attributes('disabled')).toBeUndefined();
        expect(wrapper.get('[data-test="search-submit"]').classes()).not.toContain(
            'v-btn--loading'
        );
    });

    it('spins Search and disables Reset while a search runs', () => {
        const wrapper = mountRow({ loading: true });

        expect(wrapper.get('[data-test="search-reset"]').attributes('disabled')).toBeDefined();
        expect(wrapper.get('[data-test="search-submit"]').classes()).toContain('v-btn--loading');
    });
});

describe('ListSearchActions — the slot', () => {
    it('renders the caller content after the two buttons', () => {
        const wrapper = mountRow({}, '<a data-test="create-link">Create</a>');
        const hooks = wrapper.findAll('[data-test]').map((node) => node.attributes('data-test'));

        expect(hooks).toEqual(['search-submit', 'search-reset', 'create-link']);
    });
});
