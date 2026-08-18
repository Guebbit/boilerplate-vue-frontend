<script lang="ts">
export default {
    name: 'ProductsListPage'
};
</script>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { routerLinkI18n } from '@/infrastructure/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { PackagePlus, Search } from 'lucide-vue-next';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useProductsStore } from '@/modules/products/store';
import { useSessionStore } from '@/infrastructure/session.ts';
import { notifyErrorMessages } from '@/infrastructure/errors.ts';
import { formatDate } from '@/infrastructure/formatters.ts';
import type { Product } from '@types';

import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import ListPagination from '@/ui/molecules/ListPagination.vue';
import DataTable from '@/ui/organisms/DataTable.vue';

const { t } = useI18n();
const { addMessage } = useNotificationsStore();

const { watchSearchProducts, deleteProduct, fetchFacets } = useProductsStore();
const {
    filters,
    pageItemList,
    selectedProductId,
    pageCurrent,
    pageTotal,
    pageSize,
    loading,
    facets
} = storeToRefs(useProductsStore());
const { isAdmin } = storeToRefs(useSessionStore());

/**
 * Selectable page sizes for the products table.
 */
const pageSizeOptions = [
    { value: 10, label: '10' },
    { value: 25, label: '25' },
    { value: 50, label: '50' }
];

/**
 * Columns of the products table.
 *
 * @returns The localized headers, re-translated on locale change.
 */
const tableHeaders = computed(() => [
    { title: t('products-list-page.column-id'), key: 'id' },
    { title: t('products-list-page.column-title'), key: 'title' },
    { title: t('products-list-page.column-price'), key: 'price' },
    { title: t('products-list-page.column-active'), key: 'active' },
    { title: t('products-list-page.column-created-at'), key: 'createdAt' },
    { title: t('products-list-page.column-actions'), key: 'actions' }
]);

/**
 * Rows of the current page.
 *
 * @returns The page's products, with the placeholder holes of the sparse
 *  pagination list filtered out.
 */
const pageItems = computed(() => pageItemList.value.filter((item): item is Product => !!item));

const { search } = watchSearchProducts({
    onError: (error) => notifyErrorMessages(addMessage, error)
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
 * Deletes a product after an explicit confirmation.
 *
 * @param productId - Identifier of the product to delete.
 * @returns Nothing; the outcome is reported as a toast.
 */
/**
 * Toggles one category chip: selecting it filters the list, selecting it again clears it.
 * Chips restart from the first page like any other filter change.
 *
 * @param name - The facet value the chip carries.
 * @returns The search promise.
 */
const handleCategoryChip = (name: string) => {
    filters.value.category = filters.value.category === name ? undefined : name;
    return handleSearch();
};

/**
 * The tag twin of {@link handleCategoryChip}.
 *
 * @param name - The facet value the chip carries.
 * @returns The search promise.
 */
const handleTagChip = (name: string) => {
    filters.value.tag = filters.value.tag === name ? undefined : name;
    return handleSearch();
};

onMounted(fetchFacets);

const handleDelete = (productId: string) => {
    if (!confirm(t('products-list-page.confirm-delete'))) return;
    deleteProduct(productId)
        .then(() => addMessage(t('products-list-page.success-delete')))
        .catch((error) => notifyErrorMessages(addMessage, error));
};
</script>

<template>
    <LayoutDefault id="products-list-page" :title="t('products-list-page.page-title')">
        <div v-if="facets && facets.categories.length > 0" class="mb-4" data-test="facet-chips">
            <div class="flex flex-wrap items-center gap-2">
                <span class="text-sm opacity-70">{{
                    t('products-list-page.label-categories')
                }}</span>
                <v-chip
                    v-for="facet in facets.categories"
                    :key="'category-' + facet.name"
                    size="small"
                    data-test="category-chip"
                    :color="filters.category === facet.name ? 'primary' : undefined"
                    @click="handleCategoryChip(facet.name)"
                >
                    {{ facet.name }} ({{ facet.count }})
                </v-chip>
            </div>
            <div v-if="facets.tags.length > 0" class="mt-2 flex flex-wrap items-center gap-2">
                <span class="text-sm opacity-70">{{ t('products-list-page.label-tags') }}</span>
                <v-chip
                    v-for="facet in facets.tags"
                    :key="'tag-' + facet.name"
                    size="x-small"
                    data-test="tag-chip"
                    :color="filters.tag === facet.name ? 'primary' : undefined"
                    @click="handleTagChip(facet.name)"
                >
                    {{ facet.name }} ({{ facet.count }})
                </v-chip>
            </div>
        </div>

        <v-card class="mb-6 p-5">
            <form novalidate @submit.prevent="handleSearch">
                <div class="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-5">
                    <v-text-field
                        v-model="filters.text"
                        :label="t('products-list-page.filter-text')"
                        data-test="filter-text"
                        hide-details
                    />
                    <v-text-field
                        v-model="filters.id"
                        :label="t('products-list-page.filter-id')"
                        hide-details
                    />
                    <v-number-input
                        v-model="filters.minPrice"
                        :label="t('products-list-page.filter-min-price')"
                        :min="0"
                        control-variant="hidden"
                        hide-details
                    />
                    <v-number-input
                        v-model="filters.maxPrice"
                        :label="t('products-list-page.filter-max-price')"
                        :min="0"
                        control-variant="hidden"
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
                <div class="mt-4 flex flex-wrap items-center gap-2">
                    <v-btn type="submit" color="primary">
                        <Search :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('generic.search') }}
                    </v-btn>
                    <v-btn variant="tonal" @click="handleReset">{{ t('generic.reset') }}</v-btn>
                    <v-spacer />
                    <v-btn
                        v-if="isAdmin"
                        color="secondary"
                        data-test="create-product"
                        :to="routerLinkI18n({ name: 'ProductCreate' })"
                    >
                        <PackagePlus :size="16" class="mr-1" aria-hidden="true" />
                        {{ t('products-list-page.button-create-product') }}
                    </v-btn>
                </div>
            </form>
        </v-card>

        <DataTable
            v-model="selectedProductId"
            :headers="tableHeaders"
            :items="pageItems"
            :loading="loading"
            :loading-text="t('generic.loading')"
        >
            <template v-slot:[`item.active`]="{ item }">
                <v-chip size="small" variant="tonal" :color="item.active ? 'success' : 'error'">
                    {{ item.active ? t('generic.enabled') : t('generic.disabled') }}
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
                        :to="routerLinkI18n({ name: 'ProductTarget', params: { id: item.id } })"
                    >
                        {{ t('products-list-page.button-view') }}
                    </v-btn>
                    <v-btn
                        v-if="isAdmin"
                        size="small"
                        variant="tonal"
                        color="secondary"
                        data-test="row-edit"
                        :to="routerLinkI18n({ name: 'ProductEdit', params: { id: item.id } })"
                    >
                        {{ t('products-list-page.button-edit') }}
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
                        {{ t('products-list-page.button-delete') }}
                    </v-btn>
                </div>
            </template>
        </DataTable>

        <ListPagination v-model="pageCurrent" :length="pageTotal" />
    </LayoutDefault>
</template>
