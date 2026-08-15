/**
 * `ListPagination.vue` — twenty lines, and every one of them a boundary.
 *
 * The component is a thin wrapper over `v-pagination`, and the only logic it adds is `v-if="length
 * > 1"`. That single comparison is the whole component, and it is exactly the kind of thing an
 * example-based test written for the happy path never touches: every list in the app has several
 * pages while it is being developed.
 *
 * Three boundaries matter, and they fail in different directions:
 *
 *   - **0 pages** (an empty result set) must render nothing. A pager offering "page 1 of 0" is a
 *     control that cannot be used.
 *   - **1 page** must render nothing. This is the case `>= 1` gets wrong, and it is the common
 *     one — a search that narrowed to a handful of rows.
 *   - **2 pages** must render. This is the case `> 2` gets wrong.
 *
 * The plan lists this component under "pagination boundaries, empty, single page, overflow", and
 * the boundaries are the entire reason it is on the list rather than its size.
 */
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import vuetify from '@/ui/vuetify';

const mountPager = (props: Record<string, unknown> = {}) =>
    mount(ListPagination, {
        props,
        global: { plugins: [vuetify] }
    });

/** Vuetify renders the control as `.v-pagination`; absence means the `v-if` refused. */
const isRendered = (wrapper: ReturnType<typeof mountPager>) =>
    wrapper.find('.v-pagination').exists();

describe('ListPagination — the render boundary', () => {
    it('renders nothing with no pages at all', () => {
        // An empty result set. "Page 1 of 0" is a control with nothing to do.
        expect(isRendered(mountPager({ length: 0 }))).toBe(false);
    });

    it('renders nothing for a single page', () => {
        // The `>= 1` failure, and the common one: a filter that narrowed to a handful of rows.
        expect(isRendered(mountPager({ length: 1 }))).toBe(false);
    });

    it('renders as soon as there are two pages', () => {
        // The `> 2` failure, on the other side of the same comparison.
        expect(isRendered(mountPager({ length: 2 }))).toBe(true);
    });

    it('renders for a long list', () => {
        expect(isRendered(mountPager({ length: 50 }))).toBe(true);
    });

    it('renders nothing when length is omitted entirely', () => {
        // The prop default is 0, so an unwired parent hides the pager rather than showing a
        // broken one.
        expect(isRendered(mountPager())).toBe(false);
    });

    it('renders nothing for a negative length', () => {
        // Not reachable through the API, but `totalPages` is arithmetic on a count and a page
        // size, and this is what the guard does with a nonsense result.
        expect(isRendered(mountPager({ length: -1 }))).toBe(false);
    });
});

describe('ListPagination — the model', () => {
    it('defaults to page 1', () => {
        const wrapper = mountPager({ length: 5 });

        expect(wrapper.find('.v-pagination__item--is-active').text()).toBe('1');
    });

    it('reflects the page it is given', async () => {
        const wrapper = mountPager({ length: 5, modelValue: 3 });
        await wrapper.vm.$nextTick();

        expect(wrapper.find('.v-pagination__item--is-active').text()).toBe('3');
    });

    it('emits the page the user clicked', async () => {
        const wrapper = mountPager({ length: 5, modelValue: 1 });
        await wrapper.vm.$nextTick();

        // The second page button — index 0 is the "previous" arrow in Vuetify's markup.
        const pageButtons = wrapper.findAll('.v-pagination__item button');
        await pageButtons[1]!.trigger('click');

        expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe(2);
    });

    it('caps the visible page buttons rather than rendering one per page', async () => {
        // `total-visible="7"`. Without it a 500-page list renders 500 buttons, which is a real
        // layout and performance problem on the admin lists.
        const wrapper = mountPager({ length: 500 });
        await wrapper.vm.$nextTick();

        expect(wrapper.findAll('.v-pagination__item').length).toBeLessThanOrEqual(9);
    });
});
