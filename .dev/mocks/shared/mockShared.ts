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
} from '@/types';

// Shared timestamp utility to keep fixture updates consistent.
export const getIsoDateNow = () => new Date().toISOString();

export const createMessageResponse = (message: string): MessageResponse => ({
    success: true,
    message
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
// 'user-1' (admin), silently undoing any login performed in a previous step.
//
// Solution: mirror `currentAuthenticatedUserId` in sessionStorage, which
// survives page reloads within the same browser tab (Cypress runs all steps of
// one test in the same tab). On re-evaluation, `createInitialMockDatabase`
// reads this value and restores the correct user identity.
//
// sessionStorage is cleared between tests by `cy.clearAllSessionStorage()` in
// cypress/support/e2e.ts, and also whenever the `/__mock/reset` endpoint is
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

const createInitialMockDatabase = () => {
    const sampleUsers: User[] = [
        {
            id: 'user-1',
            email: 'root@root.it',
            username: 'admin',
            admin: true,
            active: true,
            imageUrl: '',
            createdAt: getIsoDateNow(),
            updatedAt: getIsoDateNow()
        },
        {
            id: 'user-2',
            email: 'john@example.com',
            username: 'john',
            admin: false,
            active: true,
            imageUrl: '',
            createdAt: getIsoDateNow(),
            updatedAt: getIsoDateNow()
        },
        {
            id: 'user-3',
            email: 'jane@example.com',
            username: 'jane',
            admin: false,
            active: false,
            imageUrl: '',
            createdAt: getIsoDateNow(),
            updatedAt: getIsoDateNow()
        }
    ];

    const sampleProducts: Product[] = [
        {
            id: 'prod-1',
            title: 'Product Alpha',
            description: 'First test product',
            price: 10,
            active: true,
            imageUrl: '',
            createdAt: getIsoDateNow(),
            updatedAt: getIsoDateNow()
        },
        {
            id: 'prod-2',
            title: 'Product Beta',
            description: 'Second test product',
            price: 25.5,
            active: true,
            imageUrl: '',
            createdAt: getIsoDateNow(),
            updatedAt: getIsoDateNow()
        },
        {
            id: 'prod-3',
            title: 'Product Gamma',
            description: 'Third test product',
            price: 20,
            active: false,
            imageUrl: '',
            createdAt: getIsoDateNow(),
            updatedAt: getIsoDateNow()
        }
    ];

    const sampleCartItems: CartItem[] = [
        {
            productId: 'prod-1',
            quantity: 2
        },
        {
            productId: 'prod-2',
            quantity: 1
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

    const sampleOrders: Order[] = [
        createOrder({
            userId: 'user-1',
            email: 'root@root.it',
            items: [
                { product: sampleProducts[0], quantity: 2 },
                { product: sampleProducts[1], quantity: 1 }
            ],
            status: 'pending'
        }),
        createOrder({
            userId: 'user-1',
            email: 'root@root.it',
            items: [{ product: sampleProducts[0], quantity: 2 }],
            status: 'delivered',
            notes: 'Fast delivery please'
        })
    ];

    return {
        // Restored from sessionStorage so that a cy.visit() page reload does not
        // lose the identity set by a preceding login step. Falls back to user-1
        // (admin) when no stored value exists (fresh test, after reset, or SSR).
        currentAuthenticatedUserId: tryGetSessionStorage(MOCK_USER_ID_KEY) ?? 'user-1',
        sampleUsers,
        sampleProducts,
        sampleCartItems,
        sampleOrders
    };
};

// Single shared in-memory store mutated by all handlers.
export const mockDatabase: {
    currentAuthenticatedUserId: string;
    sampleUsers: User[];
    sampleProducts: Product[];
    sampleCartItems: CartItem[];
    sampleOrders: Order[];
} = createInitialMockDatabase();

// Called by the /__mock/reset MSW endpoint (cy.resetMockState()).
// Clears the sessionStorage mirror first so that createInitialMockDatabase
// falls back to 'user-1' instead of the previously logged-in user.
export const resetMockDatabase = () => {
    trySetSessionStorage(MOCK_USER_ID_KEY);
    const initialMockDatabase = createInitialMockDatabase();
    mockDatabase.currentAuthenticatedUserId = initialMockDatabase.currentAuthenticatedUserId;
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
