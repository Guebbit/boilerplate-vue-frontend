import { defineStore } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useStructureRestApi } from '@/composables/structureRestApi.ts'
import {
    fetchProductByIdApi,
    fetchProductsAllApi,
} from '@/api'
import type { IProduct, IProductIdentification } from '@/types/products.ts'

export const useProductsStore = defineStore('products', () => {
    /**
     * Inherited
     */
    const { t } = useI18n()

    const {
        itemDictionary: products,
        itemList: productsList,
        selectedIdentifier: selectedProductId,
        selectedRecord: currentProduct,

        loading,
        fetchAll,
        fetchTarget,
    } = useStructureRestApi<IProduct, IProductIdentification>()

    /**
     *
     * @param forced
     */
    const fetchProducts = (forced = false) => {
        fetchAll(
            fetchProductsAllApi()
                .then(({ data }) => data),
            forced
        )
    }
    
    /**
     *
     * @param productId
     * @param forced
     */
    const fetchProduct = (productId: IProductIdentification, forced = false) =>
        fetchTarget(
            fetchProductByIdApi(productId)
                .then(({ data }) => data),
            productId,
            forced
        )


    return {
        products,
        productsList,
        selectedProductId,
        currentProduct,

        loading,
        fetchProducts,
        fetchProduct,
    }
})
