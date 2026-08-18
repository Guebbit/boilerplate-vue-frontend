/**
 * This module's slice of the mock database. See `src/modules/products/tests/seeds.spec.ts` for why
 * it is asserted here rather than centrally.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { buildCartMockSeeds } from '@/modules/cart/mocks/register';
import { mockDatabase } from '@mocks/mockDb.ts';
import { mockDatabaseReady } from '../../../../tests/support/unit/mockDatabaseReady.ts';

beforeAll(mockDatabaseReady);

/**
 * The cart lines, alongside the catalogue slice `mockSeeds.after: ['products']` guarantees at
 * runtime.
 *
 * The catalogue is read from the assembled `mockDatabase` — built by `mockDatabaseReady()` above,
 * through the real fold — rather than by calling the products builder directly: a sibling module's
 * internals are not this module's to import.
 */
const buildWithCatalogue = async () => {
    const products = mockDatabase.sampleProducts;
    const { sampleCartItems } = await buildCartMockSeeds();

    return { products, items: sampleCartItems ?? [] };
};

describe('the demo cart', () => {
    it('takes the cart the backend embeds on its seeded user', async () => {
        const { items } = await buildWithCatalogue();

        // Only one seeded user has a cart, and `mockDatabase.sampleCartItems` models a single
        // active session's cart rather than a merge of everyone's.
        expect(items).toHaveLength(2);
        expect(items.every((item) => item.quantity > 0)).toBe(true);
    });

    it('points every line at a product the catalogue actually holds', async () => {
        // `cartItemToOrderItem` in mockDb.ts does a non-null-asserted find() on product id and
        // throws on incoherent data; this is the assertion that catches a dangling line first.
        const { products, items } = await buildWithCatalogue();
        const productIds = new Set(products.map((product) => product.id));

        expect(items.length).toBeGreaterThan(0);
        for (const item of items) expect(productIds.has(item.productId)).toBe(true);
    });
});
