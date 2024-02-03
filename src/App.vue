<template>
  <component :is="$route.meta.layout || 'div'">
    <RouterView />
  </component>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue';
import { RouterView } from 'vue-router';

import type {
  ProvidedRefMutationFunction,
  ProvidedRefType
} from "@/types";

/**
 * Provide data to all component descendants.
 * Since we are in App.vue: to all application
 *
 * Pair value with its mutation for better reactivity
 */
const providedRef = ref<ProvidedRefType>('From App.vue');
const setProvidedRef: ProvidedRefMutationFunction = (value = "") => {
  providedRef.value = value;
}

provide('loading', {
  providedRef,
  setProvidedRef
});
</script>