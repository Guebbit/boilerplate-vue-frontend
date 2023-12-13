<template>
  <Navigation />
  <main class="page-content-error">
    <h1 class="page-title">Error</h1>
    <slot />
  </main>
</template>

<script setup lang="ts">
import Navigation from "@/components/Navigation.vue";
</script>

<style lang="scss">
.page-content-error {
  .page-title{
    font-size: 2em;
  }
}
</style>