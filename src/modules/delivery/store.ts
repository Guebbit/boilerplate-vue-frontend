/**
 * @module
 * Pinia setup store built on the toolkit's useCoreStore/useStructureRestApi: refs hold the
 * fetched state, and each action wraps one API call through `fetchAny` for shared loading
 * tracking.
 */

import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import { listShippingMethods, getShipmentByOrder, shipOrder, deliverOrder } from '@api';
import type { ShippingMethod, Shipment } from '@types';
import { rethrowUnlessAbsent } from '@/infrastructure/utils/errors';

/**
 * Shipping — the methods a checkout can choose and the parcel an order ends up with.
 *
 * The methods list is quoted, not authoritative: the checkout re-prices the chosen method
 * server-side against the lines actually bought, so this store's numbers can inform a choice
 * but never commit the shop.
 */
export const useDeliveryStore = defineStore('delivery', () => {
    /**
     * The app-wide loading-flag accessor pair, threaded into `fetchAny` below.
     */
    const { getLoading, setLoading } = useCoreStore();

    /**
     * Toolkit REST wrapper: `loading` is this store's flag, `fetchAny` wraps every call below.
     */
    const { loading, fetchAny } = useStructureRestApi<Shipment, string>({
        loadingKey: 'delivery',
        getLoading,
        setLoading
    });

    /**
     * What the shop offers, flat rates and free-above thresholds.
     */
    const methods = ref<ShippingMethod[]>([]);

    /**
     * The current order's parcel, or undefined while nothing has shipped.
     */
    const shipment = ref<Shipment | undefined>();

    /**
     * Loads the shipping methods.
     *
     * @param weight - The basket's total weight in grams, when known — filters out methods that
     *  cannot carry it. Omitted lists every method regardless of weight range, the same as the
     *  API's own default.
     * @returns A promise resolving with the methods.
     */
    const fetchMethods = (weight?: number) =>
        fetchAny(() =>
            listShippingMethods(weight === undefined ? undefined : { weight }).then((response) => {
                methods.value = response.data.methods;
                return methods.value;
            })
        );

    /**
     * What a method costs against a given items total — the same free-above rule the BE prices
     * with, duplicated here only for DISPLAY (the checkout's number is the server's).
     *
     * @param method - The method in question.
     * @param itemsTotal - The cart's lines total.
     * @returns The effective price.
     */
    const effectivePrice = (method: ShippingMethod, itemsTotal: number) =>
        method.freeAbove !== undefined && itemsTotal >= method.freeAbove ? 0 : method.price;

    /**
     * Loads the parcel behind an order. A 404 is an answer — nothing shipped yet.
     *
     * @param orderId - The order in question.
     * @returns A promise resolving with the shipment, or undefined.
     */
    const fetchShipmentForOrder = (orderId: string) =>
        fetchAny(() =>
            getShipmentByOrder(orderId)
                .then((response) => {
                    shipment.value = response.data;
                    return shipment.value;
                })
                .catch((error: unknown) => {
                    // 404 only: anything else is a real failure, and swallowing it would say
                    // "nothing shipped yet" about an order that has a parcel in transit.
                    rethrowUnlessAbsent(error, 404);
                    shipment.value = undefined;
                    return undefined;
                })
        );

    /**
     * Record a parcel's handover to the carrier (admin): the order moves `processing → shipped`.
     *
     * @param orderId - The order being shipped.
     * @param trackingCode - Required when the order's shipping method is `tracked`.
     * @param forced - Bypasses the `processing`-only gate for an `orders.any.override` holder.
     *  `reason` is then required by the API.
     * @param reason - Why the normal door didn't apply. Required exactly when `forced` is `true`.
     * @returns A promise resolving with the shipment.
     */
    const ship = (orderId: string, trackingCode?: string, forced?: boolean, reason?: string) =>
        fetchAny(() =>
            shipOrder(orderId, {
                ...(trackingCode ? { trackingCode } : {}),
                ...(forced ? { forced, reason } : {})
            }).then((response) => {
                shipment.value = response.data;
                return shipment.value;
            })
        );

    /**
     * Record a parcel's arrival (admin): the order moves `shipped → delivered`.
     *
     * @param orderId - The order that arrived.
     * @param forced - Bypasses the `shipped`-only gate for an `orders.any.override` holder.
     *  `reason` is then required by the API.
     * @param reason - Why the normal door didn't apply. Required exactly when `forced` is `true`.
     * @returns A promise resolving with the shipment.
     */
    const deliver = (orderId: string, forced?: boolean, reason?: string) =>
        fetchAny(() =>
            deliverOrder(orderId, forced ? { forced, reason } : {}).then((response) => {
                shipment.value = response.data;
                return shipment.value;
            })
        );

    return {
        loading,
        methods,
        shipment,
        fetchMethods,
        effectivePrice,
        fetchShipmentForOrder,
        ship,
        deliver
    };
});
