<template>
    <LayoutDefault id="orders-list-page">
        <template #header>
            <h1 class="text-h4 mb-6">
                <span>{{ t('orders-list-page.page-title') }}</span>
            </h1>
        </template>

        <VCard class="pa-4 mb-6" variant="flat" border>
            <form @submit.prevent="handleSearch">
                <VRow align="end" dense>
                    <VCol cols="12" md="6" lg="3">
                        <BaseInput
                            v-model="filters.id"
                            :label="t('orders-list-page.filter-id')"
                            :placeholder="t('orders-list-page.filter-id')"
                        />
                    </VCol>
                    <VCol cols="12" md="6" lg="3">
                        <BaseInput
                            v-model="filters.userId"
                            :label="t('orders-list-page.filter-user-id')"
                            :placeholder="t('orders-list-page.filter-user-id')"
                        />
                    </VCol>
                    <VCol cols="12" md="6" lg="3">
                        <BaseInput
                            v-model="filters.productId"
                            :label="t('orders-list-page.filter-product-id')"
                            :placeholder="t('orders-list-page.filter-product-id')"
                        />
                    </VCol>
                    <VCol cols="12" md="6" lg="3">
                        <BaseInput
                            v-model="filters.email"
                            :label="t('orders-list-page.filter-email')"
                            :placeholder="t('orders-list-page.filter-email')"
                        />
                    </VCol>
                    <VCol cols="12" md="6" lg="3">
                        <BaseSelect
                            v-model="pageSize"
                            :label="t('generic.page-size')"
                            :options="pageSizeOptions"
                        />
                    </VCol>
                    <VCol cols="12" md="6" lg="9">
                        <div class="d-flex flex-wrap justify-end ga-3">
                            <VBtn type="submit" color="primary" prepend-icon="$search">
                                {{ t('generic.search') }}
                            </VBtn>
                            <VBtn type="button" variant="tonal" @click="handleReset">
                                {{ t('generic.reset') }}
                            </VBtn>
                        </div>
                    </VCol>
                </VRow>
            </form>
        </VCard>

        <VCard v-if="ordersList.length === 0" class="pa-6 mb-6" variant="flat" border>
            <p class="mb-4">{{ t('orders-list-page.empty-orders') }}</p>
            <VBtn :to="routerLinkI18n({ name: 'Cart' })" color="primary" prepend-icon="$cart">
                {{ t('orders-list-page.button-go-to-cart') }}
            </VBtn>
        </VCard>

        <DataTable
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
                <div class="d-flex flex-wrap ga-2">
                    <VBtn
                        :to="routerLinkI18n({ name: 'OrderTarget', params: { id: item.id } })"
                        class="view-button"
                        size="small"
                        variant="tonal"
                        prepend-icon="$eye"
                    >
                        {{ t('orders-list-page.button-view') }}
                    </VBtn>
                    <VBtn
                        v-if="isAdmin"
                        :to="routerLinkI18n({ name: 'OrderEdit', params: { id: item.id } })"
                        class="edit-button"
                        size="small"
                        variant="tonal"
                        prepend-icon="$pencil"
                    >
                        {{ t('orders-list-page.button-edit') }}
                    </VBtn>
                    <VBtn
                        v-if="isAdmin"
                        class="delete-button"
                        size="small"
                        variant="tonal"
                        color="error"
                        prepend-icon="$delete"
                        :disabled="loading"
                        @click.stop="handleDelete(item.id)"
                    >
                        {{ t('orders-list-page.button-delete') }}
                    </VBtn>
                </div>
            </template>
        </DataTable>

        <ListPagination v-model="pageCurrent" :length="pageTotal" />
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'OrdersListPage'
};
</script>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { VBtn, VCard, VCol, VRow } from 'vuetify/components';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useOrdersStore } from '@/features/orders/store.ts';
import { useProfileStore } from '@/stores/profile.ts';
import { notifyErrorMessages } from '@/utils/errors.ts';
import type { SearchOrdersRequest } from '@types';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import ListPagination from '@/components/molecules/ListPagination.vue';
import DataTable from '@/components/organisms/DataTable.vue';
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
