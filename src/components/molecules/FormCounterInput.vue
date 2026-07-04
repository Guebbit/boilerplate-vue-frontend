<template>
    <div class="counter-input d-inline-flex align-center ga-2">
        <VBtn
            class="counter-sub"
            icon="$minus"
            size="small"
            variant="tonal"
            color="primary"
            @click="updateCounter(-step)"
        />
        <VTextField
            :model-value="count?.toString()"
            @update:model-value="triggerUpdateInput"
            :label="label.length > 0 ? label : undefined"
            type="text"
            :max="max"
            :min="min"
            density="compact"
            hide-details
            style="width: 6em"
        />
        <VBtn
            class="counter-add"
            icon="$plus"
            size="small"
            variant="tonal"
            color="primary"
            @click="updateCounter(step)"
        />
    </div>
</template>

<script setup lang="ts">
import { watch } from 'vue';
import { VBtn, VTextField } from 'vuetify/components';

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

/*
 * Counter value
 */
const count = defineModel<number>();

/*
 * Parse manual input and update the model when valid.
 * @param value - raw input string
 */
const triggerUpdateInput = (value: string) => {
    const countInt = Number.parseInt(value);
    if (countInt || countInt === 0) count.value = countInt;
};

/*
 * Update counter
 * @param delta - amount to add (can be negative)
 */
const updateCounter = (delta = 0) => {
    if (!count.value && count.value !== 0) return;
    count.value += delta;
};

/*
 * Clamp the counter between min and max
 * ("min"/"max" input attributes can't be trusted)
 */
const fixCounter = () => {
    // if undefined or null
    if (!count.value) return;
    // fix attr min
    if ((min || min === 0) && count.value < min) count.value = Math.max(count.value, min);
    // fix attr max
    if ((max || max === 0) && count.value > max) count.value = Math.min(count.value, max);
};

watch([count, () => min, () => max], () => {
    fixCounter();
});
</script>
