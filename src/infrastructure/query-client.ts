/**
 * @module
 * The single TanStack `QueryClient` every `useStructureRestApi`/`useStructureSearchApi`/
 * `useStructureCrudApi` store in this app shares — vue-toolkit 5 keeps no private client of its
 * own, so one shared instance is what makes cross-resource cache invalidation
 * (`resourceKey`-scoped) possible at all. Passed to every store call explicitly, via its
 * `queryClient` option, rather than relying on `VueQueryPlugin`'s injection: a Pinia store built
 * outside a mounted component (a unit test constructing a store directly, a router guard run
 * before the app tree exists) has no Vue injection context for `useQueryClient()` to find, and
 * `pinia`'s own `app.runWithContext` fallback only kicks in once `app.use(pinia)` has run on a
 * real, mounted app — never true in a store unit test. An explicit option sidesteps that
 * entirely and behaves identically in `main.ts` and in every store's own test file.
 *
 * `main.ts` also installs `VueQueryPlugin` with this same instance, purely so a future caller
 * that reaches for `useQueryClient()` directly (a one-off component read, devtools) finds the
 * same client rather than a second, disconnected one.
 */
import { QueryClient } from '@tanstack/vue-query';

/**
 * The app's one TanStack query cache.
 *
 * vue-toolkit 4.x gave each resource its own client, configured with `retry: false` and
 * `networkMode: 'always'`; 5.x's shared client defaults to TanStack's own (3 retries for an
 * active query, pausing while the browser reports itself offline). Every store here, and every
 * store unit test, was written against the 4.x behaviour — a single mocked request per call, no
 * retry loop to wait out — so those two options are set explicitly to keep it.
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: { retry: false, networkMode: 'always' },
        mutations: { networkMode: 'always' }
    }
});
