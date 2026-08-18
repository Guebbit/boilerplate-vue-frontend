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
 * The stock board and the ledger behind it, admin-side.
 *
 * The board is what is on the shelf right now, three numbers per product; the ledger is every
 * movement newest first with its why. Both are the API's — nothing here adds up a column to
 * produce a total, because `available` is derived server-side and a second subtraction is a
 * second thing that can disagree.
 *
 * The form writes a RECEIPT: a delivery arriving, strictly positive. A stocktake correction is a
 * different transition (signed, and refused when it would leave fewer units than are reserved) and
 * belongs to a different form; the store already exposes `adjust` for when that page exists.
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const inventoryStore = useInventoryStore();
const { movements, levels, loading } = storeToRefs(inventoryStore);
const productsStore = useProductsStore();
const { productsList } = storeToRefs(productsStore);

const receiptProductId = ref<string | undefined>();
const receiptQuantity = ref(10);

/** One select item per known product, so the form talks titles while the API talks ids. */
const productOptions = computed(() =>
    productsList.value.map((product) => ({ value: product.id, title: product.title }))
);

/** `+3` / `-3` / `0` — the sign is the information, so it is never dropped. */
const signed = (delta: number) => (delta > 0 ? `+${delta}` : String(delta));

/** Green for units gained, red for units lost, neutral for a counter this transition left alone. */
const deltaClass = (delta: number) =>
    delta === 0 ? 'opacity-50' : delta < 0 ? 'text-error' : 'text-success';

/** Title lookup for the table — the ledger stores ids, the page can still say names. */
const productTitle = (productId: string) =>
    productsList.value.find(({ id }) => id === productId)?.title ?? productId;

const handleReceipt = () => {
    if (!receiptProductId.value) return;
    inventoryStore
        .receive(receiptProductId.value, receiptQuantity.value)
        .then((level) => {
            addMessage(t('inventory-page.success-receipt', { available: level?.available ?? 0 }));
            // The catalogue carries its own copy of the counters, so it has to hear about this too.
            return productsStore.fetchProducts();
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));
};

onMounted(() => {
    void inventoryStore.fetchLevels();
    void inventoryStore.fetchMovements();
    if (productsList.value.length === 0) void productsStore.fetchProducts();
});
</script>

<template>
    <LayoutDefault id="inventory-page" :title="t('inventory-page.page-title')">
        <v-card class="mb-6 p-4" data-test="receipt-form">
            <h3 class="mb-2 text-base font-semibold">{{ t('inventory-page.receipt-title') }}</h3>
            <div class="flex flex-wrap items-center gap-3">
                <v-select
                    v-model="receiptProductId"
                    :items="productOptions"
                    :label="t('inventory-page.label-product')"
                    data-test="receipt-product"
                    class="min-w-64"
                    hide-details
                />
                <v-text-field
                    v-model.number="receiptQuantity"
                    type="number"
                    min="1"
                    :label="t('inventory-page.label-quantity')"
                    data-test="receipt-quantity"
                    class="max-w-32"
                    hide-details
                />
                <v-btn
                    color="primary"
                    data-test="receipt-submit"
                    :disabled="loading || !receiptProductId"
                    @click="handleReceipt"
                >
                    {{ t('inventory-page.button-receipt') }}
                </v-btn>
            </div>
        </v-card>

        <v-table v-if="levels.length > 0" class="mb-6" data-test="levels-table">
            <thead>
                <tr>
                    <th>{{ t('inventory-page.column-product') }}</th>
                    <th>{{ t('inventory-page.column-on-hand') }}</th>
                    <th>{{ t('inventory-page.column-reserved') }}</th>
                    <th>{{ t('inventory-page.column-available') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="level in levels" :key="level.productId" data-test="level-row">
                    <td>{{ level.title }}</td>
                    <td>{{ level.onHand }}</td>
                    <td>{{ level.reserved }}</td>
                    <td class="font-medium">{{ level.available }}</td>
                </tr>
            </tbody>
        </v-table>

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
                    <th>{{ t('inventory-page.column-on-hand') }}</th>
                    <th>{{ t('inventory-page.column-reserved') }}</th>
                    <th>{{ t('inventory-page.column-reason') }}</th>
                    <th>{{ t('inventory-page.column-reference') }}</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="movement in movements" :key="movement.id" data-test="movement-row">
                    <td>{{ movement.createdAt ? formatDateTime(movement.createdAt) : '—' }}</td>
                    <td>{{ productTitle(movement.productId) }}</td>
                    <td :class="deltaClass(movement.onHandDelta)">
                        {{ signed(movement.onHandDelta) }}
                    </td>
                    <td :class="deltaClass(movement.reservedDelta)">
                        {{ signed(movement.reservedDelta) }}
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
