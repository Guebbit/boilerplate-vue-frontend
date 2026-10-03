/**
 * @module
 * Unit coverage of the product picker's search-as-you-type list and its `pin()` — the two
 * behaviours `StockMovementForm`/`MovementLedger` now share instead of each holding an unpaged
 * product cache. `@api` stays real; only `orvalMutator` is mocked, so the
 * request shape `searchProducts` itself builds is what a regression here would actually break.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    useProductPicker,
    useProductPickerPin
} from '@/modules/inventory/composables/use-product-picker.ts';
import { orvalMutator } from '@/infrastructure/http';
import {
    contractRequest,
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';
import type { Product } from '@types';
import * as schemas from '@api/schemas';

vi.mock('@/infrastructure/http', () => ({ orvalMutator: vi.fn() }));

/** The axios config handed to `orvalMutator` on its most recent call. */
const lastRequest = () => {
    const call = vi.mocked(orvalMutator).mock.calls.at(-1);
    if (!call) throw new Error('orvalMutator was never called');
    return call[0] as { url: string; method: string; data: Record<string, unknown> };
};

/** Makes the next search-endpoint call answer with this page of products. */
const respondWith = (items: Product[]) =>
    vi.mocked(orvalMutator).mockImplementation((config: { url?: string; method?: string }) =>
        Promise.resolve(
            parseOrvalFixture(
                config.method,
                config.url,
                orvalEnvelope({
                    items,
                    meta: { page: 1, pageSize: 20, totalItems: items.length, totalPages: 1 }
                })
            )
        )
    );

/** Two distinct products, standing in for "the current search page" and "something pinned". */
const WIDGET: Product = {
    id: 'p1',
    title: 'Widget',
    price: 9.99,
    currency: 'EUR',
    inStock: true,
    lowStock: false
};

/** A second product, used as the pinned one. */
const GADGET: Product = {
    id: 'p2',
    title: 'Gadget',
    price: 4.5,
    currency: 'EUR',
    inStock: true,
    lowStock: false
};

beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('useProductPicker', () => {
    it('searches immediately, with an empty query and the picker page size', async () => {
        respondWith([WIDGET]);
        const { options } = useProductPicker();

        await vi.runAllTimersAsync();

        expect(lastRequest()).toMatchObject({ url: '/products/search', method: 'POST' });
        expect(contractRequest(schemas.SearchProductsBody, lastRequest().data)).toMatchObject({
            text: undefined,
            pageSize: 20
        });
        expect(options.value).toEqual([{ value: 'p1', title: 'Widget' }]);
    });

    it('debounces a typed query into one search, not one per keystroke', async () => {
        respondWith([GADGET]);
        const { query, options } = useProductPicker();
        await vi.runAllTimersAsync();
        vi.mocked(orvalMutator).mockClear();

        query.value = 'g';
        query.value = 'ga';
        query.value = 'gad';

        await vi.advanceTimersByTimeAsync(299);
        expect(orvalMutator).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);
        expect(orvalMutator).toHaveBeenCalledTimes(1);
        expect(contractRequest(schemas.SearchProductsBody, lastRequest().data)).toMatchObject({
            text: 'gad'
        });
        expect(options.value).toEqual([{ value: 'p2', title: 'Gadget' }]);
    });

    it('does not fetch to pin an id already on the current search page', async () => {
        respondWith([WIDGET]);
        const { options, pin } = useProductPicker();
        await vi.runAllTimersAsync();
        vi.mocked(orvalMutator).mockClear();

        pin('p1');
        await vi.runAllTimersAsync();

        expect(orvalMutator).not.toHaveBeenCalled();
        expect(options.value).toEqual([{ value: 'p1', title: 'Widget' }]);
    });

    it('fetches and lists an id from outside the current search page', async () => {
        respondWith([WIDGET]);
        const { options, pin } = useProductPicker();
        await vi.runAllTimersAsync();

        // The pin's own by-id lookup — same endpoint, a different answer.
        respondWith([GADGET]);
        pin('p2');
        await vi.runAllTimersAsync();

        expect(contractRequest(schemas.SearchProductsBody, lastRequest().data)).toMatchObject({
            id: ['p2'],
            pageSize: 1
        });
        expect(options.value).toEqual([
            { value: 'p2', title: 'Gadget' },
            { value: 'p1', title: 'Widget' }
        ]);
    });

    it('drops the pin once a fresh search brings the same id back on its own', async () => {
        respondWith([WIDGET]);
        const { query, options, pin } = useProductPicker();
        await vi.runAllTimersAsync();

        respondWith([GADGET]);
        pin('p2');
        await vi.runAllTimersAsync();
        expect(options.value).toHaveLength(2);

        respondWith([GADGET]);
        query.value = 'gad';
        await vi.runAllTimersAsync();

        // No duplicate: `p2` is now in `results` on its own, so `pinned` stood down.
        expect(options.value).toEqual([{ value: 'p2', title: 'Gadget' }]);
    });
});

describe('useProductPickerPin', () => {
    it('pins whatever the getter returns, immediately and again on every change', async () => {
        respondWith([WIDGET]);
        const { options, pin } = useProductPicker();
        await vi.runAllTimersAsync();

        const selected = { value: 'p2' as string | undefined };
        respondWith([GADGET]);
        useProductPickerPin(() => selected.value, pin);
        await vi.runAllTimersAsync();

        expect(options.value.map((option) => option.value)).toEqual(['p2', 'p1']);
    });
});
