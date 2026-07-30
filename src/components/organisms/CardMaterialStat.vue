<template>
    <v-card class="min-w-44 border-t-4" :class="accentBorderClass">
        <v-card-text>
            <p class="text-xs font-medium uppercase tracking-widest opacity-70">{{ title }}</p>
            <p class="mt-2 text-3xl font-semibold leading-tight">{{ value }}</p>
            <p v-if="subtitle" class="mt-2 text-sm opacity-80">{{ subtitle }}</p>
        </v-card-text>
    </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    title: string;
    value: string | number;
    subtitle?: string;
    accent?: 'primary' | 'secondary' | 'tertiary';
}>();

/**
 * Colored top border keyed to the theme accent.
 *
 * @returns The border utility class for the requested accent, falling back to
 *  `primary`.
 */
const accentBorderClass = computed(
    () =>
        ({
            primary: 'border-t-primary',
            secondary: 'border-t-secondary',
            tertiary: 'border-t-tertiary'
        })[props.accent ?? 'primary']
);
</script>
