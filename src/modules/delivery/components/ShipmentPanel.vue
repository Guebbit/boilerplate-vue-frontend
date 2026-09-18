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
 * Records the handover, then re-reads the order.
 *
 * @returns A promise resolving once the panel has refreshed.
 */
const markShipped = () =>
    deliveryStore.ship(orderId, trackingCode.value || undefined).then(() => {
        trackingCode.value = '';
        addMessage(t('shipment-panel.shipped'));
        emit('moved');
    });

/**
 * Records the arrival, then re-reads the order.
 *
 * @returns A promise resolving once the panel has refreshed.
 */
const markDelivered = () =>
    deliveryStore.deliver(orderId).then(() => {
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
            <v-btn
                v-if="canWrite && shipment.status === 'shipped'"
                class="mt-3"
                color="secondary"
                variant="tonal"
                size="small"
                data-test="mark-delivered"
                @click="markDelivered"
            >
                {{ t('shipment-panel.button-deliver') }}
            </v-btn>
        </template>

        <template v-else-if="canWrite && orderStatus === 'processing'">
            <p class="m-0 mb-2 text-sm opacity-75">{{ t('shipment-panel.not-shipped-yet') }}</p>
            <v-text-field
                v-model="trackingCode"
                :label="t('shipment-panel.label-tracking-code')"
                :hint="trackingRequired ? t('shipment-panel.tracking-code-required') : undefined"
                persistent-hint
                density="compact"
                data-test="tracking-code-input"
            />
            <v-btn
                class="mt-3"
                color="primary"
                variant="tonal"
                size="small"
                data-test="mark-shipped"
                :disabled="trackingRequired && !trackingCode"
                @click="markShipped"
            >
                {{ t('shipment-panel.button-ship') }}
            </v-btn>
        </template>

        <p v-else class="m-0 opacity-75">{{ t('shipment-panel.not-shipped-yet') }}</p>
    </v-card>
</template>
