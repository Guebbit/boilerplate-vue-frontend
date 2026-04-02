import MockAdapter from 'axios-mock-adapter';
import httpClient from '@/utils/http.ts';
import {
    OrderStatusEnum,
    type CartItem,
    type CartResponse,
    type CartSummaryResponse,
    type LoginRequest,
    type MessageResponse,
    type Order,
    type OrdersResponse,
    type PaginationMeta,
    type Product,
    type ProductsResponse,
    type RefreshTokenResponse,
    type UpdateOrderByIdRequest,
    type UpdateOrderRequest,
    type User,
    type UsersResponse
} from '@types';

let mockAdapterInstance: MockAdapter | undefined;

const getIsoDateNow = () => new Date().toISOString();

const createMessageResponse = (message: string): MessageResponse => ({
    success: true,
    message
});

const parseValue = (value: FormDataEntryValue | unknown) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
    return value;
};

const parseRequestBody = <T>(data: unknown): Partial<T> => {
    if (!data) return {};
    if (typeof FormData !== 'undefined' && data instanceof FormData) {
        const parsedData: Record<string, unknown> = {};
        for (const [key, value] of data.entries()) parsedData[key] = parseValue(value);
        return parsedData as Partial<T>;
    }
    if (typeof data === 'string') {
        try {
            return JSON.parse(data) as Partial<T>;
        }
        catch {
            return {};
        }
    }
    if (typeof data === 'object') return data as Partial<T>;
    return {};
};

const getPathSegments = (url: string | undefined) =>
    new URL(url ?? '', 'http://localhost').pathname.split('/').filter(Boolean);

const getQueryParameters = (url: string | undefined, params?: unknown) => {
    const parsedUrl = new URL(url ?? '', 'http://localhost');
    const queryFromUrl = Object.fromEntries(parsedUrl.searchParams.entries());
    return {
        ...queryFromUrl,
        ...(typeof params === 'object' && params ? params as Record<string, unknown> : {})
    };
};

const toBooleanOrUndefined = (value: unknown) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
};

const toNumberOrDefault = (value: unknown, defaultValue: number) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : defaultValue;
};

const toPaginationMeta = (itemCount: number, page: number, pageSize: number): PaginationMeta => ({
    page,
    pageSize,
    totalItems: itemCount,
    totalPages: Math.ceil(itemCount / pageSize)
});

const slicePaginatedData = <T>(items: T[], page: number, pageSize: number) =>
    items.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

const createMockInvoicePdf = () =>
    new TextEncoder().encode('%PDF-1.4\n% Mock invoice PDF\n').buffer;

const currentAuthenticatedUserId = 'user-1';

const sampleUsers: User[] = [
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
];

const sampleProducts: Product[] = [
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
];

let sampleCartItems: CartItem[] = [
    {
        productId: 'prod-1',
        quantity: 1
    },
    {
        productId: 'prod-2',
        quantity: 2
    }
];

const calculateCartSummary = (): CartSummaryResponse => {
    const totalQuantity = sampleCartItems.reduce((sum, item) => sum + item.quantity, 0);
    const total = sampleCartItems.reduce((sum, item) => {
        const currentProduct = sampleProducts.find(({ id }) => id === item.productId);
        return sum + (currentProduct?.price ?? 0) * item.quantity;
    }, 0);
    return {
        itemsCount: sampleCartItems.length,
        totalQuantity,
        total,
        currency: 'EUR'
    };
};

const getCartResponse = (): CartResponse => ({
    items: sampleCartItems,
    summary: calculateCartSummary()
});

const createMockOrder = (
    values: Pick<Order, 'userId' | 'email' | 'items'> & Pick<Partial<Order>, 'status' | 'notes'>
): Order => {
    const total = values.items.reduce((sum, item) => {
        const currentProduct = sampleProducts.find(({ id }) => id === item.productId);
        return sum + (currentProduct?.price ?? 0) * item.quantity;
    }, 0);
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

let sampleOrders: Order[] = [
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

const replyUsersList = (url: string | undefined, params?: unknown): [number, UsersResponse] => {
    const query = getQueryParameters(url, params);
    const page = toNumberOrDefault(query.page, 1);
    const pageSize = toNumberOrDefault(query.pageSize, 10);
    const text = String(query.text ?? '').trim().toLowerCase();
    const id = query.id ? String(query.id) : undefined;
    const email = query.email ? String(query.email).toLowerCase() : undefined;
    const username = query.username ? String(query.username).toLowerCase() : undefined;
    const active = toBooleanOrUndefined(query.active);

    const filteredItems = sampleUsers.filter((user) => {
        if (id && user.id !== id) return false;
        if (email && !user.email.toLowerCase().includes(email)) return false;
        if (username && !user.username.toLowerCase().includes(username)) return false;
        if (typeof active === 'boolean' && user.active !== active) return false;
        if (
            text &&
            !user.email.toLowerCase().includes(text) &&
            !user.username.toLowerCase().includes(text) &&
            !user.id.toLowerCase().includes(text)
        ) return false;
        return true;
    });

    return [
        200,
        {
            items: slicePaginatedData(filteredItems, page, pageSize),
            meta: toPaginationMeta(filteredItems.length, page, pageSize)
        }
    ];
};

const replyProductsList = (url: string | undefined, params?: unknown): [number, ProductsResponse] => {
    const query = getQueryParameters(url, params);
    const page = toNumberOrDefault(query.page, 1);
    const pageSize = toNumberOrDefault(query.pageSize, 10);
    const text = String(query.text ?? '').trim().toLowerCase();
    const id = query.id ?? query.productId ? String(query.id ?? query.productId) : undefined;
    const minPrice = query.minPrice !== undefined ? Number(query.minPrice) : undefined;
    const maxPrice = query.maxPrice !== undefined ? Number(query.maxPrice) : undefined;

    const filteredItems = sampleProducts.filter((product) => {
        if (id && product.id !== id) return false;
        if (Number.isFinite(minPrice) && product.price < (minPrice as number)) return false;
        if (Number.isFinite(maxPrice) && product.price > (maxPrice as number)) return false;
        if (
            text &&
            !product.id.toLowerCase().includes(text) &&
            !product.title.toLowerCase().includes(text) &&
            !(product.description ?? '').toLowerCase().includes(text)
        ) return false;
        return true;
    });

    return [
        200,
        {
            items: slicePaginatedData(filteredItems, page, pageSize),
            meta: toPaginationMeta(filteredItems.length, page, pageSize)
        }
    ];
};

const replyOrdersList = (url: string | undefined, params?: unknown): [number, OrdersResponse] => {
    const query = getQueryParameters(url, params);
    const page = toNumberOrDefault(query.page, 1);
    const pageSize = toNumberOrDefault(query.pageSize, 10);
    const id = query.id ? String(query.id) : undefined;
    const userId = query.userId ? String(query.userId) : undefined;
    const productId = query.productId ? String(query.productId) : undefined;
    const email = query.email ? String(query.email).toLowerCase() : undefined;

    const filteredItems = sampleOrders.filter((order) => {
        if (id && order.id !== id) return false;
        if (userId && order.userId !== userId) return false;
        if (email && !order.email.toLowerCase().includes(email)) return false;
        if (productId && !order.items.some((item) => item.productId === productId)) return false;
        return true;
    });

    return [
        200,
        {
            items: slicePaginatedData(filteredItems, page, pageSize),
            meta: toPaginationMeta(filteredItems.length, page, pageSize)
        }
    ];
};

const defaultRefreshTokenResponse: RefreshTokenResponse = {
    token: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresIn: 3600
};

export const initializeApiMocking = () => {
    const shouldEnableMock = import.meta.env.VITE_API_MOCK_ENABLED === 'true';
    if (!shouldEnableMock) return undefined;
    if (mockAdapterInstance) return mockAdapterInstance;

    const mockAdapter = new MockAdapter(httpClient, {
        delayResponse: 250,
        onNoMatch: 'passthrough'
    });

    mockAdapter.onGet(/\/account\/refresh\/[^/?]+(?:\?.*)?$/).reply(200, defaultRefreshTokenResponse);
    mockAdapter.onGet(/\/account\/refresh(?:\?.*)?$/).reply(200, defaultRefreshTokenResponse);

    mockAdapter.onGet(/\/account(?:\?.*)?$/).reply(() => {
        const currentUser = sampleUsers.find((user) => user.id === currentAuthenticatedUserId) ?? sampleUsers[0];
        return [200, currentUser];
    });

    mockAdapter.onPost(/\/account\/login(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<LoginRequest>(config.data);
        const matchedUser = sampleUsers.find((user) =>
            user.email.toLowerCase() === String(requestBody.email ?? '').toLowerCase()
        );
        if (!matchedUser) return [401, { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } }];
        return [200, { token: `mock-token-for-${matchedUser.id}`, refreshToken: 'mock-refresh-token', expiresIn: 3600 }];
    });

    mockAdapter.onPost(/\/account\/signup(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const createdUser: User = {
            id: `user-${Date.now()}`,
            email: String(requestBody.email ?? 'new.user@example.com'),
            username: String(requestBody.username ?? 'new-user'),
            admin: false,
            active: true,
            imageUrl: '',
            createdAt: getIsoDateNow(),
            updatedAt: getIsoDateNow()
        };
        sampleUsers.unshift(createdUser);
        return [201, createdUser];
    });

    mockAdapter.onPost(/\/account\/reset(?:\?.*)?$/).reply(200, createMessageResponse('Password reset email sent'));
    mockAdapter.onPost(/\/account\/reset-confirm(?:\?.*)?$/).reply(200, createMessageResponse('Password reset confirmed'));
    mockAdapter.onPost(/\/account\/logout-all(?:\?.*)?$/).reply(200, createMessageResponse('Logged out from all devices'));
    mockAdapter.onDelete(/\/account\/tokens\/expired(?:\?.*)?$/).reply(200, createMessageResponse('Expired tokens removed'));

    mockAdapter.onGet(/\/users(?:\?.*)?$/).reply((config) => replyUsersList(config.url, config.params));

    mockAdapter.onPost(/\/users(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const createdUser: User = {
            id: `user-${Date.now()}`,
            email: String(requestBody.email ?? 'created.user@example.com'),
            username: String(requestBody.username ?? 'created-user'),
            admin: Boolean(requestBody.admin),
            active: requestBody.active === undefined ? true : Boolean(requestBody.active),
            imageUrl: '',
            createdAt: getIsoDateNow(),
            updatedAt: getIsoDateNow()
        };
        sampleUsers.unshift(createdUser);
        return [201, createdUser];
    });

    mockAdapter.onPut(/\/users(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const targetId = String(requestBody.id ?? currentAuthenticatedUserId);
        const targetIndex = sampleUsers.findIndex(({ id }) => id === targetId);
        if (targetIndex < 0) return [404, { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }];

        const updatedUser: User = {
            ...sampleUsers[targetIndex],
            email: requestBody.email ? String(requestBody.email) : sampleUsers[targetIndex].email,
            username: requestBody.username ? String(requestBody.username) : sampleUsers[targetIndex].username,
            active: requestBody.active === undefined ? sampleUsers[targetIndex].active : Boolean(requestBody.active),
            updatedAt: getIsoDateNow()
        };
        sampleUsers[targetIndex] = updatedUser;
        return [200, updatedUser];
    });

    mockAdapter.onDelete(/\/users(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const targetId = String(requestBody.id ?? '');
        const targetIndex = sampleUsers.findIndex(({ id }) => id === targetId);
        if (targetIndex < 0) return [404, { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }];
        sampleUsers.splice(targetIndex, 1);
        return [200, createMessageResponse('User deleted')];
    });

    mockAdapter.onPost(/\/users\/search(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        return replyUsersList(config.url, requestBody);
    });

    mockAdapter.onGet(/\/users\/[^/]+(?:\?.*)?$/).reply((config) => {
        const userId = getPathSegments(config.url).at(-1);
        const targetUser = sampleUsers.find((user) => user.id === userId);
        if (!targetUser) return [404, { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }];
        return [200, targetUser];
    });

    mockAdapter.onPut(/\/users\/[^/]+(?:\?.*)?$/).reply((config) => {
        const userId = getPathSegments(config.url).at(-1);
        const targetIndex = sampleUsers.findIndex(({ id }) => id === userId);
        if (targetIndex < 0) return [404, { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }];
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const updatedUser: User = {
            ...sampleUsers[targetIndex],
            email: requestBody.email ? String(requestBody.email) : sampleUsers[targetIndex].email,
            username: requestBody.username ? String(requestBody.username) : sampleUsers[targetIndex].username,
            updatedAt: getIsoDateNow()
        };
        sampleUsers[targetIndex] = updatedUser;
        return [200, updatedUser];
    });

    mockAdapter.onDelete(/\/users\/[^/]+(?:\?.*)?$/).reply((config) => {
        const userId = getPathSegments(config.url).at(-1);
        const targetIndex = sampleUsers.findIndex(({ id }) => id === userId);
        if (targetIndex < 0) return [404, { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } }];
        sampleUsers.splice(targetIndex, 1);
        return [200, createMessageResponse('User deleted')];
    });

    mockAdapter.onGet(/\/products(?:\?.*)?$/).reply((config) => replyProductsList(config.url, config.params));

    mockAdapter.onPost(/\/products(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const createdProduct: Product = {
            id: `prod-${Date.now()}`,
            title: String(requestBody.title ?? 'New product'),
            description: requestBody.description ? String(requestBody.description) : '',
            price: Number(requestBody.price ?? 0),
            active: requestBody.active === undefined ? true : Boolean(requestBody.active),
            imageUrl: '',
            createdAt: getIsoDateNow(),
            updatedAt: getIsoDateNow()
        };
        sampleProducts.unshift(createdProduct);
        return [201, createdProduct];
    });

    mockAdapter.onPut(/\/products(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const targetId = String(requestBody.id ?? '');
        const targetIndex = sampleProducts.findIndex(({ id }) => id === targetId);
        if (targetIndex < 0) return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }];
        const updatedProduct: Product = {
            ...sampleProducts[targetIndex],
            title: requestBody.title ? String(requestBody.title) : sampleProducts[targetIndex].title,
            description: requestBody.description !== undefined ? String(requestBody.description) : sampleProducts[targetIndex].description,
            price: requestBody.price !== undefined ? Number(requestBody.price) : sampleProducts[targetIndex].price,
            active: requestBody.active === undefined ? sampleProducts[targetIndex].active : Boolean(requestBody.active),
            updatedAt: getIsoDateNow()
        };
        sampleProducts[targetIndex] = updatedProduct;
        return [200, updatedProduct];
    });

    mockAdapter.onDelete(/\/products(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const targetId = String(requestBody.id ?? '');
        const targetIndex = sampleProducts.findIndex(({ id }) => id === targetId);
        if (targetIndex < 0) return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }];
        sampleProducts.splice(targetIndex, 1);
        return [200, createMessageResponse('Product deleted')];
    });

    mockAdapter.onPost(/\/products\/search(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        return replyProductsList(config.url, requestBody);
    });

    mockAdapter.onGet(/\/products\/[^/]+(?:\?.*)?$/).reply((config) => {
        const productId = getPathSegments(config.url).at(-1);
        const targetProduct = sampleProducts.find((product) => product.id === productId);
        if (!targetProduct) return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }];
        return [200, targetProduct];
    });

    mockAdapter.onPut(/\/products\/[^/]+(?:\?.*)?$/).reply((config) => {
        const productId = getPathSegments(config.url).at(-1);
        const targetIndex = sampleProducts.findIndex(({ id }) => id === productId);
        if (targetIndex < 0) return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }];
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const updatedProduct: Product = {
            ...sampleProducts[targetIndex],
            title: requestBody.title ? String(requestBody.title) : sampleProducts[targetIndex].title,
            description: requestBody.description !== undefined ? String(requestBody.description) : sampleProducts[targetIndex].description,
            price: requestBody.price !== undefined ? Number(requestBody.price) : sampleProducts[targetIndex].price,
            active: requestBody.active === undefined ? sampleProducts[targetIndex].active : Boolean(requestBody.active),
            updatedAt: getIsoDateNow()
        };
        sampleProducts[targetIndex] = updatedProduct;
        return [200, updatedProduct];
    });

    mockAdapter.onDelete(/\/products\/[^/]+(?:\?.*)?$/).reply((config) => {
        const productId = getPathSegments(config.url).at(-1);
        const targetIndex = sampleProducts.findIndex(({ id }) => id === productId);
        if (targetIndex < 0) return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }];
        sampleProducts.splice(targetIndex, 1);
        return [200, createMessageResponse('Product deleted')];
    });

    mockAdapter.onGet(/\/cart\/summary(?:\?.*)?$/).reply(() => [200, calculateCartSummary()]);

    mockAdapter.onGet(/\/cart(?:\?.*)?$/).reply(() => [200, getCartResponse()]);

    mockAdapter.onPost(/\/cart(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const productId = String(requestBody.productId ?? '');
        const quantity = Math.max(0, Number(requestBody.quantity ?? 0));
        if (!sampleProducts.some((product) => product.id === productId))
            return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }];

        const existingItemIndex = sampleCartItems.findIndex((item) => item.productId === productId);
        if (existingItemIndex < 0) sampleCartItems.push({ productId, quantity: quantity || 1 });
        else sampleCartItems[existingItemIndex].quantity = quantity || sampleCartItems[existingItemIndex].quantity;
        sampleCartItems = sampleCartItems.filter((item) => item.quantity > 0);
        return [200, getCartResponse()];
    });

    mockAdapter.onDelete(/\/cart(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const productId = requestBody.productId ? String(requestBody.productId) : undefined;
        if (!productId) {
            sampleCartItems = [];
            return [200, getCartResponse()];
        }
        sampleCartItems = sampleCartItems.filter((item) => item.productId !== productId);
        return [200, getCartResponse()];
    });

    mockAdapter.onPut(/\/cart\/[^/]+(?:\?.*)?$/).reply((config) => {
        const productId = getPathSegments(config.url).at(-1);
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const quantity = Math.max(0, Number(requestBody.quantity ?? 0));
        if (!productId || !sampleProducts.some((product) => product.id === productId))
            return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }];
        const existingItemIndex = sampleCartItems.findIndex((item) => item.productId === productId);
        if (existingItemIndex < 0) sampleCartItems.push({ productId, quantity: quantity || 1 });
        else sampleCartItems[existingItemIndex].quantity = quantity;
        sampleCartItems = sampleCartItems.filter((item) => item.quantity > 0);
        return [200, getCartResponse()];
    });

    mockAdapter.onDelete(/\/cart\/[^/]+(?:\?.*)?$/).reply((config) => {
        const productId = getPathSegments(config.url).at(-1);
        sampleCartItems = sampleCartItems.filter((item) => item.productId !== productId);
        return [200, getCartResponse()];
    });

    mockAdapter.onPost(/\/cart\/checkout(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const email = String(requestBody.email ?? (sampleUsers.find((user) => user.id === currentAuthenticatedUserId)?.email ?? 'mock@example.com'));
        const createdOrder = createMockOrder({
            userId: currentAuthenticatedUserId,
            email,
            items: sampleCartItems,
            notes: requestBody.notes ? String(requestBody.notes) : undefined,
            status: OrderStatusEnum.Pending
        });
        sampleOrders.unshift(createdOrder);
        sampleCartItems = [];
        return [201, { order: createdOrder, message: 'Checkout completed' }];
    });

    mockAdapter.onGet(/\/orders\/[^/]+\/invoice(?:\?.*)?$/).reply(200, createMockInvoicePdf(), {
        'Content-Type': 'application/pdf'
    });

    mockAdapter.onGet(/\/orders(?:\?.*)?$/).reply((config) => replyOrdersList(config.url, config.params));

    mockAdapter.onPost(/\/orders(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const createdOrder = createMockOrder({
            userId: String(requestBody.userId ?? currentAuthenticatedUserId),
            email: String(requestBody.email ?? 'order@example.com'),
            items: Array.isArray(requestBody.items) ? requestBody.items as CartItem[] : [],
            notes: requestBody.notes ? String(requestBody.notes) : undefined,
            status: OrderStatusEnum.Pending
        });
        sampleOrders.unshift(createdOrder);
        return [201, createdOrder];
    });

    mockAdapter.onPut(/\/orders(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<UpdateOrderRequest>(config.data);
        const targetIndex = sampleOrders.findIndex(({ id }) => id === requestBody.id);
        if (targetIndex < 0) return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }];
        const updatedOrder: Order = {
            ...sampleOrders[targetIndex],
            userId: requestBody.userId ?? sampleOrders[targetIndex].userId,
            email: requestBody.email ?? sampleOrders[targetIndex].email,
            items: requestBody.items ?? sampleOrders[targetIndex].items,
            status: requestBody.status ?? sampleOrders[targetIndex].status,
            updatedAt: getIsoDateNow()
        };
        sampleOrders[targetIndex] = updatedOrder;
        return [200, updatedOrder];
    });

    mockAdapter.onDelete(/\/orders(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const targetId = String(requestBody.id ?? '');
        const targetIndex = sampleOrders.findIndex(({ id }) => id === targetId);
        if (targetIndex < 0) return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }];
        sampleOrders.splice(targetIndex, 1);
        return [200, createMessageResponse('Order deleted')];
    });

    mockAdapter.onPost(/\/orders\/search(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        return replyOrdersList(config.url, requestBody);
    });

    mockAdapter.onGet(/\/orders\/[^/]+(?:\?.*)?$/).reply((config) => {
        const orderId = getPathSegments(config.url).at(-1);
        const targetOrder = sampleOrders.find((order) => order.id === orderId);
        if (!targetOrder) return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }];
        return [200, targetOrder];
    });

    mockAdapter.onPut(/\/orders\/[^/]+(?:\?.*)?$/).reply((config) => {
        const orderId = getPathSegments(config.url).at(-1);
        const targetIndex = sampleOrders.findIndex(({ id }) => id === orderId);
        if (targetIndex < 0) return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }];
        const requestBody = parseRequestBody<UpdateOrderByIdRequest>(config.data);
        const updatedOrder: Order = {
            ...sampleOrders[targetIndex],
            userId: requestBody.userId ?? sampleOrders[targetIndex].userId,
            email: requestBody.email ?? sampleOrders[targetIndex].email,
            items: requestBody.items ?? sampleOrders[targetIndex].items,
            status: requestBody.status ?? sampleOrders[targetIndex].status,
            updatedAt: getIsoDateNow()
        };
        sampleOrders[targetIndex] = updatedOrder;
        return [200, updatedOrder];
    });

    mockAdapter.onDelete(/\/orders\/[^/]+(?:\?.*)?$/).reply((config) => {
        const orderId = getPathSegments(config.url).at(-1);
        const targetIndex = sampleOrders.findIndex(({ id }) => id === orderId);
        if (targetIndex < 0) return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }];
        sampleOrders.splice(targetIndex, 1);
        return [200, createMessageResponse('Order deleted')];
    });

    mockAdapterInstance = mockAdapter;
    return mockAdapterInstance;
};

