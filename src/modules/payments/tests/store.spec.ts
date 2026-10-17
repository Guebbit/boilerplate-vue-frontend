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
import { usePaymentsStore } from '../store.ts';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import * as schemas from '@api/schemas';
import {
    contractRequest,
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

/** A payment awaiting confirmation, the shape the mocked API returns. */
const PAYMENT = {
    id: 'payment-1',
    orderId: 'order-1',
    userId: 'user-1',
    amount: 50,
    currency: 'EUR',
    status: 'requires_confirmation',
    provider: 'fake',
    method: 'card',
    amountRefunded: 0,
    refunds: []
};

/** Canned response per `METHOD /url` key; an `Error` or `Declined` entry makes the call reject. */
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

/** Whether a canned response is a `Declined` refusal. */
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

/** URLs of every request the mocked transport has seen, in call order. */
const requestedUrls = () =>
    vi.mocked(orvalMutator).mock.calls.map((call) => (call[0] as { url: string }).url);

/** The `Idempotency-Key` header the mocked transport saw on the request whose URL ends in `suffix`. */
const idempotencyKeyOf = (suffix: string): string | undefined => {
    const call = vi
        .mocked(orvalMutator)
        .mock.calls.find((entry) => (entry[0] as { url: string }).url.endsWith(suffix));
    const options = call?.[1] as { headers?: Record<string, string> } | undefined;
    return options?.headers?.['Idempotency-Key'];
};

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

describe('fetchMethods', () => {
    it('mirrors the methods the API offers', () => {
        responses['GET /payments/methods'] = orvalEnvelope({
            methods: [{ id: 'card' }, { id: 'bank_transfer', holdHours: 168 }]
        });
        const store = usePaymentsStore();
        return store.fetchMethods().then((methods) => {
            expect(methods).toEqual([{ id: 'card' }, { id: 'bank_transfer', holdHours: 168 }]);
            expect(store.methods).toEqual(methods);
        });
    });

    it('offers only card when this deployment has not configured a transfer', () => {
        responses['GET /payments/methods'] = orvalEnvelope({ methods: [{ id: 'card' }] });
        const store = usePaymentsStore();
        return store.fetchMethods().then(() => {
            expect(store.methods).toEqual([{ id: 'card' }]);
        });
    });
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

    it('sends no Idempotency-Key on the intent, which a stored replay would leak a secret through', () => {
        const store = usePaymentsStore();
        return store.payForOrder('order-1', 'pm_card_visa').then(() => {
            expect(idempotencyKeyOf('/payments/intent')).toBeUndefined();
            expect(idempotencyKeyOf('/confirm')).toEqual(expect.any(String));
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

            expect(contractRequest(schemas.ConfirmPaymentBody, confirm?.data)).toEqual({
                paymentMethodRef: 'pm_card_visa'
            });
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

                expect(contractRequest(schemas.RecordOfflinePaymentBody, call?.data)).toEqual({
                    method: 'cash',
                    reference: 'till-42'
                });
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

describe('findOrderByReference', () => {
    it('resolves the order behind the reference', () => {
        responses['GET /payments/order-by-reference'] = orvalEnvelope({
            id: 'order-1',
            userId: 'user-1',
            email: 'shopper@example.com',
            items: [],
            totalItems: 0,
            totalQuantity: 0,
            totalPrice: 0,
            netTotal: 0,
            taxTotal: 0,
            shippingNetAmount: 0,
            shippingTaxAmount: 0,
            taxSummary: [],
            status: 'pending'
        });
        const store = usePaymentsStore();

        return store.findOrderByReference('RF13 2EY8 H44V JAVZ KX80 JRL').then((order) => {
            const call = vi
                .mocked(orvalMutator)
                .mock.calls.map((entry) => entry[0] as { url: string; params?: unknown })
                .find(({ url }) => url.endsWith('/order-by-reference'));

            expect(call?.params).toEqual({ ref: 'RF13 2EY8 H44V JAVZ KX80 JRL' });
            expect(order).toMatchObject({ id: 'order-1' });
        });
    });

    /**
     * A malformed or an unmatched reference both answer 404, indistinguishably (the API's own
     * choice, so a wrong-but-close code confirms nothing) — read the same way
     * `fetchPaymentForOrder` reads its own 404, as an answer rather than a failure.
     */
    it('reads a 404 as "no such order", not as a crash', () => {
        const store = usePaymentsStore();

        return store.findOrderByReference('not-a-real-reference').then((order) => {
            expect(order).toBeUndefined();
        });
    });

    /**
     * The other half of "absence is an answer": only 404 is. A 500 must reach the caller, or a
     * transient outage renders as "no order matches this reference" instead of the real failure.
     */
    it('lets any other failure through instead of calling it "no such order"', () => {
        responses['GET /payments/order-by-reference'] = new Error('Internal Server Error');
        const store = usePaymentsStore();

        return expect(
            store.findOrderByReference('RF13 2EY8 H44V JAVZ KX80 JRL')
        ).rejects.toMatchObject({
            status: 500
        });
    });
});

/** The refund call `orvalMutator` was last asked to make. */
const refundCall = () =>
    vi
        .mocked(orvalMutator)
        .mock.calls.map((entry) => entry[0] as { url: string; data?: unknown })
        .find(({ url }) => url.endsWith('/refund'));

describe('refundForOrder', () => {
    it('sends no body for a full refund, so everything still refundable goes back', () => {
        responses['POST /payments/order/order-1/refund'] = orvalEnvelope({
            ...PAYMENT,
            status: 'refunded',
            amountRefunded: 50
        });

        return usePaymentsStore()
            .refundForOrder('order-1')
            .then(() => {
                expect(refundCall()?.data).toBeUndefined();
            });
    });

    it('sends the amount for a partial refund, and keeps the running total', () => {
        responses['POST /payments/order/order-1/refund'] = orvalEnvelope({
            ...PAYMENT,
            status: 'succeeded',
            amountRefunded: 12.5
        });
        responses['GET /payments/order/order-1'] = orvalEnvelope({
            ...PAYMENT,
            status: 'succeeded',
            amountRefunded: 12.5
        });
        const store = usePaymentsStore();

        return store.refundForOrder('order-1', 12.5).then(() => {
            expect(contractRequest(schemas.RefundPaymentByOrderBody, refundCall()?.data)).toEqual({
                amount: 12.5
            });
            expect(store.payment?.amountRefunded).toBe(12.5);
        });
    });

    it('re-reads the payment after a refund, since the refund answer carries no actions', () => {
        responses['POST /payments/order/order-1/refund'] = orvalEnvelope({
            ...PAYMENT,
            status: 'succeeded',
            amountRefunded: 5
        });
        responses['GET /payments/order/order-1'] = orvalEnvelope({
            ...PAYMENT,
            status: 'succeeded',
            amountRefunded: 5,
            actions: { pay: false, refund: true }
        });
        const store = usePaymentsStore();

        return store.refundForOrder('order-1', 5).then(() => {
            expect(store.payment?.actions?.refund, 'money is still left to refund').toBe(true);
        });
    });
});

/** The key the refund request number `index` carried. */
const refundKeyAt = (index: number): string | undefined => {
    const calls = vi
        .mocked(orvalMutator)
        .mock.calls.filter((entry) => (entry[0] as { url: string }).url.endsWith('/refund'));
    const options = calls[index]?.[1] as { headers?: Record<string, string> } | undefined;
    return options?.headers?.['Idempotency-Key'];
};

describe('the refund key after a failure', () => {
    beforeEach(() => {
        responses['POST /payments/order/order-1/refund'] = new Error('the database went away');
        responses['POST /payments/order/order-2/refund'] = orvalEnvelope({
            ...PAYMENT,
            orderId: 'order-2',
            status: 'succeeded',
            amountRefunded: 50
        });
        responses['GET /payments/order/order-2'] = orvalEnvelope({
            ...PAYMENT,
            orderId: 'order-2'
        });
    });

    it('spends the key on a server fault, so a retry is a new attempt', () => {
        const store = usePaymentsStore();

        return store
            .refundForOrder('order-1')
            .catch(() => undefined)
            .then(() => store.refundForOrder('order-1').catch(() => undefined))
            .then(() => {
                expect(refundKeyAt(1)).toEqual(expect.any(String));
                expect(refundKeyAt(1)).not.toBe(refundKeyAt(0));
            });
    });

    it('re-reads the payment after a server fault, before the caller may press again', () => {
        const store = usePaymentsStore();

        return store
            .refundForOrder('order-1')
            .catch(() => undefined)
            .then(() => {
                expect(requestedUrls()).toContain('/payments/order/order-1');
            });
    });

    it('keeps the key after a lost connection, so the retry replays the first attempt', () => {
        responses['POST /payments/order/order-1/refund'] = {
            status: 0,
            code: 'NETWORK',
            message: 'offline'
        };
        const store = usePaymentsStore();

        return store
            .refundForOrder('order-1')
            .catch(() => undefined)
            .then(() => store.refundForOrder('order-1').catch(() => undefined))
            .then(() => {
                expect(refundKeyAt(1)).toBe(refundKeyAt(0));
            });
    });

    it('never carries a key kept for one order onto a refund of another', () => {
        responses['POST /payments/order/order-1/refund'] = {
            status: 0,
            code: 'NETWORK',
            message: 'offline'
        };
        const store = usePaymentsStore();

        return store
            .refundForOrder('order-1')
            .catch(() => undefined)
            .then(() => store.refundForOrder('order-2'))
            .then(() => {
                expect(refundKeyAt(1)).not.toBe(refundKeyAt(0));
            });
    });
});

/** The body of the request whose key is `key`. */
const bodyOf = (key: string): unknown => {
    const [method, url] = key.split(' ');
    return vi
        .mocked(orvalMutator)
        .mock.calls.find(
            (call) =>
                (call[0] as { url: string; method: string }).url === url &&
                (call[0] as { method: string }).method === method
        )?.[0] as { data?: unknown; params?: unknown } | undefined;
};

describe('the staff lists', () => {
    /** One refund as the list answers it. */
    const REFUND = {
        id: 'refund-1',
        paymentId: 'payment-1',
        orderId: 'order-1',
        amount: 10,
        currency: 'EUR',
        status: 'failed',
        reason: 'goodwill',
        providerRefundRef: 're_1',
        failureReason: 'insufficient_funds',
        createdAt: '2026-03-04T10:00:00Z'
    };

    const META = { page: 1, pageSize: 10, totalItems: 31, totalPages: 4 };

    it('posts the filters to the search and keeps the page with its total', () => {
        responses['POST /payments/search'] = orvalEnvelope({
            items: [{ ...PAYMENT, displayStatus: 'succeeded', status: 'succeeded' }],
            meta: META
        });
        const store = usePaymentsStore();
        return store
            .fetchPaymentsPage({ page: 2, pageSize: 10, displayStatus: 'refunded' })
            .then(() => {
                expect(store.paymentsPage).toHaveLength(1);
                expect(store.paymentsTotal).toBe(31);
                expect(bodyOf('POST /payments/search')).toMatchObject({
                    data: { page: 2, pageSize: 10, displayStatus: 'refunded' }
                });
            });
    });

    it('reads the owed transfers by deadline, apart from the main list', () => {
        responses['POST /payments/search'] = orvalEnvelope({
            items: [{ ...PAYMENT, method: 'bank_transfer', status: 'requires_action' }],
            meta: META
        });
        const store = usePaymentsStore();
        return store.fetchAwaitingPage(2, 5).then(() => {
            expect(store.awaitingPage).toHaveLength(1);
            expect(store.awaitingTotal).toBe(31);
            expect(store.paymentsPage).toEqual([]);
            expect(bodyOf('POST /payments/search')).toMatchObject({
                data: {
                    page: 2,
                    pageSize: 5,
                    method: 'bank_transfer',
                    displayStatus: 'incomplete',
                    sort: ['payBy']
                }
            });
        });
    });

    it('keeps the list apart from the one payment an order page holds', () => {
        responses['POST /payments/search'] = orvalEnvelope({ items: [], meta: META });
        const store = usePaymentsStore();
        return store.fetchPaymentForOrder('order-1').then(() =>
            store.fetchPaymentsPage({}).then(() => {
                expect(store.payment?.id).toBe('payment-1');
                expect(store.paymentsPage).toEqual([]);
            })
        );
    });

    it('reads refunds with their filters in the query', () => {
        responses['GET /payments/refunds'] = orvalEnvelope({ items: [REFUND], meta: META });
        const store = usePaymentsStore();
        return store.fetchRefundsPage({ page: 1, pageSize: 10, status: 'failed' }).then(() => {
            expect(store.refundsPage[0]?.failureReason).toBe('insufficient_funds');
            expect(store.refundsTotal).toBe(31);
            expect(bodyOf('GET /payments/refunds')).toMatchObject({
                params: { page: 1, pageSize: 10, status: 'failed' }
            });
        });
    });

    it('reads what needs attention, unpaged', () => {
        responses['GET /payments/attention'] = orvalEnvelope({
            items: [
                {
                    kind: 'manual_refund_owed',
                    orderId: 'order-1',
                    paymentId: 'payment-1',
                    refundId: 'refund-1',
                    amount: 5,
                    currency: 'EUR',
                    since: '2026-03-04T10:00:00Z'
                }
            ]
        });
        const store = usePaymentsStore();
        return store.fetchAttention().then(() => {
            expect(store.attention.map(({ kind }) => kind)).toEqual(['manual_refund_owed']);
        });
    });

    it('lets a failed read reach the caller', () => {
        const store = usePaymentsStore();
        return expect(store.fetchAttention()).rejects.toMatchObject({ status: 404 });
    });
});
