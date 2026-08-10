import { defineStore } from 'pinia';
import { useCoreStore, useStructureSearchApi } from '@guebbit/vue-toolkit';
import { ref, type WatchSource } from 'vue';
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
    CheckoutResponse,
    SearchOrdersRequest
} from '@types';

/**
 * Search criteria for the orders list, i.e. everything but pagination (which is
 * owned by the toolkit's search state).
 */
type IOrdersFilters = Omit<SearchOrdersRequest, 'page' | 'pageSize'>;

/**
 * Orders CRUD, paginated search and checkout, on top of the toolkit's
 * search-API structure.
 */
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
     * Fetches every order of the authenticated user into the store dictionary.
     *
     * @param forced - Bypass the cache and always hit the API.
     * @returns A promise resolving with the fetched orders.
     */
    const fetchOrders = (forced = false) =>
        fetchAll(() => listOrders().then((response) => response.data.items), {
            forced
        });

    /**
     * Fetches a single page of orders, without touching the shared search state.
     *
     * @param page - 1-based page number. Defaults to `1`.
     * @param pageSize - Items per page. Defaults to `10`.
     * @param forced - Bypass the cache and always hit the API.
     * @returns A promise resolving with that page's orders.
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
     * @param onError - Notified on a failed search (immediate load, page
     *  change, or an explicit `search()` call).
     * @returns The toolkit search handle, whose `search()` re-runs the query
     *  with the current {@link filters}.
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
     * Fetches a single order and selects it as the current one.
     *
     * @param orderId - Identifier of the order to load.
     * @param forced - Bypass the cache and always hit the API.
     * @returns A promise resolving with the order.
     */
    const fetchOrder = (orderId: string, forced = false) =>
        fetchTarget(() => getOrderById(orderId).then((response) => response.data), orderId, {
            forced
        });

    /**
     * Reactive counterpart of `fetchOrder`: selects and (re)fetches the order
     * whenever the id changes, including once immediately on setup.
     *
     * @param idSource - Watch source yielding the order id; nullish values
     *  clear the selection.
     * @returns The toolkit watch handle (stop function + state).
     */
    const watchOrder = (idSource: WatchSource<string | undefined | null>) =>
        watchTarget(idSource, (orderId) => getOrderById(orderId).then((response) => response.data));

    /**
     * Creates an order directly, bypassing the cart (admin only).
     *
     * @param orderData - Full order payload.
     * @returns A promise resolving with the created order.
     */
    const createOrder = (orderData: CreateOrderRequest) =>
        createTarget(() => apiCreateOrder(orderData).then((response) => response.data));

    /**
     * Updates an existing order.
     *
     * @param orderId - Identifier of the order to update.
     * @param orderData - Fields to change.
     * @returns A promise resolving with the updated order.
     */
    const updateOrder = (orderId: string, orderData: UpdateOrderByIdRequest) =>
        updateTarget(
            () => updateOrderById(orderId, orderData).then((response) => response.data),
            orderData as Partial<Order>,
            orderId
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
     * Deletes an order and drops it from the store.
     *
     * @param orderId - Identifier of the order to delete.
     * @returns A promise resolving once the order is deleted.
     */
    const deleteOrder = (orderId: string) => deleteTarget(() => deleteOrderById(orderId), orderId);
    /**
     * Permanently deletes an order, bypassing the soft delete.
     *
     * `deleteOrder` leaves the record in place with `deletedAt` set, which an admin can still see
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
        checkout,
        deleteOrder,
        hardDeleteOrder,
        downloadInvoice
    };
});
