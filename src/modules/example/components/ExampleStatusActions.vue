<script setup lang="ts">
/**
 * @module
 * In any module: the injecting half of a provide/inject pair reads what its screen provides, so the
 * value crosses a boundary and the mechanism is visible.
 * Here: renders one button per lifecycle event the server flagged open in `example.actions`; it decides nothing.
 * Delete it if: no control hangs off a server-listed set.
 * See: docs/theory/strategic-ddd.md#4-subdomain-distillation-where-to-spend-effort
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useProvidedExample } from '../provided.ts';
import type { ExampleEvent } from '../store.ts';

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
 * Every event an example has, in button order. Which are open is the server's answer, never this
 * list's.
 */
const EVENTS: readonly ExampleEvent[] = ['publish', 'archive', 'unarchive'];

/**
 * The events the server says this caller may apply to the shown example; none while it loads.
 */
const openEvents = computed(() => EVENTS.filter((event) => example.value?.actions[event]));
</script>

<template>
    <div class="flex flex-wrap gap-2" data-test="example-status-actions">
        <v-btn
            v-for="event in openEvents"
            :key="event"
            variant="tonal"
            color="primary"
            :data-test="`example-move-${event}`"
            @click="changeStatus(event)"
        >
            {{ t(`example-status-actions.event-${event}`) }}
        </v-btn>
    </div>
</template>
