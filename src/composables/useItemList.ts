import { computed, ref, isReadonly, type Ref, } from "vue";

import {
    search,
    sort,
    getJSON,
    type logicGatesType,
    type filterAnyMap,
    type sortParameterType
} from "@guebbit/javascript-library"

import type { LocationQuery, LocationQueryValueRaw } from "vue-router";

// TODO pagination + infinite

export interface ItemListSettingsType {
    // Identifier parameter of "item"
    itemIdentifier?: string,
    // @guebbit search logic gates
    globalFilterLogic?: logicGatesType,
}

export default<T = any>(
    filters: Ref<filterAnyMap[]> = ref([]),
    sorters: Ref<sortParameterType[]> = ref([]),
    settings: ItemListSettingsType = {
        itemIdentifier: "id",
        globalFilterLogic: "AND"
    },
) => {

    /**
     * List of items (to be filled)
     */
    const itemList = ref<T[]>([]);

    /**
     *  List of all FILTERED itemRecords
     */
    const itemListFiltered = computed(() => {
        const { globalFilterLogic = 'AND' } = settings;
        // if no filters are set
        if(filters.value.length < 1)
            return itemList.value;
        // guebbit filter
        return sort(
            search(
                [ ...itemList.value ] as Array<Record<string, unknown | unknown[]>>,
                filters.value,
                globalFilterLogic
            ),
            sorters.value
        );
    });

    /**
     * Number of items
     */
    const itemsLength = computed(() => Object.keys(itemList.value).length);

    /**
     * Number of filtered items
     */
    const itemsFilteredLength = computed(() => Object.keys(itemListFiltered.value).length);

    /**
     * Record list of items
     */
    const itemRecords = computed<Record<string, T>>(() =>
        itemList.value.reduce((obj, cur, i) => {
            return {
                ...obj,
                // @ts-ignore
                [cur[settings.itemIdentifier || ""] as string]: cur
            };
        }, {}) // as Record<string, T>
    );

    /**
     * GETTER - get record from object list using selected identifier
     *
     * @param id
     */
    const getRecord = (id: string): T | undefined =>
        (!id || !Object.prototype.hasOwnProperty.call(itemRecords.value, id)) ? undefined : itemRecords.value[id];

    /**
     * Selected ID
     */
    const selectedIdentifier = ref<string | undefined>();


    /**
     * Selected item (by @{selectedIdentifier})
     */
    const selectedRecord = computed<T | undefined>(() =>
        selectedIdentifier.value ? getRecord(selectedIdentifier.value) : undefined
    );

    /**
     * TODO
     * FILTERS
     * Filters RESET
     * filterAnyMap items must be navigated and search resetted
     *
     * WARNING: Use ONLY if sorters and filters are REF
     */
    function resetFilters(){
        if(isReadonly(filters))
            return;
        // TODO fare una funzione su @guebbit/javascript-library che naviga i filterAnyMap e restituisce una copia vuota
        // (filters as Ref<filterAnyMap[]>).value = [];
    }

    /**
     * TODO
     * SORTING
     * Sort RESET
     *
     * WARNING: Use ONLY if sorters and filters are REF
     */
    function resetSort() {
        if(!isReadonly(sorters))
            (sorters as Ref<sortParameterType[]>).value = [];
    }

    /**
     * PAGINATION
     * Current selected page (start with 1)
     */
    const pageCurrent = ref(1);

    /**
     * PAGINATION
     * How many items in page
     */
    const pageSize = ref(10);

    /**
     * PAGINATION
     * How many pages exist
     */
    const pageTotal = computed(() => Math.ceil(itemsFilteredLength.value / pageSize.value));

    /**
     * PAGINATION
     * First item of page
     */
    const pageOffset = computed(() => pageSize.value * (pageCurrent.value - 1));

    /**
     * PAGINATION
     * Items shown in current page
     */
    const pageItemList = computed(() => itemListFiltered.value.slice(pageOffset.value, pageOffset.value + pageSize.value))
    
    // /**
    //  * Variables (objects) that I want to GET from URL
    //  */
    // const decodeURIObject = (json ?: string) => json ? getJSON(decodeURIComponent(json)) : {};
    //
    // /**
    //  * Variables (objects) that I want to save in URL
    //  */
    // const encodeURIObject = (queryData ?:unknown) :LocationQueryValueRaw => {
    //     if(typeof queryData === "number" || (Array.isArray(queryData) && queryData.length > 0) || Object.keys(queryData as Record<string, unknown>).length > 0)
    //         return encodeURIComponent(JSON.stringify(queryData));
    // };
    //
    // /**
    //  * Variables (objects) that I want to save in URL
    //  */
    // const fromObjectToUrl = (queryObject :Record<string, unknown> = {}) => {
    //     const query :LocationQuery = {};
    //     // encode
    //     for(const queryKey in queryObject) {
    //         if (!Object.prototype.hasOwnProperty.call(queryObject, queryKey))
    //             continue;
    //         const temp = encodeURIObject(queryObject[queryKey as keyof typeof queryObject]);
    //         // add/edit query if exist
    //         if(temp && temp.length > 0)
    //             query[queryKey] = temp;
    //         // remove query if not (if route.query is sent, it could be)
    //         else
    //             delete query[queryKey];
    //     }
    //     // new query
    //     return query;
    // };
    //
    // /**
    //  *
    //  * @param queryUrl
    //  */
    // const fromUrlToObject = (queryUrl :Record<string, string>) :Record<string, unknown> => {
    //     const containerObject :Record<string, unknown> = {};
    //     for(const queryKey in queryUrl) {
    //         if (!Object.prototype.hasOwnProperty.call(queryUrl, queryKey))
    //             continue;
    //         const result = decodeURIObject(queryUrl[queryKey as keyof typeof queryUrl] as string);
    //         if(result)
    //             containerObject[queryKey as keyof typeof containerObject] = result;
    //     }
    //     return containerObject;
    // };
    //
    //
    //
    // const obj = {
    //     lorem: "ipsum",
    //     gino: 2,
    //     pino: "panino"
    // };
    // console.log("fromObjectToUrl", fromObjectToUrl(obj))
    // console.log("fromUrlToObject", fromUrlToObject(fromObjectToUrl(obj)))


    return {
        // items
        itemList,
        itemListFiltered,
        itemsLength,
        itemsFilteredLength,
        itemRecords,
        
        // selections
        getRecord,
        selectedIdentifier,
        selectedRecord,
        
        // Sorting and filters
        resetFilters,
        resetSort,
        
        // Pagination
        pageCurrent,
        pageSize,
        pageTotal,
        pageOffset,
        pageItemList,
        
        // Url
        // fromObjectToUrl,
        // fromUrlToObject,
        // encodeURIObject,
        // decodeURIObject,
    }
};