<template>
  <main>
    <h1>HOME</h1>

    <div class="info-wrapper">
      {{ t('home-page.count-label') }}:
      <b>{{ count }} <small>({{ doubleCount }})</small></b>
    </div>
    <div class="info-wrapper">
      {{ t('home-page.provided-label') }}:
      <b>{{ providedRef }} = {{ providedRefFromPinia }}</b>
    </div>

    <button
        class="button"
        @click="increment"
    >
      {{ t('home-page.increment-label') }}
    </button>

    <button
        class="button"
        @click="incrementDelayed"
    >
      {{ t('home-page.delayed-increment-label') }}
    </button>

    <button
        class="button"
        @click="routeCheck"
    >
      Check route
    </button>

    <label for="providedRefInput">Change provided by typing</label>
    <input
        id="providedRefInput"
        type="text"
        v-model="providedRefFromPinia"
    />

    <button
        class="button"
        @click="changeProvidedRef"
    >
      Change Provided with random
    </button>
  </main>
</template>

<script lang="ts">
export default {
  name: 'HomePage',
}
</script>

<script setup lang="ts">
import { inject, watch, type Ref } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { getLanguage } from "@/api";
import { i18n, updateLocale } from "@/plugins/i18n";
import useCounterStore from "@/stores/counter";

/**
 * Use translation
 */
const { t } = useI18n();

const temp = {
  "home-page": {

  },
}

/**
 * Load asynchronously some translations
 * TODO trovare il modo di updatare un vocabolario (ma è proprio necessario?)
 */
// getLanguage().then((updatedTranslations) => {
//   console.log("Before loading translation: " + t("generic.server-loaded-message"), t("generic.increment", 2));
//   updateLocale(i18n.global.locale.value, updatedTranslations);
//   console.log("After loading translation: " + t("generic.server-loaded-message"), t("generic.increment", 2));
// })

/**
 * Store object
 */
const store = useCounterStore();

/**
 * Refs needs to be extracted with this helper function
 */
const {
  count,
  doubleCount,
  providedRef: providedRefFromPinia,
} = storeToRefs(store);

/**
 * Same value as the one in Pinia, to show they are the same.
 */
const providedRef = inject<Ref<string>>('providedRef');

/**
 * Functions can be used even without being deconstructed
 */
const {
  increment,
  incrementDelayed,
  routeCheck,
} = store;

/**
 * Change the provided value into a random string
 */
function changeProvidedRef(){
  providedRefFromPinia.value = (Math.random() + 1).toString(36).substring(7);
}

/**
 * Watcher
 */
watch(providedRefFromPinia, (val) => console.log("Provided ref changed", val));
</script>

