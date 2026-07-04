<template>
    <VSelect
        v-model="model"
        :label="label"
        :placeholder="placeholder"
        :disabled="disabled"
        :items="options"
        item-title="label"
        item-value="value"
        :error-messages="showErrors ? errors : []"
    >
        <template #message="{ message }">
            <span class="form-error-message">{{ message }}</span>
        </template>
    </VSelect>
</template>

<script setup lang="ts">
import { VSelect } from 'vuetify/components';

/*
 * Reusable select field on top of Vuetify VSelect,
 * with label and inline validation error display.
 */
defineProps<{
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    options: { value: string | number | boolean | undefined; label: string }[];
    errors?: string[];
    showErrors?: boolean;
}>();

const model = defineModel<string | number | boolean | undefined>();
</script>
