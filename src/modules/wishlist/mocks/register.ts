/**
 * The wishlist's slice of the mock database.
 *
 * See `src/modules/products/mocks/register.ts` for why a module owns its own fixtures. Mirrors the
 * backend's `src/modules/wishlist/demo.ts`.
 */
import type { WishlistItem } from '@types';
import type { MockSeedData } from '@/kernel/registry';
import { buildSeedWishlistItems } from '@mocks/mockDataset.ts';

declare module '@/kernel/registry' {
    interface MockSeedData {
        sampleWishlistItems: WishlistItem[];
    }
}

/*
 * Like `sampleCartItems`, this models a single active session's list rather than one per user — the
 * mock has one browser and one session. `@mocks/mockDataset.ts` picks the DEMO user's entry, since
 * that is who `cy.loginAs('user')` signs in as, so the mock and a live run answer the same saved
 * products to the same login. It finds them by the `admin` flag rather than by a hard-coded id,
 * which is one fewer copy of a fact the dataset already states.
 */

export const buildWishlistMockSeeds = (): Promise<Partial<MockSeedData>> =>
    Promise.resolve({ sampleWishlistItems: buildSeedWishlistItems() });
