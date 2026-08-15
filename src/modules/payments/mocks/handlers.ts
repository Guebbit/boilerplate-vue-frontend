import { http, type HttpHandler } from 'msw';
import type { Payment } from 'src/types';
import {
    CreatePaymentIntentResponse,
    GetPaymentByOrderResponse,
    ConfirmPaymentResponse
} from '@api/schemas';
import {
    createErrorEnvelope,
    createSuccessEnvelope,
    getCurrentMockUser,
    getIsoDateNow,
    isCurrentMockUserAdmin,
    mockDatabase,
    readRequestBody
} from '@mocks/mockShared.ts';
import { toMockJsonResponse } from '@mocks/mockTransport.ts';
import { MockErrorResponse } from '@mocks/mockValidation.ts';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// The collections and cross-module listeners live in @mocks/mockCommerce.ts — the support
// layer, like `createMockOrder`, because module mock files must not import each other.
import '@mocks/mockCommerce.ts';

/** The one number the fake provider refuses — the same digits the BE's fake declines. */
const FAKE_DECLINE_CARD = '4000000000000002';

let paymentIdCounter = 0;

const findOwnOrder = (orderId: string) => {
    const currentUser = getCurrentMockUser();
    const order = mockDatabase.sampleOrders.find(({ id }) => id === orderId);
    if (!order || !currentUser) return undefined;
    if (!isCurrentMockUserAdmin() && order.userId !== currentUser.id) return undefined;
    return order;
};

export const registerPaymentsMockHandlers = (): HttpHandler[] => [
    // The intent: freezes the order's own total. Re-asking refreshes the same document —
    // one payment per order, exactly the BE's unique-index fact.
    http.post(`${API_BASE}/payments/intent`, ({ request }) =>
        readRequestBody<{ orderId?: string }>(request).then((requestBody) => {
            const order = findOwnOrder(String(requestBody.orderId ?? ''));
            if (!order)
                return toMockJsonResponse(
                    createErrorEnvelope(404, 'NOT_FOUND', 'Order not found'),
                    {
                        status: 404,
                        schema: MockErrorResponse
                    }
                );
            if (order.status !== 'pending')
                return toMockJsonResponse(
                    createErrorEnvelope(
                        409,
                        'PAYMENT_ORDER_NOT_PAYABLE',
                        'This order cannot be paid in its current status.'
                    ),
                    { status: 409, schema: MockErrorResponse }
                );

            const payments = (mockDatabase.samplePayments ??= []);
            let payment = payments.find((entry) => entry.orderId === order.id);
            if (
                payment &&
                payment.status !== 'requires_confirmation' &&
                payment.status !== 'declined'
            )
                return toMockJsonResponse(
                    createErrorEnvelope(
                        409,
                        'PAYMENT_ORDER_NOT_PAYABLE',
                        'This order cannot be paid in its current status.'
                    ),
                    { status: 409, schema: MockErrorResponse }
                );
            if (payment) {
                payment.amount = order.totalPrice;
                payment.status = 'requires_confirmation';
                payment.updatedAt = getIsoDateNow();
            } else {
                paymentIdCounter += 1;
                payment = {
                    id: `payment-${paymentIdCounter}`,
                    orderId: order.id,
                    userId: order.userId,
                    amount: order.totalPrice,
                    currency: 'EUR',
                    status: 'requires_confirmation',
                    provider: 'fake',
                    createdAt: getIsoDateNow(),
                    updatedAt: getIsoDateNow()
                };
                payments.unshift(payment);
            }
            return toMockJsonResponse(createSuccessEnvelope(payment), {
                status: 201,
                schema: CreatePaymentIntentResponse
            });
        })
    ),

    http.get(`${API_BASE}/payments/order/:orderId`, ({ params }) => {
        const order = findOwnOrder(String(params.orderId));
        const payment = (mockDatabase.samplePayments ?? []).find(
            (entry) => entry.orderId === String(params.orderId)
        );
        if (!order || !payment)
            return toMockJsonResponse(createErrorEnvelope(404, 'NOT_FOUND', 'No payment found'), {
                status: 404,
                schema: MockErrorResponse
            });
        return toMockJsonResponse(createSuccessEnvelope(payment), {
            schema: GetPaymentByOrderResponse
        });
    }),

    // The confirm: charge first, then the order's conditional pending → paid — the same
    // ordering (and the same magic decline card) the BE's fake provider has.
    http.post(`${API_BASE}/payments/:id/confirm`, ({ request, params }) =>
        readRequestBody<{ cardNumber?: string }>(request).then((requestBody) => {
            const payment = (mockDatabase.samplePayments ?? []).find(
                ({ id }) => id === String(params.id)
            );
            if (!payment)
                return toMockJsonResponse(
                    createErrorEnvelope(404, 'NOT_FOUND', 'No payment found'),
                    { status: 404, schema: MockErrorResponse }
                );
            if (payment.status !== 'requires_confirmation' && payment.status !== 'declined')
                return toMockJsonResponse(
                    createErrorEnvelope(
                        409,
                        'PAYMENT_NOT_CONFIRMABLE',
                        'This payment is not awaiting confirmation.'
                    ),
                    { status: 409, schema: MockErrorResponse }
                );

            const cardNumber = String(requestBody.cardNumber ?? '').replaceAll(/\s/g, '');
            payment.cardLast4 = cardNumber.slice(-4);
            payment.updatedAt = getIsoDateNow();

            if (cardNumber === FAKE_DECLINE_CARD) {
                payment.status = 'declined';
                return toMockJsonResponse(
                    createErrorEnvelope(
                        409,
                        'PAYMENT_DECLINED',
                        'The payment was declined by the card issuer.'
                    ),
                    { status: 409, schema: MockErrorResponse }
                );
            }

            const order = mockDatabase.sampleOrders.find(({ id }) => id === payment.orderId);
            if (!order || order.status !== 'pending')
                return toMockJsonResponse(
                    createErrorEnvelope(
                        409,
                        'PAYMENT_ORDER_NOT_PAYABLE',
                        'This order cannot be paid in its current status.'
                    ),
                    { status: 409, schema: MockErrorResponse }
                );

            order.status = 'paid';
            order.updatedAt = getIsoDateNow();
            payment.status = 'succeeded';
            return toMockJsonResponse(createSuccessEnvelope(payment), {
                schema: ConfirmPaymentResponse
            });
        })
    )
];
