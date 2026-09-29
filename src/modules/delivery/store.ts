/**
 * @module
 * Pinia setup store built on the toolkit's useCoreStore/useStructureRestApi: refs hold the
 * fetched state, and each action wraps one API call through `fetchAny` for shared loading
 * tracking.
 */

import { ref } from 'vue';
import { defineStore } from 'pinia';
import { useStructureRestApi } from '@guebbit/vue-toolkit';
import { queryClient } from '@/infrastructure/query-client.ts';
import {
    listShippingMethods,
    getShipmentByOrder,
    startFulfilment,
    shipOrder,
    deliverOrder,
    fulfillOrder
} from '@api';
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
     * Toolkit REST wrapper: `loading` is this store's flag, `fetchAny` wraps every call below.
     */
    const { loading, fetchAny } = useStructureRestApi<Shipment, string>({
        resourceKey: 'delivery',
        queryClient
    });

    /**
     * What the shop offers, flat rates and free-above thresholds.
     */
    const methods = ref<ShippingMethod[]>([]);

    /**
     * Every country this deployment ships a physical order to (`NODE_SHIP_TO_COUNTRIES`, E12) —
     * checkout's own real enforcement; this is only what narrows the address form's country
     * choices so a shopper never picks one it would refuse.
     */
    const shipToCountries = ref<string[]>([]);

    /**
     * The current order's parcel, or undefined while nothing has shipped.
     */
    const shipment = ref<Shipment | undefined>();

    /**
     * Loads the full shipping methods list, unfiltered — `PUT /cart/shipping-method` and checkout
     * are what check a method against the caller's real basket, server-side.
     *
     * @returns A promise resolving with the methods.
     */
    const fetchMethods = () =>
        fetchAny(() =>
            listShippingMethods().then((response) => {
                methods.value = response.data.methods;
                shipToCountries.value = response.data.shipToCountries;
                return methods.value;
            })
        );

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
     * Reports that fulfilment has started on a paid order (admin): the order moves
     * `paid → processing`, before any parcel exists. No result stored here — this module owns
     * the shipment, not the order — the caller re-reads the order the same way it already does
     * after {@link ship}/{@link deliver}.
     *
     * @param orderId - The order to start fulfilling.
     * @returns A promise resolving once the move lands.
     */
    const start = (orderId: string) =>
        fetchAny(() => startFulfilment(orderId).then(() => undefined));

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

    /**
     * Marks a digital-only order fulfilled (admin): the order moves `processing → delivered`
     * directly, with no parcel record. The `ship`/`deliver` alternative for an order with nothing
     * to ship. No result stored here, for the same reason {@link start} stores none — this module
     * owns the shipment, not the order.
     *
     * @param orderId - The digital-only order to mark fulfilled.
     * @returns A promise resolving once the move lands.
     */
    const fulfill = (orderId: string) =>
        fetchAny(() => fulfillOrder(orderId).then(() => undefined));

    return {
        loading,
        methods,
        shipToCountries,
        shipment,
        fetchMethods,
        fetchShipmentForOrder,
        start,
        ship,
        deliver,
        fulfill
    };
});
