<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'RefundsTable'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The "Refunds" tab: one row per refund across every payment (`GET /payments/refunds`), newest
 * first. Read-only — a refund is opened and settled on its payment. A failed refund says why with
 * the server's closed `failureReason`, which is staff-only data; the raw provider text stays in the
 * server's logs.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Search } from 'lucide-vue-next';
import { formatCurrency, formatDateTime, EMPTY_VALUE } from '@/infrastructure/utils/formatters.ts';
import { endOfDayInstant, startOfDayInstant } from '@/infrastructure/utils/day-range.ts';
import { RefundReason, RefundStatus } from '@/types/enums.ts';
import type { ThemeColor } from '@/ui/types.ts';
import { useAnyFilterChoice } from '@/ui/composables/use-any-filter-choice.ts';
import { useListSearch } from '@/ui/composables/use-list-search.ts';
import DataTable from '@/ui/organisms/DataTable.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import type {
    RefundListItem,
    RefundReason as TRefundReason,
    RefundStatus as TRefundStatus
} from '@types';
import { usePaymentsStore } from '../store.ts';
import { usePagedTable } from '../composables/use-paged-table.ts';
import { useOrderLink } from '@/kernel/order-link.ts';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * The store: the page of refunds, its total and the loading flag.
 */
const store = usePaymentsStore();

/**
 * The reactive slice of the store this table renders.
 */
const { refundsPage, refundsTotal, loading } = storeToRefs(store);

/**
 * What the form edits.
 */
interface RefundFilters {
    status?: TRefundStatus;
    reason?: TRefundReason;
    orderId?: string;
    createdFrom?: string;
    createdTo?: string;
}

/**
 * The filters, as edited.
 */
const filters = ref<RefundFilters>({});

/**
 * The page shown, the page count and the read of the page the current filters name; it runs on
 * mount and on every page change.
 */
const { page, pageTotal, load } = usePagedTable(refundsTotal, (pageNumber, pageSize) =>
    store.fetchRefundsPage({
        page: pageNumber,
        pageSize,
        status: filters.value.status,
        reason: filters.value.reason,
        orderId: filters.value.orderId?.trim() || undefined,
        createdFrom: startOfDayInstant(filters.value.createdFrom),
        createdTo: endOfDayInstant(filters.value.createdTo)
    })
);

/**
 * Apply the filters from the first page, or clear them all and reload.
 */
const { handleSearch, handleReset } = useListSearch({ filters, page, search: load });

/**
 * The status select's options, "any" first (value `null`).
 */
const statusOptions = computed(() => [
    { value: null, title: t('payments-list-page.filter-any') },
    ...Object.values(RefundStatus).map((status) => ({
        value: status,
        title: t(`payments-list-page.refund-status-${status}`)
    }))
]);

/**
 * The status select's model.
 */
const statusChoice = useAnyFilterChoice(
    () => filters.value.status,
    (value) => {
        filters.value.status = value;
    }
);

/**
 * The reason select's options, "any" first.
 */
const reasonOptions = computed(() => [
    { value: null, title: t('payments-list-page.filter-any') },
    ...Object.values(RefundReason).map((reason) => ({
        value: reason,
        title: t(`payments-list-page.refund-reason-${reason}`)
    }))
]);

/**
 * The reason select's model.
 */
const reasonChoice = useAnyFilterChoice(
    () => filters.value.reason,
    (value) => {
        filters.value.reason = value;
    }
);

/**
 * Columns of the refunds table.
 */
const headers = computed<CoreDataTableHeader<RefundListItem>[]>(() => [
    { title: t('payments-list-page.column-date'), key: 'createdAt' },
    { title: t('payments-list-page.column-amount'), key: 'amount' },
    { title: t('payments-list-page.column-status'), key: 'status' },
    { title: t('payments-list-page.column-reason'), key: 'reason' },
    { title: t('payments-list-page.column-settled'), key: 'settledAt' },
    { title: t('payments-list-page.column-provider-ref'), key: 'providerRefundRef' },
    { title: t('payments-list-page.column-order'), key: 'orderId', synthetic: true }
]);

/**
 * An order's page, or nothing when this build ships no `orders` module.
 */
const orderLink = useOrderLink();

/**
 * Refund status colours; `satisfies` makes a new contract status fail the type check.
 */
const STATUS_COLORS = {
    pending: 'warning',
    succeeded: 'success',
    failed: 'error'
} satisfies Record<TRefundStatus, ThemeColor>;
</script>

<template>
    <div data-test="payments-refunds">
        <v-card class="mb-6 p-5">
            <form novalidate @submit.prevent="handleSearch">
                <div class="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-5">
                    <v-select
                        v-model="statusChoice"
                        :label="t('payments-list-page.filter-status')"
                        :items="statusOptions"
                        item-title="title"
                        item-value="value"
                        data-test="refund-filter-status"
                        hide-details
                    />
                    <v-select
                        v-model="reasonChoice"
                        :label="t('payments-list-page.filter-reason')"
                        :items="reasonOptions"
                        item-title="title"
                        item-value="value"
                        data-test="refund-filter-reason"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.orderId"
                        :label="t('payments-list-page.filter-order-id')"
                        data-test="refund-filter-order-id"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.createdFrom"
                        type="date"
                        :label="t('payments-list-page.filter-created-from')"
                        data-test="refund-filter-created-from"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.createdTo"
                        type="date"
                        :label="t('payments-list-page.filter-created-to')"
                        data-test="refund-filter-created-to"
                        hide-details
                    />
                </div>
                <div class="mt-4 flex flex-wrap gap-2">
                    <v-btn type="submit" color="primary" data-test="refunds-search-submit">
                        <Search :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('generic.search') }}
                    </v-btn>
                    <v-btn variant="tonal" data-test="refunds-search-reset" @click="handleReset">
                        {{ t('generic.reset') }}
                    </v-btn>
                </div>
            </form>
        </v-card>

        <v-empty-state
            v-if="refundsPage.length === 0 && !loading"
            :title="t('payments-list-page.empty-refunds')"
        />

        <DataTable
            v-else
            :headers="headers"
            :items="refundsPage"
            :caption="t('payments-list-page.table-caption-refunds')"
            :loading="loading"
            :loading-text="t('generic.loading')"
            row-test="refund-row"
        >
            <template v-slot:[`item.createdAt`]="{ item }">
                {{ formatDateTime(item.createdAt) }}
            </template>
            <template v-slot:[`item.amount`]="{ item }">
                {{ formatCurrency(item.amount, item.currency) }}
            </template>
            <template v-slot:[`item.status`]="{ item }">
                <v-chip size="small" variant="tonal" :color="STATUS_COLORS[item.status]">
                    {{ t(`payments-list-page.refund-status-${item.status}`) }}
                </v-chip>
                <p v-if="item.failureReason" class="mt-1 text-xs" data-test="refund-failure-reason">
                    {{ t(`payments-list-page.failure-reason-${item.failureReason}`) }}
                </p>
            </template>
            <template v-slot:[`item.reason`]="{ item }">
                {{ t(`payments-list-page.refund-reason-${item.reason}`) }}
            </template>
            <template v-slot:[`item.settledAt`]="{ item }">
                {{ formatDateTime(item.settledAt) }}
            </template>
            <template v-slot:[`item.providerRefundRef`]="{ item }">
                <code class="text-xs">{{ item.providerRefundRef ?? EMPTY_VALUE }}</code>
            </template>
            <template v-slot:[`item.orderId`]="{ item }">
                <router-link
                    v-if="orderLink(item.orderId)"
                    :to="orderLink(item.orderId)!"
                    class="underline"
                    data-test="refund-order-link"
                >
                    {{ item.orderId }}
                </router-link>
                <span v-else>{{ item.orderId }}</span>
            </template>
        </DataTable>
        <ListPagination v-model="page" :length="pageTotal" />
    </div>
</template>
