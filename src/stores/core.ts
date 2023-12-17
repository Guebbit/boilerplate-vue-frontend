import { ref, computed, inject, type Ref } from 'vue';
import { defineStore } from 'pinia';
import { useRoute } from 'vue-router';

/**
 * While we can't access to inject/provide in guards or any non-components,
 * we can access Pinia, so it is useful to safely store "global" variables (if needed)
 *
 * TODO: create serious core store with serious loading mechanic?
 */
export default defineStore('core', () => {

    /**
     * This loading must be accessed from anywhere.
     * Components, guards and so on.
     */
    const loading = ref(false);

    return {
        loading
    }
})
