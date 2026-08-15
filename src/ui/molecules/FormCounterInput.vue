<script setup lang="ts">
const {
    label = '',
    step = 1,
    min,
    max
} = defineProps<{
    /**
     * Field label
     */
    label?: string;
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
}>();

/**
 * Counter value — v-number-input enforces min/max/step natively.
 */
const count = defineModel<number>();
</script>

<template>
    <v-number-input
        v-model="count"
        :label="label || undefined"
        :min="min"
        :max="max"
        :step="step"
        control-variant="split"
        :hide-details="true"
        class="max-w-52"
    />
</template>
