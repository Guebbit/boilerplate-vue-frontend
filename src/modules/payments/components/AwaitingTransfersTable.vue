<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'AwaitingTransfersTable'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The "Awaiting transfer" tab: bank-transfer payments still owed, soonest `payBy` first, read from
 * `GET /payments` (the server sorts and filters). Each row shows the deadline, the RF reference
 * the payer quotes and the amount; a row opens the payment's drawer, like the All tab.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { formatCurrency, formatDateTime, EMPTY_VALUE } from '@/infrastructure/utils/formatters.ts';
import DataTable from '@/ui/organisms/DataTable.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import type { Payment } from '@types';
import { usePaymentsStore } from '../store.ts';
import { usePagedTable } from '../composables/use-paged-table.ts';
import { useOrderLink } from '@/kernel/order-link.ts';
import { useRowSelect } from '../composables/use-row-select.ts';

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
 * The store: the owed transfers, their total and the loading flag.
 */
const store = usePaymentsStore();

/**
 * The reactive slice of the store this table renders.
 */
const { awaitingPage, awaitingTotal, loading } = storeToRefs(store);

/**
 * The page shown and the page count; the read runs on mount and on every page change.
 */
const { page, pageTotal } = usePagedTable(awaitingTotal, (pageNumber, pageSize) =>
    store.fetchAwaitingPage(pageNumber, pageSize)
);

/**
 * The row the visitor picked: opens the drawer, then is forgotten so it can be opened again.
 */
const selectedId = useRowSelect(awaitingPage, (payment) => emit('select', payment));

/**
 * Columns of the table; the server fixes the order, so none sorts.
 */
const headers = computed<CoreDataTableHeader<Payment>[]>(() => [
    { title: t('payments-list-page.column-pay-by'), key: 'payBy', synthetic: true },
    { title: t('payments-list-page.column-reference'), key: 'reference', synthetic: true },
    { title: t('payments-list-page.column-amount'), key: 'amount', synthetic: true },
    { title: t('payments-list-page.column-order'), key: 'orderNumber', synthetic: true },
    { title: t('payments-list-page.column-email'), key: 'email', synthetic: true }
]);

/**
 * An order's page, or nothing when this build ships no `orders` module.
 */
const orderLink = useOrderLink();
</script>

<template>
    <div data-test="payments-awaiting">
        <p class="mb-4 text-sm opacity-75">{{ t('payments-list-page.awaiting-hint') }}</p>

        <v-empty-state
            v-if="awaitingPage.length === 0 && !loading"
            :title="t('payments-list-page.empty-awaiting')"
        />

        <DataTable
            v-else
            v-model="selectedId"
            :headers="headers"
            :items="awaitingPage"
            :caption="t('payments-list-page.table-caption-awaiting')"
            :loading="loading"
            :loading-text="t('generic.loading')"
            row-test="awaiting-row"
        >
            <template v-slot:[`item.payBy`]="{ item }">
                {{ item.nextAction?.payBy ? formatDateTime(item.nextAction.payBy) : EMPTY_VALUE }}
            </template>
            <template v-slot:[`item.reference`]="{ item }">
                {{ item.nextAction?.reference ?? EMPTY_VALUE }}
            </template>
            <template v-slot:[`item.amount`]="{ item }">
                {{ formatCurrency(item.amount, item.currency) }}
            </template>
            <template v-slot:[`item.orderNumber`]="{ item }">
                <router-link
                    v-if="orderLink(item.orderId)"
                    :to="orderLink(item.orderId)!"
                    class="underline"
                    data-test="awaiting-order-link"
                    @click.stop
                >
                    {{ item.orderNumber ?? item.orderId }}
                </router-link>
                <span v-else>{{ item.orderNumber ?? item.orderId }}</span>
            </template>
            <template v-slot:[`item.email`]="{ item }">
                {{ item.email ?? EMPTY_VALUE }}
            </template>
        </DataTable>
        <ListPagination v-model="page" :length="pageTotal" />
    </div>
</template>
