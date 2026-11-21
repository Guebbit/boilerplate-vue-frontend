<script setup lang="ts">
/**
 * @module
 * Renders nothing: reads the availability of the products a product view shows, so that view can
 * show it. Contributed to the `availability-watch` slot by this module's manifest. `products` owns
 * the views and cannot import `inventory` (it would be a cycle), and the read is inventory's
 * (`GET /products/{id}/availability`); the answer comes back through `@/kernel/availability`.
 */
import { useStockCount } from '../composables/use-stock-count';
import { useWatchAvailability } from '../composables/use-watch-availability';

/**
 * What the host view hands in: the products on screen, how old an answer may be, and whether a
 * stock reader's shelf count is wanted too (the product page).
 */
const { productIds, staleTime, withStockCount } = defineProps<{
    productIds: readonly string[];
    staleTime: number;
    withStockCount?: boolean;
}>();

useWatchAvailability(() => productIds, staleTime);

useStockCount(() => (withStockCount ? productIds : []));
</script>

<template>
    <span hidden aria-hidden="true" />
</template>
