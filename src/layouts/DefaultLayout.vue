<template>
  <Navigation />
  <main class="page-content">
    <slot />
  </main>
</template>

<script setup lang="ts">
import Navigation from "@/components/Navigation.vue";
</script>

<style lang="scss">
.page-content{
  max-width: 1280px;
  margin: 0 auto;
}
</style>