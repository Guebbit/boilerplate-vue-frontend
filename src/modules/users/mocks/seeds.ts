/**
 * The user directory's slice of the mock database.
 *
 * See `src/modules/products/mocks/seeds.ts` for why a module owns its own fixtures and what the
 * `declare module` block buys. Mirrors the backend's `src/modules/users/seeds.ts`.
 *
 * The mapper that used to live here is gone. It hand-wrote `active: true` and `verified: true` to
 * mirror backend schema defaults and omitted `locale` entirely — three guesses about a schema this
 * repo cannot see. `@mocks/mockDataset.ts` reads what the API actually returned instead, so all
 * three are facts now rather than educated copies.
 */
import type { User } from '@types';
import type { MockSeedContext, MockSeedData } from '@/kernel/registry';
import { buildSeedUsers } from '@mocks/mockDataset.ts';

declare module '@/kernel/registry' {
    interface MockSeedData {
        sampleUsers: User[];
    }
}

/**
 * A root of the fixture graph alongside the catalogue — `cart` and `orders` name both in their
 * `after`, because a cart belongs to a user and an order carries its owner's id and email.
 */
export const buildUsersMockSeeds = async ({
    profile
}: MockSeedContext): Promise<Partial<MockSeedData>> =>
    profile === 'random'
        ? import('./seedsRandom.ts').then((random) => ({
              sampleUsers: random.buildRandomUsers()
          }))
        : { sampleUsers: buildSeedUsers() };
