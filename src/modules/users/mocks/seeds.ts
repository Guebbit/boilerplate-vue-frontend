/**
 * The user directory's slice of the mock database.
 *
 * See `src/modules/products/mocks/seeds.ts` for why a module owns its own fixtures and what the
 * `declare module` block buys. Mirrors the backend's `src/modules/users/seeds.ts`.
 */
import type { User } from '@types';
import type { MockSeedContext, MockSeedData } from '@/kernel/registry';
import { seedUsers } from '@mocks/seed-identities.ts';
import { getIsoDateNow } from '@mocks/mockOrderMath.ts';

declare module '@/kernel/registry' {
    interface MockSeedData {
        sampleUsers: User[];
    }
}

/*
 * Ids, emails and admin flags come from the shared `@mocks/seed-identities.ts` — byte-identical
 * with the BE — which is what lets `cy.loginAs('user')` work identically against MSW and against
 * the real backend.
 *
 * `imageUrl` is dropped for the same reason as in the catalogue: the BE serves those paths from
 * its own `public/` and this repo ships no such files, so under MSW every seeded avatar would
 * render broken.
 *
 * `active` is likewise not in the shared file: it is a BE model default (`true`), not a fact the
 * fixtures state, so restating it there would invent a field the seeder never writes.
 */
const createSeedUsers = (): User[] =>
    seedUsers.map((user) => ({
        id: user.id,
        email: user.email,
        username: user.username,
        admin: user.admin,
        active: true,
        /* Mirrors the BE seeder, not the shared file: a seed user exists to be logged into, so
         * the backend writes `verified: true` on every fixture — and the mock must agree or the
         * "verify your email" banner greets every demo login. */
        verified: true,
        imageUrl: undefined,
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    }));

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
        : { sampleUsers: createSeedUsers() };
