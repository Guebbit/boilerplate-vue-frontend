<template>
    <VTextarea
        v-if="multiline"
        v-model="inputValue"
        :label="label"
        :placeholder="placeholder"
        :disabled="disabled"
        :rows="rows"
        :error-messages="showErrors ? errors : []"
    >
        <template #message="{ message }">
            <span class="form-error-message">{{ message }}</span>
        </template>
    </VTextarea>
    <VTextField
        v-else
        v-model="inputValue"
        :label="label"
        :type="type ?? 'text'"
        :placeholder="placeholder"
        :disabled="disabled"
        :min="min"
        :max="max"
        :step="step"
        :error-messages="showErrors ? errors : []"
    >
        <template #message="{ message }">
            <span class="form-error-message">{{ message }}</span>
        </template>
    </VTextField>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { VTextField, VTextarea } from 'vuetify/components';

/*
 * Reusable form field on top of Vuetify VTextField/VTextarea,
 * with label and inline validation error display.
 */
const props = defineProps<{
    label?: string;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    multiline?: boolean;
    rows?: number;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    errors?: string[];
    showErrors?: boolean;
}>();

const model = defineModel<string | number | undefined>();

/*
 * Computed wrapper that coerces the emitted value to number when type="number",
 * keeping the parent model correctly typed without requiring v-model.number.
 */
const inputValue = computed({
    get: () => String(model.value ?? ''),
    set: (value: string) => {
        if (props.type === 'number') {
            const n = Number.parseFloat(value);
            model.value = Number.isNaN(n) ? undefined : n;
        } else {
            model.value = value;
        }
    }
});
</script>
