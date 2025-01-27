import { ref, computed } from 'vue'
import { defineStore } from 'pinia';


export const useCoreStore = defineStore('core', () => {

    /**
     * This loading must be accessed from anywhere.
     * Components, guards and so on.
     */
    const loadings = ref<Record<string | symbol, boolean>>({});

    /**
     * Set loading value
     *
     * @param key
     * @param value
     */
    const setLoading = (key: string | symbol, value: boolean) => loadings.value[key] = value;

    /**
     * Reset all loadings
     */
    const resetLoadings = () =>  loadings.value = {};

    /**
     * Check if there is a specific loading
     */
    const getLoading = (key: string | symbol) => loadings.value[key];

    /**
     * Check if there are any loadings
     */
    const isLoading = computed(
        () => Object.values(loadings.value).some(Boolean)
    )

    /**
     * Manage all dialogs
     * TODO vuetify-like
     */
    const dialogs = ref({} as Record<string, boolean>)

    return {
        loadings,
        isLoading,
        resetLoadings,
        setLoading,
        getLoading,
        dialogs
    }
})
