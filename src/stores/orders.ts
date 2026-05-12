import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import { useI18n } from 'vue-i18n';
import { z } from 'zod';
import { OrdersService } from '@/utils/api.ts';
import httpClient from '@/utils/http.ts';
import type {
    Order,
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
        fetchAll(() => OrdersService.listOrders().then((response) => response.items), { forced });

    /**
     * @param page
     * @param pageSize
     * @param forced
     */
    const fetchPaginationOrders = (page = 1, pageSize = 10, forced = false) =>
        fetchAny(() => OrdersService.listOrders(page, pageSize).then((response) => response.items), {
            forced
        });

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
    const fetchSearchOrders = (
        filters: IOrdersFilters = {},
        page = 1,
        pageSizeValue = 10,
        forced = false
    ) => {
        pageSize.value = pageSizeValue;
        return fetchSearch(
            () =>
                OrdersService
                    .listOrders(
                        page,
                        pageSizeValue,
                        filters.id,
                        filters.userId,
                        filters.productId,
                        filters.email
                    )
                    .then((response) => response.items),
            filters,
            page,
            { forced }
        );
    };

    /**
     * Fetch a single order by ID
     *
     * @param orderId
     * @param forced
     */
    const fetchOrder = (orderId: string, forced = false) =>
        fetchTarget(
            () => OrdersService.getOrderById(orderId).then((data) => data),
            orderId,
            { forced }
        );

    /**
     * Create a new order directly (admin)
     *
     * @param orderData
     */
    const createOrder = (orderData: CreateOrderRequest) =>
        createTarget(() => OrdersService.createOrder(orderData).then((data) => data));

    /**
     * Update an existing order by ID
     *
     * @param orderId
     * @param orderData
     */
    const updateOrder = (orderId: string, orderData: UpdateOrderByIdRequest) =>
        updateTarget(
            () => OrdersService.updateOrderById(orderId, orderData).then((data) => data),
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
            OrdersService.checkout(checkoutData).then((data) => data as CheckoutResponse)
        );

    /**
     * Delete an order by ID
     *
     * @param orderId
     */
    const deleteOrder = (orderId: string) =>
        deleteTarget(() => OrdersService.deleteOrderById(orderId), orderId);

    /**
     * Download order invoice (PDF binary)
     *
     * @param orderId
     */
    const getOrderInvoice = (orderId: string) =>
        fetchAny(() => httpClient.get(`/orders/${encodeURIComponent(orderId)}/invoice`, { responseType: 'blob' }));

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
