/**
 * @module
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
import { loadLocale } from '@/i18n';
import { ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { orvalMutator } from '@/infrastructure/http';
import { useOrderRefund } from '../composables/use-order-refund';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { parseOrvalFixture } from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';
import { aProblem } from '../../../../tests/support/unit/fixtures.ts';

wireModulesIntoCore();

/** Builds a payment whose refund action is allowed or not, and that names `owed` records to settle. */
const payment = (refund: boolean, owed: string[] = []) => ({
    id: 'p1',
    orderId: 'o1',
    userId: 'u1',
    amount: 50,
    currency: 'EUR',
    status: 'succeeded',
    displayStatus: refund ? 'succeeded' : 'refunded',
    provider: 'fake',
    method: 'card',
    amountRefunded: refund ? 0 : 50,
    refunds: owed.map((id) => ({
        id,
        amount: 12,
        currency: 'EUR',
        status: 'pending',
        reason: 'goodwill',
        createdAt: '2026-03-05T10:00:00Z'
    })),
    actions: { pay: false, sync: false, refund, settleByHand: owed }
});

/** Canned response per `METHOD /url` key, set by each test before it acts. */
let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        // A missing stub answers 404 in the envelope shape `onResponseReject` builds — the store
        // reads `status` off it to tell "no payment yet" from a real failure.
        if (!(key in responses))
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- the API's error ENVELOPE is this client's rejection contract
            return Promise.reject(
                aProblem(404, [{ code: 'NOT_FOUND', message: `no stub for ${key}` }])
            );
        return Promise.resolve(parseOrvalFixture(config.method, config.url, responses[key]));
    })
}));

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'GET /orders/o1/payments': { items: [payment(true)] },
        'POST /payments/p1/refunds': {
            id: 'r1',
            amount: 10,
            currency: 'EUR',
            status: 'succeeded',
            reason: 'goodwill',
            createdAt: '2026-10-24T10:00:00.000Z'
        },
        'GET /payments/p1': payment(false)
    };
});

/**
 * Lets the immediate watcher's fetch settle before the assertion reads its result.
 */
const settled = () => Promise.resolve().then(() => undefined);

describe('useOrderRefund', () => {
    it('toasts a payment read that failed, and keeps the refund control closed', () => {
        const toast = vi.spyOn(useNotificationsStore(), 'addMessage');
        vi.mocked(orvalMutator).mockRejectedValueOnce(
            aProblem(500, [{ code: 'INTERNAL', message: 'payments are down' }])
        );
        const { canRefund } = useOrderRefund(ref('o1'));

        return flushPromises().then(() => {
            expect(toast).toHaveBeenCalledTimes(1);
            expect(toast.mock.calls[0]?.[0]).toContain('payments are down');
            expect(canRefund.value).toBe(false);
        });
    });

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
            .then(() => {
                return refund();
            })
            .then(() => {
                expect(canRefund.value).toBe(false);
            });
    });

    it('answers a refusal as a warning that names the next step, not as an error', () => {
        responses['POST /payments/p1/refunds'] = {
            id: 'r9',
            amount: 10,
            currency: 'EUR',
            status: 'failed',
            failureReason: 'lost_or_stolen_card',
            reason: 'goodwill',
            createdAt: '2026-10-24T10:00:00.000Z'
        };
        responses['GET /payments/p1'] = payment(true, ['r9']);
        const { refund } = useOrderRefund(ref('o1'));

        return loadLocale('en')
            .then(() => settled())
            .then(() => refund())
            .then((notice) => {
                expect(notice?.type).toBe('warning');
                expect(notice?.text).toContain('press Mark returned');
            });
    });

    it('lists the hand-paid refunds the server names, and drops one once it is settled', () => {
        responses['GET /orders/o1/payments'] = { items: [payment(false, ['r1'])] };
        // The settle answers the refund it settled; the payment is a read of its own.
        responses['POST /payments/p1/refunds/r1/settle'] = {
            id: 'r1',
            amount: 12,
            currency: 'EUR',
            status: 'succeeded',
            reason: 'goodwill',
            settledByHand: true,
            createdAt: '2026-03-05T10:00:00Z'
        };
        responses['GET /payments/p1'] = payment(false);
        const { settleable, settle } = useOrderRefund(ref('o1'));

        return settled()
            .then(() => {
                expect(settleable.value.map((record) => record.id)).toEqual(['r1']);
                return settle('r1');
            })
            .then(() => {
                expect(settleable.value).toEqual([]);
            });
    });

    it('offers nothing at all when the order has no payment', () => {
        // An empty list is the answer — no intent was ever created — and it must not enable a control.
        responses = { 'GET /orders/o1/payments': { items: [] } };
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
