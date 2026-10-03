/**
 * @module
 * The ledger names products by title, and fetches the titles it is missing in one batched
 * `POST /products/search` (the cart's own read) instead of leaving raw ids on screen. `@api` is
 * mocked at `searchProducts`; the movements read is spied at the inventory store.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { searchProducts } from '@api';
import MovementLedger from '@/modules/inventory/components/MovementLedger.vue';
import { useInventoryStore } from '@/modules/inventory/store.ts';
import { useProductsStore } from '@/modules/products';
import { i18n, loadLocale } from '@/i18n';
import vuetify from '@/ui/vuetify';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { asStub } from '../../../../tests/support/stub';
import type { StockMovement } from '@types';

wireModulesIntoCore();

vi.mock('@api', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@api')>()),
    searchProducts: vi.fn()
}));

/**
 * A movement of one product.
 *
 * @param id - The movement id.
 * @param productId - The product it moved.
 * @returns The row.
 */
const movement = (id: string, productId: string): StockMovement =>
    asStub<StockMovement>({
        id,
        productId,
        onHandDelta: 1,
        reservedDelta: 0,
        reason: 'receipt',
        reference: null,
        note: null,
        createdAt: '2026-10-01T10:00:00.000Z'
    });

/**
 * The calls that asked for specific ids: the batched title read, as against the filter picker's
 * own free-text search that also runs on mount.
 *
 * @returns Each such call's id list.
 */
const batchedIdCalls = () =>
    vi
        .mocked(searchProducts)
        .mock.calls.map(([body]) => body.id)
        .filter((id): id is string[] => id !== undefined);

/**
 * Mounts the ledger over the movements the spied read will hand it.
 *
 * @param rows - The ledger page.
 * @returns The wrapper.
 */
const mountLedger = (rows: StockMovement[]) => {
    const inventory = useInventoryStore();
    vi.spyOn(inventory, 'fetchMovements').mockImplementation(() => {
        inventory.movements = rows;
        return Promise.resolve(rows);
    });
    return mount(MovementLedger, { global: { plugins: [vuetify, i18n] } });
};

beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(searchProducts).mockReset();
    vi.mocked(searchProducts).mockImplementation((body) =>
        Promise.resolve(
            asStub<Awaited<ReturnType<typeof searchProducts>>>({
                data: {
                    items: (body.id ?? [])
                        .filter((id) => id !== 'gone')
                        .map((id) => ({ id, title: `Title of ${id}`, price: 1, currency: 'EUR' })),
                    meta: { totalItems: 0, totalPages: 1 }
                }
            })
        )
    );
    return loadLocale('en');
});

describe('MovementLedger product titles', () => {
    it('fetches every missing title in ONE batched search and renders it', () => {
        const wrapper = mountLedger([
            movement('m1', 'p1'),
            movement('m2', 'p2'),
            movement('m3', 'p1')
        ]);

        return flushPromises().then(() => {
            expect(batchedIdCalls()).toEqual([['p1', 'p2']]);
            expect(wrapper.text()).toContain('Title of p1');
            expect(wrapper.text()).toContain('Title of p2');
        });
    });

    it('asks only for titles the products dictionary does not hold yet', () => {
        useProductsStore().addProduct({
            id: 'p1',
            title: 'Known',
            price: 1,
            currency: 'EUR',
            inStock: true,
            lowStock: false
        });
        const wrapper = mountLedger([movement('m1', 'p1'), movement('m2', 'p2')]);

        return flushPromises().then(() => {
            expect(batchedIdCalls()).toEqual([['p2']]);
            expect(wrapper.text()).toContain('Known');
        });
    });

    it('sends no batched search when every title is already known', () => {
        useProductsStore().addProduct({
            id: 'p1',
            title: 'Known',
            price: 1,
            currency: 'EUR',
            inStock: true,
            lowStock: false
        });
        mountLedger([movement('m1', 'p1')]);

        return flushPromises().then(() => {
            expect(batchedIdCalls()).toEqual([]);
        });
    });

    it('keeps showing the id of a product the search will not return', () => {
        const wrapper = mountLedger([movement('m1', 'gone')]);

        return flushPromises().then(() => {
            expect(wrapper.text()).toContain('gone');
        });
    });

    it('leaves the ids on screen when the title read fails', () => {
        vi.mocked(searchProducts).mockRejectedValue(new Error('offline'));
        const wrapper = mountLedger([movement('m1', 'p9')]);

        return flushPromises().then(() => {
            expect(wrapper.text()).toContain('p9');
        });
    });
});
