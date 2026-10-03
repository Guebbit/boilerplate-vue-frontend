<script setup lang="ts">
/**
 * @module
 * The injecting half of the provide/inject pair: reads the example and the status mutation the
 * detail screen provides, and offers the moves its status allows.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { NEXT_STATUSES } from '@/modules/example/domain';
import { useProvidedExample } from '@/modules/example/provided.ts';

/**
 * A separate component rather than a block of the detail screen, because a component that provides
 * to itself demonstrates nothing: the value has to cross a boundary for the mechanism to be
 * visible. This is that boundary.
 */

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * The provided pair: the example to read, the mutation to ask for.
 */
const { example, changeStatus } = useProvidedExample();

/**
 * The statuses the shown example may move to; none while it loads.
 */
const nextStatuses = computed(() => (example.value ? NEXT_STATUSES[example.value.status] : []));
</script>

<template>
    <div class="flex flex-wrap gap-2" data-test="example-status-actions">
        <v-btn
            v-for="status in nextStatuses"
            :key="status"
            variant="tonal"
            color="primary"
            :data-test="`example-move-${status}`"
            @click="changeStatus(status)"
        >
            {{ t(`example-status-actions.move-to-${status}`) }}
        </v-btn>
    </div>
</template>
