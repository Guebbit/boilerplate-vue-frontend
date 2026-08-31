<script setup lang="ts">
/**
 * @module
 * A stat tile: title, big value, optional subtitle, with a top border keyed to a theme accent.
 * `accentBorderClass` is the only logic — everything else is layout.
 */
import type { ThemeAccent } from '@/ui/types.ts';
import { computed } from 'vue';

/**
 * Component props — see each field's own doc comment below.
 */
const props = defineProps<{
    /**
     * Stat label.
     */
    title: string;
    /**
     * The headline value, already formatted by the caller.
     */
    value: string | number;
    /**
     * Optional secondary line under the value.
     */
    subtitle?: string;
    /**
     * Theme accent for the top border. Defaults to `primary`.
     */
    accent?: ThemeAccent;
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

<template>
    <v-card class="min-w-44 border-t-4" :class="accentBorderClass">
        <v-card-text>
            <p class="text-xs font-medium uppercase tracking-widest opacity-80">{{ title }}</p>
            <p class="mt-2 text-3xl font-semibold leading-tight">{{ value }}</p>
            <p v-if="subtitle" class="mt-2 text-sm opacity-80">{{ subtitle }}</p>
        </v-card-text>
    </v-card>
</template>
