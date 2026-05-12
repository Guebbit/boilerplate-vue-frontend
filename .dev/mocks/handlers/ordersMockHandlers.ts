import { http, type HttpHandler } from 'msw';
import type { CartItem, Order, OrdersResponse, UpdateOrderByIdRequest, UpdateOrderRequest } from '@/types';
import {
    cartItemToOrderItem,
    createMessageResponse,
    createMockInvoicePdf,
    createMockOrder,
    getIsoDateNow,
    getQueryParameters,
    mockDatabase,
    readRequestBody,
    slicePaginatedData,
    toNumberOrDefault,
    toPaginationMeta
} from '../shared/mockShared.ts';
import { toMockArrayBufferResponse, toMockJsonResponse } from '../shared/mockTransport.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

const replyOrdersList = (url: string | undefined, parameters?: unknown) => {
    const query = getQueryParameters(url, parameters);
    const page = toNumberOrDefault(query.page, 1);
    const pageSize = toNumberOrDefault(query.pageSize, 10);
    const id = query.id ? String(query.id) : undefined;
    const userId = query.userId ? String(query.userId) : undefined;
    const productId = query.productId ? String(query.productId) : undefined;
    const email = query.email ? String(query.email).toLowerCase() : undefined;

    const filteredItems = mockDatabase.sampleOrders.filter((order) => {
        if (id && order.id !== id) return false;
        if (userId && order.userId !== userId) return false;
        if (email && !order.email.toLowerCase().includes(email)) return false;
        if (productId && !order.items.some((item) => item.product.id === productId)) return false;
        return true;
    });

    return toMockJsonResponse<OrdersResponse>({
        items: slicePaginatedData(filteredItems, page, pageSize),
        meta: toPaginationMeta(filteredItems.length, page, pageSize)
    });
};

export const registerOrdersMockHandlers = (): HttpHandler[] => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const pdfHeaders: Record<string, string> = { 'Content-Type': 'application/pdf' };

    return [
        http.get(`${API_BASE}/orders/:orderId/invoice`, () =>
            toMockArrayBufferResponse(createMockInvoicePdf(), { headers: pdfHeaders })
        ),
        http.get(`${API_BASE}/orders`, ({ request }) => replyOrdersList(request.url)),
        http.post(`${API_BASE}/orders`, async ({ request }) => {
            const requestBody = await readRequestBody<Record<string, unknown>>(request);
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
            return toMockJsonResponse(createdOrder, { status: 201 });
        }),
        http.put(`${API_BASE}/orders`, async ({ request }) => {
            const requestBody = await readRequestBody<UpdateOrderRequest>(request);
            const targetIndex = mockDatabase.sampleOrders.findIndex(({ id }) => id === requestBody.id);

            if (targetIndex === -1)
                return toMockJsonResponse(
                    { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } },
                    { status: 404 }
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
            return toMockJsonResponse(updatedOrder);
        }),
        http.delete(`${API_BASE}/orders`, async ({ request }) => {
            const requestBody = await readRequestBody<Record<string, unknown>>(request);
            const targetId = String(requestBody.id ?? '');
            const targetIndex = mockDatabase.sampleOrders.findIndex(({ id }) => id === targetId);

            if (targetIndex === -1)
                return toMockJsonResponse(
                    { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } },
                    { status: 404 }
                );

            mockDatabase.sampleOrders.splice(targetIndex, 1);
            return toMockJsonResponse(createMessageResponse('Order deleted'));
        }),
        http.post(`${API_BASE}/orders/search`, async ({ request }) => {
            const requestBody = await readRequestBody<Record<string, unknown>>(request);
            return replyOrdersList(request.url, requestBody);
        }),
        http.get(`${API_BASE}/orders/:orderId`, ({ params }) => {
            const orderId = String(params.orderId);
            const targetOrder = mockDatabase.sampleOrders.find((order) => order.id === orderId);

            if (!targetOrder)
                return toMockJsonResponse(
                    { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } },
                    { status: 404 }
                );

            return toMockJsonResponse(targetOrder);
        }),
        http.put(`${API_BASE}/orders/:orderId`, async ({ request, params }) => {
            const orderId = String(params.orderId);
            const targetIndex = mockDatabase.sampleOrders.findIndex(({ id }) => id === orderId);

            if (targetIndex === -1)
                return toMockJsonResponse(
                    { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } },
                    { status: 404 }
                );

            const requestBody = await readRequestBody<UpdateOrderByIdRequest>(request);
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
            return toMockJsonResponse(updatedOrder);
        }),
        http.delete(`${API_BASE}/orders/:orderId`, ({ params }) => {
            const orderId = String(params.orderId);
            const targetIndex = mockDatabase.sampleOrders.findIndex(({ id }) => id === orderId);

            if (targetIndex === -1)
                return toMockJsonResponse(
                    { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } },
                    { status: 404 }
                );

            mockDatabase.sampleOrders.splice(targetIndex, 1);
            return toMockJsonResponse(createMessageResponse('Order deleted'));
        })
    ];
};
