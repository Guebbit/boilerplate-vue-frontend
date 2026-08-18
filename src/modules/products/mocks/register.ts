/**
 * The catalogue's slice of the mock database.
 *
 * Declared here rather than in a shared fixture file so that `rm -rf src/modules/products` takes
 * the demo catalogue with it. The `declare module` block below is what makes that safe: it adds
 * `sampleProducts` to `MockSeedData`, so deleting this folder removes the field from the type and
 * every leftover `mockDatabase.sampleProducts` becomes a compile error instead of a read that
 * silently returns `undefined`.
 *
 * Mirrors the backend's `src/modules/products/demo.ts`, which contributes the same records to
 * `db/demo/index.ts` through the same manifest field.
 *
 * There is no mapping left to do here. `@mocks/mockDataset.ts` reads the rows the backend's API
 * actually produced and applies the two divergences this repo needs; this file only decides WHICH
 * slice of the mock database they land in. The mapper that used to live here is gone along with the
 * `active: true` it invented.
 */
import type { Product } from '@types';
import type { MockSeedData } from '@/kernel/registry';
import { buildSeedProducts } from '@mocks/mockDataset.ts';

declare module '@/kernel/registry' {
    interface MockSeedData {
        sampleProducts: Product[];
    }
}

/**
 * The root of the fixture graph — nothing else in the database derives from the catalogue's own
 * inputs, and `cart` and `orders` name it in their `after`.
 */
export const buildProductsMockSeeds = (): Promise<Partial<MockSeedData>> =>
    Promise.resolve({ sampleProducts: buildSeedProducts() });
