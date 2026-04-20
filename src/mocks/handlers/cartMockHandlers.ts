import type MockAdapter from 'axios-mock-adapter';
import { OrderStatusEnum } from '@types';
import {
    cartItemToOrderItem,
    createMockOrder,
    getCartResponse,
    calculateCartSummary,
    getLastPathSegment,
    mockDatabase,
    parseRequestBody
} from '@/mocks/shared/mockShared.ts';

export const registerCartMockHandlers = (mockAdapter: MockAdapter) => {
    mockAdapter.onGet(/\/cart\/summary(?:\?.*)?$/).reply(() => [200, calculateCartSummary()]);

    mockAdapter.onGet(/\/cart(?:\?.*)?$/).reply(() => [200, getCartResponse()]);

    mockAdapter.onPost(/\/cart(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const productId = String(requestBody.productId ?? '');
        const quantity = Math.max(0, Number(requestBody.quantity ?? 0));
        if (!mockDatabase.sampleProducts.some((product) => product.id === productId))
            return [
                404,
                { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }
            ];

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
        return [200, getCartResponse()];
    });

    mockAdapter.onDelete(/\/cart(?:\?.*)?$/).reply((config) => {
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const productId = requestBody.productId ? String(requestBody.productId) : undefined;
        if (!productId) {
            mockDatabase.sampleCartItems = [];
            return [200, getCartResponse()];
        }
        mockDatabase.sampleCartItems = mockDatabase.sampleCartItems.filter(
            (item) => item.productId !== productId
        );
        return [200, getCartResponse()];
    });

    mockAdapter.onPut(/\/cart\/[^/]+(?:\?.*)?$/).reply((config) => {
        const productId = getLastPathSegment(config.url);
        const requestBody = parseRequestBody<Record<string, unknown>>(config.data);
        const quantity = Math.max(0, Number(requestBody.quantity ?? 0));
        if (!productId || !mockDatabase.sampleProducts.some((product) => product.id === productId))
            return [
                404,
                { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } }
            ];
        const existingItemIndex = mockDatabase.sampleCartItems.findIndex(
            (item) => item.productId === productId
        );
        if (existingItemIndex === -1)
            mockDatabase.sampleCartItems.push({ productId, quantity: quantity || 1 });
        else mockDatabase.sampleCartItems[existingItemIndex].quantity = quantity;
        mockDatabase.sampleCartItems = mockDatabase.sampleCartItems.filter(
            (item) => item.quantity > 0
        );
        return [200, getCartResponse()];
    });

    mockAdapter.onDelete(/\/cart\/[^/]+(?:\?.*)?$/).reply((config) => {
        const productId = getLastPathSegment(config.url);
        mockDatabase.sampleCartItems = mockDatabase.sampleCartItems.filter(
            (item) => item.productId !== productId
        );
        return [200, getCartResponse()];
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
            items: mockDatabase.sampleCartItems.map(cartItemToOrderItem),
            notes: requestBody.notes ? String(requestBody.notes) : undefined,
            status: OrderStatusEnum.Pending
        });
        mockDatabase.sampleOrders.unshift(createdOrder);
        mockDatabase.sampleCartItems = [];
        return [201, { order: createdOrder, message: 'Checkout completed' }];
    });
};
