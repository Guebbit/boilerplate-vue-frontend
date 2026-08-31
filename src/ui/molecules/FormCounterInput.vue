<script setup lang="ts">
/**
 * @module
 * A numeric stepper built on Vuetify's `v-number-input`. Wraps it only to add the
 * label-or-aria-label dev-time guard below and to give the field the same `errorMessages` prop
 * shape every other field in these forms takes.
 */
import { onMounted } from 'vue';
import { logger } from '@/infrastructure/utils/logger.ts';

/**
 * Component props — see each field's own doc comment below.
 */
const {
    label = '',
    ariaLabel,
    step = 1,
    min,
    max,
    errorMessages
} = defineProps<{
    /**
     * Field label. Either this or `ariaLabel` is required: a stepper with neither is two
     * unnamed buttons around an unnamed field.
     */
    label?: string;
    /**
     * The field's name when no visible label fits the layout.
     */
    ariaLabel?: string;
    /**
     * add\sub steps
     */
    step?: number;
    /**
     * Max possible value
     */
    max?: number;
    /**
     * Min possible value
     */
    min?: number;
    /**
     * Validation messages shown under the field, the way every other field takes them.
     */
    errorMessages?: string | string[];
}>();

/**
 * Counter value — v-number-input enforces min/max/step natively.
 */
const count = defineModel<number>();

/**
 * A prop union (`label` XOR `ariaLabel`) would say this at compile time, but `defineProps` cannot
 * destructure a union, so the rule is checked where the component mounts, in development only.
 */
onMounted(() => {
    if (import.meta.env.DEV && !label && !ariaLabel)
        logger.warn('FormCounterInput: provide either `label` or `ariaLabel`.');
});
</script>

<template>
    <v-number-input
        v-model="count"
        :label="label || undefined"
        :aria-label="ariaLabel"
        :min="min"
        :max="max"
        :step="step"
        :error-messages="errorMessages"
        control-variant="split"
        hide-details="auto"
        class="max-w-52"
    />
</template>
