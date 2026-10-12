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
    getFulfillmentByOrder,
    startFulfilment,
    shipFulfillmentOrder,
    fulfillFulfillmentOrder,
    holdFulfillmentOrder,
    confirmFulfillmentOrderWait,
    releaseFulfillmentOrder,
    updateShipment,
    deliverShipment,
    listPreorderFulfillmentOrders,
    summarizePreorderFulfillmentOrders
} from '@api';
import type {
    FulfillmentOrder,
    HoldFulfillmentOrderRequest,
    ListPreorderFulfillmentOrdersParams,
    PreorderFulfillmentOrder,
    PreorderProductSummary,
    ShippingMethod,
    Shipment,
    ShipFulfillmentOrderRequest
} from '@types';

/**
 * The largest page the contract allows, for the read that wants every row of a short list.
 */
const MAX_PAGE_SIZE = 100;

/**
 * Shipping — the methods a checkout can choose, and the fulfillment orders and shipments an order
 * ends up with.
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
     * Every country this deployment ships a physical order to (`NODE_SHIP_TO_COUNTRIES`) —
     * checkout's own real enforcement; this is only what narrows the address form's country
     * choices so a shopper never picks one it would refuse.
     */
    const shipToCountries = ref<string[]>([]);

    /**
     * The fulfillment orders of the order last read — the groups of lines that leave together.
     */
    const fulfillmentOrders = ref<FulfillmentOrder[]>([]);

    /**
     * The shipments of the order last read — what actually left, each with its own tracking code.
     */
    const shipments = ref<Shipment[]>([]);

    /**
     * One page of the preorder board's second tab: fulfillment orders made from preorder lines,
     * each with its buyer. Staff holding `orders.any.read` see every row, anyone else their own.
     */
    const preorderBoard = ref<PreorderFulfillmentOrder[]>([]);

    /**
     * How many rows match the board's last filters, across every page.
     */
    const preorderBoardTotal = ref(0);

    /**
     * Every product's preorder units by state, for the board's first tab. Whole-list: it is one row
     * per product that was ever sold as a preorder, which is short.
     */
    const preorderSummaries = ref<PreorderProductSummary[]>([]);

    /**
     * Loads a page of the preorder board's fulfillment orders.
     *
     * @param query - Page, size and the filters: `state`, `productId`, `late` (the Late view) and
     *  `dueWithin` (the Due-soon warning). `preorder=true` is always added: the board is about
     *  preorders, whatever the endpoint could also list.
     * @returns A promise resolving with the page's rows.
     */
    const fetchPreorderBoard = (query: ListPreorderFulfillmentOrdersParams = {}) =>
        fetchAny(() =>
            listPreorderFulfillmentOrders({ ...query, preorder: true }).then((response) => {
                preorderBoard.value = response.data.items;
                preorderBoardTotal.value = response.data.meta.totalItems;
                return preorderBoard.value;
            })
        );

    /**
     * Loads every product's preorder summary, page after page until the last.
     *
     * @returns A promise resolving with every summary.
     */
    const fetchPreorderSummaries = () =>
        fetchAny(() => {
            const collect = (
                page: number,
                soFar: PreorderProductSummary[]
            ): Promise<PreorderProductSummary[]> =>
                summarizePreorderFulfillmentOrders({ page, pageSize: MAX_PAGE_SIZE }).then(
                    (response) => {
                        const items = [...soFar, ...response.data.items];
                        return page < response.data.meta.totalPages
                            ? collect(page + 1, items)
                            : items;
                    }
                );
            return collect(1, []).then((items) => {
                preorderSummaries.value = items;
                return items;
            });
        });

    /**
     * Loads the methods, unfiltered — `PUT /cart/shipping-method` and checkout are what check a
     * method against the caller's real basket, server-side.
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
     * Reads an order's fulfilment into state, with no loading flag of its own: every write below
     * ends with it, inside the write's own wrapper.
     *
     * @param orderId - The order in question.
     * @returns A promise resolving once both lists are replaced.
     */
    const readFulfillment = (orderId: string) =>
        getFulfillmentByOrder(orderId).then((response) => {
            fulfillmentOrders.value = response.data.fulfillmentOrders;
            shipments.value = response.data.shipments;
        });

    /**
     * Loads an order's fulfillment orders and shipments. Both come back empty until the order is
     * paid — absence is an answer, never a 404.
     *
     * @param orderId - The order in question.
     * @returns A promise resolving once state holds that order's fulfilment.
     */
    const fetchFulfillmentForOrder = (orderId: string) => fetchAny(() => readFulfillment(orderId));

    /**
     * Reports that fulfilment has started on a paid order (admin): the order moves
     * `paid → processing`. No result stored here — this module owns the fulfilment, not the order
     * — the caller re-reads the order.
     *
     * @param orderId - The order to start fulfilling.
     * @returns A promise resolving once the move lands.
     */
    const start = (orderId: string) =>
        fetchAny(() => startFulfilment(orderId).then(() => undefined));

    /**
     * Cuts a shipment from a fulfillment order (admin). The order moves to `shipped` only when
     * nothing remains anywhere; otherwise it is `partially_fulfilled`.
     *
     * @param fulfillmentOrderId - The fulfillment order shipping.
     * @param input - `lines` (absent = everything remaining), `trackingCode`, and `forced` +
     *  `reason` for an `orders.any.override` holder skipping the `start` step.
     * @returns A promise resolving with the new shipment, after the lists are re-read.
     */
    const ship = (fulfillmentOrderId: string, input: ShipFulfillmentOrderRequest = {}) =>
        fetchAny(() =>
            shipFulfillmentOrder(fulfillmentOrderId, input).then((response) =>
                readFulfillment(response.data.orderId).then(() => response.data)
            )
        );

    /**
     * Fulfils a `digital` fulfillment order (admin): no parcel, the shipment is born delivered.
     *
     * @param fulfillmentOrderId - The digital fulfillment order.
     * @returns A promise resolving with the shipment, after the lists are re-read.
     */
    const fulfill = (fulfillmentOrderId: string) =>
        fetchAny(() =>
            fulfillFulfillmentOrder(fulfillmentOrderId).then((response) =>
                readFulfillment(response.data.orderId).then(() => response.data)
            )
        );

    /**
     * Holds a fulfillment order back (admin). `awaiting_stock` is never staff's to give.
     *
     * @param fulfillmentOrderId - The fulfillment order to hold.
     * @param input - Why (`incorrect_address`, `high_risk`, `other`) and an optional staff note.
     * @returns A promise resolving with the held fulfillment order, after the lists are re-read.
     */
    const hold = (fulfillmentOrderId: string, input: HoldFulfillmentOrderRequest) =>
        fetchAny(() =>
            holdFulfillmentOrder(fulfillmentOrderId, input).then((response) =>
                readFulfillment(response.data.orderId).then(() => response.data)
            )
        );

    /**
     * Lifts a staff hold (admin). The server refuses `awaiting_stock`: the stock's own arrival
     * releases that one.
     *
     * @param fulfillmentOrderId - The fulfillment order to release.
     * @returns A promise resolving with the released fulfillment order, after the re-read.
     */
    const release = (fulfillmentOrderId: string) =>
        fetchAny(() =>
            releaseFulfillmentOrder(fulfillmentOrderId).then((response) =>
                readFulfillment(response.data.orderId).then(() => response.data)
            )
        );

    /**
     * The buyer's answer to a late preorder: yes, keep waiting. It clears the deadline after
     * which silence would cancel and refund, so only the order's own buyer may send it, and only
     * while `actions.confirmWait` says the server would accept it.
     *
     * @param fulfillmentOrderId - The fulfillment order the buyer is still waiting for.
     * @returns A promise resolving with the fulfillment order (`consent` now `confirmed`), after
     *  the lists are re-read.
     */
    const confirmWait = (fulfillmentOrderId: string) =>
        fetchAny(() =>
            confirmFulfillmentOrderWait(fulfillmentOrderId).then((response) =>
                readFulfillment(response.data.orderId).then(() => response.data)
            )
        );

    /**
     * Records one shipment's arrival (admin). The order moves to `delivered` only once every
     * shipment has arrived and nothing remains.
     *
     * @param shipmentId - The shipment that arrived.
     * @param forced - Records it without a carrier confirmation, for an `orders.any.override`
     *  holder; `reason` is then required by the API.
     * @param reason - Why the normal door didn't apply. Required exactly when `forced` is `true`.
     * @returns A promise resolving with the shipment, after the lists are re-read.
     */
    const deliver = (shipmentId: string, forced?: boolean, reason?: string) =>
        fetchAny(() =>
            deliverShipment(shipmentId, forced ? { forced, reason } : {}).then((response) =>
                readFulfillment(response.data.orderId).then(() => response.data)
            )
        );

    /**
     * Corrects a shipment's tracking code (admin), while it is still `shipped`.
     *
     * @param shipmentId - The shipment to correct.
     * @param trackingCode - The corrected code.
     * @returns A promise resolving with the shipment, after the lists are re-read.
     */
    const editTracking = (shipmentId: string, trackingCode: string) =>
        fetchAny(() =>
            updateShipment(shipmentId, { trackingCode }).then((response) =>
                readFulfillment(response.data.orderId).then(() => response.data)
            )
        );

    return {
        loading,
        methods,
        shipToCountries,
        fulfillmentOrders,
        shipments,
        preorderBoard,
        preorderBoardTotal,
        preorderSummaries,
        fetchPreorderBoard,
        fetchPreorderSummaries,
        fetchMethods,
        fetchFulfillmentForOrder,
        start,
        ship,
        fulfill,
        hold,
        release,
        confirmWait,
        deliver,
        editTracking
    };
});
