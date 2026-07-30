<template>
    <v-card class="grid grid-cols-[84px_1fr] items-center gap-4 p-5">
        <div
            class="grid h-[84px] w-[84px] place-items-center rounded-2xl"
            :class="variantClass"
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

<script setup lang="ts">
import { computed } from 'vue';
import { Info } from 'lucide-vue-next';

const props = defineProps<{
    title: string;
    description: string;
    variant?: 'primary' | 'secondary' | 'tertiary';
}>();

/**
 * Gradient tile keyed to the theme accent (the `darken-1` variation comes from
 * the Vuetify theme `variations` config).
 *
 * @returns The utility classes for the requested variant, falling back to
 *  `primary`.
 */
const variantClass = computed(
    () =>
        ({
            primary:
                'bg-gradient-to-br from-primary to-[rgb(var(--v-theme-primary-darken-1))] text-on-primary',
            secondary:
                'bg-gradient-to-br from-secondary to-[rgb(var(--v-theme-secondary-darken-1))] text-on-secondary',
            tertiary:
                'bg-gradient-to-br from-tertiary to-[rgb(var(--v-theme-tertiary-darken-1))] text-on-tertiary'
        })[props.variant ?? 'primary']
);
</script>
