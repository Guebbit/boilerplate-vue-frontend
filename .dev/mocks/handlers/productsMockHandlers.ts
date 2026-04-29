import { http, type HttpHandler } from 'msw';
import type { Product, ProductsResponse } from '@/types';
import {
    createMessageResponse,
    getIsoDateNow,
    getLastPathSegment,
    getQueryParameters,
    mockDatabase,
    readRequestBody,
    slicePaginatedData,
    toNumberOrDefault,
    toPaginationMeta
} from '../shared/mockShared.ts';
import { toMockJsonResponse } from '../shared/mockTransport.ts';

const replyProductsList = (url: string | undefined, parameters?: unknown) => {
    const query = getQueryParameters(url, parameters);
    const page = toNumberOrDefault(query.page, 1);
    const pageSize = toNumberOrDefault(query.pageSize, 10);
    const text = String(query.text ?? '')
        .trim()
        .toLowerCase();
    const id = (query.id ?? query.productId) ? String(query.id ?? query.productId) : undefined;
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
        )
            return false;
        return true;
    });

    return toMockJsonResponse<ProductsResponse>({
        items: slicePaginatedData(filteredItems, page, pageSize),
        meta: toPaginationMeta(filteredItems.length, page, pageSize)
    });
};

export const registerProductsMockHandlers = (): HttpHandler[] => [
    http.get(/\/products(?:\?.*)?$/, ({ request }) => replyProductsList(request.url)),
    http.post(/\/products(?:\?.*)?$/, async ({ request }) => {
        const requestBody = await readRequestBody<Record<string, unknown>>(request);
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
        return toMockJsonResponse(createdProduct, { status: 201 });
    }),
    http.put(/\/products(?:\?.*)?$/, async ({ request }) => {
        const requestBody = await readRequestBody<Record<string, unknown>>(request);
        const targetId = String(requestBody.id ?? '');
        const targetIndex = mockDatabase.sampleProducts.findIndex(({ id }) => id === targetId);

        if (targetIndex === -1)
            return toMockJsonResponse(
                { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } },
                { status: 404 }
            );

        const updatedProduct: Product = {
            ...mockDatabase.sampleProducts[targetIndex],
            title: requestBody.title
                ? String(requestBody.title)
                : mockDatabase.sampleProducts[targetIndex].title,
            description:
                requestBody.description === undefined
                    ? mockDatabase.sampleProducts[targetIndex].description
                    : String(requestBody.description),
            price:
                requestBody.price === undefined
                    ? mockDatabase.sampleProducts[targetIndex].price
                    : Number(requestBody.price),
            active:
                requestBody.active === undefined
                    ? mockDatabase.sampleProducts[targetIndex].active
                    : Boolean(requestBody.active),
            updatedAt: getIsoDateNow()
        };

        mockDatabase.sampleProducts[targetIndex] = updatedProduct;
        return toMockJsonResponse(updatedProduct);
    }),
    http.delete(/\/products(?:\?.*)?$/, async ({ request }) => {
        const requestBody = await readRequestBody<Record<string, unknown>>(request);
        const targetId = String(requestBody.id ?? '');
        const targetIndex = mockDatabase.sampleProducts.findIndex(({ id }) => id === targetId);

        if (targetIndex === -1)
            return toMockJsonResponse(
                { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } },
                { status: 404 }
            );

        mockDatabase.sampleProducts.splice(targetIndex, 1);
        return toMockJsonResponse(createMessageResponse('Product deleted'));
    }),
    http.post(/\/products\/search(?:\?.*)?$/, async ({ request }) => {
        const requestBody = await readRequestBody<Record<string, unknown>>(request);
        return replyProductsList(request.url, requestBody);
    }),
    http.get(/\/products\/[^/]+(?:\?.*)?$/, ({ request }) => {
        const productId = getLastPathSegment(request.url);
        const targetProduct = mockDatabase.sampleProducts.find((product) => product.id === productId);

        if (!targetProduct)
            return toMockJsonResponse(
                { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } },
                { status: 404 }
            );

        return toMockJsonResponse(targetProduct);
    }),
    http.put(/\/products\/[^/]+(?:\?.*)?$/, async ({ request }) => {
        const productId = getLastPathSegment(request.url);
        const targetIndex = mockDatabase.sampleProducts.findIndex(({ id }) => id === productId);

        if (targetIndex === -1)
            return toMockJsonResponse(
                { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } },
                { status: 404 }
            );

        const requestBody = await readRequestBody<Record<string, unknown>>(request);
        const updatedProduct: Product = {
            ...mockDatabase.sampleProducts[targetIndex],
            title: requestBody.title
                ? String(requestBody.title)
                : mockDatabase.sampleProducts[targetIndex].title,
            description:
                requestBody.description === undefined
                    ? mockDatabase.sampleProducts[targetIndex].description
                    : String(requestBody.description),
            price:
                requestBody.price === undefined
                    ? mockDatabase.sampleProducts[targetIndex].price
                    : Number(requestBody.price),
            active:
                requestBody.active === undefined
                    ? mockDatabase.sampleProducts[targetIndex].active
                    : Boolean(requestBody.active),
            updatedAt: getIsoDateNow()
        };

        mockDatabase.sampleProducts[targetIndex] = updatedProduct;
        return toMockJsonResponse(updatedProduct);
    }),
    http.delete(/\/products\/[^/]+(?:\?.*)?$/, ({ request }) => {
        const productId = getLastPathSegment(request.url);
        const targetIndex = mockDatabase.sampleProducts.findIndex(({ id }) => id === productId);

        if (targetIndex === -1)
            return toMockJsonResponse(
                { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } },
                { status: 404 }
            );

        mockDatabase.sampleProducts.splice(targetIndex, 1);
        return toMockJsonResponse(createMessageResponse('Product deleted'));
    })
];
