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
    DeleteOrderByIdResponse
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
    mockDatabase,
    readRequestBody,
    slicePaginatedData,
    toNumberOrDefault,
    toPaginationMeta
} from '../shared/mockShared.ts';
import { toMockArrayBufferResponse, toMockJsonResponse } from '../shared/mockTransport.ts';
import { MockErrorResponse } from '../shared/mockValidation.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const replyOrdersList = (
    url: string | undefined,
    schema: typeof ListOrdersResponse | typeof SearchOrdersResponse,
    parameters?: unknown
) => {
    const query = getQueryParameters(url, parameters);
    const page = toNumberOrDefault(query.page, 1);
    const pageSize = toNumberOrDefault(query.pageSize, 10);
    const id = query.id ? String(query.id) : undefined;
    // Non-admin callers are pinned to their own orders and their `userId` filter is
    // discarded, exactly as `getOrders` does with `userScope(request)` in the BE. Without
    // this the mock let any caller list every order by passing ?userId=…
    const scopedUserId = getMockUserScope();
    const userId = scopedUserId ?? (query.userId ? String(query.userId) : undefined);
    const productId = query.productId ? String(query.productId) : undefined;
    const email = query.email ? String(query.email).toLowerCase() : undefined;

    const filteredItems = mockDatabase.sampleOrders.filter((order) => {
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

export const registerOrdersMockHandlers = (): HttpHandler[] => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
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
                    userId: String(requestBody.userId ?? mockDatabase.currentAuthenticatedUserId),
                    email: String(requestBody.email ?? 'order@example.com'),
                    items: Array.isArray(requestBody.items)
                        ? (requestBody.items as CartItem[]).map((item) => cartItemToOrderItem(item))
                        : [],
                    notes: requestBody.notes ? String(requestBody.notes) : undefined,
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
                const targetId = String(requestBody.id ?? '');
                const targetIndex = mockDatabase.sampleOrders.findIndex(
                    ({ id }) => id === targetId
                );

                if (targetIndex === -1)
                    return toMockJsonResponse(
                        createErrorEnvelope(404, 'NOT_FOUND', 'Order not found'),
                        {
                            status: 404,
                            schema: MockErrorResponse
                        }
                    );

                mockDatabase.sampleOrders.splice(targetIndex, 1);
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
        http.get(`${API_BASE}/orders/:orderId`, ({ params }) => {
            const orderId = String(params.orderId);
            const targetOrder = mockDatabase.sampleOrders.find((order) => order.id === orderId);

            if (!targetOrder)
                return toMockJsonResponse(
                    createErrorEnvelope(404, 'NOT_FOUND', 'Order not found'),
                    {
                        status: 404,
                        schema: MockErrorResponse
                    }
                );

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
                return toMockJsonResponse(createSuccessEnvelope(updatedOrder), {
                    schema: UpdateOrderByIdResponse
                });
            });
        }),
        http.delete(`${API_BASE}/orders/:orderId`, ({ params }) => {
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

            mockDatabase.sampleOrders.splice(targetIndex, 1);
            return toMockJsonResponse(createMessageResponse('Order deleted'), {
                schema: DeleteOrderByIdResponse
            });
        })
    ];
};
