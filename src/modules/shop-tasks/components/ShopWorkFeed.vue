<script setup lang="ts">
/**
 * @module
 * Renders nothing: it is mounted in the app bar for as long as the shell is, and that is what
 * keeps the staff nav badge counts fed (`useShopWorkFeed`).
 */
import { useShopWorkFeed } from '../composables/use-shop-work-feed';

useShopWorkFeed();
</script>

<template>
    <span hidden />
</template>
