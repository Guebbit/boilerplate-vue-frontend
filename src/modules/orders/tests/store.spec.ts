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

import { useOrdersStore } from '../store';
import {
    listOrders,
    searchOrders,
    getOrderById,
    updateOrderById,
    deleteOrderById,
    hardDeleteOrderById,
    restoreOrderById,
    getOrderInvoice,
    listOrderCreditNotes,
    getOrderCreditNote,
    getOrderTimeline,
    addOrderNote,
    deleteOrderNote,
    createOrder,
    correctOrderBillingAddress,
    exportOrders
} from '@api';
import * as schemas from '@api/schemas';
import {
    contractRequest,
    contractResponse
} from '../../../../tests/support/unit/orval-fixture-schema.ts';
import { anOrder, anOrderListItem } from '../../../../tests/support/unit/fixtures.ts';
import type { OrderListItem } from '@api';

/**
 * Fixture order returned by the mocked `@api` client.
 */
const ORDER = anOrder({ totalItems: 1, totalQuantity: 2, totalPrice: '19.98', netTotal: '19.98' });

/**
 * A row of the list, which answers list items rather than whole orders.
 */
const ROW = anOrderListItem({ totalPrice: '19.98' });

/**
 * Fixture PDF blob returned by the mocked invoice endpoint.
 */
const INVOICE = new Blob(['%PDF-1.4'], { type: 'application/pdf' });

/**
 * Fixture timeline entries, the `items` the endpoint answers.
 */
const TIMELINE = [{ id: 'e1', at: '2026-10-01T10:00:00.000Z', type: 'created', data: {} }];

/**
 * The page the endpoint answers: the rows and where they sit in the whole history.
 */
const TIMELINE_PAGE = {
    items: TIMELINE,
    meta: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }
};

/**
 * Fixture credit notes, the `items` the list endpoint answers.
 */
const CREDIT_NOTES = [
    {
        id: 'cn1',
        number: 'CN-2026-0001',
        issuedAt: '2026-09-30T10:00:00.000Z',
        currency: 'EUR',
        grandTotal: '9.99',
        reason: 'refund',
        refundId: 'r1'
    }
];

/**
 * `meta` matches the real `PaginationMeta` shape — `search:` (`store.ts`) reads
 * `meta.totalPages` for `pageTotal`, so an envelope without one does not represent a real
 * response.
 */
const EMPTY_PAGE = { items: [], meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 } };

/**
 * Every JSON answer, each proven against its operation's generated response schema once, here.
 * The invoice is a Blob, not an envelope, so it has no schema to answer to.
 */
const RESPONSES = {
    listed: contractResponse(schemas.ListOrdersResponse, EMPTY_PAGE),
    searched: contractResponse(schemas.SearchOrdersResponse, EMPTY_PAGE),
    fetched: contractResponse(schemas.GetOrderByIdResponse, ORDER),
    updated: contractResponse(schemas.UpdateOrderByIdResponse, ORDER),
    deleted: contractResponse(schemas.DeleteOrderByIdResponse),
    hardDeleted: contractResponse(schemas.HardDeleteOrderByIdResponse),
    restored: contractResponse(schemas.RestoreOrderByIdResponse, ORDER),
    billingCorrected: contractResponse(schemas.CorrectOrderBillingAddressResponse, ORDER)
};

vi.mock('@api', () => ({
    listOrders: vi.fn(() => Promise.resolve(RESPONSES.listed)),
    searchOrders: vi.fn(() => Promise.resolve(RESPONSES.searched)),
    getOrderById: vi.fn(() => Promise.resolve(RESPONSES.fetched)),
    updateOrderById: vi.fn(() => Promise.resolve(RESPONSES.updated)),
    deleteOrderById: vi.fn(() => Promise.resolve(RESPONSES.deleted)),
    hardDeleteOrderById: vi.fn(() => Promise.resolve(RESPONSES.hardDeleted)),
    restoreOrderById: vi.fn(() => Promise.resolve(RESPONSES.restored)),
    getOrderInvoice: vi.fn(() => Promise.resolve(INVOICE)),
    listOrderCreditNotes: vi.fn(() => Promise.resolve({ items: CREDIT_NOTES })),
    getOrderCreditNote: vi.fn(() => Promise.resolve(INVOICE)),
    getOrderTimeline: vi.fn(() => Promise.resolve(TIMELINE_PAGE)),
    addOrderNote: vi.fn(() => Promise.resolve(TIMELINE[0])),
    deleteOrderNote: vi.fn(() => Promise.resolve()),
    createOrder: vi.fn(() => Promise.resolve(ORDER)),
    correctOrderBillingAddress: vi.fn(() => Promise.resolve(RESPONSES.billingCorrected)),
    exportOrders: vi.fn(() =>
        Promise.resolve(
            new File(['createdAt,orderNumber\n'], 'orders-2026-10-27.csv', { type: 'text/csv' })
        )
    ),
    // The contract's sort enum: the store reads it to drop a sort the API would refuse.
    OrderSortItem: { createdAt: 'createdAt', '-createdAt': '-createdAt', status: 'status' }
}));

/**
 * Answers the next search with one row of the given status.
 * @param status - the status the row carries
 */
const searchAnswers = (status: OrderListItem['status']) =>
    vi.mocked(searchOrders).mockResolvedValueOnce(
        contractResponse(schemas.SearchOrdersResponse, {
            ...EMPTY_PAGE,
            items: [anOrderListItem({ status })],
            meta: { ...EMPTY_PAGE.meta, totalItems: 1 }
        }) as never
    );

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
                    items: [ROW],
                    meta: { ...EMPTY_PAGE.meta, totalItems: 1 }
                }) as never
            );
            const store = useOrdersStore();

            return store.fetchOrders().then(() => {
                expect(listOrders).toHaveBeenCalledTimes(1);
                expect(store.ordersList).toEqual([ROW]);
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

    describe('a list row merged over a cached order', () => {
        it('unsets a list field the row omits and keeps a detail-only one', () => {
            const store = useOrdersStore();
            store.addOrder(anOrder({ paidAt: '2026-10-01T10:00:00.000Z', userId: 'u1' }));
            // Someone else cleared `paidAt`: the row no longer carries it.
            vi.mocked(searchOrders).mockResolvedValueOnce(
                contractResponse(schemas.SearchOrdersResponse, {
                    ...EMPTY_PAGE,
                    items: [ROW],
                    meta: { ...EMPTY_PAGE.meta, totalItems: 1 }
                }) as never
            );

            return store.fetchPaginationOrders(1, 10, { partial: true, forced: true }).then(() => {
                expect(store.orders.o1?.paidAt).toBeUndefined();
                // `userId` is not a list field, so the merge leaves it.
                expect(store.orders.o1).toMatchObject({ userId: 'u1' });
            });
        });
    });

    describe('a list row that disagrees with a freshly read order', () => {
        it('reads the order again on the next detail visit', async () => {
            const store = useOrdersStore();
            await store.fetchOrder('o1');
            searchAnswers('canceled');
            await store.fetchPaginationOrders(1, 10, { partial: true, forced: true });
            vi.mocked(getOrderById).mockClear();

            await store.fetchOrder('o1');

            expect(getOrderById).toHaveBeenCalledTimes(1);
        });

        it('serves the cached order when the row agrees with it', async () => {
            const store = useOrdersStore();
            await store.fetchOrder('o1');
            // The detail read answers `ORDER`; a row repeating its list fields changes nothing.
            vi.mocked(searchOrders).mockResolvedValueOnce(
                contractResponse(schemas.SearchOrdersResponse, {
                    ...EMPTY_PAGE,
                    items: [
                        anOrderListItem({
                            status: ORDER.status,
                            paymentStatus: ORDER.paymentStatus,
                            fulfillmentStatus: ORDER.fulfillmentStatus,
                            returnStatus: ORDER.returnStatus,
                            orderNumber: ORDER.orderNumber,
                            totalPrice: ORDER.totalPrice,
                            currency: ORDER.currency,
                            actions: ORDER.actions
                        })
                    ],
                    meta: { ...EMPTY_PAGE.meta, totalItems: 1 }
                }) as never
            );
            await store.fetchPaginationOrders(1, 10, { partial: true, forced: true });
            vi.mocked(getOrderById).mockClear();

            await store.fetchOrder('o1');

            expect(getOrderById).not.toHaveBeenCalled();
        });
    });

    describe('updateOrder', () => {
        /**
         * `status` is not a field of `UpdateOrderByIdRequest` — `email` is the only field this
         * body carries.
         */
        it('sends the id in the path and the changes in the body', () =>
            useOrdersStore()
                .updateOrder('o1', { email: 'new@example.com' })
                .then(() => {
                    expect(updateOrderById).toHaveBeenCalledWith('o1', {
                        email: 'new@example.com'
                    });
                    contractRequest(schemas.UpdateOrderByIdBody, { email: 'new@example.com' });
                }));
    });

    describe('correctBillingAddress', () => {
        it('sends the whole address, VAT number included, and caches the order it answers', () => {
            const address = {
                fullName: 'Rossi Srl',
                street: 'Via Roma 1',
                city: 'Milano',
                zip: '20100',
                country: 'IT',
                vatNumber: 'IT01234567890'
            };

            return useOrdersStore()
                .correctBillingAddress('o1', address)
                .then((corrected) => {
                    expect(correctOrderBillingAddress).toHaveBeenCalledWith('o1', address);
                    contractRequest(schemas.CorrectOrderBillingAddressBody, address);
                    expect(corrected).toMatchObject({ id: 'o1' });
                    expect(useOrdersStore().orders.o1).toMatchObject({ id: 'o1' });
                });
        });

        it('asks for the documents to be read again now and once more when the reissue has landed', async () => {
            vi.useFakeTimers();
            const store = useOrdersStore();
            const address = {
                fullName: 'Rossi Srl',
                street: 'Via Roma 1',
                city: 'Milano',
                zip: '20100',
                country: 'IT'
            };

            await store.correctBillingAddress('o1', address);
            expect(store.documentsRevision).toBe(1);

            // The server reissues off an outbox event, a moment after its answer.
            await vi.advanceTimersByTimeAsync(2000);
            expect(store.documentsRevision).toBe(2);
            vi.useRealTimers();
        });
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
                    expect(getOrderInvoice).toHaveBeenCalledWith('o1', { timeout: 35_000 });
                    expect(result).toBe(INVOICE);
                }));
    });

    describe('fetchCreditNotes', () => {
        it('unwraps the envelope to the list of note summaries', () =>
            useOrdersStore()
                .fetchCreditNotes('o1')
                .then((result) => {
                    expect(listOrderCreditNotes).toHaveBeenCalledWith('o1');
                    expect(result).toEqual(CREDIT_NOTES);
                }));
    });

    describe('fetchCreditNote', () => {
        it('downloads the one note asked for, as a Blob', () =>
            useOrdersStore()
                .fetchCreditNote('o1', 'cn1')
                .then((result) => {
                    expect(getOrderCreditNote).toHaveBeenCalledExactlyOnceWith('o1', 'cn1', {
                        timeout: 35_000
                    });
                    expect(result).toBe(INVOICE);
                }));
    });

    describe('fetchTimeline', () => {
        it('asks for page 1 by default and answers the page with its meta', () =>
            useOrdersStore()
                .fetchTimeline('o1')
                .then((result) => {
                    expect(getOrderTimeline).toHaveBeenCalledExactlyOnceWith('o1', { page: 1 });
                    expect(result).toEqual(TIMELINE_PAGE);
                }));

        it('asks for the page it is given', () =>
            useOrdersStore()
                .fetchTimeline('o1', 3)
                .then(() => {
                    expect(getOrderTimeline).toHaveBeenCalledExactlyOnceWith('o1', { page: 3 });
                }));
    });

    describe('addNote', () => {
        it('posts the text to the order and answers the new entry', () =>
            useOrdersStore()
                .addNote('o1', 'Called the buyer')
                .then((entry) => {
                    expect(addOrderNote).toHaveBeenCalledTimes(1);
                    const [orderId, body, options] = vi.mocked(addOrderNote).mock.calls[0];
                    expect([orderId, body]).toEqual(['o1', { text: 'Called the buyer' }]);
                    expect(options?.headers).toHaveProperty('Idempotency-Key');
                    expect(entry).toEqual(TIMELINE[0]);
                }));
    });

    describe('createOrder', () => {
        const BODY = { email: 'counter@example.com', items: [{ productId: 'p1', quantity: 2 }] };

        it('posts the body as it is, with an Idempotency-Key, and caches the new order', () => {
            const store = useOrdersStore();

            return store.createOrder(BODY).then((created) => {
                const [body, options] = vi.mocked(createOrder).mock.calls[0];
                expect(body).toEqual(BODY);
                expect(options?.headers).toHaveProperty('Idempotency-Key');
                expect(created).toEqual(ORDER);
                expect(store.orders[ORDER.id]).toEqual(ORDER);
            });
        });

        it('resends the same key for a lost answer, and a fresh one after any answer', () => {
            const store = useOrdersStore();
            vi.mocked(createOrder).mockRejectedValueOnce(new Error('network down'));
            const keyOf = (call: number) =>
                (vi.mocked(createOrder).mock.calls[call][1]?.headers as Record<string, string>)[
                    'Idempotency-Key'
                ];

            return store
                .createOrder(BODY)
                .catch(() => store.createOrder(BODY))
                .then(() => store.createOrder(BODY))
                .then(() => {
                    expect(keyOf(1)).toBe(keyOf(0));
                    expect(keyOf(2)).not.toBe(keyOf(1));
                });
        });
    });

    describe('deleteNote', () => {
        it('asks the server to unset the text of that note row', () =>
            useOrdersStore()
                .deleteNote('o1', 'e9')
                .then(() => {
                    expect(deleteOrderNote).toHaveBeenCalledExactlyOnceWith('o1', 'e9');
                }));
    });

    describe('exportOrdersCsv', () => {
        it('asks for the own criteria of the list, without paging, and returns a CSV file', () =>
            useOrdersStore()
                .exportOrdersCsv({
                    status: 'paid',
                    email: 'a@b.c',
                    orderNumber: '#2026-41',
                    id: 'o1',
                    createdFrom: '2026-10-01'
                })
                .then((file) => {
                    expect(exportOrders).toHaveBeenCalledTimes(1);
                    const [query] = vi.mocked(exportOrders).mock.calls[0] ?? [];
                    expect(query).toMatchObject({
                        status: 'paid',
                        email: 'a@b.c',
                        // Sent as typed: the server owns the tolerant reading of a quoted number.
                        orderNumber: '#2026-41',
                        id: ['o1']
                    });
                    // The calendar day became an instant (its zone is the browser's, so only the shape is fixed).
                    expect(query?.createdFrom).toEqual(expect.stringContaining('T'));
                    expect(query).not.toHaveProperty('page');
                    // The server's file, name included, reaches the caller untouched.
                    expect(file).toBeInstanceOf(File);
                    expect(file).toHaveProperty('name', 'orders-2026-10-27.csv');
                    expect(file.type).toContain('text/csv');
                    return file.text();
                })
                .then((text) => {
                    expect(text).toBe('createdAt,orderNumber\n');
                }));

        it('lets a refusal through untouched', () => {
            const refusal = { status: 422, errors: [{ code: 'ORDER_EXPORT_TOO_LARGE' }] };
            vi.mocked(exportOrders).mockRejectedValueOnce(refusal);

            return expect(useOrdersStore().exportOrdersCsv({})).rejects.toBe(refusal);
        });
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
            /**
             * `fetchTarget(fetcher, orderId, ...)` — the second argument is what the toolkit
             * caches and selects on. Dropping it would still produce a correct HTTP request,
             * so the request assertion above cannot catch it.
             */
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
                email: 'ada@example.com',
                status: 'pending',
                paymentMethod: 'bank_transfer'
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
                            email: 'ada@example.com',
                            /**
                             * The "awaiting transfer" checkbox and the status select both write
                             * these two fields — regressed to being dropped here once before.
                             */
                            status: 'pending',
                            paymentMethod: 'bank_transfer'
                        })
                    );
                });
        });

        it('sends the date filters as inclusive instants and the two states as they are', () => {
            const store = useOrdersStore();
            store.filters = {
                createdFrom: '2026-03-01',
                createdTo: '2026-03-31',
                paidFrom: '2026-03-05',
                paidTo: 'not-a-day',
                paymentStatus: 'paid',
                returnStatus: 'requested'
            };

            return store
                .watchSearchOrders()
                .search()
                .then(() => {
                    const request = vi.mocked(searchOrders).mock.calls.at(-1)?.[0];
                    expect(request?.createdFrom).toBe(new Date(2026, 2, 1).toISOString());
                    expect(request?.createdTo).toBe(
                        new Date(2026, 2, 31, 23, 59, 59, 999).toISOString()
                    );
                    expect(request?.paidFrom).toBe(new Date(2026, 2, 5).toISOString());
                    // A day that does not exist is no bound, not a request the API refuses.
                    expect(request?.paidTo).toBeUndefined();
                    expect(request).toMatchObject({
                        paymentStatus: 'paid',
                        returnStatus: 'requested'
                    });
                });
        });

        it('includes the current page and size alongside the filters', () => {
            const store = useOrdersStore();
            store.filters = { email: 'ada@example.com' };

            return store
                .watchSearchOrders()
                .search()
                .then(() => {
                    /**
                     * Dropping pagination here would silently return only the first page for
                     * every search, no matter which page the user is on.
                     */
                    expect(searchOrders).toHaveBeenCalledWith(
                        expect.objectContaining({
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Vitest types `expect.any()` as `any`, since it is a placeholder matcher usable against anything
                            page: expect.any(Number),
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Vitest types `expect.any()` as `any`, since it is a placeholder matcher usable against anything
                            pageSize: expect.any(Number)
                        })
                    );
                });
        });

        it('sends a sort the contract names as its token list, and drops one it does not', () => {
            const store = useOrdersStore();
            store.filters = { sort: '-createdAt' };

            return store
                .watchSearchOrders()
                .search()
                .then(() => {
                    expect(searchOrders).toHaveBeenLastCalledWith(
                        expect.objectContaining({ sort: ['-createdAt'] })
                    );
                    store.filters = { sort: 'totalPrice' };
                    return store.watchSearchOrders().search(true);
                })
                .then(() => {
                    expect(vi.mocked(searchOrders).mock.lastCall?.[0]?.sort).toBeUndefined();
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
