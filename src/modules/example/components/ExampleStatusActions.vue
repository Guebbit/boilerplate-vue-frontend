<script setup lang="ts">
/**
 * @module
 * In any module: the injecting half of a provide/inject pair reads what its screen provides, so the
 * value crosses a boundary and the mechanism is visible.
 * Here: renders the moves the server listed in `example.actions.transitions`; it decides nothing.
 * Delete it if: no control hangs off a server-listed set.
 * See: docs/theory/strategic-ddd.md#4-subdomain-distillation-where-to-spend-effort
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useProvidedExample } from '../provided.ts';

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
 * The statuses the server says this caller may move the shown example to; none while it loads.
 */
const nextStatuses = computed(() => example.value?.actions.transitions ?? []);
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
