/**
 * The cart's slice of the mock database.
 *
 * See `src/modules/products/mocks/seeds.ts` for why a module owns its own fixtures. Mirrors the
 * backend's `src/modules/cart/seeds.ts`.
 */
import type { CartItem } from '@types';
import type { MockSeedContext, MockSeedData } from '@/kernel/registry';
import { buildSeedCartItems } from '@mocks/mockDataset.ts';

declare module '@/kernel/registry' {
    interface MockSeedData {
        sampleCartItems: CartItem[];
    }
}

/*
 * The cart lines come from `@mocks/mockDataset.ts` rather than from `soFar.sampleUsers`, and the BE
 * moved the same way: carts used to be embedded on the seeded user documents, so the fact lived
 * with the identities and the users slice did not carry it. `carts` is its own collection in the
 * published dataset now, owned by the module that owns the collection. That is why `after` below
 * names only the catalogue.
 */

/**
 * The random profile draws its items from the catalogue actually in the database, so that every
 * `productId` resolves — constraint 4 in `@mocks/mockRandom.ts`. An absent catalogue (the
 * products module deleted) yields an empty cart rather than dangling ids, which is the honest
 * answer: there is nothing to put in it.
 */
export const buildCartMockSeeds = async ({
    profile,
    soFar
}: MockSeedContext): Promise<Partial<MockSeedData>> =>
    profile === 'random'
        ? import('./seedsRandom.ts').then((random) => ({
              sampleCartItems: random.buildRandomCartItems(soFar.sampleProducts ?? [])
          }))
        : { sampleCartItems: buildSeedCartItems() };
