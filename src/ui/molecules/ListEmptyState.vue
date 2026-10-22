<script setup lang="ts">
/**
 * @module
 * The empty state every list shows when it has no rows: a title, a 64px secondary-coloured icon
 * and an optional `#actions` slot. It owns the icon's look, so no list repeats it. Other
 * attributes (`text`, `data-test`) fall through to the Vuetify empty state.
 */
import type { Component } from 'vue';

/**
 * Component props — see each field's own doc comment below.
 */
defineProps<{
    /**
     * The headline, already translated.
     */
    title: string;
    /**
     * The icon component (a `lucide-vue-next` import), drawn decoratively above the title.
     */
    icon: Component;
}>();

/**
 * The slots: what the shopper or operator can do next.
 */
defineSlots<{
    /**
     * Buttons under the title; omitted when there is nothing to do.
     */
    actions?(): unknown;
}>();
</script>

<template>
    <v-empty-state :title="title">
        <template #media>
            <component :is="icon" :size="64" class="text-secondary" aria-hidden="true" />
        </template>
        <template v-if="$slots.actions" #actions>
            <slot name="actions" />
        </template>
    </v-empty-state>
</template>
