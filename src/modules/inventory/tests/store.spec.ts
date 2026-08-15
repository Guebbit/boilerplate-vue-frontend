/**
 * The inventory store — transport-mocked like the wishlist's spec. Worth pinning: the ledger is
 * whole-list replacement (the page renders what the API answered), and the restock reloads the
 * ledger it just extended before answering the new shelf count.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useInventoryStore } from '@/modules/inventory/store.ts';
import { orvalMutator } from '@/infrastructure/http';

const MOVEMENT = { id: 'movement-1', productId: 'p1', delta: -2, reason: 'order' };

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
        'POST /inventory/restock': { data: { productId: 'p1', stock: 24 } }
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
        return store.fetchMovements('p1').then(() => {
            const call = vi.mocked(orvalMutator).mock.calls[0]![0] as {
                params?: { productId?: string };
            };
            expect(call.params).toEqual({ productId: 'p1' });
        });
    });
});

describe('restock', () => {
    it('answers the new shelf count and reloads the ledger it extended', () => {
        const store = useInventoryStore();
        return store.restock('p1', 20).then((stock) => {
            expect(stock).toBe(24);
            // The reload is the point: the row worth rendering is the API's.
            expect(requestedUrls()).toEqual(['/inventory/restock', '/inventory/movements']);
        });
    });

    it('reads a bare payload as a zero shelf, not a crash', () => {
        responses['POST /inventory/restock'] = { data: undefined };
        const store = useInventoryStore();
        return store.restock('p1', 20).then((stock) => {
            expect(stock).toBe(0);
        });
    });
});
