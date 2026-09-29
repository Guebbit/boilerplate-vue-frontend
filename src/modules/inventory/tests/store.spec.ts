/**
 * @module
 * The inventory store — transport-mocked like the wishlist's spec.
 *
 * Worth pinning: both reads are whole-list replacement (the page renders what the API answered),
 * and both writes reload what they changed BEFORE answering, so a caller never sees a counter the
 * views have not caught up with. The order of those reloads is asserted rather than assumed — the
 * ledger explains the board, and a board that arrived first reads as a number nobody wrote.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useInventoryStore } from '@/modules/inventory/store.ts';
import { orvalMutator } from '@/infrastructure/http';
import { wireModulesIntoCore } from '../../../../tests/support/unit/wire-modules.ts';
import {
    contractRequest,
    orvalEnvelope,
    parseOrvalFixture
} from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';

import * as schemas from '@api/schemas';

wireModulesIntoCore();

/**
 * A stock movement row, as the ledger renders it.
 */
const MOVEMENT = {
    id: 'movement-1',
    productId: 'p1',
    reason: 'reserve',
    onHandDelta: 0,
    reservedDelta: 2
};

/**
 * A stock level row, as the board renders it.
 */
const LEVEL = { productId: 'p1', title: 'Product one', onHand: 24, reserved: 2, available: 22 };

/**
 * The mocked transport's canned response, keyed by `METHOD /path`; reset in `beforeEach`.
 */
let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(parseOrvalFixture(config.method, config.url, responses[key]));
    })
}));

/**
 * The URLs requested so far, in call order — used to assert a write's reload sequence.
 */
const requestedUrls = () =>
    vi.mocked(orvalMutator).mock.calls.map((call) => (call[0] as { url: string }).url);

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        // `totalPages` is required by the real contract alongside `totalItems` — absent from
        // this fixture before wiring in `parseOrvalFixture` ever proved it against the schema.
        'GET /inventory/movements': orvalEnvelope({
            items: [MOVEMENT],
            meta: { totalItems: 1, totalPages: 1 }
        }),
        'GET /inventory/levels': orvalEnvelope({
            items: [LEVEL],
            meta: { totalItems: 1, totalPages: 1 }
        }),
        'POST /inventory/receipts': orvalEnvelope(LEVEL),
        'POST /inventory/adjustments': orvalEnvelope(LEVEL)
    };
});

describe('fetchMovements', () => {
    it('replaces the ledger with what the API answered', () => {
        const store = useInventoryStore();
        return store.fetchMovements().then(() => {
            expect(store.movements.map(({ id }) => id)).toEqual(['movement-1']);
        });
    });

    it('narrows to one product by passing the id through as a query param', () => {
        const store = useInventoryStore();
        return store.fetchMovements({ productId: 'p1' }).then(() => {
            const call = vi.mocked(orvalMutator).mock.calls[0][0] as {
                params?: { productId?: string };
            };
            expect(call.params).toEqual({ productId: 'p1' });
        });
    });

    it('keeps the audit honest: totalItems from meta, not the row count', () => {
        responses['GET /inventory/movements'] = orvalEnvelope({
            items: [MOVEMENT],
            meta: { page: 1, pageSize: 10, totalItems: 41, totalPages: 5 }
        });
        const store = useInventoryStore();
        return store.fetchMovements({ page: 1, pageSize: 10 }).then(() => {
            expect(store.movementsTotal).toBe(41);
        });
    });

    it('repeats the last query when called with none — the reload-after-write path', () => {
        const store = useInventoryStore();
        return store
            .fetchMovements({ reason: 'adjust' })
            .then(() => store.fetchMovements())
            .then(() => {
                const calls = vi
                    .mocked(orvalMutator)
                    .mock.calls.map((call) => (call[0] as { params?: unknown }).params);
                expect(calls).toEqual([{ reason: 'adjust' }, { reason: 'adjust' }]);
            });
    });
});

describe('fetchLevels', () => {
    it('replaces the board with what the API answered', () => {
        const store = useInventoryStore();
        return store.fetchLevels().then(() => {
            expect(store.levels).toEqual([LEVEL]);
        });
    });
});

describe('receive', () => {
    it('answers the counters the API reported and reloads both views it changed', () => {
        const store = useInventoryStore();
        return store.receive('p1', 20).then((level) => {
            expect(level).toEqual(LEVEL);
            // The reload is the point, and so is its order: the ledger explains the board.
            expect(requestedUrls()).toEqual([
                '/inventory/receipts',
                '/inventory/movements',
                '/inventory/levels'
            ]);
        });
    });

    it('sends the quantity as a receipt body rather than a query param', () => {
        const store = useInventoryStore();
        return store.receive('p1', 20).then(() => {
            const call = vi.mocked(orvalMutator).mock.calls[0][0] as { data?: unknown };
            expect(contractRequest(schemas.ReceiveStockBody, call.data)).toEqual({
                productId: 'p1',
                quantity: 20
            });
        });
    });

    it("carries the operator's note onto the row when one was written", () => {
        const store = useInventoryStore();
        return store.receive('p1', 20, 'pallet 7, DHL').then(() => {
            const call = vi.mocked(orvalMutator).mock.calls[0][0] as { data?: unknown };
            expect(contractRequest(schemas.ReceiveStockBody, call.data)).toEqual({
                productId: 'p1',
                quantity: 20,
                note: 'pallet 7, DHL'
            });
        });
    });
});

/**
 * The `Idempotency-Key` header the first (write) call carried.
 */
const keyOfFirstCall = () =>
    (vi.mocked(orvalMutator).mock.calls[0][1] as { headers?: Record<string, string> } | undefined)
        ?.headers?.['Idempotency-Key'];

describe('the Idempotency-Key on a stock write', () => {
    it.each([
        ['a receipt', (store: ReturnType<typeof useInventoryStore>) => store.receive('p1', 20)],
        ['an adjustment', (store: ReturnType<typeof useInventoryStore>) => store.adjust('p1', -3)]
    ])('is sent with %s, and a fresh one follows a success', (_label, write) => {
        const store = useInventoryStore();
        return write(store)
            .then(() => {
                const first = keyOfFirstCall();
                expect(first).toEqual(expect.any(String));
                vi.mocked(orvalMutator).mockClear();
                return write(store).then(() => first);
            })
            .then((first) => {
                expect(keyOfFirstCall()).toEqual(expect.any(String));
                expect(keyOfFirstCall()).not.toBe(first);
            });
    });

    it('is reused when the first attempt failed retryably, so the API replays instead of double-counting', () => {
        responses['POST /inventory/receipts'] = undefined;
        vi.mocked(orvalMutator).mockRejectedValueOnce(new Error('network down'));
        const store = useInventoryStore();
        return store
            .receive('p1', 20)
            .catch(() => undefined)
            .then(() => {
                const first = keyOfFirstCall();
                vi.mocked(orvalMutator).mockClear();
                responses['POST /inventory/receipts'] = orvalEnvelope(LEVEL);
                return store.receive('p1', 20).then(() => first);
            })
            .then((first) => {
                expect(keyOfFirstCall()).toBe(first);
            });
    });
});

describe('sweep', () => {
    it('answers how many holds were released and reloads both views', () => {
        responses['POST /inventory/reservations/sweep'] = orvalEnvelope({ expired: 3 });
        const store = useInventoryStore();
        return store.sweep().then((expired) => {
            expect(expired).toBe(3);
            expect(requestedUrls()).toEqual([
                '/inventory/reservations/sweep',
                '/inventory/movements',
                '/inventory/levels'
            ]);
        });
    });
});

describe('adjust', () => {
    it('passes the delta through signed, because shrinkage is the common case', () => {
        const store = useInventoryStore();
        return store.adjust('p1', -3).then(() => {
            const call = vi.mocked(orvalMutator).mock.calls[0][0] as { data?: unknown };
            expect(contractRequest(schemas.AdjustStockBody, call.data)).toEqual({
                productId: 'p1',
                delta: -3
            });
        });
    });

    it('reloads both views it changed, exactly as a receipt does', () => {
        const store = useInventoryStore();
        return store.adjust('p1', -3).then(() => {
            expect(requestedUrls()).toEqual([
                '/inventory/adjustments',
                '/inventory/movements',
                '/inventory/levels'
            ]);
        });
    });
});
