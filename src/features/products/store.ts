import { defineStore } from 'pinia';
import { useCoreStore, useStructureSearchApi } from '@guebbit/vue-toolkit';
import type { AxiosProgressEvent } from 'axios';
import { ref, type WatchSource } from 'vue';

import {
    listProducts,
    getProductById,
    createProduct as apiCreateProduct,
    updateProductById,
    deleteProductById
} from '@/utils/api.ts';
import httpClient from '@/utils/http.ts';
import { toMultipartFormData, withOptionalMultipartUpload } from '@/utils/multipart.ts';
import type {
    Product,
    CreateProductRequestMultipart,
    UpdateProductByIdRequestMultipart,
    SearchProductsRequest
} from '@types';

type IProductsFilters = Omit<SearchProductsRequest, 'page' | 'pageSize'>;

export const useProductsStore = defineStore('products', () => {
    const { getLoading, setLoading } = useCoreStore();

    /**
     * Current search filters. Owned by the store so `useStructureSearchApi`'s
     * search-scoped `pageItemList` and `watchSearch` stay bound to the same
     * source the list view mutates.
     */
    const filters = ref<IProductsFilters>({});

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
        watchSearch,
        fetchAny,
        fetchAll,
        fetchTarget,
        watchTarget,
        createTarget,
        updateTarget,
        deleteTarget
    } = useStructureSearchApi<Product, string, string | number, IProductsFilters>(
        () => filters.value,
        { getLoading, setLoading }
    );

    /**
     *
     * @param forced
     */
    const fetchProducts = (forced = false) =>
        fetchAll(() => listProducts().then((response) => response.data.items), {
            forced
        });

    /**
     * @param page
     * @param pageSize
     * @param forced
     */
    const fetchPaginationProducts = (page = 1, pageSize = 10, forced = false) =>
        fetchAny(() => listProducts({ page, pageSize }).then((response) => response.data.items), {
            forced
        });

    /**
     * Reactive filtered product search via GET /products, built on the toolkit's
     * `watchSearch`: fetches the current page immediately and re-fetches whenever
     * `pageCurrent`/`pageSize` change. Filters are read from the store's `filters`
     * on each run — mutate `filters` then call the returned `search()` to apply them.
     *
     * @param onError - notified on a failed search (immediate load, page change, or search())
     */
    const watchSearchProducts = (onError?: (error: unknown) => void) =>
        watchSearch(
            (currentFilters, page, pageSizeValue) =>
                listProducts({
                    page,
                    pageSize: pageSizeValue,
                    text: currentFilters.text,
                    productId: currentFilters.id,
                    minPrice: currentFilters.minPrice,
                    maxPrice: currentFilters.maxPrice
                }).then((response) => response.data.items),
            { onError: (error) => onError?.(error) }
        );

    /**
     *
     * @param productId
     * @param forced
     */
    const fetchProduct = (productId: string, forced = false) =>
        fetchTarget(() => getProductById(productId).then((response) => response.data), productId, {
            forced
        });

    /**
     * Reactive counterpart of fetchProduct: selects and (re)fetches the product
     * whenever idSource changes, including once immediately on setup.
     *
     * @param idSource
     */
    const watchProduct = (idSource: WatchSource<string | undefined | null>) =>
        watchTarget(idSource, (productId) =>
            getProductById(productId).then((response) => response.data)
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
                    httpClient.post<Product, Product>('/products', formData),
                sendJson: () =>
                    apiCreateProduct({
                        title: productData.title,
                        price: productData.price,
                        description: productData.description,
                        active: productData.active,
                        categories: productData.categories,
                        tags: productData.tags
                    }).then((response) => response.data)
            })
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
                httpClient.put<Product, Product>(
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
                ),
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
                            httpClient.put<Product, Product>(
                                `/products/${encodeURIComponent(productId)}`,
                                formData
                            ),
                        sendJson: () =>
                            updateProductById(productId, {
                                title: productData.title,
                                price: productData.price,
                                description: productData.description,
                                active: productData.active,
                                categories: productData.categories,
                                tags: productData.tags
                            }).then((response) => response.data)
                    }
                ),
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
        deleteTarget(() => deleteProductById(productId), productId);

    return {
        products,
        productsList,
        getProduct,
        addProduct,
        selectedProductId,
        currentProduct,

        filters,
        loading,
        pageCurrent,
        pageSize,
        pageTotal,
        pageItemList,
        fetchProducts,
        fetchPaginationProducts,
        watchSearchProducts,
        fetchProduct,
        watchProduct,
        createProduct,
        updateProduct,
        updateProductImage,
        deleteProduct
    };
});
