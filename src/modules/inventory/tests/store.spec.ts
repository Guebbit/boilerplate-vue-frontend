/**
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

const MOVEMENT = {
    id: 'movement-1',
    productId: 'p1',
    reason: 'reserve',
    onHandDelta: 0,
    reservedDelta: 2
};

const LEVEL = { productId: 'p1', title: 'Product one', onHand: 24, reserved: 2, available: 22 };

let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(responses[key]);
    })
}));

const requestedUrls = () =>
    vi.mocked(orvalMutator).mock.calls.map((call) => (call[0] as { url: string }).url);

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'GET /inventory/movements': { data: { items: [MOVEMENT] } },
        'GET /inventory/levels': { data: { items: [LEVEL] } },
        'POST /inventory/receipts': { data: LEVEL },
        'POST /inventory/adjustments': { data: LEVEL }
    };
});

describe('fetchMovements', () => {
    it('replaces the ledger with what the API answered', () => {
        const store = useInventoryStore();
        return store.fetchMovements().then(() => {
            expect(store.movements.map(({ id }) => id)).toEqual(['movement-1']);
        });
    });

    it('reads a payload with no items as an empty ledger, not a crash', () => {
        responses['GET /inventory/movements'] = { data: undefined };
        const store = useInventoryStore();
        return store.fetchMovements().then(() => {
            expect(store.movements).toEqual([]);
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
        responses['GET /inventory/movements'] = {
            data: {
                items: [MOVEMENT],
                meta: { page: 1, pageSize: 10, totalItems: 41, totalPages: 5 }
            }
        };
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

    it('reads a payload with no items as an empty board, not a crash', () => {
        responses['GET /inventory/levels'] = { data: undefined };
        const store = useInventoryStore();
        return store.fetchLevels().then(() => {
            expect(store.levels).toEqual([]);
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
            expect(call.data).toEqual({ productId: 'p1', quantity: 20 });
        });
    });

    it("carries the operator's note onto the row when one was written", () => {
        const store = useInventoryStore();
        return store.receive('p1', 20, 'pallet 7, DHL').then(() => {
            const call = vi.mocked(orvalMutator).mock.calls[0][0] as { data?: unknown };
            expect(call.data).toEqual({ productId: 'p1', quantity: 20, note: 'pallet 7, DHL' });
        });
    });

    it('reads a bare payload as no counters, not a crash', () => {
        responses['POST /inventory/receipts'] = { data: undefined };
        const store = useInventoryStore();
        return store.receive('p1', 20).then((level) => {
            expect(level).toBeUndefined();
        });
    });
});

describe('sweep', () => {
    it('answers how many holds were released and reloads both views', () => {
        responses['POST /inventory/reservations/sweep'] = { data: { expired: 3 } };
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
            expect(call.data).toEqual({ productId: 'p1', delta: -3 });
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
