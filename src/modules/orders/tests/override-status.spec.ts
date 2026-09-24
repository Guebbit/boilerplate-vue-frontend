/**
 * @module
 * Vitest spec mocking `orvalMutator` directly, so the assertions can inspect the raw request body
 * sent for `overrideStatus` — the operator's manual correction door, replacing what `PUT
 * /orders/:id` used to accept for `shipped`/`delivered`.
 *
 * Transport-mocked like `cancel.spec.ts`; what is pinned here is that the corrected record
 * REPLACES the cached one, and that `to`/`reason` both reach the body unchanged.
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
 * Fixture order returned by the mocked override endpoint.
 */
const ORDER = {
    id: 'o1',
    userId: 'u1',
    email: 'ada@example.com',
    items: [],
    totalItems: 0,
    totalQuantity: 0,
    totalPrice: 0,
    netTotal: 0,
    taxTotal: 0,
    shippingNetAmount: 0,
    shippingTaxAmount: 0,
    taxSummary: [],
    status: 'shipped'
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
        'POST /orders/o1/status-override': orvalEnvelope(ORDER)
    };
});

describe('overrideStatus', () => {
    it('sends the target status and reason in the body', () => {
        const store = useOrdersStore();
        return store.overrideStatus('o1', 'shipped', 'carrier scan never arrived').then(() => {
            expect(sent[0]?.data).toEqual({ to: 'shipped', reason: 'carrier scan never arrived' });
        });
    });

    it('replaces the cached record with the corrected one', () => {
        const store = useOrdersStore();
        return store.overrideStatus('o1', 'shipped', 'carrier scan never arrived').then(() => {
            expect(store.orders.o1?.status).toBe('shipped');
        });
    });
});
