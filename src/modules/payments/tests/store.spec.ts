/**
 * The payments store — transport-mocked like the wishlist's spec: `orvalMutator` is a router
 * keyed on `METHOD /url`, the generated client and this store are real. What is worth pinning
 * is the PSP sequence (intent, then confirm with the card) and that absence is an answer — a
 * 404 on the read leaves `undefined`, never a crash — while any OTHER failure still rejects.
 *
 * The stub rejects with the envelope `onResponseReject` builds. The store tells "no payment yet"
 * from a real failure by reading `status` off it, so nothing else would tell the two apart.
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

/**
 * The reject envelope `onResponseReject` builds, which is the only shape a store ever catches.
 */
const rejectWith = (status: number, message: string) =>
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the API's error ENVELOPE is this client's rejection contract
    Promise.reject({ success: false, status, message, errors: [message] });

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        const answer = responses[key];
        if (answer === undefined) return rejectWith(404, `Not found: ${key}`);
        if (answer instanceof Error) return rejectWith(500, answer.message);
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

    /**
     * The other half of "absence is an answer": only 404 is. A 500, or the rejection
     * `validateResponseAgainstContract` raises when the API breaks its own contract, must reach
     * the caller — swallowed, it renders the pay form for an order that may already be paid.
     */
    it('lets any other failure through instead of calling it "no payment yet"', () => {
        responses = { 'GET /payments/order/order-1': new Error('Internal Server Error') };
        const store = usePaymentsStore();
        return expect(store.fetchPaymentForOrder('order-1')).rejects.toMatchObject({
            status: 500
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
