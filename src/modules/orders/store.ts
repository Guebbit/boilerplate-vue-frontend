/**
 * @module
 * Pinia store built on `useStructureCrudApi` for orders CRUD and paginated
 * search, plus hand-written actions (`cancelOrder`, `fetchInvoice`, `fetchCreditNotes`,
 * `fetchCreditNote`, `fetchTimeline`, `addNote`, `deleteNote`, `exportOrdersCsv`, `createOrder`)
 * for endpoints that don't fit the toolkit's record-shaped primitives.
 */
import { ref, toValue } from 'vue';
import { defineStore } from 'pinia';
import { sendKeyed, useIdempotencyKeys } from '@/infrastructure/http/idempotency.ts';
import { useStructureCrudApi } from '@guebbit/vue-toolkit';
import { queryClient } from '@/infrastructure/query-client.ts';
import { getCurrentLocale } from '@/i18n';
import { sortTokensOf } from '@/infrastructure/utils/sort.ts';
import { endOfDayInstant, startOfDayInstant } from '@/infrastructure/utils/day-range.ts';
import { createListStaleTracker, unsetOmitted } from '@/infrastructure/utils/list-row.ts';
import {
    listOrders,
    searchOrders,
    getOrderById,
    updateOrderById,
    deleteOrderById,
    hardDeleteOrderById,
    restoreOrderById,
    cancelOrderById,
    getOrderInvoice,
    listOrderCreditNotes,
    getOrderCreditNote,
    getOrderTimeline,
    addOrderNote,
    deleteOrderNote,
    createOrder as apiCreateOrder,
    exportOrders,
    overrideOrderStatus,
    correctOrderShippingAddress,
    correctOrderBillingAddress,
    OrderSortItem
} from '@api';
import type {
    Order,
    OrderListItem,
    CreateOrderRequest,
    UpdateOrderByIdRequest,
    SearchOrdersRequest,
    OrderAddress,
    OrderBillingAddress,
    OrderStatus,
    CreditNoteSummary,
    OrderTimelineEntry,
    OrderTimelineResponse
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
    orderNumber: filters.orderNumber,
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
 * Every field an `OrderListItem` declares: what a list row may carry, so what a row that omits one
 * has unset.
 */
const ORDER_LIST_KEYS: Record<keyof OrderListItem, true> = {
    id: true,
    orderNumber: true,
    status: true,
    paymentStatus: true,
    fulfillmentStatus: true,
    returnStatus: true,
    totalPrice: true,
    currency: true,
    paidAt: true,
    createdAt: true,
    deletedAt: true,
    actions: true
};

/**
 * Marks every list field a row omits as `undefined`, so the partial merge (see `OrdersList.vue`)
 * clears a field someone else unset since the record was cached.
 *
 * @param items - the rows a list answered
 * @returns the same rows, each naming the list fields it omits
 */
const withOmittedUnset = (items: OrderListItem[]): OrderListItem[] =>
    items.map((row) => unsetOmitted(ORDER_LIST_KEYS, row));

/**
 * Reads one page of an order's timeline, newest first (a log: no `sort`). A background read like
 * {@link listCreditNotes}: outside `fetchAny`, so it never flips the store's shared `loading` and
 * disables the page's buttons. The server decides the rows: staff get every one with its actor, the
 * buyer only the buyer-visible ones, and `meta.totalItems` counts only what this caller may read.
 *
 * @param orderId - Identifier of the order.
 * @param page - 1-based page; the server's default page size applies.
 * @returns A promise resolving with the page's entries and its pagination meta.
 */
const fetchTimeline = (orderId: string, page = 1): Promise<OrderTimelineResponse> =>
    getOrderTimeline(orderId, { page });

/**
 * `Idempotency-Key`s for `addNote`, one per order and text: a lost response resends the SAME key,
 * so a retry never leaves the note twice; any answer mints a fresh one, so a second click on the
 * same words is a new note.
 */
const noteIdempotencyKeys = useIdempotencyKeys();

/**
 * Leaves a staff note on an order's timeline — `POST /orders/{id}/timeline/notes` (`update:Order`).
 * Outside `fetchAny` like {@link fetchTimeline}: the timeline reads again afterwards, and the page's
 * shared `loading` must not disable its buttons for a note.
 *
 * @param orderId - Identifier of the order.
 * @param text - What staff wrote, 1 to 2000 characters.
 * @returns A promise resolving with the new `note_added` entry.
 */
const addNote = (orderId: string, text: string): Promise<OrderTimelineEntry> =>
    sendKeyed(noteIdempotencyKeys.forSubject(`${orderId}\n${text}`), (options) =>
        addOrderNote(orderId, { text }, options)
    );

/**
 * Withdraws the text of a staff note — `DELETE /orders/{id}/timeline/notes/{eventId}` (`update:Order`).
 * The row stays in the timeline without its text. Outside `fetchAny` for the same reason as
 * {@link addNote}.
 *
 * @param orderId - Identifier of the order.
 * @param eventId - Identifier of the `note_added` row.
 * @returns A promise resolving once the server has unset the text.
 */
const deleteNote = (orderId: string, eventId: string): Promise<void> =>
    deleteOrderNote(orderId, eventId);

/**
 * `Idempotency-Key`s for `createOrder`, one per body: a lost response resends the SAME key, so a
 * retry never books the order twice; any answer mints a fresh one, so a second order with the same
 * lines is a new order.
 */
const createOrderIdempotencyKeys = useIdempotencyKeys();

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
    listOrderCreditNotes(orderId).then((response) => response.items);

/**
 * How long after a billing correction the documents are read once more: the reissue runs off an
 * outbox event, which the relay delivers within moments of the answer.
 */
const REISSUE_SETTLE_MS = 2000;

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
     * Bumped whenever the server may have just issued documents for an order, so a page showing the
     * documents or the history reads them again. Only a billing correction does it today: the
     * invoice is cancelled and reissued off an event, after the answer.
     */
    const documentsRevision = ref(0);

    /**
     * Which cached orders a list row has disagreed with since their last detail read.
     */
    const listStale = createListStaleTracker<OrderListItem>(ORDER_LIST_KEYS);

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
        fetchOne: fetchOneOrder,
        watchOne: watchOneOrder,
        invalidateTarget,
        updateOne: updateOrder,
        deleteOne: deleteOrder,
        deleteTarget,
        updateTarget,
        fetchAny
    } = useStructureCrudApi<
        Order | OrderListItem,
        string,
        OrdersFilters,
        CreateOrderRequest,
        UpdateOrderByIdRequest
    >(
        {
            list: () =>
                listOrders().then((response) => {
                    listStale.note(response.items, (id) => orders.value[id]);
                    return withOmittedUnset(response.items);
                }),

            search: (filters, page, pageSize) =>
                searchOrders({
                    page,
                    pageSize,
                    ...criteriaOf(filters)
                }).then((response) => {
                    listStale.note(response.items, (id) => orders.value[id]);
                    return {
                        items: withOmittedUnset(response.items),
                        totalItems: response.meta.totalItems
                    };
                }),

            get: (orderId) => getOrderById(orderId),

            update: (orderId, orderData) => updateOrderById(orderId, orderData),

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
     * `fetchOne`, first marking the order stale when a list row disagreed with it, so a record
     * the list moved under is read again instead of served from its fresh cache.
     *
     * @param orderId - Identifier of the order.
     * @param settings - The toolkit's fetch settings.
     * @returns A promise resolving with the order.
     */
    const fetchOrder: typeof fetchOneOrder = (orderId, settings) =>
        (listStale.take(orderId) ? invalidateTarget(orderId) : Promise.resolve()).then(() =>
            fetchOneOrder(orderId, settings)
        );

    /**
     * `watchOne`, with the same stale mark as {@link fetchOrder}, taken as the id is read.
     *
     * @param idSource - The id to show, as the toolkit takes it.
     * @param settings - The toolkit's watch settings.
     * @returns The toolkit's watch handle.
     */
    const watchOrder: typeof watchOneOrder = (idSource, settings) =>
        watchOneOrder(() => {
            const orderId = toValue(idSource);
            /**
             * Marks the cached copy stale synchronously, ahead of the watcher's own read; a failed
             * refetch of a watched copy is the watcher's own error to report.
             */
            if (orderId && listStale.take(orderId))
                invalidateTarget(orderId).catch(() => undefined);
            return orderId;
        }, settings);

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
        updateTarget(() => restoreOrderById(orderId), {}, orderId);

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
     * @returns A promise resolving with the canceled order.
     */
    const cancelOrder = (orderId: string, refund?: boolean) =>
        updateTarget(
            () =>
                cancelOrderById(orderId, refund === undefined ? undefined : { refund }).then(
                    (response) => response
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
        updateTarget(() => overrideOrderStatus(orderId, { to, reason }), {}, orderId);

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
        updateTarget(() => correctOrderShippingAddress(orderId, address), {}, orderId);

    /**
     * Replaces who an order is invoiced to — `PUT /orders/{id}/billing-address` (`update:Order`;
     * `Order.actions.correctBilling` says whether it would be accepted). An invoice already issued
     * is cancelled and reissued by the server a moment later, so the page re-reads the order's
     * timeline and documents after this. The cached record is replaced, same as
     * {@link correctShippingAddress}.
     *
     * @param orderId - Which order.
     * @param address - The corrected address and VAT number; the whole of it replaces the old one.
     * @returns A promise resolving with the order, its new billing address in place.
     */
    const correctBillingAddress = (orderId: string, address: OrderBillingAddress) =>
        updateTarget(() => correctOrderBillingAddress(orderId, address), {}, orderId).then(
            (order) => {
                /**
                 * Documents are read once now and once more when the reissue has had time to land:
                 * it runs off an outbox event, a moment after this answer.
                 */
                documentsRevision.value += 1;
                setTimeout(() => {
                    documentsRevision.value += 1;
                }, REISSUE_SETTLE_MS);
                return order;
            }
        );

    /**
     * Raises an order for a buyer, or for nobody — `POST /orders` (`create:Order`). Without a
     * `userId` it is a walk-in order: no account, the receipt goes to `email`. Outside `fetchAny`
     * like the other writes the page runs itself; the new order is cached so its page opens at once.
     *
     * @param body - The buyer's email, the lines, and the account when there is one.
     * @returns A promise resolving with the created order.
     */
    const createOrder = (body: CreateOrderRequest): Promise<Order> =>
        sendKeyed(createOrderIdempotencyKeys.forSubject(JSON.stringify(body)), (options) =>
            apiCreateOrder(body, options)
        ).then((created) => {
            addOrder(created);
            return created;
        });

    /**
     * Downloads every order the filters match as one CSV file — `GET /orders/export`
     * (`export:Order`, step-up). Held outside `fetchAny`: a file is not a record, and the
     * page keeps its own `exporting` flag so the table stays usable meanwhile. The step-up
     * prompt is the HTTP layer's job; a 422 (too many rows) and a 429 reach the caller as is.
     *
     * @param filters - The page's current filters; paging does not apply.
     * @returns A promise resolving with the CSV file, named by the server.
     */
    const exportOrdersCsv = (filters: OrdersFilters): Promise<Blob> =>
        exportOrders(criteriaOf(filters));

    /**
     * Fetches an order's invoice, rendered by the server on every request — there is no pending
     * state to wait out.
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
        documentsRevision,

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
        updateOrder,
        deleteOrder,
        cancelOrder,
        overrideStatus,
        correctShippingAddress,
        correctBillingAddress,
        hardDeleteOrder,
        restoreOrder,
        fetchInvoice,
        fetchCreditNotes: listCreditNotes,
        fetchTimeline,
        addNote,
        deleteNote,
        createOrder,
        exportOrdersCsv,
        fetchCreditNote
    };
});
