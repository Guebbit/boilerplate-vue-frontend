<script setup lang="ts">
/**
 * @module
 * An icon-tile info card: a gradient square keyed to a theme accent, a title and a description.
 * `accentClass` is the only logic — everything else is layout.
 */
import type { ThemeAccent } from '@/ui/types.ts';
import { computed } from 'vue';
import { Info } from 'lucide-vue-next';

/**
 * Component props — see each field's own doc comment below.
 */
const props = defineProps<{
    /**
     * Card title.
     */
    title: string;
    /**
     * Card body text.
     */
    description: string;
    /**
     * Theme accent for the icon tile. Defaults to `primary`. Named `accent` to match every other
     * theme-color prop in this kit (`CardMaterialStat`, `ItemDetailLayout`) — this one used to be
     * `variant`, its own name for the same idea.
     */
    accent?: ThemeAccent;
}>();

/**
 * Gradient tile classes per theme accent (the `darken-1` variation comes from the Vuetify theme
 * `variations` config). A top-level `*_CLASSES` const, so the Tailwind lint reads the strings.
 */
const ACCENT_CLASSES = {
    primary: 'bg-linear-to-br from-primary to-primary-darken-1 text-on-primary',
    secondary: 'bg-linear-to-br from-secondary to-secondary-darken-1 text-on-secondary',
    tertiary: 'bg-linear-to-br from-tertiary to-tertiary-darken-1 text-on-tertiary'
} as const;

/**
 * Gradient tile keyed to the theme accent.
 *
 * @returns The utility classes for the requested accent, falling back to `primary`.
 */
const accentClass = computed(() => ACCENT_CLASSES[props.accent ?? 'primary']);
</script>

<template>
    <v-card class="grid grid-cols-term items-center gap-4 p-5">
        <div
            class="grid size-21 place-items-center rounded-2xl"
            :class="accentClass"
            aria-hidden="true"
        >
            <slot name="icon">
                <Info :size="28" />
            </slot>
        </div>
        <div>
            <h3 class="mb-1 text-lg font-semibold">{{ title }}</h3>
            <p class="opacity-80">{{ description }}</p>
        </div>
    </v-card>
</template>
