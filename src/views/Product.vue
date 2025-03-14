<template>
    <LayoutDefault id="product-target">
        <template #header>
            <h1 class="theme-page-title"><span>{{ t('product-target-page.page-title') }}</span></h1>
        </template>

        <div class="theme-card animate-on-hover">
            <div class="card-content">
                <pre>{{ currentProduct }}</pre>
            </div>
        </div>

        <div class="simple-card">
            <input type="file" id="fileInput" />
            <button class="simple-button" @click="emitUploadImage">Upload Image (TODO)</button>
        </div>


        <RouterLink
            :to="routerLinkI18n({
                name: 'ProductsList',
            })"
        >
            {{ t('product-target-page.button-go-to-list') }}
        </RouterLink>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'ProductTargetPage'
}
</script>

<script setup lang="ts">
import { onBeforeMount, defineProps } from 'vue'
import { RouterLink } from 'vue-router'
import { routerLinkI18n } from '@/utils/i18n.ts'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useProductsStore } from '@/stores/products'

import LayoutDefault from '@/layouts/LayoutDefault.vue'


/**
 * Generics
 */
const { t } = useI18n()
const { id } = defineProps<{
    id?: string
}>()


/**
 * Products store
 * The composable within will have most of the logic for this kind of pages
 */
const {
    fetchProduct,
    updateProductImage
} = useProductsStore()
const {
    currentProduct,
    selectedProductId
} = storeToRefs(useProductsStore())



function emitUploadImage() {
    const { files } = document.getElementById('fileInput') as HTMLInputElement
    if(!files || files.length === 0)
        return
    updateProductImage(0, files, ({ progress = 0 }) => {
        console.log("upload %", Math.round(progress * 100) + '%');
    })
}


/**
 * Get product from API
 */
onBeforeMount(() => {
    if (!id)
        return
    // Select the current product id so selectedRecord/currentProduct
    // will be populated when data is available
    selectedProductId.value = id
    return fetchProduct(id)
})
</script>