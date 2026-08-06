/**
 * The random profile's actual implementation — faker-seeded, contract-valid data through
 * `tests/mocks/generated.ts`'s factories. Split out from `mockProfiles.ts` and reached only via
 * that file's dynamic `import()`, gated on `resolveProfile() === 'random'`.
 *
 * Why the split: this file is the only thing in the mock layer that imports `@faker-js/faker`
 * and the 4 800-line `tests/mocks/generated.ts`. Before this split, `mockProfiles.ts` imported
 * both unconditionally, which pulled them into the SEED profile's module graph too — every
 * `npm run test:e2e` run, not just `test:e2e:random` — and on a cold `vite dev` boot that
 * triggered a one-time dependency-pre-bundling reload Vite does the first time it discovers a
 * new dependency mid-session. That reload raced page-load assertions in specs that don't even
 * touch the random profile. A dynamic import keeps this entire module (and its two heavy
 * dependencies) out of the seed profile's graph completely.
 *
 * Design constraints (see docs/tools/mocking.md for the full rationale):
 *
 * 1. Vary the data, never the handlers. Only what `buildRandomDatabase()` returns changes; every
 *    handler in `tests/mocks/handlers/*` runs exactly the same logic against it either way.
 * 2. The generated factories are per-operation response envelopes, not entity factories — they
 *    return `{ success, status, message, data }` with garbage envelope fields
 *    (`status: faker.number.int()`, `message: faker.string.alpha(...)`). Only `.data` is used;
 *    the envelope is discarded, and handlers build the real one via `createSuccessEnvelope`.
 * 3. Auth identity stays fixed. `cy.loginAs()` types `root@root.it` / `gino@pino.it` into a real
 *    form — randomising id/email/admin would break login itself. Only cosmetic fields
 *    (`username`, `imageUrl`, timestamps) are randomised; `active` is pinned `true` for both so
 *    login never randomly fails on an inactive account.
 * 4. Relations stay coherent. Each factory call generates its response independently, so a
 *    fresh call for cart items or orders would reference product ids that don't exist. Products
 *    are generated first; cart items and orders are built from ids that are actually present.
 *    `cartItemToOrderItem` in `mockShared.ts` does a non-null-asserted `find(...)` on product id
 *    and throws on incoherent data — the canary that this relinking is wrong.
 * 5. Role-scoping branches must survive randomisation. `isVisibleToCaller` (`mockShared.ts`)
 *    hides inactive and soft-deleted products from non-admins; the fixed seed exercises both
 *    branches on purpose (one of each). The random generator force-patches specific products to
 *    guarantee at least one of each, or the profile silently stops testing a branch that has
 *    already broken once for real (see the products.cy.ts comment on that incident).
 * 6. The RNG is seeded and the seed is logged. `faker.seed(n)`, `n` from `VITE_MOCK_SEED` or a
 *    fresh value when unset, resolved once per page load and printed by `apiMock.ts` at worker
 *    start. Without this, "random" means "flaky and unreproducible" — with it, a failure
 *    reproduces exactly by re-running with the same `VITE_MOCK_SEED`.
 */
import { faker } from '@faker-js/faker';
import type { CartItem, Order, OrderItem, Product, User } from '@types';
import { ListOrdersResponse, ListProductsResponse, ListUsersResponse } from '@api/schemas';
import {
    getListOrdersResponseMock,
    getListProductsResponseMock,
    getListUsersResponseMock
} from '../generated.ts';
import { assertMockContract } from './mockValidation.ts';
import { computeOrderTotals } from './mockOrderMath.ts';
import type { IMockSeedData } from './mockProfiles.ts';

const MOCK_ADMIN_ID = '65dd2bdb923652b7800fe180';
const MOCK_ADMIN_EMAIL = 'root@root.it';
const MOCK_USER_ID = '65de646a44f861fd83c13f13';
const MOCK_USER_EMAIL = 'gino@pino.it';

// Minimum product pool size: one each of the four force-patched variants below, plus at least
// one plain random product left untouched.
const MIN_RANDOM_PRODUCTS = 5;

// A full page reload (which every cy.visit() causes) re-evaluates this module from scratch, so a
// plain module-level `let` would re-roll a fresh seed on every navigation — "random" would mean
// "different on every page load" instead of "different per run". sessionStorage survives a
// reload within the same browser tab, so a freshly-generated seed is persisted there the same
// way mockShared.ts persists `currentAuthenticatedUserId` across reloads, for the same reason.
const MOCK_SEED_STORAGE_KEY = 'mock_randomProfileSeed';

const tryGetSessionStorage = (key: string): string | undefined => {
    try {
        if (typeof sessionStorage === 'undefined') return undefined;
        return sessionStorage.getItem(key) ?? undefined;
    } catch {
        return undefined;
    }
};

const trySetSessionStorage = (key: string, value: string): void => {
    try {
        if (typeof sessionStorage === 'undefined') return;
        sessionStorage.setItem(key, value);
    } catch {
        // ignore storage errors (e.g. in non-browser environments)
    }
};

let resolvedSeed: number | undefined;

/**
 * The RNG seed for the random profile: `VITE_MOCK_SEED` when set to a finite number, otherwise a
 * fresh value generated once per browser tab and persisted to sessionStorage — resolved once and
 * memoised per module instance too, so every `buildRandomDatabase()` call across a test run
 * (i.e. every `cy.resetState()` / `cy.visit()` reload between specs) reproduces the exact same
 * dataset, rather than drifting further from what a failure was reported against.
 */
export const resolveMockSeed = (): number => {
    if (resolvedSeed !== undefined) return resolvedSeed;

    const envSeed = import.meta.env.VITE_MOCK_SEED;
    const parsedEnvSeed = envSeed ? Number(envSeed) : Number.NaN;
    if (Number.isFinite(parsedEnvSeed)) {
        resolvedSeed = parsedEnvSeed;
        return resolvedSeed;
    }

    const storedSeed = tryGetSessionStorage(MOCK_SEED_STORAGE_KEY);
    const parsedStoredSeed = storedSeed ? Number(storedSeed) : Number.NaN;
    if (Number.isFinite(parsedStoredSeed)) {
        resolvedSeed = parsedStoredSeed;
        return resolvedSeed;
    }

    resolvedSeed = Math.floor(Math.random() * 1e9);
    trySetSessionStorage(MOCK_SEED_STORAGE_KEY, String(resolvedSeed));
    return resolvedSeed;
};

/** Generates at least `minCount` random product envelopes' worth of `.data.items`, envelope discarded. */
const generateProductPool = (minCount: number): Product[] => {
    const pool: Product[] = [];
    while (pool.length < minCount) {
        pool.push(...(getListProductsResponseMock().data.items as Product[]));
    }
    return pool;
};

// Force-patch helpers for the four guaranteed product variants (constraints 4 and 5 above).
const withActiveFalse = (product: Product): Product => ({
    ...product,
    active: false,
    deletedAt: undefined
});
const withDeletedAt = (product: Product): Product => ({
    ...product,
    active: true,
    deletedAt: faker.date.past().toISOString()
});
const withEveryOptionalField = (product: Product): Product => ({
    ...product,
    description: product.description ?? faker.commerce.productDescription(),
    active: true,
    imageUrl: product.imageUrl ?? faker.internet.url(),
    categories: product.categories?.length ? product.categories : [faker.commerce.department()],
    tags: product.tags?.length ? product.tags : [faker.word.sample()],
    createdAt: product.createdAt ?? faker.date.past().toISOString(),
    updatedAt: product.updatedAt ?? faker.date.recent().toISOString(),
    deletedAt: undefined
});
const withNoOptionalFields = (product: Product): Product => ({
    id: product.id,
    title: product.title,
    price: product.price
});

const buildRandomProducts = (): Product[] => {
    const pool = generateProductPool(MIN_RANDOM_PRODUCTS);
    const patched = pool.map((product, index) => {
        if (index === 0) return withActiveFalse(product);
        if (index === 1) return withDeletedAt(product);
        if (index === 2) return withEveryOptionalField(product);
        if (index === 3) return withNoOptionalFields(product);
        return product;
    });
    // The generator is itself a thing that can drift — validate the reassembled envelope
    // against the same schema a real ListProducts response has to satisfy.
    assertMockContract(ListProductsResponse, {
        success: true,
        status: 200,
        message: 'mock-profile:random',
        data: {
            items: patched,
            meta: { page: 1, pageSize: patched.length, totalItems: patched.length, totalPages: 1 }
        }
    });
    return patched;
};

const buildRandomUsers = (): User[] => {
    const templates = getListUsersResponseMock().data.items as User[];
    const cosmeticFor = (index: number) => templates[index % templates.length];
    const adminCosmetic = cosmeticFor(0);
    const userCosmetic = cosmeticFor(1);

    // id/email/admin/active are the fixed identity `cy.loginAs()` depends on (constraint 3);
    // only username/imageUrl/timestamps come from the generated templates.
    const users: User[] = [
        {
            id: MOCK_ADMIN_ID,
            email: MOCK_ADMIN_EMAIL,
            admin: true,
            active: true,
            username: adminCosmetic.username,
            imageUrl: adminCosmetic.imageUrl,
            createdAt: adminCosmetic.createdAt,
            updatedAt: adminCosmetic.updatedAt
        },
        {
            id: MOCK_USER_ID,
            email: MOCK_USER_EMAIL,
            admin: false,
            active: true,
            username: userCosmetic.username,
            imageUrl: userCosmetic.imageUrl,
            createdAt: userCosmetic.createdAt,
            updatedAt: userCosmetic.updatedAt
        }
    ];

    assertMockContract(ListUsersResponse, {
        success: true,
        status: 200,
        message: 'mock-profile:random',
        data: {
            items: users,
            meta: { page: 1, pageSize: users.length, totalItems: users.length, totalPages: 1 }
        }
    });
    return users;
};

const buildRandomCartItems = (products: Product[]): CartItem[] => {
    const pickCount = Math.min(products.length, faker.number.int({ min: 1, max: 3 }));
    return faker.helpers.arrayElements(products, pickCount).map((product) => ({
        productId: product.id,
        quantity: faker.number.int({ min: 1, max: 5 })
    }));
};

const buildRandomOrders = (products: Product[], users: User[]): Order[] => {
    const templates = getListOrdersResponseMock().data.items as Order[];
    const orders = templates.map((template) => {
        const lineCount = Math.max(1, Math.min(template.items.length, products.length));
        const items: OrderItem[] = faker.helpers
            .arrayElements(products, lineCount)
            .map((product) => ({
                product,
                quantity: faker.number.int({ min: 1, max: 10 })
            }));
        const owner = faker.helpers.arrayElement(users);
        // Deliberately not `createMockOrder` (mockOrderMath.ts): that helper stamps id/timestamps
        // from wall-clock time and Math.random(), which is correct for a freshly-placed seed or
        // checkout order but would make this profile unreproducible under a fixed
        // VITE_MOCK_SEED — everything here must come from the seeded faker instance instead.
        const createdAt = faker.date.past().toISOString();
        return {
            id: faker.string.alphanumeric(20),
            userId: owner.id,
            email: owner.email,
            items,
            ...computeOrderTotals(items),
            status: template.status,
            notes: template.notes,
            createdAt,
            updatedAt: createdAt
        };
    });

    assertMockContract(ListOrdersResponse, {
        success: true,
        status: 200,
        message: 'mock-profile:random',
        data: {
            items: orders,
            meta: { page: 1, pageSize: orders.length, totalItems: orders.length, totalPages: 1 }
        }
    });
    return orders;
};

export const buildRandomDatabase = (): IMockSeedData => {
    faker.seed(resolveMockSeed());

    const sampleProducts = buildRandomProducts();
    const sampleUsers = buildRandomUsers();
    const sampleCartItems = buildRandomCartItems(sampleProducts);
    const sampleOrders = buildRandomOrders(sampleProducts, sampleUsers);

    return { sampleUsers, sampleProducts, sampleCartItems, sampleOrders };
};
