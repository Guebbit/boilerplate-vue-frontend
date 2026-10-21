<script setup lang="ts">
/**
 * @module
 * A stat tile: title, big value, optional subtitle, with a top border keyed to a theme accent.
 * The border prop string is the only logic — everything else is layout.
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
 * Vuetify's `border` prop: a 4px top edge (`t-lg`) in the accent colour at full opacity. The card
 * has no other border, so the all-sides colour class it adds shows only on top.
 * https://vuetifyjs.com/en/styles/borders/
 *
 * @returns The border prop string for the requested accent, falling back to `primary`.
 */
const border = computed(() => `t-lg ${props.accent ?? 'primary'} opacity-100`);
</script>

<template>
    <v-card class="min-w-44" :border="border">
        <v-card-text>
            <p class="text-xs font-medium uppercase tracking-widest opacity-80">{{ title }}</p>
            <p class="mt-2 text-3xl/tight font-semibold">{{ value }}</p>
            <p v-if="subtitle" class="mt-2 text-sm opacity-80">{{ subtitle }}</p>
        </v-card-text>
    </v-card>
</template>
