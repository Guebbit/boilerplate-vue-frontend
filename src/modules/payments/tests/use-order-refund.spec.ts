/**
 * `useOrderRefund` — the operator's refund control, and the one thing `payments` publishes beside
 * the panel.
 *
 * What is pinned here is that the composable DECIDES NOTHING. `canRefund` is the server's
 * `actions.refund` read back, so a rule change on the API moves this control without the client
 * being edited — and a refund that has already happened greys the button out because the refreshed
 * record says so, not because a status was compared here.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { ref } from 'vue';
import { useOrderRefund } from '@/modules/payments';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

const payment = (refund: boolean) => ({
    id: 'p1',
    orderId: 'o1',
    userId: 'u1',
    amount: 50,
    currency: 'EUR',
    status: refund ? 'succeeded' : 'refunded',
    provider: 'fake',
    actions: { pay: false, refund }
});

let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        // A missing stub answers 404 in the envelope shape `onResponseReject` builds — the store
        // reads `status` off it to tell "no payment yet" from a real failure.
        if (!(key in responses))
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the API's error ENVELOPE is this client's rejection contract
            return Promise.reject({
                success: false,
                status: 404,
                message: `no stub for ${key}`,
                errors: [{ code: 'NOT_FOUND', message: `no stub for ${key}` }]
            });
        return Promise.resolve(parseOrvalFixture(config.method, config.url, responses[key]));
    })
}));

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'GET /payments/order/o1': orvalEnvelope(payment(true)),
        'POST /payments/order/o1/refund': orvalEnvelope(payment(false))
    };
});

/**
 * Lets the immediate watcher's fetch settle before the assertion reads its result.
 */
const settled = () => Promise.resolve().then(() => undefined);

describe('useOrderRefund', () => {
    it('offers the refund the server says is open', () => {
        const { canRefund } = useOrderRefund(ref('o1'));

        return settled().then(() => {
            expect(canRefund.value).toBe(true);
        });
    });

    it('withdraws the control once the money is back', () => {
        // The greying-out, and the reason it is trustworthy: the refreshed record carries
        // `refund: false`, so the button closes on the server's answer rather than on a guess.
        const { canRefund, refund } = useOrderRefund(ref('o1'));

        return settled()
            .then(() => refund())
            .then(() => {
                expect(canRefund.value).toBe(false);
            });
    });

    it('offers nothing at all when the order has no payment', () => {
        // A 404 is an answer — no intent was ever created — and it must not enable a control.
        responses = {};
        const { canRefund } = useOrderRefund(ref('o1'));

        return settled().then(() => {
            expect(canRefund.value).toBe(false);
        });
    });

    it('does nothing without an order id rather than calling a broken url', () => {
        const { refund } = useOrderRefund(ref(undefined));

        return refund().then((result) => {
            expect(result).toBeUndefined();
        });
    });
});
