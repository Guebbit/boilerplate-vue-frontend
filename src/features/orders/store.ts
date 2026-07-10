import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import {
    listOrders,
    getOrderById,
    createOrder as apiCreateOrder,
    updateOrderById,
    deleteOrderById,
    checkout as apiCheckout
} from '@/utils/api.ts';
import httpClient from '@/utils/http.ts';
import { useObservabilityStore, analyticsEvents } from '@/stores/observability';
import type {
    Order,
    CreateOrderRequest,
    UpdateOrderByIdRequest,
    CheckoutRequest,
    CheckoutResponse,
    SearchOrdersRequest
} from '@types';

export const useOrdersStore = defineStore('orders', () => {
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
        fetchAll(() => listOrders().then((response) => response.data.items), {
            forced
        });

    /**
     * @param page
     * @param pageSize
     * @param forced
     */
    const fetchPaginationOrders = (page = 1, pageSize = 10, forced = false) =>
        fetchAny(() => listOrders({ page, pageSize }).then((response) => response.data.items), {
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
                listOrders({
                    page,
                    pageSize: pageSizeValue,
                    id: filters.id,
                    userId: filters.userId,
                    productId: filters.productId,
                    email: filters.email
                }).then((response) => response.data.items),
            filters,
            page,
            pageSizeValue,
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
        fetchTarget(() => getOrderById(orderId).then((response) => response.data), orderId, {
            forced
        });

    /**
     * Create a new order directly (admin)
     *
     * @param orderData
     */
    const createOrder = (orderData: CreateOrderRequest) =>
        createTarget(() => apiCreateOrder(orderData).then((response) => response.data));

    /**
     * Update an existing order by ID
     *
     * @param orderId
     * @param orderData
     */
    const updateOrder = (orderId: string, orderData: UpdateOrderByIdRequest) =>
        updateTarget(
            () => updateOrderById(orderId, orderData).then((response) => response.data),
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
            apiCheckout(checkoutData).then((response) => {
                const obs = useObservabilityStore();
                obs.track(analyticsEvents.CHECKOUT_COMPLETED, {
                    order_id: response.data?.order?.id,
                    total: response.data?.order?.total
                });
                return response.data;
            })
        );

    /**
     * Delete an order by ID
     *
     * @param orderId
     */
    const deleteOrder = (orderId: string) => deleteTarget(() => deleteOrderById(orderId), orderId);

    /**
     * Download order invoice (PDF binary)
     *
     * @param orderId
     */
    const getOrderInvoice = (orderId: string) =>
        fetchAny(() =>
            httpClient.get(`/orders/${encodeURIComponent(orderId)}/invoice`, {
                responseType: 'blob'
            })
        );

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
        getOrderInvoice
    };
});
