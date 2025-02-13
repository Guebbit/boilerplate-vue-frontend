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
    const itemList = computed<T[]>(() => Object.values(itemDictionary.value));

    /**
     * Get record from object dictionary using identifier
     *
     * @param id
     */
    const getRecord = (id: K): T | undefined =>
        (!id || !Object.prototype.hasOwnProperty.call(itemDictionary.value, id)) ? undefined : itemDictionary.value[id];

    /**
     * Add item to the dictionary.
     * If item already present, it will be overwritten
     *
     * @param itemData
     */
    const addRecord = (itemData: T) =>
        itemDictionary.value[itemData[identifier as keyof T]] = itemData

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

        itemDictionary.value[id] = {
            ...itemDictionary.value[id],
            ...data
        }

        return itemDictionary.value[id];
    }

    /**
     * Delete record
     *
     * @param id
     */
    const deleteRecord = (id: K) =>
        getRecord(id) && delete itemDictionary.value[id];

    /**
     * Selected ID
     */
    const selectedIdentifier = ref<K>();

    /**
     * Selected item (by @{selectedIdentifier})
     */
    const selectedRecord = computed<T | undefined>(() =>
        itemDictionary.value[selectedIdentifier.value]
    );


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
    const addToParent = (parentId: P, childId: K) => {
        if(!parentHasMany.value[parentId])
            parentHasMany.value[parentId] = []
        parentHasMany.value[parentId].push(childId)
    }

    /**
     *
     * @param parentId
     * @param childId
     */
    const removeFromParent = (parentId: P, childId: K) =>
        parentHasMany.value[parentId] =
            parentHasMany.value[parentId]
                .filter((id: K) => id !== childId)

    /**
     *
     * @param parentId
     */
    const removeDuplicateChildren = (parentId: P) =>
        parentHasMany.value[parentId] = [...new Set(parentHasMany.value[parentId])]

    /**
     *
     * @param parentId
     */
    const getRecordsByParent = (parentId?: P): T[] => {
        if(!parentId || !parentHasMany.value[parentId])
            return [];
        // Get all runs ID and use them to retrieve the complete run object
        return (parentHasMany.value[parentId] ?? [])
            .map(getRecord)
            // remove possibly undefined values
            .filter(Boolean)
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

        // belongsTo relationship
        parentHasMany,
        addToParent,
        removeFromParent,
        removeDuplicateChildren,
        getRecordsByParent,
    }
};
