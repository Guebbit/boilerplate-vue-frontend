<template>
    <div
        class="theme-form-input-checkbox"
        :class="{ 'form-error': showErrors && errors?.length }"
    >
        <input :id="uuid" v-model="model" type="checkbox" :disabled="disabled" />
        <label v-if="label" :for="uuid">{{ label }}</label>
        <p v-if="showErrors && errors?.length" class="form-error-message">
            {{ errors!.join(', ') }}
        </p>
    </div>
</template>

<script setup lang="ts">
import { getUuid } from '@guebbit/js-toolkit';

/**
 * Reusable checkbox field: wraps a checkbox input with a label in the
 * theme-form-input-checkbox layout, with optional validation error display.
 */
defineProps<{
    label?: string;
    disabled?: boolean;
    errors?: string[];
    showErrors?: boolean;
}>();

const uuid = getUuid();
const model = defineModel<boolean | undefined>();
</script>
