<template>
    <LayoutDefault id="products-list-page">
        <template #header>
            <h1 class="text-h4 mb-6">
                <span>{{ t('products-list-page.page-title') }}</span>
            </h1>
        </template>

        <VCard class="pa-4 mb-6" variant="flat" border>
            <form @submit.prevent="handleSearch">
                <VRow align="end" dense>
                    <VCol cols="12" md="6" lg="3">
                        <BaseInput
                            v-model="filters.text"
                            :label="t('products-list-page.filter-text')"
                            :placeholder="t('products-list-page.filter-text')"
                        />
                    </VCol>
                    <VCol cols="12" md="6" lg="3">
                        <BaseInput
                            v-model="filters.id"
                            :label="t('products-list-page.filter-id')"
                            :placeholder="t('products-list-page.filter-id')"
                        />
                    </VCol>
                    <VCol cols="12" md="6" lg="3">
                        <BaseInput
                            v-model.number="filters.minPrice"
                            :label="t('products-list-page.filter-min-price')"
                            type="number"
                        />
                    </VCol>
                    <VCol cols="12" md="6" lg="3">
                        <BaseInput
                            v-model.number="filters.maxPrice"
                            :label="t('products-list-page.filter-max-price')"
                            type="number"
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

        <DataTable
            v-model="selectedProductId"
            :headers="tableHeaders"
            :items="pageItemList"
            :loading="loading"
            :loading-text="t('generic.loading')"
        >
            <template v-slot:[`item.active`]="{ item }">
                {{ item.active ? '✓' : '✗' }}
            </template>

            <template v-slot:[`item.createdAt`]="{ item }">
                {{ formatDate(item.createdAt) }}
            </template>

            <template v-slot:[`item.actions`]="{ item }">
                <div class="d-flex flex-wrap ga-2">
                    <VBtn
                        :to="
                            routerLinkI18n({
                                name: 'ProductTarget',
                                params: { id: item.id }
                            })
                        "
                        class="view-button"
                        size="small"
                        variant="tonal"
                        prepend-icon="$eye"
                    >
                        {{ t('products-list-page.button-view') }}
                    </VBtn>
                    <VBtn
                        v-if="isAdmin"
                        :to="
                            routerLinkI18n({
                                name: 'ProductEdit',
                                params: { id: item.id }
                            })
                        "
                        class="edit-button"
                        size="small"
                        variant="tonal"
                        prepend-icon="$pencil"
                    >
                        {{ t('products-list-page.button-edit') }}
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
                        {{ t('products-list-page.button-delete') }}
                    </VBtn>
                </div>
            </template>
        </DataTable>

        <ListPagination v-model="pageCurrent" :length="pageTotal" />
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'ProductsListPage'
};
</script>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { VBtn, VCard, VCol, VRow } from 'vuetify/components';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useProductsStore } from '@/features/products/store';
import { useProfileStore } from '@/stores/profile.ts';
import { notifyErrorMessages } from '@/utils/errors.ts';
import type { SearchProductsRequest } from '@types';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import ListPagination from '@/components/molecules/ListPagination.vue';
import DataTable from '@/components/organisms/DataTable.vue';
import BaseInput from '@/components/atoms/BaseInput.vue';
import BaseSelect from '@/components/atoms/BaseSelect.vue';
import { useListPage } from '@/composables/useListPage.ts';

const { t } = useI18n();
const { addMessage } = useNotificationsStore();

const { fetchSearchProducts, deleteProduct } = useProductsStore();
const { pageItemList, selectedProductId, pageCurrent, pageTotal, pageSize, loading } =
    storeToRefs(useProductsStore());
const { isAdmin } = storeToRefs(useProfileStore());

const filters = reactive<Omit<SearchProductsRequest, 'page' | 'pageSize'>>({});
const pageSizeOptions = [
    { value: 10, label: '10' },
    { value: 25, label: '25' },
    { value: 50, label: '50' }
];

const tableHeaders = computed(() => [
    { title: t('products-list-page.column-id'), key: 'id' },
    { title: t('products-list-page.column-title'), key: 'title' },
    { title: t('products-list-page.column-price'), key: 'price' },
    { title: t('products-list-page.column-active'), key: 'active' },
    { title: t('products-list-page.column-created-at'), key: 'createdAt' },
    { title: t('products-list-page.column-actions'), key: 'actions' }
]);

const { handleSearch, handleReset } = useListPage({
    filters,
    pageCurrent,
    pageSize,
    fetchSearch: fetchSearchProducts,
    onError: (error) => notifyErrorMessages(addMessage, error)
});

const handleDelete = (productId: string) => {
    if (!confirm(t('products-list-page.confirm-delete'))) return;
    deleteProduct(productId)
        .then(() => addMessage(t('products-list-page.success-delete')))
        .catch((error) => notifyErrorMessages(addMessage, error));
};

const formatDate = (date?: string) => (date ? new Date(date).toLocaleDateString() : '-');
</script>
