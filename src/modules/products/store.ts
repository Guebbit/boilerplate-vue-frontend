/**
 * @module
 * Pinia store for the products domain. Declares the CRUD/search endpoints once and lets
 * `useStructureCrudApi` derive dictionary, pagination, caching and optimistic-update state from
 * them, then layers on a hard-delete action and a facets read that the toolkit has no shape for.
 */
import { defineStore } from 'pinia';
import { useCoreStore, useStructureCrudApi } from '@guebbit/vue-toolkit';
import type { AxiosRequestConfig } from 'axios';

import { ref } from 'vue';
import { useServerPageTotal } from '@/ui/composables/use-server-page-total.ts';
import {
    listProducts,
    searchProducts,
    getCatalogueFacets,
    getProductById,
    getProductAdmin,
    createProduct as apiCreateProduct,
    createProductWithMultipart,
    updateProductById,
    updateProductByIdWithMultipart,
    deleteProductById,
    hardDeleteProductById
} from '@api';
import type {
    Product,
    ProductAdmin,
    CreateProductRequest,
    UpdateProductRequest,
    SearchProductsRequest
} from '@types';

/**
 * Search criteria for the products list, i.e. everything but pagination (which
 * is owned by the toolkit's search state).
 */
type ProductsFilters = Omit<SearchProductsRequest, 'page' | 'pageSize'>;

/**
 * `createProduct`'s payload: the JSON write body plus the optional file the form attaches.
 *
 * `translations` stays the JSON body's own shape (an object, not the multipart operation's
 * JSON-encoded string) — the store is where that encoding happens, once, on the branch that
 * actually needs it, rather than asking every caller to know two different wire shapes for the
 * same field.
 */
export type CreateProductData = CreateProductRequest & { imageUpload?: Blob };

/**
 * `updateProduct`'s payload — the merging `PATCH` body plus the optional replacement image. See
 * {@link CreateProductData} for why `translations` stays an object here too.
 */
export type UpdateProductData = UpdateProductRequest & { imageUpload?: Blob };

/**
 * Products CRUD, paginated search and image upload.
 *
 * The endpoints are declared once, up front, and `useStructureCrudApi` derives the whole store
 * from them — dictionary, filters, pagination, caching, optimistic updates and rollback included.
 */
export const useProductsStore = defineStore('products', () => {
    /**
     * Core store's shared loading-flag helpers, used to key this store's own loading state.
     */
    const { getLoading, setLoading } = useCoreStore();

    /**
     * The store's public surface, all derived from `useStructureCrudApi`: dictionary/list views,
     * selection, filters, pagination and the CRUD operations themselves.
     */
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
        // Local-only: counts whatever this store already holds, wrong for a server-paginated
        // search. Shadowed below by useServerPageTotal's, built from the response's own count.
        pageTotal: _localOnlyPageTotal,
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
        fetchAny,
        resetAll
    } = useStructureCrudApi<
        Product,
        string,
        ProductsFilters,
        CreateProductData,
        UpdateProductData,
        AxiosRequestConfig
    >(
        {
            list: () => listProducts().then((response) => response.data.items),

            search: (filters, page, pageSize) =>
                searchProducts({
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
                }).then((response) => {
                    captureTotal(response.data.meta.totalPages);
                    return response.data.items;
                }),

            get: (productId) => getProductById(productId).then((response) => response.data),

            // Multipart only when there is a file: a JSON body is cheaper and, more to the point,
            // the multipart endpoints are the only ones that have to parse a stream. Either way
            // `translations` is built by the caller as an object; JSON-encoding it into the one
            // multipart field that carries it happens here, not at every call site.
            create: ({ imageUpload, translations, ...productData }, options) =>
                (imageUpload
                    ? createProductWithMultipart(
                          {
                              ...productData,
                              translations: JSON.stringify(translations),
                              imageUpload
                          },
                          options
                      )
                    : apiCreateProduct({ ...productData, translations }, options)
                ).then((response) => response.data),

            update: (productId, { imageUpload, translations, ...productData }, options) =>
                (imageUpload
                    ? updateProductByIdWithMultipart(
                          productId,
                          {
                              ...productData,
                              // `translations` is OPTIONAL on a PATCH: omitting the field entirely
                              // means every locale is left alone, which is different from sending
                              // an empty map. JSON-encoding `undefined` would produce the string
                              // `"undefined"`, so the key itself is left off instead.
                              ...(translations !== undefined && {
                                  translations: JSON.stringify(translations)
                              }),
                              imageUpload
                          },
                          options
                      )
                    : updateProductById(
                          productId,
                          // Same omission as the multipart branch above: `translations: undefined`
                          // would still be a key ON the object, and axios serialises that key
                          // away only for a top-level `undefined` — inconsistent with the
                          // multipart branch and not worth relying on either way.
                          { ...productData, ...(translations !== undefined && { translations }) },
                          options
                      )
                ).then((response) => response.data),

            remove: (productId) => deleteProductById(productId),

            // Neither the uploaded Blob nor `translations` belongs in the optimistic patch: the
            // new `imageUrl` comes back from the API, and a product's rendered `title`/
            // `description` are resolved server-side from the fallback locale — this store has
            // no way to guess them ahead of the response, so they stay whatever they were until
            // the real one arrives.
            optimisticPatch: ({
                imageUpload: _uploaded,
                translations: _translations,
                ...productData
            }) => productData
        },
        {
            loadingKey: 'products',
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
     * `pageTotal` for `search`'s real, server-paginated results — `captureTotal` is called from
     * `search:` above, once its response's `meta.totalPages` is in.
     */
    const { pageTotal, captureTotal } = useServerPageTotal();

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
     * The admin record for one product: every language it has a row for, not just the caller's
     * resolved one — what `ProductEdit.vue` needs to populate its per-locale tabs.
     *
     * A plain ref rather than a `useStructureCrudApi` slice: `GET /products/{id}/admin` is
     * deliberately uncached — it's the screen someone is actively editing — so there is no
     * dictionary or TTL for it to share with the public read.
     *
     * @param productId - Which product.
     * @returns A promise resolving with the admin record.
     */
    const fetchProductAdmin = (productId: string): Promise<ProductAdmin | undefined> =>
        fetchAny(() => getProductAdmin(productId).then((response) => response.data));

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
        fetchProductAdmin,
        createProduct,
        updateProduct,
        deleteProduct,
        hardDeleteProduct,
        // Every cached record's `title`/`description` is resolved server-side against the
        // caller's language — the module manifest wires this into `localeSensitive`/
        // `resetOnLocaleChange`, so a language switch drops the dictionary instead of showing the
        // wrong language until something happens to refetch it.
        resetAll
    };
});
