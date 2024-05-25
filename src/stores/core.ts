import { reactive, computed } from 'vue';
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
    const loadings = reactive<Record<string, boolean>>({});

    /**
     * Check if there is a loading
     */
    const isLoading = computed(
        () => Object.values(loadings).some(v => v)
    )

    return {
        loadings,
        isLoading
    }
})
