<template>
  <h1>{{ status }}</h1>
  <h3>{{ message }}</h3>
</template>

<script setup lang="ts">
const {
    message = ""
} = defineProps<{
  status?: number
  message?: string
}>()
</script>