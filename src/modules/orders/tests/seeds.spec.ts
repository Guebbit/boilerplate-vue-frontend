/**
 * This module's fixtures, in both profiles. See `src/modules/products/tests/seeds.spec.ts` for why
 * they are asserted here rather than centrally.
 *
 * Orders are the one slice built FROM another's, so these cases carry a `soFar` the way the real
 * fold does — which is also what makes the "references resolve" assertions meaningful.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { Product } from '@types';
import { buildOrdersMockSeeds } from '@/modules/orders/mocks/seeds';
import { mockDatabase } from '@mocks/mockShared.ts';
import { mockDatabaseReady } from '../../../../tests/support/unit/mockDatabaseReady.ts';

beforeAll(mockDatabaseReady);

/**
 * The upstream slices `mockSeeds.after: ['products', 'users']` guarantees at runtime.
 *
 * Read from the assembled `mockDatabase` — which `mockDatabaseReady()` above builds through the
 * real fold — rather than by calling the products and users builders directly: a sibling module's
 * internals are not this module's to import, and the whole point of `soFar` is that orders needs
 * the other domains' DATA and never their code.
 */
const buildWithDependencies = async (profile: 'seed' | 'random') => {
    const products = mockDatabase.sampleProducts;
    const { sampleOrders } = await buildOrdersMockSeeds({
        profile,
        soFar: { sampleProducts: products, sampleUsers: mockDatabase.sampleUsers }
    });

    return { products, orders: sampleOrders ?? [] };
};

describe.each(['seed', 'random'] as const)('the %s profile', (profile) => {
    it('keeps every line item pointing at a product that actually exists', async () => {
        // `cartItemToOrderItem` in mockShared.ts does a non-null-asserted find() on product id and
        // throws on incoherent data; this is the assertion that catches it first.
        const { products, orders } = await buildWithDependencies(profile);
        const productIds = new Set(products.map((product) => product.id));

        for (const order of orders)
            for (const line of order.items) expect(productIds.has(line.product.id)).toBe(true);
    });

    it('derives totals from the line items rather than restating them', async () => {
        const { orders } = await buildWithDependencies(profile);

        for (const order of orders) {
            const expectedQuantity = order.items.reduce((sum, line) => sum + line.quantity, 0);
            const expectedPrice =
                Math.round(
                    order.items.reduce((sum, line) => sum + line.product.price * line.quantity, 0) *
                        100
                ) / 100;

            expect(order.totalItems).toBe(order.items.length);
            expect(order.totalQuantity).toBe(expectedQuantity);
            expect(order.totalPrice).toBe(expectedPrice);
        }
    });

    it('includes a soft-deleted order, so the admin-only visibility branch is reachable', async () => {
        // `isOrderVisibleToCaller` has an admin-only branch; fixtures that never produce a hidden
        // order never reach it.
        const { orders } = await buildWithDependencies(profile);

        expect(orders.filter((order) => order.deletedAt)).toHaveLength(1);
    });
});

describe('the seed profile', () => {
    it('keeps the fixed ids the backend seeds, so a deep link resolves in both', async () => {
        // The ids come straight out of `@mocks/dataset.json` now. They used to need putting back
        // by hand: the orders were rebuilt through `createMockOrder`, which mints a fresh
        // `order-<timestamp>-<rand>`, so a spec deep-linking to /orders/:id would otherwise have
        // hit a different URL under MSW than against the real API.
        const { orders } = await buildWithDependencies('seed');

        expect(orders).toHaveLength(3);
        expect(orders.find((order) => order.deletedAt)?.id).toBe('66b3f0c14d2e8a91c7d4a015');
    });

    it('carries the totals the API derived rather than recomputing them', async () => {
        // `computeOrderTotals` is no longer on this path at all. The published row already holds
        // what the backend's `applyOrderTransform` produced, so there is nothing here that could
        // disagree with it.
        const { orders } = await buildWithDependencies('seed');

        for (const order of orders) {
            const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
            expect(order.totalItems).toBe(order.items.length);
            expect(order.totalQuantity).toBe(quantity);
        }
    });

    it('survives the catalogue being deleted, because a line embeds its own snapshot', async () => {
        // The state after `rm -rf src/modules/products`. This used to contribute an empty history:
        // the shared fixture file gave a line only a `productId`, so with no catalogue to resolve
        // it against there was nothing to build. A published order carries the product AS IT WAS —
        // which is the whole point of a snapshot — so the history stands on its own.
        const { sampleOrders } = await buildOrdersMockSeeds({
            profile: 'seed',
            soFar: { sampleProducts: [] as Product[] }
        });

        expect(sampleOrders).toHaveLength(3);
        expect(sampleOrders?.every((order) => order.items.every((item) => item.product))).toBe(
            true
        );
    });
});

describe('the random profile without a catalogue', () => {
    it('contributes an empty history rather than orders whose lines point nowhere', async () => {
        // Randomly-generated orders still DERIVE their lines from whatever catalogue is in the
        // database, so this branch keeps degrading exactly as it did.
        const { sampleOrders } = await buildOrdersMockSeeds({
            profile: 'random',
            soFar: { sampleProducts: [] as Product[] }
        });

        expect(sampleOrders).toEqual([]);
    });
});
