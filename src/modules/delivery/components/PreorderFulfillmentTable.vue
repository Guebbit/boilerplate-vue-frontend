<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'PreorderFulfillmentTable'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The preorder board's second tab: one row per fulfillment order made from a preorder, with the
 * buyer, the promised and expected dates and where it stands. Two warning filters sit on the server's
 * own rules, never recomputed here: "Late" (the expected date has passed and units remain, which
 * includes allocated-but-unshipped ones the daily sweep does not touch) and "Due soon" (still waiting
 * for stock, expected within a week: a slip moved before the date passes is a notice, one moved after
 * is a question). A product filter arrives from the tab beside it.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { X } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { EMPTY_VALUE, formatDate, formatDateTime } from '@/infrastructure/utils/formatters.ts';
import type { ThemeColor } from '@/ui/types.ts';
import { useAnyFilterChoice } from '@/ui/composables/use-any-filter-choice.ts';
import DataTable from '@/ui/organisms/DataTable.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import type { PreorderFulfillmentOrder, PreorderFulfillmentState } from '@types';
import { useDeliveryStore } from '../store.ts';

/**
 * The product the board is narrowed to, and a name to show for it. Both come from the page, which
 * got them from a click on the products tab or from the URL.
 */
const { productId, productLabel } = defineProps<{
    productId?: string | undefined;
    productLabel?: string | undefined;
}>();

/**
 * Emitted when the product chip's close button is pressed.
 */
const emit = defineEmits<{
    /**
     * The visitor dropped the product filter.
     */
    clearProduct: [];
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
 * The router, for the order link's `hasRoute` guard.
 */
const router = useRouter();

/**
 * The store: the page of rows, its total and the loading flag.
 */
const store = useDeliveryStore();

/**
 * The reactive slice of the store this table renders.
 */
const { preorderBoard, preorderBoardTotal, loading } = storeToRefs(store);

/**
 * Rows per page.
 */
const PAGE_SIZE = 10;

/**
 * How far ahead "Due soon" looks, in days. A slip of up to 28 days is a notice and silence keeps
 * the buyer waiting; a week is the margin to see one coming and move the date before it passes.
 */
const DUE_SOON_DAYS = 7;

/**
 * Every state the server names, in the order the filter lists them.
 */
const STATES = [
    'waiting',
    'awaiting_yes',
    'allocated',
    'shipped',
    'cancelled'
] as const satisfies readonly PreorderFulfillmentState[];

/**
 * The state filter; `undefined` shows every state.
 */
const state = ref<PreorderFulfillmentState>();

/**
 * Whether only late rows show.
 */
const lateOnly = ref(false);

/**
 * Whether only rows due within {@link DUE_SOON_DAYS} show.
 */
const dueSoonOnly = ref(false);

/**
 * The page shown, 1-based.
 */
const page = ref(1);

/**
 * How many pages the current filters span.
 */
const pageTotal = computed(() => Math.ceil(preorderBoardTotal.value / PAGE_SIZE));

/**
 * Loads the page the current filters name.
 *
 * @returns A promise settling once the page loaded or the failure was toasted.
 */
const load = () =>
    store
        .fetchPreorderBoard({
            page: page.value,
            pageSize: PAGE_SIZE,
            state: state.value,
            productId,
            late: lateOnly.value || undefined,
            dueWithin: dueSoonOnly.value ? DUE_SOON_DAYS : undefined
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));

/**
 * A changed filter starts over from the first page; a changed page just reads it.
 */
watch([state, lateOnly, dueSoonOnly, () => productId], () => {
    if (page.value === 1) return load();
    page.value = 1;
});

watch(page, () => void load());

onMounted(() => {
    void load();
});

/**
 * The state select's options, "any" first (value `null`).
 */
const stateOptions = computed(() => [
    { value: null, title: t('preorder-board.filter-any') },
    ...STATES.map((value) => ({ value, title: t(`preorder-board.state-${value}`) }))
]);

/**
 * The state select's model.
 */
const stateChoice = useAnyFilterChoice(
    () => state.value,
    (value) => {
        state.value = value;
    }
);

/**
 * Columns of the board's second table.
 */
const headers = computed<CoreDataTableHeader<PreorderFulfillmentOrder>[]>(() => [
    { title: t('preorder-board.column-order'), key: 'orderNumber' },
    { title: t('preorder-board.column-buyer'), key: 'buyer', synthetic: true },
    { title: t('preorder-board.column-products'), key: 'lines', synthetic: true },
    { title: t('preorder-board.column-paid-at'), key: 'paidAt' },
    { title: t('preorder-board.column-agreed'), key: 'agreedAt' },
    { title: t('preorder-board.column-expected'), key: 'expectedAt' },
    { title: t('preorder-board.column-state'), key: 'state' },
    { title: t('preorder-board.column-last-notice'), key: 'lastNoticeAt' }
]);

/**
 * An order's page, or nothing when this build ships no `orders` module.
 *
 * @param orderId - The order.
 */
const orderLink = (orderId: string) => {
    const target = linkIfRouted(router, 'OrderTarget', { id: orderId });
    return target ? routerLinkI18n(target) : undefined;
};

/**
 * State chip colours; `satisfies` makes a new contract state fail the type check.
 */
const STATE_COLORS = {
    waiting: undefined,
    awaiting_yes: 'warning',
    allocated: 'info',
    shipped: 'success',
    cancelled: 'error'
} satisfies Record<PreorderFulfillmentState, ThemeColor | undefined>;
</script>

<template>
    <div data-test="preorder-orders">
        <v-card class="mb-6 p-5">
            <div class="grid items-center gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
                <v-select
                    v-model="stateChoice"
                    :label="t('preorder-board.filter-state')"
                    :items="stateOptions"
                    item-title="title"
                    item-value="value"
                    data-test="preorder-filter-state"
                    hide-details
                />
                <v-switch
                    v-model="lateOnly"
                    :label="t('preorder-board.filter-late')"
                    color="error"
                    hide-details
                    density="compact"
                    data-test="preorder-filter-late"
                />
                <v-switch
                    v-model="dueSoonOnly"
                    :label="t('preorder-board.filter-due-soon', { days: DUE_SOON_DAYS })"
                    color="warning"
                    hide-details
                    density="compact"
                    data-test="preorder-filter-due-soon"
                />
                <v-chip
                    v-if="productId"
                    closable
                    :close-label="t('preorder-board.filter-product-clear')"
                    data-test="preorder-filter-product"
                    @click:close="emit('clearProduct')"
                >
                    <X :size="14" class="mr-1" aria-hidden="true" />
                    {{ t('preorder-board.filter-product', { name: productLabel ?? productId }) }}
                </v-chip>
            </div>
        </v-card>

        <v-empty-state
            v-if="preorderBoard.length === 0 && !loading"
            :title="t('preorder-board.empty-orders')"
        />

        <DataTable
            v-else
            :headers="headers"
            :items="preorderBoard"
            :caption="t('preorder-board.caption-orders')"
            :loading="loading"
            :loading-text="t('generic.loading')"
            row-test="preorder-order-row"
        >
            <template v-slot:[`item.orderNumber`]="{ item }">
                <router-link
                    v-if="orderLink(item.orderId)"
                    :to="orderLink(item.orderId)!"
                    class="underline"
                    data-test="preorder-order-link"
                >
                    {{ item.orderNumber }}
                </router-link>
                <span v-else>{{ item.orderNumber }}</span>
                <span v-if="item.number > 1" class="ml-1 text-xs opacity-70">
                    #{{ item.number }}
                </span>
            </template>
            <template v-slot:[`item.buyer`]="{ item }">
                {{ item.buyer.email }}
            </template>
            <template v-slot:[`item.lines`]="{ item }">
                <ul class="m-0 list-none p-0 text-sm">
                    <li v-for="line in item.lines" :key="'preorder-line-' + line.productId">
                        {{ line.title }} × {{ line.quantity }}
                    </li>
                </ul>
            </template>
            <template v-slot:[`item.paidAt`]="{ item }">
                {{ formatDateTime(item.paidAt) }}
            </template>
            <template v-slot:[`item.agreedAt`]="{ item }">
                {{ formatDate(item.agreedAt) }}
            </template>
            <template v-slot:[`item.expectedAt`]="{ item }">
                <span v-if="!item.expectedAt" data-test="preorder-no-date">
                    {{ t('preorder-board.no-date-yet') }}
                </span>
                <template v-else>{{ formatDate(item.expectedAt) }}</template>
                <span
                    v-if="item.slippedDays > 0"
                    class="ml-1 text-xs opacity-80"
                    data-test="preorder-slipped"
                >
                    {{ t('preorder-board.slipped', { days: item.slippedDays }) }}
                </span>
            </template>
            <template v-slot:[`item.state`]="{ item }">
                <v-chip
                    size="small"
                    variant="tonal"
                    :color="STATE_COLORS[item.state]"
                    :data-state="item.state"
                    data-test="preorder-state"
                >
                    {{ t(`preorder-board.state-${item.state}`) }}
                </v-chip>
                <v-chip
                    v-if="item.late"
                    size="small"
                    color="error"
                    class="ml-1"
                    data-test="preorder-late"
                >
                    {{ t('preorder-board.late') }}
                </v-chip>
                <p
                    v-if="item.state === 'awaiting_yes' && item.consentDeadline"
                    class="m-0 mt-1 text-xs"
                    data-test="preorder-answer-by"
                >
                    {{ t('preorder-board.answer-by', { date: formatDate(item.consentDeadline) }) }}
                </p>
                <p
                    v-if="item.cancelReason"
                    class="m-0 mt-1 text-xs"
                    data-test="preorder-cancel-reason"
                >
                    {{ t(`fulfillment-order-card.cancel-reason-${item.cancelReason}`) }}
                </p>
            </template>
            <template v-slot:[`item.lastNoticeAt`]="{ item }">
                {{ item.lastNoticeAt ? formatDateTime(item.lastNoticeAt) : EMPTY_VALUE }}
            </template>
        </DataTable>
        <ListPagination v-model="page" :length="pageTotal" />
    </div>
</template>
