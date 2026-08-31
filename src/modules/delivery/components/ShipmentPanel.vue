<script lang="ts">
export default {
    name: 'ShipmentPanel'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Single-file component: `<script setup>` wires session/delivery-store state, the template
 * renders conditionally on `shipment` being loaded, with the courier button gated by `isAdmin`
 * and the shipment's `status`.
 */

import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useSessionStore } from '@/infrastructure/stores/session.ts';
import { useDeliveryStore } from '../store.ts';

/**
 * The order page's shipping corner: tracking code and whether the parcel has arrived. For an
 * admin looking at a parcel still on the truck, the fake courier's button sits right here —
 * this repo has no cron, an operator is the timer, and the demo makes that a visible click.
 */
const { orderId } = defineProps<{
    /**
     * The order whose parcel this shows.
     */
    orderId: string;
}>();

const emit = defineEmits<
    /**
     * The courier advanced and the order's status moved — the parent should re-read it.
     */
    (event: 'advanced') => void
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
 * Whether the current session may see the courier button.
 */
const { isAdmin } = storeToRefs(useSessionStore());

/**
 * Delivery store, for the courier action.
 */
const deliveryStore = useDeliveryStore();

/**
 * This order's parcel, reactive.
 */
const { shipment } = storeToRefs(deliveryStore);

/**
 * Ticks the fake courier, then re-reads this order's parcel so the shown status catches up.
 *
 * @returns A promise resolving once the panel has refreshed.
 */
const advanceCourier = () =>
    deliveryStore.advance().then(() => {
        addMessage(t('shipment-panel.advanced'));
        return deliveryStore.fetchShipmentForOrder(orderId).then(() => emit('advanced'));
    });

onMounted(() => {
    void deliveryStore.fetchShipmentForOrder(orderId);
});
</script>

<template>
    <v-card v-if="shipment" class="p-4" data-test="shipment-panel">
        <h3 class="mb-2 text-base font-semibold">{{ t('shipment-panel.title') }}</h3>
        <div class="flex items-center gap-3">
            <v-chip
                :color="shipment.status === 'delivered' ? 'success' : 'info'"
                size="small"
                data-test="shipment-status"
            >
                {{ t(`shipment-panel.status-${shipment.status}`) }}
            </v-chip>
            <span class="text-sm" data-test="shipment-tracking">{{ shipment.trackingCode }}</span>
        </div>
        <v-btn
            v-if="isAdmin && shipment.status === 'shipped'"
            class="mt-3"
            color="secondary"
            variant="tonal"
            size="small"
            data-test="courier-advance"
            @click="advanceCourier"
        >
            {{ t('shipment-panel.button-advance') }}
        </v-btn>
    </v-card>
</template>
