<template>
  <h1>{{ status }}</h1>
  <h3>{{ message }}</h3>
</template>

<script setup lang="ts">
defineProps({
  status: {
    type: Number,
    required: false
  },
  message: {
    type: String,
    default: () => ""
  },
});
</script>