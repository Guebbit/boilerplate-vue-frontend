<script lang="ts">
export default {
    name: 'OrdersListPage'
};
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { Search } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/features/orders/store.ts';
import { useProfileStore } from '@/stores/profile.ts';
import { notifyErrorMessages } from '@/utils/errors.ts';
import { formatDate } from '@/utils/formatters.ts';
import type { Order } from '@types';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import ListPagination from '@/components/molecules/ListPagination.vue';
import DataTable from '@/components/organisms/DataTable.vue';

const { t } = useI18n();
const { addMessage } = useNotificationsStore();

const { watchSearchOrders, deleteOrder } = useOrdersStore();
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
const { isAdmin } = storeToRefs(useProfileStore());

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
const tableHeaders = computed(() => [
    { title: t('orders-list-page.column-id'), key: 'id' },
    { title: t('orders-list-page.column-status'), key: 'status' },
    { title: t('orders-list-page.column-total'), key: 'total' },
    { title: t('orders-list-page.column-date'), key: 'createdAt' },
    { title: t('orders-list-page.column-actions'), key: 'actions' }
]);

/**
 * Rows of the current page.
 *
 * @returns The page's orders, with the placeholder holes of the sparse
 *  pagination list filtered out.
 */
const pageItems = computed(() => pageItemList.value.filter((item): item is Order => !!item));

const { search } = watchSearchOrders({
    onError: (error) => notifyErrorMessages(addMessage, error)
});

/**
 * Maps an order status onto a semantic theme color.
 *
 * @param status - Order status, possibly unset.
 * @returns The Vuetify color name, defaulting to `secondary`.
 */
const statusColor = (status?: string) =>
    ({
        pending: 'warning',
        paid: 'info',
        processing: 'info',
        shipped: 'secondary',
        delivered: 'success',
        cancelled: 'error'
    })[status ?? ''] ?? 'secondary';

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
            :loading="loading"
            :loading-text="t('generic.loading')"
        >
            <template v-slot:[`item.status`]="{ item }">
                <v-chip size="small" variant="tonal" :color="statusColor(item.status)">
                    {{ t(`orders-form.status-${item.status}`) }}
                </v-chip>
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
                        :disabled="loading"
                        @click.stop="handleDelete(item.id)"
                    >
                        {{ t('orders-list-page.button-delete') }}
                    </v-btn>
                </div>
            </template>
        </DataTable>

        <ListPagination v-model="pageCurrent" :length="pageTotal" />
    </LayoutDefault>
</template>
