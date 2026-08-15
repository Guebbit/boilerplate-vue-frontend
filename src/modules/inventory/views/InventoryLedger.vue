<script lang="ts">
export default {
    name: 'InventoryLedgerPage'
};
</script>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { BookOpen } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { useInventoryStore } from '@/modules/inventory/store.ts';
import { useProductsStore } from '@/modules/products';
import { notifyErrorMessages } from '@/infrastructure/errors.ts';
import { formatDateTime } from '@/infrastructure/formatters.ts';

/**
 * The stock ledger, admin-side: every movement newest first with its why, and the restock form
 * — "the truck arrived" as a button. The product's own stock stays authoritative; this page
 * shows the story, and the count the restock answers with.
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const inventoryStore = useInventoryStore();
const { movements, loading } = storeToRefs(inventoryStore);
const productsStore = useProductsStore();
const { productsList } = storeToRefs(productsStore);

const restockProductId = ref<string | undefined>();
const restockQuantity = ref(10);

/** One select item per known product, so the form talks titles while the API talks ids. */
const productOptions = computed(() =>
    productsList.value.map((product) => ({ value: product.id, title: product.title }))
);

/** Title lookup for the table — the ledger stores ids, the page can still say names. */
const productTitle = (productId: string) =>
    productsList.value.find(({ id }) => id === productId)?.title ?? productId;

const handleRestock = () => {
    if (!restockProductId.value) return;
    inventoryStore
        .restock(restockProductId.value, restockQuantity.value)
        .then((stock) => {
            addMessage(t('inventory-page.success-restock', { stock }));
            return productsStore.fetchProducts();
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));
};

onMounted(() => {
    void inventoryStore.fetchMovements();
    if (productsList.value.length === 0) void productsStore.fetchProducts();
});
</script>

<template>
    <LayoutDefault id="inventory-page" :title="t('inventory-page.page-title')">
        <v-card class="mb-6 p-4" data-test="restock-form">
            <h3 class="mb-2 text-base font-semibold">{{ t('inventory-page.restock-title') }}</h3>
            <div class="flex flex-wrap items-center gap-3">
                <v-select
                    v-model="restockProductId"
                    :items="productOptions"
                    :label="t('inventory-page.label-product')"
                    data-test="restock-product"
                    class="min-w-64"
                    hide-details
                />
                <v-text-field
                    v-model.number="restockQuantity"
                    type="number"
                    min="1"
                    :label="t('inventory-page.label-quantity')"
                    data-test="restock-quantity"
                    class="max-w-32"
                    hide-details
                />
                <v-btn
                    color="primary"
                    data-test="restock-submit"
                    :disabled="loading || !restockProductId"
                    @click="handleRestock"
                >
                    {{ t('inventory-page.button-restock') }}
                </v-btn>
            </div>
        </v-card>

        <v-empty-state v-if="movements.length === 0" :title="t('inventory-page.empty')">
            <template #media>
                <BookOpen :size="64" class="text-secondary" aria-hidden="true" />
            </template>
        </v-empty-state>

        <v-table v-else data-test="movements-table">
            <thead>
                <tr>
                    <th>{{ t('inventory-page.column-when') }}</th>
                    <th>{{ t('inventory-page.column-product') }}</th>
                    <th>{{ t('inventory-page.column-delta') }}</th>
                    <th>{{ t('inventory-page.column-reason') }}</th>
                    <th>{{ t('inventory-page.column-reference') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="movement in movements" :key="movement.id" data-test="movement-row">
                    <td>{{ movement.createdAt ? formatDateTime(movement.createdAt) : '—' }}</td>
                    <td>{{ productTitle(movement.productId) }}</td>
                    <td :class="movement.delta < 0 ? 'text-error' : 'text-success'">
                        {{ movement.delta > 0 ? `+${movement.delta}` : movement.delta }}
                    </td>
                    <td>
                        <v-chip size="x-small" data-test="movement-reason">
                            {{ t(`inventory-page.reason-${movement.reason}`) }}
                        </v-chip>
                    </td>
                    <td class="text-xs opacity-75">{{ movement.reference ?? '—' }}</td>
                </tr>
            </tbody>
        </v-table>
    </LayoutDefault>
</template>
