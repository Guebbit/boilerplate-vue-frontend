<script setup lang="ts">
/**
 * @module
 * One shipment inside its fulfillment order's card: its lines, status, tracking code and dates,
 * and the staff controls the shipment's own `actions` offer — correct the tracking code inline,
 * mark it delivered, report it lost or damaged. A `lost` parcel shows what the shop told the buyer (and, to staff, the note); its
 * arrival button appears only while the server says every unit on it is still open. Controls
 * come from `actions`, never from a rule re-derived here.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { formatAddressLine, formatDateTime } from '@/infrastructure/utils/formatters.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useDeliveryStore } from '../store.ts';
import ReportLostDialog from './ReportLostDialog.vue';
import type { Shipment } from '@types';

/**
 * The shipment.
 */
const props = defineProps<{
    shipment: Shipment;
    /** The order's shipping address as one line; a destination equal to it needs no mention. */
    orderAddress?: string | undefined;
}>();

/**
 * Where this parcel went, when that differs from where the order ships now (the rest of the order
 * was redirected after it left); absent otherwise.
 */
const redirectedFrom = computed(() => {
    const sent = formatAddressLine(props.shipment.destination);
    return sent && sent !== props.orderAddress ? sent : undefined;
});

/**
 * Emitted once a move landed, so the owning page re-reads the order.
 */
const emit = defineEmits<
    /**
     * The shipment moved or changed.
     */
    (event: 'moved') => void
>();

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report each outcome.
 */
const { addMessage } = useNotificationsStore();

/**
 * The store's writes and its in-flight flag.
 */
const deliveryStore = useDeliveryStore();

/**
 * True while any delivery call is in flight; disables the buttons so two cannot race.
 */
const { loading } = storeToRefs(deliveryStore);

/**
 * The tracking field's text; empty until staff start editing.
 */
const trackingDraft = ref(props.shipment.trackingCode ?? '');

/**
 * This row's own blocked state: a lost race or a refusal stays next to the shipment it concerns.
 */
const { message: rowError, report: reportRowError, clear: clearRowError } = useBlockingError();

/**
 * Whether the arrival button shows at all.
 */
const offerDeliver = computed(() => props.shipment.actions.deliver);

/**
 * Whether the report-lost dialog is open.
 */
const lostOpen = ref(false);

/**
 * The chip's colour by status: a lost parcel is the one that needs the eye.
 */
const STATUS_COLOR = { shipped: 'info', delivered: 'success', lost: 'error' } as const;

/**
 * Whether the tracking field holds a new, non-empty code.
 */
const trackingChanged = computed(
    () =>
        trackingDraft.value.trim() !== '' &&
        trackingDraft.value.trim() !== (props.shipment.trackingCode ?? '')
);

/**
 * Runs one write: clears the blocked state, toasts, tells the page, or blocks in place.
 *
 * @param move - The store call.
 * @param success - The toast key.
 * @returns A promise settling once the move finished.
 */
const run = (move: () => Promise<unknown>, success: string) => {
    clearRowError();
    return move()
        .then(() => {
            addMessage(t(success));
            emit('moved');
        })
        .catch((error: unknown) => reportRowError(error));
};

/**
 * Saves the corrected tracking code.
 *
 * @returns A promise settling once the call finished.
 */
const saveTracking = () =>
    run(
        () => deliveryStore.editTracking(props.shipment.id, trackingDraft.value.trim()),
        'shipment-row.tracking-saved'
    );

/**
 * Records the arrival.
 *
 * @returns A promise settling once the call finished.
 */
const markDelivered = () =>
    run(() => deliveryStore.deliver(props.shipment.id), 'shipment-row.delivered');
</script>

<template>
    <li class="flex flex-col gap-2 rounded-md border border-solid p-3" data-test="shipment-row">
        <div class="flex flex-wrap items-center gap-3">
            <span class="text-sm font-semibold" data-test="shipment-number">
                {{ t('shipment-row.title', { number: shipment.number }) }}
            </span>
            <v-chip :color="STATUS_COLOR[shipment.status]" size="small" data-test="shipment-status">
                {{ t(`shipment-row.status-${shipment.status}`) }}
            </v-chip>
            <v-chip
                v-if="shipment.awaitingTracking"
                color="warning"
                size="small"
                data-test="shipment-awaiting-tracking"
            >
                {{ t('shipment-row.awaiting-tracking') }}
            </v-chip>
            <span v-if="shipment.trackingCode" class="text-sm" data-test="shipment-tracking">
                {{ t('shipment-row.tracking', { code: shipment.trackingCode }) }}
            </span>
        </div>

        <ul class="m-0 list-none p-0 text-sm" data-test="shipment-lines">
            <li v-for="line in shipment.lines" :key="'shipment-line-' + line.productId">
                {{ line.quantity }} × {{ line.title }}
            </li>
        </ul>

        <p class="m-0 text-sm opacity-75" data-test="shipment-dates">
            {{ t('shipment-row.shipped-at', { date: formatDateTime(shipment.shippedAt) }) }}
            <template v-if="shipment.deliveredAt">
                ·
                {{ t('shipment-row.delivered-at', { date: formatDateTime(shipment.deliveredAt) }) }}
            </template>
        </p>

        <div v-if="shipment.lostAt" class="flex flex-col gap-1 text-sm" data-test="shipment-lost">
            <span data-test="shipment-lost-reason">
                {{
                    t(`shipment-row.lost-${shipment.lostReason ?? 'lost'}`) +
                    ' · ' +
                    t('shipment-row.lost-at', { date: formatDateTime(shipment.lostAt) })
                }}
            </span>
            <span v-if="shipment.lostMessage" data-test="shipment-lost-message">
                {{ t('shipment-row.lost-message', { message: shipment.lostMessage }) }}
            </span>
            <span v-if="shipment.lostNote" class="opacity-75" data-test="shipment-lost-note">
                {{ t('shipment-row.lost-note', { note: shipment.lostNote }) }}
            </span>
        </div>

        <p v-if="redirectedFrom" class="m-0 text-sm" data-test="shipment-destination">
            {{ t('shipment-row.sent-to', { address: redirectedFrom }) }}
        </p>

        <form
            v-if="shipment.actions.update"
            class="flex flex-wrap items-start gap-2"
            novalidate
            @submit.prevent="saveTracking"
        >
            <v-text-field
                v-model="trackingDraft"
                :label="t('shipment-row.label-tracking-code')"
                maxlength="100"
                density="compact"
                hide-details
                class="min-w-48 grow"
                data-test="shipment-tracking-input"
            />
            <v-btn
                type="submit"
                size="small"
                variant="tonal"
                :disabled="loading || !trackingChanged"
                data-test="shipment-tracking-save"
            >
                {{ t('shipment-row.button-save-tracking') }}
            </v-btn>
        </form>

        <div v-if="offerDeliver">
            <v-btn
                color="secondary"
                variant="tonal"
                size="small"
                :disabled="loading"
                data-test="mark-delivered"
                @click="markDelivered"
            >
                {{ t('shipment-row.button-deliver') }}
            </v-btn>
        </div>

        <div v-if="shipment.actions.markLost">
            <v-btn
                variant="tonal"
                size="small"
                :disabled="loading"
                data-test="open-report-lost"
                @click="lostOpen = true"
            >
                {{ t('shipment-row.button-report-lost') }}
            </v-btn>
        </div>

        <InlineErrorAlert :message="rowError" data-test="shipment-row-error" />

        <ReportLostDialog v-model="lostOpen" :shipment="shipment" @reported="emit('moved')" />
    </li>
</template>
