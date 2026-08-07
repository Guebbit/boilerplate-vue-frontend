import { http, type HttpHandler } from 'msw';
import type { Product } from 'src/types';
import {
    ListProductsResponse,
    CreateProductResponse,
    UpdateProductResponse,
    DeleteProductResponse,
    SearchProductsResponse,
    GetProductByIdResponse,
    UpdateProductByIdResponse,
    DeleteProductByIdResponse
} from '@api/schemas';
import {
    createErrorEnvelope,
    createMessageResponse,
    createSuccessEnvelope,
    getIsoDateNow,
    getQueryParameters,
    isCurrentMockUserAdmin,
    isVisibleToCaller,
    mockDatabase,
    readRequestBody,
    readRequestParts,
    resolveMockImageUrl,
    slicePaginatedData,
    toNumberOrDefault,
    toPaginationMeta
} from '../shared/mockShared.ts';
import { toMockJsonResponse } from '../shared/mockTransport.ts';
import { MockErrorResponse } from '../shared/mockValidation.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const replyProductsList = (
    url: string | undefined,
    schema: typeof ListProductsResponse | typeof SearchProductsResponse,
    parameters?: unknown
) => {
    const query = getQueryParameters(url, parameters);
    const page = toNumberOrDefault(query.page, 1);
    const pageSize = toNumberOrDefault(query.pageSize, 10);
    const text = String(query.text ?? '')
        .trim()
        .toLowerCase();
    const id = (query.id ?? query.productId) ? String(query.id ?? query.productId) : undefined;
    const minPrice = query.minPrice === undefined ? undefined : Number(query.minPrice);
    const maxPrice = query.maxPrice === undefined ? undefined : Number(query.maxPrice);

    // Role-scoped visibility, applied before any user-supplied filter — same order as the BE,
    // which folds `active`/`deletedAt` into the same `where` clause it builds the filters on.
    // Without this the mock returned all 5 seeded products to everyone, while the real API
    // returns 3 to anonymous callers: the exact divergence a mock-only suite cannot see.
    const admin = isCurrentMockUserAdmin();

    const filteredItems = mockDatabase.sampleProducts.filter((product) => {
        if (!isVisibleToCaller(product, admin)) return false;
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

    return toMockJsonResponse(
        createSuccessEnvelope({
            items: slicePaginatedData(filteredItems, page, pageSize),
            meta: toPaginationMeta(filteredItems.length, page, pageSize)
        }),
        { schema }
    );
};

export const registerProductsMockHandlers = (): HttpHandler[] => [
    http.get(`${API_BASE}/products`, ({ request }) =>
        replyProductsList(request.url, ListProductsResponse)
    ),
    http.post(`${API_BASE}/products`, async ({ request }) => {
        const { fields: requestBody, files } =
            await readRequestParts<Record<string, unknown>>(request);
        const createdProduct: Product = {
            id: `prod-${Date.now()}`,
            title: String(requestBody.title ?? 'New product'),
            description: requestBody.description ? String(requestBody.description) : '',
            price: Number(requestBody.price ?? 0),
            active: requestBody.active === undefined ? true : Boolean(requestBody.active),
            imageUrl: resolveMockImageUrl(files),
            createdAt: getIsoDateNow(),
            updatedAt: getIsoDateNow()
        };
        mockDatabase.sampleProducts.unshift(createdProduct);
        return toMockJsonResponse(createSuccessEnvelope(createdProduct), {
            status: 201,
            schema: CreateProductResponse
        });
    }),
    http.put(`${API_BASE}/products`, async ({ request }) => {
        const { fields: requestBody, files } =
            await readRequestParts<Record<string, unknown>>(request);
        const targetId = String(requestBody.id ?? '');
        const targetIndex = mockDatabase.sampleProducts.findIndex(({ id }) => id === targetId);

        if (targetIndex === -1)
            return toMockJsonResponse(createErrorEnvelope(404, 'NOT_FOUND', 'Product not found'), {
                status: 404,
                schema: MockErrorResponse
            });

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
            imageUrl: resolveMockImageUrl(files, mockDatabase.sampleProducts[targetIndex].imageUrl),
            updatedAt: getIsoDateNow()
        };

        mockDatabase.sampleProducts[targetIndex] = updatedProduct;
        return toMockJsonResponse(createSuccessEnvelope(updatedProduct), {
            schema: UpdateProductResponse
        });
    }),
    http.delete(`${API_BASE}/products`, async ({ request }) => {
        const requestBody = await readRequestBody<Record<string, unknown>>(request);
        const targetId = String(requestBody.id ?? '');
        const targetIndex = mockDatabase.sampleProducts.findIndex(({ id }) => id === targetId);

        if (targetIndex === -1)
            return toMockJsonResponse(createErrorEnvelope(404, 'NOT_FOUND', 'Product not found'), {
                status: 404,
                schema: MockErrorResponse
            });

        mockDatabase.sampleProducts.splice(targetIndex, 1);
        return toMockJsonResponse(createMessageResponse('Product deleted'), {
            schema: DeleteProductResponse
        });
    }),
    http.post(`${API_BASE}/products/search`, async ({ request }) => {
        const requestBody = await readRequestBody<Record<string, unknown>>(request);
        return replyProductsList(request.url, SearchProductsResponse, requestBody);
    }),
    http.get(`${API_BASE}/products/:productId`, ({ params }) => {
        const productId = String(params.productId);
        const targetProduct = mockDatabase.sampleProducts.find(
            (product) => product.id === productId
        );

        // Mirrors the BE's `getById(id, admin)`: a non-admin querying an inactive or
        // soft-deleted product gets a 404, not a 403 — the record's existence is not
        // disclosed. Same rule as the list, so the two can never disagree.
        if (targetProduct && !isVisibleToCaller(targetProduct, isCurrentMockUserAdmin()))
            return toMockJsonResponse(createErrorEnvelope(404, 'NOT_FOUND', 'Product not found'), {
                status: 404,
                schema: MockErrorResponse
            });

        if (!targetProduct)
            return toMockJsonResponse(createErrorEnvelope(404, 'NOT_FOUND', 'Product not found'), {
                status: 404,
                schema: MockErrorResponse
            });

        return toMockJsonResponse(createSuccessEnvelope(targetProduct), {
            schema: GetProductByIdResponse
        });
    }),
    http.put(`${API_BASE}/products/:productId`, async ({ request, params }) => {
        const productId = String(params.productId);
        const targetIndex = mockDatabase.sampleProducts.findIndex(({ id }) => id === productId);

        if (targetIndex === -1)
            return toMockJsonResponse(createErrorEnvelope(404, 'NOT_FOUND', 'Product not found'), {
                status: 404,
                schema: MockErrorResponse
            });

        const { fields: requestBody, files } =
            await readRequestParts<Record<string, unknown>>(request);
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
            imageUrl: resolveMockImageUrl(files, mockDatabase.sampleProducts[targetIndex].imageUrl),
            updatedAt: getIsoDateNow()
        };

        mockDatabase.sampleProducts[targetIndex] = updatedProduct;
        return toMockJsonResponse(createSuccessEnvelope(updatedProduct), {
            schema: UpdateProductByIdResponse
        });
    }),
    http.delete(`${API_BASE}/products/:productId`, ({ params }) => {
        const productId = String(params.productId);
        const targetIndex = mockDatabase.sampleProducts.findIndex(({ id }) => id === productId);

        if (targetIndex === -1)
            return toMockJsonResponse(createErrorEnvelope(404, 'NOT_FOUND', 'Product not found'), {
                status: 404,
                schema: MockErrorResponse
            });

        mockDatabase.sampleProducts.splice(targetIndex, 1);
        return toMockJsonResponse(createMessageResponse('Product deleted'), {
            schema: DeleteProductByIdResponse
        });
    })
];
