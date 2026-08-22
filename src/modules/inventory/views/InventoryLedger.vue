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
import { z } from 'zod';
import { useAppForm } from '@/infrastructure/composables/use-app-form.ts';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import DataTable from '@/ui/organisms/DataTable.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useInventoryStore } from '@/modules/inventory/store.ts';
import { useProductsStore } from '@/modules/products';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { EMPTY_VALUE, formatDateTime } from '@/infrastructure/utils/formatters.ts';
import { StockMovementReason } from '@types';
import type {
    InventoryLevel,
    StockMovement,
    StockMovementReason as TStockMovementReason
} from '@types';
import { useDialogStore } from '@/infrastructure/stores/dialog.ts';

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
 * Columns of the movement ledger.
 *
 * `product` reads no field on the row — a movement carries a `productId`, and the title is looked
 * up against the catalogue this page already loaded.
 *
 * @returns The localized headers, re-translated on locale change.
 */
const movementHeaders = computed<CoreDataTableHeader<StockMovement>[]>(() => [
    { title: t('inventory-page.column-when'), key: 'createdAt' },
    { title: t('inventory-page.column-product'), key: 'product', synthetic: true },
    { title: t('inventory-page.column-on-hand'), key: 'onHandDelta' },
    { title: t('inventory-page.column-reserved'), key: 'reservedDelta' },
    { title: t('inventory-page.column-reason'), key: 'reason' },
    { title: t('inventory-page.column-reference'), key: 'reference' },
    { title: t('inventory-page.column-note'), key: 'note' }
]);

/** Small on purpose — this is an admin table to read, not a feed to scroll. */
const PAGE_SIZE = 10;

/**
 * The two write forms, each on `useAppForm` like every other write in the app: a submit with a
 * missing product or a zero quantity SAYS so under the field, rather than sitting behind a button
 * that cannot be pressed and explains nothing.
 */
const receiptFormElement = ref<HTMLFormElement>();
const {
    form: receiptForm,
    formErrors: receiptErrors,
    showFormErrors: showReceiptErrors,
    handleSubmit: handleReceiptSubmit
} = useAppForm(
    { productId: '', quantity: 10, note: '' },
    z.object({
        productId: z.string().min(1, { error: () => t('inventory-page.error-product-required') }),
        // Strictly positive: a delivery that removes units is not a delivery.
        quantity: z
            .number({ error: () => t('inventory-page.error-quantity-positive') })
            .int({ error: () => t('inventory-page.error-quantity-positive') })
            .min(1, { error: () => t('inventory-page.error-quantity-positive') }),
        note: z.string()
    }),
    { formElement: receiptFormElement }
);

const adjustFormElement = ref<HTMLFormElement>();
const {
    form: adjustForm,
    formErrors: adjustErrors,
    showFormErrors: showAdjustErrors,
    handleSubmit: handleAdjustSubmit
} = useAppForm(
    { productId: '', delta: -1, note: '' },
    z.object({
        productId: z.string().min(1, { error: () => t('inventory-page.error-product-required') }),
        // Signed, but never zero: a correction of nothing is a row that explains nothing.
        delta: z
            .number({ error: () => t('inventory-page.error-delta-nonzero') })
            .int({ error: () => t('inventory-page.error-delta-nonzero') })
            .refine((delta) => delta !== 0, {
                error: () => t('inventory-page.error-delta-nonzero')
            }),
        note: z.string()
    }),
    { formElement: adjustFormElement }
);

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

const handleReceipt = () =>
    handleReceiptSubmit(({ productId, quantity, note }) =>
        inventoryStore
            .receive(productId, quantity, note || undefined)
            .then((level) => {
                addMessage(
                    t('inventory-page.success-receipt', { available: level?.available ?? 0 })
                );
                receiptForm.value.note = '';
                // The catalogue carries its own copy of the counters, so it has to hear about this too.
                return productsStore.fetchProducts();
            })
            .then(() => undefined)
            .catch((error: unknown) => notifyErrorMessages(addMessage, error))
    );

/**
 * A stocktake correction. The interesting failure is the 409 — the correction would leave fewer
 * units than are already reserved — and the server's message says so; `notifyErrorMessages`
 * carries it through verbatim, because "cancel orders, don't make availability negative" is the
 * fix and the copy already names it.
 */
const handleAdjust = () =>
    handleAdjustSubmit(({ productId, delta, note }) =>
        inventoryStore
            .adjust(productId, delta, note || undefined)
            .then((level) => {
                addMessage(
                    t('inventory-page.success-adjust', { available: level?.available ?? 0 })
                );
                adjustForm.value.note = '';
                return productsStore.fetchProducts();
            })
            .then(() => undefined)
            .catch((error: unknown) => notifyErrorMessages(addMessage, error))
    );

/**
 * Expires every stale hold. Idempotent server-side, so the confirm is about intent, not danger —
 * the orders behind the released holds get cancelled, and that is worth a deliberate click.
 */
const handleSweep = () =>
    useDialogStore()
        .confirm({ message: t('inventory-page.confirm-sweep'), color: 'warning' })
        .then((accepted) => {
            if (!accepted) return;
            return inventoryStore
                .sweep()
                .then((expired) =>
                    addMessage(t('inventory-page.success-sweep', { expired: expired ?? 0 }))
                )
                .catch((error: unknown) => notifyErrorMessages(addMessage, error));
        });

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
                <h2 class="mb-2 text-base font-semibold">
                    {{ t('inventory-page.receipt-title') }}
                </h2>
                <form
                    ref="receiptFormElement"
                    novalidate
                    class="flex flex-wrap items-start gap-3"
                    @submit.prevent="handleReceipt"
                >
                    <v-select
                        v-model="receiptForm.productId"
                        :items="productOptions"
                        :label="t('inventory-page.label-product')"
                        :error-messages="showReceiptErrors ? (receiptErrors.productId ?? []) : []"
                        data-test="receipt-product"
                        class="min-w-56"
                        hide-details="auto"
                    />
                    <v-text-field
                        v-model.number="receiptForm.quantity"
                        type="number"
                        min="1"
                        :label="t('inventory-page.label-quantity')"
                        :error-messages="showReceiptErrors ? (receiptErrors.quantity ?? []) : []"
                        data-test="receipt-quantity"
                        class="max-w-28"
                        hide-details="auto"
                    />
                    <v-text-field
                        v-model="receiptForm.note"
                        :label="t('inventory-page.label-note')"
                        data-test="receipt-note"
                        class="min-w-40 grow"
                        hide-details="auto"
                    />
                    <v-btn
                        type="submit"
                        color="primary"
                        data-test="receipt-submit"
                        :disabled="loading"
                    >
                        {{ t('inventory-page.button-receipt') }}
                    </v-btn>
                </form>
            </v-card>

            <v-card class="p-4" data-test="adjust-form">
                <h2 class="mb-2 text-base font-semibold">
                    {{ t('inventory-page.adjust-title') }}
                </h2>
                <form
                    ref="adjustFormElement"
                    novalidate
                    class="flex flex-wrap items-start gap-3"
                    @submit.prevent="handleAdjust"
                >
                    <v-select
                        v-model="adjustForm.productId"
                        :items="productOptions"
                        :label="t('inventory-page.label-product')"
                        :error-messages="showAdjustErrors ? (adjustErrors.productId ?? []) : []"
                        data-test="adjust-product"
                        class="min-w-56"
                        hide-details="auto"
                    />
                    <v-text-field
                        v-model.number="adjustForm.delta"
                        type="number"
                        :label="t('inventory-page.label-delta')"
                        :hint="t('inventory-page.hint-delta')"
                        :error-messages="showAdjustErrors ? (adjustErrors.delta ?? []) : []"
                        data-test="adjust-delta"
                        class="max-w-28"
                        persistent-hint
                    />
                    <v-text-field
                        v-model="adjustForm.note"
                        :label="t('inventory-page.label-note-why')"
                        data-test="adjust-note"
                        class="min-w-40 grow"
                        hide-details="auto"
                    />
                    <v-btn
                        type="submit"
                        color="secondary"
                        data-test="adjust-submit"
                        :disabled="loading"
                    >
                        {{ t('inventory-page.button-adjust') }}
                    </v-btn>
                </form>
            </v-card>
        </div>

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
                    @click="showHistory(item.productId)"
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

        <div class="mb-2 flex flex-wrap items-center gap-3">
            <h2 class="text-base font-semibold">{{ t('inventory-page.ledger-title') }}</h2>
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
            <span class="text-sm opacity-70" role="status" data-test="movements-total">
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

        <DataTable
            v-else
            :headers="movementHeaders"
            :items="movements"
            :caption="t('inventory-page.ledger-title')"
            :loading="loading"
            :loading-text="t('generic.loading')"
            :no-data-text="t('generic.no-data')"
            row-test="movement-row"
        >
            <template v-slot:[`item.createdAt`]="{ item }">
                {{ item.createdAt ? formatDateTime(item.createdAt) : EMPTY_VALUE }}
            </template>

            <template v-slot:[`item.product`]="{ item }">
                {{ productTitle(item.productId) }}
            </template>

            <template v-slot:[`item.onHandDelta`]="{ item }">
                <span :class="deltaClass(item.onHandDelta)">{{ signed(item.onHandDelta) }}</span>
            </template>

            <template v-slot:[`item.reservedDelta`]="{ item }">
                <span :class="deltaClass(item.reservedDelta)">
                    {{ signed(item.reservedDelta) }}
                </span>
            </template>

            <template v-slot:[`item.reason`]="{ item }">
                <v-chip size="small" data-test="movement-reason">
                    {{ t(`inventory-page.reason-${item.reason}`) }}
                </v-chip>
            </template>

            <template v-slot:[`item.reference`]="{ item }">
                <span class="text-xs opacity-75">
                    <!-- A reference is an order id, so it links to the order it explains. -->
                    <router-link
                        v-if="item.reference"
                        :to="
                            routerLinkI18n({
                                name: 'OrderTarget',
                                params: { id: item.reference }
                            })
                        "
                        class="underline"
                    >
                        {{ item.reference }}
                    </router-link>
                    <span v-else>{{ EMPTY_VALUE }}</span>
                </span>
            </template>

            <template v-slot:[`item.note`]="{ item }">
                <span class="text-xs opacity-75">{{ item.note ?? EMPTY_VALUE }}</span>
            </template>
        </DataTable>
        <ListPagination
            v-model="movementsPage"
            :length="movementsPageTotal"
            :aria-label="t('inventory-page.pagination-ledger')"
        />
    </LayoutDefault>
</template>
