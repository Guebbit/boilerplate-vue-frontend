<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'PaymentsTable'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The "All" tab: every payment, filtered and sorted on the server (`POST /payments/search`). The
 * filters are local state, not the store's: this is one tab of a page, and a second list on the
 * same screen must not share them. A row opens the payment's drawer.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { formatCurrency, formatDateTime, EMPTY_VALUE } from '@/infrastructure/utils/formatters.ts';
import { endOfDayInstant, startOfDayInstant } from '@/infrastructure/utils/day-range.ts';
import { sortFieldsOf, sortTokensOf } from '@/infrastructure/utils/sort.ts';
import { PaymentDisplayStatus, PaymentMethodKind, PaymentSortItem } from '@/types/enums.ts';
import { useAnyFilterChoice } from '@/ui/composables/use-any-filter-choice.ts';
import { useListSearch } from '@/ui/composables/use-list-search.ts';
import { useListUrlState } from '@/ui/composables/use-list-url-state.ts';
import { useServerSort } from '@/ui/composables/use-server-sort.ts';
import DataTable from '@/ui/organisms/DataTable.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import ListSearchActions from '@/ui/molecules/ListSearchActions.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import type {
    Payment,
    PaymentDisplayStatus as TDisplayStatus,
    PaymentMethodKind as TMethod
} from '@types';
import { usePaymentsStore } from '../store.ts';
import { usePagedTable } from '../composables/use-paged-table.ts';
import { useOrderLink } from '@/kernel/order-link.ts';
import { useRowSelect } from '../composables/use-row-select.ts';
import PaymentStatusChip from './PaymentStatusChip.vue';

/**
 * Emitted when a row is opened.
 */
const emit = defineEmits<
    /**
     * The payment whose drawer should open.
     */
    (event: 'select', payment: Payment) => void
>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * The store: the page of payments, its total and the loading flag.
 */
const store = usePaymentsStore();

/**
 * The reactive slice of the store this table renders.
 */
const { paymentsPage, paymentsTotal, loading } = storeToRefs(store);

/**
 * What the form edits. Days for the four date fields, text for the two amounts so an empty box is
 * "no bound", not 0.
 */
interface PaymentFilters {
    displayStatus?: TDisplayStatus;
    method?: TMethod;
    provider?: string;
    createdFrom?: string;
    createdTo?: string;
    receivedFrom?: string;
    receivedTo?: string;
    amountMin?: string;
    amountMax?: string;
    orderId?: string;
    reference?: string;
    disputed?: boolean;
    sort?: string;
}

/**
 * The filters, as edited.
 */
const filters = ref<PaymentFilters>({});

/**
 * The columns the API can order by, from the contract's own enum.
 */
const sortableKeys = sortFieldsOf(PaymentSortItem);

/**
 * A bound the visitor typed, as a number — nothing for a blank or non-numeric box.
 *
 * @param text - The raw field.
 * @returns The number, or `undefined`.
 */
const amountOf = (text: string | undefined): number | undefined => {
    if (text === undefined || text.trim() === '') return undefined;
    const parsed = Number(text);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

/**
 * The page shown, the page count and the read of the page the current filters name; it runs on
 * mount and on every page change.
 */
const { page, pageTotal, load } = usePagedTable(paymentsTotal, (pageNumber, pageSize) =>
    store.fetchPaymentsPage({
        page: pageNumber,
        pageSize,
        sort: sortTokensOf(filters.value.sort, PaymentSortItem),
        displayStatus: filters.value.displayStatus,
        method: filters.value.method,
        provider: filters.value.provider?.trim() || undefined,
        createdFrom: startOfDayInstant(filters.value.createdFrom),
        createdTo: endOfDayInstant(filters.value.createdTo),
        receivedFrom: startOfDayInstant(filters.value.receivedFrom),
        receivedTo: endOfDayInstant(filters.value.receivedTo),
        amountMin: amountOf(filters.value.amountMin),
        amountMax: amountOf(filters.value.amountMax),
        orderId: filters.value.orderId?.trim() || undefined,
        reference: filters.value.reference?.trim() || undefined,
        disputed: filters.value.disputed ? true : undefined
    })
);

/**
 * The filters and page in the URL, under the `payments-` prefix because the refunds tab keeps its
 * own state in the same query string. The date and amount boxes travel as typed text.
 */
const { sync: syncUrl } = useListUrlState({
    filters,
    page,
    prefix: 'payments',
    params: {
        displayStatus: Object.values(PaymentDisplayStatus),
        method: Object.values(PaymentMethodKind),
        provider: 'string',
        createdFrom: 'string',
        createdTo: 'string',
        receivedFrom: 'string',
        receivedTo: 'string',
        amountMin: 'string',
        amountMax: 'string',
        orderId: 'string',
        reference: 'string',
        disputed: 'boolean',
        sort: 'string'
    }
});

/**
 * Apply the filters from the first page, or clear them all and reload; both keep the URL in step.
 */
const { handleSearch, handleReset } = useListSearch({
    filters,
    page,
    search: load,
    onApplied: syncUrl
});

/**
 * The header's sort state, kept in `filters.sort`; a click restarts from page 1.
 */
const { sortBy } = useServerSort({ filters, apply: handleSearch });

/**
 * The row the visitor picked: opens the drawer, then is forgotten so it can be opened again.
 */
const selectedId = useRowSelect(paymentsPage, (payment) => emit('select', payment));

/**
 * The display-status select: every status plus "any" (value `null`, so Vuetify does not post the
 * label — see `useAnyFilterChoice`).
 */
const statusOptions = computed(() => [
    { value: null, title: t('payments-list-page.filter-any') },
    ...Object.values(PaymentDisplayStatus).map((status) => ({
        value: status,
        title: t(`payments-list-page.display-status-${status}`)
    }))
]);

/**
 * The status select's model: `null` on screen, `undefined` in {@link filters}.
 */
const statusChoice = useAnyFilterChoice(
    () => filters.value.displayStatus,
    (value) => {
        filters.value.displayStatus = value;
    }
);

/**
 * The method select's options.
 */
const methodOptions = computed(() => [
    { value: null, title: t('payments-list-page.filter-any') },
    ...Object.values(PaymentMethodKind).map((method) => ({
        value: method,
        title: t(`payments-list-page.method-${method}`)
    }))
]);

/**
 * The method select's model.
 */
const methodChoice = useAnyFilterChoice(
    () => filters.value.method,
    (value) => {
        filters.value.method = value;
    }
);

/**
 * Columns of the payments table.
 */
const headers = computed<CoreDataTableHeader<Payment>[]>(() => [
    { title: t('payments-list-page.column-date'), key: 'createdAt' },
    { title: t('payments-list-page.column-amount'), key: 'amount' },
    { title: t('payments-list-page.column-status'), key: 'displayStatus', synthetic: true },
    { title: t('payments-list-page.column-method'), key: 'method', synthetic: true },
    { title: t('payments-list-page.column-provider'), key: 'provider', synthetic: true },
    { title: t('payments-list-page.column-order'), key: 'orderNumber', synthetic: true },
    { title: t('payments-list-page.column-email'), key: 'email', synthetic: true },
    { title: t('payments-list-page.column-refunded'), key: 'amountRefunded', synthetic: true }
]);

/**
 * An order's page, or nothing when this build ships no `orders` module.
 */
const orderLink = useOrderLink();
</script>

<template>
    <div data-test="payments-all">
        <v-card class="mb-6 p-5">
            <form novalidate @submit.prevent="handleSearch">
                <div class="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
                    <v-select
                        v-model="statusChoice"
                        :label="t('payments-list-page.filter-status')"
                        :items="statusOptions"
                        item-title="title"
                        item-value="value"
                        data-test="filter-display-status"
                        hide-details
                    />
                    <v-select
                        v-model="methodChoice"
                        :label="t('payments-list-page.filter-method')"
                        :items="methodOptions"
                        item-title="title"
                        item-value="value"
                        data-test="filter-method"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.provider"
                        :label="t('payments-list-page.filter-provider')"
                        data-test="filter-provider"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.orderId"
                        :label="t('payments-list-page.filter-order-id')"
                        data-test="filter-order-id"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.reference"
                        :label="t('payments-list-page.filter-reference')"
                        data-test="filter-reference"
                        hide-details
                    />
                    <v-checkbox
                        v-model="filters.disputed"
                        :label="t('payments-list-page.filter-disputed')"
                        data-test="filter-disputed"
                        density="compact"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.createdFrom"
                        type="date"
                        :label="t('payments-list-page.filter-created-from')"
                        data-test="filter-created-from"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.createdTo"
                        type="date"
                        :label="t('payments-list-page.filter-created-to')"
                        data-test="filter-created-to"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.receivedFrom"
                        type="date"
                        :label="t('payments-list-page.filter-received-from')"
                        data-test="filter-received-from"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.receivedTo"
                        type="date"
                        :label="t('payments-list-page.filter-received-to')"
                        data-test="filter-received-to"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.amountMin"
                        type="number"
                        min="0"
                        :label="t('payments-list-page.filter-amount-min')"
                        data-test="filter-amount-min"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.amountMax"
                        type="number"
                        min="0"
                        :label="t('payments-list-page.filter-amount-max')"
                        data-test="filter-amount-max"
                        hide-details
                    />
                </div>
                <ListSearchActions hook-prefix="payments" :loading="loading" @reset="handleReset" />
            </form>
        </v-card>

        <v-empty-state
            v-if="paymentsPage.length === 0 && !loading"
            :title="t('payments-list-page.empty-payments')"
        />

        <DataTable
            v-else
            v-model="selectedId"
            v-model:sort-by="sortBy"
            :server-sort-keys="sortableKeys"
            :headers="headers"
            :items="paymentsPage"
            :caption="t('payments-list-page.table-caption-all')"
            :loading="loading"
            :loading-text="t('generic.loading')"
            row-test="payment-row"
        >
            <template v-slot:[`item.createdAt`]="{ item }">
                {{ formatDateTime(item.createdAt) }}
            </template>
            <template v-slot:[`item.amount`]="{ item }">
                {{ formatCurrency(item.amount, item.currency) }}
            </template>
            <template v-slot:[`item.displayStatus`]="{ item }">
                <PaymentStatusChip :status="item.displayStatus" />
            </template>
            <template v-slot:[`item.method`]="{ item }">
                {{ t(`payments-list-page.method-${item.method}`) }}
            </template>
            <template v-slot:[`item.provider`]="{ item }">
                {{ item.provider }}
            </template>
            <template v-slot:[`item.orderNumber`]="{ item }">
                <router-link
                    v-if="orderLink(item.orderId)"
                    :to="orderLink(item.orderId)!"
                    class="underline"
                    data-test="payment-order-link"
                    @click.stop
                >
                    {{ item.orderNumber ?? item.orderId }}
                </router-link>
                <span v-else>{{ item.orderNumber ?? item.orderId }}</span>
            </template>
            <template v-slot:[`item.email`]="{ item }">
                {{ item.email ?? EMPTY_VALUE }}
            </template>
            <template v-slot:[`item.amountRefunded`]="{ item }">
                {{
                    item.amountRefunded > 0
                        ? formatCurrency(item.amountRefunded, item.currency)
                        : EMPTY_VALUE
                }}
            </template>
        </DataTable>
        <ListPagination v-model="page" :length="pageTotal" />
    </div>
</template>
