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
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { linkIfRouted } from '@/kernel/route-link.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { formatCurrency, formatDateTime, EMPTY_VALUE } from '@/infrastructure/utils/formatters.ts';
import DataTable from '@/ui/organisms/DataTable.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import type { Payment } from '@types';
import { usePaymentsStore } from '../store.ts';

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
 * The store: the owed transfers, their total and the loading flag.
 */
const store = usePaymentsStore();

/**
 * The reactive slice of the store this table renders.
 */
const { awaitingPage, awaitingTotal, loading } = storeToRefs(store);

/**
 * Rows per page.
 */
const PAGE_SIZE = 10;

/**
 * The page shown, 1-based.
 */
const page = ref(1);

/**
 * How many pages are owed.
 */
const pageTotal = computed(() => Math.ceil(awaitingTotal.value / PAGE_SIZE));

/**
 * Loads the page named by {@link page}.
 *
 * @returns A promise settling once the read finished or the failure was toasted.
 */
const load = () =>
    store
        .fetchAwaitingPage(page.value, PAGE_SIZE)
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));

watch(page, () => void load());

onMounted(() => {
    void load();
});

/**
 * The row the visitor picked. A pick opens the drawer and is then forgotten, so the same row can
 * be opened again.
 */
const selectedId = ref<string>();

watch(selectedId, (id) => {
    if (id === undefined) return;
    const picked = awaitingPage.value.find((payment) => payment.id === id);
    selectedId.value = undefined;
    if (picked) emit('select', picked);
});

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
 *
 * @param orderId - The order.
 */
const orderLink = (orderId: string) => {
    const target = linkIfRouted(router, 'OrderTarget', { id: orderId });
    return target ? routerLinkI18n(target) : undefined;
};
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
