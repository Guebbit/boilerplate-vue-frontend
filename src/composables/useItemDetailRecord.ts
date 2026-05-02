import { onBeforeMount, type Ref } from 'vue';

interface IUseItemDetailRecordOptions {
    /**
     * Target identifier extracted from the route.
     */
    id?: string;
    /**
     * Store ref used by toolkit stores to select the active record.
     */
    selectedId: Ref<string | undefined>;
    /**
     * Store method that fetches one record by id.
     */
    fetchRecord: (id: string) => Promise<unknown>;
}

/**
 * Handles the common "select id + fetch record" flow for detail/edit pages.
 *
 * The watcher/hook activation is wrapped in explicit helpers to keep lifecycle
 * side-effects discoverable and consistent across pages.
 */
export const useItemDetailRecord = ({
    id,
    selectedId,
    fetchRecord
}: IUseItemDetailRecordOptions) => {
    /**
     * Loads the current record from the API/store when an id is available.
     */
    const loadRecord = () => {
        if (!id) return Promise.resolve();
        selectedId.value = id;
        return fetchRecord(id);
    };

    /**
     * Activates the onBeforeMount lifecycle hook that performs the initial load.
     */
    const activateBeforeMountRecordLoader = () => {
        onBeforeMount(() => {
            void loadRecord();
        });
    };

    activateBeforeMountRecordLoader();

    return {
        loadRecord,
        activateBeforeMountRecordLoader
    };
};
