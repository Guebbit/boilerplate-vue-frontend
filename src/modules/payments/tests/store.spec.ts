/**
 * @module
 * The payments store — transport-mocked like the wishlist's spec: `orvalMutator` is a router
 * keyed on `METHOD /url`, the generated client and this store are real. What is worth pinning is
 * the PSP sequence (intent, then confirm with the provider's method reference, then the sync that
 * resolves a challenge) and that absence is an answer — a 404 on the read leaves `undefined`,
 * never a crash — while any OTHER failure still rejects.
 *
 * The stub rejects with the envelope `onResponseReject` builds. The store tells "no payment yet"
 * from a real failure by reading `status` off it, so nothing else would tell the two apart.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePaymentsStore } from '@/modules/payments/store.ts';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

const PAYMENT = {
    id: 'payment-1',
    orderId: 'order-1',
    userId: 'user-1',
    amount: 50,
    currency: 'EUR',
    status: 'requires_confirmation',
    provider: 'fake',
    method: 'card'
};

let responses: Record<string, unknown>;

/**
 * The reject envelope `onResponseReject` builds, which is the only shape a store ever catches.
 */
const rejectWith = (status: number, message: string, code = 'STUB_ERROR') =>
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the API's error ENVELOPE is this client's rejection contract
    Promise.reject({ success: false, status, message, errors: [{ code, message }] });

/**
 * A stubbed API-level refusal — `{ status, code, message }` — distinct from `Error`, which stubs
 * a transport failure instead. Lets a test stub the exact `errors[].code` shape a real 4xx sends.
 */
interface Declined {
    status: number;
    code: string;
    message: string;
}

const isDeclined = (value: unknown): value is Declined =>
    typeof value === 'object' && value !== null && 'code' in value && 'status' in value;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        const answer = responses[key];
        if (answer === undefined) return rejectWith(404, `Not found: ${key}`);
        if (answer instanceof Error) return rejectWith(500, answer.message);
        if (isDeclined(answer)) return rejectWith(answer.status, answer.message, answer.code);
        return Promise.resolve(parseOrvalFixture(config.method, config.url, answer));
    })
}));

const requestedUrls = () =>
    vi.mocked(orvalMutator).mock.calls.map((call) => (call[0] as { url: string }).url);

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'POST /payments/intent': orvalEnvelope(PAYMENT),
        'POST /payments/payment-1/confirm': orvalEnvelope({ ...PAYMENT, status: 'succeeded' }),
        'POST /payments/payment-1/sync': orvalEnvelope({ ...PAYMENT, status: 'succeeded' }),
        'GET /payments/order/order-1': orvalEnvelope({ ...PAYMENT, status: 'succeeded' })
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
    it('walks the PSP sequence: intent first, then the confirm with the method reference', () => {
        const store = usePaymentsStore();
        return store.payForOrder('order-1', 'pm_card_visa').then(() => {
            expect(requestedUrls()).toEqual(['/payments/intent', '/payments/payment-1/confirm']);
            expect(store.payment?.status).toBe('succeeded');
        });
    });

    it('sends the method reference and nothing resembling a card', () => {
        // The whole reason the field changed shape: with a live provider the card is tokenised in
        // the provider's own iframe, and a request body carrying digits would mean it was not.
        const store = usePaymentsStore();
        return store.payForOrder('order-1', 'pm_card_visa').then(() => {
            const confirm = vi
                .mocked(orvalMutator)
                .mock.calls.map((call) => call[0] as { url: string; data?: unknown })
                .find(({ url }) => url.endsWith('/confirm'));

            expect(confirm?.data).toEqual({ paymentMethodRef: 'pm_card_visa' });
        });
    });

    it('lets a decline propagate — the caller owns the toast', () => {
        // `openapi.yaml`'s payments 409 block: a decline is `errors[].code === 'PAYMENT_DECLINED'`,
        // not an absence — asserting the real shape catches a regression to generic error handling.
        responses['POST /payments/payment-1/confirm'] = {
            status: 409,
            code: 'PAYMENT_DECLINED',
            message: 'The card was declined'
        };
        const store = usePaymentsStore();
        return expect(store.payForOrder('order-1', 'pm_card_declined')).rejects.toMatchObject({
            status: 409,
            errors: [{ code: 'PAYMENT_DECLINED' }]
        });
    });

    /**
     * A bank challenge is NOT a failure: the confirm resolves, the record says `requires_action`,
     * and the caller's next move is the sync rather than the error toast. A store that rejected
     * here would strand every 3-D Secure payment.
     */
    it('resolves on a challenge, leaving the payment in flight', () => {
        responses['POST /payments/payment-1/confirm'] = orvalEnvelope({
            ...PAYMENT,
            status: 'requires_action'
        });
        const store = usePaymentsStore();
        return store.payForOrder('order-1', 'pm_card_authentication_required').then(() => {
            expect(store.payment?.status).toBe('requires_action');
        });
    });
});

describe('finishAtProvider', () => {
    it('re-reads the payment and settles it', () => {
        const store = usePaymentsStore();
        return store.finishAtProvider('payment-1').then(() => {
            expect(requestedUrls()).toEqual(['/payments/payment-1/sync']);
            expect(store.payment?.status).toBe('succeeded');
        });
    });

    it('lets a refusal through rather than leaving the panel claiming success', () => {
        responses['POST /payments/payment-1/sync'] = {
            status: 409,
            code: 'PAYMENT_DECLINED',
            message: 'The card was declined'
        };
        const store = usePaymentsStore();
        return expect(store.finishAtProvider('payment-1')).rejects.toMatchObject({
            status: 409,
            errors: [{ code: 'PAYMENT_DECLINED' }]
        });
    });
});

describe('recordOfflinePayment', () => {
    it('sends the method and reference, and mirrors the settled payment', () => {
        responses['POST /payments/order/order-1/offline'] = orvalEnvelope({
            ...PAYMENT,
            provider: 'manual',
            method: 'cash',
            reference: 'till-42',
            status: 'succeeded'
        });
        const store = usePaymentsStore();

        return store
            .recordOfflinePayment('order-1', { method: 'cash', reference: 'till-42' })
            .then(() => {
                const call = vi
                    .mocked(orvalMutator)
                    .mock.calls.map((entry) => entry[0] as { url: string; data?: unknown })
                    .find(({ url }) => url.endsWith('/offline'));

                expect(call?.data).toEqual({ method: 'cash', reference: 'till-42' });
                expect(store.payment).toMatchObject({ provider: 'manual', method: 'cash' });
            });
    });

    /**
     * The interesting failure this endpoint has that the card path does not: a card charge is
     * already reachable at the provider, so recording money too could charge twice. Not an
     * absence and not a decline — the caller's toast carries the server's own message.
     */
    it('lets a refusal through — a card charge already in flight, for instance', () => {
        responses['POST /payments/order/order-1/offline'] = {
            status: 409,
            code: 'PAYMENT_IN_FLIGHT',
            message: 'A card payment is already in progress for this order.'
        };
        const store = usePaymentsStore();

        return expect(
            store.recordOfflinePayment('order-1', { method: 'bank_transfer' })
        ).rejects.toMatchObject({
            status: 409,
            errors: [{ code: 'PAYMENT_IN_FLIGHT' }]
        });
    });
});
