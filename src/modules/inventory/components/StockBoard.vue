<script lang="ts">
export default {
    name: 'StockBoard'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Stock board tab: current shelf counts, one row per product, filterable to low-availability
 * only. Reads through `useInventoryStore` directly; the row's history button just emits — the
 * parent view owns jumping the ledger below to that product.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import DataTable from '@/ui/organisms/DataTable.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import { useInventoryStore } from '@/modules/inventory/store.ts';
import type { InventoryLevel } from '@types';

/**
 * The shelf counts, one row per product: what is on hand right now, three numbers each. The
 * "history" button on a row jumps the ledger below to that product's story.
 */
const { t } = useI18n();

/**
 * Owns the levels read this board renders.
 */
const inventoryStore = useInventoryStore();

/**
 * The current page of levels, their total count across pages, and the shared loading flag.
 */
const { levels, levelsTotal, loading } = storeToRefs(inventoryStore);

/**
 * Emitted when a row's history button is pressed, naming the product the ledger below should
 * jump to.
 */
const emit = defineEmits<{
    /**
     * A row's history button was pressed; the ledger below should jump to this product.
     */
    history: [productId: string];
}>();

/**
 * Small on purpose — this is an admin table to read, not a feed to scroll.
 */
const PAGE_SIZE = 10;

/**
 * Columns of the stock board.
 *
 * @returns The localized headers, re-translated on locale change.
 */
const levelHeaders = computed<CoreDataTableHeader<InventoryLevel>[]>(() => [
    { title: t('inventory-page.column-product'), key: 'title' },
    { title: t('inventory-page.column-on-hand'), key: 'onHand' },
    { title: t('inventory-page.column-reserved'), key: 'reserved' },
    { title: t('inventory-page.column-available'), key: 'available' },
    // Reads no field: the cell is a button, and the column has no heading.
    { title: '', key: 'history', synthetic: true }
]);

/**
 * Which board page is showing.
 */
const levelsPage = ref(1);

/**
 * When on, narrows the board to products at or under the server's low-availability threshold.
 */
const lowOnly = ref(false);

/**
 * How many pages the current filter spans.
 */
const levelsPageTotal = computed(() => Math.ceil(levelsTotal.value / PAGE_SIZE));

/**
 * Loads the board page matching the current filters.
 */
const loadLevels = () =>
    inventoryStore.fetchLevels({
        page: levelsPage.value,
        pageSize: PAGE_SIZE,
        lowOnly: lowOnly.value || undefined
    });

watch([levelsPage, lowOnly], () => void loadLevels());

onMounted(() => {
    void loadLevels();
});
</script>

<template>
    <div class="mb-2 flex flex-wrap items-center gap-3">
        <h2 class="text-base font-semibold">{{ t('inventory-page.board-title') }}</h2>
        <v-switch
            v-model="lowOnly"
            :label="t('inventory-page.label-low-only')"
            color="warning"
            hide-details
            density="compact"
            data-test="levels-low-only"
        />
        <v-spacer />
        <span class="text-sm opacity-70" role="status" data-test="levels-total">
            {{ t('inventory-page.total-items', { total: levelsTotal }) }}
        </span>
    </div>

    <DataTable
        v-if="levels.length > 0"
        class="mb-2"
        :headers="levelHeaders"
        :items="levels"
        :caption="t('inventory-page.board-title')"
        :loading="loading"
        :loading-text="t('generic.loading')"
        :no-data-text="t('generic.no-data')"
        item-value="productId"
        row-test="level-row"
    >
        <template v-slot:[`item.available`]="{ item }">
            <span class="font-medium">{{ item.available }}</span>
        </template>

        <template v-slot:[`item.history`]="{ item }">
            <v-btn
                size="small"
                variant="text"
                data-test="level-history"
                :aria-label="t('inventory-page.button-history-named', { name: item.title })"
                @click="emit('history', item.productId)"
            >
                {{ t('inventory-page.button-history') }}
            </v-btn>
        </template>
    </DataTable>
    <ListPagination
        v-model="levelsPage"
        :length="levelsPageTotal"
        :aria-label="t('inventory-page.pagination-board')"
        class="mb-6"
    />
</template>
