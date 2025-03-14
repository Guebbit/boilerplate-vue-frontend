<template>
    <LayoutDefault id="products-list-page" class="item-list-page">
        <template #header>
            <h1 class="theme-page-title"><span>{{ t('products-list-page.page-title') }}</span></h1>
        </template>

        <div class="products-list">
            <div
                v-for="product in productsList"
                :key="'product-card-' + product.id"
                class="theme-card"
                :class="{
                    active: selectedIdentifier === product.id
                }"
                @click="selectedIdentifier = product.id"
            >
                <img
                    class="card-image"
                    :alt="product.name + ' photo'"
                    :src="product.imageUrl"
                />
                <div class="card-content">
                    <h2 class="card-title"><b>{{ product.id }}</b> {{ product.title }}</h2>
                    <p>{{ product.price }} - {{ product.description }}</p>
                    <RouterLink
                        :to="routerLinkI18n({
                            name: 'ProductTarget',
                            params: {
                                id: product.id,
                            }
                        })"
                    >
                        {{ t('products-list-page.button-go-to-details') }}
                    </RouterLink>
                </div>
            </div>
        </div>

    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'ProductsListPage'
}
</script>

<script setup lang="ts">
import "../assets/styles/pages/productsList.scss";
import { onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { routerLinkI18n } from '@/utils/i18n.ts';
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useProductsStore } from '@/stores/products';

import LayoutDefault from '@/layouts/LayoutDefault.vue'

/**
 * Generics
 */
const { t } = useI18n()

/**
 * Products store
 * The composable within will have most of the logic for this kind of pages
 */
const {
    fetchProducts,
} = useProductsStore();
const {
    productsList,
} = storeToRefs(useProductsStore());

/**
 * Get products from API
 */
onMounted(fetchProducts)
</script>
