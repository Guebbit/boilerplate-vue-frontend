<template>
    <LayoutDefault id="playground-page">
        <template #header>
            <h1 class="text-h3 text-md-h2 font-weight-bold text-center mb-8">
                <span>{{ t('playground-page.page-title') }}</span>
            </h1>
        </template>

        <VRow class="mb-8" align="stretch" justify="center">
            <VCol cols="12" sm="6" md="3">
                <CardMaterialStat
                    class="h-100"
                    :title="t('playground-page.label-count')"
                    :value="count"
                    :subtitle="`(${doubleCount})`"
                    accent="primary"
                />
            </VCol>
            <VCol cols="12" sm="6" md="3">
                <CardMaterialStat
                    class="h-100"
                    :title="t('playground-page.label-websocket-messages')"
                    :value="websocketMessages.length"
                    :subtitle="t('playground-page.label-live-messages')"
                    accent="secondary"
                />
            </VCol>
            <VCol cols="12" md="6">
                <VCard class="h-100 pa-4" rounded="xl" variant="tonal">
                    <VCardText class="d-flex flex-wrap align-center justify-center ga-4 pa-0">
                        <BaseButton @click="increment">
                            {{ t('playground-page.label-increment') }}
                        </BaseButton>
                        <BaseButton @click="incrementDelayed">
                            {{ t('playground-page.label-delayed-increment') }}
                        </BaseButton>
                        <FormCounterInput v-model="count" :min="0" :max="5" />
                    </VCardText>
                </VCard>
            </VCol>
        </VRow>

        <VRow class="mb-8" justify="center">
            <VCol cols="12" md="6">
                <VCard class="h-100" rounded="xl" variant="outlined">
                    <VCardTitle class="d-flex align-center ga-3">
                        <VIcon icon="custom:guebbit" color="primary" />
                        <span>
                            <b>{{ providedVariable }}</b>
                        </span>
                    </VCardTitle>
                    <VCardText>
                        <p class="text-body-2 text-medium-emphasis mb-4">
                            {{ t('playground-page.label-provided') }}
                        </p>
                        <p class="text-subtitle-2 mb-2">
                            {{ t('playground-page.label-provided-change-typing') }}
                        </p>
                        <BaseInput v-model="providedVariable" type="text" />
                        <p class="text-subtitle-2 mt-4 mb-2">
                            {{ t('playground-page.label-provided-change-mutation') }}
                        </p>
                        <BaseInput
                            :model-value="providedVariable"
                            @update:model-value="
                                (value) =>
                                    setProvidedVariable(typeof value === 'string' ? value : '')
                            "
                            type="text"
                        />
                    </VCardText>
                </VCard>
            </VCol>
            <VCol cols="12" md="6">
                <VCard class="h-100" rounded="xl" variant="outlined">
                    <VCardTitle class="d-flex align-center ga-3">
                        <VIcon icon="$info" color="info" />
                        <span>{{ t('playground-page.label-live-messages') }}</span>
                    </VCardTitle>
                    <VCardText>
                        <FeedbackMessageFeed
                            :messages="websocketMessages"
                            max-height="300px"
                            :empty-text="t('playground-page.label-no-messages')"
                        />
                    </VCardText>
                </VCard>
            </VCol>
        </VRow>

        <VRow justify="center">
            <VCol cols="12" md="8">
                <VCard class="pa-4" rounded="xl" variant="tonal">
                    <VCardText class="d-flex flex-wrap justify-center ga-4 pa-0">
                        <BaseButton @click="testAddMessage">{{
                            t('playground-page.button-test-alert')
                        }}</BaseButton>
                        <BaseButton @click="websocketMessages = []">
                            {{ t('playground-page.button-reset-messages') }}
                        </BaseButton>
                    </VCardText>
                </VCard>
            </VCol>
        </VRow>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'PlaygroundPage'
};
</script>

<script setup lang="ts">
import { ref, inject, watch, onMounted, onUnmounted } from 'vue';
import type { Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { VCard, VCardText, VCardTitle, VCol, VIcon, VRow } from 'vuetify/components';

import { useCounterStore } from '@/stores/counter';
import { useCoreStore, useNotificationsStore } from '@guebbit/vue-toolkit';
import { createSocket } from '@/utils/sockets.ts';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import FormCounterInput from '@/components/molecules/FormCounterInput.vue';
import CardMaterialStat from '@/components/organisms/CardMaterialStat.vue';
import FeedbackMessageFeed from '@/components/organisms/FeedbackMessageFeed.vue';

import type { IProvidedVariableMutationFunction, IProvidedVariableType } from '@/types';

/*
 * Use translation
 */
const { t } = useI18n();

/*
 * Toast store
 */
const { addMessage } = useNotificationsStore();

const testAddMessage = () => {
    addMessage('Hello world ' + Date.now());
};

/*
 * Loading examples
 */
const { setLoading } = useCoreStore();

/*
 * Loading examples
 */
// eslint-disable-next-line no-console
console.log('fake core loading START');
setLoading('core', true);
setTimeout(() => {
    // eslint-disable-next-line no-console
    console.log('fake core loading END');
    setLoading('core', false);
    // eslint-disable-next-line no-console
    console.log('fake side (smaller) loading START');
    setLoading('usersList', true);
    setTimeout(() => {
        // eslint-disable-next-line no-console
        console.log('fake side (smaller) loading END');
        setLoading('usersList', false);
    }, 4000);
}, 500);

/*
 * Counter store
 */
const {
    count,
    doubleCount
    // Refs needs to be extracted with this helper function
} = storeToRefs(useCounterStore());

/*
 * These functions can be used even without being deconstructed
 */
const { increment, incrementDelayed } = useCounterStore();

/*
 * Same value as the one in Pinia, to show they are the same.
 */
const { providedVariable, setProvidedVariable } = inject<{
    providedVariable: Ref<IProvidedVariableType>;
    setProvidedVariable: IProvidedVariableMutationFunction;
}>('providedVariable', {
    providedVariable: ref('Not provided'),
    setProvidedVariable: () => {}
});

/*
 * Watcher
 */

watch(providedVariable, (val) => {
    // eslint-disable-next-line no-console
    console.log('Provided ref changed', val);
});

/*
 * Created and mounted
 */
// eslint-disable-next-line no-console
console.log('PLAYGROUND was created');

onMounted(() => {
    // eslint-disable-next-line no-console
    console.log('PLAYGROUND was mounted');
});

/*
 * Websocket
 */
const websocketMessages = ref<string[]>([]);
const defaultWebsocketUrl = 'ws://localhost:3000/ws';
const websocketUrl = (import.meta.env.VITE_API_WEBSOCKET ?? defaultWebsocketUrl)
    .replace(/^http:\/\//u, 'ws://')
    .replace(/^https:\/\//u, 'wss://');

onMounted(() => {
    const ws = createSocket(websocketUrl, {
        onOpen: (ws) => {
            ws.send('Hello from client');
        },
        onMessage: (ws, { data }) => {
            websocketMessages.value.push(data);
            // eslint-disable-next-line no-console
            console.log('Message received', data);
        }
    });
    onUnmounted(() => {
        ws.close();
    });
});
</script>
