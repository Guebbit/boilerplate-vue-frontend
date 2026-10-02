/**
 * @module
 * The returns store against a mocked transport (`orvalMutator`): what each call sends, which
 * return opening one reports, and that a move REPLACES the cached record with the server's
 * answer. The bodies are proven against the contract's own request schemas, so a drift in what the
 * store sends fails here rather than as a 422 in production.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import * as schemas from '@api/schemas';
import { useReturnsStore } from '@/modules/returns/store.ts';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import { aReturn } from '../../../../tests/support/unit/fixtures.ts';
import {
    contractRequest,
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

wireModulesIntoCore();

/**
 * Canned response bodies keyed by `METHOD url`, read by the `orvalMutator` mock.
 */
let responses: Record<string, unknown>;

/**
 * Every request the store made, so the body and headers can be asserted, not just the URL.
 */
let sent: {
    url: string;
    method: string;
    data?: unknown;
    params?: unknown;
    headers?: Record<string, string>;
}[];

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn(
        (
            config: { url: string; method: string; data?: unknown; params?: unknown },
            options?: { headers?: Record<string, string> }
        ) => {
            sent.push({ ...config, headers: options?.headers });
            const key = `${config.method?.toUpperCase()} ${config.url}`;
            return Promise.resolve(parseOrvalFixture(config.method, config.url, responses[key]));
        }
    )
}));

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    sent = [];
    responses = {};
});

describe('openReturn', () => {
    it('reports the return and caches it', () => {
        responses['POST /returns'] = orvalEnvelope(aReturn(), 201);
        const store = useReturnsStore();

        return store.openReturn({ orderId: 'o1', reason: 'withdrawal' }).then((created) => {
            expect(created?.id).toBe('r1');
            expect(store.returns.r1?.reason).toBe('withdrawal');
            expect(contractRequest(schemas.CreateReturnBody, sent[0].data)).toEqual({
                orderId: 'o1',
                reason: 'withdrawal'
            });
        });
    });

    it('reports a withdrawal before dispatch as the return it is: closed at birth, no lines', () => {
        responses['POST /returns'] = orvalEnvelope(
            aReturn({ status: 'closed', lines: [], refundAmount: 40 }),
            201
        );
        const store = useReturnsStore();

        return store.openReturn({ orderId: 'o1', reason: 'withdrawal' }).then((created) => {
            expect(created).toMatchObject({ orderId: 'o1', status: 'closed', lines: [] });
            expect(store.returns.r1?.status).toBe('closed');
        });
    });

    it('sends an Idempotency-Key so a retry cannot open two', () => {
        responses['POST /returns'] = orvalEnvelope(aReturn(), 201);

        return useReturnsStore()
            .openReturn({ orderId: 'o1', reason: 'withdrawal' })
            .then(() => {
                expect(sent[0].headers?.['Idempotency-Key']).toEqual(expect.any(String));
            });
    });
});

describe('the staff moves', () => {
    it('approve replaces the cached record with the approved one', () => {
        responses['POST /returns/r1/approve'] = orvalEnvelope(aReturn({ status: 'approved' }));
        const store = useReturnsStore();

        return store.approve('r1').then(() => {
            expect(store.returns.r1?.status).toBe('approved');
        });
    });

    it('decline sends the reason', () => {
        responses['POST /returns/r1/decline'] = orvalEnvelope(
            aReturn({ status: 'declined', declineReason: 'Used' })
        );

        return useReturnsStore()
            .decline('r1', 'Used')
            .then(() => {
                expect(contractRequest(schemas.DeclineReturnBody, sent[0].data)).toEqual({
                    reason: 'Used'
                });
            });
    });

    it('receive sends the handling deduction, and an Idempotency-Key', () => {
        responses['POST /returns/r1/receive'] = orvalEnvelope(
            aReturn({ status: 'closed', refundAmount: 25 })
        );
        const store = useReturnsStore();

        return store.receive('r1', { handlingDeduction: 5 }).then(() => {
            expect(store.returns.r1?.status).toBe('closed');
            expect(contractRequest(schemas.ReceiveReturnBody, sent[0].data)).toEqual({
                handlingDeduction: 5
            });
            expect(sent[0].headers?.['Idempotency-Key']).toEqual(expect.any(String));
        });
    });
});

describe('fetchOrderReturns', () => {
    it('asks for one order’s returns and caches them', () => {
        responses['GET /returns'] = orvalEnvelope({
            items: [aReturn()],
            meta: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 }
        });
        const store = useReturnsStore();

        return store.fetchOrderReturns('o1').then((items) => {
            expect(items).toHaveLength(1);
            expect(sent[0]).toMatchObject({ params: { orderId: 'o1' } });
            expect(store.returns.r1).toBeDefined();
        });
    });
});
