<script lang="ts">
export default {
    name: 'InventoryLedgerPage'
};
</script>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { BookOpen, Timer } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import { routerLinkI18n } from '@/infrastructure/i18n/routerLink.ts';
import { useInventoryStore } from '@/modules/inventory/store.ts';
import { useProductsStore } from '@/modules/products';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { formatDateTime } from '@/infrastructure/utils/formatters.ts';
import { StockMovementReason } from '@types';
import type { StockMovementReason as TStockMovementReason } from '@types';

/**
 * The stock board and the ledger behind it, admin-side — one page, deliberately.
 *
 * The board is what is on the shelf right now, three numbers per product; the ledger is every
 * movement newest first with its why. They stay on one screen rather than behind tabs because the
 * page's whole story is a write landing in both at once: receive a delivery and the board rises
 * WHILE the row explaining it appears below. Both are the API's — nothing here adds up a column,
 * because `available` is derived server-side and a second subtraction is a second thing that can
 * disagree.
 *
 * Two write forms for the domain's two transitions: a RECEIPT (strictly positive — a delivery
 * that removes units is not a delivery) and an ADJUSTMENT (signed, shrinkage being the common
 * case, refused when it would leave fewer units than are already promised to orders). One form
 * with a sign toggle would let a mis-click turn one into the other.
 *
 * The sweep is the third button: the API ships no scheduler, so expiring stale holds is a tick
 * driven from outside — a cron in production, an operator here. Same arrangement as the courier's
 * advance button in the delivery panel.
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const inventoryStore = useInventoryStore();
const { movements, movementsTotal, levels, levelsTotal, loading } = storeToRefs(inventoryStore);
const productsStore = useProductsStore();
const { productsList } = storeToRefs(productsStore);

/** Shared with the mock and small on purpose — an admin table, not a feed. */
const PAGE_SIZE = 10;

const receiptProductId = ref<string | undefined>();
const receiptQuantity = ref(10);
const receiptNote = ref('');

const adjustProductId = ref<string | undefined>();
const adjustDelta = ref(-1);
const adjustNote = ref('');

const levelsPage = ref(1);
const lowOnly = ref(false);

const movementsPage = ref(1);
const movementsProductId = ref<string | undefined>();
const movementsReason = ref<TStockMovementReason | undefined>();

/** One select item per known product, so the forms talk titles while the API talks ids. */
const productOptions = computed(() =>
    productsList.value.map((product) => ({ value: product.id, title: product.title }))
);

/** The product filter, with an "everything" row on top. */
const productFilterOptions = computed(() => [
    { value: undefined, title: t('inventory-page.filter-product-all') },
    ...productOptions.value
]);

/** One row per transition, each labelled with what it does to the counters. */
const reasonFilterOptions = computed(() => [
    { value: undefined, title: t('inventory-page.filter-reason-all') },
    ...Object.values(StockMovementReason).map((reason) => ({
        value: reason,
        title: t(`inventory-page.reason-${reason}`)
    }))
]);

const levelsPageTotal = computed(() => Math.ceil(levelsTotal.value / PAGE_SIZE));
const movementsPageTotal = computed(() => Math.ceil(movementsTotal.value / PAGE_SIZE));

/** `+3` / `-3` / `0` — the sign is the information, so it is never dropped. */
const signed = (delta: number) => (delta > 0 ? `+${delta}` : String(delta));

/** Green for units gained, red for units lost, neutral for a counter this transition left alone. */
const deltaClass = (delta: number) =>
    delta === 0 ? 'opacity-50' : delta < 0 ? 'text-error' : 'text-success';

/** Title lookup for the ledger — it stores ids, the page can still say names. */
const productTitle = (productId: string) =>
    productsList.value.find(({ id }) => id === productId)?.title ?? productId;

const loadLevels = () =>
    inventoryStore.fetchLevels({
        page: levelsPage.value,
        pageSize: PAGE_SIZE,
        lowOnly: lowOnly.value || undefined
    });

const loadMovements = () =>
    inventoryStore.fetchMovements({
        page: movementsPage.value,
        pageSize: PAGE_SIZE,
        productId: movementsProductId.value,
        reason: movementsReason.value
    });

watch([levelsPage, lowOnly], () => void loadLevels());
watch([movementsPage, movementsProductId, movementsReason], () => void loadMovements());

/** The board row's shortcut into the ledger: this product's story, from the first page. */
const showHistory = (productId: string) => {
    movementsProductId.value = productId;
    movementsPage.value = 1;
};

const handleReceipt = () => {
    if (!receiptProductId.value) return;
    inventoryStore
        .receive(receiptProductId.value, receiptQuantity.value, receiptNote.value || undefined)
        .then((level) => {
            addMessage(t('inventory-page.success-receipt', { available: level?.available ?? 0 }));
            receiptNote.value = '';
            // The catalogue carries its own copy of the counters, so it has to hear about this too.
            return productsStore.fetchProducts();
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));
};

/**
 * A stocktake correction. The interesting failure is the 409 — the correction would leave fewer
 * units than are already reserved — and the server's message says so; `notifyErrorMessages`
 * carries it through verbatim, because "cancel orders, don't make availability negative" is the
 * fix and the copy already names it.
 */
const handleAdjust = () => {
    if (!adjustProductId.value || adjustDelta.value === 0) return;
    inventoryStore
        .adjust(adjustProductId.value, adjustDelta.value, adjustNote.value || undefined)
        .then((level) => {
            addMessage(t('inventory-page.success-adjust', { available: level?.available ?? 0 }));
            adjustNote.value = '';
            return productsStore.fetchProducts();
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));
};

/**
 * Expires every stale hold. Idempotent server-side, so the confirm is about intent, not danger —
 * the orders behind the released holds get cancelled, and that is worth a deliberate click.
 */
const handleSweep = () => {
    if (!globalThis.confirm(t('inventory-page.confirm-sweep'))) return;
    inventoryStore
        .sweep()
        .then((expired) => addMessage(t('inventory-page.success-sweep', { expired: expired ?? 0 })))
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));
};

onMounted(() => {
    void loadLevels();
    void loadMovements();
    if (productsList.value.length === 0) void productsStore.fetchProducts();
});
</script>

<template>
    <LayoutDefault id="inventory-page" :title="t('inventory-page.page-title')">
        <div class="mb-6 grid gap-4 lg:grid-cols-2">
            <v-card class="p-4" data-test="receipt-form">
                <h3 class="mb-2 text-base font-semibold">
                    {{ t('inventory-page.receipt-title') }}
                </h3>
                <div class="flex flex-wrap items-center gap-3">
                    <v-select
                        v-model="receiptProductId"
                        :items="productOptions"
                        :label="t('inventory-page.label-product')"
                        data-test="receipt-product"
                        class="min-w-56"
                        hide-details
                    />
                    <v-text-field
                        v-model.number="receiptQuantity"
                        type="number"
                        min="1"
                        :label="t('inventory-page.label-quantity')"
                        data-test="receipt-quantity"
                        class="max-w-28"
                        hide-details
                    />
                    <v-text-field
                        v-model="receiptNote"
                        :label="t('inventory-page.label-note')"
                        data-test="receipt-note"
                        class="min-w-40 grow"
                        hide-details
                    />
                    <v-btn
                        color="primary"
                        data-test="receipt-submit"
                        :disabled="loading || !receiptProductId || receiptQuantity < 1"
                        @click="handleReceipt"
                    >
                        {{ t('inventory-page.button-receipt') }}
                    </v-btn>
                </div>
            </v-card>

            <v-card class="p-4" data-test="adjust-form">
                <h3 class="mb-2 text-base font-semibold">
                    {{ t('inventory-page.adjust-title') }}
                </h3>
                <div class="flex flex-wrap items-center gap-3">
                    <v-select
                        v-model="adjustProductId"
                        :items="productOptions"
                        :label="t('inventory-page.label-product')"
                        data-test="adjust-product"
                        class="min-w-56"
                        hide-details
                    />
                    <v-text-field
                        v-model.number="adjustDelta"
                        type="number"
                        :label="t('inventory-page.label-delta')"
                        :hint="t('inventory-page.hint-delta')"
                        data-test="adjust-delta"
                        class="max-w-28"
                        persistent-hint
                    />
                    <v-text-field
                        v-model="adjustNote"
                        :label="t('inventory-page.label-note-why')"
                        data-test="adjust-note"
                        class="min-w-40 grow"
                        hide-details
                    />
                    <v-btn
                        color="secondary"
                        data-test="adjust-submit"
                        :disabled="loading || !adjustProductId || adjustDelta === 0"
                        @click="handleAdjust"
                    >
                        {{ t('inventory-page.button-adjust') }}
                    </v-btn>
                </div>
            </v-card>
        </div>

        <div class="mb-2 flex flex-wrap items-center gap-3">
            <h3 class="text-base font-semibold">{{ t('inventory-page.board-title') }}</h3>
            <v-switch
                v-model="lowOnly"
                :label="t('inventory-page.label-low-only')"
                color="warning"
                hide-details
                density="compact"
                data-test="levels-low-only"
            />
            <v-spacer />
            <span class="text-sm opacity-70">
                {{ t('inventory-page.total-items', { total: levelsTotal }) }}
            </span>
        </div>

        <v-table v-if="levels.length > 0" class="mb-2" data-test="levels-table">
            <thead>
                <tr>
                    <th>{{ t('inventory-page.column-product') }}</th>
                    <th>{{ t('inventory-page.column-on-hand') }}</th>
                    <th>{{ t('inventory-page.column-reserved') }}</th>
                    <th>{{ t('inventory-page.column-available') }}</th>
                    <th />
                </tr>
            </thead>
            <tbody>
                <tr v-for="level in levels" :key="level.productId" data-test="level-row">
                    <td>{{ level.title }}</td>
                    <td>{{ level.onHand }}</td>
                    <td>{{ level.reserved }}</td>
                    <td class="font-medium">{{ level.available }}</td>
                    <td>
                        <v-btn
                            size="small"
                            variant="text"
                            data-test="level-history"
                            @click="showHistory(level.productId)"
                        >
                            {{ t('inventory-page.button-history') }}
                        </v-btn>
                    </td>
                </tr>
            </tbody>
        </v-table>
        <ListPagination v-model="levelsPage" :length="levelsPageTotal" class="mb-6" />

        <div class="mb-2 flex flex-wrap items-center gap-3">
            <h3 class="text-base font-semibold">{{ t('inventory-page.ledger-title') }}</h3>
            <v-select
                v-model="movementsProductId"
                :items="productFilterOptions"
                :label="t('inventory-page.label-product')"
                class="max-w-64"
                hide-details
                density="compact"
                data-test="movements-filter-product"
            />
            <v-select
                v-model="movementsReason"
                :items="reasonFilterOptions"
                :label="t('inventory-page.column-reason')"
                class="max-w-52"
                hide-details
                density="compact"
                data-test="movements-filter-reason"
            />
            <v-spacer />
            <!--
                The audit's honest number: how many rows MATCH, not how many are shown. A read
                that returned only the newest rows would misreport history as complete.
            -->
            <span class="text-sm opacity-70" data-test="movements-total">
                {{ t('inventory-page.total-items', { total: movementsTotal }) }}
            </span>
            <v-btn
                variant="tonal"
                color="warning"
                size="small"
                data-test="sweep-submit"
                :disabled="loading"
                @click="handleSweep"
            >
                <Timer :size="16" class="mr-1" aria-hidden="true" />
                {{ t('inventory-page.button-sweep') }}
            </v-btn>
        </div>

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
                    <th>{{ t('inventory-page.column-note') }}</th>
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
                    <td class="text-xs opacity-75">
                        <!-- A reference is an order id, so it links to the order it explains. -->
                        <router-link
                            v-if="movement.reference"
                            :to="
                                routerLinkI18n({
                                    name: 'OrderTarget',
                                    params: { id: movement.reference }
                                })
                            "
                            class="underline"
                        >
                            {{ movement.reference }}
                        </router-link>
                        <span v-else>—</span>
                    </td>
                    <td class="text-xs opacity-75">{{ movement.note ?? '—' }}</td>
                </tr>
            </tbody>
        </v-table>
        <ListPagination v-model="movementsPage" :length="movementsPageTotal" />
    </LayoutDefault>
</template>
