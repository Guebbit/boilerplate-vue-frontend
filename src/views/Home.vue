
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

import { useCoreStore } from '@/stores/core'
import { useCounterStore } from '@/stores/counter'
import { IToastType, useToastStore } from '@/stores/toasts'
import LayoutDefault from '@/layouts/LayoutDefault.vue'
import CounterInput from '@/components/atoms/CounterInput.vue'

import type { ProvidedRefMutationFunction, ProvidedRefType } from '@/types'

/**
 * Use translation
 */
const { t } = useI18n()



/**
 * Toast store
 */
const {
    addMessage
} = useToastStore()

const testAddMessage = () => {
    addMessage('Hello world ' + Date.now(), IToastType.SECONDARY)
};



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
 * These functions can be used even without being deconstructed
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

</script>

<template>
    <LayoutDefault id="home-page">
        <template #header>
            <h1 class="theme-page-title"><span>{{ t('home-page.page-title') }}</span></h1>
        </template>

        <div class="info-wrapper">
            <div class="theme-card animate-on-hover" style="text-align: center">
                <div class="card-content">
                    {{ t('home-page.label-count') }}
                    <br />
                    <b class="value" style="font-size: 3em">{{ count }} <small>({{ doubleCount }})</small></b>
                </div>
            </div>
            <button
                class="theme-button"
                @click="increment"
            >
                {{ t('home-page.label-increment') }}
            </button>
            <button
                class="theme-button"
                @click="incrementDelayed"
            >
                {{ t('home-page.label-delayed-increment') }}
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
                    <p>{{ t('home-page.label-provided') }}</p>
                </div>
                <div class="card-content">
                    <label for="providedRefInput">
                      {{ t('home-page.label-provided-change-typing') }}
                    </label>
                    <input
                      v-model="providedRef"
                      id="providedRefInput"
                      class="theme-input"
                      type="text"
                    />
                    <br />
                    <label for="providedRefInput2">
                      {{ t('home-page.label-provided-change-mutation') }}
                    </label>
                    <br />
                    <input
                      :value="providedRef"
                      @input="event => setProvidedRef(event.target?.value ?? '')"
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
    </LayoutDefault>
</template>

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

