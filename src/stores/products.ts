import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import type { AxiosProgressEvent } from 'axios';
import { useI18n } from 'vue-i18n';
import { z } from 'zod';

import { productsApi } from '@/utils/api.ts';
import httpClient from '@/utils/http.ts';
import {
    toMultipartFormData,
    unwrapApiPayload,
    withOptionalMultipartUpload
} from '@/utils/multipart.ts';
import type { IResponseSuccess } from '@/types';
import type {
    Product,
    CreateProductRequestMultipart,
    UpdateProductByIdRequestMultipart,
    SearchProductsRequest
} from '@types';

export const useProductsStore = defineStore('products', () => {
    const { t } = useI18n();
    const { getLoading, setLoading } = useCoreStore();
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
        fetchSearch,
        fetchAny,
        fetchAll,
        fetchTarget,
        createTarget,
        updateTarget,
        deleteTarget
    } = useStructureRestApi<Product, string>({ getLoading, setLoading });

    /**
     *
     * @param forced
     */
    const fetchProducts = (forced = false) =>
        fetchAll(() => productsApi.listProducts().then(({ data }) => data.items), {
            forced
        });

    /**
     * @param page
     * @param pageSize
     * @param forced
     */
    const fetchPaginationProducts = (page = 1, pageSize = 10, forced = false) =>
        fetchAny(() => productsApi.listProducts(page, pageSize).then(({ data }) => data.items), {
            forced
        });

    type IProductsFilters = Omit<SearchProductsRequest, 'page' | 'pageSize'>;

    /**
     * Fetches a filtered, paginated product list via GET /products.
     * Filters are passed as query parameters; SearchProductsRequest is still
     * used as the filter shape so callers stay type-safe.
     *
     * @param filters
     * @param page
     * @param pageSize
     * @param forced
     */
    const fetchSearchProducts = (
        filters: IProductsFilters = {},
        page = 1,
        pageSizeValue = 10,
        forced = false
    ) => {
        pageSize.value = pageSizeValue;
        return fetchSearch(
            () =>
                productsApi
                    .listProducts(
                        page,
                        pageSizeValue,
                        filters.text,
                        filters.id,
                        filters.minPrice,
                        filters.maxPrice
                    )
                    .then(({ data }) => data.items),
            filters,
            page,
            { forced }
        );
    };

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
    const createProduct = (productData: CreateProductRequestMultipart) =>
        createTarget(() =>
            withOptionalMultipartUpload<CreateProductRequestMultipart, Product>(productData, {
                sendMultipart: (formData) =>
                    httpClient.post<IResponseSuccess<Product>>('/products', formData),
                sendJson: () =>
                    productsApi.createProduct({
                        title: productData.title,
                        price: productData.price,
                        description: productData.description,
                        active: productData.active,
                        categories: productData.categories,
                        tags: productData.tags
                    })
            }).then((data) => data as Product)
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
                httpClient
                    .put<IResponseSuccess<Product>>(
                        `/products/${encodeURIComponent(product.id)}`,
                        toMultipartFormData({
                            title: product.title,
                            price: product.price,
                            description: product.description,
                            active: product.active,
                            categories: product.categories,
                            tags: product.tags,
                            imageUpload: files[0]
                        }),
                        { onUploadProgress }
                    )
                    .then((response) => unwrapApiPayload<Product>(response))
                    .then((data) => data as Product),
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
    const updateProduct = (productId: string, productData: UpdateProductByIdRequestMultipart) =>
        updateTarget(
            () =>
                withOptionalMultipartUpload<UpdateProductByIdRequestMultipart, Product>(
                    productData,
                    {
                        sendMultipart: (formData) =>
                            httpClient.put<IResponseSuccess<Product>>(
                                `/products/${encodeURIComponent(productId)}`,
                                formData
                            ),
                        sendJson: () =>
                            productsApi.updateProductById(productId, {
                                title: productData.title,
                                price: productData.price,
                                description: productData.description,
                                active: productData.active,
                                categories: productData.categories,
                                tags: productData.tags
                            })
                    }
                ).then((data) => data as Product),
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
        fetchSearchProducts,
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
