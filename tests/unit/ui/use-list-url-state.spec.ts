/**
 * `useListUrlState` and `useListSearch` — a list page's filters and page in the URL, and the two
 * handlers every such page shares.
 *
 * Driven through a real `vue-router` (`createMemoryHistory`), so the query it writes is the query
 * a real navigation carries. The refs stand in for a store's `filters` / `pageCurrent`.
 */
import { describe, it, expect, vi } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type LocationQuery } from 'vue-router';
import { parseUrlParameter, useListUrlState } from '@/ui/composables/use-list-url-state.ts';
import { useListSearch } from '@/ui/composables/use-list-search.ts';

/**
 * A synthetic filters shape: one field of every kind the composable knows.
 */
interface TestFilters {
    text?: string;
    minPrice?: number;
    active?: boolean;
    status?: string;
}

/**
 * Mounts a host that wires the composable to fresh refs, on a router already at `query`.
 *
 * @param query - The URL the visitor arrived on.
 * @param stored - What the store already held (a previous visit).
 */
const mountList = (query: LocationQuery = {}, stored: TestFilters = {}) => {
    const filters = ref<TestFilters>(stored);
    const page = ref(1);
    const pageSize = ref(10);
    const search = vi.fn((_force?: boolean) => Promise.resolve());
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/', name: 'Home', component: { template: '<div />' } }]
    });

    const Host = defineComponent({
        setup() {
            const { sync } = useListUrlState({
                filters,
                page,
                pageSize,
                params: {
                    text: 'string',
                    minPrice: 'number',
                    active: 'boolean',
                    status: ['pending', 'paid']
                }
            });
            const handlers = useListSearch({ filters, page, search, onApplied: sync });
            return { sync, ...handlers };
        },
        template: '<div />'
    });

    return router
        .push({ name: 'Home', query })
        .then(() => mount(Host, { global: { plugins: [router] } }))
        .then((wrapper) => ({ wrapper, router, filters, page, pageSize, search }));
};

describe('parseUrlParameter', () => {
    it.each([
        ['string', 'a b', 'a b'],
        ['string', '', undefined],
        ['number', '12.5', 12.5],
        ['number', 'abc', undefined],
        ['number', '', undefined],
        ['boolean', 'true', true],
        ['boolean', 'false', false],
        ['boolean', 'yes', undefined]
    ] as const)('reads %s "%s" as %s', (kind, raw, expected) => {
        expect(parseUrlParameter(raw, kind)).toBe(expected);
    });

    it('accepts only a member of a closed set', () => {
        expect(parseUrlParameter('paid', ['pending', 'paid'])).toBe('paid');
        expect(parseUrlParameter('hacked', ['pending', 'paid'])).toBeUndefined();
    });
});

describe('useListUrlState — the load', () => {
    it('leaves the store alone when the URL names none of the page’s parameters', () =>
        mountList({}, { text: 'kept' }).then(({ filters, page }) => {
            expect(filters.value).toEqual({ text: 'kept' });
            expect(page.value).toBe(1);
        }));

    it('replaces the filters, the page and the page size with what a deep link carried', () =>
        mountList(
            { text: 'shirt', minPrice: '5', active: 'true', page: '3', pageSize: '25' },
            { text: 'old' }
        ).then(({ filters, page, pageSize }) => {
            expect(filters.value).toEqual({ text: 'shirt', minPrice: 5, active: true });
            expect(page.value).toBe(3);
            expect(pageSize.value).toBe(25);
        }));

    it('drops a value that is not valid for its kind instead of sending it on', () =>
        mountList({ minPrice: 'lots', status: 'hacked', page: '-2' }).then(({ filters, page }) => {
            expect(filters.value).toEqual({});
            expect(page.value).toBe(1);
        }));
});

describe('useListUrlState — sync', () => {
    it('writes only the filters that hold a value, and a page past the first', () =>
        mountList().then(({ wrapper, filters, page, router }) => {
            filters.value = { text: 'shirt', minPrice: 0, active: false };
            page.value = 2;
            wrapper.vm.sync();

            return vi.waitFor(() => {
                expect(router.currentRoute.value.query).toEqual({
                    text: 'shirt',
                    minPrice: '0',
                    active: 'false',
                    page: '2'
                });
            });
        }));

    it('writes a page change without being asked', () =>
        mountList().then(({ page, router }) => {
            page.value = 4;

            return vi.waitFor(() => {
                expect(router.currentRoute.value.query).toEqual({ page: '4' });
            });
        }));

    it('writes a page size only when it differs from the one the page started with', () =>
        mountList().then(({ pageSize, router }) => {
            pageSize.value = 50;

            return vi.waitFor(() => {
                expect(router.currentRoute.value.query).toEqual({ pageSize: '50' });
            });
        }));

    it('keeps a query key the page does not own', () =>
        mountList({ utm: 'mail' }).then(({ wrapper, filters, router }) => {
            filters.value = { text: 'a' };
            wrapper.vm.sync();

            return vi.waitFor(() => {
                expect(router.currentRoute.value.query).toEqual({ utm: 'mail', text: 'a' });
            });
        }));
});

describe('useListSearch', () => {
    it('search restarts from the first page, syncs the URL, then searches', () =>
        mountList().then(async ({ wrapper, page, search, router }) => {
            page.value = 5;
            await nextTick();

            await wrapper.vm.handleSearch();

            expect(page.value).toBe(1);
            expect(search).toHaveBeenCalledWith();
            expect(router.currentRoute.value.query.page).toBeUndefined();
        }));

    it('reset clears every filter, restarts, and forces a fetch past the cache', () =>
        mountList({}, { text: 'shirt' }).then(async ({ wrapper, filters, page, search }) => {
            page.value = 3;

            await wrapper.vm.handleReset();

            expect(filters.value).toEqual({});
            expect(page.value).toBe(1);
            expect(search).toHaveBeenCalledWith(true);
        }));
});
