<template>

  <Navigation />

  <main class="page-content">
    <slot />
  </main>

  <CoreLoading
      v-show="loadings.core"
  />

  <SideLoading
      v-show="isLoading"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import CoreLoading from "@/components/atoms/CoreLoading.vue";
import SideLoading from "@/components/atoms/SideLoading.vue";
import Navigation from "@/components/organisms/Navigation.vue";
import useCoreStore from "@/stores/core";

/**
 * core loading
 * // TODO why loadings.core is not recognized
 */
const store = useCoreStore();
const {
  loadings,
  isLoading
} = storeToRefs(store);

</script>

<style lang="scss">
.page-content{
  max-width: 1280px;
  margin: 0 auto;
}
</style>