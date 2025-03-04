<template>
    <RouterView />
</template>

<script setup lang="ts">
import { ref, provide } from 'vue'
import { RouterView } from 'vue-router'

/**
 * Types of value and it's mutation
 */
import type {
    ProvidedVariableType,
    ProvidedVariableMutationFunction
} from '@/types'

/**
 * Provide data to all component descendants.
 * Since we are in App.vue: to all application
 */
const ProvidedVariable = ref<ProvidedVariableType>('From App.vue')
const setProvidedVariable: ProvidedVariableMutationFunction = (value = '') => {
    ProvidedVariable.value = value
}

/**
 * Pair value with its mutation for better reactivity
 */
provide('ProvidedVariable', {
    ProvidedVariable,
    setProvidedVariable
})
</script>