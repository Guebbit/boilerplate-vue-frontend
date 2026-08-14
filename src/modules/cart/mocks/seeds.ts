/**
 * The cart's slice of the mock database.
 *
 * See `src/modules/products/mocks/seeds.ts` for why a module owns its own fixtures. Mirrors the
 * backend's `src/modules/cart/seeds.ts`.
 */
import type { CartItem } from '@types';
import type { MockSeedContext, MockSeedData } from '@/kernel/registry';
import { seedUsers } from '@mocks/seed-identities.ts';

declare module '@/kernel/registry' {
    interface MockSeedData {
        sampleCartItems: CartItem[];
    }
}

/*
 * The admin's cart, as the BE embeds it on the user document. Only the admin has one in the
 * fixtures; `mockDatabase.sampleCartItems` models a single active session's cart, so it takes
 * whichever seeded user actually has items rather than merging the two.
 *
 * Read from the shared `@mocks/seed-identities.ts` rather than from `soFar.sampleUsers`, because
 * the BE seeds a cart as part of its user documents — the fact lives with the identities, and the
 * users module's slice does not carry it. That is why `after` below names only the catalogue.
 */
const createSeedCartItems = (): CartItem[] =>
    (seedUsers.find((user) => user.cart.length > 0)?.cart ?? []).map((item) => ({
        productId: item.productId,
        quantity: item.quantity
    }));

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
        : { sampleCartItems: createSeedCartItems() };
