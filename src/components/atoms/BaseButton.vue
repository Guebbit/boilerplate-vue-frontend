<template>
    <VBtn :type="type ?? 'button'" :disabled="disabled" color="primary" variant="flat">
        <slot />
    </VBtn>
</template>

<script setup lang="ts">
import { VBtn } from 'vuetify/components';

/*
 * Reusable button on top of Vuetify VBtn.
 * Defaults to type="button" to avoid accidental form submissions.
 */
defineProps<{
    type?: 'submit' | 'button' | 'reset';
    disabled?: boolean;
}>();
</script>
