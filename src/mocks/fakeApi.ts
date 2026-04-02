import type { AxiosAdapter, AxiosRequestConfig, AxiosResponse } from 'axios';
import httpClient from '@/utils/http.ts';
import type {
    AuthTokens,
    CartItem,
    CartResponse,
    CheckoutResponse,
    MessageResponse,
    Order,
    OrderStatusEnum,
    PaginationMeta,
    Product,
    RefreshTokenResponse,
    User
} from '@api';

interface IFakeSuccessResponse<T> {
    success: true;
    status: number;
    message: string;
    data: T;
}

interface IFakeErrorResponse {
    success: false;
    status: number;
    message: string;
    errors: string[];
}

interface IFakeUser extends User {
    password: string;
}

interface IFakeDatabase {
    users: IFakeUser[];
    products: Product[];
    orders: Order[];
    carts: Record<string, CartItem[]>;
    tokens: Record<string, string>;
    tokenCounter: number;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const nowIso = () => new Date().toISOString();

const buildPaginationMeta = (
    page: number,
    pageSize: number,
    totalItems: number
): PaginationMeta => ({
    page,
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)))
});

const paginate = <T>(list: T[], page = 1, pageSize = 10) => {
    const safePage = Math.max(1, page || 1);
    const safePageSize = Math.max(1, pageSize || 10);
    const start = (safePage - 1) * safePageSize;
    const end = start + safePageSize;
    return {
        items: list.slice(start, end),
        meta: buildPaginationMeta(safePage, safePageSize, list.length)
    };
};

const seedDatabase = (): IFakeDatabase => {
    const createdAt = nowIso();
    const rootUser: IFakeUser = {
        id: 'user-root-1',
        email: 'root@root.it',
        username: 'root',
        password: 'RootRoot_123',
        admin: true,
        active: true,
        imageUrl: '',
        createdAt,
        updatedAt: createdAt
    };
    const demoUser: IFakeUser = {
        id: 'user-demo-1',
        email: 'demo@acme.dev',
        username: 'demo-user',
        password: 'DemoDemo_123',
        admin: false,
        active: true,
        imageUrl: '',
        createdAt,
        updatedAt: createdAt
    };

    const products: Product[] = [
        {
            id: 'product-1',
            title: 'Mechanical Keyboard Pro',
            price: 129.99,
            description: 'Hot-swappable switches, RGB backlight',
            active: true,
            imageUrl: '',
            createdAt,
            updatedAt: createdAt
        },
        {
            id: 'product-2',
            title: 'Ergonomic Mouse',
            price: 59.5,
            description: 'Vertical ergonomic design for comfort',
            active: true,
            imageUrl: '',
            createdAt,
            updatedAt: createdAt
        },
        {
            id: 'product-3',
            title: '4K Monitor 27"',
            price: 379,
            description: 'IPS panel with USB-C docking',
            active: true,
            imageUrl: '',
            createdAt,
            updatedAt: createdAt
        }
    ];

    const rootCartItems: CartItem[] = [
        { productId: 'product-1', quantity: 1 },
        { productId: 'product-2', quantity: 2 }
    ];

    const initialOrder: Order = {
        id: 'order-1',
        userId: rootUser.id,
        email: rootUser.email,
        items: [{ productId: 'product-3', quantity: 1 }],
        total: 379,
        status: 'paid',
        notes: 'Initial seeded order',
        createdAt,
        updatedAt: createdAt
    };

    return {
        users: [rootUser, demoUser],
        products,
        orders: [initialOrder],
        carts: {
            [rootUser.id]: rootCartItems,
            [demoUser.id]: []
        },
        tokens: {},
        tokenCounter: 0
    };
};

let fakeDb = seedDatabase();
let isFakeApiInstalled = false;

export const resetFakeApiState = () => {
    fakeDb = seedDatabase();
};

const readUrl = (url = '') => {
    const absolute = url.startsWith('http://') || url.startsWith('https://')
        ? url
        : `http://localhost${url.startsWith('/') ? '' : '/'}${url}`;
    return new URL(absolute);
};

const getHeader = (config: AxiosRequestConfig, key: string) => {
    const headers = config.headers;
    if (!headers) return undefined;
    if (typeof (headers as { get?: (name: string) => unknown }).get === 'function') {
        const value = (headers as { get: (name: string) => unknown }).get(key);
        if (typeof value === 'string') return value;
    }
    const dictionary = headers as Record<string, unknown>;
    const direct = dictionary[key] ?? dictionary[key.toLowerCase()];
    return typeof direct === 'string' ? direct : undefined;
};

const readBody = (config: AxiosRequestConfig): Record<string, unknown> => {
    const rawBody = config.data;
    if (!rawBody) return {};

    if (typeof FormData !== 'undefined' && rawBody instanceof FormData) {
        const data: Record<string, unknown> = {};
        rawBody.forEach((value, key) => {
            data[key] = value;
        });
        return data;
    }

    if (typeof rawBody === 'string') {
        try {
            return JSON.parse(rawBody) as Record<string, unknown>;
        } catch {
            return {};
        }
    }

    return rawBody as Record<string, unknown>;
};

const parseBoolean = (value: unknown, fallback = false): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value.toLowerCase() === 'true';
    return fallback;
};

const parseNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        if (!Number.isNaN(parsed)) return parsed;
    }
    return fallback;
};

const sanitizeUser = (user: IFakeUser): User => {
    const { password: _password, ...safeUser } = user;
    return safeUser;
};

const authError = (): IFakeErrorResponse => ({
    success: false,
    status: 401,
    message: 'Unauthorized',
    errors: ['Unauthorized']
});

const forbiddenError = (): IFakeErrorResponse => ({
    success: false,
    status: 403,
    message: 'Forbidden',
    errors: ['Forbidden']
});

const notFoundError = (): IFakeErrorResponse => ({
    success: false,
    status: 404,
    message: 'Not found',
    errors: ['Not found']
});

const toStatusText = (status: number) =>
    status >= 200 && status < 300 ? 'OK' : 'ERROR';

const response = <T>(
    config: AxiosRequestConfig,
    status: number,
    data: T
): AxiosResponse<T> => ({
    data,
    status,
    statusText: toStatusText(status),
    headers: {},
    config: config as AxiosRequestConfig,
    request: {}
});

const makeSuccess = <T>(status: number, data: T, message = 'ok'): IFakeSuccessResponse<T> => ({
    success: true,
    status,
    message,
    data
});

const makeToken = (userId: string): string => {
    fakeDb.tokenCounter += 1;
    const token = `fake-token-${userId}-${fakeDb.tokenCounter}`;
    fakeDb.tokens[token] = userId;
    return token;
};

const getAuthedUser = (config: AxiosRequestConfig): IFakeUser | undefined => {
    const authorization = getHeader(config, 'Authorization');
    if (!authorization?.startsWith('Bearer ')) return undefined;
    const token = authorization.slice('Bearer '.length);
    const userId = fakeDb.tokens[token];
    return fakeDb.users.find((user) => user.id === userId);
};

const mustBeAuthed = (config: AxiosRequestConfig): IFakeUser | IFakeErrorResponse => {
    const user = getAuthedUser(config);
    return user ?? authError();
};

const mustBeAdmin = (
    config: AxiosRequestConfig
): IFakeUser | IFakeErrorResponse => {
    const user = mustBeAuthed(config);
    if ('errors' in user) return user;
    return user.admin ? user : forbiddenError();
};

const calculateCartResponse = (userId: string): CartResponse => {
    const cartItems = fakeDb.carts[userId] ?? [];
    const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const total = cartItems.reduce((sum, item) => {
        const product = fakeDb.products.find((p) => p.id === item.productId);
        if (!product) return sum;
        return sum + product.price * item.quantity;
    }, 0);

    return {
        items: clone(cartItems),
        summary: {
            itemsCount: cartItems.length,
            totalQuantity,
            total: Math.round(total * 100) / 100,
            currency: 'EUR'
        }
    };
};

const fakeApiHandler = (config: AxiosRequestConfig): AxiosResponse<unknown> => {
    const method = (config.method ?? 'get').toLowerCase();
    const { pathname, searchParams } = readUrl(config.url);
    const body = readBody(config);

    if (method === 'post' && pathname === '/account/login') {
        const email = String(body.email ?? '');
        const password = String(body.password ?? '');
        const user = fakeDb.users.find((item) => item.email === email && item.password === password);
        if (!user) return response(config, 401, authError());

        const authData: AuthTokens = {
            token: makeToken(user.id),
            refreshToken: `fake-refresh-${user.id}`,
            expiresIn: 3600
        };
        return response(config, 200, makeSuccess(200, authData, 'Login successful'));
    }

    if (method === 'post' && pathname === '/account/signup') {
        const userId = `user-${Date.now()}`;
        const createdUser: IFakeUser = {
            id: userId,
            email: String(body.email ?? ''),
            username: String(body.username ?? body.email ?? `user-${fakeDb.users.length + 1}`),
            password: String(body.password ?? 'ChangeMe_123'),
            admin: false,
            active: true,
            imageUrl: '',
            createdAt: nowIso(),
            updatedAt: nowIso()
        };
        fakeDb.users.push(createdUser);
        return response(config, 201, makeSuccess(201, sanitizeUser(createdUser), 'Created'));
    }

    if (method === 'get' && pathname === '/account/refresh') {
        const rootUser = fakeDb.users.find((user) => user.email === 'root@root.it');
        if (!rootUser) return response(config, 500, notFoundError());
        const refreshData: RefreshTokenResponse = {
            token: makeToken(rootUser.id),
            refreshToken: `fake-refresh-${rootUser.id}`,
            expiresIn: 3600
        };
        return response(config, 200, makeSuccess(200, refreshData, 'Token refreshed'));
    }

    if (method === 'post' && pathname === '/account/logout-all') {
        const user = mustBeAuthed(config);
        if ('errors' in user) return response(config, 401, user);
        const tokenToDelete = Object.entries(fakeDb.tokens).find(([, id]) => id === user.id)?.[0];
        if (tokenToDelete) delete fakeDb.tokens[tokenToDelete];
        const success: MessageResponse = { message: 'Logged out' };
        return response(config, 200, makeSuccess(200, success, 'Logged out'));
    }

    if (method === 'get' && pathname === '/account') {
        const user = mustBeAuthed(config);
        if ('errors' in user) return response(config, 401, user);
        return response(config, 200, makeSuccess(200, sanitizeUser(user)));
    }

    if (method === 'get' && pathname === '/products') {
        const page = Number.parseInt(searchParams.get('page') ?? '1', 10);
        const pageSize = Number.parseInt(searchParams.get('pageSize') ?? '10', 10);
        const text = (searchParams.get('text') ?? '').toLowerCase();

        const filtered = text
            ? fakeDb.products.filter(
                (product) =>
                    product.title.toLowerCase().includes(text) ||
                    (product.description ?? '').toLowerCase().includes(text)
            )
            : fakeDb.products;
        const pageData = paginate(filtered, page, pageSize);
        return response(config, 200, makeSuccess(200, pageData));
    }

    if (method === 'get' && pathname.startsWith('/products/')) {
        const productId = pathname.replace('/products/', '');
        const product = fakeDb.products.find((item) => item.id === productId);
        if (!product) return response(config, 404, notFoundError());
        return response(config, 200, makeSuccess(200, clone(product)));
    }

    if (method === 'post' && pathname === '/products') {
        const admin = mustBeAdmin(config);
        if ('errors' in admin) return response(config, admin.status, admin);
        const created: Product = {
            id: `product-${Date.now()}`,
            title: String(body.title ?? 'New product'),
            price: parseNumber(body.price),
            description: String(body.description ?? ''),
            active: parseBoolean(body.active, true),
            imageUrl: '',
            createdAt: nowIso(),
            updatedAt: nowIso()
        };
        fakeDb.products.push(created);
        return response(config, 201, makeSuccess(201, created, 'Created'));
    }

    if (method === 'put' && pathname.startsWith('/products/')) {
        const admin = mustBeAdmin(config);
        if ('errors' in admin) return response(config, admin.status, admin);
        const productId = pathname.replace('/products/', '');
        const product = fakeDb.products.find((item) => item.id === productId);
        if (!product) return response(config, 404, notFoundError());
        product.title = String(body.title ?? product.title);
        product.price = parseNumber(body.price, product.price);
        product.description = String(body.description ?? product.description ?? '');
        product.active = parseBoolean(body.active, Boolean(product.active));
        product.updatedAt = nowIso();
        return response(config, 200, makeSuccess(200, clone(product), 'Updated'));
    }

    if (method === 'delete' && pathname.startsWith('/products/')) {
        const admin = mustBeAdmin(config);
        if ('errors' in admin) return response(config, admin.status, admin);
        const productId = pathname.replace('/products/', '');
        fakeDb.products = fakeDb.products.filter((item) => item.id !== productId);
        return response(config, 200, makeSuccess(200, { message: 'Deleted' }));
    }

    if (method === 'get' && pathname === '/users') {
        const admin = mustBeAdmin(config);
        if ('errors' in admin) return response(config, admin.status, admin);
        const page = Number.parseInt(searchParams.get('page') ?? '1', 10);
        const pageSize = Number.parseInt(searchParams.get('pageSize') ?? '10', 10);
        const items = fakeDb.users.map(sanitizeUser);
        const pageData = paginate(items, page, pageSize);
        return response(config, 200, makeSuccess(200, pageData));
    }

    if (method === 'get' && pathname.startsWith('/users/')) {
        const admin = mustBeAdmin(config);
        if ('errors' in admin) return response(config, admin.status, admin);
        const userId = pathname.replace('/users/', '');
        const user = fakeDb.users.find((item) => item.id === userId);
        if (!user) return response(config, 404, notFoundError());
        return response(config, 200, makeSuccess(200, sanitizeUser(user)));
    }

    if (method === 'post' && pathname === '/users') {
        const admin = mustBeAdmin(config);
        if ('errors' in admin) return response(config, admin.status, admin);
        const createdUser: IFakeUser = {
            id: `user-${Date.now()}`,
            email: String(body.email ?? ''),
            username: String(body.username ?? ''),
            password: String(body.password ?? 'ChangeMe_123'),
            admin: parseBoolean(body.admin),
            active: parseBoolean(body.active, true),
            imageUrl: '',
            createdAt: nowIso(),
            updatedAt: nowIso()
        };
        fakeDb.users.push(createdUser);
        return response(config, 201, makeSuccess(201, sanitizeUser(createdUser), 'Created'));
    }

    if (method === 'put' && pathname.startsWith('/users/')) {
        const admin = mustBeAdmin(config);
        if ('errors' in admin) return response(config, admin.status, admin);
        const userId = pathname.replace('/users/', '');
        const user = fakeDb.users.find((item) => item.id === userId);
        if (!user) return response(config, 404, notFoundError());
        user.email = String(body.email ?? user.email);
        user.username = String(body.username ?? user.username);
        if (body.password) user.password = String(body.password);
        if (body.admin !== undefined) user.admin = parseBoolean(body.admin);
        if (body.active !== undefined) user.active = parseBoolean(body.active);
        user.updatedAt = nowIso();
        return response(config, 200, makeSuccess(200, sanitizeUser(user), 'Updated'));
    }

    if (method === 'delete' && pathname.startsWith('/users/')) {
        const admin = mustBeAdmin(config);
        if ('errors' in admin) return response(config, admin.status, admin);
        const userId = pathname.replace('/users/', '');
        fakeDb.users = fakeDb.users.filter((item) => item.id !== userId);
        return response(config, 200, makeSuccess(200, { message: 'Deleted' }));
    }

    if (method === 'get' && pathname === '/cart') {
        const user = mustBeAuthed(config);
        if ('errors' in user) return response(config, 401, user);
        return response(config, 200, makeSuccess(200, calculateCartResponse(user.id)));
    }

    if (method === 'post' && pathname === '/cart') {
        const user = mustBeAuthed(config);
        if ('errors' in user) return response(config, 401, user);
        const productId = String(body.productId ?? '');
        const quantity = Math.max(1, parseNumber(body.quantity, 1));
        const cartItems = fakeDb.carts[user.id] ?? [];
        const existing = cartItems.find((item) => item.productId === productId);
        if (existing) existing.quantity = quantity;
        else cartItems.push({ productId, quantity });
        fakeDb.carts[user.id] = cartItems;
        return response(config, 200, makeSuccess(200, calculateCartResponse(user.id)));
    }

    if (method === 'put' && pathname.startsWith('/cart/')) {
        const user = mustBeAuthed(config);
        if ('errors' in user) return response(config, 401, user);
        const productId = pathname.replace('/cart/', '');
        const quantity = Math.max(1, parseNumber(body.quantity, 1));
        const cartItems = fakeDb.carts[user.id] ?? [];
        const existing = cartItems.find((item) => item.productId === productId);
        if (!existing) return response(config, 404, notFoundError());
        existing.quantity = quantity;
        fakeDb.carts[user.id] = cartItems;
        return response(config, 200, makeSuccess(200, calculateCartResponse(user.id)));
    }

    if (method === 'delete' && pathname.startsWith('/cart/')) {
        const user = mustBeAuthed(config);
        if ('errors' in user) return response(config, 401, user);
        const productId = pathname.replace('/cart/', '');
        fakeDb.carts[user.id] = (fakeDb.carts[user.id] ?? []).filter((item) => item.productId !== productId);
        return response(config, 200, makeSuccess(200, calculateCartResponse(user.id)));
    }

    if (method === 'delete' && pathname === '/cart') {
        const user = mustBeAuthed(config);
        if ('errors' in user) return response(config, 401, user);
        const productId = typeof body.productId === 'string' ? body.productId : undefined;
        if (productId)
            fakeDb.carts[user.id] = (fakeDb.carts[user.id] ?? []).filter((item) => item.productId !== productId);
        else fakeDb.carts[user.id] = [];
        return response(config, 200, makeSuccess(200, calculateCartResponse(user.id)));
    }

    if (method === 'post' && pathname === '/cart/checkout') {
        const user = mustBeAuthed(config);
        if ('errors' in user) return response(config, 401, user);
        const cart = calculateCartResponse(user.id);
        if (cart.items.length === 0)
            return response(config, 422, {
                success: false,
                status: 422,
                message: 'Cart is empty',
                errors: ['Cart is empty']
            } as IFakeErrorResponse);

        const order: Order = {
            id: `order-${Date.now()}`,
            userId: user.id,
            email: String(body.email ?? user.email),
            items: clone(cart.items),
            total: cart.summary.total,
            notes: typeof body.notes === 'string' ? body.notes : undefined,
            status: 'pending' as OrderStatusEnum,
            createdAt: nowIso(),
            updatedAt: nowIso()
        };
        fakeDb.orders.unshift(order);
        fakeDb.carts[user.id] = [];
        const checkoutResponse: CheckoutResponse = {
            order,
            message: 'Order placed successfully'
        };
        return response(config, 201, makeSuccess(201, checkoutResponse, 'Created'));
    }

    if (method === 'get' && pathname === '/orders') {
        const user = mustBeAuthed(config);
        if ('errors' in user) return response(config, 401, user);
        const page = Number.parseInt(searchParams.get('page') ?? '1', 10);
        const pageSize = Number.parseInt(searchParams.get('pageSize') ?? '10', 10);
        const visibleOrders = user.admin
            ? fakeDb.orders
            : fakeDb.orders.filter((order) => order.userId === user.id);
        const pageData = paginate(visibleOrders, page, pageSize);
        return response(config, 200, makeSuccess(200, pageData));
    }

    if (method === 'get' && pathname.startsWith('/orders/') && pathname.endsWith('/invoice')) {
        const user = mustBeAuthed(config);
        if ('errors' in user) return response(config, 401, user);
        const id = pathname.replace('/orders/', '').replace('/invoice', '');
        const order = fakeDb.orders.find((item) => item.id === id);
        if (!order) return response(config, 404, notFoundError());
        const invoiceContent = `Invoice for order ${order.id}\nTotal: ${order.total}\n`;
        const blob = new Blob([invoiceContent], { type: 'application/pdf' });
        return response(config, 200, makeSuccess(200, blob));
    }

    if (method === 'get' && pathname.startsWith('/orders/')) {
        const user = mustBeAuthed(config);
        if ('errors' in user) return response(config, 401, user);
        const id = pathname.replace('/orders/', '');
        const order = fakeDb.orders.find((item) => item.id === id);
        if (!order) return response(config, 404, notFoundError());
        return response(config, 200, makeSuccess(200, clone(order)));
    }

    if (method === 'put' && pathname.startsWith('/orders/')) {
        const admin = mustBeAdmin(config);
        if ('errors' in admin) return response(config, admin.status, admin);
        const id = pathname.replace('/orders/', '');
        const order = fakeDb.orders.find((item) => item.id === id);
        if (!order) return response(config, 404, notFoundError());
        if (body.status) order.status = String(body.status) as OrderStatusEnum;
        if (body.email) order.email = String(body.email);
        if (body.notes !== undefined) order.notes = String(body.notes);
        order.updatedAt = nowIso();
        return response(config, 200, makeSuccess(200, clone(order), 'Updated'));
    }

    if (method === 'delete' && pathname.startsWith('/orders/')) {
        const admin = mustBeAdmin(config);
        if ('errors' in admin) return response(config, admin.status, admin);
        const id = pathname.replace('/orders/', '');
        fakeDb.orders = fakeDb.orders.filter((item) => item.id !== id);
        return response(config, 200, makeSuccess(200, { message: 'Deleted' }));
    }

    return response(config, 404, notFoundError());
};

export const createFakeApiAdapter = (): AxiosAdapter => async (config) =>
    fakeApiHandler(config as AxiosRequestConfig);

export const shouldEnableFakeApi = () => {
    const hasCypress = typeof globalThis !== 'undefined' && 'Cypress' in globalThis;
    return (
        import.meta.env.VITE_USE_FAKE_API === 'true' ||
        import.meta.env.MODE === 'test' ||
        hasCypress
    );
};

export const setupFakeApi = (resetState = false) => {
    if (resetState) resetFakeApiState();
    if (isFakeApiInstalled) return;
    httpClient.defaults.adapter = createFakeApiAdapter();
    isFakeApiInstalled = true;
};

export const setupFakeApiIfEnabled = () => {
    if (!shouldEnableFakeApi()) return;
    setupFakeApi();
};
