<script lang="ts">
export default {
    name: 'ShipmentPanel'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Single-file component: `<script setup>` wires session/delivery-store state, the template
 * renders one of three states off the order's own status and shipment — not yet shippable,
 * ready to ship, or in transit/arrived — with the tracking-code field gated on the chosen
 * method's `tracked` flag, read live from the methods list.
 */

import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useSessionStore } from '@/infrastructure/session.ts';
import { useDeliveryStore } from '../store.ts';

/**
 * The order page's shipping corner: recording a handover and an arrival, one order at a time.
 */
const { orderId, orderStatus, shippingMethodId } = defineProps<{
    /**
     * The order whose parcel this shows.
     */
    orderId: string;
    /**
     * The order's current status — decides whether "mark shipped" is offered at all.
     */
    orderStatus?: string;
    /**
     * The method frozen on the order at checkout — looked up against the methods list to know
     * whether a tracking code is required.
     */
    shippingMethodId?: string;
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
 * Whether the current session may see the write actions below.
 */
const session = useSessionStore();

/**
 * Delivery store, for the methods list and the two write actions.
 */
const deliveryStore = useDeliveryStore();

/**
 * This order's parcel, reactive — `undefined` while nothing has shipped.
 */
const { shipment, methods } = storeToRefs(deliveryStore);

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
 * May this session actually write, not just read, a shipment.
 */
const canWrite = computed(() => session.can('update', 'Shipment'));

/**
 * May this session force a move through `orders.any.override` — skipping the ordinary
 * `processing`/`shipped` gate. Same key `StatusOverrideDialog`-equivalent flows in `orders` ask
 * for; declared here as `'Order'` because the permission is `orders.any.override`, not a delivery
 * one, even though this panel is where the forced ship/deliver actually happens.
 */
const canOverride = computed(() => session.can('override', 'Order'));

/**
 * The forward sequence an override may move an order along — mirrors the backend's own
 * `OVERRIDABLE_SEQUENCE` in `orders/domain/lifecycle.ts` exactly: never `cancelled` (not in the
 * sequence at all — a cancelled order accepts no override) and never backward. A small, closed,
 * rarely-changing set, unlike the ordinary transitions list the server computes per caller — worth
 * mirroring here so this panel doesn't offer a force action the server can only ever refuse.
 */
const OVERRIDABLE_SEQUENCE: readonly string[] = [
    'pending',
    'paid',
    'processing',
    'shipped',
    'delivered'
];

/**
 * Whether an override holder may force this order toward `to` from its current status.
 *
 * @param to - The forced destination being considered (`shipped` or `delivered`).
 */
const canOverrideTo = (to: string) => {
    const fromIndex = OVERRIDABLE_SEQUENCE.indexOf(orderStatus ?? '');
    return fromIndex !== -1 && OVERRIDABLE_SEQUENCE.indexOf(to) > fromIndex;
};

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
 * Records the handover, then re-reads the order.
 *
 * @returns A promise resolving once the panel has refreshed.
 */
const markShipped = () =>
    deliveryStore
        .ship(orderId, trackingCode.value || undefined, force.value, forceReason.value || undefined)
        .then(() => {
            trackingCode.value = '';
            force.value = false;
            forceReason.value = '';
            addMessage(t('shipment-panel.shipped'));
            emit('moved');
        });

/**
 * Records the arrival, then re-reads the order.
 *
 * @returns A promise resolving once the panel has refreshed.
 */
const markDelivered = () =>
    deliveryStore.deliver(orderId, force.value, forceReason.value || undefined).then(() => {
        force.value = false;
        forceReason.value = '';
        addMessage(t('shipment-panel.delivered'));
        emit('moved');
    });

onMounted(() => {
    void deliveryStore.fetchMethods();
    void deliveryStore.fetchShipmentForOrder(orderId);
});
</script>

<template>
    <v-card class="p-4" data-test="shipment-panel">
        <h3 class="mb-2 text-base font-semibold">{{ t('shipment-panel.title') }}</h3>

        <template v-if="shipment">
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
            <template v-if="canOverride && shipment.status !== 'delivered'">
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
                v-if="canWrite && (shipment.status === 'shipped' || (canOverride && force))"
                class="mt-3"
                color="secondary"
                variant="tonal"
                size="small"
                data-test="mark-delivered"
                :disabled="force && !forceReason"
                @click="markDelivered"
            >
                {{ t('shipment-panel.button-deliver') }}
            </v-btn>
        </template>

        <template
            v-else-if="
                canWrite &&
                (orderStatus === 'processing' || (canOverride && canOverrideTo('shipped')))
            "
        >
            <p class="m-0 mb-2 text-sm opacity-75">{{ t('shipment-panel.not-shipped-yet') }}</p>
            <v-text-field
                v-model="trackingCode"
                :label="t('shipment-panel.label-tracking-code')"
                :hint="trackingRequired ? t('shipment-panel.tracking-code-required') : undefined"
                persistent-hint
                density="compact"
                data-test="tracking-code-input"
            />
            <template v-if="canOverride && orderStatus !== 'processing'">
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
                    (trackingRequired && !trackingCode) ||
                    (orderStatus !== 'processing' && (!force || !forceReason)) ||
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
