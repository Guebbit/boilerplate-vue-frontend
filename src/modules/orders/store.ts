/**
 * @module
 * Pinia store built on `useStructureCrudApi` for orders CRUD and paginated
 * search, plus hand-written actions (`cancelOrder`, `fetchInvoice`, `fetchCreditNotes`,
 * `fetchCreditNote`, `fetchTimeline`, `exportOrdersCsv`)
 * for endpoints that don't fit the toolkit's record-shaped primitives.
 */
import { defineStore } from 'pinia';
import { useStructureCrudApi } from '@guebbit/vue-toolkit';
import { queryClient } from '@/infrastructure/query-client.ts';
import { getCurrentLocale } from '@/i18n';
import { sortTokensOf } from '@/infrastructure/utils/sort.ts';
import { endOfDayInstant, startOfDayInstant } from '@/infrastructure/utils/day-range.ts';
import {
    listOrders,
    searchOrders,
    getOrderById,
    createOrder as apiCreateOrder,
    updateOrderById,
    deleteOrderById,
    hardDeleteOrderById,
    restoreOrderById,
    cancelOrderById,
    getOrderInvoice,
    listOrderCreditNotes,
    getOrderCreditNote,
    getOrderTimeline,
    exportOrders,
    overrideOrderStatus,
    correctOrderShippingAddress,
    OrderSortItem
} from '@api';
import type {
    Order,
    CreateOrderRequest,
    UpdateOrderByIdRequest,
    SearchOrdersRequest,
    OrderAddress,
    OrderStatus,
    CreditNoteSummary,
    OrderTimelineEntry
} from '@types';

/**
 * Search criteria for the orders list, i.e. everything but pagination (which is
 * owned by the toolkit's search state).
 *
 * `id` stays a single string here — the filter box searches for one id — and is wrapped into the
 * one-element array `SearchOrdersRequest.id` now requires, in `search:` below. `userId`/
 * `productId` are untouched — they stay scalar in the contract.
 *
 * The four date filters hold calendar days (`YYYY-MM-DD`: what a date input and a URL carry), and
 * `search:` turns each into the instant the API takes, inclusive at both ends.
 */
export type OrdersFilters = Omit<
    SearchOrdersRequest,
    'page' | 'pageSize' | 'id' | 'sort' | 'createdFrom' | 'createdTo' | 'paidFrom' | 'paidTo'
> & {
    /** Created on or after this day. */
    createdFrom?: string;
    /** Created on or before this day. */
    createdTo?: string;
    /** Paid on or after this day; an unpaid order never matches. */
    paidFrom?: string;
    /** Paid on or before this day. */
    paidTo?: string;
    id?: string;
    /** The API's `sort` as one CSV (`-createdAt`): the form a URL holds. */
    sort?: string;
};

/**
 * The list's filters as the API's query: everything the search and the CSV export both take, i.e.
 * everything but paging. One mapping, so the file a manager downloads is the list they were looking
 * at, never a near miss of it.
 *
 * @param filters - The page's filters, calendar days and all.
 * @returns The criteria in the API's own shape (instants, id as a batch, sort as tokens).
 */
const criteriaOf = (filters: OrdersFilters) => ({
    // The API reads a batch of ids; the filter box searches for one.
    id: filters.id ? [filters.id] : undefined,
    sort: sortTokensOf(filters.sort, OrderSortItem),
    userId: filters.userId,
    productId: filters.productId,
    email: filters.email,
    status: filters.status,
    fulfillmentStatus: filters.fulfillmentStatus,
    paymentMethod: filters.paymentMethod,
    deleted: filters.deleted,
    createdFrom: startOfDayInstant(filters.createdFrom),
    createdTo: endOfDayInstant(filters.createdTo),
    paidFrom: startOfDayInstant(filters.paidFrom),
    paidTo: endOfDayInstant(filters.paidTo),
    paymentStatus: filters.paymentStatus,
    returnStatus: filters.returnStatus
});

/**
 * Reads an order's timeline, oldest first. A background read like {@link listCreditNotes}: outside
 * `fetchAny`, so it never flips the store's shared `loading` and disables the page's buttons. The
 * server decides the rows: staff get every one with its actor, the buyer only the buyer-visible ones.
 *
 * @param orderId - Identifier of the order.
 * @returns A promise resolving with the entries.
 */
const fetchTimeline = (orderId: string): Promise<OrderTimelineEntry[]> =>
    getOrderTimeline(orderId).then((response) => response.data);

/**
 * Lists the credit notes of an order, oldest first — one per settled refund, `[]` for an order
 * never refunded. The list is how the UI learns which notes exist; there is no flag for it.
 * Deliberately outside `fetchAny`: this is a background read, and flipping the store's shared
 * `loading` would disable the page's other buttons every time it runs.
 *
 * @param orderId - Identifier of the order.
 * @returns A promise resolving with the note summaries.
 */
const listCreditNotes = (orderId: string): Promise<CreditNoteSummary[]> =>
    listOrderCreditNotes(orderId).then((response) => response.data);

/**
 * Orders CRUD, paginated search and invoices.
 *
 * The CRUD half is declared; the invoice download is written against the toolkit primitives below,
 * because a Blob is not a record.
 *
 * Checkout is NOT here. It is `POST /cart/checkout`, it empties the cart, and the contract files it
 * under `Cart` — so `useCartStore` owns it, and this store learns about the new order the way it
 * learns about any other: by fetching.
 */
export const useOrdersStore = defineStore('orders', () => {
    /**
     * Record cache, list/pagination state and CRUD actions, generated by the
     * toolkit's structured-CRUD primitive from the three type params (entity,
     * id, filters) plus the create/update request shapes.
     */
    const {
        itemDictionary: orders,
        itemList: ordersList,
        addRecord: addOrder,
        selectedIdentifier: selectedOrderId,
        selectedRecord: currentOrder,

        filters,
        loading,
        pageCurrent,
        pageSize,
        pageTotal,
        pageItemList,

        fetchList: fetchOrders,
        fetchPage: fetchPaginationOrders,
        watchList: watchSearchOrders,
        fetchOne: fetchOrder,
        watchOne: watchOrder,
        createOne: createOrder,
        updateOne: updateOrder,
        deleteOne: deleteOrder,
        deleteTarget,
        updateTarget,
        fetchAny
    } = useStructureCrudApi<
        Order,
        string,
        OrdersFilters,
        CreateOrderRequest,
        UpdateOrderByIdRequest
    >(
        {
            list: () => listOrders().then((response) => response.data.items),

            search: (filters, page, pageSize) =>
                searchOrders({
                    page,
                    pageSize,
                    ...criteriaOf(filters)
                }).then((response) => ({
                    items: response.data.items,
                    totalItems: response.data.meta.totalItems
                })),

            get: (orderId) => getOrderById(orderId).then((response) => response.data),

            create: (orderData) => apiCreateOrder(orderData).then((response) => response.data),

            update: (orderId, orderData) =>
                updateOrderById(orderId, orderData).then((response) => response.data),

            remove: (orderId) => deleteOrderById(orderId)
        },
        {
            resourceKey: 'orders',
            queryClient,
            /**
             * Cache scope: the language the request carried.
             *
             * Every cached order embeds its lines' `OrderLineProduct` (title and description),
             * resolved in the caller's language, so it is only valid under it. Keyed on the
             * locale, a switch reads a different scope — nothing stale can be served — and the
             * toolkit cancels and drops the old one once no watcher shows it.
             */
            dependsOn: () => [getCurrentLocale()],
            /**
             * 5 000 instead of the toolkit's 100 000 default.
             *
             * Orders is the store that actually grows: an admin paging through the whole history
             * accumulates every page visited, and each record carries its embedded line items, so
             * an order is far heavier than a product or a user. 5 000 of them is already a
             * generous session.
             *
             * A critical-mass backstop, not a cache policy — nothing is evicted for being old. On
             * the way past the bound the WHOLE dictionary is dropped and immediately repopulated
             * with the incoming batch, which is invisible here because every list is
             * server-paginated (`pageItemList` renders the batch that just arrived). It would be
             * visible on an infinite-scroll list, which is why this is set per store rather than
             * globally.
             */
            maxRecords: 5000
        }
    );

    /**
     * Permanently deletes an order, bypassing the soft delete.
     *
     * `deleteOne` leaves the record in place with `deletedAt` set, which an admin can still see
     * and restore; this removes it outright and cannot be undone. Distinct methods rather than a
     * flag, so the irreversible one is never reached by passing the wrong boolean.
     *
     * @param orderId - Identifier of the order to destroy.
     * @returns A promise resolving once the order is gone.
     */
    const hardDeleteOrder = (orderId: string) =>
        deleteTarget(() => hardDeleteOrderById(orderId), orderId);

    /**
     * Undoes a soft delete — `POST /orders/{id}/restore`. A second `deleteOrder` never does:
     * DELETE is one-way on the API, and safe to retry. The restored record replaces the cached one.
     *
     * @param orderId - Identifier of the order to restore.
     * @returns A promise resolving with the restored order.
     */
    const restoreOrder = (orderId: string) =>
        updateTarget(
            () => restoreOrderById(orderId).then((response) => response.data),
            {},
            orderId
        );

    /**
     * Cancels one order. Which statuses allow it is the server's `actions.cancel`, and its
     * conditional write decides, so a cancel racing a status change comes back as the 409 this
     * rethrows rather than a silent double write.
     *
     * `updateTarget` (not a plain {@link addOrder}) replaces both the cached record AND its
     * per-item query-cache entry, so a sibling page's own `watchOrder` reads the new status
     * instead of serving back the pre-cancel copy it still holds fresh.
     *
     * `refund` is an operator's choice and is ignored for a customer, who is always refunded.
     *
     * @param orderId - Which order.
     * @param refund - Whether the money goes back with the cancellation. Defaults to the API's.
     * @returns A promise resolving with the cancelled order.
     */
    const cancelOrder = (orderId: string, refund?: boolean) =>
        updateTarget(
            () =>
                cancelOrderById(orderId, refund === undefined ? undefined : { refund }).then(
                    (response) => response.data
                ),
            {},
            orderId
        );

    /**
     * Forces a move to `processing`, `shipped` or `delivered` with a reason, bypassing the
     * ordinary transition rule — `override:Order` only. No parcel record and no shipped
     * email fire; this is a manual correction, not the shipping flow (`useDeliveryStore`'s
     * `ship`/`deliver` are that door, with their own `forced` option). `updateTarget` replaces the
     * cached record and its query-cache entry, same reasoning as {@link cancelOrder}.
     *
     * @param orderId - Which order.
     * @param to - The corrected status. Must be forward of the order's current one.
     * @param reason - Why the normal door didn't apply. Recorded on the order's override history.
     * @returns A promise resolving with the corrected order.
     */
    const overrideStatus = (orderId: string, to: OrderStatus, reason: string) =>
        updateTarget(
            () => overrideOrderStatus(orderId, { to, reason }).then((response) => response.data),
            {},
            orderId
        );

    /**
     * Replaces where an unshipped order ships — `PUT /orders/{id}/shipping-address`
     * (`update:Order`; `Order.actions.correctAddress` says whether it would be accepted). The
     * cached record is replaced, same reasoning as {@link cancelOrder}.
     *
     * @param orderId - Which order.
     * @param address - The corrected address; the whole of it replaces the old one.
     * @returns A promise resolving with the order, its new address in place.
     */
    const correctShippingAddress = (orderId: string, address: OrderAddress) =>
        updateTarget(
            () => correctOrderShippingAddress(orderId, address).then((response) => response.data),
            {},
            orderId
        );

    /**
     * Downloads every order the filters match as one CSV file — `GET /orders/export`
     * (`export:Order`, step-up). Held outside `fetchAny`: a file is not a record, and the
     * page keeps its own `exporting` flag so the table stays usable meanwhile. The step-up
     * prompt is the HTTP layer's job; a 422 (too many rows) and a 429 reach the caller as is.
     *
     * @param filters - The page's current filters; paging does not apply.
     * @returns A promise resolving with the CSV as a file-ready Blob.
     */
    const exportOrdersCsv = (filters: OrdersFilters): Promise<Blob> =>
        // `responseType: 'text'`: axios would otherwise try to JSON-parse the body first.
        exportOrders(criteriaOf(filters), { responseType: 'text' }).then(
            (csv) => new Blob([csv], { type: 'text/csv;charset=utf-8' })
        );

    /**
     * Fetches an order's invoice, rendered by the server on every request — there is no pending
     * state to wait out any more.
     *
     * @param orderId - Identifier of the order to invoice.
     * @returns A promise resolving with the PDF bytes.
     */
    const fetchInvoice = (orderId: string) => fetchAny(() => getOrderInvoice(orderId));

    /**
     * Fetches one credit note's frozen PDF. Each download counts against the invoicing rate limit,
     * so callers fetch the one note the visitor asked for, never all of them.
     *
     * @param orderId - Identifier of the order.
     * @param creditNoteId - Which note, from `fetchCreditNotes`.
     * @returns A promise resolving with the PDF bytes.
     */
    const fetchCreditNote = (orderId: string, creditNoteId: string) =>
        fetchAny(() => getOrderCreditNote(orderId, creditNoteId));

    return {
        orders,
        ordersList,
        addOrder,
        selectedOrderId,
        currentOrder,

        filters,
        loading,
        pageCurrent,
        pageSize,
        pageTotal,
        pageItemList,

        fetchOrders,
        fetchPaginationOrders,
        watchSearchOrders,
        fetchOrder,
        watchOrder,
        createOrder,
        updateOrder,
        deleteOrder,
        cancelOrder,
        overrideStatus,
        correctShippingAddress,
        hardDeleteOrder,
        restoreOrder,
        fetchInvoice,
        fetchCreditNotes: listCreditNotes,
        fetchTimeline,
        exportOrdersCsv,
        fetchCreditNote
    };
});
