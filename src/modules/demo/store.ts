import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

/** Pinia store demo: state, getter, sync action and async action, and nothing else. */
export const useDemoStore = defineStore('counter', () => {
    const count = ref(0);

    const doubleCount = computed(() => count.value * 2);

    /** Bumps the counter by one. */
    function increment() {
        count.value++;
    }

    /**
     * Bumps the counter after a one second delay, to demo pending UI states.
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

    return {
        count,
        doubleCount,
        increment,
        incrementDelayed
    };
});
