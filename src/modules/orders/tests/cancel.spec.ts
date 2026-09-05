/**
 * @module
 * Vitest spec mocking `orvalMutator` directly, so the assertions can inspect the raw request body
 * sent for `cancelOrder` — the orders store's one customer write.
 *
 * Transport-mocked like the other store flow specs; what is pinned is that the cancelled record
 * REPLACES the cached one (the fact worth rendering is the new status). A payload-less 200 cannot
 * reach this store: `orvalMutator` validates every response against its contract schema in every
 * mode but vitest — see http-validate-responses.spec.ts, which owns that behaviour.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useOrdersStore } from '@/modules/orders/store.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

/**
 * Fixture order returned by the mocked cancel endpoint.
 */
const ORDER = {
    id: 'o1',
    userId: 'u1',
    email: 'ada@example.com',
    items: [],
    totalItems: 0,
    totalQuantity: 0,
    totalPrice: 0,
    status: 'cancelled'
};

/**
 * Canned response bodies keyed by `METHOD url`, read by the `orvalMutator` mock.
 */
let responses: Record<string, unknown>;

/**
 * Every request the store made, so the BODY can be asserted and not just the URL.
 */
let sent: { url: string; method: string; data?: unknown }[];

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string; data?: unknown }) => {
        sent.push(config);
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(parseOrvalFixture(config.method, config.url, responses[key]));
    })
}));

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    sent = [];
    responses = {
        'POST /orders/o1/cancel': orvalEnvelope(ORDER)
    };
});

describe('cancelOrder', () => {
    it('replaces the cached record with the cancelled one', () => {
        const store = useOrdersStore();
        return store.cancelOrder('o1').then(() => {
            expect(store.orders.o1?.status).toBe('cancelled');
        });
    });
});

describe('cancelOrder — the operator choosing what happens to the money', () => {
    it('sends no body at all when nothing was chosen', () => {
        // A customer cancel is the API's default, and an absent body is what asks for it. Sending
        // `{ refund: true }` here would state a preference the caller never expressed.
        const store = useOrdersStore();

        return store.cancelOrder('o1').then(() => {
            expect(sent[0]?.data).toBeUndefined();
        });
    });

    it('asks for a cancel without a refund when told to', () => {
        const store = useOrdersStore();

        return store.cancelOrder('o1', false).then(() => {
            expect(sent[0]?.data).toEqual({ refund: false });
        });
    });

    it('asks for the money back when told to', () => {
        const store = useOrdersStore();

        return store.cancelOrder('o1', true).then(() => {
            expect(sent[0]?.data).toEqual({ refund: true });
        });
    });
});
