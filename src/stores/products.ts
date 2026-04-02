import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import type { AxiosProgressEvent } from 'axios';
import { useI18n } from 'vue-i18n';
import { z } from 'zod';

import { productsApi } from '@/utils/api.ts';
import type { Product, CreateProductRequest, UpdateProductByIdRequest, ProductsResponse } from '@types';

export const useProductsStore = defineStore('products', () => {
    const { t } = useI18n();

    const {
        itemDictionary: products,
        itemList: productsList,
        getRecord: getProduct,
        addRecord: addProduct,
        addRecords,
        selectedIdentifier: selectedProductId,
        selectedRecord: currentProduct,

        loading,
        pageCurrent,
        pageSize,
        pageTotal,
        pageItemList,
        fetchAny,
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
     * @param page
     * @param pageSize
     * @param forced
     */
    const fetchPaginationProducts = (page = 1, pageSize = 10, forced = false) =>
        fetchAny(
            () =>
                productsApi.listProducts(undefined, page, pageSize).then(({ data }) => {
                    const response = data as ProductsResponse;
                    addRecords(response.items ?? []);
                    return response;
                }),
            { forced, lastUpdateKey: `products_page_${page}_${pageSize}` }
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

    /**
     * Zod schema for product title
     */
    const zodSchemaProductsTitle = z.string().min(1, t('products-form.title-required'));

    /**
     * Zod schema for product price
     */
    const zodSchemaProductsPrice = z.number().min(0, t('products-form.price-min'));

    /**
     * Product schema
     */
    const zodSchemaProducts = z.object({
        id: z.string().nullish(),
        title: zodSchemaProductsTitle,
        price: zodSchemaProductsPrice,
        description: z.string().nullish(),
        active: z.boolean().nullish(),
        imageUrl: z.string().nullish(),
        createdAt: z.string().nullish(),
        updatedAt: z.string().nullish()
    });

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
        fetchPaginationProducts,
        fetchProduct,
        createProduct,
        updateProduct,
        updateProductImage,
        deleteProduct,

        zodSchemaProductsTitle,
        zodSchemaProductsPrice,
        zodSchemaProducts
    };
});
