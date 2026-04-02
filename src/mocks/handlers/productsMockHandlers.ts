import type MockAdapter from 'axios-mock-adapter';
import type { Product, ProductsResponse } from '@types';
import {
    createMessageResponse,
    getIsoDateNow,
    getLastPathSegment,
    getQueryParameters,
    mockDatabase,
    parseRequestBody,
    slicePaginatedData,
    toNumberOrDefault,
    toPaginationMeta
} from '@/mocks/shared/mockShared.ts';

const replyProductsList = (url: string | undefined, parameters?: unknown): [number, ProductsResponse] => {
    const query = getQueryParameters(url, parameters);
    const page = toNumberOrDefault(query.page, 1);
    const pageSize = toNumberOrDefault(query.pageSize, 10);
    const text = String(query.text ?? '').trim().toLowerCase();
    const id = query.id ?? query.productId ? String(query.id ?? query.productId) : undefined;
    const minPrice = query.minPrice === undefined ? undefined : Number(query.minPrice);
    const maxPrice = query.maxPrice === undefined ? undefined : Number(query.maxPrice);

    const filteredItems = mockDatabase.sampleProducts.filter((product) => {
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

export const registerProductsMockHandlers = (mockAdapter: MockAdapter) => {
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
        mockDatabase.sampleProducts.unshift(createdProduct);
        return [201, createdProduct];
    });

    mockAdapter.onPut(/\/products(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const targetId = String(requestBody.id ?? '');
        const targetIndex = mockDatabase.sampleProducts.findIndex(({ id }) => id === targetId);
        if (targetIndex === -1) return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }];
        const updatedProduct: Product = {
            ...mockDatabase.sampleProducts[targetIndex],
            title: requestBody.title ? String(requestBody.title) : mockDatabase.sampleProducts[targetIndex].title,
            description: requestBody.description === undefined ? mockDatabase.sampleProducts[targetIndex].description : String(requestBody.description),
            price: requestBody.price === undefined ? mockDatabase.sampleProducts[targetIndex].price : Number(requestBody.price),
            active: requestBody.active === undefined ? mockDatabase.sampleProducts[targetIndex].active : Boolean(requestBody.active),
            updatedAt: getIsoDateNow()
        };
        mockDatabase.sampleProducts[targetIndex] = updatedProduct;
        return [200, updatedProduct];
    });

    mockAdapter.onDelete(/\/products(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const targetId = String(requestBody.id ?? '');
        const targetIndex = mockDatabase.sampleProducts.findIndex(({ id }) => id === targetId);
        if (targetIndex === -1) return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }];
        mockDatabase.sampleProducts.splice(targetIndex, 1);
        return [200, createMessageResponse('Product deleted')];
    });

    mockAdapter.onPost(/\/products\/search(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        return replyProductsList(config.url, requestBody);
    });

    mockAdapter.onGet(/\/products\/[^/]+(?:\?.*)?$/).reply((config) => {
        const productId = getLastPathSegment(config.url);
        const targetProduct = mockDatabase.sampleProducts.find((product) => product.id === productId);
        if (!targetProduct) return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }];
        return [200, targetProduct];
    });

    mockAdapter.onPut(/\/products\/[^/]+(?:\?.*)?$/).reply((config) => {
        const productId = getLastPathSegment(config.url);
        const targetIndex = mockDatabase.sampleProducts.findIndex(({ id }) => id === productId);
        if (targetIndex === -1) return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }];
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const updatedProduct: Product = {
            ...mockDatabase.sampleProducts[targetIndex],
            title: requestBody.title ? String(requestBody.title) : mockDatabase.sampleProducts[targetIndex].title,
            description: requestBody.description === undefined ? mockDatabase.sampleProducts[targetIndex].description : String(requestBody.description),
            price: requestBody.price === undefined ? mockDatabase.sampleProducts[targetIndex].price : Number(requestBody.price),
            active: requestBody.active === undefined ? mockDatabase.sampleProducts[targetIndex].active : Boolean(requestBody.active),
            updatedAt: getIsoDateNow()
        };
        mockDatabase.sampleProducts[targetIndex] = updatedProduct;
        return [200, updatedProduct];
    });

    mockAdapter.onDelete(/\/products\/[^/]+(?:\?.*)?$/).reply((config) => {
        const productId = getLastPathSegment(config.url);
        const targetIndex = mockDatabase.sampleProducts.findIndex(({ id }) => id === productId);
        if (targetIndex === -1) return [404, { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }];
        mockDatabase.sampleProducts.splice(targetIndex, 1);
        return [200, createMessageResponse('Product deleted')];
    });
};

