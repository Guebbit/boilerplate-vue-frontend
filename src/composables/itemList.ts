import { computed, ref } from 'vue';
import MiniSearch from 'minisearch';
import { useStructureDataManagement } from '@guebbit/vue-toolkit';
import { getUuid } from '@guebbit/js-toolkit';
import { useCoreStore } from '@/stores/core';

export type ISortOrder = '' | 'ASC' | 'DESC' | 'asc' | 'desc';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useItemList = <T extends Record<string | number | symbol, any> = Record<string, any>>(itemIdentifier = 'id', filterLengthLimit = 2) => {
    /**
     * Delegate data management (dictionary, selection, CRUD, pagination refs)
     * to the toolkit composable
     */
    const {
        itemDictionary,
        itemList,
        getRecord,
        editRecord,
        deleteRecord,
        addRecord,
        selectedIdentifier,
        selectedRecord,
        pageCurrent,
        pageSize,
    } = useStructureDataManagement<T>(itemIdentifier);

    /**
     * Number of items
     */
    const itemsLength = computed(() => itemList.value.length);

    /**
     * Helper: convert a list to a dictionary keyed by the given identifier
     */
    const listToDictionary = <U>(list: U[], identifier: keyof U): Record<string, U> => {
        const dictionary: Record<string, U> = {};
        for (const item of list) {
            dictionary[item[identifier] as string] = item;
        }
        return dictionary;
    };

    /**
     * ---------------------------------- LOADING ------------------------------------
     */

    const LOADING_KEY = 'items-' + getUuid();
    const { setLoading, getLoading } = useCoreStore();
    const startLoading = () => setLoading(LOADING_KEY, true);
    const stopLoading = () => setLoading(LOADING_KEY, false);
    const loading = computed(() => getLoading(LOADING_KEY));

    /**
     * ---------------------------------- FILTER / SEARCH ------------------------------------
     */

    const filters = ref({} as Record<keyof T, string>);

    const itemListSearchData = computed(() => {
        const miniSearch = new MiniSearch<T>({
            fields: ['name'],
            storeFields: ['id', 'name', 'username', 'email', 'phone', 'website', 'company']
        });
        miniSearch.addAll(itemList.value as T[]);
        return miniSearch.search(filters.value.name, { fuzzy: 0.2, prefix: true });
    });

    const itemListFiltered = computed(() => {
        if (!filters.value.name || filters.value.name.length < filterLengthLimit)
            return itemList.value as T[];
        return (
            itemListSearchData.value
                .toSorted((a, b) => b.score - a.score) as unknown as T[]
        );
    });

    const itemsFilteredLength = computed(() => itemListFiltered.value.length);

    const itemDictionaryFiltered = computed<Record<string, T>>(() =>
        listToDictionary(itemListFiltered.value, itemIdentifier as keyof T)
    );

    /**
     * Reset filters
     */
    function resetFilters() {
        filters.value = {} as Record<keyof T, string>;
    }

    /**
     * ---------------------------------- SORT ------------------------------------
     */

    const sorters = ref({} as Record<keyof T, ISortOrder>);

    const sortItems = <U>(data: U[], sortFields = {} as Record<keyof U, ISortOrder>): U[] => {
        if (Object.keys(sortFields).length === 0) return data;
        return data.toSorted((a, b) => {
            for (const field in sortFields) {
                if (!Object.prototype.hasOwnProperty.call(sortFields, field)) continue;
                const comparison = a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0;
                if (comparison !== 0) {
                    return sortFields[field].toLowerCase() === 'asc'
                        ? comparison
                        : sortFields[field].toLowerCase() === 'desc'
                          ? -comparison
                          : 0;
                }
            }
            return 0;
        });
    };

    const itemListSorted = computed(() => sortItems(itemListFiltered.value, sorters.value));

    function resetSort() {
        sorters.value = {} as Record<keyof T, ISortOrder>;
    }

    /**
     * ---------------------------------- PAGINATION ------------------------------------
     * Pagination is computed from the filtered+sorted list so that filters are reflected
     */

    const pageTotal = computed(() => Math.ceil(itemsFilteredLength.value / pageSize.value));
    const pageOffset = computed(() => pageSize.value * (pageCurrent.value - 1));
    const pageItemList = computed(() =>
        itemListSorted.value.slice(pageOffset.value, pageOffset.value + pageSize.value)
    );

    return {
        // Data management
        itemList,
        itemsLength,
        listToDictionary,
        itemDictionary,
        getRecord,
        editRecord,
        deleteRecord,
        addRecord,
        selectedIdentifier,
        selectedRecord,

        // Search & Sort
        filters,
        itemListFiltered,
        itemsFilteredLength,
        itemDictionaryFiltered,
        sorters,
        sortItems,
        itemListSorted,
        resetFilters,
        resetSort,

        // Pagination
        pageCurrent,
        pageSize,
        pageTotal,
        pageOffset,
        pageItemList,

        // Loading
        startLoading,
        stopLoading,
        loading,

        // Aliases
        list: pageItemList,
        total: itemsFilteredLength
    };
};
