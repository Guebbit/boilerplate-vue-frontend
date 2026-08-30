/**
 * @module
 * Pinia setup store built on the toolkit's useCoreStore/useStructureRestApi: refs hold the
 * fetched state, and each action wraps one API call through `fetchAny` for shared loading
 * tracking.
 */

import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useCoreStore, useStructureRestApi } from '@guebbit/vue-toolkit';
import { listShippingMethods, getShipmentByOrder, advanceCourier } from '@api';
import type { ShippingMethod, Shipment } from '@types';
import { absentIs } from '@/infrastructure/utils/errors';

/**
 * Shipping — the methods a checkout can choose and the parcel an order ends up with.
 *
 * The methods list is quoted, not authoritative: the checkout re-prices the chosen method
 * server-side against the lines actually bought, so this store's numbers can inform a choice
 * but never commit the shop.
 */
export const useDeliveryStore = defineStore('delivery', () => {
    const { getLoading, setLoading } = useCoreStore();
    const { loading, fetchAny } = useStructureRestApi<Shipment, string>({
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
     * @returns A promise resolving with the methods.
     */
    const fetchMethods = () =>
        fetchAny(() =>
            listShippingMethods().then((response) => {
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
                    if (!absentIs(error, 404)) throw error;
                    shipment.value = undefined;
                    return undefined;
                })
        );

    /**
     * The fake courier's tick (admin): every shipped parcel arrives.
     *
     * @returns A promise resolving with how many did.
     */
    const advance = () =>
        fetchAny(() => advanceCourier().then((response) => response.data.advanced));

    return {
        loading,
        methods,
        shipment,
        fetchMethods,
        effectivePrice,
        fetchShipmentForOrder,
        advance
    };
});
