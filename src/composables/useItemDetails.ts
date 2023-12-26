import { computed, ref, type Ref } from "vue";

export default <T = any>(
    // Identifier parameter of "item"
    itemIdentifier: "id"
) => {

    /**
     * Item records (object to be filled)
     */
    const itemRecods = ref<Record<string, T>>({});

    /**
     * Selected ID
     */
    const selectedIdentifier = ref<string | undefined>();

    /**
     * GETTER - get record from object list using selected identifier
     *
     * @param id
     */
    const getRecord = (id: string): T | undefined =>
        (!id || !Object.prototype.hasOwnProperty.call(itemRecords.value, id)) ? undefined : itemRecords.value[id];

    /**
     * Selected item (by @{selectedIdentifier})
     */
    const selectedRecord = computed<T | undefined>(() =>
        selectedIdentifier.value ? getRecord(selectedIdentifier.value) : undefined
    );

    return {
        getRecord,
        selectedIdentifier,
        selectedRecord,
    }
};