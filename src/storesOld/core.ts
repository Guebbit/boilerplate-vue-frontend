import { ref, computed } from 'vue'
import { defineStore } from 'pinia';

/**
 * While we can't access to inject/provide in guards or any non-components,
 * we can access Pinia, so it is useful to safely store "global" variables (if needed)
 */
export const useCoreStore = defineStore('core', () => {

    /**
     * STATE
     * This loading must be accessed from anywhere.
     * Components, guards and so on.
     */
    const loadings = ref<Record<string, boolean>>({});

    /**
     * MUTATION
     * Set loading value
     *
     * @param key
     * @param value
     */
    const setLoading = (key: string, value: boolean) => loadings.value[key] = value;

    /**
     * MUTATION
     * Reset all loadings
     */
    const resetLoadings = () =>  loadings.value = {};

    /**
     * GETTER
     * Check if there is a specific loading
     */
    const getLoading = (key: string) => loadings.value[key];

    /**
     * GETTER
     * Check if there are any loadings
     */
    const isLoading = computed(
        () => Object.values(loadings.value).some(v => v)
    )

    return {
        loadings,
        isLoading,
        resetLoadings,
        setLoading,
        getLoading
    }
})
