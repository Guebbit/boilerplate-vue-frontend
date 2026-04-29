import { http, type HttpHandler } from 'msw';
import { OrderStatusEnum } from '@/types';
import {
    cartItemToOrderItem,
    createMockOrder,
    getCartResponse,
    calculateCartSummary,
    getLastPathSegment,
    mockDatabase,
    readRequestBody
} from '../shared/mockShared.ts';
import { toMockJsonResponse } from '../shared/mockTransport.ts';

export const registerCartMockHandlers = (): HttpHandler[] => [
    http.get(/\/cart\/summary(?:\?.*)?$/, () => toMockJsonResponse(calculateCartSummary())),
    http.get(/\/cart(?:\?.*)?$/, () => toMockJsonResponse(getCartResponse())),
    http.post(/\/cart(?:\?.*)?$/, async ({ request }) => {
        const requestBody = await readRequestBody<Record<string, unknown>>(request);
        const productId = String(requestBody.productId ?? '');
        const quantity = Math.max(0, Number(requestBody.quantity ?? 0));

        if (!mockDatabase.sampleProducts.some((product) => product.id === productId))
            return toMockJsonResponse(
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

        mockDatabase.sampleCartItems = mockDatabase.sampleCartItems.filter((item) => item.quantity > 0);
        return toMockJsonResponse(getCartResponse());
    }),
    http.delete(/\/cart(?:\?.*)?$/, async ({ request }) => {
        const requestBody = await readRequestBody<Record<string, unknown>>(request);
        const productId = requestBody.productId ? String(requestBody.productId) : undefined;

        if (!productId) {
            mockDatabase.sampleCartItems = [];
            return toMockJsonResponse(getCartResponse());
        }

        mockDatabase.sampleCartItems = mockDatabase.sampleCartItems.filter(
            (item) => item.productId !== productId
        );
        return toMockJsonResponse(getCartResponse());
    }),
    http.put(/\/cart\/[^/]+(?:\?.*)?$/, async ({ request }) => {
        const productId = getLastPathSegment(request.url);
        const requestBody = await readRequestBody<Record<string, unknown>>(request);
        const quantity = Math.max(0, Number(requestBody.quantity ?? 0));

        if (!productId || !mockDatabase.sampleProducts.some((product) => product.id === productId))
            return toMockJsonResponse(
                { success: false, error: { code: 'NOT_FOUND', message: 'Product not found' } },
                { status: 404 }
            );

        const existingItemIndex = mockDatabase.sampleCartItems.findIndex(
            (item) => item.productId === productId
        );

        if (existingItemIndex === -1)
            mockDatabase.sampleCartItems.push({ productId, quantity: quantity || 1 });
        else mockDatabase.sampleCartItems[existingItemIndex].quantity = quantity;

        mockDatabase.sampleCartItems = mockDatabase.sampleCartItems.filter((item) => item.quantity > 0);
        return toMockJsonResponse(getCartResponse());
    }),
    http.delete(/\/cart\/[^/]+(?:\?.*)?$/, ({ request }) => {
        const productId = getLastPathSegment(request.url);
        mockDatabase.sampleCartItems = mockDatabase.sampleCartItems.filter(
            (item) => item.productId !== productId
        );
        return toMockJsonResponse(getCartResponse());
    }),
    http.post(/\/cart\/checkout(?:\?.*)?$/, async ({ request }) => {
        const requestBody = await readRequestBody<Record<string, unknown>>(request);
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
        return toMockJsonResponse({ order: createdOrder, message: 'Checkout completed' }, { status: 201 });
    })
];
