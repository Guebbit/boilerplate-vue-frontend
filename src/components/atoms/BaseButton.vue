<template>
    <button :type="type ?? 'button'" :disabled="disabled" class="theme-button">
        <slot />
    </button>
</template>

<script setup lang="ts">
/**
 * Reusable button using the theme-button style.
 * Defaults to type="button" to avoid accidental form submissions.
 */
defineProps<{
    type?: 'submit' | 'button' | 'reset';
    disabled?: boolean;
}>();
</script>
