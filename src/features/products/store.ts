import { defineStore } from 'pinia';
import { useCoreStore, useStructureSearchApi } from '@guebbit/vue-toolkit';
import type { AxiosProgressEvent, AxiosRequestConfig } from 'axios';
import { ref, type WatchSource } from 'vue';

import {
    listProducts,
    getProductById,
    createProduct as apiCreateProduct,
    createProductWithMultipart,
    updateProductById,
    updateProductByIdWithMultipart,
    deleteProductById
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
 * Products CRUD, paginated search and image upload, on top of the toolkit's
 * search-API structure.
 */
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
     * Fetches every product into the store dictionary.
     *
     * @param forced - Bypass the cache and always hit the API.
     * @returns A promise resolving with the fetched products.
     */
    const fetchProducts = (forced = false) =>
        fetchAll(() => listProducts().then((response) => response.data.items), {
            forced
        });

    /**
     * Fetches a single page of products, without touching the shared search
     * state.
     *
     * @param page - 1-based page number. Defaults to `1`.
     * @param pageSize - Items per page. Defaults to `10`.
     * @param forced - Bypass the cache and always hit the API.
     * @returns A promise resolving with that page's products.
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
     * @param onError - Notified on a failed search (immediate load, page
     *  change, or an explicit `search()` call).
     * @returns The toolkit search handle, whose `search()` re-runs the query
     *  with the current {@link filters}.
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
     * Fetches a single product and selects it as the current one.
     *
     * @param productId - Identifier of the product to load.
     * @param forced - Bypass the cache and always hit the API.
     * @returns A promise resolving with the product.
     */
    const fetchProduct = (productId: string, forced = false) =>
        fetchTarget(() => getProductById(productId).then((response) => response.data), productId, {
            forced
        });

    /**
     * Reactive counterpart of `fetchProduct`: selects and (re)fetches the
     * product whenever the id changes, including once immediately on setup.
     *
     * @param idSource - Watch source yielding the product id; nullish values
     *  clear the selection.
     * @returns The toolkit watch handle (stop function + state).
     */
    const watchProduct = (idSource: WatchSource<string | undefined | null>) =>
        watchTarget(idSource, (productId) =>
            getProductById(productId).then((response) => response.data)
        );

    /**
     * Creates a product, as multipart when an image is attached and as plain
     * JSON otherwise.
     *
     * @param productData - Product fields, optionally including `imageUpload`.
     * @returns A promise resolving with the created product.
     */
    const createProduct = ({ imageUpload, ...productData }: CreateProductRequestMultipart) =>
        createTarget(() =>
            imageUpload
                ? createProductWithMultipart({ ...productData, imageUpload }).then(
                      (response) => response.data
                  )
                : apiCreateProduct(productData).then((response) => response.data)
        );

    /**
     * Updates a product, as multipart when a new image is attached and as plain
     * JSON otherwise.
     *
     * @param productId - Identifier of the product to update.
     * @param productData - Fields to change, optionally including `imageUpload`.
     * @param options - Per-call axios overrides, forwarded to `orvalMutator`.
     * @returns A promise resolving with the updated product.
     */
    const updateProduct = (
        productId: string,
        { imageUpload, ...productData }: UpdateProductByIdRequestMultipart,
        options?: AxiosRequestConfig
    ) =>
        updateTarget(
            () =>
                imageUpload
                    ? updateProductByIdWithMultipart(
                          productId,
                          { ...productData, imageUpload },
                          options
                      ).then((response) => response.data)
                    : updateProductById(productId, productData, options).then(
                          (response) => response.data
                      ),
            // `imageUpload` is deliberately excluded: the new imageUrl comes back
            // from the API, and parking a Blob in store state would be nonsense.
            productData as Partial<Product>,
            productId
        );

    /**
     * Replaces a product's image via multipart upload.
     *
     * The existing product record must be provided so the required title and
     * price fields can be forwarded alongside the new image file.
     *
     * Thin wrapper over {@link updateProduct} — the same `PUT /products/{id}`
     * with the same payload — adding only the file-picker handling and the
     * progress callback that a plain field update has no use for.
     *
     * @param product - Current product record, used to re-send mandatory fields.
     * @param files - Selected files; only the first is uploaded.
     * @param onUploadProgress - Axios progress callback, for a progress bar.
     * @returns A promise resolving with the updated product, rejected with a
     *  `no file selected` error when `files` is empty.
     */
    const updateProductImage = (
        product: Product,
        files: File[] | FileList = [],
        onUploadProgress?: (progressEvent: AxiosProgressEvent) => void
    ) => {
        if (files.length === 0 || !files[0]) return Promise.reject(new Error('no file selected'));
        return updateProduct(
            product.id,
            {
                title: product.title,
                price: product.price,
                description: product.description,
                active: product.active,
                categories: product.categories,
                tags: product.tags,
                imageUpload: files[0]
            },
            { onUploadProgress }
        );
    };

    /**
     * Deletes a product and drops it from the store.
     *
     * @param productId - Identifier of the product to delete.
     * @returns A promise resolving once the product is deleted.
     */
    const deleteProduct = (productId: string) =>
        deleteTarget(() => deleteProductById(productId), productId);

    return {
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
        updateProductImage,
        deleteProduct
    };
});
