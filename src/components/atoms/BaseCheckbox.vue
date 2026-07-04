<template>
    <VCheckbox
        v-model="model"
        :label="label"
        :disabled="disabled"
        :error-messages="showErrors ? errors : []"
        hide-details="auto"
    >
        <template #message="{ message }">
            <span class="form-error-message">{{ message }}</span>
        </template>
    </VCheckbox>
</template>

<script setup lang="ts">
import { VCheckbox } from 'vuetify/components';

/*
 * Reusable checkbox on top of Vuetify VCheckbox,
 * with optional validation error display.
 */
defineProps<{
    label?: string;
    disabled?: boolean;
    errors?: string[];
    showErrors?: boolean;
}>();

const model = defineModel<boolean | undefined>();
</script>
