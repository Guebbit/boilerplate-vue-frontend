<template>
    <LayoutDefault id="orders-list-page" class="item-list-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('orders-list-page.page-title') }}</span>
            </h1>
        </template>

        <form class="list-filters" @submit.prevent="handleSearch">
            <BaseInput
                v-model="filters.id"
                :label="t('orders-list-page.filter-id')"
                :placeholder="t('orders-list-page.filter-id')"
            />
            <BaseInput
                v-model="filters.userId"
                :label="t('orders-list-page.filter-user-id')"
                :placeholder="t('orders-list-page.filter-user-id')"
            />
            <BaseInput
                v-model="filters.productId"
                :label="t('orders-list-page.filter-product-id')"
                :placeholder="t('orders-list-page.filter-product-id')"
            />
            <BaseInput
                v-model="filters.email"
                :label="t('orders-list-page.filter-email')"
                :placeholder="t('orders-list-page.filter-email')"
            />
            <div class="list-filters-actions">
                <button type="submit" class="theme-button">{{ t('generic.search') }}</button>
                <button type="button" class="theme-button" @click="handleReset">
                    {{ t('generic.reset') }}
                </button>
            </div>
        </form>

        <div v-if="ordersList.length === 0" class="theme-card">
            <p>{{ t('orders-list-page.empty-orders') }}</p>
            <RouterLink :to="routerLinkI18n({ name: 'Cart' })">
                {{ t('orders-list-page.button-go-to-cart') }}
            </RouterLink>
        </div>

        <CoreDataTable
            v-else
            v-model="selectedOrderId"
            :headers="tableHeaders"
            :items="pageItemList"
            :loading="loading"
            :loading-text="t('generic.loading')"
        >
            <template #item.createdAt="{ item }">
                {{ item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-' }}
            </template>

            <template #item.actions="{ item }">
                <div class="actions-cell">
                    <RouterLink
                        :to="routerLinkI18n({ name: 'OrderTarget', params: { id: item.id } })"
                        class="theme-button view-button"
                    >
                        {{ t('orders-list-page.button-view') }}
                    </RouterLink>
                    <RouterLink
                        :to="routerLinkI18n({ name: 'OrderEdit', params: { id: item.id } })"
                        class="theme-button edit-button"
                    >
                        {{ t('orders-list-page.button-edit') }}
                    </RouterLink>
                    <button
                        class="theme-button delete-button"
                        :disabled="loading"
                        @click.stop="handleDelete(item.id)"
                    >
                        {{ t('orders-list-page.button-delete') }}
                    </button>
                </div>
            </template>
        </CoreDataTable>

        <ListPagination v-model="pageCurrent" :length="pageTotal" />
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'OrdersListPage'
};
</script>

<script setup lang="ts">
import '@/styles/pages/ordersList.scss';
import { computed, onMounted, reactive, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/stores/orders.ts';
import { notifyErrorMessages } from '@/utils/helperErrors.ts';
import type { SearchOrdersRequest } from '@types';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import ListPagination from '@/components/molecules/ListPagination.vue';
import CoreDataTable from '@/components/molecules/CoreDataTable.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';

const { t } = useI18n();
const { addMessage } = useNotificationsStore();

const { fetchSearchOrders, deleteOrder } = useOrdersStore();
const { ordersList, pageItemList, selectedOrderId, pageCurrent, pageTotal, pageSize, loading } =
    storeToRefs(useOrdersStore());

pageSize.value = 10;

const filters = reactive<Omit<SearchOrdersRequest, 'page' | 'pageSize'>>({});

const tableHeaders = computed(() => [
    { title: t('orders-list-page.column-id'), key: 'id' },
    { title: t('orders-list-page.column-status'), key: 'status' },
    { title: t('orders-list-page.column-total'), key: 'total' },
    { title: t('orders-list-page.column-date'), key: 'createdAt' },
    { title: t('orders-list-page.column-actions'), key: 'actions' }
]);

const handleSearch = () => {
    pageCurrent.value = 1;
    fetchSearchOrders(filters, 1, pageSize.value).catch((error) =>
        notifyErrorMessages(addMessage, error)
    );
};

const handleReset = () => {
    for (const k of Object.keys(filters)) delete (filters as Record<string, unknown>)[k];
    pageCurrent.value = 1;
    fetchSearchOrders({}, 1, pageSize.value, true).catch((error) =>
        notifyErrorMessages(addMessage, error)
    );
};

const handleDelete = (orderId: string) => {
    if (!confirm(t('orders-list-page.confirm-delete'))) return;
    deleteOrder(orderId)
        .then(() => addMessage(t('orders-list-page.success-delete')))
        .catch((error) => notifyErrorMessages(addMessage, error));
};

onMounted(() =>
    fetchSearchOrders(filters, Math.max(1, pageCurrent.value), pageSize.value).catch((error) =>
        notifyErrorMessages(addMessage, error)
    )
);

watch([pageCurrent, pageSize], ([currentPage, currentPageSize]) => {
    fetchSearchOrders(filters, Math.max(1, currentPage), currentPageSize).catch((error) =>
        notifyErrorMessages(addMessage, error)
    );
});
</script>
