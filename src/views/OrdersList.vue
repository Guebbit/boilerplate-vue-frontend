<template>
    <LayoutDefault id="orders-list-page" class="item-list-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('orders-list-page.page-title') }}</span>
            </h1>
        </template>

        <form class="list-filters" @submit.prevent="handleSearch">
            <BaseInput v-model="filters.id" :label="t('orders-list-page.filter-id')" :placeholder="t('orders-list-page.filter-id')" />
            <BaseInput v-model="filters.userId" :label="t('orders-list-page.filter-user-id')" :placeholder="t('orders-list-page.filter-user-id')" />
            <BaseInput v-model="filters.productId" :label="t('orders-list-page.filter-product-id')" :placeholder="t('orders-list-page.filter-product-id')" />
            <BaseInput v-model="filters.email" :label="t('orders-list-page.filter-email')" :placeholder="t('orders-list-page.filter-email')" />
            <div class="list-filters-actions">
                <button type="submit" class="theme-button">{{ t('generic.search') }}</button>
                <button type="button" class="theme-button" @click="handleReset">{{ t('generic.reset') }}</button>
            </div>
        </form>

        <div v-if="ordersList.length === 0" class="theme-card">
            <p>{{ t('orders-list-page.empty-orders') }}</p>
            <RouterLink :to="routerLinkI18n({ name: 'Cart' })">
                {{ t('orders-list-page.button-go-to-cart') }}
            </RouterLink>
        </div>

        <div v-else class="users-table-wrapper">
            <table class="users-table">
                <thead>
                    <tr>
                        <th>{{ t('orders-list-page.column-id') }}</th>
                        <th>{{ t('orders-list-page.column-status') }}</th>
                        <th>{{ t('orders-list-page.column-total') }}</th>
                        <th>{{ t('orders-list-page.column-date') }}</th>
                        <th>{{ t('orders-list-page.column-actions') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="order in pageItemList"
                        :key="'order-row-' + order.id"
                        :class="{ active: selectedOrderId === order.id }"
                        @click="selectedOrderId = order.id"
                    >
                        <td>{{ order.id }}</td>
                        <td>{{ order.status }}</td>
                        <td>{{ order.total }}</td>
                        <td>
                            {{
                                order.createdAt
                                    ? new Date(order.createdAt).toLocaleDateString()
                                    : '-'
                            }}
                        </td>
                        <td class="actions-cell">
                            <RouterLink
                                :to="routerLinkI18n({ name: 'OrderTarget', params: { id: order.id } })"
                                class="theme-button"
                            >
                                {{ t('orders-list-page.button-view') }}
                            </RouterLink>
                            <RouterLink
                                :to="routerLinkI18n({ name: 'OrderEdit', params: { id: order.id } })"
                                class="theme-button"
                            >
                                {{ t('orders-list-page.button-edit') }}
                            </RouterLink>
                            <button
                                class="theme-button"
                                :disabled="loading"
                                @click.stop="handleDelete(order.id)"
                            >
                                {{ t('orders-list-page.button-delete') }}
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <ListPagination v-model="pageCurrent" :length="pageTotal" />
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'OrdersListPage'
};
</script>

<script setup lang="ts">
import '../assets/styles/pages/ordersList.scss';
import { onMounted, reactive, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/stores/orders.ts';
import type { SearchOrdersRequest } from '@types';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import ListPagination from '@/components/molecules/ListPagination.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';

const { t } = useI18n();
const { addMessage } = useNotificationsStore();

const { fetchSearchOrders, deleteOrder } = useOrdersStore();
const { ordersList, pageItemList, selectedOrderId, pageCurrent, pageTotal, pageSize, loading } =
    storeToRefs(useOrdersStore());

pageSize.value = 10;

const filters = reactive<Omit<SearchOrdersRequest, 'page' | 'pageSize'>>({});

const handleSearch = () => {
    pageCurrent.value = 1;
    fetchSearchOrders(filters, 1, pageSize.value);
};

const handleReset = () => {
    Object.keys(filters).forEach((k) => delete (filters as Record<string, unknown>)[k]);
    pageCurrent.value = 1;
    fetchSearchOrders({}, 1, pageSize.value, true);
};

const handleDelete = (orderId: string) => {
    if (!confirm(t('orders-list-page.confirm-delete'))) return;
    deleteOrder(orderId)
        .then(() => addMessage(t('orders-list-page.success-delete')))
        .catch(({ message }: { message: string }) => addMessage(message));
};

onMounted(() => fetchSearchOrders(filters, Math.max(1, pageCurrent.value), pageSize.value));

watch([pageCurrent, pageSize], ([currentPage, currentPageSize]) => {
    fetchSearchOrders(filters, Math.max(1, currentPage), currentPageSize);
});
</script>
