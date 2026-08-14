/**
 * The wishlist's slice of the mock database.
 *
 * See `src/modules/products/mocks/seeds.ts` for why a module owns its own fixtures. Mirrors the
 * backend's `src/modules/wishlist/seeds.ts`.
 */
import type { WishlistItem } from '@types';
import type { MockSeedContext, MockSeedData } from '@/kernel/registry';
import { seedWishlists } from '@mocks/seed-identities.ts';

declare module '@/kernel/registry' {
    interface MockSeedData {
        sampleWishlistItems: WishlistItem[];
    }
}

/*
 * Like `sampleCartItems`, this models a single active session's list rather than one per user —
 * the mock has one browser and one session. The DEMO user's (ginopinoshow's) entry is the one
 * taken, because that is who `cy.loginAs('user')` signs in as, so the mock and a live run answer
 * the same two saved products to the same login.
 */
const DEMO_USER_ID = '65de646a44f861fd83c13f13';

const createSeedWishlistItems = (): WishlistItem[] =>
    (seedWishlists.find(({ userId }) => userId === DEMO_USER_ID)?.productIds ?? []).map(
        (productId) => ({ productId })
    );

/**
 * The random profile draws saved products from the catalogue actually in the database, so every
 * `productId` resolves — the same constraint the cart's random slice keeps.
 */
export const buildWishlistMockSeeds = async ({
    profile,
    soFar
}: MockSeedContext): Promise<Partial<MockSeedData>> =>
    profile === 'random'
        ? {
              sampleWishlistItems: (soFar.sampleProducts ?? [])
                  .filter((_, index) => index % 3 === 0)
                  .slice(0, 5)
                  .map(({ id }) => ({ productId: id }))
          }
        : { sampleWishlistItems: createSeedWishlistItems() };
