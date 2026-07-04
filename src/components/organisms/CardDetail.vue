<template>
    <VCard :tag="as ?? 'article'" class="detail-card pa-6" v-bind="$attrs">
        <slot />
    </VCard>
</template>

<script setup lang="ts">
import { VCard } from 'vuetify/components';

/*
 * Detail surface card used by detail pages (VCard based).
 * @param as - HTML tag rendered by the card
 */
defineOptions({ inheritAttrs: false });

defineProps<{
    as?: 'article' | 'aside' | 'div' | 'section';
}>();
</script>
