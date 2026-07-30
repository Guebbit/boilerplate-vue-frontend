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
     * Equivalent of Mutation (there is no difference with actions anymore):
     * bumps the counter by one.
     *
     * @returns Nothing; {@link count} is mutated in place.
     */
    function increment() {
        count.value++;
    }

    /**
     * Equivalent of Action (no real difference, just async): bumps the counter
     * after a one second delay, to demo pending UI states.
     *
     * @returns A promise resolving with the `count` ref once incremented.
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
