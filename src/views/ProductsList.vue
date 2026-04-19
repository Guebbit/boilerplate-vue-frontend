<template>
    <LayoutDefault id="products-list-page" class="item-list-page">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('products-list-page.page-title') }}</span>
            </h1>
        </template>

        <div class="users-table-wrapper">
            <table class="users-table">
                <thead>
                    <tr>
                        <th>{{ t('products-list-page.column-id') }}</th>
                        <th>{{ t('products-list-page.column-title') }}</th>
                        <th>{{ t('products-list-page.column-price') }}</th>
                        <th>{{ t('products-list-page.column-active') }}</th>
                        <th>{{ t('products-list-page.column-created-at') }}</th>
                        <th>{{ t('products-list-page.column-actions') }}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="product in pageItemList"
                        :key="'product-row-' + product.id"
                        :class="{ active: selectedProductId === product.id }"
                        @click="selectedProductId = product.id"
                    >
                        <td>{{ product.id }}</td>
                        <td>{{ product.title }}</td>
                        <td>{{ product.price }}</td>
                        <td>{{ product.active ? '✓' : '✗' }}</td>
                        <td>
                            {{
                                product.createdAt
                                    ? new Date(product.createdAt).toLocaleDateString()
                                    : '-'
                            }}
                        </td>
                        <td class="actions-cell">
                            <RouterLink
                                :to="
                                    routerLinkI18n({
                                        name: 'ProductTarget',
                                        params: { id: product.id }
                                    })
                                "
                                class="theme-button"
                            >
                                {{ t('products-list-page.button-view') }}
                            </RouterLink>
                            <RouterLink
                                :to="
                                    routerLinkI18n({
                                        name: 'ProductEdit',
                                        params: { id: product.id }
                                    })
                                "
                                class="theme-button"
                            >
                                {{ t('products-list-page.button-edit') }}
                            </RouterLink>
                            <button
                                class="theme-button"
                                :disabled="loading"
                                @click.stop="handleDelete(product.id)"
                            >
                                {{ t('products-list-page.button-delete') }}
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
    name: 'ProductsListPage'
};
</script>

<script setup lang="ts">
import '../assets/styles/pages/productsList.scss';
import { onMounted, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useProductsStore } from '@/stores/products';

import LayoutDefault from '@/layouts/LayoutDefault.vue';
import ListPagination from '@/components/molecules/ListPagination.vue';

/**
 * Generics
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();

/**
 * Products store
 */
const { fetchPaginationProducts, deleteProduct } = useProductsStore();
const { pageItemList, selectedProductId, pageCurrent, pageTotal, pageSize, loading } =
    storeToRefs(useProductsStore());

/**
 * Initialize pagination
 */
pageSize.value = 10;

/**
 * Delete a product after confirmation
 */
const handleDelete = (productId: string) => {
    if (!confirm(t('products-list-page.confirm-delete'))) return;
    deleteProduct(productId)
        .then(() => addMessage(t('products-list-page.success-delete')))
        .catch(({ message }: { message: string }) => addMessage(message));
};

/**
 * Get products from API
 */
onMounted(() => fetchPaginationProducts(Math.max(1, pageCurrent.value), pageSize.value));

watch([pageCurrent, pageSize], ([currentPage, currentPageSize]) => {
    fetchPaginationProducts(Math.max(1, currentPage), currentPageSize);
});
</script>
