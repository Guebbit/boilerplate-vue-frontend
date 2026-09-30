/**
 * @module
 * Binds a list page's `filters.sort` (a wire CSV, so it can live in the URL) to the two things
 * that edit it: a table's `v-model:sort-by` and a plain select. Either edit restarts the search
 * from page 1 — the server sorts the whole result, so page 3 of the old order means nothing.
 */
import { computed } from 'vue';
import type { Ref, WritableComputedRef } from 'vue';
import { csvFromSortBy, sortByFromCsv } from '@/infrastructure/utils/sort.ts';
import type { SortByModel } from '@/infrastructure/utils/sort.ts';

/**
 * What a page hands over.
 */
export interface ServerSortOptions<TFilters extends { sort?: string }> {
    /** The store's live filters; only the `sort` field is read or written. */
    filters: Ref<TFilters>;
    /** The page's search-from-page-1 handler (`useListSearch().handleSearch`). */
    apply: () => unknown;
}

/**
 * The page's two models over one sort.
 */
export interface ServerSort {
    /** The table's `v-model:sort-by`. */
    sortBy: WritableComputedRef<SortByModel>;
    /** A select's model: the wire CSV, or `null` for the default order. */
    choice: WritableComputedRef<string | null>;
}

/**
 * Builds the two models.
 *
 * @param options - The page's filters and its search handler.
 * @returns The table model and the select model, each applying the search when set.
 */
export const useServerSort = <TFilters extends { sort?: string }>({
    filters,
    apply
}: ServerSortOptions<TFilters>): ServerSort => {
    /**
     * Writes the sort and re-searches. `undefined` is deleted rather than stored, so the URL and
     * the request carry no empty `sort=`.
     */
    const write = (csv: string | undefined) => {
        const { sort: _previous, ...rest } = filters.value;
        // `rest` is the filters minus one optional key, so it is still a `TFilters`.
        filters.value = (csv === undefined ? rest : { ...rest, sort: csv }) as TFilters;
        void apply();
    };

    return {
        sortBy: computed({
            get: () => sortByFromCsv(filters.value.sort),
            set: (value) => write(csvFromSortBy(value))
        }),
        choice: computed({
            get: () => filters.value.sort ?? null,
            set: (value) => write(value ?? undefined)
        })
    };
};
