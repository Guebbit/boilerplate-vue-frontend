<template>
  <LayoutDefault>
      <h1>{{ status }}</h1>
      <h3>{{ message }}</h3>
  </LayoutDefault>
</template>

<script setup lang="ts">
import LayoutDefault from '@/layouts/LayoutDefault.vue'

const {
    message = ""
} = defineProps<{
  status?: number
  message?: string
}>()
</script>