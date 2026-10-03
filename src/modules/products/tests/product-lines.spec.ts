/**
 * @module
 * The join a cart or wishlist needs for its id-only lines: one batched `POST /products/search`
 * instead of a request per line, records landing in the same dictionary the product page reads,
 * and a title that is never the raw id. `@api` is mocked at its `searchProducts` boundary.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent } from 'vue';
import { mount } from '@vue/test-utils';
import { searchProducts } from '@api';
import * as schemas from '@api/schemas';
import { i18n, loadLocale } from '@/i18n';
import { useProductsStore } from '@/modules/products/store';
import { useProductLines } from '@/modules/products/composables/use-product-lines';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { asStub } from '../../../../tests/support/stub';
import { contractResponse } from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@api')>()),
    searchProducts: vi.fn()
}));

/**
 * Answers a search with one product per id asked for, except ids starting with `gone` — the
 * ones the caller may no longer see.
 */
const answerWithVisibleIds = () =>
    vi.mocked(searchProducts).mockImplementation((body) => {
        const ids = (body.id ?? []).filter((id) => !id.startsWith('gone'));
        return Promise.resolve(
            asStub<Awaited<ReturnType<typeof searchProducts>>>(
                contractResponse(schemas.SearchProductsResponse, {
                    items: ids.map((id) => ({
                        id,
                        title: `Title of ${id}`,
                        price: 1,
                        currency: 'EUR',
                        inStock: true,
                        lowStock: false
                    })),
                    meta: { totalItems: ids.length, page: 1, pageSize: 100, totalPages: 1 }
                })
            )
        );
    });

beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(searchProducts).mockReset();
    answerWithVisibleIds();
    return loadLocale('en');
});

describe('fetchProductsByIds', () => {
    it('reads every line in one request, sized to the batch', () =>
        useProductsStore()
            .fetchProductsByIds(['p1', 'p2', 'p1'])
            .then((records) => {
                expect(searchProducts).toHaveBeenCalledTimes(1);
                expect(searchProducts).toHaveBeenCalledWith({
                    id: ['p1', 'p2'],
                    page: 1,
                    pageSize: 2
                });
                expect(records.map((record) => record?.id)).toEqual(['p1', 'p2']);
            }));

    it('splits past the contract cap of a hundred ids per request', () => {
        const ids = Array.from({ length: 150 }, (_, index) => `p${String(index)}`);

        return useProductsStore()
            .fetchProductsByIds(ids)
            .then(() => {
                const sizes = vi.mocked(searchProducts).mock.calls.map(([body]) => body.id?.length);
                expect(sizes).toEqual([100, 50]);
            });
    });

    it('stores the records where the product page reads them', () => {
        const store = useProductsStore();

        return store.fetchProductsByIds(['p1']).then(() => {
            expect(store.products.p1?.title).toBe('Title of p1');
        });
    });

    it('goes back to the server for a record it already holds — a cart shows current prices', () => {
        const store = useProductsStore();

        return store
            .fetchProductsByIds(['p1'])
            .then(() => store.fetchProductsByIds(['p1']))
            .then(() => {
                expect(searchProducts).toHaveBeenCalledTimes(2);
            });
    });
});

/**
 * A render function that draws nothing — the probe component has no template.
 */
const renderNothing = () => null;

/**
 * Runs the composable inside a real component's setup, as a view would.
 *
 * @returns Its readers.
 */
const mountLines = () => {
    const captured: { lines?: ReturnType<typeof useProductLines> } = {};
    mount(
        defineComponent({
            setup() {
                captured.lines = useProductLines();
                return renderNothing;
            }
        }),
        { global: { plugins: [i18n] } }
    );
    if (!captured.lines) throw new Error('setup did not run');
    return captured.lines;
};

describe('useProductLines', () => {
    it('names a line by its product title once loaded', () => {
        const lines = mountLines();

        return lines.loadProducts(['p1']).then(() => {
            expect(lines.titleOf('p1')).toBe('Title of p1');
            expect(lines.productOf('p1')?.price).toBe(1);
        });
    });

    it('says "no longer available" for a product the shopper cannot see — never the raw id', () => {
        const lines = mountLines();

        return lines.loadProducts(['gone-1']).then(() => {
            expect(lines.titleOf('gone-1')).toBe('No longer available');
        });
    });

    it('sends no request for a list with no lines', () =>
        mountLines()
            .loadProducts([])
            .then(() => {
                expect(searchProducts).not.toHaveBeenCalled();
            }));
});
