import { defineStore } from 'pinia';
import { useCoreStore, useStructureCrudApi } from '@guebbit/vue-toolkit';
import {
    listOrders,
    getOrderById,
    createOrder as apiCreateOrder,
    updateOrderById,
    deleteOrderById,
    hardDeleteOrderById,
    cancelOrderById,
    getOrderInvoice
} from '@api';
import { useObservabilityStore } from '@/infrastructure/stores/observability.ts';
import { analyticsEvents } from '@/infrastructure/observability/events.ts';
import type {
    Order,
    CreateOrderRequest,
    UpdateOrderByIdRequest,
    SearchOrdersRequest
} from '@types';

/**
 * Search criteria for the orders list, i.e. everything but pagination (which is
 * owned by the toolkit's search state).
 */
type OrdersFilters = Omit<SearchOrdersRequest, 'page' | 'pageSize'>;

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
    const { getLoading, setLoading } = useCoreStore();

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
                listOrders({
                    page,
                    pageSize,
                    id: filters.id,
                    userId: filters.userId,
                    productId: filters.productId,
                    email: filters.email
                }).then((response) => response.data.items),

            get: (orderId) => getOrderById(orderId).then((response) => response.data),

            create: (orderData) => apiCreateOrder(orderData).then((response) => response.data),

            update: (orderId, orderData) =>
                updateOrderById(orderId, orderData).then((response) => response.data),

            remove: (orderId) => deleteOrderById(orderId)
        },
        {
            getLoading,
            setLoading,
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
     * and toggle back; this removes it outright and cannot be undone. Distinct methods rather than a
     * flag, so the irreversible one is never reached by passing the wrong boolean.
     *
     * @param orderId - Identifier of the order to destroy.
     * @returns A promise resolving once the order is gone.
     */
    const hardDeleteOrder = (orderId: string) =>
        deleteTarget(() => hardDeleteOrderById(orderId), orderId);

    /**
     * Cancels one order — the one order write a customer can make. `pending` only; the API's
     * conditional write decides, so a cancel racing a status change comes back as the 409 this
     * rethrows rather than a silent double write. The returned record replaces the cached one,
     * because the fact worth rendering afterwards is the new status.
     *
     * @param orderId - Which order.
     * @returns A promise resolving with the cancelled order.
     */
    const cancelOrder = (orderId: string) =>
        fetchAny(() =>
            cancelOrderById(orderId).then((response) => {
                const obs = useObservabilityStore();
                obs.track(analyticsEvents.ORDER_CANCELLED, { order_id: orderId });
                if (response.data) addOrder(response.data);
                return response.data;
            })
        );

    /**
     * Downloads an order's invoice.
     *
     * @param orderId - Identifier of the order to invoice.
     * @returns A promise resolving with the PDF `Blob`.
     */
    const downloadInvoice = (orderId: string) => fetchAny(() => getOrderInvoice(orderId));

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
        hardDeleteOrder,
        downloadInvoice
    };
});
