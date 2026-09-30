/**
 * @module
 * The two handlers every filtered list page has: apply the filters from the first page, and clear
 * them. Five list pages carried the same four lines each; this is the one copy.
 */
import type { Ref } from 'vue';

/**
 * What a list page hands over.
 */
export interface ListSearchOptions<TFilters extends object> {
    /** The store's live filters. */
    filters: Ref<TFilters>;
    /** The store's current page, 1-based. */
    page: Ref<number>;
    /**
     * The store's search trigger; `true` forces a fetch past the cache.
     */
    search: (force?: boolean) => Promise<unknown>;
    /**
     * Called after the filters or page changed, before the search — a page keeps its URL in step
     * here (`useListUrlState().sync`).
     */
    onApplied?: () => void;
}

/**
 * The page's two search handlers.
 */
export interface ListSearchHandlers {
    /** Applies the current filters, restarting from the first page. */
    handleSearch: () => Promise<unknown>;
    /** Clears every filter and reloads the first page from the API. */
    handleReset: () => Promise<unknown>;
}

/**
 * Builds a list page's search and reset handlers.
 *
 * @param options - The page's refs and its search trigger.
 * @returns The two handlers, each resolving once the page is loaded.
 */
export const useListSearch = <TFilters extends object>(
    options: ListSearchOptions<TFilters>
): ListSearchHandlers => ({
    handleSearch: () => {
        options.page.value = 1;
        options.onApplied?.();
        return options.search();
    },
    handleReset: () => {
        // `TFilters` is a search-filter shape: every field optional, so `{}` is a `TFilters`.
        options.filters.value = {} as TFilters;
        options.page.value = 1;
        options.onApplied?.();
        return options.search(true);
    }
});
