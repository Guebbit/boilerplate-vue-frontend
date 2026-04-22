import type MockAdapter from 'axios-mock-adapter';
import { OrderStatusEnum } from '@/types';
import {
    cartItemToOrderItem,
    createMockOrder,
    getCartResponse,
    calculateCartSummary,
    getLastPathSegment,
    mockDatabase,
    parseRequestBody
} from '../shared/mockShared.ts';
import { toMockReply } from '../shared/mockTransport.ts';

export const registerCartMockHandlers = (mockAdapter: MockAdapter) => {
    mockAdapter.onGet(/\/cart\/summary(?:\?.*)?$/).reply(() => toMockReply(calculateCartSummary()));

    mockAdapter.onGet(/\/cart(?:\?.*)?$/).reply(() => toMockReply(getCartResponse()));

    mockAdapter.onPost(/\/cart(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const productId = String(requestBody.productId ?? '');
        const quantity = Math.max(0, Number(requestBody.quantity ?? 0));
        if (!mockDatabase.sampleProducts.some((product) => product.id === productId))
            return toMockReply(
                { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } },
                { status: 404 }
            );

        const existingItemIndex = mockDatabase.sampleCartItems.findIndex(
            (item) => item.productId === productId
        );
        if (existingItemIndex === -1)
            mockDatabase.sampleCartItems.push({ productId, quantity: quantity || 1 });
        else
            mockDatabase.sampleCartItems[existingItemIndex].quantity =
                quantity || mockDatabase.sampleCartItems[existingItemIndex].quantity;
        mockDatabase.sampleCartItems = mockDatabase.sampleCartItems.filter(
            (item) => item.quantity > 0
        );
        return toMockReply(getCartResponse());
    });

    mockAdapter.onDelete(/\/cart(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const productId = requestBody.productId ? String(requestBody.productId) : undefined;
        if (!productId) {
            mockDatabase.sampleCartItems = [];
            return toMockReply(getCartResponse());
        }
        mockDatabase.sampleCartItems = mockDatabase.sampleCartItems.filter(
            (item) => item.productId !== productId
        );
        return toMockReply(getCartResponse());
    });

    mockAdapter.onPut(/\/cart\/[^/]+(?:\?.*)?$/).reply((config) => {
        const productId = getLastPathSegment(config.url);
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const quantity = Math.max(0, Number(requestBody.quantity ?? 0));
        if (!productId || !mockDatabase.sampleProducts.some((product) => product.id === productId))
            return toMockReply(
                { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } },
                { status: 404 }
            );
        const existingItemIndex = mockDatabase.sampleCartItems.findIndex(
            (item) => item.productId === productId
        );
        if (existingItemIndex === -1)
            mockDatabase.sampleCartItems.push({ productId, quantity: quantity || 1 });
        else mockDatabase.sampleCartItems[existingItemIndex].quantity = quantity;
        mockDatabase.sampleCartItems = mockDatabase.sampleCartItems.filter(
            (item) => item.quantity > 0
        );
        return toMockReply(getCartResponse());
    });

    mockAdapter.onDelete(/\/cart\/[^/]+(?:\?.*)?$/).reply((config) => {
        const productId = getLastPathSegment(config.url);
        mockDatabase.sampleCartItems = mockDatabase.sampleCartItems.filter(
            (item) => item.productId !== productId
        );
        return toMockReply(getCartResponse());
    });

    mockAdapter.onPost(/\/cart\/checkout(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const email = String(
            requestBody.email ??
                mockDatabase.sampleUsers.find(
                    (user) => user.id === mockDatabase.currentAuthenticatedUserId
                )?.email ??
                'mock@example.com'
        );
        const createdOrder = createMockOrder({
            userId: mockDatabase.currentAuthenticatedUserId,
            email,
            items: mockDatabase.sampleCartItems.map((item) => cartItemToOrderItem(item)),
            notes: requestBody.notes ? String(requestBody.notes) : undefined,
            status: OrderStatusEnum.Pending
        });
        mockDatabase.sampleOrders.unshift(createdOrder);
        mockDatabase.sampleCartItems = [];
        return toMockReply({ order: createdOrder, message: 'Checkout completed' }, { status: 201 });
    });
};
