<template>
  <component :is="$route.meta.layout ?? 'div'">
    <RouterView />
  </component>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue';
import { RouterView } from 'vue-router';

/**
 * Types of value and it's mutation
 */
import type {
  ProvidedRefType,
  ProvidedRefMutationFunction,
} from "@/types";

/**
 * Provide data to all component descendants.
 * Since we are in App.vue: to all application
 */
const providedRef = ref<ProvidedRefType>('From App.vue');
const setProvidedRef: ProvidedRefMutationFunction = (value = "") => {
  providedRef.value = value;
}

/**
 * Pair value with its mutation for better reactivity
 */
provide('providedRef', {
  providedRef,
  setProvidedRef
});
</script>