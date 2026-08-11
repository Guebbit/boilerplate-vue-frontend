import { defineStore } from 'pinia';
import { useCoreStore, useStructureCrudApi } from '@guebbit/vue-toolkit';
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
import { useObservabilityStore, analyticsEvents } from '@/stores/observability';
import type {
    Order,
    CreateOrderRequest,
    UpdateOrderByIdRequest,
    CheckoutRequest,
    SearchOrdersRequest
} from '@types';

/**
 * Search criteria for the orders list, i.e. everything but pagination (which is
 * owned by the toolkit's search state).
 */
type IOrdersFilters = Omit<SearchOrdersRequest, 'page' | 'pageSize'>;

/**
 * Orders CRUD, paginated search, checkout and invoices.
 *
 * The CRUD half is declared; checkout and the invoice download are written against the toolkit
 * primitives below, because neither is CRUD — checkout turns a cart into an order and answers with
 * its own envelope, and an invoice is a Blob, not a record.
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
        IOrdersFilters,
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
     * Converts the authenticated user's current cart into a new order.
     *
     * @param checkoutData - Optional checkout payload (address, notes, ...).
     * @returns A promise resolving with the checkout response, including the
     *  created order. Also emits a `checkout_completed` analytics event.
     */
    const checkout = (checkoutData?: CheckoutRequest) =>
        fetchAny(() =>
            apiCheckout(checkoutData).then((response) => {
                const obs = useObservabilityStore();
                obs.track(analyticsEvents.CHECKOUT_COMPLETED, {
                    order_id: response.data?.order?.id,
                    total_price: response.data?.order?.totalPrice
                });
                return response.data;
            })
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
        hardDeleteOrder,
        checkout,
        downloadInvoice
    };
});
