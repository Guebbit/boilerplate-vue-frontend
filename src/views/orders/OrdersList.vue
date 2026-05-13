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
            <BaseSelect
                v-model="pageSize"
                :label="t('generic.page-size')"
                :options="pageSizeOptions"
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
            <template v-slot:[`item.createdAt`]="{ item }">
                {{ formatDate(item.createdAt) }}
            </template>

            <template v-slot:[`item.actions`]="{ item }">
                <div class="actions-cell">
                    <RouterLink
                        :to="routerLinkI18n({ name: 'OrderTarget', params: { id: item.id } })"
                        class="theme-button view-button"
                    >
                        {{ t('orders-list-page.button-view') }}
                    </RouterLink>
                    <RouterLink
                        v-if="isAdmin"
                        :to="routerLinkI18n({ name: 'OrderEdit', params: { id: item.id } })"
                        class="theme-button edit-button"
                    >
                        {{ t('orders-list-page.button-edit') }}
                    </RouterLink>
                    <button
                        v-if="isAdmin"
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
import { computed, reactive } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/stores/orders.ts';
import { useProfileStore } from '@/stores/profile.ts';
import { notifyErrorMessages } from '@/utils/helperErrors.ts';
import type { SearchOrdersRequest } from '@types';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import ListPagination from '@/components/molecules/ListPagination.vue';
import CoreDataTable from '@/components/molecules/CoreDataTable.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseSelect from '@/components/atoms/BaseSelect.vue';
import { useListPage } from '@/composables/useListPage.ts';

const { t } = useI18n();
const { addMessage } = useNotificationsStore();

const { fetchSearchOrders, deleteOrder } = useOrdersStore();
const { ordersList, pageItemList, selectedOrderId, pageCurrent, pageTotal, pageSize, loading } =
    storeToRefs(useOrdersStore());
const { isAdmin } = storeToRefs(useProfileStore());

const filters = reactive<Omit<SearchOrdersRequest, 'page' | 'pageSize'>>({});
const pageSizeOptions = [
    { value: 10, label: '10' },
    { value: 25, label: '25' },
    { value: 50, label: '50' }
];

const tableHeaders = computed(() => [
    { title: t('orders-list-page.column-id'), key: 'id' },
    { title: t('orders-list-page.column-status'), key: 'status' },
    { title: t('orders-list-page.column-total'), key: 'total' },
    { title: t('orders-list-page.column-date'), key: 'createdAt' },
    { title: t('orders-list-page.column-actions'), key: 'actions' }
]);

const { handleSearch, handleReset } = useListPage({
    filters,
    pageCurrent,
    pageSize,
    fetchSearch: fetchSearchOrders,
    onError: (error) => notifyErrorMessages(addMessage, error)
});

const handleDelete = (orderId: string) => {
    if (!confirm(t('orders-list-page.confirm-delete'))) return;
    deleteOrder(orderId)
        .then(() => addMessage(t('orders-list-page.success-delete')))
        .catch((error) => notifyErrorMessages(addMessage, error));
};

const formatDate = (date?: string) => (date ? new Date(date).toLocaleDateString() : '-');
</script>
