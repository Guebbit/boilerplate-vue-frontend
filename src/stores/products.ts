import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';

import { productsApi } from '@/utils/api.ts';
import type { Product } from '@/api';

export const useProductsStore = defineStore('products', () => {
    const {
        itemDictionary: products,
        itemList: productsList,
        selectedIdentifier: selectedProductId,
        selectedRecord: currentProduct,

        loading,
        fetchAll,
        fetchTarget
    } = useStructureRestApi<Product, string>();

    /**
     *
     * @param forced
     */
    const fetchProducts = (forced = false) =>
        fetchAll(
            () =>
                productsApi
                    .listProducts()
                    .then(({ data }) => (data as { items?: Product[] })?.items ?? []),
            { forced }
        );

    /**
     *
     * @param productId
     * @param forced
     */
    const fetchProduct = (productId: string, forced = false) =>
        fetchTarget(
            () => productsApi.getProductById(productId).then(({ data }) => data as Product),
            productId,
            { forced }
        );

    return {
        products,
        productsList,
        selectedProductId,
        currentProduct,

        loading,
        fetchProducts,
        fetchProduct
    };
});
