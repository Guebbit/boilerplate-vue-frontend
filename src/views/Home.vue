<template>
  <main id="home-page">
    <h1 class="theme-page-title"><span>HOME</span></h1>

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
          <h3><b>{{ providedRef }} === {{ providedRefFromPinia }}</b></h3>
        </div>
        <div class="card-content">
          <p>{{ t('home-page.provided-label') }}</p>
          <small>
            WARNING: If providedRefFromPinia get injected too soon
            (like in a beforeEnter route guard)
            they will not point at the same object, since the beforeEnter
            will start BEFORE App is created (and providedRef is provided the first time).
            <br/><br/>
            It should be provided in the main.ts
            (and removed from App.vue or it will be overwritten and the problem will happen again)
          </small>
        </div>
      </div>
      <div>
        <label for="providedRefInput">Change provided by typing</label>
        <br />
        <input
            v-model="providedRef"
            id="providedRefInput"
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
  </main>
</template>

<script lang="ts">
export default {
  name: 'HomePage',
}
</script>

<script setup lang="ts">
import { inject, watch, onMounted, toRef } from "vue";
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { getLanguage } from "@/api";
import { updateLocale } from "@/plugins/i18n";
import useCounterStore from "@/stores/counter";
import CounterInput from "@/components/CounterInput.vue";

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
  providedRef: providedRefFromPinia,
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
const providedRef = toRef<string>(inject('providedRef', ""));


/**
 * Watcher
 */
watch(providedRefFromPinia, (val) => console.log("Provided ref changed", val));

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

