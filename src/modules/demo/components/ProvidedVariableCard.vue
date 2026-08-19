<script setup lang="ts">
import { watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useProvidedVariable } from '@/modules/demo/provided.ts';
import { logger } from '@/infrastructure/utils/logger.ts';

/**
 * The injecting half of the provide/inject demo.
 *
 * A separate component rather than a block of `Playground.vue`, because a component that provides
 * to itself demonstrates nothing: the value has to cross a boundary for the mechanism to be
 * visible. This is that boundary.
 */

const { t } = useI18n();

const { providedVariable, setProvidedVariable } = useProvidedVariable();

watch(providedVariable, (value) => {
    logger.debug('demo', 'Provided ref changed', value);
});
</script>

<template>
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
</template>
