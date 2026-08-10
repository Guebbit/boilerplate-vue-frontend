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
    hardDeleteOrderById,
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
    hardDeleteOrderById: vi.fn(() => Promise.resolve({ data: undefined })),
    checkout: vi.fn(() => Promise.resolve({ data: { order: ORDER } })),
    getOrderInvoice: vi.fn(() => Promise.resolve(INVOICE))
}));

describe('useOrdersStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    describe('fetchOrders', () => {
        it('reads the item list out of the paginated envelope', () => {
            const store = useOrdersStore();

            return store.fetchOrders().then(() => {
                expect(listOrders).toHaveBeenCalled();
                expect(store.ordersList).toEqual([]);
            });
        });
    });

    describe('fetchPaginationOrders', () => {
        it('defaults to the first page of ten', () =>
            useOrdersStore()
                .fetchPaginationOrders()
                .then(() => {
                    expect(listOrders).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
                }));

        it('passes an explicit page and size through', () =>
            useOrdersStore()
                .fetchPaginationOrders(3, 25)
                .then(() => {
                    expect(listOrders).toHaveBeenCalledWith({ page: 3, pageSize: 25 });
                }));
    });

    describe('createOrder', () => {
        it('forwards the payload unchanged', () => {
            const payload = {
                userId: 'u1',
                email: 'ada@example.com',
                items: [{ productId: 'p1', quantity: 1 }]
            };

            return useOrdersStore()
                .createOrder(payload)
                .then(() => {
                    expect(apiCreateOrder).toHaveBeenCalledWith(payload);
                });
        });
    });

    describe('updateOrder', () => {
        it('sends the id in the path and the changes in the body', () =>
            useOrdersStore()
                .updateOrder('o1', { status: 'shipped' })
                .then(() => {
                    expect(updateOrderById).toHaveBeenCalledWith('o1', { status: 'shipped' });
                }));
    });

    describe('checkout', () => {
        it('calls the endpoint with no payload when none is given', () =>
            useOrdersStore()
                .checkout()
                .then(() => {
                    expect(apiCheckout).toHaveBeenCalledWith(undefined);
                }));

        it('returns the checkout envelope, order included', () =>
            useOrdersStore()
                .checkout({ notes: 'leave at door' })
                .then((result) => {
                    expect(apiCheckout).toHaveBeenCalledWith({ notes: 'leave at door' });
                    expect(result).toEqual({ order: ORDER });
                }));

        it('tracks the created order id and total, read from the nested envelope', () =>
            useOrdersStore()
                .checkout()
                .then(() => {
                    expect(track).toHaveBeenCalledWith(analyticsEvents.CHECKOUT_COMPLETED, {
                        order_id: 'o1',
                        total_price: 19.98
                    });
                }));
    });

    describe('deleteOrder', () => {
        it('calls the delete endpoint with the order id', () =>
            useOrdersStore()
                .deleteOrder('o1')
                .then(() => {
                    expect(deleteOrderById).toHaveBeenCalledWith('o1');
                }));
    });

    describe('hardDeleteOrder', () => {
        /*
         * A separate method rather than a flag on `deleteOrder`: the soft form sets `deletedAt` and
         * an admin can toggle it back, this one is irreversible. Distinct names mean the destructive
         * path cannot be reached by passing the wrong boolean, so the assertion worth making is that
         * each reaches its OWN client function and not the other's.
         */
        it('calls the hard-delete client with the order id', () =>
            useOrdersStore()
                .hardDeleteOrder('o1')
                .then(() => {
                    expect(hardDeleteOrderById).toHaveBeenCalledWith('o1');
                    expect(deleteOrderById).not.toHaveBeenCalled();
                }));

        it('leaves the soft delete reaching only the soft client', () =>
            useOrdersStore()
                .deleteOrder('o1')
                .then(() => {
                    expect(deleteOrderById).toHaveBeenCalledWith('o1');
                    expect(hardDeleteOrderById).not.toHaveBeenCalled();
                }));
    });

    describe('downloadInvoice', () => {
        it('returns the binary payload as-is, without unwrapping an envelope', () =>
            useOrdersStore()
                .downloadInvoice('o1')
                .then((result) => {
                    expect(getOrderInvoice).toHaveBeenCalledWith('o1');
                    expect(result).toBe(INVOICE);
                }));
    });

    describe('fetchOrder', () => {
        it('fetches one order and unwraps a single-record envelope', () =>
            useOrdersStore()
                .fetchOrder('o1')
                .then((result) => {
                    expect(getOrderById).toHaveBeenCalledWith('o1');
                    // `.data`, one level shallower than the list endpoints' `.data.items`.
                    expect(result).toEqual(ORDER);
                }));

        it('passes the id through as the cache key, not just as the URL parameter', () => {
            // `fetchTarget(fetcher, orderId, ...)` — the second argument is what the toolkit
            // caches and selects on. Dropping it would still produce a correct HTTP request,
            // so the request assertion above cannot catch it.
            const store = useOrdersStore();

            return store
                .fetchOrder('o1')
                .then(() => store.fetchOrder('o1'))
                .then(() => {
                    // Second call served from cache: the id reached the cache layer.
                    expect(getOrderById).toHaveBeenCalledTimes(1);
                });
        });

        it('bypasses the cache when forced', () => {
            const store = useOrdersStore();

            return store
                .fetchOrder('o1')
                .then(() => store.fetchOrder('o1', true))
                .then(() => {
                    expect(getOrderById).toHaveBeenCalledTimes(2);
                });
        });
    });

    describe('watchSearchOrders', () => {
        it('sends every supported filter as a query parameter', () => {
            const store = useOrdersStore();
            store.filters = {
                id: 'o1',
                userId: 'u1',
                productId: 'p1',
                email: 'ada@example.com'
            };

            return store
                .watchSearchOrders()
                .search()
                .then(() => {
                    expect(listOrders).toHaveBeenCalledWith(
                        expect.objectContaining({
                            id: 'o1',
                            userId: 'u1',
                            productId: 'p1',
                            email: 'ada@example.com'
                        })
                    );
                });
        });

        it('includes the current page and size alongside the filters', () => {
            const store = useOrdersStore();
            store.filters = { email: 'ada@example.com' };

            return store
                .watchSearchOrders()
                .search()
                .then(() => {
                    // Dropping pagination here would silently return only the first page for
                    // every search, no matter which page the user is on.
                    expect(listOrders).toHaveBeenCalledWith(
                        expect.objectContaining({
                            page: expect.any(Number),
                            pageSize: expect.any(Number)
                        })
                    );
                });
        });

        it('reports a failed search to the supplied error handler', () => {
            const failure = new Error('network down');
            vi.mocked(listOrders).mockRejectedValueOnce(failure);
            const onError = vi.fn();

            return useOrdersStore()
                .watchSearchOrders(onError)
                .search()
                .catch(() => {})
                .then(() => {
                    expect(onError).toHaveBeenCalledWith(failure);
                });
        });
    });
});
