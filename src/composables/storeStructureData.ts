import { computed, ref } from 'vue'

interface ITestMe {
    id: string,
    name: string,
}

export const useStoreStructureData = <
    // type of item
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends Record<string | number | symbol, ITestMe> = Record<string, ITestMe>,
    // type of item[identifier]
    K extends string | number | symbol = keyof T,
    // type of parent[parent_identifier], where the current item is in a relation "belogsTo" with an unknown parent data
    // WARNING: Typescript is not inferring correctly between different composables and use the default type
    P extends string | number | symbol = string | number | symbol,
>(
    //  The identification parameter of the project type (READONLY and not exported)
    itemIdentifier = 'id'
) => {

    /**
     * Dictionary of items (to be filled)
     */
    const itemDictionary = ref({} as Record<K, T>)

    /**
     * List of items
     */
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const itemList = computed<T[]>(() => Object.values(itemDictionary.value))

    /**
     * Get record from object dictionary using identifier
     *
     * @param id
     */
    const getRecord = (id: K): T | undefined =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        (!id || !Object.prototype.hasOwnProperty.call(itemDictionary.value, id)) ? undefined : itemDictionary.value[id]

    /**
     * Add item to the dictionary.
     * If item already present, it will be overwritten
     *
     * @param itemData
     */
    const addRecord = (itemData: T) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        itemDictionary.value[itemData[itemIdentifier as keyof T]] = itemData

    /**
     * Edit item,
     * If item not present, it will be ignored
     * If it is present, it will be merged with the new partial data
     *
     * @param id
     * @param data
     * @param forced - if true it will be added if not present
     */
    const editRecord = (id: K, data: Partial<T> = {}, forced = false) => {
        if (
            !forced &&
            (!id || !Object.prototype.hasOwnProperty.call(itemDictionary.value, id))
        ) {
            console.warn('storeDataStructure - data not found', data)
            return
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        itemDictionary.value[id] = {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            ...itemDictionary.value[id],
            ...data
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        return itemDictionary.value[id]
    }

    /**
     * Delete record
     *
     * @param id
     */
    const deleteRecord = (id: K) =>
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete, @typescript-eslint/no-unsafe-member-access
        getRecord(id) && delete itemDictionary.value[id]

    /**
     * Selected ID
     */
    const selectedIdentifier = ref<K | undefined>()

    /**
     * Selected item (by @{selectedIdentifier})
     */
    const selectedRecord = computed<T | undefined>(() =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        itemDictionary.value[selectedIdentifier.value]
    )


    /**
     * ------------ hasMany & belongsTo relationships ------------
     */


    /**
     * If the item has a parent, here will be stored a "parent hasMany" relation
     */
    const parentHasMany = ref({} as Record<P, typeof itemIdentifier[]>)

    /**
     *
     * @param parentId
     * @param childId
     */
    const addToParent = (parentId: P, childId: K) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (!parentHasMany.value[parentId])
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            parentHasMany.value[parentId] = []
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        parentHasMany.value[parentId].push(childId)
    }

    /**
     *
     * @param parentId
     * @param childId
     */
    const removeFromParent = (parentId: P, childId: K) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if(!parentHasMany.value[parentId])
        return;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      parentHasMany.value[parentId] =
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          parentHasMany.value[parentId]
              .filter((id: K) => id !== childId)
    }

    /**
     *
     * @param parentId
     */
    const removeDuplicateChildren = (parentId: P) =>
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        parentHasMany.value[parentId] = [...new Set(parentHasMany.value[parentId])]

    /**
     *
     * @param parentId
     */
    const getRecordsByParent = (parentId: P): T[] =>
        // Get all runs ID and use them to retrieve the complete run object
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
        parentHasMany.value[parentId] ?
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            parentHasMany.value[parentId]
                // eslint-disable-next-line unicorn/no-array-callback-reference
                .map(getRecord)
                // remove possibly undefined values
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                .filter(Boolean)
            : []

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
        getRecordsByParent
    }
}
