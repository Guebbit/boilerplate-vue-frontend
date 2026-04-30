import { http, type HttpHandler } from 'msw';
import { OrderStatusEnum } from '@/types';
import {
    cartItemToOrderItem,
    createMockOrder,
    getCartResponse,
    calculateCartSummary,
    mockDatabase,
    readRequestBody
} from '../shared/mockShared.ts';
import { toMockJsonResponse } from '../shared/mockTransport.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const registerCartMockHandlers = (): HttpHandler[] => [
    http.get(`${API_BASE}/cart/summary`, () => toMockJsonResponse(calculateCartSummary())),
    http.get(`${API_BASE}/cart`, () => toMockJsonResponse(getCartResponse())),
    http.post(`${API_BASE}/cart`, async ({ request }) => {
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
    http.delete(`${API_BASE}/cart`, async ({ request }) => {
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
    http.put(`${API_BASE}/cart/:productId`, async ({ request, params }) => {
        const productId = String(params.productId);
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
    http.delete(`${API_BASE}/cart/:productId`, ({ params }) => {
        const productId = String(params.productId);
        mockDatabase.sampleCartItems = mockDatabase.sampleCartItems.filter(
            (item) => item.productId !== productId
        );
        return toMockJsonResponse(getCartResponse());
    }),
    http.post(`${API_BASE}/cart/checkout`, async ({ request }) => {
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
