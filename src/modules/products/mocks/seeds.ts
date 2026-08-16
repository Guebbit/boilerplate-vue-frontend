/**
 * The catalogue's slice of the mock database.
 *
 * Declared here rather than in a shared fixture file so that `rm -rf src/modules/products` takes
 * the demo catalogue with it. The `declare module` block below is what makes that safe: it adds
 * `sampleProducts` to `MockSeedData`, so deleting this folder removes the field from the type and
 * every leftover `mockDatabase.sampleProducts` becomes a compile error instead of a read that
 * silently returns `undefined`.
 *
 * Mirrors the backend's `src/modules/products/seeds.ts`, which contributes the same records to
 * `db/seeds/index.ts` through the same manifest field.
 *
 * There is no mapping left to do here. `@mocks/mockDataset.ts` reads the rows the backend's API
 * actually produced and applies the two divergences this repo needs; this file only decides WHICH
 * slice of the mock database they land in. The mapper that used to live here is gone along with the
 * `active: true` it invented.
 */
import type { Product } from '@types';
import type { MockSeedContext, MockSeedData } from '@/kernel/registry';
import { buildSeedProducts } from '@mocks/mockDataset.ts';

declare module '@/kernel/registry' {
    interface MockSeedData {
        sampleProducts: Product[];
    }
}

/**
 * Nothing else in the database derives from the catalogue's own inputs, so this builder ignores
 * `soFar` — it is the root of the fixture graph, and `cart` and `orders` name it in their `after`.
 *
 * The random branch is reached through a dynamic import so that `@faker-js/faker` and
 * `@mocks/generated.ts` stay out of the seed profile's module graph; see `@mocks/mockRandom.ts`.
 */
export const buildProductsMockSeeds = async ({
    profile
}: MockSeedContext): Promise<Partial<MockSeedData>> =>
    profile === 'random'
        ? import('./seedsRandom.ts').then((random) => ({
              sampleProducts: random.buildRandomProducts()
          }))
        : { sampleProducts: buildSeedProducts() };
