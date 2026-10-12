<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'ShipmentPanel'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Single-file component: `<script setup>` lists the order's fulfillment orders, each a card with
 * its own shipments, and the one order-level control left here — "Start fulfilment", offered
 * by the order's own `actions.start`. Every other control lives on the record it acts on and
 * comes from that record's own `actions`: this panel never derives a lifecycle rule. The
 * tracking-code requirement is the one fact read off `GET /delivery/methods` (published, not a rule).
 */

import { computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useDeliveryStore } from '../store.ts';
import { shipmentCount } from '../domain/ship-lines.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { OrderStatus } from '@/types/enums.ts';
import FulfillmentOrderCard from './FulfillmentOrderCard.vue';

/**
 * The order page's shipping corner: what is to leave, in how many goes, and what has.
 */
const { orderId, shippingMethodId, canStart, override } = defineProps<{
    /**
     * The order whose fulfilment this shows.
     */
    orderId: string;
    /**
     * The method frozen on the order at checkout — looked up against the methods list to know
     * whether a tracking code is required.
     */
    shippingMethodId?: string;
    /**
     * The order's own `actions.start` — whether `POST /delivery/order/{id}/start` would be
     * accepted right now. Who may start fulfilment (`delivery.any.start`) is a different key
     * than who may write a shipment, so it stays the order's flag.
     */
    canStart?: boolean;
    /**
     * The order's own `actions.override` — every status this caller's forced ship or arrival may
     * land on. Empty for anyone without `orders.any.override`.
     */
    override?: OrderStatus[];
}>();

/**
 * Emitted once this panel moves anything, so the owning page can reload the order.
 */
const emit = defineEmits<
    /**
     * The order's fulfilment moved — the parent should re-read the order.
     */
    (event: 'moved') => void
>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast notifications.
 */
const { addMessage } = useNotificationsStore();

/**
 * Delivery store, for the methods list and the lists this panel renders.
 */
const deliveryStore = useDeliveryStore();

/**
 * The store's lists, as last fetched for ANY order, the methods list and the in-flight flag.
 */
const {
    fulfillmentOrders: rawFulfillmentOrders,
    shipments: rawShipments,
    methods,
    loading
} = storeToRefs(deliveryStore);

/**
 * This order's fulfillment orders, discarding stale ones. The store's lists are shared: this
 * panel instance is reused across orders (no remount on a route param change alone, per
 * `Order.vue`'s `watchOrder`), and a slow response for the PREVIOUS order landing after `orderId`
 * moved on must not render as this order's.
 */
const fulfillmentOrders = computed(() =>
    rawFulfillmentOrders.value.filter((record) => record.orderId === orderId)
);

/**
 * This order's shipments, guarded the same way.
 */
const shipments = computed(() => rawShipments.value.filter((record) => record.orderId === orderId));

/**
 * "Arrives in N shipments", or 0 when there is nothing to say.
 */
const arrivesInCount = computed(() => {
    const count = shipmentCount(fulfillmentOrders.value, shipments.value);
    return count >= 2 ? count : 0;
});

/**
 * Whether the order's own shipping method needs a tracking code — `undefined` (methods not
 * loaded yet, or the order carries none) reads as "not required", matching the server's own
 * `method?.tracked` check.
 */
const trackingRequired = computed(
    () => methods.value.find((method) => method.id === shippingMethodId)?.tracked ?? false
);

/**
 * This panel's own blocked state — a refusal of "start fulfilment" shown in place rather than
 * joining a toast queue the operator may have looked away from.
 */
const {
    message: panelError,
    report: reportPanelError,
    clear: clearPanelError
} = useBlockingError();

/**
 * The shipments cut from one fulfillment order.
 *
 * @param fulfillmentOrderId - The fulfillment order's id.
 * @returns Its shipments, in the order the server sent them.
 */
const shipmentsOf = (fulfillmentOrderId: string) =>
    shipments.value.filter((record) => record.fulfillmentOrderId === fulfillmentOrderId);

/**
 * Reports that fulfilment has started, re-reads the fulfilment (every card's `actions` depend on
 * the order's status) and tells the page. Cards re-read through the store on their own moves.
 *
 * @returns A promise resolving once the panel has refreshed.
 */
const markStarted = () => {
    clearPanelError();
    return deliveryStore
        .start(orderId)
        .then(() => deliveryStore.fetchFulfillmentForOrder(orderId))
        .then(() => {
            addMessage(t('shipment-panel.started'));
            emit('moved');
        })
        .catch((error: unknown) => reportPanelError(error));
};

/**
 * The methods list is order-independent, so it loads once, at setup.
 */
void deliveryStore.fetchMethods();

/**
 * Fetches the fulfilment on mount AND whenever `orderId` changes — `immediate: true` covers the
 * mount case, the watch covers navigating to a different order without a remount.
 */
watch(
    () => orderId,
    (newOrderId) => void deliveryStore.fetchFulfillmentForOrder(newOrderId),
    { immediate: true }
);
</script>

<template>
    <v-card class="p-4" data-test="shipment-panel">
        <h3 class="mb-2 text-base font-semibold">{{ t('shipment-panel.title') }}</h3>

        <InlineErrorAlert :message="panelError" class="mb-3" data-test="shipment-panel-error" />

        <p v-if="arrivesInCount" class="m-0 mb-2 text-sm" data-test="shipment-count">
            {{ t('shipment-panel.arrives-in', { count: arrivesInCount }) }}
        </p>

        <div v-if="fulfillmentOrders.length > 0" class="flex flex-col gap-3">
            <FulfillmentOrderCard
                v-for="fulfillmentOrder in fulfillmentOrders"
                :key="'fulfillment-order-' + fulfillmentOrder.id"
                :fulfillment-order="fulfillmentOrder"
                :shipments="shipmentsOf(fulfillmentOrder.id)"
                :tracking-required="trackingRequired"
                :override="override"
                @moved="emit('moved')"
            />
        </div>
        <p v-else class="m-0 opacity-75" data-test="shipment-panel-empty">
            {{ t('shipment-panel.not-shipped-yet') }}
        </p>

        <v-btn
            v-if="canStart"
            class="mt-3"
            color="primary"
            variant="tonal"
            size="small"
            data-test="mark-started"
            :disabled="loading"
            @click="markStarted"
        >
            {{ t('shipment-panel.button-start') }}
        </v-btn>
    </v-card>
</template>
