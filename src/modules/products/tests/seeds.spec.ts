/**
 * This module's slice of the mock database.
 *
 * Lives beside the module rather than in a central mock spec: these assertions are about the
 * catalogue and nothing else, so `rm -rf` of the folder should take them along. The properties that
 * belong to no domain — that the fold runs, and runs in order — are in
 * `tests/cross-cutting/mockSeedAssembly.spec.ts`. See `docs/theory/modules.md`.
 */
import { describe, expect, it } from 'vitest';
import { buildProductsMockSeeds } from '@/modules/products/mocks/register';

const build = () => buildProductsMockSeeds().then(({ sampleProducts }) => sampleProducts ?? []);

describe('the demo catalogue', () => {
    it('carries the shared identities through, ids intact', async () => {
        const products = await build();

        // The count and the ids come from `@mocks/demo-data.json`, which is byte-identical with
        // the backend's copy — a spec asserting them here is asserting that this module's slice
        // does not drop or invent records, not choosing what they are.
        expect(products).toHaveLength(6);
        expect(products.every((product) => Boolean(product.id))).toBe(true);
    });

    it('exercises both sides of the visibility rule', async () => {
        // `isVisibleToCaller` hides inactive and soft-deleted products from non-admins. A fixture
        // set with neither would leave that branch untested while every spec stayed green.
        const products = await build();

        expect(products.some((product) => product.active === false)).toBe(true);
        expect(products.some((product) => Boolean(product.deletedAt))).toBe(true);
    });

    it('carries a record whose optional fields are all at their schema defaults', async () => {
        /*
         * The shape the richly-populated storefront records cannot produce: no description, no
         * categories, no tags — every optional field left to the backend model's `default:`. A
         * component that assumes a product has a description or at least one category renders a
         * blank chip row or throws, and every spec written against the rich records stays green
         * while it does.
         *
         * Asserted on the DEFAULTS rather than on absent keys: the backend defaults every one of
         * these, so `{ id, title, price }` with the other keys missing is a response the API cannot
         * produce, and pinning that shape would test a case that can never arrive.
         */
        const products = await build();

        expect(
            products.some(
                (product) =>
                    product.description === '' &&
                    product.categories?.length === 0 &&
                    product.tags?.length === 0
            )
        ).toBe(true);
    });

    it('carries a record with every optional field populated', async () => {
        // The other end of the same axis — asserted so that adding the minimal record above cannot
        // be "fixed" by hollowing out the rest of the catalogue.
        const products = await build();

        expect(
            products.some(
                (product) =>
                    product.description &&
                    product.categories?.length &&
                    product.tags?.length &&
                    product.createdAt &&
                    product.updatedAt
            )
        ).toBe(true);
    });

    it('drops imageUrl, which this repo cannot serve', async () => {
        // The backend serves `/images/seed/*.jpg` out of its own public/; under MSW they would
        // 404 and every seeded product image would render broken.
        const products = await build();

        expect(products.every((product) => product.imageUrl === undefined)).toBe(true);
    });
});
