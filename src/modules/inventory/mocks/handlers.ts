import { http, type HttpHandler } from 'msw';
import { ListInventoryLevelsResponse, ListStockMovementsResponse } from '@api/schemas';
import * as schemas from '@api/schemas';
import {
    createErrorEnvelope,
    createSuccessEnvelope,
    getQueryParameters,
    isCurrentMockUserAdmin,
    mockDatabase,
    readRequestBody,
    slicePaginatedData,
    toBooleanOrUndefined,
    toNumberOrDefault,
    toPaginationMeta
} from '@mocks/mockDb.ts';
import { toMockJsonResponse } from '@mocks/mockTransport.ts';
import { MockErrorResponse } from '@mocks/mockValidation.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

/*
 * The contract's default page size, and a constant rather than `items.length` — `PageSize` is
 * `minimum: 1`, so an empty ledger (which is exactly what a freshly reset mock has) would answer
 * `pageSize: 0` and fail its own schema check.
 */
const PAGE_SIZE = 10;

/** Stands in for `NODE_LOW_STOCK_THRESHOLD` — the server's number, mirrored, never the page's. */
const LOW_STOCK_THRESHOLD = 5;

// The collections and cross-module listeners live in @mocks/mockCommerce.ts — the support
// layer, like `createMockOrder`, because module mock files must not import each other.
import {
    applyMockStockTransition,
    expireMockStaleHolds,
    mockInventoryLevels
} from '@mocks/mockCommerce.ts';

/** Admin-only, like every route in this module. Returns the 403 envelope, or `undefined` to go on. */
const forbiddenUnlessAdmin = () =>
    isCurrentMockUserAdmin()
        ? undefined
        : toMockJsonResponse(createErrorEnvelope(403, 'FORBIDDEN', 'Admin only'), {
              status: 403,
              schema: MockErrorResponse
          });

export const registerInventoryMockHandlers = (): HttpHandler[] => [
    http.get(`${API_BASE}/inventory/levels`, ({ request }) => {
        const denied = forbiddenUnlessAdmin();
        if (denied) return denied;

        const query = getQueryParameters(request.url);
        const page = toNumberOrDefault(query.page, 1);
        const pageSize = toNumberOrDefault(query.pageSize, PAGE_SIZE);
        // Most scarce first, exactly as the contract orders the board.
        const matching = mockInventoryLevels()
            .filter(
                (level) =>
                    toBooleanOrUndefined(query.lowOnly) !== true ||
                    level.available <= LOW_STOCK_THRESHOLD
            )
            .toSorted((a, b) => a.available - b.available);
        return toMockJsonResponse(
            createSuccessEnvelope({
                items: slicePaginatedData(matching, page, pageSize),
                meta: toPaginationMeta(matching.length, page, pageSize)
            }),
            { schema: ListInventoryLevelsResponse }
        );
    }),

    http.get(`${API_BASE}/inventory/movements`, ({ request }) => {
        const denied = forbiddenUnlessAdmin();
        if (denied) return denied;

        const query = getQueryParameters(request.url);
        const page = toNumberOrDefault(query.page, 1);
        const pageSize = toNumberOrDefault(query.pageSize, PAGE_SIZE);
        const matching = (mockDatabase.sampleStockMovements ?? []).filter(
            (movement) =>
                (!query.productId || movement.productId === query.productId) &&
                (!query.reason || movement.reason === query.reason)
        );
        return toMockJsonResponse(
            createSuccessEnvelope({
                items: slicePaginatedData(matching, page, pageSize),
                meta: toPaginationMeta(matching.length, page, pageSize)
            }),
            { schema: ListStockMovementsResponse }
        );
    }),

    /*
     * A delivery. `receive` is the only transition that can create units, so `onHand` rises and
     * `reserved` does not — the arrival is sellable immediately. The deltas come from the same
     * reason→deltas table the backend keeps in `src/modules/inventory/domain/transitions.ts`.
     */
    http.post(`${API_BASE}/inventory/receipts`, ({ request }) =>
        readRequestBody<{ productId?: string; quantity?: number; note?: string }>(request).then(
            (requestBody) => {
                const denied = forbiddenUnlessAdmin();
                if (denied) return denied;

                const product = mockDatabase.sampleProducts.find(
                    ({ id }) => id === (requestBody.productId ?? '')
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
                    requestBody.quantity ?? 0,
                    { note: requestBody.note }
                );

                return toMockJsonResponse(createSuccessEnvelope(level), {
                    schema: schemas.ReceiveStockResponse
                });
            }
        )
    ),

    /*
     * A stocktake correction, signed — shrinkage is the common case and it is negative. The
     * refusal is the interesting branch: the API will not take `onHand` below what is already
     * reserved, because those units are promised to orders that exist.
     */
    http.post(`${API_BASE}/inventory/adjustments`, ({ request }) =>
        readRequestBody<{ productId?: string; delta?: number; note?: string }>(request).then(
            (requestBody) => {
                const denied = forbiddenUnlessAdmin();
                if (denied) return denied;

                const product = mockDatabase.sampleProducts.find(
                    ({ id }) => id === (requestBody.productId ?? '')
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

                const delta = requestBody.delta ?? 0;
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

                const level = applyMockStockTransition('adjust', product.id, delta, {
                    note: requestBody.note
                });

                return toMockJsonResponse(createSuccessEnvelope(level), {
                    schema: schemas.AdjustStockResponse
                });
            }
        )
    ),

    /*
     * The sweep: a job behind an admin endpoint, driven from outside because the API ships no
     * scheduler. Idempotent — the mock's "stale" is every order still unpaid, and once swept those
     * are cancelled, so a second run finds nothing.
     */
    http.post(`${API_BASE}/inventory/reservations/sweep`, () => {
        const denied = forbiddenUnlessAdmin();
        if (denied) return denied;
        return toMockJsonResponse(createSuccessEnvelope({ expired: expireMockStaleHolds() }), {
            schema: schemas.SweepReservationsResponse
        });
    })
];
