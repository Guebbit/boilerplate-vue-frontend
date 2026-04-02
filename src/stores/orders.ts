import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import { useI18n } from 'vue-i18n';
import { z } from 'zod';
import { ordersApi } from '@/utils/api.ts';
import type { Order, CreateOrderRequest, UpdateOrderByIdRequest, CheckoutRequest, CheckoutResponse, OrdersResponse } from '@types';

export const useOrdersStore = defineStore('orders', () => {
    const { t } = useI18n();

    const {
        itemDictionary: orders,
        itemList: ordersList,
        getRecord: getOrder,
        addRecord: addOrder,
        addRecords,
        selectedIdentifier: selectedOrderId,
        selectedRecord: currentOrder,

        loading,
        pageCurrent,
        pageSize,
        pageTotal,
        pageItemList,
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
     * @param page
     * @param pageSize
     * @param forced
     */
    const fetchPaginationOrders = (page = 1, pageSize = 9, forced = false) =>
        fetchAny(
            () =>
                ordersApi.listOrders(undefined, page, pageSize).then(({ data }) => {
                    const response = data as OrdersResponse;
                    addRecords(response.items ?? []);
                    return response;
                }),
            { forced, lastUpdateKey: `orders_page_${page}_${pageSize}` }
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

    /**
     * Download order invoice (PDF binary)
     *
     * @param orderId
     */
    const getOrderInvoice = (orderId: string) =>
        fetchAny(() =>
            ordersApi.getOrderInvoice(orderId, { responseType: 'blob' })
        );

    /**
     * Zod schema for order status
     */
    const zodSchemaOrderStatus = z.enum(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'], {
        message: t('orders-form.status-invalid')
    });

    /**
     * Order schema
     */
    const zodSchemaOrder = z.object({
        id: z.string().nullish().optional(),
        userId: z.string().nullish().optional(),
        email: z.email(t('users-form.email-invalid')).nullish().optional(),
        status: zodSchemaOrderStatus.nullish().optional(),
        total: z.number().nullish().optional(),
        notes: z.string().nullish().optional(),
        createdAt: z.string().nullish().optional(),
        updatedAt: z.string().nullish().optional()
    });

    return {
        orders,
        ordersList,
        getOrder,
        addOrder,
        selectedOrderId,
        currentOrder,

        loading,
        pageCurrent,
        pageSize,
        pageTotal,
        pageItemList,
        fetchOrders,
        fetchPaginationOrders,
        fetchOrder,
        createOrder,
        updateOrder,
        checkout,
        deleteOrder,
        getOrderInvoice,

        zodSchemaOrderStatus,
        zodSchemaOrder
    };
});
