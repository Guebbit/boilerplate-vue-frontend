<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'AwaitingTransferTable'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The payments page's "Awaiting transfer" tab, contributed through the `payments-awaiting-transfer`
 * slot. It lists ORDERS, not payments — no payment exists for a bank transfer until an admin
 * records the money — by nearest `payBy`, and each row offers `payments`' own offline form in a
 * dialog. The hold window itself (`NODE_BANK_TRANSFER_HOLD_HOURS`) is the server's.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { formatCurrency, formatDateTime, EMPTY_VALUE } from '@/infrastructure/utils/formatters.ts';
import DataTable from '@/ui/organisms/DataTable.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import { RecordOfflinePaymentForm } from '@/modules/payments';
import type { Order } from '@types';
import { useOrdersStore } from '../store.ts';

/**
 * Translation function and toast dispatcher.
 */
const { t } = useI18n();

/**
 * Toast dispatcher: a failed read is ambient.
 */
const { addMessage } = useNotificationsStore();

/**
 * The store: the owed transfers, their total and the loading flag.
 */
const store = useOrdersStore();

/**
 * The reactive slice of the store this table renders.
 */
const { awaitingTransfers, awaitingTransfersTotal, loading } = storeToRefs(store);

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
const pageTotal = computed(() => Math.ceil(awaitingTransfersTotal.value / PAGE_SIZE));

/**
 * Loads the page named by {@link page}.
 *
 * @returns A promise settling once the read finished or the failure was toasted.
 */
const load = () =>
    store
        .fetchAwaitingTransfers(page.value, PAGE_SIZE)
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));

watch(page, () => void load());

onMounted(() => {
    void load();
});

/**
 * Columns of the table.
 */
const headers = computed<CoreDataTableHeader<Order>[]>(() => [
    { title: t('awaiting-transfer.column-order'), key: 'orderNumber', synthetic: true },
    { title: t('awaiting-transfer.column-email'), key: 'email', synthetic: true },
    { title: t('awaiting-transfer.column-total'), key: 'totalPrice', synthetic: true },
    { title: t('awaiting-transfer.column-pay-by'), key: 'payBy', synthetic: true },
    { title: t('awaiting-transfer.column-actions'), key: 'actions', synthetic: true }
]);

/**
 * The order whose offline form is open.
 */
const recordingFor = ref<Order>();

/**
 * Whether the dialog is open.
 */
const dialogOpen = ref(false);

/**
 * Opens the form for a row.
 *
 * @param order - The order the money arrived for.
 */
const openRecord = (order: Order) => {
    recordingFor.value = order;
    dialogOpen.value = true;
};

/**
 * The form recorded the money: the order left the queue, so reload it.
 *
 * @returns A promise settling once the list was read again.
 */
const handleRecorded = () => {
    dialogOpen.value = false;
    return load();
};
</script>

<template>
    <div data-test="payments-awaiting">
        <p class="mb-4 text-sm opacity-75">{{ t('awaiting-transfer.hint') }}</p>

        <v-empty-state
            v-if="awaitingTransfers.length === 0 && !loading"
            :title="t('awaiting-transfer.empty')"
        />

        <DataTable
            v-else
            :headers="headers"
            :items="awaitingTransfers"
            :caption="t('awaiting-transfer.table-caption')"
            :loading="loading"
            :loading-text="t('generic.loading')"
            row-test="awaiting-row"
        >
            <template v-slot:[`item.orderNumber`]="{ item }">
                <router-link
                    :to="routerLinkI18n({ name: 'OrderTarget', params: { id: item.id } })"
                    class="underline"
                    data-test="awaiting-order-link"
                >
                    {{ item.orderNumber ?? item.id }}
                </router-link>
            </template>
            <template v-slot:[`item.email`]="{ item }">
                {{ item.email }}
            </template>
            <template v-slot:[`item.totalPrice`]="{ item }">
                {{ formatCurrency(item.totalPrice, item.currency) }}
            </template>
            <template v-slot:[`item.payBy`]="{ item }">
                {{ item.payBy ? formatDateTime(item.payBy) : EMPTY_VALUE }}
            </template>
            <template v-slot:[`item.actions`]="{ item }">
                <v-btn
                    size="small"
                    variant="tonal"
                    color="primary"
                    data-test="awaiting-record"
                    :aria-label="
                        t('awaiting-transfer.button-record-named', {
                            order: item.orderNumber ?? item.id
                        })
                    "
                    @click.stop="openRecord(item)"
                >
                    {{ t('awaiting-transfer.button-record') }}
                </v-btn>
            </template>
        </DataTable>
        <ListPagination v-model="page" :length="pageTotal" />

        <v-dialog v-model="dialogOpen" max-width="520">
            <v-card v-if="recordingFor" class="p-5" data-test="awaiting-record-dialog">
                <h2 class="mb-1 text-lg font-semibold">
                    {{
                        t('awaiting-transfer.dialog-title', {
                            order: recordingFor.orderNumber ?? recordingFor.id
                        })
                    }}
                </h2>
                <RecordOfflinePaymentForm :order-id="recordingFor.id" @recorded="handleRecorded" />
                <div class="mt-3 flex justify-end">
                    <v-btn
                        variant="text"
                        data-test="awaiting-record-close"
                        @click="dialogOpen = false"
                    >
                        {{ t('awaiting-transfer.button-close') }}
                    </v-btn>
                </div>
            </v-card>
        </v-dialog>
    </div>
</template>
