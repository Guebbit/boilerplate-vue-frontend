<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'OrderDisputes'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The order page's dispute banner. Crosses the barrel as a component so the payments store stays on
 * this side: it shows the disputes of the payment the store last read for THIS order, which the
 * page's `useOrderRefund` has already fetched. Nothing is fetched here.
 */
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { usePaymentsStore } from '../store.ts';
import DisputeBanner from './DisputeBanner.vue';

/**
 * The order whose payment's disputes are shown.
 */
const { orderId } = defineProps<{
    /** The order this banner belongs to. */
    orderId: string;
}>();

/**
 * The payment the store last read, whichever order it was for.
 */
const { payment } = storeToRefs(usePaymentsStore());

/**
 * The disputes of this order's payment; a payment read for another order (a slow response landing
 * after the route moved on) shows none.
 */
const disputes = computed(() =>
    payment.value?.orderId === orderId ? (payment.value.disputes ?? []) : []
);
</script>

<template>
    <DisputeBanner :disputes="disputes" />
</template>
