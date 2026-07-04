<template>
    <VCard class="material-stat-card pa-5" variant="tonal" :color="resolvedAccent" min-width="180">
        <p class="text-overline ma-0">{{ title }}</p>
        <p class="text-h4 font-weight-medium ma-0 mt-2">{{ value }}</p>
        <p v-if="subtitle" class="text-caption ma-0 mt-2">{{ subtitle }}</p>
    </VCard>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { VCard } from 'vuetify/components';

/*
 * Stat card: overline title + big value + optional subtitle,
 * tinted with the accent theme color.
 */
const props = defineProps<{
    title: string;
    value: string | number;
    subtitle?: string;
    accent?: 'primary' | 'secondary' | 'tertiary';
}>();

/*
 * Maps the "tertiary" accent (not in the Vuetify palette) to "info".
 */
const resolvedAccent = computed(() => {
    const accent = props.accent ?? 'primary';
    return accent === 'tertiary' ? 'info' : accent;
});
</script>
