<script lang="ts">
export default {
    name: 'PlaygroundPage'
};
</script>

<script setup lang="ts">
import { ref, inject, watch, onMounted } from 'vue';
import type { Ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';

import { useCounterStore } from '@/modules/demo/store.ts';
import { useCoreStore, useNotificationsStore } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import FormCounterInput from '@/ui/molecules/FormCounterInput.vue';
import CardMaterialStat from '@/ui/organisms/CardMaterialStat.vue';

import type { ProvidedVariableMutationFunction, ProvidedVariableType } from '@/types';
import { logger } from '@/infrastructure/utils/logger.ts';

/**
 * Use translation
 */
const { t } = useI18n();

/**
 * Toast store
 */
const { addMessage } = useNotificationsStore();

/**
 * Demo action: pushes a timestamped toast through the notifications store.
 */
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
logger.debug('demo', 'fake core loading START');
setLoading('core', true);
setTimeout(() => {
    logger.debug('demo', 'fake core loading END');
    setLoading('core', false);
    logger.debug('demo', 'fake side (smaller) loading START');
    setLoading('usersList', true);
    setTimeout(() => {
        logger.debug('demo', 'fake side (smaller) loading END');
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
    providedVariable: Ref<ProvidedVariableType>;
    setProvidedVariable: ProvidedVariableMutationFunction;
}>('providedVariable', {
    providedVariable: ref('Not provided'),
    setProvidedVariable: () => {}
});

/**
 * Watcher
 */

watch(providedVariable, (val) => {
    logger.debug('demo', 'Provided ref changed', val);
});

/**
 * Created and mounted
 */
logger.debug('demo', 'PLAYGROUND was created');

onMounted(() => {
    logger.debug('demo', 'PLAYGROUND was mounted');
});
</script>

<template>
    <LayoutDefault id="playground-page" :title="t('playground-page.page-title')">
        <section class="mb-10 flex flex-wrap items-stretch justify-center gap-6">
            <CardMaterialStat
                :title="t('playground-page.label-count')"
                :value="count"
                :subtitle="`(${doubleCount})`"
                accent="primary"
            />
            <div class="flex flex-col justify-center gap-2">
                <v-btn color="primary" variant="tonal" @click="increment">
                    {{ t('playground-page.label-increment') }}
                </v-btn>
                <v-btn color="secondary" variant="tonal" @click="incrementDelayed">
                    {{ t('playground-page.label-delayed-increment') }}
                </v-btn>
            </div>
            <div class="flex items-center">
                <FormCounterInput
                    v-model="count"
                    :aria-label="t('playground-page.label-count-input')"
                    :min="0"
                    :max="5"
                />
            </div>
        </section>

        <section class="mb-10 flex flex-wrap items-start justify-center gap-6">
            <v-card class="w-full max-w-md p-6">
                <h3 class="text-lg font-semibold">
                    <b>{{ providedVariable }}</b>
                </h3>
                <p class="mb-4 opacity-70">{{ t('playground-page.label-provided') }}</p>

                <p class="mb-1 font-medium">
                    {{ t('playground-page.label-provided-change-typing') }}
                </p>
                <v-text-field
                    v-model="providedVariable"
                    type="text"
                    :aria-label="t('playground-page.label-provided-change-typing')"
                    hide-details
                    class="mb-4"
                />
                <p class="mb-1 font-medium">
                    {{ t('playground-page.label-provided-change-mutation') }}
                </p>
                <v-text-field
                    :model-value="providedVariable"
                    type="text"
                    :aria-label="t('playground-page.label-provided-change-mutation')"
                    hide-details
                    @update:model-value="
                        (value) => setProvidedVariable(typeof value === 'string' ? value : '')
                    "
                />
            </v-card>
        </section>

        <section class="flex flex-wrap justify-center gap-4">
            <v-btn color="primary" @click="testAddMessage">
                {{ t('playground-page.button-test-alert') }}
            </v-btn>
        </section>
    </LayoutDefault>
</template>
