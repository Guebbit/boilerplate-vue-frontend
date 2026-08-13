import { http, type HttpHandler } from 'msw';
import {
    GetCartResponse,
    GetCartSummaryResponse,
    UpsertCartItemResponse,
    ClearCartResponse,
    UpdateCartItemByIdResponse,
    RemoveCartItemResponse,
    CheckoutResponse,
    ReorderResponse
} from '@api/schemas';
import {
    cartItemToOrderItem,
    createErrorEnvelope,
    createMockOrder,
    createSuccessEnvelope,
    getCartResponse,
    calculateCartSummary,
    isCurrentMockUserAdmin,
    isOrderVisibleToCaller,
    isVisibleToCaller,
    mockDatabase,
    readRequestBody,
    recordMockEmail
} from '@mocks/mockShared.ts';
import { toMockJsonResponse } from '@mocks/mockTransport.ts';
import { MockErrorResponse } from '@mocks/mockValidation.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export const registerCartMockHandlers = (): HttpHandler[] => [
    http.get(`${API_BASE}/cart/summary`, () =>
        toMockJsonResponse(createSuccessEnvelope(calculateCartSummary()), {
            schema: GetCartSummaryResponse
        })
    ),
    http.get(`${API_BASE}/cart`, () =>
        toMockJsonResponse(createSuccessEnvelope(getCartResponse()), { schema: GetCartResponse })
    ),
    http.post(`${API_BASE}/cart`, ({ request }) =>
        readRequestBody<Record<string, unknown>>(request).then((requestBody) => {
            const productId = String(requestBody.productId ?? '');
            const quantity = Math.max(0, Number(requestBody.quantity ?? 0));

            if (!mockDatabase.sampleProducts.some((product) => product.id === productId))
                return toMockJsonResponse(
                    createErrorEnvelope(404, 'NOT_FOUND', 'Product not found'),
                    {
                        status: 404,
                        schema: MockErrorResponse
                    }
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
            return toMockJsonResponse(createSuccessEnvelope(getCartResponse()), {
                schema: UpsertCartItemResponse
            });
        })
    ),
    http.delete(`${API_BASE}/cart`, ({ request }) =>
        readRequestBody<Record<string, unknown>>(request).then((requestBody) => {
            const productId = requestBody.productId ? String(requestBody.productId) : undefined;

            if (!productId) {
                mockDatabase.sampleCartItems = [];
                return toMockJsonResponse(createSuccessEnvelope(getCartResponse()), {
                    schema: ClearCartResponse
                });
            }

            mockDatabase.sampleCartItems = mockDatabase.sampleCartItems.filter(
                (item) => item.productId !== productId
            );
            return toMockJsonResponse(createSuccessEnvelope(getCartResponse()), {
                schema: ClearCartResponse
            });
        })
    ),
    http.put(`${API_BASE}/cart/:productId`, ({ request, params }) => {
        const productId = String(params.productId);
        return readRequestBody<Record<string, unknown>>(request).then((requestBody) => {
            const quantity = Math.max(0, Number(requestBody.quantity ?? 0));

            if (
                !productId ||
                !mockDatabase.sampleProducts.some((product) => product.id === productId)
            )
                return toMockJsonResponse(
                    createErrorEnvelope(404, 'NOT_FOUND', 'Product not found'),
                    {
                        status: 404,
                        schema: MockErrorResponse
                    }
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
            return toMockJsonResponse(createSuccessEnvelope(getCartResponse()), {
                schema: UpdateCartItemByIdResponse
            });
        });
    }),
    http.delete(`${API_BASE}/cart/:productId`, ({ params }) => {
        const productId = String(params.productId);
        mockDatabase.sampleCartItems = mockDatabase.sampleCartItems.filter(
            (item) => item.productId !== productId
        );
        return toMockJsonResponse(createSuccessEnvelope(getCartResponse()), {
            schema: RemoveCartItemResponse
        });
    }),
    http.post(`${API_BASE}/cart/checkout`, ({ request }) =>
        readRequestBody<Record<string, unknown>>(request).then((requestBody) => {
            /*
             * The stock gate, mirroring the BE's conditional decrement: a line over the shelf
             * refuses the whole checkout with the same code, and a completed one takes its
             * units — the storefront's counts move under the demo exactly as they would live.
             */
            const overShelf = mockDatabase.sampleCartItems.some((item) => {
                const product = mockDatabase.sampleProducts.find(({ id }) => id === item.productId);
                return product?.stock !== undefined && item.quantity > product.stock;
            });
            if (overShelf)
                return toMockJsonResponse(
                    createErrorEnvelope(
                        409,
                        'CART_INSUFFICIENT_STOCK',
                        'One or more products in your cart exceed the available stock.'
                    ),
                    { status: 409, schema: MockErrorResponse }
                );
            for (const item of mockDatabase.sampleCartItems) {
                const product = mockDatabase.sampleProducts.find(({ id }) => id === item.productId);
                if (product?.stock !== undefined) product.stock -= item.quantity;
            }

            const email = String(
                requestBody.email ??
                    mockDatabase.sampleUsers.find(
                        (user) => user.id === mockDatabase.currentAuthenticatedUserId
                    )?.email ??
                    'mock@example.com'
            );

            const createdOrder = createMockOrder({
                userId: mockDatabase.currentAuthenticatedUserId ?? 'anonymous',
                email,
                items: mockDatabase.sampleCartItems.map((item) => cartItemToOrderItem(item)),
                notes: requestBody.notes ? String(requestBody.notes) : undefined,
                status: 'pending'
            });

            mockDatabase.sampleOrders.unshift(createdOrder);
            mockDatabase.sampleCartItems = [];
            // The confirmation the BE checkout sends, bought lines and all — into the outbox,
            // where the journey spec reads it the way a customer reads their inbox.
            recordMockEmail({
                to: email,
                subject: 'Order confirmed',
                template: 'orders.order-confirm.ejs',
                lines: createdOrder.items.map(
                    ({ product, quantity }) => `${product.title} — ${quantity} × ${product.price}`
                )
            });
            return toMockJsonResponse(
                createSuccessEnvelope({ order: createdOrder, message: 'Checkout completed' }),
                { status: 201, schema: CheckoutResponse }
            );
        })
    ),

    // Reorder — one of the caller's own orders refills the cart. Products that have since left
    // the public catalogue are skipped, exactly as the BE's `publicScope` re-resolution skips
    // them; an order with nothing left answers the same 409.
    http.post(`${API_BASE}/cart/reorder/:orderId`, ({ params }) => {
        const order = mockDatabase.sampleOrders.find(({ id }) => id === String(params.orderId));
        if (!order || !isOrderVisibleToCaller(order, isCurrentMockUserAdmin()))
            return toMockJsonResponse(
                createErrorEnvelope(404, 'NOT_FOUND', 'The requested order was not found'),
                { status: 404, schema: MockErrorResponse }
            );

        const addable = order.items.filter(({ product }) => {
            const current = mockDatabase.sampleProducts.find(({ id }) => id === product.id);
            return current !== undefined && isVisibleToCaller(current, false);
        });
        if (addable.length === 0)
            return toMockJsonResponse(
                createErrorEnvelope(
                    409,
                    'REORDER_UNAVAILABLE',
                    'None of the products on this order are still available.'
                ),
                { status: 409, schema: MockErrorResponse }
            );

        for (const { product, quantity } of addable) {
            const line = mockDatabase.sampleCartItems.find((item) => item.productId === product.id);
            if (line) line.quantity += quantity;
            else mockDatabase.sampleCartItems.push({ productId: product.id, quantity });
        }
        return toMockJsonResponse(createSuccessEnvelope(getCartResponse()), {
            schema: ReorderResponse
        });
    })
];
