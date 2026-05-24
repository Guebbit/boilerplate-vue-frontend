<template>
    <div class="theme-form-input" :class="{ 'form-error': showErrors && errors?.length }">
        <label v-if="label" :for="uuid">{{ label }}</label>
        <textarea
            v-if="multiline"
            :id="uuid"
            v-model="inputValue"
            :placeholder="placeholder"
            :disabled="disabled"
            :rows="rows"
            class="theme-input"
        />
        <input
            v-else
            :id="uuid"
            v-model="inputValue"
            :type="type ?? 'text'"
            :placeholder="placeholder"
            :disabled="disabled"
            :min="min"
            :max="max"
            :step="step"
            class="theme-input"
        />
        <p v-if="showErrors && errors?.length" class="form-error-message">
            {{ errors!.join(', ') }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

/**
 * Reusable form field: wraps a text/password/email/number/url/tel input (or textarea)
 * with a label, the theme-form-input layout, and inline validation error display.
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

const uuid = globalThis.crypto.randomUUID();
const model = defineModel<string | number | undefined>();

/**
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
