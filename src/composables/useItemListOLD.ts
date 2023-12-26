
import { computed, ref, isReadonly, type Ref, type ComputedRef, type WritableComputedRef  } from "vue";
export type AnyRef<T> = Ref<T> | ComputedRef<T> | WritableComputedRef<T>;

import type { LocationQuery, LocationQueryValue } from "vue-router";
import { search, sort, getJSON } from "@guebbit/javascript-library"
import type { filterAnyMap, logicGatesType, sortParameterType } from "@guebbit/javascript-library";
import useItemDetails from "@/resources/composables/useItemDetails";
import type { itemStructureSettingsMap } from "@/resources/composables/useItemStructure";

// TODO pagination + infinite

export interface itemListSettingsMap extends itemStructureSettingsMap {
    globalFilterLogic?: logicGatesType,
}

export default<T>(
    itemRecords :AnyRef<Record<string, T>>,
    loadPromise :Promise<unknown | unknown[]> = Promise.resolve(),
    filters: AnyRef<filterAnyMap[]> = ref([]),
    sorters: AnyRef<sortParameterType[]> = ref([]),
    settings :itemListSettingsMap = {}
) => {

    /**
     * Base
     */
    const {
        loading,
        userInfo,
        isAdmin,
        isAuthenticated,
        selectedRecord
    } = useItemDetails(
        itemRecords,
        loadPromise,
        settings
    );

    /**
     * Variables (objects) that I want to save in URL
     */
    const decodeURIObject = (json ?: string) => json ? getJSON(decodeURIComponent(json)) : {};
    /**
     * Variables (objects) that I want to save in URL
     */
    const encodeURIObject = (queryData ?:unknown) :LocationQueryValue | undefined => {
        if(typeof queryData === "number" || (Array.isArray(queryData) && queryData.length > 0) || Object.keys(queryData as Record<string, unknown>).length > 0)
            return encodeURIComponent(JSON.stringify(queryData)) as LocationQueryValue;
    };
    /**
     * Variables (objects) that I want to save in URL
     */
    const fromObjectToUrl = (queryObject :Record<string, unknown> = {}) => {
        const query :LocationQuery = {};
        // encode
        for(const queryKey in queryObject) {
            if (!Object.prototype.hasOwnProperty.call(queryObject, queryKey))
                continue;
            const temp = encodeURIObject(queryObject[queryKey as keyof typeof queryObject]);
            // add/edit query if exist
            if(temp && temp.length > 0)
                query[queryKey] = temp;
            // remove query if not (if route.query is sent, it could be)
            else
                delete query[queryKey];
        }
        // new query
        return query;
    };



    /**
     *  List of all itemRecords
     */
    const itemList = computed(() => Object.values(itemRecords.value));

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
     * Filters RESET
     * filterAnyMap items must be navigated and search resetted
     * WARNING: Use ONLY if sorters and filters are REF
     */
    function resetFilters(){
        if(isReadonly(filters))
            return;
        // TODO fare una funzione su @guebbit/javascript-library che naviga i filterAnyMap e restituisce una copia vuota
        // (filters as Ref<filterAnyMap[]>).value = [];
    }

    /**
     * Sort RESET
     * WARNING: Use ONLY if sorters and filters are REF
     */
    function resetSort() {
        if(!isReadonly(sorters))
            (sorters as Ref<sortParameterType[]>).value = [];
    }


    /**
     *
     * @param queryUrl
     */
    const fromUrlToObject = (queryUrl :Record<string, string>) :Record<string, unknown> => {
        const containerObject :Record<string, unknown> = {};
        for(const queryKey in queryUrl) {
            if (!Object.prototype.hasOwnProperty.call(queryUrl, queryKey))
                continue;
            const result = decodeURIObject(queryUrl[queryKey as keyof typeof queryUrl] as string);
            if(result)
                containerObject[queryKey as keyof typeof containerObject] = result;
        }
        return containerObject;
    };

    return {
        loading,
        userInfo,
        isAdmin,
        isAuthenticated,
        selectedRecord,
        itemList,
        itemListFiltered,
        resetSort,
        resetFilters,
        fromObjectToUrl,
        fromUrlToObject,
        encodeURIObject,
        decodeURIObject,
    }
};