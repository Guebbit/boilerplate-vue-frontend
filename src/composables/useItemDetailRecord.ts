import { onBeforeMount, type Ref } from 'vue';

interface IUseItemDetailRecordOptions {
    id?: string;
    selectedId: Ref<string | undefined>;
    fetchRecord: (id: string) => Promise<unknown>;
}

export const useItemDetailRecord = ({
    id,
    selectedId,
    fetchRecord
}: IUseItemDetailRecordOptions) => {
    const loadRecord = () => {
        if (!id) return Promise.resolve();
        selectedId.value = id;
        return fetchRecord(id);
    };

    onBeforeMount(loadRecord);

    return {
        loadRecord
    };
};
