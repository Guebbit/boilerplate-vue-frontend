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

// Shared timestamp utility to keep fixture updates consistent.
export const getIsoDateNow = () => new Date().toISOString();

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

// IDs, credentials and content below mirror db/seeds/index.ts in the BE (PROPOSAL §6-A), so the
// same login and the same records work against both MSW and the real API.
//
// Each of these is a factory, not a plain array: handlers mutate items in place (splice, unshift,
// index-assignment), so `resetMockDatabase` needs genuinely fresh objects on every call, not a
// second reference to the same mutated ones.
const createSeedUsers = (): User[] => [
    {
        id: '65dd2bdb923652b7800fe180',
        email: 'root@root.it',
        username: 'root',
        admin: true,
        active: true,
        imageUrl: undefined,
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    },
    {
        id: '65de646a44f861fd83c13f13',
        email: 'gino@pino.it',
        username: 'ginopinoshow',
        admin: false,
        active: true,
        imageUrl: undefined,
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    }
];

const createSeedProducts = (): Product[] => [
    {
        id: '65dc8a99604c307b702b5ccc',
        title: 'Sallyno Panino',
        description: 'Piccolo Sallyno panino. Da mangiare di coccole',
        price: 100,
        active: true,
        imageUrl: undefined,
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    },
    {
        id: '65dc8ad8604c307b702b5cd4',
        title: 'Sallyno Carino',
        description: 'Sallyno incredibilmente carino. Illegale in 400 paesi. Soft deleted product.',
        price: 50,
        active: true,
        imageUrl: undefined,
        deletedAt: '2024-02-26T23:34:44.832Z',
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    },
    {
        id: '65dc9be92f2794d1c16741e1',
        title: 'Miciona inutile',
        description: 'Miciona inutile, piccolo catorcio che come lavoro produce pelo a non finire',
        price: 1,
        active: true,
        imageUrl: undefined,
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    },
    {
        id: '65dcdec2b18ad5e4bd597f0f',
        title: 'Micino pufettino',
        description: 'Micino pufettino, incredibilmente pufino. Illegale in 400 paesi.',
        price: 77,
        active: true,
        imageUrl: undefined,
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    },
    {
        id: '6622c88a5123b1e286f440f8',
        title: 'Bundle micini',
        description: 'Produttori di rumori molesti a tutte le ore. Inactive product.',
        price: 40,
        active: false,
        imageUrl: undefined,
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    }
];

const createInitialMockDatabase = () => {
    const sampleProducts = createSeedProducts();

    // Mirrors the admin's embedded `cart.items` in the seed: 2x Sallyno Panino, 3x Micino pufettino.
    const sampleCartItems: CartItem[] = [
        {
            productId: '65dc8a99604c307b702b5ccc',
            quantity: 2
        },
        {
            productId: '65dcdec2b18ad5e4bd597f0f',
            quantity: 3
        }
    ];

    const createOrder = (
        values: Pick<Order, 'userId' | 'email' | 'items'> & Pick<Partial<Order>, 'status' | 'notes'>
    ): Order => {
        let total = 0;
        for (const item of values.items) {
            total += (item.product?.price ?? 0) * item.quantity;
        }
        return {
            id: `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            userId: values.userId,
            email: values.email,
            items: values.items,
            total,
            status: values.status ?? 'pending',
            notes: values.notes,
            createdAt: getIsoDateNow(),
            updatedAt: getIsoDateNow()
        };
    };

    // Mirrors the two seeded orders (db/seeds/index.ts), both placed by root.
    const sampleOrders: Order[] = [
        createOrder({
            userId: '65dd2bdb923652b7800fe180',
            email: 'oldpsw@root.it',
            items: [
                { product: sampleProducts[0], quantity: 1 },
                { product: sampleProducts[2], quantity: 10 }
            ],
            status: 'pending'
        }),
        createOrder({
            userId: '65dd2bdb923652b7800fe180',
            email: 'root@root.it',
            items: [{ product: sampleProducts[3], quantity: 20 }],
            status: 'pending'
        })
    ];

    // Sentinel convention for currentAuthenticatedUserId:
    //   undefined key  → never set (fresh browser) → default to root (admin)
    //   '' (empty str) → explicitly logged out / reset → no session
    //   '<id>'         → actively logged-in user
    const storedUserId = tryGetSessionStorage(MOCK_USER_ID_KEY);
    return {
        currentAuthenticatedUserId:
            storedUserId === undefined ? '65dd2bdb923652b7800fe180' : storedUserId || undefined,
        sampleUsers: createSeedUsers(),
        sampleProducts,
        sampleCartItems,
        sampleOrders
    };
};

// Single shared in-memory store mutated by all handlers.
export const mockDatabase: {
    currentAuthenticatedUserId: string | undefined;
    sampleUsers: User[];
    sampleProducts: Product[];
    sampleCartItems: CartItem[];
    sampleOrders: Order[];
} = createInitialMockDatabase();

// Called by the /__mock/reset MSW endpoint (cy.resetMockState()).
// Always resets to no session (undefined) regardless of the dev-mode default,
// so each Cypress test starts as an unauthenticated visitor.
export const resetMockDatabase = () => {
    trySetSessionStorage(MOCK_USER_ID_KEY, ''); // '' = "no session" sentinel
    const initialMockDatabase = createInitialMockDatabase();
    mockDatabase.currentAuthenticatedUserId = undefined;
    mockDatabase.sampleUsers = initialMockDatabase.sampleUsers;
    mockDatabase.sampleProducts = initialMockDatabase.sampleProducts;
    mockDatabase.sampleCartItems = initialMockDatabase.sampleCartItems;
    mockDatabase.sampleOrders = initialMockDatabase.sampleOrders;
};

export const calculateCartSummary = (): CartSummaryResponse => {
    let totalQuantity = 0;
    let total = 0;
    for (const item of mockDatabase.sampleCartItems) {
        const currentProduct = mockDatabase.sampleProducts.find(({ id }) => id === item.productId);
        totalQuantity += item.quantity;
        total += (currentProduct?.price ?? 0) * item.quantity;
    }
    return {
        itemsCount: mockDatabase.sampleCartItems.length,
        totalQuantity,
        total,
        currency: 'EUR'
    };
};

// Conversion helper used when cart payloads become order payloads.
export const cartItemToOrderItem = (item: CartItem): OrderItem => ({
    product: mockDatabase.sampleProducts.find(({ id }) => id === item.productId)!,
    quantity: item.quantity
});

export const getCartResponse = (): CartResponse => ({
    items: mockDatabase.sampleCartItems,
    summary: calculateCartSummary()
});

export const createMockOrder = (
    values: Pick<Order, 'userId' | 'email' | 'items'> & Pick<Partial<Order>, 'status' | 'notes'>
): Order => {
    let total = 0;
    for (const item of values.items) {
        total += (item.product?.price ?? 0) * item.quantity;
    }
    return {
        id: `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: values.userId,
        email: values.email,
        items: values.items,
        total,
        status: values.status ?? 'pending',
        notes: values.notes,
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    };
};

export const defaultRefreshTokenResponse: RefreshTokenResponse = {
    token: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600
};
