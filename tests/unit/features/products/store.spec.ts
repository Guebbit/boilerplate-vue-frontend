/**
 * Unit tests for the products store.
 *
 * The CRUD wrappers are thin over `@guebbit/vue-toolkit`, so testing them would be testing the
 * toolkit. What is *this repo's* logic is the multipart branch: whether a call goes out as JSON
 * or as `FormData`, and how that `FormData` is built.
 *
 * `@api` is deliberately NOT mocked. The FormData encoding lives in the generated client
 * (orval's `splitByContentType` output), so mocking `@api` would assert only that the store
 * picked a function name and would stop covering the encoding itself. Mocking the transport
 * instead runs store → generated client → `orvalMutator` for real, and asserts the request that
 * actually goes on the wire: repeated `categories` rather than `categories[0]`, and unset
 * optional fields omitted rather than sent as the string `"undefined"`. Both are invisible to
 * TypeScript, and a regression in either sends a request the backend silently misreads.
 *
 * Each `it` RETURNS its chain rather than awaiting — vitest fails a test whose returned promise
 * rejects, so the assertions inside a `.then` are as binding as awaited ones.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useProductsStore } from '@/features/products/store';
import { orvalMutator } from '@/plugins/http';
import type { Product } from '@types';

vi.mock('@/plugins/http', () => ({
    orvalMutator: vi.fn(() => Promise.resolve({ data: { id: 'p1', title: 'T', price: 1 } }))
}));

/** The axios config handed to orvalMutator on its most recent call. */
const lastRequest = () => {
    const call = vi.mocked(orvalMutator).mock.calls.at(-1);
    if (!call) throw new Error('orvalMutator was never called');
    return call[0] as { url: string; method: string; data: unknown };
};

/** As above, asserting the body was multipart-encoded. */
const lastFormData = () => {
    const { data } = lastRequest();
    if (!(data instanceof FormData)) throw new Error('last request body was not FormData');
    return data;
};

const PRODUCT: Product = {
    id: 'p1',
    title: 'Gadget',
    price: 49.99,
    description: 'A gadget',
    imageUrl: 'https://example.com/g.jpg',
    categories: ['tools'],
    tags: ['new'],
    active: true
} as Product;

/** Makes the transport answer with a paginated envelope for this test. */
const respondWithItems = (items: unknown[]) =>
    vi.mocked(orvalMutator).mockResolvedValue({ data: { items } } as never);

/** The query parameters of the most recent request. */
const lastParameters = () =>
    (lastRequest() as unknown as { params: Record<string, unknown> }).params;

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

    /**
     * Read paths.
     *
     * The pagination/caching machinery belongs to the toolkit and is not re-tested here. What IS
     * this repo's logic is the request each wrapper builds and the envelope depth it unwraps:
     * list endpoints answer `{ data: { items } }` while single-record ones answer `{ data }`, and
     * `watchSearchProducts` sends `filters.id` as the `id` query parameter.
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
                        expect(lastRequest()).toMatchObject({
                            url: '/products',
                            method: 'GET',
                            params: { page: 1, pageSize: 10 }
                        });
                    });
            });

            it('passes an explicit page and size through', () => {
                respondWithItems([]);

                return useProductsStore()
                    .fetchPaginationProducts(3, 25)
                    .then(() => {
                        expect(lastRequest()).toMatchObject({
                            params: { page: 3, pageSize: 25 }
                        });
                    });
            });
        });

        describe('fetchProduct', () => {
            it('requests one product and unwraps a single-record envelope', () => {
                vi.mocked(orvalMutator).mockResolvedValue({ data: PRODUCT } as never);

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
            it('sends the store filters as query parameters, id included', () => {
                respondWithItems([]);
                const store = useProductsStore();
                store.filters = { text: 'gad', id: 'p1', minPrice: 5, maxPrice: 50 };

                return store
                    .watchSearchProducts()
                    .search()
                    .then(() => {
                        const parameters = lastParameters();
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
                    .watchSearchProducts(onError)
                    .search()
                    .catch(() => {})
                    .then(() => {
                        // The list view has no other way to learn the search failed — without
                        // this the page simply stops updating with no message.
                        expect(onError).toHaveBeenCalledWith(failure);
                    });
            });
        });
    });
});
