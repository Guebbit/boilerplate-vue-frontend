<template>
  <Navigation />
  <main class="page-content">
    <slot />
  </main>
  <CoreLoading
    v-show="loading"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import CoreLoading from "@/components/Loading.vue";
import Navigation from "@/components/Navigation.vue";
import useCoreStore from "@/stores/core";

/**
 * core loading
 */
const {
  loading
} = storeToRefs(useCoreStore());
</script>

<style lang="scss">
.page-content{
  max-width: 1280px;
  margin: 0 auto;
}
</style>