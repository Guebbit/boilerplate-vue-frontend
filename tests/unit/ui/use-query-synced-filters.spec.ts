/**
 * `useQuerySyncedFilters` — the URL-query mechanism `WebhookDeliveries.vue` had to itself,
 * extracted so a bookmarkable filtered view is not one page's own trick.
 *
 * Driven through a real `vue-router` instance (`createMemoryHistory`), the same way
 * `form-card.spec.ts` tests a component that calls `useRoute`/`useRouter` — a mocked router would
 * only prove this composable calls `push`/`replace`, not that the query it produces is the query
 * a real navigation actually carries.
 */
import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory, type LocationQuery } from 'vue-router';
import { defineComponent } from 'vue';
import { useQuerySyncedFilters } from '@/ui/composables/use-query-synced-filters.ts';

/** A synthetic filters shape: one string field, one numeric one — enough to prove both halves. */
interface TestFilters {
    status?: string;
    page: number;
}

/** Reads filters off a route query. */
const fromQuery = (query: LocationQuery): TestFilters => ({
    status: typeof query.status === 'string' ? query.status : undefined,
    page: Number(query.page) > 0 ? Number(query.page) : 1
});

/** Writes filters back as a route query, leaving defaults out. */
const toQuery = (filters: TestFilters): Record<string, string | number> => ({
    ...(filters.status && { status: filters.status }),
    ...(filters.page > 1 && { page: filters.page })
});

/** Host component: the composable is not itself renderable, so a thin wrapper calls it in setup(). */
const Host = defineComponent({
    setup() {
        return useQuerySyncedFilters(fromQuery, toQuery);
    },
    template: '<div />'
});

/**
 * Mounts `Host` on a fresh router already navigated to the given query — the composable reads
 * `route.query` once, at call time, so the query has to be live before `mount()` runs.
 */
const mountHost = (query: LocationQuery = {}) => {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/', name: 'Home', component: { template: '<div />' } }]
    });
    return router
        .push({ name: 'Home', query })
        .then(() => mount(Host, { global: { plugins: [router] } }))
        .then((wrapper) => ({ wrapper, router }));
};

describe('useQuerySyncedFilters — the initial read', () => {
    it('defaults to the empty filters when the URL carries no query', () =>
        mountHost().then(({ wrapper }) => {
            expect(wrapper.vm.initial).toEqual({ status: undefined, page: 1 });
        }));

    it('hydrates from the query a deep link carried', () =>
        mountHost({ status: 'failed', page: '3' }).then(({ wrapper }) => {
            expect(wrapper.vm.initial).toEqual({ status: 'failed', page: 3 });
        }));
});

describe('useQuerySyncedFilters — syncToQuery', () => {
    it('mirrors the given filters into the URL query', () =>
        mountHost().then(({ wrapper, router }) => {
            wrapper.vm.syncToQuery({ status: 'failed', page: 2 });

            return vi.waitFor(() => {
                expect(router.currentRoute.value.query).toEqual({ status: 'failed', page: '2' });
            });
        }));

    it('omits a field toQuery left out — a default page never clutters the URL', () =>
        mountHost({ page: '2' }).then(({ wrapper, router }) => {
            wrapper.vm.syncToQuery({ status: undefined, page: 1 });

            return vi.waitFor(() => {
                expect(router.currentRoute.value.query).toEqual({});
            });
        }));

    it('replaces history rather than pushing — a filter change is not its own back-button stop', () =>
        mountHost().then(({ wrapper, router }) => {
            const before = router.options.history.state.position;
            wrapper.vm.syncToQuery({ status: 'failed', page: 1 });

            return vi.waitFor(() => {
                expect(router.options.history.state.position).toBe(before);
            });
        }));
});
