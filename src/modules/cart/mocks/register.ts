/**
 * The cart's slice of the mock database.
 *
 * See `src/modules/products/mocks/register.ts` for why a module owns its own fixtures. Mirrors the
 * backend's `src/modules/cart/demo.ts`.
 */
import type { CartItem } from '@types';
import type { MockSeedData } from '@/kernel/registry';
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

export const buildCartMockSeeds = (): Promise<Partial<MockSeedData>> =>
    Promise.resolve({ sampleCartItems: buildSeedCartItems() });
