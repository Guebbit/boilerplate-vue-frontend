/**
 * `cancelOrder` — the orders store's one customer write. Transport-mocked like the other store
 * flow specs; what is pinned is that the cancelled record REPLACES the cached one (the fact
 * worth rendering is the new status) and that a payload-less answer changes nothing.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useOrdersStore } from '@/modules/orders/store.ts';
import { orvalMutator } from '@/infrastructure/http';

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

    it('a payload-less answer caches nothing rather than a hole', () => {
        responses['POST /orders/o1/cancel'] = { data: undefined };
        const store = useOrdersStore();
        return store.cancelOrder('o1').then(() => {
            expect(store.orders.o1).toBeUndefined();
        });
    });
});
