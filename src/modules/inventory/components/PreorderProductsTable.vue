<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'PreorderProductsTable'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The preorder board's first tab: one row per product sold as a preorder, from two reads joined by
 * product — its allowance (limit, outstanding, left; `inventory`) and where its units stand (waiting,
 * awaiting an answer, allocated, shipped, cancelled, late; `delivery`). "Outstanding" is units still
 * owed, not units sold: it falls when stock is allocated. The release date can only be moved on the
 * product's own edit form, so a row links there for a holder of the product write; there is no
 * preview of what a later date would do to the buyers who already paid.
 */
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { EMPTY_VALUE, formatDate } from '@/infrastructure/utils/formatters.ts';
import DataTable from '@/ui/organisms/DataTable.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import { usePreorderSummaries } from '@/modules/delivery';
import { useInventoryStore } from '../store.ts';
import { preorderRows } from '../domain';
import type { PreorderRow } from '../domain';

/**
 * Emitted when a row's "fulfillment orders" button is pressed, naming the product the second tab
 * should narrow to.
 */
const emit = defineEmits<{
    /**
     * The visitor wants this product's fulfillment orders.
     */
    showOrders: [productId: string, title: string];
}>();

/**
 * Translation function and toast dispatcher.
 */
const { t } = useI18n();

/**
 * Toast dispatcher: a failed read is ambient, the table just did not refresh.
 */
const { addMessage } = useNotificationsStore();

/**
 * The router, for the product edit link's `hasRoute` guard.
 */
const router = useRouter();

/**
 * The session, asked whether the viewer may move a release date (the product write).
 */
const session = useSessionStore();

/**
 * The allowance read.
 */
const inventoryStore = useInventoryStore();

/**
 * The allowances and the loading flag, reactive.
 */
const { preorderLevels, loading: loadingLevels } = storeToRefs(inventoryStore);

/**
 * The units-by-state read, from the delivery barrel.
 */
const { summaries, loading: loadingSummaries, load: loadSummaries } = usePreorderSummaries();

/**
 * Rows per page; the table pages locally, since both reads hold the whole short list.
 */
const PAGE_SIZE = 10;

/**
 * The page shown, 1-based.
 */
const page = ref(1);

/**
 * Every product's row, the worst first.
 */
const rows = computed(() => preorderRows(preorderLevels.value, summaries.value));

/**
 * The rows on the current page.
 */
const pageRows = computed(() =>
    rows.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE)
);

/**
 * How many pages the rows span.
 */
const pageTotal = computed(() => Math.ceil(rows.value.length / PAGE_SIZE));

/**
 * Whether either read is still out.
 */
const loading = computed(() => loadingLevels.value || loadingSummaries.value);

/**
 * Loads both halves, toasting a failure of either.
 *
 * @returns A promise settling once both reads finished.
 */
const load = () =>
    Promise.all([inventoryStore.fetchPreorderLevels(), loadSummaries()]).catch((error: unknown) =>
        notifyErrorMessages(addMessage, error)
    );

onMounted(() => {
    void load();
});

/**
 * Columns of the products table.
 */
const headers = computed<CoreDataTableHeader<PreorderRow>[]>(() => [
    { title: t('preorders-page.column-product'), key: 'title' },
    { title: t('preorders-page.column-release-date'), key: 'releaseDate' },
    { title: t('preorders-page.column-first-promised'), key: 'firstPromised', synthetic: true },
    { title: t('preorders-page.column-limit'), key: 'limit', synthetic: true },
    { title: t('preorders-page.column-outstanding'), key: 'outstanding', synthetic: true },
    { title: t('preorders-page.column-left'), key: 'left', synthetic: true },
    { title: t('preorders-page.column-ordered'), key: 'ordered', synthetic: true },
    { title: t('preorders-page.column-states'), key: 'states', synthetic: true },
    { title: '', key: 'actions', synthetic: true }
]);

/**
 * The state counts a row shows, in order, each paired with its label key.
 */
const STATE_COUNTS = [
    ['waiting', 'preorders-page.count-waiting'],
    ['awaitingYes', 'preorders-page.count-awaiting-yes'],
    ['allocated', 'preorders-page.count-allocated'],
    ['shipped', 'preorders-page.count-shipped'],
    ['cancelled', 'preorders-page.count-cancelled'],
    ['late', 'preorders-page.count-late']
] as const;

/**
 * The counts a row has anything to say about; a state with no units is left out.
 *
 * @param row - The product's row.
 * @returns Each non-zero state with its label key and number.
 */
const countsOf = (row: PreorderRow) =>
    STATE_COUNTS.flatMap(([field, label]) => {
        const count = row.summary?.[field] ?? 0;
        return count > 0 ? [{ field, label, count }] : [];
    });

/**
 * A product's edit page — where its release date moves — or nothing when the viewer cannot update
 * products or this build ships none.
 *
 * @param productId - The product.
 */
const editLink = (productId: string) => {
    const target = session.can('update', 'Product')
        ? linkIfRouted(router, 'ProductEdit', { id: productId })
        : undefined;
    return target ? routerLinkI18n(target) : undefined;
};
</script>

<template>
    <div data-test="preorder-products">
        <v-empty-state
            v-if="rows.length === 0 && !loading"
            :title="t('preorders-page.empty-products')"
        />

        <DataTable
            v-else
            :headers="headers"
            :items="pageRows"
            item-value="productId"
            :caption="t('preorders-page.caption-products')"
            :loading="loading"
            :loading-text="t('generic.loading')"
            row-test="preorder-product-row"
        >
            <template v-slot:[`item.releaseDate`]="{ item }">
                {{ formatDate(item.releaseDate) }}
            </template>
            <template v-slot:[`item.firstPromised`]="{ item }">
                {{ formatDate(item.summary?.firstAgreedAt) }}
            </template>
            <template v-slot:[`item.limit`]="{ item }">
                {{
                    item.level
                        ? (item.level.backorderLimit ?? t('inventory-page.unlimited'))
                        : EMPTY_VALUE
                }}
            </template>
            <template v-slot:[`item.outstanding`]="{ item }">
                <template v-if="item.level">
                    <strong data-test="preorder-outstanding">{{ item.level.backordered }}</strong>
                    <span class="ml-1 text-xs opacity-70">
                        {{
                            t('preorders-page.outstanding-split', {
                                held: item.level.held,
                                paid: item.level.paid
                            })
                        }}
                    </span>
                </template>
                <span v-else>{{ EMPTY_VALUE }}</span>
            </template>
            <template v-slot:[`item.left`]="{ item }">
                {{ item.level?.left ?? EMPTY_VALUE }}
            </template>
            <template v-slot:[`item.ordered`]="{ item }">
                {{ item.level?.ordered ?? EMPTY_VALUE }}
            </template>
            <template v-slot:[`item.states`]="{ item }">
                <span v-if="countsOf(item).length === 0">{{ EMPTY_VALUE }}</span>
                <ul v-else class="m-0 flex list-none flex-wrap gap-1 p-0">
                    <li v-for="count in countsOf(item)" :key="count.field">
                        <v-chip
                            size="small"
                            variant="tonal"
                            :color="count.field === 'late' ? 'error' : undefined"
                            :data-count="count.field"
                        >
                            {{ t(count.label, { count: count.count }) }}
                        </v-chip>
                    </li>
                </ul>
            </template>
            <template v-slot:[`item.actions`]="{ item }">
                <div class="flex flex-wrap gap-1">
                    <v-btn
                        size="small"
                        variant="text"
                        data-test="preorder-show-orders"
                        :aria-label="
                            t('preorders-page.button-show-orders-named', { name: item.title })
                        "
                        @click="emit('showOrders', item.productId, item.title)"
                    >
                        {{ t('preorders-page.button-show-orders') }}
                    </v-btn>
                    <v-btn
                        v-if="editLink(item.productId)"
                        size="small"
                        variant="text"
                        :to="editLink(item.productId)!"
                        data-test="preorder-move-date"
                        :aria-label="
                            t('preorders-page.button-move-date-named', { name: item.title })
                        "
                    >
                        {{ t('preorders-page.button-move-date') }}
                    </v-btn>
                </div>
            </template>
        </DataTable>
        <ListPagination v-model="page" :length="pageTotal" />
    </div>
</template>
