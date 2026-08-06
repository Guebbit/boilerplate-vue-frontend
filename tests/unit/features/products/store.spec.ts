/**
 * Unit tests for the products store.
 *
 * The CRUD wrappers are thin over `@guebbit/vue-toolkit`, so testing them would be testing the
 * toolkit. What is *this repo's* logic is the multipart branch: whether a call goes out as JSON
 * or as `FormData`, and how that `FormData` is built.
 *
 * `@api` is deliberately NOT mocked. The FormData encoding lives in the generated client now
 * (orval's `splitByContentType` output), so mocking `@api` would assert only that the store
 * picked a function name and would stop covering the encoding itself. Mocking the transport
 * instead runs store → generated client → `orvalMutator` for real, and asserts the request that
 * actually goes on the wire: repeated `categories` rather than `categories[0]`, and unset
 * optional fields omitted rather than sent as the string `"undefined"`. Both are invisible to
 * TypeScript, and a regression in either sends a request the backend silently misreads.
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

describe('useProductsStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    describe('createProduct', () => {
        it('posts JSON when no image is attached', async () => {
            const store = useProductsStore();
            await store.createProduct({ title: 'Gadget', price: 49.99 });

            const request = lastRequest();
            expect(request).toMatchObject({ url: '/products', method: 'POST' });
            expect(request.data).not.toBeInstanceOf(FormData);
            expect(request.data).toMatchObject({ title: 'Gadget', price: 49.99 });
        });

        it('posts multipart to /products when an image is attached', async () => {
            const store = useProductsStore();
            await store.createProduct({
                title: 'Gadget',
                price: 49.99,
                imageUpload: new Blob(['x'])
            });

            expect(lastRequest()).toMatchObject({ url: '/products', method: 'POST' });
            expect(lastFormData().get('title')).toBe('Gadget');
        });

        it('sends a Blob image, not only a File', async () => {
            // toFormData, which this store used to call, recursed into anything that was not a
            // File and silently dropped a plain Blob. The contract types the field as Blob.
            const store = useProductsStore();
            await store.createProduct({
                title: 'Gadget',
                price: 49.99,
                imageUpload: new Blob(['x'])
            });

            expect(lastFormData().get('imageUpload')).toBeInstanceOf(Blob);
        });

        it('sends categories and tags as repeated fields, not indexed keys', async () => {
            const store = useProductsStore();
            await store.createProduct({
                title: 'Gadget',
                price: 49.99,
                categories: ['tools', 'home'],
                tags: ['new'],
                imageUpload: new Blob(['x'])
            });

            const formData = lastFormData();
            expect(formData.getAll('categories')).toEqual(['tools', 'home']);
            expect(formData.getAll('tags')).toEqual(['new']);
            expect([...formData.keys()]).not.toContain('categories[0]');
        });

        it('omits unset optional fields instead of sending the string "undefined"', async () => {
            const store = useProductsStore();
            await store.createProduct({
                title: 'Gadget',
                price: 49.99,
                description: undefined,
                imageUpload: new Blob(['x'])
            });

            const formData = lastFormData();
            expect(formData.has('description')).toBe(false);
            expect([...formData.values()]).not.toContain('undefined');
        });
    });

    describe('updateProduct', () => {
        it('puts JSON when no new image is attached', async () => {
            const store = useProductsStore();
            await store.updateProduct('p1', { title: 'Renamed', price: 9.99 });

            const request = lastRequest();
            expect(request).toMatchObject({ url: '/products/p1', method: 'PUT' });
            expect(request.data).not.toBeInstanceOf(FormData);
            expect(request.data).toMatchObject({ title: 'Renamed' });
        });

        it('puts multipart when an image is attached', async () => {
            const store = useProductsStore();
            await store.updateProduct('p1', {
                title: 'Renamed',
                price: 9.99,
                imageUpload: new Blob(['x'])
            });

            expect(lastRequest()).toMatchObject({ url: '/products/p1', method: 'PUT' });
            expect(lastFormData().get('title')).toBe('Renamed');
        });

        it('never parks the uploaded Blob in store state', async () => {
            const store = useProductsStore();
            store.addProduct(PRODUCT);

            await store.updateProduct('p1', {
                title: 'Renamed',
                price: 9.99,
                imageUpload: new Blob(['x'])
            });

            expect(store.products.p1).not.toHaveProperty('imageUpload');
        });
    });

    describe('updateProductImage', () => {
        it('rejects without calling the API when no file is selected', async () => {
            const store = useProductsStore();

            await expect(store.updateProductImage(PRODUCT, [])).rejects.toThrow('no file selected');
            expect(orvalMutator).not.toHaveBeenCalled();
        });

        it('re-sends the mandatory product fields alongside the new file', async () => {
            const store = useProductsStore();
            const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });

            await store.updateProductImage(PRODUCT, [file]);

            const formData = lastFormData();
            expect(formData.get('title')).toBe('Gadget');
            expect(formData.get('price')).toBe('49.99');
            expect(formData.get('imageUpload')).toBeInstanceOf(File);
            expect(formData.getAll('categories')).toEqual(['tools']);
        });

        it('forwards the upload progress callback to the transport', async () => {
            const store = useProductsStore();
            const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
            const onUploadProgress = vi.fn();

            await store.updateProductImage(PRODUCT, [file], onUploadProgress);

            // Second argument: orval passes the caller's `options` through to the mutator.
            expect(orvalMutator).toHaveBeenCalledWith(
                expect.anything(),
                expect.objectContaining({ onUploadProgress })
            );
        });

        it('uploads only the first file when several are selected', async () => {
            const store = useProductsStore();
            const first = new File(['a'], 'first.jpg');
            const second = new File(['b'], 'second.jpg');

            await store.updateProductImage(PRODUCT, [first, second]);

            expect(lastFormData().getAll('imageUpload')).toHaveLength(1);
        });
    });

    describe('deleteProduct', () => {
        it('calls the delete endpoint with the product id', async () => {
            const store = useProductsStore();
            await store.deleteProduct('p1');

            expect(lastRequest()).toMatchObject({ url: '/products/p1', method: 'DELETE' });
        });
    });

    /**
     * Read paths.
     *
     * The pagination/caching machinery belongs to the toolkit and is not re-tested here. What IS
     * this repo's logic is the request each wrapper builds and the envelope depth it unwraps:
     * list endpoints answer `{ data: { items } }` while single-record ones answer `{ data }`, and
     * `watchSearchProducts` *renames* `filters.id` to the `productId` query parameter. That
     * rename is invisible to TypeScript (both are `string | undefined`) and silently returns the
     * unfiltered catalogue if it regresses — a filter that appears to work but does nothing.
     */
    describe('read paths', () => {
        describe('fetchProducts', () => {
            it('requests the collection and unwraps the paginated envelope', async () => {
                respondWithItems([PRODUCT]);
                const store = useProductsStore();

                const result = await store.fetchProducts();

                expect(lastRequest()).toMatchObject({ url: '/products', method: 'GET' });
                // `.data.items`, not `.data` — one level too shallow yields the envelope itself,
                // which renders as an empty list rather than as an error.
                expect(result).toEqual([PRODUCT]);
            });
        });

        describe('fetchPaginationProducts', () => {
            it('defaults to the first page of ten', async () => {
                respondWithItems([]);
                const store = useProductsStore();

                await store.fetchPaginationProducts();

                expect(lastRequest()).toMatchObject({
                    url: '/products',
                    method: 'GET',
                    params: { page: 1, pageSize: 10 }
                });
            });

            it('passes an explicit page and size through', async () => {
                respondWithItems([]);
                const store = useProductsStore();

                await store.fetchPaginationProducts(3, 25);

                expect(lastRequest()).toMatchObject({ params: { page: 3, pageSize: 25 } });
            });
        });

        describe('fetchProduct', () => {
            it('requests one product and unwraps a single-record envelope', async () => {
                vi.mocked(orvalMutator).mockResolvedValue({ data: PRODUCT } as never);
                const store = useProductsStore();

                const result = await store.fetchProduct('p1');

                expect(lastRequest()).toMatchObject({ url: '/products/p1', method: 'GET' });
                // One level shallower than the list case, deliberately.
                expect(result).toEqual(PRODUCT);
            });
        });

        describe('watchSearchProducts', () => {
            it('sends the store filters as query parameters, renaming id to productId', async () => {
                respondWithItems([]);
                const store = useProductsStore();
                store.filters = { text: 'gad', id: 'p1', minPrice: 5, maxPrice: 50 };

                const handle = store.watchSearchProducts();
                await handle.search();

                const { params } = lastRequest() as unknown as {
                    params: Record<string, unknown>;
                };
                expect(params).toMatchObject({
                    text: 'gad',
                    // The rename. `id` would be silently ignored by the API.
                    productId: 'p1',
                    minPrice: 5,
                    maxPrice: 50
                });
                expect(params.id).toBeUndefined();
            });

            it('reports a failed search to the supplied error handler', async () => {
                const failure = new Error('network down');
                vi.mocked(orvalMutator).mockRejectedValue(failure);
                const store = useProductsStore();
                const onError = vi.fn();

                const handle = store.watchSearchProducts(onError);
                await handle.search().catch(() => {});

                // The list view has no other way to learn the search failed — without this the
                // page simply stops updating with no message.
                expect(onError).toHaveBeenCalledWith(failure);
            });
        });
    });
});
