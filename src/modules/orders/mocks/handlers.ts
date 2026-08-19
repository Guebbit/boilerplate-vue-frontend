import { http, type HttpHandler } from 'msw';
import type { CartItem, Order, UpdateOrderByIdRequest, UpdateOrderRequest } from 'src/types';
import {
    ListOrdersResponse,
    CreateOrderResponse,
    UpdateOrderResponse,
    DeleteOrderResponse,
    SearchOrdersResponse,
    GetOrderByIdResponse,
    UpdateOrderByIdResponse,
    DeleteOrderByIdResponse,
    HardDeleteOrderByIdResponse,
    CancelOrderByIdResponse
} from '@api/schemas';
import {
    cartItemToOrderItem,
    createErrorEnvelope,
    createMessageResponse,
    createMockInvoicePdf,
    createMockOrder,
    createSuccessEnvelope,
    getIsoDateNow,
    getMockUserScope,
    getQueryParameters,
    readHardDeleteFlag,
    isCurrentMockUserAdmin,
    isOrderVisibleToCaller,
    mockDatabase,
    readRequestBody,
    slicePaginatedData,
    toNumberOrDefault,
    toPaginationMeta,
    asText,
    asOptionalText
} from '@mocks/mockDb.ts';
import { toMockArrayBufferResponse, toMockJsonResponse } from '@mocks/mockTransport.ts';
import { MockErrorResponse } from '@mocks/mockValidation.ts';
// The BE's event listeners, mock-side, from the support layer (see mockCommerce's docblock):
// the cancel refunds and re-shelves, a status landing on `shipped` mints the parcel.
import {
    refundMockPaymentForOrder,
    applyMockStockTransition,
    shipMockOrder
} from '@mocks/mockCommerce.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const replyOrdersList = (
    url: string | undefined,
    schema: typeof ListOrdersResponse | typeof SearchOrdersResponse,
    parameters?: unknown
) => {
    const query = getQueryParameters(url, parameters);
    const page = toNumberOrDefault(query.page, 1);
    const pageSize = toNumberOrDefault(query.pageSize, 10);
    const id = asOptionalText(query.id);
    // Non-admin callers are pinned to their own orders and their `userId` filter is
    // discarded, exactly as `getOrders` does with `userScope(request)` in the BE. Without
    // this the mock let any caller list every order by passing ?userId=…
    const scopedUserId = getMockUserScope();
    const userId = scopedUserId ?? asOptionalText(query.userId);
    const productId = asOptionalText(query.productId);
    const email = asOptionalText(query.email)?.toLowerCase();

    const admin = isCurrentMockUserAdmin();

    const filteredItems = mockDatabase.sampleOrders.filter((order) => {
        // Soft-deleted orders are invisible to everyone but an admin — the second axis of the
        // BE's `visibleScope`, which ownership alone does not cover.
        if (!isOrderVisibleToCaller(order, admin)) return false;
        if (id && order.id !== id) return false;
        if (userId && order.userId !== userId) return false;
        if (email && !order.email.toLowerCase().includes(email)) return false;
        if (productId && !order.items.some((item) => item.product.id === productId)) return false;
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
 * Mirrors `BE src/services/orders.ts` `remove()`: hard delete drops the row, soft delete toggles
 * `deletedAt` — so calling it twice restores the order rather than deleting it harder.
 *
 * Returns false when there is no such order, which is the 404 every caller below shares.
 */
const removeOrderById = (orderId: string, hardDelete: boolean): boolean => {
    const targetIndex = mockDatabase.sampleOrders.findIndex(({ id }) => id === orderId);
    if (targetIndex === -1) return false;

    if (hardDelete) {
        mockDatabase.sampleOrders.splice(targetIndex, 1);
        return true;
    }

    const target = mockDatabase.sampleOrders[targetIndex];
    mockDatabase.sampleOrders[targetIndex] = {
        ...target,
        // `undefined`, not an empty string: `isOrderVisibleToCaller` tests for absence, matching
        // the BE's `$exists: false`.
        deletedAt: target.deletedAt ? undefined : getIsoDateNow()
    };
    return true;
};

const orderNotFound = () =>
    toMockJsonResponse(createErrorEnvelope(404, 'NOT_FOUND', 'Order not found'), {
        status: 404,
        schema: MockErrorResponse
    });

export const registerOrdersMockHandlers = (): HttpHandler[] => {
    const pdfHeaders: Record<string, string> = { 'Content-Type': 'application/pdf' };

    return [
        http.get(`${API_BASE}/orders/:orderId/invoice`, () =>
            toMockArrayBufferResponse(createMockInvoicePdf(), { headers: pdfHeaders })
        ),
        http.get(`${API_BASE}/orders`, ({ request }) =>
            replyOrdersList(request.url, ListOrdersResponse)
        ),
        http.post(`${API_BASE}/orders`, ({ request }) =>
            readRequestBody<Record<string, unknown>>(request).then((requestBody) => {
                const createdOrder = createMockOrder({
                    userId: asText(requestBody.userId, mockDatabase.currentAuthenticatedUserId),
                    email: asText(requestBody.email, 'order@example.com'),
                    items: Array.isArray(requestBody.items)
                        ? (requestBody.items as CartItem[]).map((item) => cartItemToOrderItem(item))
                        : [],
                    notes: asOptionalText(requestBody.notes),
                    status: 'pending'
                });

                mockDatabase.sampleOrders.unshift(createdOrder);
                return toMockJsonResponse(createSuccessEnvelope(createdOrder), {
                    status: 201,
                    schema: CreateOrderResponse
                });
            })
        ),
        http.put(`${API_BASE}/orders`, ({ request }) => {
            return readRequestBody<UpdateOrderRequest>(request).then((requestBody) => {
                const targetIndex = mockDatabase.sampleOrders.findIndex(
                    ({ id }) => id === requestBody.id
                );

                if (targetIndex === -1)
                    return toMockJsonResponse(
                        createErrorEnvelope(404, 'NOT_FOUND', 'Order not found'),
                        {
                            status: 404,
                            schema: MockErrorResponse
                        }
                    );

                const updatedOrder: Order = {
                    ...mockDatabase.sampleOrders[targetIndex],
                    userId: requestBody.userId ?? mockDatabase.sampleOrders[targetIndex].userId,
                    email: requestBody.email ?? mockDatabase.sampleOrders[targetIndex].email,
                    items: requestBody.items
                        ? requestBody.items.map((item) => cartItemToOrderItem(item))
                        : mockDatabase.sampleOrders[targetIndex].items,
                    status: requestBody.status ?? mockDatabase.sampleOrders[targetIndex].status,
                    updatedAt: getIsoDateNow()
                };

                mockDatabase.sampleOrders[targetIndex] = updatedOrder;
                return toMockJsonResponse(createSuccessEnvelope(updatedOrder), {
                    schema: UpdateOrderResponse
                });
            });
        }),
        http.delete(`${API_BASE}/orders`, ({ request }) => {
            return readRequestBody<Record<string, unknown>>(request).then((requestBody) => {
                const targetId = asText(requestBody.id);

                if (!removeOrderById(targetId, readHardDeleteFlag(request.url, requestBody)))
                    return orderNotFound();

                return toMockJsonResponse(createMessageResponse('Order deleted'), {
                    schema: DeleteOrderResponse
                });
            });
        }),
        http.post(`${API_BASE}/orders/search`, ({ request }) => {
            return readRequestBody<Record<string, unknown>>(request).then((requestBody) => {
                return replyOrdersList(request.url, SearchOrdersResponse, requestBody);
            });
        }),
        // The one order write a customer can make. `pending` or `paid`, owner-scoped, the
        // shelf gets its units back, and a paid order's money comes back too — the facts the
        // BE's conditional write and its ORDER_CANCELLED listener carry.
        http.post(`${API_BASE}/orders/:orderId/cancel`, ({ params }) => {
            const order = mockDatabase.sampleOrders.find(({ id }) => id === String(params.orderId));
            if (!order || !isOrderVisibleToCaller(order, isCurrentMockUserAdmin()))
                return toMockJsonResponse(
                    createErrorEnvelope(404, 'NOT_FOUND', 'The requested order was not found'),
                    { status: 404, schema: MockErrorResponse }
                );
            if (order.status !== 'pending' && order.status !== 'paid')
                return toMockJsonResponse(
                    createErrorEnvelope(
                        409,
                        'ORDER_NOT_CANCELLABLE',
                        'This order can no longer be cancelled.'
                    ),
                    { status: 409, schema: MockErrorResponse }
                );

            const wasPaid = order.status === 'paid';
            order.status = 'cancelled';
            /*
             * `release`: the hold is given up, so `reserved` falls and `onHand` is untouched —
             * the units were never taken off the shelf, they were only spoken for.
             */
            for (const { product, quantity } of order.items)
                applyMockStockTransition('release', product.id, quantity, { reference: order.id });
            if (wasPaid) refundMockPaymentForOrder(order.id);
            return toMockJsonResponse(createSuccessEnvelope(order), {
                schema: CancelOrderByIdResponse
            });
        }),
        http.get(`${API_BASE}/orders/:orderId`, ({ params }) => {
            const orderId = String(params.orderId);
            const targetOrder = mockDatabase.sampleOrders.find((order) => order.id === orderId);

            // A soft-deleted order answers 404 rather than 403, the same rule the product item
            // route follows: the record's existence is not disclosed to a caller who may not
            // read it. Same visibility test as the list, so the two cannot disagree.
            if (!targetOrder || !isOrderVisibleToCaller(targetOrder, isCurrentMockUserAdmin()))
                return orderNotFound();

            return toMockJsonResponse(createSuccessEnvelope(targetOrder), {
                schema: GetOrderByIdResponse
            });
        }),
        http.put(`${API_BASE}/orders/:orderId`, ({ request, params }) => {
            const orderId = String(params.orderId);
            const targetIndex = mockDatabase.sampleOrders.findIndex(({ id }) => id === orderId);

            if (targetIndex === -1)
                return toMockJsonResponse(
                    createErrorEnvelope(404, 'NOT_FOUND', 'Order not found'),
                    {
                        status: 404,
                        schema: MockErrorResponse
                    }
                );
            return readRequestBody<UpdateOrderByIdRequest>(request).then((requestBody) => {
                const updatedOrder: Order = {
                    ...mockDatabase.sampleOrders[targetIndex],
                    userId: requestBody.userId ?? mockDatabase.sampleOrders[targetIndex].userId,
                    email: requestBody.email ?? mockDatabase.sampleOrders[targetIndex].email,
                    items: requestBody.items
                        ? requestBody.items.map((item) => cartItemToOrderItem(item))
                        : mockDatabase.sampleOrders[targetIndex].items,
                    status: requestBody.status ?? mockDatabase.sampleOrders[targetIndex].status,
                    updatedAt: getIsoDateNow()
                };

                mockDatabase.sampleOrders[targetIndex] = updatedOrder;
                // A status landing on `shipped` mints the parcel and its email, exactly as the
                // BE's ORDER_STATUS_CHANGED listener does — idempotently, in shipMockOrder.
                if (updatedOrder.status === 'shipped')
                    shipMockOrder(updatedOrder.id, updatedOrder.email);
                return toMockJsonResponse(createSuccessEnvelope(updatedOrder), {
                    schema: UpdateOrderByIdResponse
                });
            });
        }),
        // Must come before /orders/:orderId, or `hard` is matched as an order id.
        http.delete(`${API_BASE}/orders/:orderId/hard`, ({ params }) => {
            if (!removeOrderById(String(params.orderId), true)) return orderNotFound();

            return toMockJsonResponse(createMessageResponse('Order deleted'), {
                schema: HardDeleteOrderByIdResponse
            });
        }),
        http.delete(`${API_BASE}/orders/:orderId`, ({ request, params }) => {
            if (!removeOrderById(String(params.orderId), readHardDeleteFlag(request.url)))
                return orderNotFound();

            return toMockJsonResponse(createMessageResponse('Order deleted'), {
                schema: DeleteOrderByIdResponse
            });
        })
    ];
};
