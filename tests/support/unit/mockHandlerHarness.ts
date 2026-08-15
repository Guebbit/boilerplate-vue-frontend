/**
 * Shared harness for the mock-handler behaviour-parity specs.
 *
 * Those specs assert that a module's MSW handlers apply the same filtering, scoping and pagination
 * rules as the backend services they mirror. Each domain owns its own — `src/modules/<name>/tests/
 * handlerParity.spec.ts` — so that deleting the module deletes its parity coverage with it. What
 * they share is only the plumbing: an in-memory database reset between cases, an identity to sign
 * in as, and builders for the two entities every domain's fixtures reference.
 *
 * Deliberately NOT here: the handlers themselves, or any assertion. A file in `tests/support/`
 * that knew which domains exist would recreate exactly the coupling this split removed.
 *
 * Driven over HTTP through `setupServer` rather than by calling handler internals, because the
 * handlers are only ever reached over HTTP in real use — bypassing the request layer would stop
 * covering the query-string parsing (`getQueryParameters`, `toNumberOrDefault`) that is itself a
 * place the two sides can disagree.
 */
import type { Product, User } from '@types';
import { mockDatabase } from '@mocks/mockShared.ts';

export const API = 'http://localhost:3000';

export const ADMIN_ID = 'admin-under-test';
export const USER_ID = 'user-under-test';

export const makeUser = (overrides: Partial<User> = {}): User => ({
    id: USER_ID,
    email: 'user@example.com',
    username: 'user',
    admin: false,
    active: true,
    imageUrl: undefined,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
});

export const makeProduct = (overrides: Partial<Product> = {}): Product => ({
    id: 'product-1',
    title: 'Product',
    description: 'A product',
    price: 10,
    active: true,
    imageUrl: undefined,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
});

/** Point the handlers' session bridge at the admin or the plain user. */
export const signIn = (asAdmin: boolean) => {
    mockDatabase.currentAuthenticatedUserId = asAdmin ? ADMIN_ID : USER_ID;
};

/**
 * Reset the in-memory database to two known identities and nothing else.
 *
 * Every collection is cleared, not just the one a given spec reads: the handlers share one
 * database object, and a leftover order from another file's fixture is exactly the kind of
 * cross-test coupling that makes a parity failure unreproducible in isolation.
 *
 * The clearing is generic — every array-valued field, whatever the enabled modules happen to
 * declare — rather than one assignment per domain. A list here would have to be edited every time
 * a module is added or deleted, which is the coupling this harness's docstring disclaims.
 *
 * The two users are the exception, and are named rather than generated: `signIn` below points the
 * session bridge at one of them, so identity is the harness's own concern rather than the users
 * module's fixtures. Nothing else is populated — a spec builds the records its own domain needs.
 */
export const resetMockDatabaseForParity = () => {
    const collections = mockDatabase as unknown as Record<string, unknown>;
    for (const [field, value] of Object.entries(collections))
        if (Array.isArray(value)) collections[field] = [];

    mockDatabase.sampleUsers = [
        makeUser({ id: ADMIN_ID, email: 'admin@example.com', username: 'admin', admin: true }),
        makeUser()
    ];
    mockDatabase.currentAuthenticatedUserId = undefined;
};

export const idsOf = (items: { id: string }[]) => items.map(({ id }) => id);
