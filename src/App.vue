<template>
    <RouterView />
</template>

<script setup lang="ts">
import { ref, provide } from 'vue';
import { RouterView } from 'vue-router';

/**
 * Types of value and it's mutation
 */
import type { IProvidedVariableType, IProvidedVariableMutationFunction } from '@/types';

/**
 * Provide data to all component descendants.
 * Since we are in App.vue: to all application
 */
const providedVariable = ref<IProvidedVariableType>('From App.vue');
const setProvidedVariable: IProvidedVariableMutationFunction = (value = '') => {
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
