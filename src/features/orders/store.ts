import { defineStore } from 'pinia';
import { useCoreStore, useStructureSearchApi } from '@guebbit/vue-toolkit';
import { ref, type WatchSource } from 'vue';
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

type IOrdersFilters = Omit<SearchOrdersRequest, 'page' | 'pageSize'>;

export const useOrdersStore = defineStore('orders', () => {
    const { getLoading, setLoading } = useCoreStore();

    /**
     * Current search filters. Owned by the store so `useStructureSearchApi`'s
     * search-scoped `pageItemList` and `watchSearch` stay bound to the same
     * source the list view mutates.
     */
    const filters = ref<IOrdersFilters>({});

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
        watchSearch,
        fetchAll,
        fetchTarget,
        watchTarget,
        fetchAny,
        createTarget,
        updateTarget,
        deleteTarget
    } = useStructureSearchApi<Order, string, string | number, IOrdersFilters>(() => filters.value, {
        getLoading,
        setLoading
    });

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

    /**
     * Reactive filtered order search via GET /orders, built on the toolkit's
     * `watchSearch`: fetches the current page immediately and re-fetches whenever
     * `pageCurrent`/`pageSize` change. Filters are read from the store's `filters`
     * on each run — mutate `filters` then call the returned `search()` to apply them.
     *
     * @param onError - notified on a failed search (immediate load, page change, or search())
     */
    const watchSearchOrders = (onError?: (error: unknown) => void) =>
        watchSearch(
            (currentFilters, page, pageSizeValue) =>
                listOrders({
                    page,
                    pageSize: pageSizeValue,
                    id: currentFilters.id,
                    userId: currentFilters.userId,
                    productId: currentFilters.productId,
                    email: currentFilters.email
                }).then((response) => response.data.items),
            { onError: (error) => onError?.(error) }
        );

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
     * Reactive counterpart of fetchOrder: selects and (re)fetches the order
     * whenever idSource changes, including once immediately on setup.
     *
     * @param idSource
     */
    const watchOrder = (idSource: WatchSource<string | undefined | null>) =>
        watchTarget(idSource, (orderId) => getOrderById(orderId).then((response) => response.data));

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
        checkout,
        deleteOrder,
        getOrderInvoice
    };
});
