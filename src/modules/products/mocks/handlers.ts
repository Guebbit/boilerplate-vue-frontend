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
    DeleteProductByIdResponse,
    HardDeleteProductByIdResponse,
    GetCatalogueFacetsResponse
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
    readHardDeleteFlag,
    toNumberOrDefault,
    toPaginationMeta
} from '@mocks/mockShared.ts';
import { toMockJsonResponse } from '@mocks/mockTransport.ts';
import { MockErrorResponse } from '@mocks/mockValidation.ts';

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
    const category = query.category ? String(query.category).toLowerCase() : undefined;
    const tag = query.tag ? String(query.tag).toLowerCase() : undefined;

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
        // The BE's `arrayRegex` is a case-insensitive substring match over the array's values.
        if (
            category &&
            !(product.categories ?? []).some((value) => value.toLowerCase().includes(category))
        )
            return false;
        if (tag && !(product.tags ?? []).some((value) => value.toLowerCase().includes(tag)))
            return false;
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

/**
 * Mirrors `BE src/services/products.ts` `remove()`: hard delete drops the row, soft delete toggles
 * `deletedAt` — so calling it twice restores the product rather than deleting it harder.
 *
 * Soft delete is the DEFAULT, as it is on the real API. Splicing the row unconditionally would be
 * behaviour drift of the worst kind: `isVisibleToCaller` hides a soft-deleted product from
 * non-admins but keeps showing it to admins, and a mock that removed the row outright could never
 * reproduce that.
 *
 * @returns false when there is no such product, which is the 404 every caller below shares.
 */
const removeProductById = (productId: string, hardDelete: boolean): boolean => {
    const targetIndex = mockDatabase.sampleProducts.findIndex(({ id }) => id === productId);
    if (targetIndex === -1) return false;

    if (hardDelete) {
        mockDatabase.sampleProducts.splice(targetIndex, 1);
        return true;
    }

    const target = mockDatabase.sampleProducts[targetIndex];
    mockDatabase.sampleProducts[targetIndex] = {
        ...target,
        // `undefined`, not an empty string: `isVisibleToCaller` tests for absence, matching the
        // BE's `$exists: false`.
        deletedAt: target.deletedAt ? undefined : getIsoDateNow()
    };
    return true;
};

/**
 * One facet list with counts, over the PUBLIC catalogue only — exactly as `facets()` applies
 * `publicScope` in the BE: a facet held only by hidden products would render a chip that finds
 * nothing. Sorted by count descending, then name, matching the API's stable order.
 */
const countPublicFacets = (pick: (product: Product) => string[] | undefined) => {
    const byName = new Map<string, number>();
    for (const product of mockDatabase.sampleProducts) {
        if (!isVisibleToCaller(product, false)) continue;
        for (const name of pick(product) ?? []) byName.set(name, (byName.get(name) ?? 0) + 1);
    }
    return [...byName.entries()]
        .map(([name, count]) => ({ name, count }))
        .toSorted((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};

const productNotFound = () =>
    toMockJsonResponse(createErrorEnvelope(404, 'NOT_FOUND', 'Product not found'), {
        status: 404,
        schema: MockErrorResponse
    });

export const registerProductsMockHandlers = (): HttpHandler[] => [
    http.get(`${API_BASE}/products`, ({ request }) =>
        replyProductsList(request.url, ListProductsResponse)
    ),
    http.post(`${API_BASE}/products`, ({ request }) =>
        readRequestParts<Record<string, unknown>>(request).then(
            ({ fields: requestBody, files }) => {
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
            }
        )
    ),
    http.put(`${API_BASE}/products`, ({ request }) =>
        readRequestParts<Record<string, unknown>>(request).then(
            ({ fields: requestBody, files }) => {
                const targetId = String(requestBody.id ?? '');
                const targetIndex = mockDatabase.sampleProducts.findIndex(
                    ({ id }) => id === targetId
                );

                if (targetIndex === -1)
                    return toMockJsonResponse(
                        createErrorEnvelope(404, 'NOT_FOUND', 'Product not found'),
                        {
                            status: 404,
                            schema: MockErrorResponse
                        }
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
                    imageUrl: resolveMockImageUrl(
                        files,
                        mockDatabase.sampleProducts[targetIndex].imageUrl
                    ),
                    updatedAt: getIsoDateNow()
                };

                mockDatabase.sampleProducts[targetIndex] = updatedProduct;
                return toMockJsonResponse(createSuccessEnvelope(updatedProduct), {
                    schema: UpdateProductResponse
                });
            }
        )
    ),
    http.delete(`${API_BASE}/products`, ({ request }) =>
        readRequestBody<Record<string, unknown>>(request).then((requestBody) => {
            const targetId = String(requestBody.id ?? '');
            const targetIndex = mockDatabase.sampleProducts.findIndex(({ id }) => id === targetId);

            if (targetIndex === -1)
                return toMockJsonResponse(
                    createErrorEnvelope(404, 'NOT_FOUND', 'Product not found'),
                    {
                        status: 404,
                        schema: MockErrorResponse
                    }
                );

            mockDatabase.sampleProducts.splice(targetIndex, 1);
            return toMockJsonResponse(createMessageResponse('Product deleted'), {
                schema: DeleteProductResponse
            });
        })
    ),
    http.post(`${API_BASE}/products/search`, ({ request }) =>
        readRequestBody<Record<string, unknown>>(request).then((requestBody) => {
            return replyProductsList(request.url, SearchProductsResponse, requestBody);
        })
    ),
    // Before `:productId` — MSW matches in registration order, and `categories` is a static
    // segment the wildcard would otherwise swallow. Same rule as the FE route table.
    http.get(`${API_BASE}/products/categories`, () =>
        toMockJsonResponse(
            createSuccessEnvelope({
                categories: countPublicFacets(({ categories }) => categories),
                tags: countPublicFacets(({ tags }) => tags)
            }),
            { schema: GetCatalogueFacetsResponse }
        )
    ),
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
    http.put(`${API_BASE}/products/:productId`, ({ request, params }) => {
        const productId = String(params.productId);
        const targetIndex = mockDatabase.sampleProducts.findIndex(({ id }) => id === productId);

        if (targetIndex === -1)
            return toMockJsonResponse(createErrorEnvelope(404, 'NOT_FOUND', 'Product not found'), {
                status: 404,
                schema: MockErrorResponse
            });
        return readRequestParts<Record<string, unknown>>(request).then(
            ({ fields: requestBody, files }) => {
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
                    imageUrl: resolveMockImageUrl(
                        files,
                        mockDatabase.sampleProducts[targetIndex].imageUrl
                    ),
                    updatedAt: getIsoDateNow()
                };

                mockDatabase.sampleProducts[targetIndex] = updatedProduct;
                return toMockJsonResponse(createSuccessEnvelope(updatedProduct), {
                    schema: UpdateProductByIdResponse
                });
            }
        );
    }),
    // Must come before /products/:productId, or `hard` is matched as a product id.
    http.delete(`${API_BASE}/products/:productId/hard`, ({ params }) => {
        if (!removeProductById(String(params.productId), true)) return productNotFound();

        return toMockJsonResponse(createMessageResponse('Product deleted'), {
            schema: HardDeleteProductByIdResponse
        });
    }),
    http.delete(`${API_BASE}/products/:productId`, ({ request, params }) => {
        if (!removeProductById(String(params.productId), readHardDeleteFlag(request.url)))
            return productNotFound();

        return toMockJsonResponse(createMessageResponse('Product deleted'), {
            schema: DeleteProductByIdResponse
        });
    })
];
