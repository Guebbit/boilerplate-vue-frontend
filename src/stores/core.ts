import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

export const useCoreStore = defineStore('core', () => {
    type LoadingKey = string | symbol;
    type DialogKey = string;

    /**
     * This loading must be accessed from anywhere.
     * Components, guards and so on.
     */
    const loadings = ref<Record<LoadingKey, boolean>>({});

    /**
     * Set loading value
     *
     * @param key
     * @param value
     */
    const setLoading = (key: LoadingKey, value: boolean) => {
        loadings.value[key] = value;
    };

    /**
     * Shortcut for enabling a loading state
     *
     * @param key
     */
    const startLoading = (key: LoadingKey) => setLoading(key, true);

    /**
     * Shortcut for disabling a loading state
     *
     * @param key
     */
    const stopLoading = (key: LoadingKey) => setLoading(key, false);

    /**
     * Reset all loadings
     */
    const resetLoadings = () => (loadings.value = {});

    /**
     * Check if there is a specific loading
     */
    const getLoading = (key: LoadingKey) => loadings.value[key];

    /**
     * Check if there are any loadings
     */
    const isLoading = computed(() => Object.values(loadings.value).some(Boolean));

    /**
     * Manage all dialogs
     * TODO vuetify-like
     */
    const dialogs = ref<Record<DialogKey, boolean>>({});

    /**
     * Set dialog value
     *
     * @param key
     * @param value
     */
    const setDialog = (key: DialogKey, value: boolean) => {
        dialogs.value[key] = value;
    };

    /**
     * Check if there is a specific dialog open
     *
     * @param key
     */
    const getDialog = (key: DialogKey) => dialogs.value[key];

    /**
     * Reset all dialogs
     */
    const resetDialogs = () => {
        dialogs.value = {};
    };

    return {
        loadings,
        isLoading,
        resetLoadings,
        setLoading,
        startLoading,
        stopLoading,
        getLoading,
        dialogs,
        setDialog,
        getDialog,
        resetDialogs
    };
});
