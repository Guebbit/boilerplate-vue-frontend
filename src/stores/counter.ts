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
  async function incrementDelayed() {
    return new Promise(resolve => {
      setTimeout(() => {
        count.value++;
        resolve(count);
      }, 1000)
    })
  }

  /**
   * Setup stores are also able to rely on globally provided properties like the Router or the Route.
   */
  const route = useRoute();
  function routeCheck(){
    alert("route accessed within Pinia: " + route.path)
  }

  /**
   * Exported store members
   */
  return {
    count,
    doubleCount,
    increment,
    incrementDelayed,
    routeCheck,
  }
})
