<template>
  <Navigation />
  <main class="page-content">
    <slot />
  </main>
  <CoreLoading
      v-show="loading.core"
  />
  <SideLoading
      v-show="isLoading"
  />
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import CoreLoading from "@/components/CoreLoading.vue";
import SideLoading from "@/components/SideLoading.vue";
import Navigation from "@/components/Navigation.vue";
import useCoreStore from "@/stores/core";

/**
 * core loading
 * TODO mettere tutto dentro storeToRefs?
 */
const store = useCoreStore();
const {
  loading
} = store;
const {
  isLoading
} = storeToRefs(store);

setTimeout(() => {
  loading.core = true;
  console.log("HEYYEYYY", isLoading.value, {...loading});
}, 1000)
</script>

<style lang="scss">
.page-content{
  max-width: 1280px;
  margin: 0 auto;
}
</style>