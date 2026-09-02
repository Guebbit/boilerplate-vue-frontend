/**
 * @module
 * Unit coverage of the products store's own logic: which branch a create/update call takes (JSON
 * vs multipart) and how the request is shaped. The CRUD wrappers are thin over
 * `@guebbit/vue-toolkit`, so testing them would be testing the toolkit — the multipart branch is
 * what's actually this repo's logic.
 *
 * `@api` is deliberately NOT mocked, since the FormData encoding lives in the generated client;
 * mocking the transport instead runs store → generated client → `orvalMutator` for real, and
 * asserts the request that actually goes on the wire — both `categories` repetition and unset
 * optional fields are invisible to TypeScript, and a regression in either sends a request the
 * backend silently misreads. Each `it` RETURNS its chain rather than awaiting, so the assertions
 * inside a `.then` are as binding as awaited ones.
 */
import { asStub } from '../../../../tests/support/stub';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useProductsStore } from '@/modules/products/store';
import { orvalMutator } from '@/infrastructure/http';
import type { Product } from '@types';

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn(() => Promise.resolve({ data: { id: 'p1', title: 'T', price: 1 } }))
}));

/**
 * The axios config handed to orvalMutator on its most recent call.
 */
const lastRequest = () => {
    const call = vi.mocked(orvalMutator).mock.calls.at(-1);
    if (!call) throw new Error('orvalMutator was never called');
    return call[0] as { url: string; method: string; data: unknown };
};

/**
 * As above, asserting the body was multipart-encoded.
 */
const lastFormData = () => {
    const { data } = lastRequest();
    if (!(data instanceof FormData)) throw new Error('last request body was not FormData');
    return data;
};

/**
 * A fully populated product, used as seed state for the optimistic-update tests.
 */
const PRODUCT: Product = {
    id: 'p1',
    title: 'Gadget',
    price: 49.99,
    description: 'A gadget',
    imageUrl: 'https://example.com/g.jpg',
    categories: ['tools'],
    tags: ['new'],
    active: true
};

/**
 * Makes the transport answer with a paginated envelope for this test. `meta` matches the real
 * `PaginationMeta` shape — `search:` (`store.ts`) reads `meta.totalPages` for `pageTotal`, so an
 * envelope without one no longer represents a real response.
 */
const respondWithItems = (items: unknown[]) =>
    vi.mocked(orvalMutator).mockResolvedValue({
        data: { items, meta: { page: 1, pageSize: 10, totalItems: items.length, totalPages: 1 } }
    });

/**
 * The query parameters of the most recent request.
 */
/**
 * The JSON body of the most recent request — what `POST /products/search` reads.
 */
const lastBody = () => asStub<{ data: Record<string, unknown> }>(lastRequest()).data;

describe('useProductsStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    describe('createProduct', () => {
        it('posts JSON when no image is attached', () =>
            useProductsStore()
                .createProduct({ title: 'Gadget', price: 49.99 })
                .then(() => {
                    const request = lastRequest();
                    expect(request).toMatchObject({ url: '/products', method: 'POST' });
                    expect(request.data).not.toBeInstanceOf(FormData);
                    expect(request.data).toMatchObject({ title: 'Gadget', price: 49.99 });
                }));

        it('resolves with the created product, not with the envelope', () =>
            useProductsStore()
                .createProduct({ title: 'Gadget', price: 49.99 })
                .then((created) => {
                    // `ProductCreate.vue` routes to `/products/${created.id}` on success, so a
                    // wrapper that forgot to unwrap `response.data` would navigate to
                    // `/products/undefined` rather than fail visibly here.
                    expect(created).toEqual({ id: 'p1', title: 'T', price: 1 });
                }));

        it('posts multipart to /products when an image is attached', () =>
            useProductsStore()
                .createProduct({ title: 'Gadget', price: 49.99, imageUpload: new Blob(['x']) })
                .then(() => {
                    expect(lastRequest()).toMatchObject({ url: '/products', method: 'POST' });
                    expect(lastFormData().get('title')).toBe('Gadget');
                }));

        it('sends a Blob image, not only a File', () =>
            // The contract types the field as Blob, and encoders that recurse into anything that
            // is not a File (axios' `toFormData` among them) drop a plain Blob silently.
            useProductsStore()
                .createProduct({ title: 'Gadget', price: 49.99, imageUpload: new Blob(['x']) })
                .then(() => {
                    expect(lastFormData().get('imageUpload')).toBeInstanceOf(Blob);
                }));

        it('sends categories and tags as repeated fields, not indexed keys', () =>
            useProductsStore()
                .createProduct({
                    title: 'Gadget',
                    price: 49.99,
                    categories: ['tools', 'home'],
                    tags: ['new'],
                    imageUpload: new Blob(['x'])
                })
                .then(() => {
                    const formData = lastFormData();
                    expect(formData.getAll('categories')).toEqual(['tools', 'home']);
                    expect(formData.getAll('tags')).toEqual(['new']);
                    expect([...formData.keys()]).not.toContain('categories[0]');
                }));

        it('omits unset optional fields instead of sending the string "undefined"', () =>
            useProductsStore()
                .createProduct({
                    title: 'Gadget',
                    price: 49.99,
                    description: undefined,
                    imageUpload: new Blob(['x'])
                })
                .then(() => {
                    const formData = lastFormData();
                    expect(formData.has('description')).toBe(false);
                    expect([...formData.values()]).not.toContain('undefined');
                }));

        /**
         * `ProductCreate.vue` passes `onUploadProgress` through the second argument to drive its
         * progress bar. `createProduct` had no `options` parameter until that view existed.
         */
        it('forwards the upload progress callback to the transport', () => {
            const onUploadProgress = vi.fn();

            return useProductsStore()
                .createProduct(
                    { title: 'Gadget', price: 49.99, imageUpload: new Blob(['x']) },
                    { onUploadProgress }
                )
                .then(() => {
                    expect(orvalMutator).toHaveBeenCalledWith(
                        expect.anything(),
                        expect.objectContaining({ onUploadProgress })
                    );
                });
        });
    });

    describe('updateProduct', () => {
        it('puts JSON when no new image is attached', () =>
            useProductsStore()
                .updateProduct('p1', { title: 'Renamed', price: 9.99 })
                .then(() => {
                    const request = lastRequest();
                    expect(request).toMatchObject({ url: '/products/p1', method: 'PUT' });
                    expect(request.data).not.toBeInstanceOf(FormData);
                    expect(request.data).toMatchObject({ title: 'Renamed' });
                }));

        it('puts multipart when an image is attached', () =>
            useProductsStore()
                .updateProduct('p1', {
                    title: 'Renamed',
                    price: 9.99,
                    imageUpload: new Blob(['x'])
                })
                .then(() => {
                    expect(lastRequest()).toMatchObject({ url: '/products/p1', method: 'PUT' });
                    expect(lastFormData().get('title')).toBe('Renamed');
                }));

        /**
         * The other half of `optimisticPatch`, and the half the Blob test cannot see: an
         * implementation that patched NOTHING would also leave no `imageUpload` behind. What
         * makes the patch worth having is that the edited row shows the new title while the
         * request is still in flight.
         */
        it('shows the edited fields before the response arrives', () => {
            const store = useProductsStore();
            store.addProduct(PRODUCT);

            // `Once`, deliberately: the suite's `beforeEach` calls `vi.clearAllMocks()`, which
            // clears recorded calls but NOT an implementation set with `mockReturnValue`. A
            // persistent override here would hand every later test this same settled promise.
            let release!: (value: unknown) => void;
            const transportResponse = new Promise((resolve) => {
                release = resolve;
            });
            vi.mocked(orvalMutator).mockImplementationOnce(() => transportResponse);

            const pending = store.updateProduct('p1', {
                title: 'Renamed',
                price: 9.99,
                imageUpload: new Blob(['x'])
            });

            // `waitFor` rather than a counted number of microtasks: the toolkit awaits
            // `cancelQueries()` before writing the optimistic record, so how many ticks that
            // takes is TanStack's business and not something this test should encode. The
            // request is still unresolved throughout — `release` has not been called yet — so
            // this can only pass if the store was patched ahead of the response.
            return vi
                .waitFor(() => {
                    expect(store.products.p1.title).toBe('Renamed');
                })
                .then(() => {
                    expect(store.products.p1).not.toHaveProperty('imageUpload');
                    release({ data: { ...PRODUCT, title: 'Renamed' } });
                    return pending;
                })
                .then(() => {
                    expect(store.products.p1.title).toBe('Renamed');
                });
        });

        it('never parks the uploaded Blob in store state', () => {
            const store = useProductsStore();
            store.addProduct(PRODUCT);

            return store
                .updateProduct('p1', {
                    title: 'Renamed',
                    price: 9.99,
                    imageUpload: new Blob(['x'])
                })
                .then(() => {
                    expect(store.products.p1).not.toHaveProperty('imageUpload');
                });
        });

        /**
         * The reason `orvalMutator` takes a second argument at all — `ProductEdit.vue` passes
         * `onUploadProgress` through it to drive its progress bar.
         */
        it('forwards the upload progress callback to the transport', () => {
            const onUploadProgress = vi.fn();

            return useProductsStore()
                .updateProduct(
                    'p1',
                    { title: 'Renamed', price: 9.99, imageUpload: new Blob(['x']) },
                    { onUploadProgress }
                )
                .then(() => {
                    expect(orvalMutator).toHaveBeenCalledWith(
                        expect.anything(),
                        expect.objectContaining({ onUploadProgress })
                    );
                });
        });
    });

    describe('deleteProduct', () => {
        it('calls the delete endpoint with the product id', () =>
            useProductsStore()
                .deleteProduct('p1')
                .then(() => {
                    expect(lastRequest()).toMatchObject({
                        url: '/products/p1',
                        method: 'DELETE'
                    });
                }));
    });

    describe('hardDeleteProduct', () => {
        /*
         * A separate method rather than a flag on `deleteProduct`, because the two are not the same
         * operation: the soft form sets `deletedAt` and an admin can toggle it back, this one is
         * irreversible. Distinct names mean the destructive path cannot be reached by passing the
         * wrong boolean — so what is worth pinning is that it hits the `/hard` URL and nothing else.
         */
        it('calls the /hard endpoint with the product id', () =>
            useProductsStore()
                .hardDeleteProduct('p1')
                .then(() => {
                    expect(lastRequest()).toMatchObject({
                        url: '/products/p1/hard',
                        method: 'DELETE'
                    });
                }));

        it('is a different URL from the soft delete', () =>
            useProductsStore()
                .deleteProduct('p1')
                .then(() => {
                    const soft = lastRequest()?.url;
                    return useProductsStore()
                        .hardDeleteProduct('p1')
                        .then(() => {
                            expect(lastRequest()?.url).not.toBe(soft);
                        });
                }));
    });

    /**
     * Read paths.
     *
     * The pagination/caching machinery belongs to the toolkit and is not re-tested here. What IS
     * this repo's logic is the request each wrapper builds and the envelope depth it unwraps:
     * list endpoints answer `{ data: { items } }` while single-record ones answer `{ data }`, and
     * `watchSearchProducts` posts `filters.id` as `id` in the `/products/search` body.
     *
     * That last one is worth pinning: `id` is the name the API reads, on both the GET query and
     * the `POST /products/search` body, and getting it wrong is invisible to TypeScript — every
     * candidate name is `string | undefined` — so it shows up only as a filter that appears to
     * work and returns the unfiltered catalogue.
     */
    describe('read paths', () => {
        describe('fetchProducts', () => {
            it('requests the collection and unwraps the paginated envelope', () => {
                respondWithItems([PRODUCT]);

                return useProductsStore()
                    .fetchProducts()
                    .then((result) => {
                        expect(lastRequest()).toMatchObject({ url: '/products', method: 'GET' });
                        // `.data.items`, not `.data` — one level too shallow yields the envelope
                        // itself, which renders as an empty list rather than as an error.
                        expect(result).toEqual([PRODUCT]);
                    });
            });
        });

        describe('fetchPaginationProducts', () => {
            it('defaults to the first page of ten', () => {
                respondWithItems([]);

                return useProductsStore()
                    .fetchPaginationProducts()
                    .then(() => {
                        // A paged read IS a search with no filters, so it rides the search route.
                        expect(lastRequest()).toMatchObject({
                            url: '/products/search',
                            method: 'POST',
                            data: { page: 1, pageSize: 10 }
                        });
                    });
            });

            it('passes an explicit page and size through', () => {
                respondWithItems([]);

                return useProductsStore()
                    .fetchPaginationProducts(3, 25)
                    .then(() => {
                        expect(lastRequest()).toMatchObject({
                            data: { page: 3, pageSize: 25 }
                        });
                    });
            });
        });

        describe('fetchProduct', () => {
            it('requests one product and unwraps a single-record envelope', () => {
                vi.mocked(orvalMutator).mockResolvedValue({ data: PRODUCT });

                return useProductsStore()
                    .fetchProduct('p1')
                    .then((result) => {
                        expect(lastRequest()).toMatchObject({
                            url: '/products/p1',
                            method: 'GET'
                        });
                        // One level shallower than the list case, deliberately.
                        expect(result).toEqual(PRODUCT);
                    });
            });
        });

        describe('watchSearchProducts', () => {
            it('posts the store filters to /products/search, id included', () => {
                respondWithItems([]);
                const store = useProductsStore();
                store.filters = { text: 'gad', id: 'p1', minPrice: 5, maxPrice: 50 };

                return store
                    .watchSearchProducts()
                    .search()
                    .then(() => {
                        // The SEARCH endpoint, not the list one: the list page filters through
                        // the DTO route the contract provides for exactly this.
                        expect(lastRequest()).toMatchObject({
                            url: '/products/search',
                            method: 'POST'
                        });
                        const parameters = lastBody();
                        expect(parameters).toMatchObject({
                            text: 'gad',
                            // `id`, the name the API actually reads; `productId` filters nothing.
                            id: 'p1',
                            minPrice: 5,
                            maxPrice: 50
                        });
                        expect(parameters.productId).toBeUndefined();
                    });
            });

            it('reports a failed search to the supplied error handler', () => {
                const failure = new Error('network down');
                vi.mocked(orvalMutator).mockRejectedValue(failure);
                const onError = vi.fn();

                return useProductsStore()
                    .watchSearchProducts({ onError })
                    .search()
                    .catch(() => {})
                    .then(() => {
                        // The list view has no other way to learn the search failed — without
                        // this the page simply stops updating with no message.
                        expect(onError).toHaveBeenCalledWith(failure, expect.anything());
                    });
            });
        });

        describe('fetchFacets', () => {
            const FACETS = {
                categories: [{ name: 'tools', count: 3 }],
                tags: [{ name: 'new', count: 1 }]
            };

            it('parks the facets on the store and resolves with them', () => {
                vi.mocked(orvalMutator).mockResolvedValue({ data: FACETS });
                const store = useProductsStore();

                return store.fetchFacets().then((result) => {
                    expect(lastRequest()).toMatchObject({
                        url: '/products/categories',
                        method: 'GET'
                    });
                    // Both halves matter: the view reads `store.facets` to render the chips, and
                    // the caller reads the return value. An implementation that only did one of
                    // the two would leave either the chips empty or the caller with `undefined`.
                    expect(store.facets).toEqual(FACETS);
                    expect(result).toEqual(FACETS);
                });
            });
        });
    });

    /*
     * There is deliberately NO test for the five-minute `TTL`.
     *
     * It is one number handed to `useStructureCrudApi`, and the only way to observe it is to drive
     * the toolkit's cache: fetch twice and count requests, or move the clock and count again. Both
     * assert that TanStack Query's `staleTime` works, which is TanStack's suite's job and not this
     * one's — the same rule stated at the top of this file for the CRUD wrappers.
     *
     * The consequence is on the record rather than worked around: Stryker's mutants on that
     * expression (`5 * 60 / 1000`, `5 / 60`) and on the options object around it survive, and they
     * should. A mutant in a value passed straight to a dependency is not this repo's to kill, and
     * writing a toolkit test to move a score is how the score stops meaning anything.
     */

    /**
     * Pinia identifies a store by the string passed to `defineStore`, and that string is also the
     * key devtools and any persistence plugin use. Nothing else in the suite would notice it
     * changing, because every test reaches the store through `useProductsStore()`.
     */
    it('is registered under the "products" id', () => {
        expect(useProductsStore().$id).toBe('products');
    });
});
