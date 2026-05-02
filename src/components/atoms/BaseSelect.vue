<template>
    <div class="theme-form-input" :class="{ 'form-error': showErrors && errors?.length }">
        <label v-if="label" :for="uuid">{{ label }}</label>
        <select :id="uuid" v-model="model" :disabled="disabled" class="theme-input">
            <option v-if="placeholder !== undefined" value="">{{ placeholder }}</option>
            <option v-for="opt in options" :key="String(opt.value)" :value="opt.value">
                {{ opt.label }}
            </option>
        </select>
        <p v-if="showErrors && errors?.length" class="form-error-message">
            {{ errors!.join(', ') }}
        </p>
    </div>
</template>

<script setup lang="ts">

/**
 * Reusable select field: wraps a <select> with a label, the theme-form-input
 * layout, and inline validation error display.
 */
defineProps<{
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    options: { value: string | number | boolean | undefined; label: string }[];
    errors?: string[];
    showErrors?: boolean;
}>();

const uuid = globalThis.crypto.randomUUID();
const model = defineModel<string | number | boolean | undefined>();
</script>
