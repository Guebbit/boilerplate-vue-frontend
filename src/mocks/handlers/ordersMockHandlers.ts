import type MockAdapter from 'axios-mock-adapter';
import type {
    CartItem,
    Order,
    OrdersResponse,
    UpdateOrderByIdRequest,
    UpdateOrderRequest
} from '@types';
import { OrderStatusEnum } from '@types';
import {
    createMessageResponse,
    createMockInvoicePdf,
    createMockOrder,
    getIsoDateNow,
    getLastPathSegment,
    getQueryParameters,
    mockDatabase,
    parseRequestBody,
    slicePaginatedData,
    toNumberOrDefault,
    toPaginationMeta
} from '@/mocks/shared/mockShared.ts';

const replyOrdersList = (
    url: string | undefined,
    parameters?: unknown
): [number, OrdersResponse] => {
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
        if (productId && !order.items.some((item) => item.productId === productId)) return false;
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

export const registerOrdersMockHandlers = (mockAdapter: MockAdapter) => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const pdfHeaders: Record<string, string> = { 'Content-Type': 'application/pdf' };
    mockAdapter
        .onGet(/\/orders\/[^/]+\/invoice(?:\?.*)?$/)
        .reply(200, createMockInvoicePdf(), pdfHeaders);

    mockAdapter
        .onGet(/\/orders(?:\?.*)?$/)
        .reply((config) => replyOrdersList(config.url, config.params));

    mockAdapter.onPost(/\/orders(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const createdOrder = createMockOrder({
            userId: String(requestBody.userId ?? mockDatabase.currentAuthenticatedUserId),
            email: String(requestBody.email ?? 'order@example.com'),
            items: Array.isArray(requestBody.items) ? (requestBody.items as CartItem[]) : [],
            notes: requestBody.notes ? String(requestBody.notes) : undefined,
            status: OrderStatusEnum.Pending
        });
        mockDatabase.sampleOrders.unshift(createdOrder);
        return [201, createdOrder];
    });

    mockAdapter.onPut(/\/orders(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<UpdateOrderRequest>(config.data);
        const targetIndex = mockDatabase.sampleOrders.findIndex(({ id }) => id === requestBody.id);
        if (targetIndex === -1)
            return [
                404,
                { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }
            ];
        const updatedOrder: Order = {
            ...mockDatabase.sampleOrders[targetIndex],
            userId: requestBody.userId ?? mockDatabase.sampleOrders[targetIndex].userId,
            email: requestBody.email ?? mockDatabase.sampleOrders[targetIndex].email,
            items: requestBody.items ?? mockDatabase.sampleOrders[targetIndex].items,
            status: requestBody.status ?? mockDatabase.sampleOrders[targetIndex].status,
            updatedAt: getIsoDateNow()
        };
        mockDatabase.sampleOrders[targetIndex] = updatedOrder;
        return [200, updatedOrder];
    });

    mockAdapter.onDelete(/\/orders(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const targetId = String(requestBody.id ?? '');
        const targetIndex = mockDatabase.sampleOrders.findIndex(({ id }) => id === targetId);
        if (targetIndex === -1)
            return [
                404,
                { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }
            ];
        mockDatabase.sampleOrders.splice(targetIndex, 1);
        return [200, createMessageResponse('Order deleted')];
    });

    mockAdapter.onPost(/\/orders\/search(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        return replyOrdersList(config.url, requestBody);
    });

    mockAdapter.onGet(/\/orders\/[^/]+(?:\?.*)?$/).reply((config) => {
        const orderId = getLastPathSegment(config.url);
        const targetOrder = mockDatabase.sampleOrders.find((order) => order.id === orderId);
        if (!targetOrder)
            return [
                404,
                { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }
            ];
        return [200, targetOrder];
    });

    mockAdapter.onPut(/\/orders\/[^/]+(?:\?.*)?$/).reply((config) => {
        const orderId = getLastPathSegment(config.url);
        const targetIndex = mockDatabase.sampleOrders.findIndex(({ id }) => id === orderId);
        if (targetIndex === -1)
            return [
                404,
                { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }
            ];
        const requestBody = parseRequestBody<UpdateOrderByIdRequest>(config.data);
        const updatedOrder: Order = {
            ...mockDatabase.sampleOrders[targetIndex],
            userId: requestBody.userId ?? mockDatabase.sampleOrders[targetIndex].userId,
            email: requestBody.email ?? mockDatabase.sampleOrders[targetIndex].email,
            items: requestBody.items ?? mockDatabase.sampleOrders[targetIndex].items,
            status: requestBody.status ?? mockDatabase.sampleOrders[targetIndex].status,
            updatedAt: getIsoDateNow()
        };
        mockDatabase.sampleOrders[targetIndex] = updatedOrder;
        return [200, updatedOrder];
    });

    mockAdapter.onDelete(/\/orders\/[^/]+(?:\?.*)?$/).reply((config) => {
        const orderId = getLastPathSegment(config.url);
        const targetIndex = mockDatabase.sampleOrders.findIndex(({ id }) => id === orderId);
        if (targetIndex === -1)
            return [
                404,
                { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }
            ];
        mockDatabase.sampleOrders.splice(targetIndex, 1);
        return [200, createMessageResponse('Order deleted')];
    });
};
