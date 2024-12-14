import { computed, ref } from 'vue'
import { useCoreStore } from "@/stores/core";
import { getUuid } from '@guebbit/js-toolkit'

export const useItemStructure = <T = unknown>(
    itemIdentifier = "id",
) => {
    /**
     * List of items (to be filled)
     */
    const itemList = ref<T[]>([]);

    /**
     * Number of items
     */
    const itemsLength = computed(() => Object.keys(itemList.value).length);

    /**
     * TODO GUEBBIT
     * @param list
     * @param identifier
     */
    const listToDictionary = <T>(list: T[], identifier: keyof T): Record<string, T> => {
        return list.reduce((acc, item) => {
            acc[(item[identifier] as string)] = item;
            return acc;
        }, {} as Record<string, T>);
    }

    /**
     * Dictionary of items
     */
    const itemDictionary = computed<Record<string, T>>(() =>
        listToDictionary(itemList.value as T[], itemIdentifier as keyof T)
    );

    /**
     * GETTER - get record from object list using selected identifier
     *
     * @param id
     */
    const getRecord = (id: string | number): T | undefined =>
        (!id || !Object.prototype.hasOwnProperty.call(itemDictionary.value, id)) ? undefined : itemDictionary.value[id];

    /**
     *
     * @param id
     * @param data
     */
    const editRecord = (id: string | number, data: Partial<T>) => {
        const index = itemList.value.findIndex(item => (item as T)[itemIdentifier as keyof T] === id);
        if (index !== -1)
            itemList.value[index] = { ...itemList.value[index], ...data };
    }

    /**
     * Delete record
     *
     * @param id
     */
    const deleteRecord = (id: string | number) => {
        itemList.value = itemList.value.filter(item => (item as T)[itemIdentifier as keyof T] !== id);
    }

    /**
     * Selected ID
     */
    const selectedIdentifier = ref<string | number | undefined>();


    /**
     * Selected item (by @{selectedIdentifier})
     */
    const selectedRecord = computed<T | undefined>(() =>
        selectedIdentifier.value ? getRecord(selectedIdentifier.value) : undefined
    );



    /**
     * ---------------------------------- GENERIC ------------------------------------
     */

    const LOADING_KEY = "items-" + getUuid();

    /**
     * loadings
     */
    const {
        setLoading,
        getLoading
    } = useCoreStore();
    // loading mutators
    const startLoading = () => setLoading(LOADING_KEY, true);
    const stopLoading = () => setLoading(LOADING_KEY, false);
    // Check if it's loading
    const loading = computed(() => getLoading(LOADING_KEY));

    return {
        itemList,
        itemsLength,
        listToDictionary,
        itemDictionary,
        getRecord,
        editRecord,
        deleteRecord,
        selectedIdentifier,
        selectedRecord,

        startLoading,
        stopLoading,
        loading,
    }
};
