/**
 * @module
 * `useRecordOfflinePayment` — the operator's "record it by hand" control, internal to this module
 * (only `RecordOfflinePaymentForm` calls it, so it is not published through the barrel).
 *
 * What is pinned here is that the composable DECIDES NOTHING about when recording is allowed: it
 * performs the call and mirrors whatever the API answers, exactly as `useOrderRefund` does for a
 * refund. Whether the API accepts it — order not pending, a card charge in flight — is the
 * server's own 409, left for the caller to show as a toast.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { useRecordOfflinePayment } from '@/modules/payments/composables/use-record-offline-payment.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

const PAYMENT = {
    id: 'p1',
    orderId: 'o1',
    userId: 'u1',
    amount: 50,
    currency: 'EUR',
    status: 'succeeded',
    provider: 'manual',
    method: 'cash',
    reference: 'till-1'
};

let responses: Record<string, unknown>;

/**
 * The reject envelope `onResponseReject` builds, which is the only shape this composable ever
 * catches.
 */
const rejectWith = (status: number, message: string, code = 'STUB_ERROR') =>
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the API's error ENVELOPE is this client's rejection contract
    Promise.reject({ success: false, status, message, errors: [{ code, message }] });

/**
 * A stubbed API-level refusal, distinct from the success fixtures `orvalEnvelope` builds.
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
        if (answer === undefined) return rejectWith(404, `no stub for ${key}`, 'NOT_FOUND');
        if (isDeclined(answer)) return rejectWith(answer.status, answer.message, answer.code);
        return Promise.resolve(parseOrvalFixture(config.method, config.url, answer));
    })
}));

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'POST /payments/order/o1/offline': orvalEnvelope(PAYMENT)
    };
});

describe('useRecordOfflinePayment', () => {
    it('records the payment and mirrors it into the payments store', () => {
        const { recordOfflinePayment } = useRecordOfflinePayment(ref('o1'));

        return recordOfflinePayment({ method: 'cash', reference: 'till-1' }).then(() => {
            expect(responses['POST /payments/order/o1/offline']).toBeDefined();
        });
    });

    it('lets a refusal through — the caller owns the toast', () => {
        responses['POST /payments/order/o1/offline'] = {
            status: 409,
            code: 'PAYMENT_IN_FLIGHT',
            message: 'A card payment is already in progress for this order.'
        };
        const { recordOfflinePayment } = useRecordOfflinePayment(ref('o1'));

        return expect(recordOfflinePayment({ method: 'cash' })).rejects.toMatchObject({
            status: 409,
            errors: [{ code: 'PAYMENT_IN_FLIGHT' }]
        });
    });

    it('does nothing without an order id rather than calling a broken url', () => {
        const { recordOfflinePayment } = useRecordOfflinePayment(ref(undefined));

        return recordOfflinePayment({ method: 'cash' }).then((result) => {
            expect(result).toBeUndefined();
        });
    });
});
