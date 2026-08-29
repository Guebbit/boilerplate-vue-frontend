<script lang="ts">
export default {
    name: 'PlaygroundPage'
};
</script>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';

import { useDemoStore } from '@/modules/demo/store.ts';
import { useCoreStore, useNotificationsStore } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import FormCounterInput from '@/ui/molecules/FormCounterInput.vue';
import CardMaterialStat from '@/ui/organisms/CardMaterialStat.vue';
import ProvidedVariableCard from '@/modules/demo/components/ProvidedVariableCard.vue';

import { provideVariable } from '@/modules/demo/provided.ts';
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
} = storeToRefs(useDemoStore());

/**
 * These functions can be used even without being deconstructed
 */
const { increment, incrementDelayed } = useDemoStore();

/**
 * The providing half of the provide/inject demo; `ProvidedVariableCard` below is the injecting
 * half. Reachable by every descendant of this page and by nothing above it, which is the scope
 * the mechanism actually has.
 */
provideVariable();

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
            <ProvidedVariableCard />
        </section>

        <section class="flex flex-wrap justify-center gap-4">
            <v-btn color="primary" @click="testAddMessage">
                {{ t('playground-page.button-test-alert') }}
            </v-btn>
        </section>
    </LayoutDefault>
</template>
