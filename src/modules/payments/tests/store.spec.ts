/**
 * The payments store — transport-mocked like the wishlist's spec: `orvalMutator` is a router
 * keyed on `METHOD /url`, the generated client and this store are real. What is worth pinning
 * is the PSP sequence (intent, then confirm with the card) and that absence is an answer — a
 * 404 on the read leaves `undefined`, never a crash.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePaymentsStore } from '@/modules/payments/store.ts';
import { orvalMutator } from '@/infrastructure/http';

const PAYMENT = {
    id: 'payment-1',
    orderId: 'order-1',
    userId: 'user-1',
    amount: 50,
    currency: 'EUR',
    status: 'requires_confirmation',
    provider: 'fake'
};

let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        const answer = responses[key];
        if (answer === undefined) return Promise.reject(new Error(`404 ${key}`));
        return Promise.resolve(answer);
    })
}));

const requestedUrls = () =>
    vi.mocked(orvalMutator).mock.calls.map((call) => (call[0] as { url: string }).url);

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'POST /payments/intent': { data: PAYMENT },
        'POST /payments/payment-1/confirm': { data: { ...PAYMENT, status: 'succeeded' } },
        'GET /payments/order/order-1': { data: { ...PAYMENT, status: 'succeeded' } }
    };
});

describe('fetchPaymentForOrder', () => {
    it('mirrors what the API answered', () => {
        const store = usePaymentsStore();
        return store.fetchPaymentForOrder('order-1').then(() => {
            expect(store.payment?.status).toBe('succeeded');
        });
    });

    it('reads a 404 as "no payment yet", not as a crash', () => {
        responses = {};
        const store = usePaymentsStore();
        return store.fetchPaymentForOrder('order-1').then((payment) => {
            expect(payment).toBeUndefined();
            expect(store.payment).toBeUndefined();
        });
    });
});

describe('payForOrder', () => {
    it('walks the PSP sequence: intent first, then the confirm with the card', () => {
        const store = usePaymentsStore();
        return store.payForOrder('order-1', '4242 4242 4242 4242').then(() => {
            expect(requestedUrls()).toEqual(['/payments/intent', '/payments/payment-1/confirm']);
            expect(store.payment?.status).toBe('succeeded');
        });
    });

    it('lets a decline propagate — the caller owns the toast', () => {
        responses['POST /payments/payment-1/confirm'] = undefined;
        const store = usePaymentsStore();
        return expect(store.payForOrder('order-1', '4000000000000002')).rejects.toThrow();
    });
});
