/**
 * Typed factory for a payment, proven against the generated response schema as every factory in
 * `tests/support/unit/fixtures.ts` is.
 */
import { GetPaymentResponse } from '@api/schemas';
import { contractBody } from '../../../../tests/support/unit/orval-fixture-schema.ts';
import type { Payment } from '@types';

/**
 * A valid payment as `GET /payments` answers it for staff — the required fields, plus whatever a
 * case sets.
 *
 * @param overrides - the fields a case actually cares about
 * @returns a `Payment` that parses against the generated schema
 */
export const aPayment = (overrides: Partial<Payment> = {}): Payment =>
    contractBody<Payment>(GetPaymentResponse, {
        id: 'pay-1',
        orderId: 'o1',
        amount: '50.00',
        currency: 'EUR',
        amountRefunded: '0.00',
        refunds: [],
        status: 'succeeded',
        displayStatus: 'succeeded',
        provider: 'fake',
        method: 'card',
        orderNumber: '2026-000001',
        email: 'ada@example.com',
        createdAt: '2026-03-04T10:00:00Z',
        actions: {
            pay: false,
            sync: false,
            refund: false,
            settleRefundByHand: [],
            cancelRefund: [],
            syncRefunds: false
        },
        ...overrides
    });
