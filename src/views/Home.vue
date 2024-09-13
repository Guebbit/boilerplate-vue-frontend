<template>
  <div id="home-page">
    <h1 class="theme-page-title"><span>HOME</span></h1>

    <SimpleButton>
      CIAONE
    </SimpleButton>

    <div class="info-wrapper">
      <div class="theme-card animate-on-hover" style="text-align: center">
        <div class="card-content">
          {{ t('home-page.count-label') }}
          <br />
          <b class="value" style="font-size: 3em">{{ count }} <small>({{ doubleCount }})</small></b>
        </div>
      </div>
      <button
          class="theme-button"
          @click="increment"
      >
        {{ t('home-page.increment-label') }}
      </button>
      <button
          class="theme-button"
          @click="incrementDelayed"
      >
        {{ t('home-page.delayed-increment-label') }}
      </button>
      <!--
        :modelValue="modelValue"
        @update:modelValue="value => emit('update:modelValue', value)"
      -->
      <CounterInput
        v-model="count"
        :min="0"
        :max="5"
      />
    </div>

    <div class="info-wrapper">
      <div class="theme-card animate-on-hover">
        <div class="card-header">
          <h3><b>{{ providedRef }}</b></h3>
        </div>
        <div class="card-content">
          <p>{{ t('home-page.provided-label') }}</p>
        </div>
      </div>
      <div>
        <label for="providedRefInput">Change directly by typing</label>
        <br />
        <input
            v-model="providedRef"
            id="providedRefInput"
            class="theme-input"
            type="text"
        />
        <br />
        <label for="providedRefInput2">Change via mutation by typing</label>
        <br />
        <input
            :value="providedRef"
            @input="event => setProvidedRef(event.target.value)"
            id="providedRefInput2"
            class="theme-input"
            type="text"
        />
      </div>
    </div>

    <div class="info-wrapper">
      <button
          class="theme-button"
          @click="routeCheck"
      >
        Check route
      </button>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'HomePage',
}
</script>

<script setup lang="ts">
import { inject, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { SimpleButton } from "@guebbit/vue-library";
import { getLanguage } from "@/api";
import { updateLocale } from "@/plugins/i18n";
import useCounterStore from "@/stores/counter";
import CounterInput from "@/components/CounterInput.vue";
import type { ProvidedRefMutationFunction, ProvidedRefType } from "@/types";

/**
 * Use translation
 */
const { t } = useI18n();

/**
 * Load asynchronously some translations
 */
getLanguage()
    .then((newLocaleVocabulary) => updateLocale("en", newLocaleVocabulary));

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
} = storeToRefs(store);

/**
 * Functions can be used even without being deconstructed
 */
const {
  increment,
  incrementDelayed,
  routeCheck,
} = store;

/**
 * Same value as the one in Pinia, to show they are the same.
 */
const {
  providedRef,
  setProvidedRef
} = inject<{
  providedRef?: ProvidedRefType,
  setProvidedRef?: ProvidedRefMutationFunction
}>('providedRef', {});

/**
 * Watcher
 */
watch(providedRef, (val) => console.log("Provided ref changed", val));

/**
 * Created and mounted
 */
console.log("HOME was created")
onMounted(() => {
  console.log("HOME was mounted");
})
</script>

<style lang="scss">
#home-page{
  .theme-page-title{
    margin-bottom: 100px;
  }

  .info-wrapper{
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 50px;
    margin-bottom: 50px;
  }
}
</style>

