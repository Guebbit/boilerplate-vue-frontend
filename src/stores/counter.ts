import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { useRoute } from 'vue-router';

/**
 * Pinia store demo
 */
export const useCounterStore = defineStore('counter', () => {
    /**
     * State
     */
    const count = ref(0);

    /**
     * Getter
     */
    const doubleCount = computed(() => count.value * 2);

    /**
     * Equivalent of Mutation (there is no difference with actions anymore)
     */
    function increment() {
        count.value++;
    }

    /**
     * Equivalent of Action (no real difference, just async)
     */
    function incrementDelayed() {
        return new Promise((resolve) => {
            setTimeout(() => {
                count.value++;
                resolve(count);
            }, 1000);
        });
    }

    /**
     * Exported store members
     */
    return {
        count,
        doubleCount,
        increment,
        incrementDelayed
    };
});
