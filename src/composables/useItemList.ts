import { computed, ref } from 'vue'
import MiniSearch, { type SearchResult } from 'minisearch'
import useItemStructure from '@/composables/useItemStructure'

export type ISortOrder = '' | 'ASC' | 'DESC' | 'asc' | 'desc';

export default<T = unknown>(
    itemIdentifier = "id",
    filterLengthLimit = 2,
) => {

    /**
     *
     */
    const {
        itemList,
        itemsLength,
        listToDictionary,
        itemDictionary,
        getRecord,
        selectedIdentifier,
        selectedRecord,

        loadingKey,
        startLoading,
        stopLoading,
        loading,
    } = useItemStructure<T>(itemIdentifier);

    /**
     * Filter data
     */
    const filters = ref({} as Record<keyof T, string>);


    /**
     * // Search only specific fields
     * miniSearch.search('zen', { fields: ['title'] })
     *
     * // Boost some fields (here "title")
     * miniSearch.search('zen', { boost: { title: 2 } })
     *
     * // Prefix search (so that 'moto' will match 'motorcycle')
     * miniSearch.search('moto', { prefix: true })
     *
     * // Search within a specific category
     * miniSearch.search('zen', {
     *   filter: (result) => result.category === 'fiction'
     * })
     *
     * // Fuzzy search, in this example, with a max edit distance of 0.2 * term length,
     * // rounded to nearest integer. The mispelled 'ismael' will match 'ishmael'.
     * miniSearch.search('ismael', { fuzzy: 0.2 })
     *
     * // You can set the default search options upon initialization
     * miniSearch = new MiniSearch({
     *   fields: ['title', 'text'],
     *   searchOptions: {
     *     boost: { title: 2 },
     *     fuzzy: 0.2
     *   }
     * })
     * miniSearch.addAll(documents)
     *
     * // It will now by default perform fuzzy search and boost "title":
     * miniSearch.search('zen and motorcycles'
     */

    /**
     * TODO https://github.com/lucaong/minisearch
     *  https://chatgpt.com/c/67192190-553c-800b-9cda-d0fd5da18efe
     *  CombinationOperator
     * List of all FILTERED itemDictionary
     */
    const itemListSearchData = computed(() => {
        // Create a new MiniSearch instance
        const miniSearch = new MiniSearch<T>({
            fields: ["name"],
            storeFields: ["id", "name", "username", "email", "address", "phone", "website", "company"], // TODO dinamycally get all fields
        });
        // Add all items and allow them to be searchable
        miniSearch.addAll(itemList.value as T[]);
        //
        return miniSearch.search(filters.value.name, { fuzzy: 0.2, prefix: true });
    });

    /**
     *
     */
    const itemListFiltered = computed(() => {
        // if no filters are set
        if(!filters.value.name || filters.value.name.length < filterLengthLimit)
            return itemList.value as T[];
        return itemListSearchData.value
            // TODO it adds a score, match, etc. to the object (enrich: false // Prevents adding `score`, `match`, etc.?)
            //  WARNING: controllare come funziona il discorso della selezione e della ricerca, che potrebbero cozzare (usano gli ID però devo fare che potrebbero non esserci)
            .sort((a, b) => b.score - a.score) as T[]
    });

    /**
     * Number of filtered items
     */
    const itemsFilteredLength = computed(() => Object.keys(itemListFiltered.value).length);

    /**
     * Dictionary of items
     */
    const itemDictionaryFiltered = computed<Record<string, T>>(() =>
        listToDictionary(itemListFiltered.value as T[], itemIdentifier as keyof T)
    );
    
    /**
     * Sort data
     */
    const sorters = ref({} as Record<keyof T, ISortOrder>);

    /**
     * TODO GUEBBIT
     * @param data
     * @param sortFields
     */
    const sortItems = <T>(
        data: T[],
        sortFields = {} as Record<keyof T, ISortOrder>
    ): T[] =>
        data.sort((a, b) => {
            for (const field in sortFields) {
                if (!Object.prototype.hasOwnProperty.call(sortFields, field))
                    continue;
                // Compare the field values...
                const comparison = (a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0);
                // ...and choose the order
                if (comparison !== 0) {
                    return sortFields[field] === 'ASC' ? comparison : -comparison;
                }
            }
            // All compared fields are equal
            return 0;
        })

    /**
     * List of all items sorted
     */
    const itemListSorted = computed(() => sortItems(itemListFiltered.value as T[], sorters.value));

    /**
     * Resert filters
     */
    function resetFilters(){
        filters.value = {};
    }

    /**
     * Reset sorters
     */
    function resetSort() {
        sorters.value.value = {};
    }
    

    /**
     * ---------------------------------- PAGINATION ------------------------------------
     * TODO infinite pagination
     */

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
     * First item of the current page
     */
    const pageOffset = computed(() => pageSize.value * (pageCurrent.value - 1));

    /**
     * PAGINATION
     * Items shown in current page
     */
    const pageItemList = computed(() => itemListSorted.value.slice(pageOffset.value, pageOffset.value + pageSize.value))

    /**
     * ---------------------------------- URL ------------------------------------
     * TODO
     */

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
        // Selections
        itemList,
        itemsLength,
        listToDictionary,
        itemDictionary,
        getRecord,
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
        
        // Url
        // fromObjectToUrl,
        // fromUrlToObject,
        // encodeURIObject,
        // decodeURIObject,

        // Generics
        loadingKey,
        startLoading,
        stopLoading,
        loading,

        // better names
        list: pageItemList,
        total: itemsFilteredLength,
    }
};