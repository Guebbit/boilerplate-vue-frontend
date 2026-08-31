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
 * gated on the signed-in role.
 */
import { computed } from 'vue';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Search } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/modules/orders/store.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { formatCurrency, formatDate } from '@/infrastructure/utils/formatters.ts';
import type { Order } from '@types';
import { OrderStatus } from '@types';

import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import DataTable from '@/ui/organisms/DataTable.vue';
import type { CoreDataTableHeader } from '@/ui/organisms/data-table-headers.ts';

/**
 * Generic translation and notification accessors.
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();

/**
 * Orders store actions and reactive list/pagination state.
 */
const { watchSearchOrders, deleteOrder, hardDeleteOrder } = useOrdersStore();
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
const { isAdmin } = storeToRefs(useSessionStore());

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
 * Rows of the current page.
 *
 * @returns The page's orders, with the placeholder holes of the sparse
 *  pagination list filtered out.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- the toolkit's page window is a SPARSE array; holes are undefined at runtime whatever the element type claims
const pageItems = computed(() => pageItemList.value.filter((item): item is Order => !!item));

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
 * Deletes an order after an explicit confirmation.
 *
 * @param orderId - Identifier of the order to delete.
 * @returns Nothing; the outcome is reported as a toast.
 */
const handleDelete = (orderId: string) => {
    if (!confirm(t('orders-list-page.confirm-delete'))) return;
    deleteOrder(orderId)
        .then(() => addMessage(t('orders-list-page.success-delete')))
        .catch((error) => notifyErrorMessages(addMessage, error));
};

/**
 * Permanently deletes an order after an explicit confirmation. Unlike {@link handleDelete}, this
 * bypasses the soft-delete and cannot be undone.
 *
 * @param orderId - Identifier of the order to hard-delete.
 * @returns Nothing; the outcome is reported as a toast.
 */
const handleHardDelete = (orderId: string) => {
    if (!confirm(t('orders-list-page.confirm-hard-delete'))) return;
    hardDeleteOrder(orderId)
        .then(() => addMessage(t('orders-list-page.success-hard-delete')))
        .catch((error) => notifyErrorMessages(addMessage, error));
};
</script>

<template>
    <LayoutDefault id="orders-list-page" :title="t('orders-list-page.page-title')">
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
            :items="pageItems"
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
                        size="small"
                        variant="tonal"
                        data-test="row-view"
                        :aria-label="t('orders-list-page.button-view-named', { id: item.id })"
                        :to="routerLinkI18n({ name: 'OrderTarget', params: { id: item.id } })"
                    >
                        {{ t('orders-list-page.button-view') }}
                    </v-btn>
                    <v-btn
                        v-if="isAdmin"
                        size="small"
                        variant="tonal"
                        color="secondary"
                        data-test="row-edit"
                        :aria-label="t('orders-list-page.button-edit-named', { id: item.id })"
                        :to="routerLinkI18n({ name: 'OrderEdit', params: { id: item.id } })"
                    >
                        {{ t('orders-list-page.button-edit') }}
                    </v-btn>
                    <v-btn
                        v-if="isAdmin"
                        size="small"
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
                        v-if="isAdmin"
                        size="small"
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
