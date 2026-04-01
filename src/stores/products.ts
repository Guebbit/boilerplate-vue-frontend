import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import type { AxiosProgressEvent } from 'axios';

import { productsApi } from '@/utils/api.ts';
import type { Product, CreateProductRequest, UpdateProductByIdRequest } from '../../api';

export const useProductsStore = defineStore('products', () => {
    const {
        itemDictionary: products,
        itemList: productsList,
        getRecord: getProduct,
        addRecord: addProduct,
        selectedIdentifier: selectedProductId,
        selectedRecord: currentProduct,

        loading,
        pageCurrent,
        pageSize,
        pageTotal,
        pageItemList,
        fetchAll,
        fetchTarget,
        createTarget,
        updateTarget,
        deleteTarget
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

    /**
     * Create a new product.
     *
     *
     * @param productData
     */
    const createProduct = (productData: CreateProductRequest) =>
        createTarget(() =>
            productsApi
                .createProduct(productData.title, productData.price, productData.description, productData.active)
                .then(({ data }) => data as Product)
        );

    /**
     * Change product image via multipart upload.
     * The existing product record must be provided so that the required title
     * and price fields can be forwarded alongside the new image file.
     *
     * @param product
     * @param files
     * @param onUploadProgress
     */
    const updateProductImage = (
        product: Product,
        files: File[] | FileList = [],
        onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
    ) => {
        if (files.length === 0 || !files[0]) return Promise.reject(new Error('no file selected'));
        return updateTarget(
            () =>
                productsApi
                    .updateProductById(product.id, product.title, product.price, product.description, product.active, files[0], { onUploadProgress })
                    .then(({ data }) => data as Product),
            {} as Partial<Product>,
            product.id
        );
    };

    /**
     * Update an existing product by ID.
     *
     *
     * @param productId
     * @param productData
     */
    const updateProduct = (productId: string, productData: UpdateProductByIdRequest) =>
        updateTarget(
            () =>
                productsApi
                    .updateProductById(productId, productData.title, productData.price, productData.description, productData.active)
                    .then(({ data }) => data as Product),
            productData as Partial<Product>,
            productId
        );

    /**
     * Delete a product by ID.
     *
     *
     * @param productId
     */
    const deleteProduct = (productId: string) =>
        deleteTarget(() => productsApi.deleteProductById(productId), productId);

    return {
        products,
        productsList,
        getProduct,
        addProduct,
        selectedProductId,
        currentProduct,

        loading,
        pageCurrent,
        pageSize,
        pageTotal,
        pageItemList,
        fetchProducts,
        fetchProduct,
        createProduct,
        updateProduct,
        updateProductImage,
        deleteProduct
    };
});
