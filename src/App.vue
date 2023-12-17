<template>
  <component :is="$route.meta.layout || 'div'">
    <RouterView />
  </component>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue';
import { RouterView } from 'vue-router';

/**
 * Provide data to all component descendants.
 * Since we are in App.vue: to all application
 */
provide('providedRef', ref('Lorem Ipsum'));

// navigator.language.slice(0, 2)
// loadedLanguages
</script>