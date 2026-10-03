/**
 * @module
 * The URL-query-string mechanism `webhooks/views/WebhookDeliveries.vue` had to itself:
 * hydrate a filter bar's initial state from the route's query on load, then keep the query in
 * sync with every later search — so a filtered view (a status, a date range, a page beyond the
 * first) can be bookmarked or handed to support instead of described over chat.
 */
import { useRoute, useRouter } from 'vue-router';
import type { LocationQuery } from 'vue-router';

/**
 * What a caller gets back: the filters this page loaded with, and the one call that keeps the
 * URL in step with every later change.
 */
export interface QuerySyncedFilters<T> {
    /**
     * The filters read from the URL query on this composable's own call — a deep link (a
     * bookmark, a link from another page) renders pre-filtered.
     */
    initial: T;
    /**
     * Mirrors the given filters into the URL query, replacing history rather than pushing —
     * every keystroke in a filter field is not a back-button stop of its own.
     *
     * @param filters - The filter bar's current state, to read back on the next load.
     */
    syncToQuery: (filters: T) => void;
}

/**
 * Wires a page's filters to its own URL query string.
 *
 * Both halves are a plain function the caller owns, deliberately: a filters shape is different on
 * every list page (a status enum here, a date range there), and this composable's only job is
 * calling the right one at the right time — not knowing what a filter IS.
 *
 * @param fromQuery - Reads the route's current query into the filters shape, called once.
 * @param toQuery - Turns the filters back into a query object, called on every
 *  {@link QuerySyncedFilters.syncToQuery} — a field a caller wants OMITTED from the URL (a
 *  default page, an empty search) is simply left out of the returned object.
 * @returns The initial filters, and the sync call to run after each later search.
 */
export const useQuerySyncedFilters = <T>(
    fromQuery: (query: LocationQuery) => T,
    toQuery: (filters: T) => Record<string, string | number>
): QuerySyncedFilters<T> => {
    const route = useRoute();
    const router = useRouter();

    const initial = fromQuery(route.query);

    const syncToQuery = (filters: T) => {
        void router.replace({ query: toQuery(filters) });
    };

    return { initial, syncToQuery };
};
