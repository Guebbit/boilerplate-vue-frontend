<template>
    <VCard :tag="as ?? 'div'" v-bind="$attrs" class="pa-4">
        <slot />
    </VCard>
</template>

<script setup lang="ts">
import { VCard } from 'vuetify/components';

/*
 * Reusable surface on top of Vuetify VCard.
 * @param as - optional HTML tag rendered by the card
 */
defineOptions({ inheritAttrs: false });

defineProps<{
    as?: string;
}>();
</script>
