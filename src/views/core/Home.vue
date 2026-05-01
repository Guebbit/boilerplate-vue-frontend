<template>
    <LayoutDefault id="home-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('home-page.page-title') }}</span>
            </h1>
        </template>

        <section class="info-wrapper stats-grid">
            <MaterialStatCard
                :title="t('home-page.label-count')"
                :value="count"
                :subtitle="`(${doubleCount})`"
                accent="primary"
            />
            <MaterialStatCard
                :title="t('home-page.label-websocket-messages')"
                :value="websocketMessages.length"
                :subtitle="t('home-page.label-live-messages')"
                accent="secondary"
            />
            <BaseButton @click="increment">
                {{ t('home-page.label-increment') }}
            </BaseButton>
            <BaseButton @click="incrementDelayed">
                {{ t('home-page.label-delayed-increment') }}
            </BaseButton>
            <CounterInput v-model="count" :min="0" :max="5" />
        </section>

        <section class="info-wrapper">
            <div class="theme-card animate-on-hover card-outlined">
                <div class="card-header">
                    <h3>
                        <b>{{ providedVariable }}</b>
                    </h3>
                    <p>{{ t('home-page.label-provided') }}</p>
                </div>
                <div class="card-content">
                    <p class="field-label">
                        {{ t('home-page.label-provided-change-typing') }}
                    </p>
                    <BaseInput
                        v-model="providedVariable"
                        type="text"
                    />
                    <p class="field-label">
                        {{ t('home-page.label-provided-change-mutation') }}
                    </p>
                    <BaseInput
                        :model-value="providedVariable"
                        @update:model-value="
                            (value) =>
                                setProvidedVariable(typeof value === 'string' ? value : '')
                        "
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
        </section>

        <section class="info-wrapper graphics-grid">
            <MaterialGraphicCard
                v-for="card in placeholderCards"
                :key="card.title"
                :title="card.title"
                :description="card.description"
                :variant="card.variant"
            />
        </section>

        <section class="info-wrapper">
            <BaseButton @click="testAddMessage">{{ t('home-page.button-test-alert') }}</BaseButton>
            <BaseButton @click="websocketMessages = []">
                {{ t('home-page.button-reset-messages') }}
            </BaseButton>
        </section>
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

    .stats-grid {
        align-items: stretch;
    }

    .graphics-grid {
        gap: 20px;
    }

    .field-label {
        margin: 0.6rem 0 0.3rem;
        font-weight: 500;
    }

    .websocket-messages {
        overflow-y: auto;
        max-height: 300px;
        width: min(460px, 100%);

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
import { ref, inject, watch, onMounted, onUnmounted, computed } from 'vue';
import type { Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';

import { useCounterStore } from '@/stores/counter';
import { useCoreStore, useNotificationsStore } from '@guebbit/vue-toolkit';
import { createSocket } from '@/utils/helperSockets.ts';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import BaseButton from '@/components/atoms/BaseButton.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import CounterInput from '@/components/atoms/CounterInput.vue';
import MaterialStatCard from '@/components/molecules/MaterialStatCard.vue';
import MaterialGraphicCard from '@/components/molecules/MaterialGraphicCard.vue';

import type { IProvidedVariableMutationFunction, IProvidedVariableType } from '@/types';

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
const { setLoading } = useCoreStore();

/**
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

/**
 * Counter store
 */
const {
    count,
    doubleCount
    // Refs needs to be extracted with this helper function
} = storeToRefs(useCounterStore());

/**
 * These functions can be used even without being deconstructed
 */
const { increment, incrementDelayed } = useCounterStore();

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
    // eslint-disable-next-line no-console
    console.log('Provided ref changed', val);
});

/**
 * Created and mounted
 */
// eslint-disable-next-line no-console
console.log('HOME was created');

onMounted(() => {
    // eslint-disable-next-line no-console
    console.log('HOME was mounted');
});

/**
 * Websocket
 */
const websocketMessages = ref<string[]>([]);

const placeholderCards = computed<
    {
        title: string;
        description: string;
        variant: 'primary' | 'secondary' | 'tertiary';
    }[]
>(() => [
    {
        title: t('home-page.placeholder-card-1-title'),
        description: t('home-page.placeholder-card-1-description'),
        variant: 'primary'
    },
    {
        title: t('home-page.placeholder-card-2-title'),
        description: t('home-page.placeholder-card-2-description'),
        variant: 'secondary'
    },
    {
        title: t('home-page.placeholder-card-3-title'),
        description: t('home-page.placeholder-card-3-description'),
        variant: 'tertiary'
    }
]);

onMounted(() => {
    const ws = createSocket('ws://localhost:3000/ws', {
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
