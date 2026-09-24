/**
 * @module
 * Unit tests for the orders store, mocking the `@api` client module directly and exercising the
 * store's actions against canned responses.
 *
 * One thing here is this repo's own logic rather than the toolkit's: `fetchInvoice`, the one
 * call whose payload is a binary Blob rather than a JSON envelope.
 *
 * Checkout is not tested here because it is not here: `POST /cart/checkout` empties the cart, so
 * `useCartStore` owns it and `src/modules/cart/tests/store.spec.ts` covers it.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useOrdersStore } from '@/modules/orders/store';
import {
    listOrders,
    searchOrders,
    getOrderById,
    createOrder as apiCreateOrder,
    updateOrderById,
    deleteOrderById,
    hardDeleteOrderById,
    restoreOrderById,
    getOrderInvoice
} from '@api';
import * as schemas from '@api/schemas';
import { contractResponse } from '../../../../tests/unit/infrastructure/http/orval-fixture-schema.ts';
import { anOrder } from '../../../../tests/support/unit/fixtures.ts';

/**
 * Fixture order returned by the mocked `@api` client.
 */
const ORDER = anOrder({ totalItems: 1, totalQuantity: 2, totalPrice: 19.98, netTotal: 19.98 });

/**
 * Fixture PDF blob returned by the mocked invoice endpoint.
 */
const INVOICE = new Blob(['%PDF-1.4'], { type: 'application/pdf' });

// `meta` matches the real `PaginationMeta` shape — `search:` (`store.ts`) reads
// `meta.totalPages` for `pageTotal`, so an envelope without one no longer represents a real
// response.
const EMPTY_PAGE = { items: [], meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 } };

/**
 * Every JSON answer, each proven against its operation's generated response schema once, here.
 * The invoice is a Blob, not an envelope, so it has no schema to answer to.
 */
const RESPONSES = {
    listed: contractResponse(schemas.ListOrdersResponse, EMPTY_PAGE),
    searched: contractResponse(schemas.SearchOrdersResponse, EMPTY_PAGE),
    fetched: contractResponse(schemas.GetOrderByIdResponse, ORDER),
    created: contractResponse(schemas.CreateOrderResponse, ORDER),
    updated: contractResponse(schemas.UpdateOrderByIdResponse, ORDER),
    deleted: contractResponse(schemas.DeleteOrderByIdResponse),
    hardDeleted: contractResponse(schemas.HardDeleteOrderByIdResponse),
    restored: contractResponse(schemas.RestoreOrderByIdResponse, ORDER)
};

vi.mock('@api', () => ({
    listOrders: vi.fn(() => Promise.resolve(RESPONSES.listed)),
    searchOrders: vi.fn(() => Promise.resolve(RESPONSES.searched)),
    getOrderById: vi.fn(() => Promise.resolve(RESPONSES.fetched)),
    createOrder: vi.fn(() => Promise.resolve(RESPONSES.created)),
    updateOrderById: vi.fn(() => Promise.resolve(RESPONSES.updated)),
    deleteOrderById: vi.fn(() => Promise.resolve(RESPONSES.deleted)),
    hardDeleteOrderById: vi.fn(() => Promise.resolve(RESPONSES.hardDeleted)),
    restoreOrderById: vi.fn(() => Promise.resolve(RESPONSES.restored)),
    getOrderInvoice: vi.fn(() => Promise.resolve(INVOICE))
}));

describe('useOrdersStore', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.clearAllMocks();
    });

    describe('fetchOrders', () => {
        it('reads the item list out of the paginated envelope', () => {
            // A page with a row in it: an empty one cannot tell "read the items" from "read nothing".
            vi.mocked(listOrders).mockResolvedValueOnce(
                contractResponse(schemas.ListOrdersResponse, {
                    ...EMPTY_PAGE,
                    items: [ORDER],
                    meta: { ...EMPTY_PAGE.meta, totalItems: 1 }
                }) as never
            );
            const store = useOrdersStore();

            return store.fetchOrders().then(() => {
                expect(listOrders).toHaveBeenCalledTimes(1);
                expect(store.ordersList).toEqual([ORDER]);
            });
        });
    });

    describe('fetchPaginationOrders', () => {
        it('defaults to the first page of ten', () =>
            useOrdersStore()
                .fetchPaginationOrders()
                .then(() => {
                    // A paged read IS a search with no filters, so it rides the search route.
                    expect(searchOrders).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
                }));

        it('passes an explicit page and size through', () =>
            useOrdersStore()
                .fetchPaginationOrders(3, 25)
                .then(() => {
                    expect(searchOrders).toHaveBeenCalledWith({ page: 3, pageSize: 25 });
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

    describe('deleteOrder', () => {
        it('calls the delete endpoint with the order id', () =>
            useOrdersStore()
                .deleteOrder('o1')
                .then(() => {
                    expect(deleteOrderById).toHaveBeenCalledWith('o1');
                }));
    });

    describe('restoreOrder', () => {
        // Its own endpoint: DELETE is one-way on the API, so a second delete never restores.
        it('calls the restore endpoint and caches the restored order', () =>
            useOrdersStore()
                .restoreOrder('o1')
                .then((restored) => {
                    expect(restoreOrderById).toHaveBeenCalledWith('o1');
                    expect(restored).toMatchObject({ id: 'o1' });
                    expect(useOrdersStore().orders.o1).toMatchObject({ id: 'o1' });
                }));
    });

    describe('hardDeleteOrder', () => {
        /*
         * A separate method rather than a flag on `deleteOrder`: the soft form sets `deletedAt` and
         * an admin can restore it, this one is irreversible. Distinct names mean the destructive
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

    describe('fetchInvoice', () => {
        it('returns the binary payload as-is', () =>
            useOrdersStore()
                .fetchInvoice('o1')
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
                .then(() => store.fetchOrder('o1', { forced: true }))
                .then(() => {
                    expect(getOrderById).toHaveBeenCalledTimes(2);
                });
        });
    });

    describe('watchSearchOrders', () => {
        it('posts every supported filter to /orders/search', () => {
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
                    expect(searchOrders).toHaveBeenCalledWith(
                        expect.objectContaining({
                            // The filter box searches for one id; the API reads a batch.
                            id: ['o1'],
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
                    expect(searchOrders).toHaveBeenCalledWith(
                        expect.objectContaining({
                            page: expect.any(Number),
                            pageSize: expect.any(Number)
                        })
                    );
                });
        });

        it('reports a failed search to the supplied error handler', () => {
            const failure = new Error('network down');
            vi.mocked(searchOrders).mockRejectedValueOnce(failure);
            const onError = vi.fn();

            return useOrdersStore()
                .watchSearchOrders({ onError })
                .search()
                .catch(() => {})
                .then(() => {
                    expect(onError).toHaveBeenCalledWith(failure, expect.anything());
                });
        });
    });
});
