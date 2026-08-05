/**
 * Shared state and helpers for the MSW mock backend.
 *
 * ── Why these mocks exist in this shape ──────────────────────────────────────
 * They are not throwaway stubs. They are an offline replica of the real API, and they
 * hold two invariants that are easy to break by accident:
 *
 *   1. DATA parity — the seeds below mirror the BE's `db/seeds/index.ts`: same ids, same
 *      credentials, same content. That is what lets `cy.loginAs('user')` work identically
 *      against MSW and against the real backend.
 *
 *   2. BEHAVIOUR parity — a handler must apply the same filtering, scoping and visibility
 *      rules as the BE service behind its endpoint. Data parity WITHOUT behaviour parity is
 *      the worst case: a green suite describing an API that does not exist. It happened —
 *      the product list returned all 5 products to everyone while the real API returns 3 to
 *      non-admins, and `products.cy.ts` asserted the mock's number and passed.
 *
 * Consequence worth remembering: a spec asserting a COUNT is also asserting a ROLE.
 *
 * Response SHAPE is already enforced automatically — every handler returns through
 * `toMockJsonResponse`, which validates against the Zod schemas generated from
 * openapi.yaml. Shape cannot silently drift; BEHAVIOUR can, and is held by review only.
 *
 * Full explanation, the role-scoping table and the planned random-data profile:
 * docs/tools/mocking.md
 * ─────────────────────────────────────────────────────────────────────────────
 */
import {
    type CartItem,
    type CartResponse,
    type CartSummaryResponse,
    type MessageResponse,
    type Order,
    type OrderItem,
    type PaginationMeta,
    type Product,
    type RefreshTokenResponse,
    type User
} from '@types';
import { buildSeedDatabase, buildRandomDatabase, resolveProfile } from './mockProfiles.ts';
import { getIsoDateNow, computeOrderTotals, createMockOrder } from './mockOrderMath.ts';

// Re-exported so every existing `from '../shared/mockShared.ts'` import in the handler files
// keeps working unchanged — see mockOrderMath.ts's docstring for why these live there instead.
export { getIsoDateNow, computeOrderTotals, createMockOrder } from './mockOrderMath.ts';

export const createMessageResponse = (message: string): MessageResponse => ({
    success: true,
    status: 200,
    message
});

// Wrap any payload in the standard success envelope expected by the OpenAPI-generated services.
export const createSuccessEnvelope = <T>(data: T) => ({
    success: true as const,
    status: 200,
    message: 'success',
    data
});

// Wrap a single error in the standard error envelope (matches openapi.yaml's ErrorResponse
// schema: success/status/message + an `errors` array — NOT a singular `error` field).
export const createErrorEnvelope = (status: number, code: string, message: string) => ({
    success: false as const,
    status,
    message,
    errors: [{ code, message }]
});

const parseValue = (value: FormDataEntryValue | unknown) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value)))
        return Number(value);
    return value;
};

export const parseRequestBody = <T>(data: unknown): Partial<T> => {
    if (!data) return {};
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
        const parsedData: Record<string, unknown> = {};
        // eslint-disable-next-line unicorn/no-array-for-each
        data.forEach((value, key) => {
            parsedData[key] = parseValue(value);
        });
        return parsedData as Partial<T>;
    }
    if (typeof data === 'string') {
        try {
            return JSON.parse(data) as Partial<T>;
        } catch {
            return {};
        }
    }
    if (typeof data === 'object') return data as Partial<T>;
    return {};
};

export const readRequestBody = async <T>(request: Request): Promise<Partial<T>> => {
    try {
        return parseRequestBody<T>(await request.clone().json());
    } catch (error) {
        void error;
    }

    try {
        return parseRequestBody<T>(await request.clone().formData());
    } catch (error) {
        void error;
    }

    try {
        return parseRequestBody<T>(await request.clone().text());
    } catch (error) {
        void error;
    }

    return {};
};

// URL helpers are shared by all resource handlers for id and query extraction.
const getPathSegments = (url: string | undefined) =>
    new URL(url ?? '', 'http://localhost').pathname.split('/').filter(Boolean);

export const getLastPathSegment = (url: string | undefined) => {
    const pathSegments = getPathSegments(url);
    // eslint-disable-next-line unicorn/prefer-at
    return pathSegments[pathSegments.length - 1];
};

export const getQueryParameters = (url: string | undefined, parameters?: unknown) => {
    const parsedUrl = new URL(url ?? '', 'http://localhost');
    const queryFromUrl: Record<string, string> = {};
    // eslint-disable-next-line unicorn/no-array-for-each
    parsedUrl.searchParams.forEach((value, key) => {
        queryFromUrl[key] = value;
    });
    return {
        ...queryFromUrl,
        ...(typeof parameters === 'object' && parameters
            ? (parameters as Record<string, unknown>)
            : {})
    };
};

export const toBooleanOrUndefined = (value: unknown) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    // eslint-disable-next-line unicorn/no-useless-undefined
    return undefined;
};

export const toNumberOrDefault = (value: unknown, defaultValue: number) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : defaultValue;
};

export const toPaginationMeta = (
    itemCount: number,
    page: number,
    pageSize: number
): PaginationMeta => ({
    page,
    pageSize,
    totalItems: itemCount,
    totalPages: Math.ceil(itemCount / pageSize)
});

export const slicePaginatedData = <T>(items: T[], page: number, pageSize: number) =>
    items.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

export const createMockInvoicePdf = () =>
    new TextEncoder().encode('%PDF-1.4\n% Mock invoice PDF\n').buffer;

// ─── sessionStorage bridge ────────────────────────────────────────────────────
//
// Problem: MSW handlers run in the browser's main thread. Every cy.visit() call
// in Cypress causes a full page reload, which re-evaluates all ES modules,
// including this file. That wipes the module-level `mockDatabase` back to its
// initial state — most critically, `currentAuthenticatedUserId` reverts to
// root (admin), silently undoing any login performed in a previous step.
//
// Solution: mirror `currentAuthenticatedUserId` in sessionStorage, which
// survives page reloads within the same browser tab (Cypress runs all steps of
// one test in the same tab). On re-evaluation, `createInitialMockDatabase`
// reads this value and restores the correct user identity.
//
// sessionStorage is cleared between tests by `cy.clearAllSessionStorage()` in
// tests/e2e/support/e2e.ts, and also whenever the `/__mock/reset` endpoint is
// hit (which calls `resetMockDatabase`). Both code paths ensure a clean slate.
//
// The helpers are wrapped in try/catch so the mock module can also be imported
// safely in non-browser contexts (e.g. Vitest with jsdom).

const MOCK_USER_ID_KEY = 'mock_currentUserId';

const tryGetSessionStorage = (key: string): string | undefined => {
    try {
        if (typeof sessionStorage === 'undefined') return undefined;
        return sessionStorage.getItem(key) ?? undefined;
    } catch {
        return undefined;
    }
};

// Pass no second argument (or pass undefined) to remove the key.
export const trySetSessionStorage = (key: string, value?: string) => {
    try {
        if (typeof sessionStorage === 'undefined') return;
        if (value === undefined) sessionStorage.removeItem(key);
        else sessionStorage.setItem(key, value);
    } catch {
        // ignore storage errors (e.g. in non-browser environments)
    }
};

// ─── mock database ────────────────────────────────────────────────────────────

// Which profile is active, and what it builds, lives in mockProfiles.ts:
//   - 'seed' (default) — IDs, credentials and content mirror db/seeds/index.ts in the BE, so the
//     same login and the same records work against both MSW and the real API.
//   - 'random' — faker-seeded, contract-valid data through the same two fixed identities.
// This is the one seam that switches between them; everything downstream (handlers, role
// scoping, session bridging) is identical either way. See docs/tools/mocking.md.
//
// Async (and the module-level top-level `await` below) purely because the random profile is:
// `buildRandomDatabase()` reaches its implementation through a dynamic `import()` so the seed
// profile's module graph never has to load `@faker-js/faker` or `tests/mocks/generated.ts` at
// all — see mockProfiles.ts's docstring. The seed path itself stays perfectly synchronous
// internally; only the `await` at the call site is new.
const createInitialMockDatabase = async () => {
    const database =
        resolveProfile() === 'random' ? await buildRandomDatabase() : buildSeedDatabase();

    // Sentinel convention for currentAuthenticatedUserId:
    //   undefined key  → never set (fresh browser) → default to root (admin)
    //   '' (empty str) → explicitly logged out / reset → no session
    //   '<id>'         → actively logged-in user
    const storedUserId = tryGetSessionStorage(MOCK_USER_ID_KEY);
    return {
        currentAuthenticatedUserId:
            storedUserId === undefined ? '65dd2bdb923652b7800fe180' : storedUserId || undefined,
        ...database
    };
};

// Single shared in-memory store mutated by all handlers.
export const mockDatabase: {
    currentAuthenticatedUserId: string | undefined;
    sampleUsers: User[];
    sampleProducts: Product[];
    sampleCartItems: CartItem[];
    sampleOrders: Order[];
} = await createInitialMockDatabase();

// Called by the /__mock/reset MSW endpoint, which `cy.resetState()` hits under the mock profile.
// Always resets to no session (undefined) regardless of the dev-mode default,
// so each Cypress test starts as an unauthenticated visitor.
export const resetMockDatabase = async () => {
    trySetSessionStorage(MOCK_USER_ID_KEY, ''); // '' = "no session" sentinel
    const initialMockDatabase = await createInitialMockDatabase();
    mockDatabase.currentAuthenticatedUserId = undefined;
    mockDatabase.sampleUsers = initialMockDatabase.sampleUsers;
    mockDatabase.sampleProducts = initialMockDatabase.sampleProducts;
    mockDatabase.sampleCartItems = initialMockDatabase.sampleCartItems;
    mockDatabase.sampleOrders = initialMockDatabase.sampleOrders;
};

/**
 * The user behind the current mock session, or undefined when logged out.
 */
export const getCurrentMockUser = (): User | undefined =>
    mockDatabase.currentAuthenticatedUserId === undefined
        ? undefined
        : mockDatabase.sampleUsers.find(({ id }) => id === mockDatabase.currentAuthenticatedUserId);

/**
 * Mock equivalent of the BE's `request.authContext?.admin === true`.
 *
 * The BE derives this from the authenticated user's `admin` flag and uses it to widen
 * queries (see `isVisibleToCaller` below). Anonymous callers are never admins, which is
 * why every Cypress spec — `cy.resetState()` clears the session — sees the public view
 * unless it explicitly calls `cy.loginAs('admin')`.
 */
export const isCurrentMockUserAdmin = (): boolean => getCurrentMockUser()?.admin === true;

/**
 * Mirrors `BE src/services/products.ts` `search()`:
 *
 *     if (!admin) {
 *         where.active = true;
 *         where.deletedAt = { $exists: false };
 *     }
 *
 * Admins see every product, including inactive and soft-deleted ones; everyone else sees
 * only active, non-deleted products. Keep this in step with that block — if the BE's
 * visibility rules change, this is the line that has to change with them.
 *
 * The seed data is built to exercise both branches: of the five products, one is soft-deleted
 * ('Sallyno Carino') and one is inactive ('Bundle micini'), so admins see 5 and everyone
 * else sees 3. A spec asserting a product count is therefore also asserting a role.
 */
export const isVisibleToCaller = (product: Product, admin: boolean): boolean =>
    admin || (product.active === true && !product.deletedAt);

/**
 * Mirrors `BE src/core/http/scopes.ts` `userScope()`, used by the order endpoints:
 * admins query unscoped, everyone else is pinned to their own `userId` — and a `userId`
 * filter supplied by a non-admin caller is ignored rather than honoured.
 *
 * Returns the userId a caller's queries must be restricted to, or undefined for "no
 * restriction" (admin).
 *
 * Note: the BE additionally guards every `/orders` route with `isAuth`, so an anonymous
 * caller gets a 401 before reaching this. The mock handlers do not model auth guards at
 * all — see docs/tools/mocking.md, "Known gaps".
 */
export const getMockUserScope = (): string | undefined =>
    isCurrentMockUserAdmin() ? undefined : mockDatabase.currentAuthenticatedUserId;

const findMockProduct = (productId: string): Product | undefined =>
    mockDatabase.sampleProducts.find(({ id }) => id === productId);

/**
 * Same arithmetic as the order totals — the BE shares one `sumLineItems` helper between the two —
 * with the field names `openapi.yaml` gives `CartSummary`: `itemsCount`/`totalQuantity`/`total`
 * against an order's `totalItems`/`totalQuantity`/`totalPrice`.
 */
export const calculateCartSummary = (): CartSummaryResponse => {
    const { totalItems, totalQuantity, totalPrice } = computeOrderTotals(
        mockDatabase.sampleCartItems.map((item) => ({
            product: findMockProduct(item.productId),
            quantity: item.quantity
        }))
    );
    return {
        itemsCount: totalItems,
        totalQuantity,
        total: totalPrice,
        currency: 'EUR'
    };
};

// Conversion helper used when cart payloads become order payloads.
export const cartItemToOrderItem = (item: CartItem): OrderItem => ({
    product: findMockProduct(item.productId)!,
    quantity: item.quantity
});

export const getCartResponse = (): CartResponse => ({
    items: mockDatabase.sampleCartItems,
    summary: calculateCartSummary()
});

export const defaultRefreshTokenResponse: RefreshTokenResponse = {
    token: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600
};
