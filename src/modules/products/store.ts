import { defineStore } from 'pinia';
import { useCoreStore, useStructureCrudApi } from '@guebbit/vue-toolkit';
import type { AxiosRequestConfig } from 'axios';

import { ref } from 'vue';
import {
    listProducts,
    getCatalogueFacets,
    getProductById,
    createProduct as apiCreateProduct,
    createProductWithMultipart,
    updateProductById,
    updateProductByIdWithMultipart,
    deleteProductById,
    hardDeleteProductById
} from '@api';
import type {
    Product,
    CreateProductRequestMultipart,
    UpdateProductByIdRequestMultipart,
    SearchProductsRequest
} from '@types';

/**
 * Search criteria for the products list, i.e. everything but pagination (which
 * is owned by the toolkit's search state).
 */
type IProductsFilters = Omit<SearchProductsRequest, 'page' | 'pageSize'>;

/**
 * Products CRUD, paginated search and image upload.
 *
 * The endpoints are declared once, up front, and `useStructureCrudApi` derives the whole store
 * from them — dictionary, filters, pagination, caching, optimistic updates and rollback included.
 */
export const useProductsStore = defineStore('products', () => {
    const { getLoading, setLoading } = useCoreStore();

    const {
        itemDictionary: products,
        itemList: productsList,
        addRecord: addProduct,
        selectedIdentifier: selectedProductId,
        selectedRecord: currentProduct,

        filters,
        loading,
        pageCurrent,
        pageSize,
        pageTotal,
        pageItemList,

        fetchList: fetchProducts,
        fetchPage: fetchPaginationProducts,
        watchList: watchSearchProducts,
        fetchOne: fetchProduct,
        watchOne: watchProduct,
        createOne: createProduct,
        updateOne: updateProduct,
        deleteOne: deleteProduct,
        deleteTarget,
        fetchAny
    } = useStructureCrudApi<
        Product,
        string,
        IProductsFilters,
        CreateProductRequestMultipart,
        UpdateProductByIdRequestMultipart,
        AxiosRequestConfig
    >(
        {
            list: () => listProducts().then((response) => response.data.items),

            search: (filters, page, pageSize) =>
                listProducts({
                    page,
                    pageSize,
                    text: filters.text,
                    // `id`, not `productId`: the spec names it `id` on both the GET query and the
                    // POST /products/search body, and that is what the API reads.
                    id: filters.id,
                    minPrice: filters.minPrice,
                    maxPrice: filters.maxPrice,
                    category: filters.category,
                    tag: filters.tag
                }).then((response) => response.data.items),

            get: (productId) => getProductById(productId).then((response) => response.data),

            // Multipart only when there is a file: a JSON body is cheaper and, more to the point,
            // the multipart endpoints are the only ones that have to parse a stream.
            create: ({ imageUpload, ...productData }, options) =>
                (imageUpload
                    ? createProductWithMultipart({ ...productData, imageUpload }, options)
                    : apiCreateProduct(productData, options)
                ).then((response) => response.data),

            update: (productId, { imageUpload, ...productData }, options) =>
                (imageUpload
                    ? updateProductByIdWithMultipart(
                          productId,
                          { ...productData, imageUpload },
                          options
                      )
                    : updateProductById(productId, productData, options)
                ).then((response) => response.data),

            remove: (productId) => deleteProductById(productId),

            // The new imageUrl comes back from the API, so the local patch must not carry the
            // Blob: parking one in store state would keep the preview on bytes already uploaded.
            optimisticPatch: ({ imageUpload: _uploaded, ...productData }) =>
                productData as Partial<Product>
        },
        {
            getLoading,
            setLoading,
            /**
             * Five minutes instead of the toolkit's one-hour default.
             *
             * Products are the one resource here that a visitor sees and an admin edits at the
             * same time: a price change made in the admin has to reach the public list in
             * something like minutes, not at the end of a session. Read-through is still instant
             * — an expired entry keeps rendering while the refetch runs — so the cost of the
             * shorter window is a background request, not a spinner.
             */
            TTL: 5 * 60 * 1000
        }
    );

    /**
     * Permanently deletes a product, bypassing the soft delete.
     *
     * `deleteOne` leaves the record in place with `deletedAt` set, which an admin can still see
     * and toggle back; this removes it outright and cannot be undone. Distinct methods rather than a
     * flag, so the irreversible one is never reached by passing the wrong boolean.
     *
     * Written against `deleteTarget` rather than declared as an operation because a resource has
     * one `remove`, and the reversible one is the right default for everything that is not this.
     *
     * @param productId - Identifier of the product to destroy.
     * @returns A promise resolving once the product is gone.
     */
    const hardDeleteProduct = (productId: string) =>
        deleteTarget(() => hardDeleteProductById(productId), productId);

    /**
     * The catalogue's filter chips: every public category and tag with its count. Fetched once
     * per visit to the listing — the API caches it under the products tag, so the counts follow
     * catalogue writes without this store having to know when they happen.
     */
    const facets = ref<{
        categories: { name: string; count: number }[];
        tags: { name: string; count: number }[];
    }>();

    /**
     * Loads the facets.
     *
     * @returns A promise resolving with them.
     */
    const fetchFacets = () =>
        fetchAny(() =>
            getCatalogueFacets().then((response) => {
                facets.value = response.data;
                return response.data;
            })
        );

    return {
        facets,
        fetchFacets,
        products,
        productsList,
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
        deleteProduct,
        hardDeleteProduct
    };
});
