/**
 * The mock handlers' own logic — the half of the data-parity invariant nothing was checking.
 *
 * `docs/tools/mocking.md` states two invariants: DATA parity (same records both sides) and
 * BEHAVIOUR parity (same filtering, scoping and visibility rules). Data parity is now structural
 * — both repos read a byte-identical `seed-identities.ts`. Behaviour parity was held by comments
 * naming the backend file each handler mirrors, and by nothing else: no unit test imported a
 * single handler, so the rules in `tests/mocks/handlers/*` were only ever exercised indirectly,
 * through Cypress, against data chosen to make specs readable rather than to probe the rules.
 *
 * That gap had already produced a real drift. `POST /products` with `active` omitted created a
 * publicly visible product here and a hidden one against the real API, because `openapi.yaml`
 * declared no default and the two sides each invented one. Nothing failed. The contract now
 * declares `default: true` and both sides derive it — and the case below is what stops it
 * silently diverging again.
 *
 * WHAT THESE TESTS ARE FOR, AND WHAT THEY ARE NOT
 * -----------------------------------------------
 * They are not a second copy of the backend's suite. The backend already proves its own
 * behaviour thoroughly — `tests/unit/services/products.test.ts` for role-scoped visibility,
 * `tests/unit/repositories/search-pagination.test.ts` for every pagination boundary. These
 * assert that THE MOCK still answers those same questions the same way. So each case below is
 * deliberately shaped after its backend counterpart, and the reference is named in the test, to
 * make a divergence obvious when someone changes one side.
 *
 * Cases are chosen for where the two implementations could plausibly disagree, not for coverage:
 * the mock filters an in-memory array in JavaScript while the API builds a Mongo query, so
 * combinations (`active` × `deletedAt` × role) and arithmetic boundaries are where they drift,
 * not the happy path a spec already walks.
 *
 * Driven through `setupServer` rather than by calling handler internals: the handlers are only
 * ever reached over HTTP in real use, and a test that bypassed the request layer would stop
 * covering the query-string parsing (`getQueryParameters`, `toNumberOrDefault`) that is itself a
 * place the two sides can disagree.
 */
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Product, User } from '@types';
import { registerProductsMockHandlers } from '../../mocks/handlers/productsMockHandlers.ts';
import { registerUsersMockHandlers } from '../../mocks/handlers/usersMockHandlers.ts';
import { mockDatabase } from '../../mocks/shared/mockShared.ts';

const API = 'http://localhost:3000';

const server = setupServer(...registerProductsMockHandlers(), ...registerUsersMockHandlers());

beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
});
afterAll(() => {
    server.close();
});

const ADMIN_ID = 'admin-under-test';
const USER_ID = 'user-under-test';

const makeUser = (overrides: Partial<User> = {}): User => ({
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

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
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

/**
 * The four `active` × `deletedAt` combinations.
 *
 * They are independent facts — a product can be deactivated without being deleted, and a
 * soft-deleted product keeps whatever `active` it had. What they share is an effect: a non-admin
 * sees a product only when it is active AND not deleted. Two of these four states are
 * unreachable from the fixed seed, which carries one inactive and one soft-deleted product but
 * never one that is both, and never a deleted-but-active one.
 */
const visibilityFixture = (): Product[] => [
    makeProduct({ id: 'live-active', title: 'Live active', active: true }),
    makeProduct({ id: 'live-inactive', title: 'Live inactive', active: false }),
    makeProduct({
        id: 'deleted-active',
        title: 'Deleted active',
        active: true,
        deletedAt: '2026-02-01T00:00:00.000Z'
    }),
    makeProduct({
        id: 'deleted-inactive',
        title: 'Deleted inactive',
        active: false,
        deletedAt: '2026-02-01T00:00:00.000Z'
    })
];

const signIn = (asAdmin: boolean) => {
    mockDatabase.currentAuthenticatedUserId = asAdmin ? ADMIN_ID : USER_ID;
};

beforeEach(() => {
    mockDatabase.sampleUsers = [
        makeUser({ id: ADMIN_ID, email: 'admin@example.com', username: 'admin', admin: true }),
        makeUser()
    ];
    mockDatabase.sampleProducts = [];
    mockDatabase.sampleCartItems = [];
    mockDatabase.sampleOrders = [];
    mockDatabase.currentAuthenticatedUserId = undefined;
});

afterEach(() => {
    server.resetHandlers();
});

const listProducts = (query = '') =>
    fetch(`${API}/products${query}`).then(
        (response) =>
            response.json() as Promise<{
                data: {
                    items: Product[];
                    meta: {
                        page: number;
                        pageSize: number;
                        totalItems: number;
                        totalPages: number;
                    };
                };
            }>
    );

const idsOf = (items: { id: string }[]) => items.map(({ id }) => id);

const createProduct = (body: Record<string, unknown>) =>
    fetch(`${API}/products`, {
        method: 'POST',
        // eslint-disable-next-line @typescript-eslint/naming-convention
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    }).then((response) => response.json() as Promise<{ data: Product }>);

const listUsers = (query = '') =>
    fetch(`${API}/users${query}`).then(
        (response) => response.json() as Promise<{ data: { items: User[] } }>
    );

describe('product visibility mirrors the backend publicScope', () => {
    // Backend counterpart: tests/unit/services/products.test.ts — "returns only active products
    // for non-admin callers" / "excludes soft-deleted products for non-admin callers", which
    // together assert `publicScope() = { active: true, deletedAt: { $exists: false } }`.

    beforeEach(() => {
        mockDatabase.sampleProducts = visibilityFixture();
    });

    it('shows a non-admin only the product that is both active and not deleted', async () => {
        signIn(false);

        const { data } = await listProducts();

        expect(idsOf(data.items)).toEqual(['live-active']);
    });

    it('hides everything but the live active product from an anonymous caller too', async () => {
        const { data } = await listProducts();

        expect(idsOf(data.items)).toEqual(['live-active']);
    });

    it('shows an admin all four states, including deleted-but-active', async () => {
        signIn(true);

        const { data } = await listProducts();

        expect(idsOf(data.items).toSorted()).toEqual([
            'deleted-active',
            'deleted-inactive',
            'live-active',
            'live-inactive'
        ]);
    });

    it('counts only what the caller can see, not the whole collection', async () => {
        signIn(false);

        const { data } = await listProducts();

        // The bug this guards is the one the mocks already shipped once: `meta.totalItems`
        // computed before role scoping would report 4 while returning 1, and a paginated UI
        // would render pages that do not exist.
        expect(data.meta.totalItems).toBe(1);
        expect(data.meta.totalPages).toBe(1);
    });
});

describe('product pagination arithmetic', () => {
    // Backend counterpart: tests/unit/repositories/search-pagination.test.ts (normalizePagination)
    // plus buildPaginatedMeta's `totalPages = ceil(totalItems / pageSize)`.

    beforeEach(() => {
        signIn(true);
        mockDatabase.sampleProducts = Array.from({ length: 25 }, (_unused, index) =>
            makeProduct({ id: `product-${index}`, title: `Product ${index}` })
        );
    });

    it('reports the filtered total, never the size of the page returned', async () => {
        const { data } = await listProducts('?page=1&pageSize=10');

        expect(data.items).toHaveLength(10);
        expect(data.meta.totalItems).toBe(25);
    });

    it('rounds the page count up on a partial last page', async () => {
        const { data } = await listProducts('?page=1&pageSize=10');

        expect(data.meta.totalPages).toBe(3);
    });

    it('returns a whole number of pages when the total divides exactly', async () => {
        const { data } = await listProducts('?page=1&pageSize=5');

        expect(data.meta.totalPages).toBe(5);
    });

    it('serves the short final page rather than padding it', async () => {
        const { data } = await listProducts('?page=3&pageSize=10');

        expect(data.items).toHaveLength(5);
    });

    it('answers a page past the end with no items and honest meta', async () => {
        const { data } = await listProducts('?page=99&pageSize=10');

        // Empty, not an error and not a wrapped-around first page. `totalItems` still describes
        // the collection, which is what lets a UI recover by navigating back.
        expect(data.items).toEqual([]);
        expect(data.meta.totalItems).toBe(25);
        expect(data.meta.totalPages).toBe(3);
    });

    it('collapses to a single page when the page size exceeds the total', async () => {
        const { data } = await listProducts('?page=1&pageSize=100');

        expect(data.items).toHaveLength(25);
        expect(data.meta.totalPages).toBe(1);
    });
});

describe('creating a product', () => {
    // Backend counterpart: tests/unit/models/schema-contracts.test.ts — "applies documented
    // defaults for every omitted optional field", which pins `active` to the schema default.

    beforeEach(() => {
        signIn(true);
    });

    it('defaults active to true when the caller omits it, as openapi.yaml declares', async () => {
        const { data } = await createProduct({ title: 'Fresh', price: 5 });

        // This is the case that drifted: undeclared in the contract, the API defaulted it to
        // false and the mock to true, so the same request produced a hidden product against one
        // and a public product against the other.
        expect(data.active).toBe(true);
    });

    it('honours an explicit active: false rather than overriding it with the default', async () => {
        const { data } = await createProduct({ title: 'Draft', price: 5, active: false });

        expect(data.active).toBe(false);
    });
});

describe('user active filter', () => {
    // Backend counterpart: tests/unit/services/users.test.ts — "filters on the active column,
    // not on soft-deletion". `active` is a real stored column on both sides now; it used to be
    // derived from `deletedAt` in the API, so this filter meant something different per side.

    beforeEach(() => {
        signIn(true);
        mockDatabase.sampleUsers = [
            makeUser({ id: 'enabled', email: 'enabled@example.com', active: true }),
            makeUser({ id: 'disabled', email: 'disabled@example.com', active: false })
        ];
    });

    it('returns only enabled accounts for active=true', async () => {
        const { data } = await listUsers('?active=true');

        expect(idsOf(data.items)).toEqual(['enabled']);
    });

    it('returns only disabled accounts for active=false', async () => {
        const { data } = await listUsers('?active=false');

        // `?active=false` arrives as the STRING 'false', which is truthy. A handler that read it
        // with a bare `Boolean(...)` would answer this with the enabled account instead — the
        // same class of bug the backend shipped on `?hardDelete=false`.
        expect(idsOf(data.items)).toEqual(['disabled']);
    });

    it('returns every account when the filter is absent', async () => {
        const { data } = await listUsers();

        expect(idsOf(data.items).toSorted()).toEqual(['disabled', 'enabled']);
    });
});
