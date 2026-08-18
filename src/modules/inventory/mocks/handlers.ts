import { http, type HttpHandler } from 'msw';
import { ListInventoryLevelsResponse, ListStockMovementsResponse } from '@api/schemas';
import * as schemas from '@api/schemas';
import {
    createErrorEnvelope,
    createSuccessEnvelope,
    isCurrentMockUserAdmin,
    mockDatabase,
    readRequestBody,
    toPaginationMeta
} from '@mocks/mockDb.ts';
import { toMockJsonResponse } from '@mocks/mockTransport.ts';
import { MockErrorResponse } from '@mocks/mockValidation.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/*
 * The contract's default page size, and a constant rather than `items.length` — `PageSize` is
 * `minimum: 1`, so an empty ledger (which is exactly what a freshly reset mock has) would answer
 * `pageSize: 0` and fail its own schema check. Neither of these endpoints paginates here; the
 * meta is present because the contract requires it, and it says the whole list is page one.
 */
const PAGE_SIZE = 10;

// The collections and cross-module listeners live in @mocks/mockCommerce.ts — the support
// layer, like `createMockOrder`, because module mock files must not import each other.
import { applyMockStockTransition, mockInventoryLevels } from '@mocks/mockCommerce.ts';

/** Admin-only, like every route in this module. Returns the 403 envelope, or `undefined` to go on. */
const forbiddenUnlessAdmin = () =>
    isCurrentMockUserAdmin()
        ? undefined
        : toMockJsonResponse(createErrorEnvelope(403, 'FORBIDDEN', 'Admin only'), {
              status: 403,
              schema: MockErrorResponse
          });

export const registerInventoryMockHandlers = (): HttpHandler[] => [
    http.get(`${API_BASE}/inventory/levels`, () => {
        const denied = forbiddenUnlessAdmin();
        if (denied) return denied;

        const items = mockInventoryLevels();
        return toMockJsonResponse(
            createSuccessEnvelope({ items, meta: toPaginationMeta(items.length, 1, PAGE_SIZE) }),
            { schema: ListInventoryLevelsResponse }
        );
    }),

    http.get(`${API_BASE}/inventory/movements`, ({ request }) => {
        const denied = forbiddenUnlessAdmin();
        if (denied) return denied;

        const productId = new URL(request.url).searchParams.get('productId');
        const items = (mockDatabase.sampleStockMovements ?? []).filter(
            (movement) => !productId || movement.productId === productId
        );
        return toMockJsonResponse(
            createSuccessEnvelope({ items, meta: toPaginationMeta(items.length, 1, PAGE_SIZE) }),
            { schema: ListStockMovementsResponse }
        );
    }),

    /*
     * A delivery. `receive` is the only transition that can create units, so `onHand` rises and
     * `reserved` does not — the arrival is sellable immediately. The deltas come from the same
     * reason→deltas table the backend keeps in `src/modules/inventory/domain/transitions.ts`.
     */
    http.post(`${API_BASE}/inventory/receipts`, ({ request }) =>
        readRequestBody<{ productId?: string; quantity?: number }>(request).then((requestBody) => {
            const denied = forbiddenUnlessAdmin();
            if (denied) return denied;

            const product = mockDatabase.sampleProducts.find(
                ({ id }) => id === String(requestBody.productId ?? '')
            );
            if (!product)
                return toMockJsonResponse(
                    createErrorEnvelope(
                        404,
                        'NOT_FOUND',
                        'The product receiving stock was not found'
                    ),
                    { status: 404, schema: MockErrorResponse }
                );

            const level = applyMockStockTransition(
                'receive',
                product.id,
                Number(requestBody.quantity ?? 0)
            );

            return toMockJsonResponse(createSuccessEnvelope(level), {
                schema: schemas.ReceiveStockResponse
            });
        })
    ),

    /*
     * A stocktake correction, signed — shrinkage is the common case and it is negative. The
     * refusal is the interesting branch: the API will not take `onHand` below what is already
     * reserved, because those units are promised to orders that exist.
     */
    http.post(`${API_BASE}/inventory/adjustments`, ({ request }) =>
        readRequestBody<{ productId?: string; delta?: number }>(request).then((requestBody) => {
            const denied = forbiddenUnlessAdmin();
            if (denied) return denied;

            const product = mockDatabase.sampleProducts.find(
                ({ id }) => id === String(requestBody.productId ?? '')
            );
            if (!product)
                return toMockJsonResponse(
                    createErrorEnvelope(
                        404,
                        'NOT_FOUND',
                        'The product being adjusted was not found'
                    ),
                    { status: 404, schema: MockErrorResponse }
                );

            const delta = Number(requestBody.delta ?? 0);
            const onHand = (product.onHand ?? 0) + delta;
            if (onHand < (product.reserved ?? 0))
                return toMockJsonResponse(
                    createErrorEnvelope(
                        409,
                        'CONFLICT',
                        'The correction would leave fewer units than are already reserved'
                    ),
                    { status: 409, schema: MockErrorResponse }
                );

            const level = applyMockStockTransition('adjust', product.id, delta);

            return toMockJsonResponse(createSuccessEnvelope(level), {
                schema: schemas.AdjustStockResponse
            });
        })
    )
];
