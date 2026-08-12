/**
 * This module's fixtures, in both profiles. See `src/modules/products/tests/seeds.spec.ts` for why
 * they are asserted here rather than centrally.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCartMockSeeds } from '@/modules/cart/mocks/seeds';
import { mockDatabase } from '@mocks/mockShared.ts';
import { mockDatabaseReady } from '../../../../tests/support/unit/mockDatabaseReady.ts';

beforeAll(mockDatabaseReady);

/**
 * The catalogue slice `mockSeeds.after: ['products']` guarantees at runtime.
 *
 * Read from the assembled `mockDatabase` — built by `mockDatabaseReady()` above, through the real
 * fold — rather than by calling the products builder directly: a sibling module's internals are
 * not this module's to import.
 */
const buildWithCatalogue = async (profile: 'seed' | 'random') => {
    const products = mockDatabase.sampleProducts;
    const { sampleCartItems } = await buildCartMockSeeds({
        profile,
        soFar: { sampleProducts: products }
    });

    return { products, items: sampleCartItems ?? [] };
};

describe('the seed profile', () => {
    it('takes the cart the backend embeds on its seeded user', async () => {
        const { items } = await buildWithCatalogue('seed');

        // Only one seeded user has a cart, and `mockDatabase.sampleCartItems` models a single
        // active session's cart rather than a merge of everyone's.
        expect(items).toHaveLength(2);
        expect(items.every((item) => item.quantity > 0)).toBe(true);
    });
});

describe('the random profile', () => {
    it('draws only from the catalogue actually in the database', async () => {
        const { products, items } = await buildWithCatalogue('random');
        const productIds = new Set(products.map((product) => product.id));

        expect(items.length).toBeGreaterThan(0);
        for (const item of items) expect(productIds.has(item.productId)).toBe(true);
    });
});

describe('without a catalogue', () => {
    it('contributes an empty cart rather than items pointing nowhere', async () => {
        // The state after `rm -rf src/modules/products`.
        const { sampleCartItems } = await buildCartMockSeeds({
            profile: 'random',
            soFar: { sampleProducts: [] }
        });

        expect(sampleCartItems).toEqual([]);
    });
});
