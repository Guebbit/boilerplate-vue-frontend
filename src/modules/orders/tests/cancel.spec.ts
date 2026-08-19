/**
 * `cancelOrder` — the orders store's one customer write. Transport-mocked like the other store
 * flow specs; what is pinned is that the cancelled record REPLACES the cached one (the fact
 * worth rendering is the new status. A payload-less 200 no longer reaches this store:
 * `orvalMutator` validates every response against its contract schema in every mode but
 * vitest — see httpValidateResponses.spec.ts, which owns that behaviour.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useOrdersStore } from '@/modules/orders/store.ts';

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

let responses: Record<string, unknown>;

vi.mock('@/infrastructure/http', () => ({
    orvalMutator: vi.fn((config: { url: string; method: string }) => {
        const key = `${config.method?.toUpperCase()} ${config.url}`;
        return Promise.resolve(responses[key]);
    })
}));

beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    responses = {
        'POST /orders/o1/cancel': { data: ORDER }
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
