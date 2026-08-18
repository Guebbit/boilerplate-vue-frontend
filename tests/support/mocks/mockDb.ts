/**
 * Shared state and helpers for the MSW mock backend.
 *
 * ── What this is, and what it is not ─────────────────────────────────────────
 * A convenience, not a contract. It exists so the app runs, and the fast suite runs, without a
 * backend. It is ALLOWED to be wrong about the API.
 *
 * Two things are still true of it, and the difference between them is the whole design:
 *
 *   1. DATA is structurally correct. The rows come from `@mocks/demo-data.json`, which is the
 *      backend's own `seed:export` output copied here byte-identically — not a mirror written by
 *      hand. `cy.loginAs('user')` therefore works the same against MSW and against the real API,
 *      and nobody has to keep that true.
 *
 *   2. BEHAVIOUR is best-effort. A handler filters an in-memory array in JavaScript where the API
 *      builds a Mongo query, and nothing here can prove the two agree. Mirror the backend service
 *      when you write one — name it in a comment, that is genuinely useful — but do not treat a
 *      green mock suite as evidence about the backend. `test-e2e-live` in CI is the evidence.
 *
 * Why the promise is deliberately weak: a mirror held up by attention slips. The product list
 * once returned all 5 products to everyone while the real API returned 3 to non-admins, and
 * `products.cy.ts` asserted the mock's number and passed. Nothing available here could have caught
 * that — only standing the real backend up does, which is what `test-e2e-live` in ci.yml is for.
 *
 * Still automatic: response SHAPE. Every handler returns through `toMockJsonResponse`, which
 * validates against the Zod schemas generated from openapi.yaml, so a handler cannot answer with a
 * shape the contract does not declare.
 *
 * Consequence worth remembering: a spec asserting a COUNT is also asserting a ROLE.
 *
 * Full explanation and the role-scoping table: docs/tools/mocking.md
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
import type { MockSeedData } from '@/kernel/registry';
import { getIsoDateNow, computeOrderTotals, createMockOrder } from './mockOrderMath.ts';

// Re-exported so every existing `from '@mocks/mockDb.ts'` import in the handler files
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

/**
 * The canonical reason phrase for a status.
 *
 * Mirrors `resolveErrorMessage` in the backend's `src/infrastructure/http/response.ts`, which is the only
 * thing that sets an error envelope's `message` there — no handler can pass one. Duplicated rather
 * than shared because it is nine lines and the alternative is a cross-repo import, but it has to
 * agree: a mock whose envelope reads differently from the real API is the divergence these mocks
 * exist to avoid.
 */
const resolveErrorMessage = (status: number) => {
    if (status === 400) return 'Bad Request';
    if (status === 401) return 'Unauthorized';
    if (status === 403) return 'Forbidden';
    if (status === 404) return 'Not Found';
    if (status === 409) return 'Conflict';
    if (status === 422) return 'Unprocessable Entity';
    if (status === 429) return 'Too Many Requests';
    if (status >= 500) return 'Internal Server Error';
    return 'Request Error';
};

/**
 * Wrap a single error in the standard error envelope (matches openapi.yaml's ErrorResponse schema:
 * success/status/message + an `errors` array — NOT a singular `error` field).
 *
 * `message` is derived from the status, exactly as the API derives it; the caller's text is the
 * user-facing half and belongs in `errors[]`.
 */
export const createErrorEnvelope = (status: number, code: string, message: string) => ({
    success: false as const,
    status,
    message: resolveErrorMessage(status),
    errors: [{ code, message }]
});

const parseValue = (value: FormDataEntryValue | unknown) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value)))
        return Number(value);
    return value;
};

/**
 * A parsed request body, with uploaded files separated from ordinary fields.
 *
 * The split exists because the seven multipart operations (`*WithMultipart`) send an
 * `imageUpload` part alongside the scalar fields, and flattening the two together is actively
 * harmful: the file would land on the record as `imageUpload: File`, a key no schema declares,
 * and `toMockJsonResponse`'s strict validation would reject the response envelope — failing in a
 * place that says nothing about the cause.
 */
export type MockRequestParts<T> = {
    /** Scalar form fields, coerced by {@link parseValue}. Never contains a File or Blob. */
    fields: Partial<T>;
    /** Uploaded parts, keyed by form field name — `imageUpload` for every current operation. */
    files: Record<string, File>;
};

const isUploadedFile = (value: unknown): value is File =>
    (typeof File !== 'undefined' && value instanceof File) ||
    (typeof Blob !== 'undefined' && value instanceof Blob);

export const parseRequestBody = <T>(data: unknown): MockRequestParts<T> => {
    if (!data) return { fields: {}, files: {} };
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
        const parsedData: Record<string, unknown> = {};
        const parsedFiles: Record<string, File> = {};
        // eslint-disable-next-line unicorn/no-array-for-each
        data.forEach((value, key) => {
            if (isUploadedFile(value)) parsedFiles[key] = value;
            else parsedData[key] = parseValue(value);
        });
        return { fields: parsedData as Partial<T>, files: parsedFiles };
    }
    if (typeof data === 'string') {
        try {
            return { fields: JSON.parse(data) as Partial<T>, files: {} };
        } catch {
            return { fields: {}, files: {} };
        }
    }
    if (typeof data === 'object') return { fields: data as Partial<T>, files: {} };
    return { fields: {}, files: {} };
};

/**
 * Reads a request body as JSON, then multipart, then plain text — whichever parses first.
 *
 * @returns Scalar fields and uploaded files, kept apart. Handlers that ignore uploads should
 *  use {@link readRequestBody} instead and never see the difference.
 */
export const readRequestParts = <T>(request: Request): Promise<MockRequestParts<T>> =>
    // Each `.catch` is "that encoding was not it, try the next" — a rejected `.json()` on a
    // multipart body is the expected path here, not an error worth reporting. The body is cloned
    // per attempt because reading it consumes the stream.
    request
        .clone()
        .json()
        .then((data) => parseRequestBody<T>(data))
        .catch(() =>
            request
                .clone()
                .formData()
                .then((data) => parseRequestBody<T>(data))
        )
        .catch(() =>
            request
                .clone()
                .text()
                .then((data) => parseRequestBody<T>(data))
        )
        .catch(() => ({ fields: {}, files: {} }));

/**
 * The scalar half of {@link readRequestParts}, for the majority of handlers that take no upload.
 */
export const readRequestBody = <T>(request: Request): Promise<Partial<T>> =>
    readRequestParts<T>(request).then(({ fields }) => fields);

// ─── uploads ──────────────────────────────────────────────────────────────────

/**
 * Extension the backend would derive from a validated mime type, mirroring
 * `BE src/infrastructure/adapters/storage.ts:105-107`.
 */
const UPLOAD_EXTENSIONS = new Map([
    ['image/png', 'png'],
    ['image/jpg', 'jpg'],
    ['image/jpeg', 'jpg'],
    ['image/webp', 'webp']
]);

/**
 * Synthesises the `imageUrl` an upload would be stored under.
 *
 * Mirrors the backend's shape — a public-relative URL path built from a random name plus the
 * extension implied by the mime type (`BE src/infrastructure/http/uploads.ts`) — without mirroring its
 * gates. In particular the mock does NOT re-read the file's magic bytes, so it can never
 * answer the 422 the real API gives when a declared type and the actual bytes disagree.
 * That is deliberate: these mocks reproduce behaviour, not security. See
 * docs/tools/mocking.md, "Known gaps".
 *
 * @param file - The uploaded part.
 * @returns A server-relative path such as `/images/mock/9f2c…d1.png`.
 */
const toMockUploadUrl = (file: File) => {
    const extension = UPLOAD_EXTENSIONS.get(file.type) ?? 'bin';
    const randomName = Array.from({ length: 16 }, () =>
        Math.floor(Math.random() * 256)
            .toString(16)
            .padStart(2, '0')
    ).join('');
    return `/images/mock/${randomName}.${extension}`;
};

/**
 * The `imageUrl` to persist for a record after a write.
 *
 * @param files - Uploaded parts from {@link readRequestParts}.
 * @param currentImageUrl - The record's existing image, kept when no new file was sent.
 * @returns A freshly synthesised path when `imageUpload` is present, the current value otherwise.
 */
export const resolveMockImageUrl = (files: Record<string, File>, currentImageUrl?: string) =>
    files.imageUpload ? toMockUploadUrl(files.imageUpload) : currentImageUrl;

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
// one test in the same tab). On re-evaluation, `resolveInitialUserId`
// reads this value and restores the correct user identity.
//
// sessionStorage is cleared between tests by `cy.clearAllSessionStorage()` in
// tests/support/e2e/e2e.ts, and also whenever the `/__mock/reset` endpoint is
// hit (which calls `resetMockDatabase`). Both code paths ensure a clean slate.
//
// The helpers are wrapped in try/catch so the mock module can also be imported
// safely in non-browser contexts (e.g. Vitest with jsdom).

const MOCK_USER_ID_KEY = 'mock_currentUserId';

export const tryGetSessionStorage = (key: string): string | undefined => {
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

/**
 * How the database gets built — supplied at boot rather than reached for.
 *
 * A port, for a structural reason. Building the database means folding every enabled module's
 * `mockSeeds` slice together, which needs `@/modules` — and this file is imported BY those very
 * modules' handlers. Reaching for the module list here would close the loop
 * (`module.ts` → `mocks/handlers.ts` → `mockDb.ts` → `modules.ts` → `module.ts`) and the
 * cycle would resolve to a half-initialised module at runtime.
 *
 * Inverting it keeps the direction one-way: this file states what it needs, and `apiMock.ts` —
 * the composition root, the one place that already knows every module — supplies it at boot. Same
 * idiom as the backend's `registerAuditSink`, and for the same reason.
 */
type MockSeedBuilder = () => Promise<MockSeedData>;

let buildMockSeedData: MockSeedBuilder | undefined;

/**
 * Supply the builder and populate the database with it. Called once, from `apiMock.ts`.
 *
 * The two are one call rather than a register-then-populate pair because there is no useful state
 * between them: a registered builder that has not run leaves every handler reading an empty
 * database, which is exactly the silent-empty failure this refactor removed.
 */
export const installMockSeedBuilder = (build: MockSeedBuilder): Promise<void> => {
    buildMockSeedData = build;
    return populateMockDatabase();
};

/*
 * Sentinel convention for currentAuthenticatedUserId:
 *   undefined key  → never set (fresh browser) → default to root (admin)
 *   '' (empty str) → explicitly logged out / reset → no session
 *   '<id>'         → actively logged-in user
 */
const resolveInitialUserId = (): string | undefined => {
    const storedUserId = tryGetSessionStorage(MOCK_USER_ID_KEY);
    return storedUserId === undefined ? '65dd2bdb923652b7800fe180' : storedUserId || undefined;
};

/**
 * Single shared in-memory store mutated by all handlers.
 *
 * Typed as `MockSeedData`, which is assembled by declaration merging from whatever the enabled
 * modules declare — so `mockDatabase.sampleProducts` is exactly `Product[]` here, and stops
 * existing at all when the products module is deleted. There is no field list in this file to
 * keep in step with `src/modules.ts`.
 *
 * Starts empty and is filled by `installMockSeedBuilder`. It cannot be built at module scope: the
 * slices come from the modules, and the modules import this file (see the port above).
 */
export const mockDatabase: MockSeedData & { currentAuthenticatedUserId: string | undefined } = {
    currentAuthenticatedUserId: resolveInitialUserId()
} as MockSeedData & { currentAuthenticatedUserId: string | undefined };

/** Replace every domain's collection with a freshly built one, leaving the session untouched. */
const populateMockDatabase = async (): Promise<void> => {
    if (!buildMockSeedData)
        throw new Error(
            'mockDatabase used before installMockSeedBuilder() — see apiMock.ts, which supplies it at boot.'
        );

    // Assigned key by key rather than by replacing the object, because every handler and every
    // spec holds a reference to `mockDatabase` itself. Naming the keys generically is also what
    // keeps this function free of the domain list — `Object.assign` over whatever the fold
    // produced, not four named assignments.
    Object.assign(mockDatabase, await buildMockSeedData());
};

/**
 * An email the mock API "sent" — the outbox a test reads instead of an inbox.
 *
 * The real API enqueues emails a browser can never observe, so every flow that hinges on one (a
 * verification link, a reset link, an order confirmation) would be untestable end to end without
 * this: handlers record what they would have sent, `GET /__mock/emails` (account module) serves
 * the list, and a spec follows the `token` exactly as a person follows the link in their inbox.
 */
export interface MockSentEmail {
    to: string;
    subject: string;
    /** The BE template this stands in for, so a record reads as the email it mirrors. */
    template: string;
    /** The link's payload, for the flows whose whole point is spending it. */
    token?: string;
    /** The bought lines, for the order confirmation. */
    lines?: string[];
}

const MOCK_OUTBOX_KEY = 'mock_outbox';

const readStoredOutbox = (): MockSentEmail[] => {
    const raw = tryGetSessionStorage(MOCK_OUTBOX_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw) as MockSentEmail[];
    } catch {
        return [];
    }
};

/**
 * Newest first, like an inbox. Cleared by `resetMockDatabase` with everything else.
 *
 * Mirrored through sessionStorage like the session id, and for the same reason: the flows these
 * emails carry deliberately CROSS full page loads — a confirm page is opened from the link in the
 * email — and the in-memory outbox dies with the page that recorded it.
 */
export const mockOutbox: MockSentEmail[] = readStoredOutbox();

export const recordMockEmail = (email: MockSentEmail): void => {
    mockOutbox.unshift(email);
    trySetSessionStorage(MOCK_OUTBOX_KEY, JSON.stringify(mockOutbox));
};

/**
 * Called by the /__mock/reset MSW endpoint, which `cy.resetState()` hits under the mock profile.
 * Always resets to no session (undefined) regardless of the dev-mode default, so each Cypress test
 * starts as an unauthenticated visitor.
 */
export const resetMockDatabase = async (): Promise<void> => {
    trySetSessionStorage(MOCK_USER_ID_KEY, ''); // '' = "no session" sentinel
    await populateMockDatabase();
    mockDatabase.currentAuthenticatedUserId = undefined;
    mockOutbox.length = 0;
    trySetSessionStorage(MOCK_OUTBOX_KEY, '');
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
 * The `hardDelete` flag, as the delete surface's three spellings carry it.
 *
 * One definition because it is one fact: a query entry is always a string, a JSON body carries a
 * real boolean, and a `/hard` path segment carries neither — the caller passes `true` outright.
 * That multi-source read is the BE's `surface: 'delete'`, and a mock that recognised only one
 * spelling would answer a soft delete where the real API performs a hard one.
 *
 * @param url - The request URL, whose query string may carry the flag.
 * @param body - A parsed JSON body, which may carry it as a real boolean.
 * @returns Whether the caller asked for a permanent delete.
 */
export const readHardDeleteFlag = (
    url: string | undefined,
    body?: Record<string, unknown>
): boolean => {
    const query = getQueryParameters(url, body);
    return query.hardDelete === true || String(query.hardDelete) === 'true';
};

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
 * Mirrors `BE src/repositories/orders.ts` `visibleScope()`:
 *
 *     { ...ownerScope(userId), deletedAt: { $exists: false } }
 *
 * The order equivalent of `isVisibleToCaller` above, and deliberately a separate function
 * rather than a shared one: an order has no `active` flag, so `deletedAt` is the only fact
 * that hides it. Ownership is the other half of the BE scope and is applied separately here,
 * by `getMockUserScope`.
 *
 * Admins see soft-deleted orders; nobody else does, not even the order's own owner.
 */
export const isOrderVisibleToCaller = (order: Order, admin: boolean): boolean =>
    admin || !order.deletedAt;

/**
 * Mirrors `BE src/infrastructure/http/scopes.ts` `userScope()`, used by the order endpoints:
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
