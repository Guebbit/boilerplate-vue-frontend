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
 * Single-file component: `<script setup>` renders one of five states off the order's own
 * `actions` and shipment — not yet started, digital and awaiting fulfilment, not yet shippable,
 * ready to ship, or in transit/arrived. Every write control gates on the order's own `actions`
 * never a locally re-derived status or permission check — the tracking-code field is
 * the one exception, reading `tracked` live off `GET /delivery/methods` (a published fact, not a
 * lifecycle rule).
 */

import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useDeliveryStore } from '../store.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { OrderStatus } from '@/types/enums.ts';

/**
 * The order page's shipping corner: recording a handover and an arrival, one order at a time.
 */
const { orderId, shippingMethodId, canStart, canFulfill, canShip, canDeliver, override } =
    defineProps<{
        /**
         * The order whose parcel this shows.
         */
        orderId: string;
        /**
         * The method frozen on the order at checkout — looked up against the methods list to know
         * whether a tracking code is required.
         */
        shippingMethodId?: string;
        /**
         * The order's own `actions.start` — whether `POST /delivery/order/{id}/start` would be
         * accepted right now. The server's answer, not re-derived here: unlike ship/deliver's
         * `processing`/`shipped` gate, who may start fulfilment (`delivery.any.start`) is a different
         * key than who may write a shipment (`delivery.any.update`).
         */
        canStart?: boolean;
        /**
         * The order's own `actions.fulfill` — whether `POST /delivery/order/{id}/fulfill` would be
         * accepted right now. `true` only once a digital-only order is `processing`: it never gets a
         * parcel, so `ship`/`deliver` are never offered for it.
         */
        canFulfill?: boolean;
        /**
         * The order's own `actions.ship` — whether `POST /delivery/order/{id}/ship` would be
         * accepted right now through the ordinary door (no `forced` flag).
         */
        canShip?: boolean;
        /**
         * The order's own `actions.deliver` — whether `POST /delivery/order/{id}/deliver` would be
         * accepted right now through the ordinary door.
         */
        canDeliver?: boolean;
        /**
         * The order's own `actions.override` — every status this caller's forced ship/deliver may
         * currently land on. Empty for anyone without `orders.any.override`, or once the order has
         * left every overridable status — the one source this panel's force controls read from.
         */
        override?: OrderStatus[];
    }>();

/**
 * Emitted once this panel moves the parcel, so the owning page can reload the order.
 */
const emit = defineEmits<
    /**
     * The order's status moved — the parent should re-read it.
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
 * Delivery store, for the methods list and the two write actions.
 */
const deliveryStore = useDeliveryStore();

/**
 * The store's parcel, as last fetched for ANY order, plus the methods list and whether a ship or
 * deliver call is already in flight: both actions share this one flag, which is enough since the
 * two buttons are never offered at once. `shipment` below is the guarded read.
 */
const { shipment: rawShipment, methods, loading } = storeToRefs(deliveryStore);

/**
 * This panel's own parcel, discarding a stale or mismatched record. The store's `shipment` is one
 * shared ref: this page component reuses the same panel instance across orders (no remount on a
 * route param change alone, per `Order.vue`'s `watchOrder`), and a slow response for the PREVIOUS
 * order landing after `orderId` has already moved on must not render as this order's parcel.
 */
const shipment = computed(() =>
    rawShipment.value?.orderId === orderId ? rawShipment.value : undefined
);

/**
 * The tracking code field, cleared once submitted.
 */
const trackingCode = ref('');

/**
 * Whether the order's own shipping method needs a tracking code — `undefined` (methods not
 * loaded yet, or the order carries none) reads as "not required", matching the server's own
 * `method?.tracked` check.
 */
const trackingRequired = computed(
    () => methods.value.find((method) => method.id === shippingMethodId)?.tracked ?? false
);

/**
 * Whether an override holder may force this order to `shipped` right now — straight off the
 * order's own `actions.override`, never a locally mirrored sequence: the server already
 * excludes `cancelled` and any status the order has left behind.
 */
const canOverrideShip = computed(() => (override ?? []).includes(OrderStatus.shipped));

/**
 * Same as {@link canOverrideShip}, for the `delivered` destination.
 */
const canOverrideDeliver = computed(() => (override ?? []).includes(OrderStatus.delivered));

/**
 * Force toggle, visible only to an override holder. Bypasses the status gate on the next
 * ship/deliver call and requires `forceReason` to be filled in.
 */
const force = ref(false);

/**
 * Why the normal door didn't apply — required by the API exactly when `force` is checked, cleared
 * after every submit alongside it.
 */
const forceReason = ref('');

/**
 * This panel's own blocked state — a 422 (tracking required), a 409 (someone shipped it first) or
 * a step-up failure on either action, shown in place rather than joining a toast queue the
 * operator may have looked away from. One instance for both actions: ship and deliver are never
 * offered at once (see the template below), so there is never a case of one overwriting the
 * other's message.
 */
const {
    message: shipmentError,
    report: reportShipmentError,
    clear: clearShipmentError
} = useBlockingError();

/**
 * Reports that fulfilment has started, then re-reads the order.
 *
 * @returns A promise resolving once the panel has refreshed.
 */
const markStarted = () => {
    clearShipmentError();
    return deliveryStore
        .start(orderId)
        .then(() => {
            addMessage(t('shipment-panel.started'));
            emit('moved');
        })
        .catch((error: unknown) => reportShipmentError(error));
};

/**
 * Reports a digital-only order fulfilled, then re-reads the order. The `ship`/`deliver` pair's
 * digital-only alternative: no parcel record, no tracking code, straight to `delivered`.
 *
 * @returns A promise resolving once the panel has refreshed.
 */
const markFulfilled = () => {
    clearShipmentError();
    return deliveryStore
        .fulfill(orderId)
        .then(() => {
            addMessage(t('shipment-panel.fulfilled'));
            emit('moved');
        })
        .catch((error: unknown) => reportShipmentError(error));
};

/**
 * Records the handover, then re-reads the order.
 *
 * @returns A promise resolving once the panel has refreshed.
 */
const markShipped = () => {
    clearShipmentError();
    return deliveryStore
        .ship(orderId, trackingCode.value || undefined, force.value, forceReason.value || undefined)
        .then(() => {
            trackingCode.value = '';
            force.value = false;
            forceReason.value = '';
            addMessage(t('shipment-panel.shipped'));
            emit('moved');
        })
        .catch((error: unknown) => reportShipmentError(error));
};

/**
 * Records the arrival, then re-reads the order.
 *
 * @returns A promise resolving once the panel has refreshed.
 */
const markDelivered = () => {
    clearShipmentError();
    return deliveryStore
        .deliver(orderId, force.value, forceReason.value || undefined)
        .then(() => {
            force.value = false;
            forceReason.value = '';
            addMessage(t('shipment-panel.delivered'));
            emit('moved');
        })
        .catch((error: unknown) => reportShipmentError(error));
};

/**
 * The methods list is order-independent, so it loads once, at setup.
 */
void deliveryStore.fetchMethods();

/**
 * Fetches the shipment on mount AND whenever `orderId` changes — `immediate: true` covers the
 * mount case, the watch covers navigating to a different order without a remount.
 */
watch(
    () => orderId,
    (newOrderId) => void deliveryStore.fetchShipmentForOrder(newOrderId),
    { immediate: true }
);
</script>

<template>
    <v-card class="p-4" data-test="shipment-panel">
        <h3 class="mb-2 text-base font-semibold">{{ t('shipment-panel.title') }}</h3>

        <InlineErrorAlert :message="shipmentError" class="mb-3" data-test="shipment-panel-error" />

        <template v-if="!shipment && canStart">
            <p class="m-0 mb-2 text-sm opacity-75">{{ t('shipment-panel.not-started-yet') }}</p>
            <v-btn
                class="mt-1"
                color="primary"
                variant="tonal"
                size="small"
                data-test="mark-started"
                :disabled="loading"
                @click="markStarted"
            >
                {{ t('shipment-panel.button-start') }}
            </v-btn>
        </template>

        <template v-else-if="!shipment && canFulfill">
            <p class="m-0 mb-2 text-sm opacity-75">{{ t('shipment-panel.digital-only') }}</p>
            <v-btn
                class="mt-1"
                color="primary"
                variant="tonal"
                size="small"
                data-test="mark-fulfilled"
                :disabled="loading"
                @click="markFulfilled"
            >
                {{ t('shipment-panel.button-fulfill') }}
            </v-btn>
        </template>

        <template v-else-if="shipment">
            <div class="flex items-center gap-3">
                <v-chip
                    :color="shipment.status === 'delivered' ? 'success' : 'info'"
                    size="small"
                    data-test="shipment-status"
                >
                    {{ t(`shipment-panel.status-${shipment.status}`) }}
                </v-chip>
                <span v-if="shipment.trackingCode" class="text-sm" data-test="shipment-tracking">
                    {{ shipment.trackingCode }}
                </span>
            </div>
            <template v-if="canOverrideDeliver">
                <v-checkbox
                    v-model="force"
                    :label="t('shipment-panel.label-force')"
                    density="compact"
                    hide-details
                    data-test="force-deliver-toggle"
                />
                <v-textarea
                    v-if="force"
                    v-model="forceReason"
                    :label="t('shipment-panel.label-force-reason')"
                    rows="2"
                    density="compact"
                    data-test="force-deliver-reason"
                />
            </template>
            <v-btn
                v-if="canDeliver || (canOverrideDeliver && force)"
                class="mt-3"
                color="secondary"
                variant="tonal"
                size="small"
                data-test="mark-delivered"
                :disabled="loading || (force && !forceReason)"
                @click="markDelivered"
            >
                {{ t('shipment-panel.button-deliver') }}
            </v-btn>
        </template>

        <template v-else-if="canShip || canOverrideShip">
            <p class="m-0 mb-2 text-sm opacity-75">{{ t('shipment-panel.not-shipped-yet') }}</p>
            <v-text-field
                v-model="trackingCode"
                :label="t('shipment-panel.label-tracking-code')"
                :hint="trackingRequired ? t('shipment-panel.tracking-code-required') : undefined"
                persistent-hint
                density="compact"
                data-test="tracking-code-input"
            />
            <template v-if="!canShip && canOverrideShip">
                <v-checkbox
                    v-model="force"
                    :label="t('shipment-panel.label-force')"
                    density="compact"
                    hide-details
                    data-test="force-ship-toggle"
                />
                <v-textarea
                    v-if="force"
                    v-model="forceReason"
                    :label="t('shipment-panel.label-force-reason')"
                    rows="2"
                    density="compact"
                    data-test="force-ship-reason"
                />
            </template>
            <v-btn
                class="mt-3"
                color="primary"
                variant="tonal"
                size="small"
                data-test="mark-shipped"
                :disabled="
                    loading ||
                    (trackingRequired && !trackingCode) ||
                    (!canShip && (!force || !forceReason)) ||
                    (force && !forceReason)
                "
                @click="markShipped"
            >
                {{ t('shipment-panel.button-ship') }}
            </v-btn>
        </template>

        <p v-else class="m-0 opacity-75">{{ t('shipment-panel.not-shipped-yet') }}</p>
    </v-card>
</template>
