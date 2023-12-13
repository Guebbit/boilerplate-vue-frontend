<template>
  <div>
    <h1>401 UNAUTHORIZED</h1>
    <h3>{{ error }}</h3>
  </div>
</template>

<script setup lang="ts">
defineProps({
  error: {
    type: String,
    default: () => ""
  },
});
</script>