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
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { Search } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { formatCurrency, formatDateTime, EMPTY_VALUE } from '@/infrastructure/utils/formatters.ts';
import { endOfDayInstant, startOfDayInstant } from '@/infrastructure/utils/day-range.ts';
import { sortFieldsOf, sortTokensOf } from '@/infrastructure/utils/sort.ts';
import { PaymentDisplayStatus, PaymentMethodKind, PaymentSortItem } from '@/types/enums.ts';
import { useAnyFilterChoice } from '@/ui/composables/use-any-filter-choice.ts';
import { useServerSort } from '@/ui/composables/use-server-sort.ts';
import DataTable from '@/ui/organisms/DataTable.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import type {
    Payment,
    PaymentDisplayStatus as TDisplayStatus,
    PaymentMethodKind as TMethod
} from '@types';
import { usePaymentsStore } from '../store.ts';
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
 * Translation function and toast dispatcher.
 */
const { t } = useI18n();

/**
 * Toast dispatcher: a failed read is ambient — the table just did not refresh.
 */
const { addMessage } = useNotificationsStore();

/**
 * The router, for the order link's `hasRoute` guard (`orders` is not an edge of this module).
 */
const router = useRouter();

/**
 * The store: the page of payments, its total and the loading flag.
 */
const store = usePaymentsStore();

/**
 * The reactive slice of the store this table renders.
 */
const { paymentsPage, paymentsTotal, loading } = storeToRefs(store);

/**
 * Rows per page.
 */
const PAGE_SIZE = 10;

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
    sort?: string;
}

/**
 * The filters, as edited.
 */
const filters = ref<PaymentFilters>({});

/**
 * The page shown, 1-based.
 */
const page = ref(1);

/**
 * How many pages the current filters span.
 */
const pageTotal = computed(() => Math.ceil(paymentsTotal.value / PAGE_SIZE));

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
 * Loads the page the current filters and page number name.
 *
 * @returns A promise settling once the page loaded or the failure was toasted.
 */
const load = () =>
    store
        .fetchPaymentsPage({
            page: page.value,
            pageSize: PAGE_SIZE,
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
            reference: filters.value.reference?.trim() || undefined
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));

/**
 * Applies the filters from the first page.
 */
const handleSearch = () => {
    page.value = 1;
    return load();
};

/**
 * Clears every filter and reloads the first page.
 */
const handleReset = () => {
    filters.value = {};
    return handleSearch();
};

/**
 * The header's sort state, kept in `filters.sort`; a click restarts from page 1.
 */
const { sortBy } = useServerSort({ filters, apply: handleSearch });

watch(page, () => void load());

/**
 * The row the visitor picked. A pick opens the drawer and is then forgotten, so the same row can
 * be opened again (a held selection would not change, and a watcher would not fire).
 */
const selectedId = ref<string>();

watch(selectedId, (id) => {
    if (id === undefined) return;
    const picked = paymentsPage.value.find((payment) => payment.id === id);
    selectedId.value = undefined;
    if (picked) emit('select', picked);
});

onMounted(() => {
    void load();
});

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
 *
 * @param orderId - The order.
 */
const orderLink = (orderId: string) => {
    const target = linkIfRouted(router, 'OrderTarget', { id: orderId });
    return target ? routerLinkI18n(target) : undefined;
};
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
                <div class="mt-4 flex flex-wrap gap-2">
                    <v-btn type="submit" color="primary" data-test="payments-search-submit">
                        <Search :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('generic.search') }}
                    </v-btn>
                    <v-btn variant="tonal" data-test="payments-search-reset" @click="handleReset">
                        {{ t('generic.reset') }}
                    </v-btn>
                </div>
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
