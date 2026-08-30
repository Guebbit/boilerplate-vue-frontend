/**
 * @module
 * Pinia store demo: state, getter, sync action and async action, and nothing
 * else — the worked example the Playground page and `exampleGuard` both use
 * to prove a store is reachable from their respective scopes.
 */
import { ref, computed } from 'vue';
import { defineStore } from 'pinia';

/**
 * Pinia store demo: state, getter, sync action and async action, and nothing else.
 */
export const useDemoStore = defineStore('counter', () => {
    /**
     * The counter's current value.
     */
    const count = ref(0);

    /**
     * The counter, doubled — the getter half of the demo.
     */
    const doubleCount = computed(() => count.value * 2);

    /**
     * Bumps the counter by one.
     */
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
