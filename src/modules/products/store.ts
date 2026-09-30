/**
 * @module
 * Pinia store for the products domain. Declares the CRUD/search endpoints once and lets
 * `useStructureCrudApi` derive dictionary, pagination, caching and optimistic-update state from
 * them, then layers on a hard-delete action and a facets read that the toolkit has no shape for.
 */
import { defineStore } from 'pinia';
import { useStructureCrudApi } from '@guebbit/vue-toolkit';
import type { AxiosRequestConfig } from 'axios';

import { ref } from 'vue';
import { omitNulls, uploadThenClear } from '@/infrastructure/utils/forms.ts';
import { queryClient } from '@/infrastructure/query-client.ts';
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
    hardDeleteProductById,
    restoreProductById
} from '@api';
import type {
    Product,
    ProductAdmin,
    CreateProductRequest,
    UpdateProductRequest,
    SearchProductsRequest,
    TaxClass,
    RateType
} from '@types';

/**
 * Search criteria for the products list, i.e. everything but pagination (which
 * is owned by the toolkit's search state).
 *
 * `id` stays a single string here — the filter box searches for one id — and is wrapped into the
 * one-element array `SearchProductsRequest.id` now requires, in `search:` below.
 */
type ProductsFilters = Omit<SearchProductsRequest, 'page' | 'pageSize' | 'id'> & { id?: string };

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
 *
 * `taxClass`/`rateType` are narrowed back to their enums: the contract's `nullable` wrapper around
 * a `$ref` (`type: string` keeps `null` valid under OpenAPI 3.0.3) generates a bare
 * `string | null`, which would let a caller send a value the API refuses.
 */
export type UpdateProductData = Omit<UpdateProductRequest, 'taxClass' | 'rateType'> & {
    taxClass?: TaxClass | null;
    rateType?: RateType | null;
    imageUpload?: Blob;
};

/**
 * How many ids one `POST /products/search` accepts — the contract's own cap on `id`.
 */
const SEARCH_ID_BATCH = 100;

/**
 * Splits ids into request-sized batches.
 *
 * @param ids - Every id still to fetch.
 * @returns Consecutive slices of at most {@link SEARCH_ID_BATCH}.
 */
const idBatches = (ids: string[]): string[][] =>
    Array.from({ length: Math.ceil(ids.length / SEARCH_ID_BATCH) }, (_, index) =>
        ids.slice(index * SEARCH_ID_BATCH, (index + 1) * SEARCH_ID_BATCH)
    );

/**
 * Products CRUD, paginated search and image upload.
 *
 * The endpoints are declared once, up front, and `useStructureCrudApi` derives the whole store
 * from them — dictionary, filters, pagination, caching, optimistic updates and rollback included.
 */
export const useProductsStore = defineStore('products', () => {
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
        fetchAny,
        fetchMultiple,
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
                    // POST /products/search body, and that is what the API reads. The API now
                    // reads a batch of ids; the filter box searches for one, so it's wrapped here.
                    id: filters.id ? [filters.id] : undefined,
                    minPrice: filters.minPrice,
                    maxPrice: filters.maxPrice,
                    category: filters.category,
                    tag: filters.tag,
                    // Admin-only (FE_PARITY_0924 P4): the public storefront's own search always
                    // forces `active: true` at the API regardless of what this sends — see
                    // `SearchProductsRequest.active`'s own doc in the contract.
                    active: filters.active,
                    deleted: filters.deleted
                }).then((response) => ({
                    items: response.data.items,
                    totalItems: response.data.meta.totalItems
                })),

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

            //
            // A save that uploads AND clears goes as two requests (`uploadThenClear`): a multipart
            // part cannot carry `null`, so the clears follow as a JSON PATCH.
            update: (productId, { imageUpload, translations, ...productData }, options) =>
                (imageUpload
                    ? uploadThenClear(
                          productData,
                          (rest) =>
                              updateProductByIdWithMultipart(
                                  productId,
                                  {
                                      ...rest,
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
                              ),
                          (clears) =>
                              updateProductById(productId, clears, { signal: options?.signal })
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
            //
            // `weight`/`imageUrl`/`taxClass`/`rateType`/`sku` accept `null` on the wire (clears the
            // field) but the LOCAL `Product` never does; `null` reads as "leave the optimistic
            // guess alone" here, same as omitting the field, since the real clear only takes
            // visible effect once the response the two lines above already wait for lands.
            optimisticPatch: ({
                imageUpload: _uploaded,
                translations: _translations,
                weight,
                imageUrl,
                taxClass,
                rateType,
                sku,
                ...productData
            }) => ({
                ...productData,
                ...omitNulls({ weight, imageUrl, taxClass, rateType, sku }, [
                    'weight',
                    'imageUrl',
                    'taxClass',
                    'rateType',
                    'sku'
                ])
            })
        },
        {
            resourceKey: 'products',
            queryClient,
            /**
             * Five minutes instead of the toolkit's one-hour default.
             *
             * Products are the one resource here that a visitor sees and an admin edits at the
             * same time: a price change made in the admin has to reach the public list in
             * something like minutes, not at the end of a session. Read-through is still instant
             * — an expired entry keeps rendering while the refetch runs — so the cost of the
             * shorter window is a background request, not a spinner.
             */
            staleTime: 5 * 60 * 1000
        }
    );

    /**
     * Permanently deletes a product, bypassing the soft delete.
     *
     * `deleteOne` leaves the record in place with `deletedAt` set, which an admin can still see
     * and restore; this removes it outright and cannot be undone. Distinct methods rather than a
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
     * Undoes a soft delete — `POST /products/{id}/restore`. A second `deleteProduct` never does:
     * DELETE is one-way on the API, and safe to retry. The restored record replaces the cached one.
     *
     * @param productId - Identifier of the product to restore.
     * @returns A promise resolving with the restored product.
     */
    const restoreProduct = (productId: string) =>
        fetchAny(() =>
            restoreProductById(productId).then((response) => {
                addProduct(response.data);
                return response.data;
            })
        );

    /**
     * The admin record for one product: every language it has a row for, not just the caller's
     * resolved one — what `ProductEdit.vue` needs to populate its per-locale tabs.
     *
     * A plain ref rather than a `useStructureCrudApi` slice: `GET /products/{id}/admin` is
     * deliberately uncached — it's the screen someone is actively editing — so there is no
     * dictionary or `staleTime` for it to share with the public read.
     *
     * @param productId - Which product.
     * @returns A promise resolving with the admin record.
     */
    const fetchProductAdmin = (productId: string): Promise<ProductAdmin | undefined> =>
        fetchAny(() => getProductAdmin(productId).then((response) => response.data));

    /**
     * Reads many products at once — the join a cart or wishlist needs for its lines, in one
     * request per {@link SEARCH_ID_BATCH} ids instead of one per line.
     *
     * Goes through the toolkit's `fetchMultiple`, so every record lands in the same
     * {@link products} dictionary the product page reads, and `forced` makes a cart opened
     * after a price change show the new price rather than a cached one. `pageSize` is set to
     * the batch length because the endpoint's default page is 10. An id the caller may not see
     * (deleted, inactive) is simply not answered: its slot comes back `undefined`.
     *
     * @param productIds - The products to load; duplicates are folded.
     * @returns A promise resolving with one entry per distinct id, `undefined` where none came back.
     */
    const fetchProductsByIds = (productIds: string[]) =>
        fetchMultiple(
            (missing) =>
                Promise.all(
                    idBatches(missing).map((batch) =>
                        searchProducts({ id: batch, page: 1, pageSize: batch.length }).then(
                            (response) => response.data.items
                        )
                    )
                ).then((batches) => batches.flat()),
            [...new Set(productIds)],
            { forced: true }
        );

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
        fetchProductsByIds,
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
        restoreProduct,
        /**
         * Forget everything a language switch invalidated: the cached records AND the cached
         * RESPONSES behind them.
         *
         * Every record's `title` and `description` were resolved server-side against the caller's
         * language, so after a switch both are wrong. Dropping the records alone is not enough —
         * the toolkit answers a repeat fetch from its own query cache while that entry is still
         * fresh, so the next read puts the old language straight back and no request is ever made.
         * `resetAll()` drops every entry of this resource under the current scope — records, lists
         * and searches alike.
         *
         * The module manifest wires this into `resetOnLocaleChange`, which
         * `src/app/guards/locale-choice.ts` runs once a switch has actually happened.
         */
        resetForLocaleChange: () => {
            resetAll();
        }
    };
});
