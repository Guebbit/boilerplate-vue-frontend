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
import { useProductsStore } from '../store';
import { useProductLines } from '../composables/use-product-lines';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { asStub } from '../../../../tests/support/stub';
import { contractResponse } from '../../../../tests/support/unit/orval-fixture-schema.ts';
import { NO_PRODUCT_ACTIONS } from '../../../../tests/support/unit/fixtures.ts';

// The shop states the backorder promise; these cases are about the wording around it.
vi.mock('@/modules/shop', async (importOriginal) => {
    const { ref } = await import('vue');
    return {
        ...(await importOriginal<typeof import('@/modules/shop')>()),
        backorderPromiseDays: ref(30)
    };
});

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
                        price: '1.00',
                        currency: 'EUR',
                        // The ones named `off-sale…` are listed but not for sale.
                        ...(id.startsWith('off-sale') ? { purchasable: false } : {}),
                        actions: NO_PRODUCT_ACTIONS
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
            expect(lines.productOf('p1')?.price).toBe('1.00');
        });
    });

    it('says "no longer available" for a product the shopper cannot see — never the raw id', () => {
        const lines = mountLines();

        return lines.loadProducts(['gone-1']).then(() => {
            expect(lines.titleOf('gone-1')).toBe('No longer available');
        });
    });

    it.each([
        [
            'a line that fits',
            { availability: 'in_stock', quantity: 2, quantityAvailable: 5 },
            undefined
        ],
        [
            'a line above the number',
            { availability: 'in_stock', quantity: 6, quantityAvailable: 4 },
            'Only 4 available'
        ],
        ['a sold-out product', { availability: 'out_of_stock', quantityAvailable: 0 }, 'Sold out']
    ] as const)('words %s by the product answer: %s', (_name, stock, label) => {
        const lines = mountLines();

        return lines.loadProducts(['p1']).then(() => {
            expect(lines.lineLabel('p1', stock)).toBe(label);
        });
    });

    it('tells an off-sale product from a sold-out one by its details, not by the server word', () => {
        const lines = mountLines();

        return lines.loadProducts(['off-sale-1']).then(() => {
            expect(lines.lineLabel('off-sale-1', { availability: 'out_of_stock' })).toBe(
                'Not available right now'
            );
        });
    });

    it('words a preorder line with the date it ships from, and without one when the date is unknown', () => {
        const lines = mountLines();

        return lines.loadProducts(['p1']).then(() => {
            expect(
                lines.lineLabel('p1', { availability: 'preorder', availabilityDate: '2027-03-15' })
            ).toMatch(/^Preorder · ships .*2027/);
            expect(lines.lineLabel('p1', { availability: 'preorder' })).toBe('Preorder');
        });
    });

    it('words a line with units past the shelf with the date they ship by, and always with a promise', () => {
        const lines = mountLines();

        return lines.loadProducts(['p1']).then(() => {
            expect(
                lines.lineLabel('p1', {
                    availability: 'in_stock',
                    quantity: 3,
                    quantityBackordered: 1,
                    availabilityDate: '2027-03-15'
                })
            ).toMatch(/^Backorder · ships by .*2027/);
            expect(
                lines.lineLabel('p1', { availability: 'backorder', quantityBackordered: 2 })
            ).toBe('Backorder · ships within 30 days');
        });
    });

    it('words a product the shopper cannot see as no longer available, hidden ones included', () => {
        const lines = mountLines();

        return lines.loadProducts(['gone-1']).then(() => {
            expect(lines.lineLabel('gone-1', { availability: 'out_of_stock' })).toBe(
                'No longer available'
            );
        });
    });

    it('tells a product the shopper cannot see from one that is loaded, once the read has settled', () => {
        const lines = mountLines();

        return lines.loadProducts(['p1', 'gone-1']).then(() => {
            expect(lines.isRemoved('gone-1')).toBe(true);
            expect(lines.isRemoved('p1')).toBe(false);
        });
    });

    it('drops a record the read no longer answers, so a product hidden since reads as removed', () => {
        const lines = mountLines();

        return lines
            .loadProducts(['p1'])
            .then(() => {
                expect(lines.isRemoved('p1')).toBe(false);
                // The same product, hidden behind the open page: the next read does not return it.
                vi.mocked(searchProducts).mockImplementation(() =>
                    Promise.resolve(
                        asStub<Awaited<ReturnType<typeof searchProducts>>>(
                            contractResponse(schemas.SearchProductsResponse, {
                                items: [],
                                meta: { totalItems: 0, page: 1, pageSize: 1, totalPages: 0 }
                            })
                        )
                    )
                );
                return lines.loadProducts(['p1']);
            })
            .then(() => {
                expect(lines.productOf('p1')).toBeUndefined();
                expect(lines.isRemoved('p1')).toBe(true);
                expect(lines.lineLabel('p1', { availability: 'out_of_stock' })).toBe(
                    'No longer available'
                );
            });
    });

    it('keeps every record when the read is aborted, as a language switch aborts it', () => {
        const lines = mountLines();

        return lines
            .loadProducts(['p1', 'p2'])
            .then(() => {
                vi.mocked(searchProducts).mockRejectedValueOnce(
                    new DOMException('The operation was aborted.', 'AbortError')
                );
                return lines.loadProducts(['p1', 'p2']).catch(() => undefined);
            })
            .then(() => {
                expect(lines.productOf('p1')).toBeDefined();
                expect(lines.productOf('p2')).toBeDefined();
                expect(lines.isRemoved('p1')).toBe(false);
            });
    });

    it('keeps a record the read answered, and one that failed to load', () => {
        const lines = mountLines();

        return lines
            .loadProducts(['p1'])
            .then(() => {
                vi.mocked(searchProducts).mockRejectedValueOnce(new Error('offline'));
                return lines.loadProducts(['p1']).catch(() => undefined);
            })
            .then(() => {
                expect(lines.productOf('p1')).toBeDefined();
            });
    });

    it('sends no request for a list with no lines', () =>
        mountLines()
            .loadProducts([])
            .then(() => {
                expect(searchProducts).not.toHaveBeenCalled();
            }));
});
