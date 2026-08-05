/**
 * Unit tests for the orders store.
 *
 * Two things here are this repo's own logic rather than the toolkit's: `checkout`, which reads
 * the created order out of a nested envelope to emit an analytics event, and `downloadInvoice`,
 * which is the one call whose payload is a binary Blob rather than a JSON envelope.
 *
 * The checkout event reads `response.data.order.*`. That path is optional all the way down, so a
 * shape change would silently emit an event with undefined fields instead of failing.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useOrdersStore } from '@/features/orders/store';
import {
    listOrders,
    getOrderById,
    createOrder as apiCreateOrder,
    updateOrderById,
    deleteOrderById,
    checkout as apiCheckout,
    getOrderInvoice
} from '@api';
import { analyticsEvents } from '@/stores/observability';

const track = vi.fn();

vi.mock('@/stores/observability', () => ({
    useObservabilityStore: () => ({ track }),
    analyticsEvents: { CHECKOUT_COMPLETED: 'checkout_completed' }
}));

const ORDER = {
    id: 'o1',
    userId: 'u1',
    email: 'ada@example.com',
    items: [],
    totalItems: 1,
    totalQuantity: 2,
    totalPrice: 19.98,
    status: 'pending'
};

const INVOICE = new Blob(['%PDF-1.4'], { type: 'application/pdf' });

vi.mock('@api', () => ({
    listOrders: vi.fn(() => Promise.resolve({ data: { items: [] } })),
    getOrderById: vi.fn(() => Promise.resolve({ data: ORDER })),
    createOrder: vi.fn(() => Promise.resolve({ data: ORDER })),
    updateOrderById: vi.fn(() => Promise.resolve({ data: ORDER })),
    deleteOrderById: vi.fn(() => Promise.resolve({ data: undefined })),
    checkout: vi.fn(() => Promise.resolve({ data: { order: ORDER } })),
    getOrderInvoice: vi.fn(() => Promise.resolve(INVOICE))
}));

describe('useOrdersStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    describe('fetchOrders', () => {
        it('reads the item list out of the paginated envelope', async () => {
            const store = useOrdersStore();
            await store.fetchOrders();

            expect(listOrders).toHaveBeenCalled();
            expect(store.ordersList).toEqual([]);
        });
    });

    describe('fetchPaginationOrders', () => {
        it('defaults to the first page of ten', async () => {
            const store = useOrdersStore();
            await store.fetchPaginationOrders();

            expect(listOrders).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
        });

        it('passes an explicit page and size through', async () => {
            const store = useOrdersStore();
            await store.fetchPaginationOrders(3, 25);

            expect(listOrders).toHaveBeenCalledWith({ page: 3, pageSize: 25 });
        });
    });

    describe('createOrder', () => {
        it('forwards the payload unchanged', async () => {
            const store = useOrdersStore();
            const payload = {
                userId: 'u1',
                email: 'ada@example.com',
                items: [{ productId: 'p1', quantity: 1 }]
            };

            await store.createOrder(payload);

            expect(apiCreateOrder).toHaveBeenCalledWith(payload);
        });
    });

    describe('updateOrder', () => {
        it('sends the id in the path and the changes in the body', async () => {
            const store = useOrdersStore();
            await store.updateOrder('o1', { status: 'shipped' });

            expect(updateOrderById).toHaveBeenCalledWith('o1', { status: 'shipped' });
        });
    });

    describe('checkout', () => {
        it('calls the endpoint with no payload when none is given', async () => {
            const store = useOrdersStore();
            await store.checkout();

            expect(apiCheckout).toHaveBeenCalledWith(undefined);
        });

        it('returns the checkout envelope, order included', async () => {
            const store = useOrdersStore();
            const result = await store.checkout({ notes: 'leave at door' });

            expect(apiCheckout).toHaveBeenCalledWith({ notes: 'leave at door' });
            expect(result).toEqual({ order: ORDER });
        });

        it('tracks the created order id and total, read from the nested envelope', async () => {
            const store = useOrdersStore();
            await store.checkout();

            expect(track).toHaveBeenCalledWith(analyticsEvents.CHECKOUT_COMPLETED, {
                order_id: 'o1',
                total_price: 19.98
            });
        });
    });

    describe('deleteOrder', () => {
        it('calls the delete endpoint with the order id', async () => {
            const store = useOrdersStore();
            await store.deleteOrder('o1');

            expect(deleteOrderById).toHaveBeenCalledWith('o1');
        });
    });

    describe('downloadInvoice', () => {
        it('returns the binary payload as-is, without unwrapping an envelope', async () => {
            const store = useOrdersStore();
            const result = await store.downloadInvoice('o1');

            expect(getOrderInvoice).toHaveBeenCalledWith('o1');
            expect(result).toBe(INVOICE);
        });
    });

    describe('fetchOrder', () => {
        it('fetches one order and unwraps a single-record envelope', async () => {
            const store = useOrdersStore();

            const result = await store.fetchOrder('o1');

            expect(getOrderById).toHaveBeenCalledWith('o1');
            // `.data`, one level shallower than the list endpoints' `.data.items`.
            expect(result).toEqual(ORDER);
        });

        it('passes the id through as the cache key, not just as the URL parameter', async () => {
            // `fetchTarget(fetcher, orderId, ...)` — the second argument is what the toolkit
            // caches and selects on. Dropping it would still produce a correct HTTP request,
            // so the request assertion above cannot catch it.
            const store = useOrdersStore();

            await store.fetchOrder('o1');
            await store.fetchOrder('o1');

            // Second call served from cache: the id reached the cache layer.
            expect(getOrderById).toHaveBeenCalledTimes(1);
        });

        it('bypasses the cache when forced', async () => {
            const store = useOrdersStore();

            await store.fetchOrder('o1');
            await store.fetchOrder('o1', true);

            expect(getOrderById).toHaveBeenCalledTimes(2);
        });
    });

    describe('watchSearchOrders', () => {
        it('sends every supported filter as a query parameter', async () => {
            const store = useOrdersStore();
            store.filters = {
                id: 'o1',
                userId: 'u1',
                productId: 'p1',
                email: 'ada@example.com'
            };

            const handle = store.watchSearchOrders();
            await handle.search();

            expect(listOrders).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: 'o1',
                    userId: 'u1',
                    productId: 'p1',
                    email: 'ada@example.com'
                })
            );
        });

        it('includes the current page and size alongside the filters', async () => {
            const store = useOrdersStore();
            store.filters = { email: 'ada@example.com' };

            const handle = store.watchSearchOrders();
            await handle.search();

            // Dropping pagination here would silently return only the first page for every
            // search, no matter which page the user is on.
            expect(listOrders).toHaveBeenCalledWith(
                expect.objectContaining({ page: expect.any(Number), pageSize: expect.any(Number) })
            );
        });

        it('reports a failed search to the supplied error handler', async () => {
            const failure = new Error('network down');
            vi.mocked(listOrders).mockRejectedValueOnce(failure);
            const store = useOrdersStore();
            const onError = vi.fn();

            const handle = store.watchSearchOrders(onError);
            await handle.search().catch(() => {});

            expect(onError).toHaveBeenCalledWith(failure);
        });
    });
});
