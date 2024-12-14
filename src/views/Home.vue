<template>
    <div id="home-page">
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
            <div class="theme-card animate-on-hover card-outlined">
                <div class="card-header">
                    <h3>
                      <b>{{ providedRef }}</b>
                    </h3>
                    <p>{{ t('home-page.provided-label') }}</p>
                </div>
                <div class="card-content">
                    <label for="providedRefInput">
                      {{ t('home-page.provided-change-typing-label') }}
                    </label>
                    <input
                      v-model="providedRef"
                      id="providedRefInput"
                      class="theme-input"
                      type="text"
                    />
                    <br />
                    <label for="providedRefInput2">
                      {{ t('home-page.provided-change-mutation-label') }}
                    </label>
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
            <div>
              <h1>TODO mettere qualcosa qua</h1>
            </div>
        </div>

        <div class="info-wrapper">
            <button
                class="theme-button"
                @click="routeCheck"
            >
                Check route
            </button>
            <button
                class="theme-button"
                @click="testAddMessage"
            >
                Add test message
            </button>
        </div>
    </div>
</template>

<script lang="ts">
export default {
    name: 'HomePage'
}
</script>

<script setup lang="ts">
import { inject, watch, onMounted, ref } from 'vue'
import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { getLanguage } from '@/api'
import { updateLocale } from '@/plugins/i18n'
import { useCoreStore } from '@/stores/core'
import { useToastStore } from '@/stores/toasts'
import { useCounterStore } from '@/stores/counter'
import CounterInput from '@/components/atoms/CounterInput.vue'
import type { ProvidedRefMutationFunction, ProvidedRefType } from '@/types'

/**
 * Use translation
 */
const { t } = useI18n()

/**
 * Load asynchronously some translations
 */
getLanguage()
    .then((newLocaleVocabulary) => updateLocale('en', newLocaleVocabulary))

/**
 * Counter store
 */
const store = useCounterStore();
const {
    count,
    doubleCount
    // Refs needs to be extracted with this helper function
} = storeToRefs(store)


/**
 * Toast store
 */
const {
    addMessage
} = useToastStore()

const testAddMessage = () => {
    addMessage('Hello world')
};


/**
 * Functions can be used even without being deconstructed
 */
const {
    increment,
    incrementDelayed,
    routeCheck
} = store

/**
 * Same value as the one in Pinia, to show they are the same.
 */
const {
    providedRef,
    setProvidedRef
} = inject<{
    providedRef: Ref<ProvidedRefType>,
    setProvidedRef: ProvidedRefMutationFunction
}>('providedRef', {
    providedRef: ref('Not provided'),
    setProvidedRef: () => {}
})

/**
 * Watcher
 */
watch(providedRef, (val) => console.log('Provided ref changed', val))

/**
 * Created and mounted
 */
console.log('HOME was created')
onMounted(() => {
    console.log('HOME was mounted')
})


/**
 * Loading examples
 */
const {
    loadings
} = storeToRefs(useCoreStore());

/**
 * Loading examples
 */
console.log('fake core loading START')
loadings.value.core = true
setTimeout(() => {
    console.log('fake core loading END')
    loadings.value.core = false
    console.log('fake side (smaller) loading START')
    loadings.value.userList = true
    setTimeout(() => {
        console.log('fake side (smaller) loading END')
        loadings.value.userList = false
    }, 4000)
}, 500)
</script>

<style lang="scss">
#home-page {
    .theme-page-title {
        margin-bottom: 100px;
    }

    .info-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
        gap: 50px;
        margin-bottom: 50px;
    }
}
</style>

