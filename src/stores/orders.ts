import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import { ordersApi } from '@/utils/api.ts';
import type { Order, CreateOrderRequest, UpdateOrderByIdRequest, CheckoutRequest, CheckoutResponse } from '../../api';

export const useOrdersStore = defineStore('orders', () => {
    const {
        itemDictionary: orders,
        itemList: ordersList,
        selectedIdentifier: selectedOrderId,
        selectedRecord: currentOrder,

        loading,
        fetchAll,
        fetchTarget,
        fetchAny,
        createTarget,
        updateTarget,
        deleteTarget
    } = useStructureRestApi<Order, string>();

    /**
     * Fetch all orders for the authenticated user
     *
     * @param forced
     */
    const fetchOrders = (forced = false) =>
        fetchAll(
            () =>
                ordersApi
                    .listOrders()
                    .then(({ data }) => (data as { items?: Order[] })?.items ?? []),
            { forced }
        );

    /**
     * Fetch a single order by ID
     *
     * @param orderId
     * @param forced
     */
    const fetchOrder = (orderId: string, forced = false) =>
        fetchTarget(
            () => ordersApi.getOrderById(orderId).then(({ data }) => data as Order),
            orderId,
            { forced }
        );

    /**
     * Create a new order directly (admin)
     *
     * @param orderData
     */
    const createOrder = (orderData: CreateOrderRequest) =>
        createTarget(() => ordersApi.createOrder(orderData).then(({ data }) => data as Order));

    /**
     * Update an existing order by ID
     *
     * @param orderId
     * @param orderData
     */
    const updateOrder = (orderId: string, orderData: UpdateOrderByIdRequest) =>
        updateTarget(
            () =>
                ordersApi
                    .updateOrderById(orderId, orderData)
                    .then(({ data }) => data as Order),
            orderData as Partial<Order>,
            orderId
        );

    /**
     * Convert the authenticated user's current cart into a new order
     *
     * @param checkoutData
     */
    const checkout = (checkoutData?: CheckoutRequest) =>
        fetchAny(() =>
            ordersApi
                .checkout(checkoutData)
                .then(({ data }) => data as CheckoutResponse)
        );

    /**
     * Delete an order by ID
     *
     * @param orderId
     */
    const deleteOrder = (orderId: string) =>
        deleteTarget(() => ordersApi.deleteOrderById(orderId), orderId);

    return {
        orders,
        ordersList,
        selectedOrderId,
        currentOrder,

        loading,
        fetchOrders,
        fetchOrder,
        createOrder,
        updateOrder,
        checkout,
        deleteOrder
    };
});
