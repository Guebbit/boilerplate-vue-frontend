import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import { useI18n } from 'vue-i18n';
import { z } from 'zod';
import { ordersApi } from '@/utils/api.ts';
import type {
    Order,
    OrdersResponse,
    CreateOrderRequest,
    UpdateOrderByIdRequest,
    CheckoutRequest,
    CheckoutResponse,
    SearchOrdersRequest
} from '@types';

export const useOrdersStore = defineStore('orders', () => {
    const { t } = useI18n();
    const { getLoading, setLoading } = useCoreStore();
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
        fetchSearch,
        fetchAll,
        fetchTarget,
        fetchAny,
        createTarget,
        updateTarget,
        deleteTarget
    } = useStructureRestApi<Order, string>({ getLoading, setLoading });

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
    const fetchPaginationOrders = (page = 1, pageSize = 10, forced = false) =>
        fetchAny(
            () =>
                ordersApi.listOrders(page, pageSize).then(({ data }) => {
                    const response = data as OrdersResponse;
                    addRecords(response.items ?? []);
                    return response;
                }),
            { forced, lastUpdateKey: `orders_page_${page}_${pageSize}` }
        );

    type IOrdersFilters = Omit<SearchOrdersRequest, 'page' | 'pageSize'>;

    /**
     * @param filters
     * @param page
     * @param pageSize
     * @param forced
     */
    /**
     * Fetches a filtered, paginated order list via GET /orders.
     * Filters are passed as query parameters; SearchOrdersRequest is still
     * used as the filter shape so callers stay type-safe.
     */
    const fetchSearchOrders = (filters: IOrdersFilters = {}, page = 1, pageSize = 10, forced = false) =>
        fetchSearch(
            () =>
                ordersApi
                    .listOrders(page, pageSize, filters.id, filters.userId, filters.productId, filters.email)
                    .then(({ data }) => {
                        const d = data as { items?: Order[]; meta?: { totalItems?: number }; total?: number };
                        return [d.items ?? [], d.meta?.totalItems ?? d.total ?? 0] as [Order[], number];
                    }),
            filters,
            page,
            pageSize,
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
            () => ordersApi.updateOrderById(orderId, orderData).then(({ data }) => data as Order),
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
            ordersApi.checkout(checkoutData).then(({ data }) => data as CheckoutResponse)
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
        fetchAny(() => ordersApi.getOrderInvoice(orderId, { responseType: 'blob' }));

    /**
     * Zod schema for order status
     */
    const zodSchemaOrderStatus = z.enum(
        ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'],
        {
            message: t('orders-form.status-invalid')
        }
    );

    /**
     * Order schema
     */
    const zodSchemaOrder = z.object({
        id: z.string().nullish(),
        userId: z.string().nullish(),
        email: z.email(t('orders-form.email-invalid')).nullish(),
        status: zodSchemaOrderStatus.nullish(),
        total: z.number().nullish(),
        notes: z.string().nullish(),
        createdAt: z.string().nullish(),
        updatedAt: z.string().nullish()
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
        fetchSearchOrders,
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
