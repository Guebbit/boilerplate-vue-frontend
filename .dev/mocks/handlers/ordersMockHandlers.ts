import type MockAdapter from 'axios-mock-adapter';
import type {
    CartItem,
    Order,
    OrdersResponse,
    UpdateOrderByIdRequest,
    UpdateOrderRequest
} from '@/types';
import { OrderStatusEnum } from '@/types';
import {
    cartItemToOrderItem,
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
} from '../shared/mockShared.ts';
import { toMockReply } from '../shared/mockTransport.ts';

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

    return toMockReply<OrdersResponse>({
        items: slicePaginatedData(filteredItems, page, pageSize),
        meta: toPaginationMeta(filteredItems.length, page, pageSize)
    });
};

export const registerOrdersMockHandlers = (mockAdapter: MockAdapter) => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const pdfHeaders: Record<string, string> = { 'Content-Type': 'application/pdf' };
    mockAdapter
        .onGet(/\/orders\/[^/]+\/invoice(?:\?.*)?$/)
        .reply(() => toMockReply(createMockInvoicePdf(), { headers: pdfHeaders }));

    mockAdapter
        .onGet(/\/orders(?:\?.*)?$/)
        .reply((config) => replyOrdersList(config.url, config.params));

    mockAdapter.onPost(/\/orders(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const createdOrder = createMockOrder({
            userId: String(requestBody.userId ?? mockDatabase.currentAuthenticatedUserId),
            email: String(requestBody.email ?? 'order@example.com'),
            items: Array.isArray(requestBody.items)
                ? (requestBody.items as CartItem[]).map((item) => cartItemToOrderItem(item))
                : [],
            notes: requestBody.notes ? String(requestBody.notes) : undefined,
            status: OrderStatusEnum.Pending
        });
        mockDatabase.sampleOrders.unshift(createdOrder);
        return toMockReply(createdOrder, { status: 201 });
    });

    mockAdapter.onPut(/\/orders(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<UpdateOrderRequest>(config.data);
        const targetIndex = mockDatabase.sampleOrders.findIndex(({ id }) => id === requestBody.id);
        if (targetIndex === -1)
            return toMockReply(
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
        return toMockReply(updatedOrder);
    });

    mockAdapter.onDelete(/\/orders(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const targetId = String(requestBody.id ?? '');
        const targetIndex = mockDatabase.sampleOrders.findIndex(({ id }) => id === targetId);
        if (targetIndex === -1)
            return toMockReply(
                { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } },
                { status: 404 }
            );
        mockDatabase.sampleOrders.splice(targetIndex, 1);
        return toMockReply(createMessageResponse('Order deleted'));
    });

    mockAdapter.onPost(/\/orders\/search(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        return replyOrdersList(config.url, requestBody);
    });

    mockAdapter.onGet(/\/orders\/[^/]+(?:\?.*)?$/).reply((config) => {
        const orderId = getLastPathSegment(config.url);
        const targetOrder = mockDatabase.sampleOrders.find((order) => order.id === orderId);
        if (!targetOrder)
            return toMockReply(
                { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } },
                { status: 404 }
            );
        return toMockReply(targetOrder);
    });

    mockAdapter.onPut(/\/orders\/[^/]+(?:\?.*)?$/).reply((config) => {
        const orderId = getLastPathSegment(config.url);
        const targetIndex = mockDatabase.sampleOrders.findIndex(({ id }) => id === orderId);
        if (targetIndex === -1)
            return toMockReply(
                { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } },
                { status: 404 }
            );
        const requestBody = parseRequestBody<UpdateOrderByIdRequest>(config.data);
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
        return toMockReply(updatedOrder);
    });

    mockAdapter.onDelete(/\/orders\/[^/]+(?:\?.*)?$/).reply((config) => {
        const orderId = getLastPathSegment(config.url);
        const targetIndex = mockDatabase.sampleOrders.findIndex(({ id }) => id === orderId);
        if (targetIndex === -1)
            return toMockReply(
                { success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } },
                { status: 404 }
            );
        mockDatabase.sampleOrders.splice(targetIndex, 1);
        return toMockReply(createMessageResponse('Order deleted'));
    });
};
