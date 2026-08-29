<script lang="ts">
export default {
    name: 'InventoryLedgerPage'
};
</script>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import StockMovementForm from '@/modules/inventory/components/StockMovementForm.vue';
import StockBoard from '@/modules/inventory/components/StockBoard.vue';
import MovementLedger from '@/modules/inventory/components/MovementLedger.vue';
import { useProductsStore } from '@/modules/products';

/**
 * The stock board and the ledger behind it, admin-side — one page, deliberately.
 *
 * The board is what is on the shelf right now, three numbers per product; the ledger is every
 * movement newest first with its why. They stay on one screen rather than behind tabs because the
 * page's whole story is a write landing in both at once: receive a delivery and the board rises
 * WHILE the row explaining it appears below. Both are the API's — nothing here adds up a column,
 * because `available` is derived server-side and a second subtraction is a second thing that can
 * disagree. `StockBoard` and `MovementLedger` both read `useInventoryStore()` directly, so that
 * reactivity carries the write from one to the other with no wiring of this page's own.
 */
const { t } = useI18n();

const movementLedger = ref<InstanceType<typeof MovementLedger>>();

/*
 * The catalogue three children share (both forms' product select, the ledger's product column
 * and filter) — fetched once here rather than by each of them, so a page load does not race
 * three simultaneous first-fetches against the same store.
 */
const productsStore = useProductsStore();
const { productsList } = storeToRefs(productsStore);
onMounted(() => {
    if (productsList.value.length === 0) void productsStore.fetchProducts();
});
</script>

<template>
    <LayoutDefault id="inventory-page" :title="t('inventory-page.page-title')">
        <div class="mb-6 grid gap-4 lg:grid-cols-2">
            <StockMovementForm mode="receipt" />
            <StockMovementForm mode="adjust" />
        </div>

        <StockBoard @history="(productId) => movementLedger?.focusProduct(productId)" />

        <MovementLedger ref="movementLedger" />
    </LayoutDefault>
</template>
