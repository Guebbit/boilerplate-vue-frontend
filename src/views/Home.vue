<template>
    <LayoutDefault id="home-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('home-page.page-title') }}</span>
            </h1>
        </template>

        <div class="info-wrapper">
            <div class="theme-card animate-on-hover" style="text-align: center">
                <div class="card-content">
                    {{ t('home-page.label-count') }}
                    <br />
                    <b class="value" style="font-size: 3em"
                        >{{ count }} <small>({{ doubleCount }})</small></b
                    >
                </div>
            </div>
            <button class="theme-button" @click="increment">
                {{ t('home-page.label-increment') }}
            </button>
            <button class="theme-button" @click="incrementDelayed">
                {{ t('home-page.label-delayed-increment') }}
            </button>
            <!--
              :modelValue="modelValue"
              @update:modelValue="value => emit('update:modelValue', value)"
            -->
            <CounterInput v-model="count" :min="0" :max="5" />
        </div>

        <div class="info-wrapper">
            <div class="theme-card animate-on-hover card-outlined">
                <div class="card-header">
                    <h3>
                        <b>{{ providedVariable }}</b>
                    </h3>
                    <p>{{ t('home-page.label-provided') }}</p>
                </div>
                <div class="card-content">
                    <label for="ProvidedVariableInput">
                        {{ t('home-page.label-provided-change-typing') }}
                    </label>
                    <input
                        v-model="providedVariable"
                        id="ProvidedVariableInput"
                        class="theme-input"
                        type="text"
                    />
                    <br />
                    <label for="ProvidedVariableInput2">
                        {{ t('home-page.label-provided-change-mutation') }}
                    </label>
                    <br />
                    <input
                        :value="providedVariable"
                        @input="(event) => setProvidedVariable((event.target as HTMLInputElement)?.value ?? '')"
                        id="ProvidedVariableInput2"
                        class="theme-input"
                        type="text"
                    />
                </div>
            </div>
            <div class="websocket-messages">
                <div
                    v-for="message in websocketMessages"
                    :key="'ws-message-' + message"
                    class="theme-card"
                >
                    {{ message }}
                </div>
            </div>
        </div>

        <div class="info-wrapper">
            <button class="theme-button" @click="testAddMessage">Add test alert</button>
            <button class="theme-button" @click="websocketMessages = []">Reset messages</button>
        </div>
    </LayoutDefault>
</template>



<style lang="scss">
#home-page {
    .info-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
        gap: 50px;
        margin-bottom: 50px;
    }

    .websocket-messages {
        overflow-y: auto;
        max-height: 300px;

        & > * {
            margin-bottom: 12px;
        }
    }
}
</style>

<script lang="ts">
export default {
    name: 'HomePage'
};
</script>

<script setup lang="ts">
import { ref, inject, watch, onMounted, onUnmounted } from 'vue';
import type { Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';

import { useCoreStore } from '@/stores/core';
import { useCounterStore } from '@/stores/counter';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { createSocket } from '@/utils/helperSockets.ts';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import CounterInput from '@/components/atoms/CounterInput.vue';

import type { IProvidedVariableMutationFunction, IProvidedVariableType } from '@/types';

const isDebugEnabled = import.meta.env.DEV && import.meta.env.VITE_APP_DEBUG_HOME === 'true';

/**
 * Use translation
 */
const { t } = useI18n();

/**
 * Toast store
 */
const { addMessage } = useNotificationsStore();

const testAddMessage = () => {
    addMessage('Hello world ' + Date.now());
};

/**
 * Loading examples
 */
const { startLoading, stopLoading } = useCoreStore();

/**
 * Loading examples
 */
if (isDebugEnabled) {
    // eslint-disable-next-line no-console
    console.log('fake core loading START');
}
startLoading('core');
setTimeout(() => {
    if (isDebugEnabled) {
        // eslint-disable-next-line no-console
        console.log('fake core loading END');
    }
    stopLoading('core');
    if (isDebugEnabled) {
        // eslint-disable-next-line no-console
        console.log('fake side (smaller) loading START');
    }
    startLoading('usersList');
    setTimeout(() => {
        if (isDebugEnabled) {
            // eslint-disable-next-line no-console
            console.log('fake side (smaller) loading END');
        }
        stopLoading('usersList');
    }, 4000);
}, 500);

/**
 * Counter store
 */
const store = useCounterStore();
const {
    count,
    doubleCount
    // Refs needs to be extracted with this helper function
} = storeToRefs(store);

/**
 * These functions can be used even without being deconstructed
 */
const { increment, incrementDelayed } = store;

/**
 * Same value as the one in Pinia, to show they are the same.
 */
const { providedVariable, setProvidedVariable } = inject<{
    providedVariable: Ref<IProvidedVariableType>;
    setProvidedVariable: IProvidedVariableMutationFunction;
}>('providedVariable', {
    providedVariable: ref('Not provided'),
    setProvidedVariable: () => {}
});

/**
 * Watcher
 */

watch(providedVariable, (val) => {
    if (isDebugEnabled) {
        // eslint-disable-next-line no-console
        console.log('Provided ref changed', val);
    }
});

/**
 * Created and mounted
 */
if (isDebugEnabled) {
    // eslint-disable-next-line no-console
    console.log('HOME was created');
}

onMounted(() => {
    if (isDebugEnabled) {
        // eslint-disable-next-line no-console
        console.log('HOME was mounted');
    }
});

/**
 * Websocket
 */
const websocketMessages = ref<string[]>([]);
onMounted(() => {
    const ws = createSocket('ws://localhost:3000/ws', {
        onOpen: (ws) => {
            ws.send('Hello from client');
        },
        onMessage: (ws, { data }) => {
            websocketMessages.value.push(data);
            if (isDebugEnabled) {
                // eslint-disable-next-line no-console
                console.log('Message received', data);
            }
        }
    });
    onUnmounted(() => {
        ws.close();
    });
});
</script>
