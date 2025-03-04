import { computed, ref } from 'vue'


export const useStructureDataManagement = <
    // type of item
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends Record<string | number | symbol, any> = Record<string, any>,
    // type of item[identifier]
    K extends string | number | symbol = keyof T,
    // type of parent[parent_identifier], where the current item is in a relation "belogsTo" with an unknown parent data
    // WARNING: Typescript is not inferring correctly between different composables and use the default type
    P extends string | number | symbol = string | number | symbol,
>(
    //  The identification parameter of the project type (READONLY and not exported)
    identifier = "id",
) => {

    /**
     * Dictionary of items (to be filled)
     */
    const itemDictionary = ref({} as Record<K, T>);

    /**
     * List of items
     */
    const itemList = computed<T[]>(() => Object.values(itemDictionary.value as Record<K, T>));

    /**
     * Get record from object dictionary using identifier
     *
     * @param id
     */
    const getRecord = (id: K): T | undefined =>
        (!id || !Object.prototype.hasOwnProperty.call(itemDictionary.value, id)) ? undefined : (itemDictionary.value as Record<K, T>)[id];

    /**
     * Add item to the dictionary.
     * If item already present, it will be overwritten
     *
     * @param itemData
     */
    const addRecord = (itemData: T) =>
        (itemDictionary.value as Record<K, T>)[itemData[identifier as keyof T]] = itemData

    /**
     * Edit item,
     * If item not present, it will be ignored
     * If it is present, it will be merged with the new partial data
     * WARNING: If identifier change, it does NOT automatically update the dictionary id.
     *
     * @param id
     * @param data
     * @param forced - if true it will be added if not present
     */
    const editRecord = (id: K, data: Partial<T> = {}, forced = false) => {
        if(
            !forced &&
            (!id || !Object.prototype.hasOwnProperty.call(itemDictionary.value, id))
        ) {
            console.warn("storeDataStructure - data not found", data);
            return
        }

        (itemDictionary.value as Record<K, T>)[id] = {
            ...(itemDictionary.value as Record<K, T>)[id],
            ...data
        }

        return (itemDictionary.value as Record<K, T>)[id];
    }

    /**
     * Delete record
     *
     * @param id
     */
    const deleteRecord = (id: K) =>
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        getRecord(id) && delete (itemDictionary.value as Record<K, T>)[id];

    /**
     * Selected ID
     */
    const selectedIdentifier = ref<K>();

    /**
     * Selected item (by @{selectedIdentifier})
     */
    const selectedRecord = computed<T | undefined>(() =>
        selectedIdentifier.value && (itemDictionary.value as Record<K, T>)[selectedIdentifier.value]
    );

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
    const pageTotal = computed(() => Math.ceil(itemList.value.length / pageSize.value));

    /**
     * PAGINATION
     * First item of the current page
     */
    const pageOffset = computed(() => pageSize.value * (pageCurrent.value - 1));

    /**
     * PAGINATION
     * Items shown in current page
     */
    const pageItemList = computed(() =>
        itemList.value.slice(pageOffset.value, pageOffset.value + pageSize.value)
    )


    /**
     * ------------ hasMany & belongsTo relationships ------------
     */


    /**
     * If the item has a parent, here will be stored a "parent hasMany" relation
     */
    const parentHasMany = ref({} as Record<P, typeof identifier[]>);

    /**
     *
     * @param parentId
     * @param childId
     */
    const addToParent = (parentId: P, childId: typeof identifier) => {
        if(!(parentHasMany.value as Record<P, unknown>)[parentId])
            (parentHasMany.value as Record<P, typeof identifier[]>)[parentId] = [] as typeof identifier[]
        (parentHasMany.value as Record<P, typeof identifier[]>)[parentId].push(childId)
    }

    /**
     *
     * @param parentId
     * @param childId
     */
    const removeFromParent = (parentId: P, childId: typeof identifier) =>
        (parentHasMany.value as Record<P, typeof identifier[]>)[parentId] =
            (parentHasMany.value as Record<P, typeof identifier[]>)[parentId]
                .filter((id: typeof identifier) => id !== childId)

    /**
     *
     * @param parentId
     */
    const removeDuplicateChildren = (parentId: P) =>
        (parentHasMany.value as Record<P, typeof identifier[]>)[parentId] = [...new Set((parentHasMany.value as Record<P, typeof identifier[]>)[parentId])]

    /**
     *
     * @param parentId
     */
    const getRecordsByParent = (parentId?: P): T[] => {
        if(!parentId || !(parentHasMany.value as Record<P, unknown>)[parentId])
            return [];
        // Get all runs ID and use them to retrieve the complete run object
        return ((parentHasMany.value as Record<P, unknown[]>)[parentId])
            .map((element) => getRecord(element as K))
            // remove possibly undefined values
            .filter(Boolean) as T[]
    }

    return {
        itemDictionary,
        itemList,
        getRecord,
        addRecord,
        editRecord,
        deleteRecord,
        selectedIdentifier,
        selectedRecord,

        // Pagination
        pageCurrent,
        pageSize,
        pageTotal,
        pageOffset,
        pageItemList,

        // belongsTo relationship
        parentHasMany,
        addToParent,
        removeFromParent,
        removeDuplicateChildren,
        getRecordsByParent,
    }
};
