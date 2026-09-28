<script lang="ts">
export default {
    name: 'MovementLedger'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Movement ledger tab: every stock transition newest-first, filterable by product and reason,
 * plus the sweep action that expires stale reservation holds. Reads/writes go through
 * `useInventoryStore` directly — filters live as local refs, re-fetched on change via `watch`.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { BookOpen, Timer } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import DataTable from '@/ui/organisms/DataTable.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { linkIfRouted } from '@/app/router/navigation.ts';
import { useInventoryStore } from '@/modules/inventory/store.ts';
import { useProductsStore } from '@/modules/products';
import {
    useProductPicker,
    useProductPickerPin
} from '@/modules/inventory/composables/use-product-picker.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { EMPTY_VALUE, formatDateTime } from '@/infrastructure/utils/formatters.ts';
import { useAnyFilterChoice } from '@/ui/composables/use-any-filter-choice.ts';
import { StockMovementReason } from '@/types/enums.ts';
import type { StockMovement, StockMovementReason as TStockMovementReason } from '@types';
import { useDialogStore } from '@/ui/dialog.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';

/**
 * Every movement newest first, with its why. The sweep is here too: releasing stale holds is a
 * write into this same ledger, so the button that drives it lives beside what it explains.
 */
const { t } = useI18n();

/**
 * Router instance, for the `hasRoute` check below — `orders` is not a coupling this module's
 * `MODULE_EDGES` entry declares, so the reference column's link is guarded rather than assumed
 * (FA86).
 */
const router = useRouter();

/**
 * A movement's own order page, or `undefined` when this build ships no `orders` module — the
 * reference then renders as plain text instead of a dead link.
 *
 * @param reference - The movement's own reference, an order id, when it has one at all.
 */
const orderTargetTo = (reference: string | null | undefined) =>
    reference ? linkIfRouted(router, 'OrderTarget', { id: reference }) : undefined;

/**
 * Toast dispatcher for the sweep action's outcome.
 */
const { addMessage } = useNotificationsStore();

/**
 * Owns the movements read and the sweep write this tab renders/drives.
 */
const inventoryStore = useInventoryStore();

/**
 * The current page of movements, their total count across pages, and the shared loading flag.
 */
const { movements, movementsTotal, loading } = storeToRefs(inventoryStore);

/**
 * Source of product titles for the ledger's product COLUMN — the filter above uses its own
 * search-backed picker instead (see `productSearchOptions` below).
 */
const productsStore = useProductsStore();

/**
 * The catalogue, used to resolve a movement's `productId` to a title.
 */
const { productsList } = storeToRefs(productsStore);

/**
 * Small on purpose — this is an admin table to read, not a feed to scroll.
 */
const PAGE_SIZE = 10;

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

/**
 * Which ledger page is showing.
 */
const movementsPage = ref(1);

/**
 * Narrows the ledger to one product; `undefined` shows every product.
 */
const movementsProductId = ref<string | undefined>();

/**
 * Narrows the ledger to one kind of transition; `undefined` shows every reason.
 */
const movementsReason = ref<TStockMovementReason | undefined>();

/**
 * The product filter's search box and options — `POST /products/search`, not the products store's
 * unpaged `listProducts()`, which only ever holds the first page (FE_PARITY_0924 B2).
 */
const { query: productQuery, options: productSearchOptions, pin: pinProduct } = useProductPicker();

/**
 * `focusProduct` (below) sets `movementsProductId` to an id `StockBoard` named, which the current
 * search page has no reason to already contain — this is what keeps it displayable regardless.
 */
useProductPickerPin(() => movementsProductId.value, pinProduct);

/**
 * The product filter, with an "everything" row on top. Its value is `null`, not `undefined`
 * (FA51) — Vuetify reads an `undefined` item value as "use the title", which would post the
 * translated label instead of no filter at all.
 */
const productFilterOptions = computed(() => [
    { value: null, title: t('inventory-page.filter-product-all') },
    ...productSearchOptions.value
]);

/**
 * The product select's model: `null` (the "everything" row) on screen, `undefined` in
 * {@link movementsProductId}.
 */
const productFilterChoice = useAnyFilterChoice(
    () => movementsProductId.value,
    (value) => {
        movementsProductId.value = value;
    }
);

/**
 * One row per transition, each labelled with what it does to the counters. Its "everything" row's
 * value is `null`, not `undefined` — same reason as {@link productFilterOptions}.
 */
const reasonFilterOptions = computed(() => [
    { value: null, title: t('inventory-page.filter-reason-all') },
    ...Object.values(StockMovementReason).map((reason) => ({
        value: reason,
        title: t(`inventory-page.reason-${reason}`)
    }))
]);

/**
 * The reason select's model: `null` (the "everything" row) on screen, `undefined` in
 * {@link movementsReason}.
 */
const reasonFilterChoice = useAnyFilterChoice(
    () => movementsReason.value,
    (value) => {
        movementsReason.value = value;
    }
);

/**
 * How many pages the current filters span.
 */
const movementsPageTotal = computed(() => Math.ceil(movementsTotal.value / PAGE_SIZE));

/**
 * `+3` / `-3` / `0` — the sign is the information, so it is never dropped.
 */
const signed = (delta: number) => (delta > 0 ? `+${delta}` : String(delta));

/**
 * Green for units gained, red for units lost, neutral for a counter this transition left alone.
 */
const deltaClass = (delta: number) =>
    delta === 0 ? 'opacity-50' : delta < 0 ? 'text-error' : 'text-success';

/**
 * Title lookup for the ledger — it stores ids, the page can still say names.
 */
const productTitle = (productId: string) =>
    productsList.value.find(({ id }) => id === productId)?.title ?? productId;

/**
 * Loads the ledger page matching the current filters.
 */
const loadMovements = () =>
    inventoryStore.fetchMovements({
        page: movementsPage.value,
        pageSize: PAGE_SIZE,
        productId: movementsProductId.value,
        reason: movementsReason.value
    });

watch([movementsPage, movementsProductId, movementsReason], () => void loadMovements());

/**
 * The stock board's history button jumps here: this product's story, from the first page.
 *
 * @param productId - The product the board's row named.
 */
const focusProduct = (productId: string) => {
    movementsProductId.value = productId;
    movementsPage.value = 1;
};

defineExpose({ focusProduct });

/**
 * The sweep's own blocked state — the confirm dialog that gates it has already closed by the time
 * the request answers, and this table's own read keeps working regardless, so the failure renders
 * as one alert above it rather than a toast — the same reasoning `ProductsList.vue`'s row actions
 * use for a write behind a confirm.
 */
const {
    message: sweepError,
    report: reportSweepError,
    clear: clearSweepError
} = useBlockingError();

/**
 * Expires every stale hold. Idempotent server-side, so the confirm is about intent, not danger —
 * the orders behind the released holds get cancelled, and that is worth a deliberate click.
 */
const handleSweep = () =>
    useDialogStore()
        .confirm({ message: t('inventory-page.confirm-sweep'), color: 'warning' })
        .then((accepted) => {
            if (!accepted) return;
            clearSweepError();
            return inventoryStore
                .sweep()
                .then((expired) =>
                    addMessage(t('inventory-page.success-sweep', { expired: expired ?? 0 }))
                )
                .catch((error: unknown) => reportSweepError(error));
        });

onMounted(() => {
    void loadMovements();
});
</script>

<template>
    <div class="mb-2 flex flex-wrap items-center gap-3">
        <h2 class="text-base font-semibold">{{ t('inventory-page.ledger-title') }}</h2>
        <!--
            Vuetify v-autocomplete: `search` is the typed text (bound to the picker's own query,
            which drives the server search), `no-filter` turns off Vuetify's own client-side
            filtering of `:items` since the server already filtered them.
            https://vuetifyjs.com/en/api/v-autocomplete/
        -->
        <v-autocomplete
            v-model="productFilterChoice"
            v-model:search="productQuery"
            :items="productFilterOptions"
            item-title="title"
            item-value="value"
            no-filter
            clearable
            :label="t('inventory-page.label-product')"
            class="max-w-64"
            hide-details
            density="compact"
            data-test="movements-filter-product"
        />
        <v-select
            v-model="reasonFilterChoice"
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

    <InlineErrorAlert :message="sweepError" class="mb-4" data-test="sweep-error" />

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
                <!-- A reference is an order id, so it links to the order it explains — when this
                     build actually ships one to link to. -->
                <router-link
                    v-if="orderTargetTo(item.reference)"
                    :to="routerLinkI18n(orderTargetTo(item.reference)!)"
                    class="underline"
                >
                    {{ item.reference }}
                </router-link>
                <span v-else>{{ item.reference ?? EMPTY_VALUE }}</span>
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
</template>
