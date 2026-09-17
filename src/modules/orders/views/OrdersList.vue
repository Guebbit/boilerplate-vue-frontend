<script lang="ts">
export default {
    name: 'OrdersListPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Orders list/search page. Wires the store's paginated search to a filter
 * form and a `DataTable`, with per-row view/edit/delete/hard-delete actions
 * gated on the signed-in role. Also owns the "find by reference" lookup: paste the RF reference (or
 * a legacy raw id) off a bank transfer's own statement line and land straight on that order's edit
 * page — `OrderEdit.vue` is already "show the order, mark it paid", so this never builds a second
 * one.
 */
import { computed, ref } from 'vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { Search } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/modules/orders/store.ts';
import { useOrderByReference } from '@/modules/payments';
import { useSessionStore } from '@/infrastructure/session.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { formatCurrency, formatDate } from '@/infrastructure/utils/formatters.ts';
import type { Order } from '@types';
import { OrderStatus } from '@types';

import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import DataTable from '@/ui/organisms/DataTable.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';
import { useTouchFriendlySize } from '@/ui/composables/use-touch-friendly-size.ts';
import { useDialogStore } from '@/ui/dialog.ts';

/**
 * Generic translation and notification accessors.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Orders store actions and reactive list/pagination state.
 */
const { watchSearchOrders, deleteOrder, hardDeleteOrder } = useOrdersStore();

/**
 * Orders store reactive state — filters, the current page window and the pagination counters.
 */
const {
    filters,
    ordersList,
    pageItemList,
    selectedOrderId,
    pageCurrent,
    pageTotal,
    pageSize,
    loading
} = storeToRefs(useOrdersStore());

/**
 * Whether the signed-in user may see the admin-only row actions.
 */
const session = useSessionStore();

/**
 * Row-action button size: `small` on desktop, Vuetify's bigger default below `sm`, where a tap
 * replaces a click and `small` misses the WCAG touch-target recommendation.
 */
const rowActionSize = useTouchFriendlySize();

/**
 * Programmatic navigation, used once a pasted reference resolves to an order.
 */
const router = useRouter();

/**
 * The reference-lookup call — `payments`' own step before `recordOfflinePayment` — and the state
 * it mirrors the answer into.
 */
const {
    order: referenceOrder,
    notFound: referenceNotFound,
    loading: referenceLoading,
    findByReference,
    reset: resetReferenceLookup
} = useOrderByReference();

/**
 * The pasted reference, live-bound to its own field — separate from `filters`, since this is a
 * one-shot lookup rather than a filter the table search applies.
 */
const referenceInput = ref('');

/**
 * Selectable page sizes for the orders table.
 */
const pageSizeOptions = [
    { value: 10, label: '10' },
    { value: 25, label: '25' },
    { value: 50, label: '50' }
];

/**
 * Columns of the orders table.
 *
 * @returns The localized headers, re-translated on locale change.
 */
const tableHeaders = computed<CoreDataTableHeader<Order>[]>(() => [
    { title: t('orders-list-page.column-id'), key: 'id' },
    { title: t('orders-list-page.column-status'), key: 'status' },
    { title: t('orders-list-page.column-total'), key: 'totalPrice' },
    { title: t('orders-list-page.column-date'), key: 'createdAt' },
    // Reads no field on the row: the cell is the `item.actions` slot below.
    { title: t('orders-list-page.column-actions'), key: 'actions', synthetic: true }
]);

/**
 * Search function bound to the store's reactive `filters`/pagination, reporting
 * a failed request as a toast.
 */
const { search } = watchSearchOrders({
    onError: (error) => notifyErrorMessages(addMessage, error)
});

/**
 * Semantic theme color per order status. `satisfies` requires every `OrderStatus` member to
 * appear here, so a status added to the contract fails the type check instead of rendering grey.
 */
const STATUS_COLORS = {
    pending: 'warning',
    paid: 'info',
    processing: 'info',
    shipped: 'secondary',
    delivered: 'success',
    cancelled: 'error'
} satisfies Record<OrderStatus, string>;

/**
 * Maps an order status onto a semantic theme color.
 *
 * @param status - Order status, possibly unset.
 * @returns The Vuetify color name, defaulting to `secondary`.
 */
const statusColor = (status?: OrderStatus) => (status ? STATUS_COLORS[status] : 'secondary');

/**
 * The "awaiting transfer" filter: a `pending` order placed with `bank_transfer`, the two fields
 * an operator needs to find money still owed on a checkout choice rather than a card decline.
 * Modelled as one toggle over two filter fields, since neither is useful alone in this view.
 */
const awaitingTransferOnly = computed<boolean>({
    get: () =>
        filters.value.status === 'pending' && filters.value.paymentMethod === 'bank_transfer',
    set: (value) => {
        filters.value.status = value ? 'pending' : undefined;
        filters.value.paymentMethod = value ? 'bank_transfer' : undefined;
    }
});

/**
 * Applies the current filters, restarting from the first page.
 *
 * @returns The search promise, resolving once the page is loaded.
 */
const handleSearch = () => {
    pageCurrent.value = 1;
    return search();
};

/**
 * Clears every filter and reloads the first page from the API.
 *
 * @returns The search promise, resolving once the page is loaded.
 */
const handleReset = () => {
    filters.value = {};
    pageCurrent.value = 1;
    return search(true);
};

/**
 * Looks the pasted reference up and, once it resolves, jumps straight to that order's edit page —
 * where the operator records the payment exactly as they would for any other order. A 404 answers
 * inline instead ({@link referenceNotFound}); anything else is the caller's toast.
 *
 * @returns A promise resolving once the lookup and, if it found something, the navigation have
 *  settled.
 */
const searchByReference = () => {
    const reference = referenceInput.value.trim();
    if (!reference) return Promise.resolve();

    return findByReference(reference)
        .then(() => {
            if (!referenceOrder.value) return;
            referenceInput.value = '';
            return router.push(
                routerLinkI18n({ name: 'OrderEdit', params: { id: referenceOrder.value.id } })
            );
        })
        .catch((error: unknown) => notifyErrorMessages(addMessage, error));
};

/**
 * Clears a stale "not found" message once the operator starts typing a different reference.
 */
const clearReferenceNotFound = () => {
    if (referenceNotFound.value) resetReferenceLookup();
};

/**
 * Deletes an order after an explicit confirmation.
 *
 * @param orderId - Identifier of the order to delete.
 * @returns A promise settling once the viewer has answered and, if they accepted, the
 *  delete has finished; the outcome is reported as a toast.
 */
const handleDelete = (orderId: string) =>
    useDialogStore()
        .confirm({ message: t('orders-list-page.confirm-delete'), color: 'error' })
        .then((accepted) => {
            if (!accepted) return;
            return deleteOrder(orderId)
                .then(() => addMessage(t('orders-list-page.success-delete')))
                .catch((error: unknown) => notifyErrorMessages(addMessage, error));
        });

/**
 * Permanently deletes an order after an explicit confirmation. Unlike {@link handleDelete}, this
 * bypasses the soft-delete and cannot be undone.
 *
 * @param orderId - Identifier of the order to hard-delete.
 * @returns A promise settling once the viewer has answered and, if they accepted, the
 *  hard-delete has finished; the outcome is reported as a toast.
 */
const handleHardDelete = (orderId: string) =>
    useDialogStore()
        .confirm({ message: t('orders-list-page.confirm-hard-delete'), color: 'error' })
        .then((accepted) => {
            if (!accepted) return;
            return hardDeleteOrder(orderId)
                .then(() => addMessage(t('orders-list-page.success-hard-delete')))
                .catch((error: unknown) => notifyErrorMessages(addMessage, error));
        });
</script>

<template>
    <LayoutDefault id="orders-list-page" :title="t('orders-list-page.page-title')">
        <v-card
            v-if="session.can('update', 'Order')"
            class="mb-6 p-5"
            data-test="reference-lookup-card"
        >
            <form
                novalidate
                class="flex flex-wrap items-end gap-3"
                data-test="reference-lookup-form"
                @submit.prevent="searchByReference"
            >
                <v-text-field
                    v-model="referenceInput"
                    :label="t('orders-list-page.label-reference-lookup')"
                    :hint="t('orders-list-page.hint-reference-lookup')"
                    persistent-hint
                    data-test="reference-lookup-input"
                    class="min-w-72 grow"
                    hide-details="auto"
                    @update:model-value="clearReferenceNotFound"
                />
                <v-btn
                    type="submit"
                    color="primary"
                    :disabled="referenceLoading || !referenceInput.trim()"
                    data-test="reference-lookup-submit"
                >
                    <Search :size="16" class="mr-1" aria-hidden="true" />
                    {{ t('orders-list-page.button-find-reference') }}
                </v-btn>
            </form>
            <v-alert
                v-if="referenceNotFound"
                type="warning"
                class="mt-3"
                :text="t('orders-list-page.error-reference-not-found')"
                data-test="reference-lookup-not-found"
            />
        </v-card>

        <v-card class="mb-6 p-5">
            <form novalidate @submit.prevent="handleSearch">
                <div class="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-5">
                    <v-text-field
                        v-model="filters.id"
                        :label="t('orders-list-page.filter-id')"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.userId"
                        :label="t('orders-list-page.filter-user-id')"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.productId"
                        :label="t('orders-list-page.filter-product-id')"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.email"
                        :label="t('orders-list-page.filter-email')"
                        hide-details
                    />
                    <v-select
                        v-model="pageSize"
                        :label="t('generic.page-size')"
                        :items="pageSizeOptions"
                        item-title="label"
                        item-value="value"
                        hide-details
                    />
                </div>
                <v-checkbox
                    v-model="awaitingTransferOnly"
                    :label="t('orders-list-page.filter-awaiting-transfer')"
                    data-test="filter-awaiting-transfer"
                    hide-details
                    class="mt-2"
                />
                <div class="mt-4 flex flex-wrap gap-2">
                    <v-btn type="submit" color="primary">
                        <Search :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('generic.search') }}
                    </v-btn>
                    <v-btn variant="tonal" @click="handleReset">{{ t('generic.reset') }}</v-btn>
                </div>
            </form>
        </v-card>

        <v-empty-state v-if="ordersList.length === 0" :title="t('orders-list-page.empty-orders')">
            <template #actions>
                <v-btn color="primary" :to="routerLinkI18n({ name: 'Cart' })">
                    {{ t('orders-list-page.button-go-to-cart') }}
                </v-btn>
            </template>
        </v-empty-state>

        <DataTable
            v-else
            v-model="selectedOrderId"
            :headers="tableHeaders"
            :items="pageItemList"
            :caption="t('orders-list-page.table-caption')"
            :loading="loading"
            :loading-text="t('generic.loading')"
        >
            <template v-slot:[`item.status`]="{ item }">
                <v-chip size="small" variant="tonal" :color="statusColor(item.status)">
                    {{ t(`orders-form.status-${item.status}`) }}
                </v-chip>
            </template>

            <template v-slot:[`item.totalPrice`]="{ item }">
                {{ formatCurrency(item.totalPrice) }}
            </template>

            <template v-slot:[`item.createdAt`]="{ item }">
                {{ formatDate(item.createdAt) }}
            </template>

            <template v-slot:[`item.actions`]="{ item }">
                <div class="flex flex-wrap gap-1">
                    <v-btn
                        :size="rowActionSize"
                        variant="tonal"
                        data-test="row-view"
                        :aria-label="t('orders-list-page.button-view-named', { id: item.id })"
                        :to="routerLinkI18n({ name: 'OrderTarget', params: { id: item.id } })"
                    >
                        {{ t('orders-list-page.button-view') }}
                    </v-btn>
                    <v-btn
                        v-if="session.can('update', 'Order')"
                        :size="rowActionSize"
                        variant="tonal"
                        color="secondary"
                        data-test="row-edit"
                        :aria-label="t('orders-list-page.button-edit-named', { id: item.id })"
                        :to="routerLinkI18n({ name: 'OrderEdit', params: { id: item.id } })"
                    >
                        {{ t('orders-list-page.button-edit') }}
                    </v-btn>
                    <v-btn
                        v-if="session.can('delete', 'Order')"
                        :size="rowActionSize"
                        variant="tonal"
                        color="error"
                        data-test="row-delete"
                        :aria-label="t('orders-list-page.button-delete-named', { id: item.id })"
                        :disabled="loading"
                        @click.stop="handleDelete(item.id)"
                    >
                        {{ t('orders-list-page.button-delete') }}
                    </v-btn>
                    <v-btn
                        v-if="session.can('delete', 'Order')"
                        :size="rowActionSize"
                        variant="tonal"
                        color="error"
                        data-test="row-hard-delete"
                        :aria-label="
                            t('orders-list-page.button-hard-delete-named', { id: item.id })
                        "
                        :disabled="loading"
                        @click.stop="handleHardDelete(item.id)"
                    >
                        {{ t('orders-list-page.button-hard-delete') }}
                    </v-btn>
                </div>
            </template>
        </DataTable>

        <ListPagination v-model="pageCurrent" :length="pageTotal" />
    </LayoutDefault>
</template>
