import {
    OrderStatusEnum,
    type CartItem,
    type CartResponse,
    type CartSummaryResponse,
    type MessageResponse,
    type Order,
    type PaginationMeta,
    type Product,
    type RefreshTokenResponse,
    type User
} from '@types';

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

export const mockDatabase: {
    currentAuthenticatedUserId: string;
    sampleUsers: User[];
    sampleProducts: Product[];
    sampleCartItems: CartItem[];
    sampleOrders: Order[];
} = {
    currentAuthenticatedUserId: 'user-1',
    sampleUsers: [
        {
            id: 'user-1',
            email: 'admin@example.com',
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
    ],
    sampleProducts: [
        {
            id: 'prod-1',
            title: 'Keyboard',
            description: 'Mechanical keyboard',
            price: 109.9,
            active: true,
            imageUrl: '',
            createdAt: getIsoDateNow(),
            updatedAt: getIsoDateNow()
        },
        {
            id: 'prod-2',
            title: 'Mouse',
            description: 'Wireless mouse',
            price: 39.5,
            active: true,
            imageUrl: '',
            createdAt: getIsoDateNow(),
            updatedAt: getIsoDateNow()
        },
        {
            id: 'prod-3',
            title: 'Headset',
            description: 'Noise-cancelling headset',
            price: 89,
            active: false,
            imageUrl: '',
            createdAt: getIsoDateNow(),
            updatedAt: getIsoDateNow()
        }
    ],
    sampleCartItems: [
        {
            productId: 'prod-1',
            quantity: 1
        },
        {
            productId: 'prod-2',
            quantity: 2
        }
    ],
    sampleOrders: []
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

export const getCartResponse = (): CartResponse => ({
    items: mockDatabase.sampleCartItems,
    summary: calculateCartSummary()
});

export const createMockOrder = (
    values: Pick<Order, 'userId' | 'email' | 'items'> & Pick<Partial<Order>, 'status' | 'notes'>
): Order => {
    let total = 0;
    for (const item of values.items) {
        const currentProduct = mockDatabase.sampleProducts.find(({ id }) => id === item.productId);
        total += (currentProduct?.price ?? 0) * item.quantity;
    }
    return {
        id: `order-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        userId: values.userId,
        email: values.email,
        items: values.items,
        total,
        status: values.status ?? OrderStatusEnum.Pending,
        notes: values.notes,
        createdAt: getIsoDateNow(),
        updatedAt: getIsoDateNow()
    };
};

mockDatabase.sampleOrders = [
    createMockOrder({
        userId: 'user-1',
        email: 'admin@example.com',
        items: [{ productId: 'prod-1', quantity: 1 }],
        status: OrderStatusEnum.Paid
    }),
    createMockOrder({
        userId: 'user-2',
        email: 'john@example.com',
        items: [{ productId: 'prod-2', quantity: 3 }],
        status: OrderStatusEnum.Processing
    })
];

export const defaultRefreshTokenResponse: RefreshTokenResponse = {
    token: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600
};
