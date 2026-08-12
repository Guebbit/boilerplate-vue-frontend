/**
 * This module's fixtures, in both profiles.
 *
 * Lives beside the module rather than in a central mock spec: these assertions are about the
 * catalogue and nothing else, so `rm -rf` of the folder should take them along. The properties that
 * belong to no domain — that the fold runs, in order, reproducibly — are in
 * `tests/cross-cutting/mockSeedAssembly.spec.ts`. See `docs/theory/modules.md`.
 */
import { describe, expect, it } from 'vitest';
import { buildProductsMockSeeds } from '@/modules/products/mocks/seeds';

const build = (profile: 'seed' | 'random') =>
    buildProductsMockSeeds({ profile, soFar: {} }).then(
        ({ sampleProducts }) => sampleProducts ?? []
    );

describe('the seed profile', () => {
    it('carries the shared identities through, ids intact', async () => {
        const products = await build('seed');

        // The count and the ids come from `@mocks/seed-identities.ts`, which is byte-identical
        // with the backend's copy — a spec asserting them here is asserting that this module's
        // mapper does not drop or invent records, not choosing what they are.
        expect(products).toHaveLength(5);
        expect(products.every((product) => Boolean(product.id))).toBe(true);
    });

    it('exercises both sides of the visibility rule', async () => {
        // `isVisibleToCaller` hides inactive and soft-deleted products from non-admins. A fixture
        // set with neither would leave that branch untested while every spec stayed green.
        const products = await build('seed');

        expect(products.some((product) => product.active === false)).toBe(true);
        expect(products.some((product) => Boolean(product.deletedAt))).toBe(true);
    });

    it('drops imageUrl, which this repo cannot serve', async () => {
        // The backend serves `/images/seed/*.jpg` out of its own public/; under MSW they would
        // 404 and every seeded product image would render broken.
        const products = await build('seed');

        expect(products.every((product) => product.imageUrl === undefined)).toBe(true);
    });
});

describe('the random profile', () => {
    it('guarantees at least one inactive product and one soft-deleted product', async () => {
        const products = await build('random');

        expect(products.some((product) => product.active === false)).toBe(true);
        expect(products.some((product) => Boolean(product.deletedAt))).toBe(true);
    });

    it('guarantees at least one fully populated product and one with every optional field absent', async () => {
        const products = await build('random');

        expect(
            products.some(
                (product) =>
                    product.description &&
                    product.imageUrl &&
                    product.categories?.length &&
                    product.tags?.length &&
                    product.createdAt &&
                    product.updatedAt
            )
        ).toBe(true);
        expect(
            products.some(
                (product) =>
                    !product.description &&
                    !product.imageUrl &&
                    !product.categories &&
                    !product.tags &&
                    !product.createdAt &&
                    !product.updatedAt &&
                    !product.deletedAt
            )
        ).toBe(true);
    });
});
