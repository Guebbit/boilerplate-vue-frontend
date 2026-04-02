<template>
    <LayoutDefault id="product-target">
        <template #header>
            <h1 class="theme-page-title">
                <span>{{ t('product-target-page.page-title') }}</span>
            </h1>
        </template>

        <div class="theme-card animate-on-hover">
            <div class="card-content">
                <div v-if="currentProduct" class="product-details">
                    <table class="user-detail-table">
                        <tbody>
                            <tr>
                                <th>{{ t('product-target-page.label-id') }}</th>
                                <td>{{ currentProduct.id }}</td>
                            </tr>
                            <tr>
                                <th>{{ t('product-target-page.label-title') }}</th>
                                <td>{{ currentProduct.title }}</td>
                            </tr>
                            <tr>
                                <th>{{ t('product-target-page.label-price') }}</th>
                                <td>{{ currentProduct.price }}</td>
                            </tr>
                            <tr>
                                <th>{{ t('product-target-page.label-description') }}</th>
                                <td>{{ currentProduct.description || '-' }}</td>
                            </tr>
                            <tr>
                                <th>{{ t('product-target-page.label-active') }}</th>
                                <td>{{ currentProduct.active ? '✓' : '✗' }}</td>
                            </tr>
                            <tr v-if="currentProduct.createdAt">
                                <th>{{ t('product-target-page.label-created-at') }}</th>
                                <td>{{ new Date(currentProduct.createdAt).toLocaleString() }}</td>
                            </tr>
                            <tr v-if="currentProduct.updatedAt">
                                <th>{{ t('product-target-page.label-updated-at') }}</th>
                                <td>{{ new Date(currentProduct.updatedAt).toLocaleString() }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="product-target-actions">
            <RouterLink
                v-if="currentProduct"
                :to="routerLinkI18n({ name: 'ProductEdit', params: { id: currentProduct.id } })"
            >
                {{ t('product-target-page.button-go-to-edit') }}
            </RouterLink>
            <RouterLink
                :to="
                    routerLinkI18n({
                        name: 'ProductsList'
                    })
                "
            >
                {{ t('product-target-page.button-go-to-list') }}
            </RouterLink>
        </div>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'ProductTargetPage'
};
</script>

<script setup lang="ts">
import { onBeforeMount, defineProps } from 'vue';
import { RouterLink } from 'vue-router';
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useProductsStore } from '@/stores/products';

import LayoutDefault from '@/layouts/LayoutDefault.vue';

/**
 * Generics
 */
const { t } = useI18n();
const { id } = defineProps<{
    id?: string;
}>();

/**
 * Products store
 * The composable within will have most of the logic for this kind of pages
 */
const { fetchProduct } = useProductsStore();
const { currentProduct, selectedProductId } = storeToRefs(useProductsStore());

/**
 * Get product from API
 */
onBeforeMount(() => {
    if (!id) return;
    // Select the current product id so selectedRecord/currentProduct
    // will be populated when data is available
    selectedProductId.value = id;
    return fetchProduct(id);
});
</script>

<style lang="scss">
#product-target {
    .user-detail-table {
        width: 100%;
        border-collapse: collapse;

        th,
        td {
            padding: 10px 14px;
            text-align: left;
            border-bottom: 1px solid rgba(128, 128, 128, 0.2);
        }

        th {
            width: 40%;
            font-weight: 600;
            color: rgba(128, 128, 128, 0.8);
        }
    }

    .product-target-actions {
        display: flex;
        gap: 12px;
        margin-top: 16px;
    }
}
</style>
