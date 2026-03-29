import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import { ordersApi } from '@/utils/api.ts';
import type { Order, CreateOrderRequest } from '@/api';

export const useOrdersStore = defineStore('orders', () => {
    const {
        itemDictionary: orders,
        itemList: ordersList,
        selectedIdentifier: selectedOrderId,
        selectedRecord: currentOrder,

        loading,
        fetchAll,
        fetchTarget,
        createTarget,
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
        deleteOrder
    };
});
