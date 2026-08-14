import { http, type HttpHandler } from 'msw';
import type { StockMovement } from 'src/types';
import { ListStockMovementsResponse, RestockProductResponse } from '@api/schemas';
import {
    createErrorEnvelope,
    createSuccessEnvelope,
    getIsoDateNow,
    isCurrentMockUserAdmin,
    mockDatabase,
    readRequestBody
} from '@mocks/mockShared.ts';
import { toMockJsonResponse } from '@mocks/mockTransport.ts';
import { MockErrorResponse } from '@mocks/mockValidation.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// The collections and cross-module listeners live in @mocks/mockCommerce.ts — the support
// layer, like `createMockOrder`, because module mock files must not import each other.
import { recordMockStockMovement } from '@mocks/mockCommerce.ts';

export const registerInventoryMockHandlers = (): HttpHandler[] => [
    http.get(`${API_BASE}/inventory/movements`, ({ request }) => {
        if (!isCurrentMockUserAdmin())
            return toMockJsonResponse(createErrorEnvelope(403, 'FORBIDDEN', 'Admin only'), {
                status: 403,
                schema: MockErrorResponse
            });
        const url = new URL(request.url);
        const productId = url.searchParams.get('productId');
        const items = (mockDatabase.sampleStockMovements ?? []).filter(
            (movement) => !productId || movement.productId === productId
        );
        return toMockJsonResponse(createSuccessEnvelope({ items }), {
            schema: ListStockMovementsResponse
        });
    }),

    http.post(`${API_BASE}/inventory/restock`, ({ request }) =>
        readRequestBody<{ productId?: string; quantity?: number }>(request).then((requestBody) => {
            if (!isCurrentMockUserAdmin())
                return toMockJsonResponse(createErrorEnvelope(403, 'FORBIDDEN', 'Admin only'), {
                    status: 403,
                    schema: MockErrorResponse
                });
            const product = mockDatabase.sampleProducts.find(
                ({ id }) => id === String(requestBody.productId ?? '')
            );
            if (!product)
                return toMockJsonResponse(
                    createErrorEnvelope(404, 'NOT_FOUND', 'The product to restock was not found'),
                    { status: 404, schema: MockErrorResponse }
                );
            const quantity = Number(requestBody.quantity ?? 0);
            product.stock = (product.stock ?? 0) + quantity;
            recordMockStockMovement({
                productId: product.id,
                delta: quantity,
                reason: 'restock'
            });
            return toMockJsonResponse(
                createSuccessEnvelope({ productId: product.id, stock: product.stock }),
                { schema: RestockProductResponse }
            );
        })
    )
];
