<template>
    <LayoutDefault id="products-list-page" class="item-list-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('products-list-page.page-title') }}</span>
            </h1>
        </template>

        <form class="list-filters" @submit.prevent="handleSearch">
            <BaseInput
                v-model="filters.text"
                :label="t('products-list-page.filter-text')"
                :placeholder="t('products-list-page.filter-text')"
            />
            <BaseInput
                v-model="filters.id"
                :label="t('products-list-page.filter-id')"
                :placeholder="t('products-list-page.filter-id')"
            />
            <BaseInput
                v-model.number="filters.minPrice"
                :label="t('products-list-page.filter-min-price')"
                type="number"
            />
            <BaseInput
                v-model.number="filters.maxPrice"
                :label="t('products-list-page.filter-max-price')"
                type="number"
            />
            <div class="list-filters-actions">
                <button type="submit" class="theme-button">{{ t('generic.search') }}</button>
                <button type="button" class="theme-button" @click="handleReset">
                    {{ t('generic.reset') }}
                </button>
            </div>
        </form>

        <CoreDataTable
            v-model="selectedProductId"
            :headers="tableHeaders"
            :items="pageItemList"
            :loading="loading"
            :loading-text="t('generic.loading')"
        >
            <template #item.active="{ item }">
                {{ item.active ? '✓' : '✗' }}
            </template>

            <template #item.createdAt="{ item }">
                {{ item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-' }}
            </template>

            <template #item.actions="{ item }">
                <div class="actions-cell">
                    <RouterLink
                        :to="routerLinkI18n({ name: 'ProductTarget', params: { id: item.id } })"
                        class="theme-button view-button"
                    >
                        {{ t('products-list-page.button-view') }}
                    </RouterLink>
                    <RouterLink
                        :to="routerLinkI18n({ name: 'ProductEdit', params: { id: item.id } })"
                        class="theme-button edit-button"
                    >
                        {{ t('products-list-page.button-edit') }}
                    </RouterLink>
                    <button
                        class="theme-button delete-button"
                        :disabled="loading"
                        @click.stop="handleDelete(item.id)"
                    >
                        {{ t('products-list-page.button-delete') }}
                    </button>
                </div>
            </template>
        </CoreDataTable>

        <ListPagination v-model="pageCurrent" :length="pageTotal" />
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'ProductsListPage'
};
</script>

<script setup lang="ts">
import '@/styles/pages/productsList.scss';
import { computed, onMounted, reactive, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useProductsStore } from '@/stores/products';
import { notifyErrorMessages } from '@/utils/helperErrors.ts';
import type { SearchProductsRequest } from '@types';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import ListPagination from '@/components/molecules/ListPagination.vue';
import CoreDataTable from '@/components/molecules/CoreDataTable.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';

const { t } = useI18n();
const { addMessage } = useNotificationsStore();

const { fetchSearchProducts, deleteProduct } = useProductsStore();
const { pageItemList, selectedProductId, pageCurrent, pageTotal, pageSize, loading } =
    storeToRefs(useProductsStore());

pageSize.value = 10;

const filters = reactive<Omit<SearchProductsRequest, 'page' | 'pageSize'>>({});

const tableHeaders = computed(() => [
    { title: t('products-list-page.column-id'), key: 'id' },
    { title: t('products-list-page.column-title'), key: 'title' },
    { title: t('products-list-page.column-price'), key: 'price' },
    { title: t('products-list-page.column-active'), key: 'active' },
    { title: t('products-list-page.column-created-at'), key: 'createdAt' },
    { title: t('products-list-page.column-actions'), key: 'actions' }
]);

const handleSearch = () => {
    pageCurrent.value = 1;
    fetchSearchProducts(filters, 1, pageSize.value).catch((error) =>
        notifyErrorMessages(addMessage, error)
    );
};

const handleReset = () => {
    for (const k of Object.keys(filters)) delete (filters as Record<string, unknown>)[k];
    pageCurrent.value = 1;
    fetchSearchProducts({}, 1, pageSize.value, true).catch((error) =>
        notifyErrorMessages(addMessage, error)
    );
};

const handleDelete = (productId: string) => {
    if (!confirm(t('products-list-page.confirm-delete'))) return;
    deleteProduct(productId)
        .then(() => addMessage(t('products-list-page.success-delete')))
        .catch((error) => notifyErrorMessages(addMessage, error));
};

onMounted(() =>
    fetchSearchProducts(filters, Math.max(1, pageCurrent.value), pageSize.value).catch((error) =>
        notifyErrorMessages(addMessage, error)
    )
);

watch([pageCurrent, pageSize], ([currentPage, currentPageSize]) => {
    fetchSearchProducts(filters, Math.max(1, currentPage), currentPageSize).catch((error) =>
        notifyErrorMessages(addMessage, error)
    );
});
</script>
