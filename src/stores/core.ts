import { ref, computed } from 'vue'
import { defineStore } from 'pinia';

/**
 * While we can't access to inject/provide in guards or any non-components,
 * we can access Pinia, so it is useful to safely store "global" variables (if needed)
 */
export default defineStore('core', () => {

    /**
     * This loading must be accessed from anywhere.
     * Components, guards and so on.
     */
    // const loadings = reactive<Record<string, boolean>>({});
    const loadings = ref<Record<string, boolean>>({});

    /**
     * Loading mutator
     *
     * @param key
     * @param value
     */
    const setLoading = (key: string, value: boolean) => loadings.value[key] = value;

    /**
     * Loading getter
     */
    const getLoading = (key: string) => loadings.value[key];

    /**
     *
     */
    const resetLoadings = () =>  loadings.value = {};

    /**
     * Check if there is a loading
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
