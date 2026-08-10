/**
 * BEHAVIOUR parity — that the mock handlers apply the same filtering, scoping and pagination
 * rules as the backend services they mirror.
 *
 * `docs/tools/mocking.md` states this alongside DATA parity, which is structural: both repos read
 * a byte-identical `seed-identities.ts`. Behaviour has no such mechanism. Without these cases the
 * rules in `tests/mocks/handlers/*` are asserted only indirectly, through Cypress, against data
 * chosen to make specs readable rather than to probe the rules — so a handler can drift from the
 * service it mirrors and every spec stays green.
 *
 * These are NOT a second copy of the backend's suite. The backend proves its own behaviour
 * thoroughly (`tests/unit/services/products.test.ts` for role-scoped visibility,
 * `tests/unit/repositories/search-pagination.test.ts` for pagination boundaries); each case here
 * is shaped after its counterpart and names it, so that asserting THE MOCK answers the same
 * question the same way is a one-line comparison for whoever changes either side.
 *
 * Cases sit where the two implementations can plausibly disagree, not where coverage is thin: the
 * mock filters an in-memory array in JavaScript while the API builds a Mongo query, so
 * combinations (`active` × `deletedAt` × role) and arithmetic boundaries are the risk, not the
 * happy path a spec already walks.
 *
 * Driven through `setupServer` rather than by calling handler internals, because the handlers are
 * only ever reached over HTTP in real use — bypassing the request layer would stop covering the
 * query-string parsing (`getQueryParameters`, `toNumberOrDefault`) that is itself a place the two
 * sides can disagree.
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

const deleteProduct = (path: string) =>
    fetch(`${API}/products/${path}`, { method: 'DELETE' }).then((response) => response.status);

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

        // `meta.totalItems` computed before role scoping would report 4 while returning 1, and a
        // paginated UI would render pages that do not exist.
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

        // The default is declared in the contract precisely so both sides derive it. Left
        // undeclared, each picks its own, and the same request yields a publicly visible product
        // against one and a hidden one against the other with nothing failing.
        expect(data.active).toBe(true);
    });

    it('honours an explicit active: false rather than overriding it with the default', async () => {
        const { data } = await createProduct({ title: 'Draft', price: 5, active: false });

        expect(data.active).toBe(false);
    });
});

describe('user active filter', () => {
    // Backend counterpart: tests/unit/services/users.test.ts — "filters on the active column,
    // not on soft-deletion". `active` is a real stored column on both sides; deriving it from
    // `deletedAt` on either would make this filter mean something different per side.

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

describe('product delete mirrors the backend soft/hard split', () => {
    /*
     * Backend counterpart: tests/unit/services/products.test.ts — `remove()` toggles `deletedAt`
     * unless `hardDelete`, and `removeById` 404s on a missing id.
     *
     * The risk this covers is specific: the mock previously spliced the row on EVERY delete, so it
     * agreed with the API only on the hard path. A spec that soft-deleted and then asserted an admin
     * could still see the record would have passed against the real API and failed against the mock
     * — or worse, the reverse.
     */
    beforeEach(() => {
        mockDatabase.sampleProducts = [makeProduct({ id: 'p-live' })];
        signIn(true);
    });

    it('soft-deletes by default, leaving the row present with deletedAt set', async () => {
        expect(await deleteProduct('p-live')).toBe(200);

        const [product] = mockDatabase.sampleProducts;
        expect(product.id).toBe('p-live');
        expect(product.deletedAt).toBeTruthy();
    });

    it('restores on a second soft delete, rather than deleting harder', async () => {
        await deleteProduct('p-live');
        await deleteProduct('p-live');

        expect(mockDatabase.sampleProducts[0].deletedAt).toBeUndefined();
    });

    it('hard-deletes via the /hard path, removing the row outright', async () => {
        expect(await deleteProduct('p-live/hard')).toBe(200);

        expect(mockDatabase.sampleProducts).toHaveLength(0);
    });

    it('hard-deletes via the query flag, the same operation spelled differently', async () => {
        expect(await deleteProduct('p-live?hardDelete=true')).toBe(200);

        expect(mockDatabase.sampleProducts).toHaveLength(0);
    });

    it('treats ?hardDelete=false as a soft delete, not a truthy string', async () => {
        // `!!'false'` is `true`; the BE's `parseFormBoolean` exists for exactly this, and a mock
        // that used the loose check would destroy a record the API would have kept.
        await deleteProduct('p-live?hardDelete=false');

        expect(mockDatabase.sampleProducts).toHaveLength(1);
        expect(mockDatabase.sampleProducts[0].deletedAt).toBeTruthy();
    });

    it('404s on an unknown id, on both the soft and the hard path', async () => {
        expect(await deleteProduct('p-missing')).toBe(404);
        expect(await deleteProduct('p-missing/hard')).toBe(404);
    });

    it('keeps a soft-deleted product visible to an admin and hidden from everyone else', async () => {
        await deleteProduct('p-live');

        signIn(true);
        const asAdmin = await listProducts();
        expect(idsOf(asAdmin.data.items)).toEqual(['p-live']);

        signIn(false);
        const asUser = await listProducts();
        expect(idsOf(asUser.data.items)).toEqual([]);
    });
});
