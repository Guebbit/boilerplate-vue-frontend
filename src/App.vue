<script setup lang="ts">
import { ref, provide } from 'vue';
import { RouterView } from 'vue-router';

/**
 * Types of value and it's mutation
 */
import type { ProvidedVariableType, ProvidedVariableMutationFunction } from '@/types';

/**
 * Provide data to all component descendants.
 * Since we are in App.vue: to all application
 */
const providedVariable = ref<ProvidedVariableType>('From App.vue');

/**
 * Mutation paired with {@link providedVariable}, so descendants never write to
 * the injected ref directly.
 *
 * @param value - New value; defaults to an empty string, which clears it.
 */
const setProvidedVariable: ProvidedVariableMutationFunction = (value = '') => {
    providedVariable.value = value;
};

/**
 * Pair value with its mutation for better reactivity
 */
provide('providedVariable', {
    providedVariable,
    setProvidedVariable
});
</script>

<template>
    <RouterView />
</template>
