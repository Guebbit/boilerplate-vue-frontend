<script setup lang="ts">
/**
 * @module
 * One card per fulfillment order — the group of lines that leave together — in Shopify's admin
 * layout: status, hold reason, what is promised and when, each line with how much shipped,
 * was cancelled and remains, then the shipments cut from it. Every button comes from the
 * record's own `actions` (the server refuses what does not apply). A late preorder also
 * shows the promised date, the last notice sent, and who cancelled it. The shop only tells the
 * buyer: there is no question to answer.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { formatDateTime } from '@/infrastructure/utils/formatters.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useDeliveryStore } from '../store.ts';
import HoldDialog from './HoldDialog.vue';
import ShipItemsDialog from './ShipItemsDialog.vue';
import ShipmentRow from './ShipmentRow.vue';
import type { FulfillmentOrder, Shipment } from '@types';

/**
 * The fulfillment order and the shipments cut from it.
 */
const props = defineProps<{
    fulfillmentOrder: FulfillmentOrder;
    /** This fulfillment order's shipments, oldest first. */
    shipments: Shipment[];
    /** The order's shipping address as one line, handed to each shipment row. */
    orderAddress?: string | undefined;
}>();

/**
 * Emitted once any move landed, so the owning page re-reads the order.
 */
const emit = defineEmits<
    /**
     * A move on this fulfillment order or one of its shipments went through.
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
 * Whether the ship dialog is open.
 */
const shipOpen = ref(false);

/**
 * Whether the hold dialog is open.
 */
const holdOpen = ref(false);

/**
 * This card's own blocked state for the buttons that need no dialog (fulfil, release).
 */
const { message: cardError, report: reportCardError, clear: clearCardError } = useBlockingError();

/**
 * Whether the ship button shows — answered by the server (`actions.ship`), which also covers a
 * `paid` order for a caller who may start it.
 */
const offerShip = computed(() => props.fulfillmentOrder.actions.ship);

/**
 * The status chip's text. A buyer, who is never sent staff's reason, reads a held group as
 * "Delayed": the shop's word for it, not a status that sounds like a decision about them.
 */
const statusLabel = computed(() =>
    props.fulfillmentOrder.status === 'on_hold' &&
    !props.fulfillmentOrder.holdReason &&
    props.fulfillmentOrder.holdNotice !== 'awaiting_stock'
        ? t('fulfillment-order-card.status-delayed')
        : t(`fulfillment-order-card.status-${props.fulfillmentOrder.status}`)
);

/**
 * A preorder that lost its date: something was promised (`agreedAt`) but nothing is expected now,
 * because the release date was cleared.
 */
const hasNoDateYet = computed(
    () => !!props.fulfillmentOrder.agreedAt && !props.fulfillmentOrder.expectedAt
);

/**
 * The promised date, shown once the expected one has moved away from it or is gone.
 */
const promisedDate = computed(() =>
    props.fulfillmentOrder.agreedAt &&
    props.fulfillmentOrder.expectedAt !== props.fulfillmentOrder.agreedAt
        ? props.fulfillmentOrder.agreedAt
        : undefined
);

/**
 * Runs one dialog-less write: clears the blocked state, toasts, tells the page, or blocks in place.
 *
 * @param move - The store call.
 * @param success - The toast key.
 * @returns A promise settling once the move finished.
 */
const run = (move: () => Promise<unknown>, success: string) => {
    clearCardError();
    return move()
        .then(() => {
            addMessage(t(success));
            emit('moved');
        })
        .catch((error: unknown) => reportCardError(error));
};

/**
 * Fulfils a digital fulfillment order.
 *
 * @returns A promise settling once the call finished.
 */
const markFulfilled = () =>
    run(() => deliveryStore.fulfill(props.fulfillmentOrder.id), 'fulfillment-order-card.fulfilled');

/**
 * Lifts a staff hold.
 *
 * @returns A promise settling once the call finished.
 */
const release = () =>
    run(() => deliveryStore.release(props.fulfillmentOrder.id), 'fulfillment-order-card.released');
</script>

<template>
    <v-card class="flex flex-col gap-3 p-4" data-test="fulfillment-order-card">
        <div class="flex flex-wrap items-center gap-2">
            <h4 class="m-0 text-base font-semibold" data-test="fulfillment-order-title">
                {{ t('fulfillment-order-card.title', { number: fulfillmentOrder.number }) }}
            </h4>
            <v-chip size="small" variant="tonal" data-test="fulfillment-order-status">
                {{ statusLabel }}
            </v-chip>
            <v-chip
                v-if="fulfillmentOrder.kind === 'digital'"
                size="small"
                variant="outlined"
                data-test="fulfillment-order-digital"
            >
                {{ t('fulfillment-order-card.kind-digital') }}
            </v-chip>
            <v-chip
                v-if="fulfillmentOrder.holdReason"
                size="small"
                color="warning"
                variant="tonal"
                data-test="fulfillment-order-hold-reason"
            >
                {{ t(`fulfillment-order-card.hold-reason-${fulfillmentOrder.holdReason}`) }}
            </v-chip>
        </div>

        <p
            v-if="fulfillmentOrder.holdNotice === 'awaiting_stock'"
            class="m-0 text-sm"
            data-test="fulfillment-order-awaiting-stock"
        >
            {{ t('fulfillment-order-card.waits-for-stock') }}
        </p>
        <v-alert
            v-else-if="fulfillmentOrder.holdNotice"
            type="warning"
            variant="tonal"
            density="compact"
            class="m-0 text-sm"
            :data-notice="fulfillmentOrder.holdNotice"
            data-test="fulfillment-order-hold-notice"
        >
            {{ t(`fulfillment-order-card.hold-notice-${fulfillmentOrder.holdNotice}`) }}
        </v-alert>
        <p
            v-if="fulfillmentOrder.holdMessage"
            class="m-0 text-sm"
            data-test="fulfillment-order-hold-message"
        >
            {{
                t('fulfillment-order-card.hold-message', { message: fulfillmentOrder.holdMessage })
            }}
        </p>
        <p v-if="fulfillmentOrder.holdNote" class="m-0 text-sm" data-test="fulfillment-order-note">
            {{ t('fulfillment-order-card.hold-note', { note: fulfillmentOrder.holdNote }) }}
        </p>
        <p
            v-if="fulfillmentOrder.expectedAt && fulfillmentOrder.status !== 'closed'"
            class="m-0 text-sm opacity-75"
            data-test="fulfillment-order-expected"
        >
            {{
                t('fulfillment-order-card.expected', {
                    date: formatDateTime(fulfillmentOrder.expectedAt)
                })
            }}
        </p>
        <p
            v-else-if="hasNoDateYet && fulfillmentOrder.status !== 'closed'"
            class="m-0 text-sm opacity-75"
            data-test="fulfillment-order-no-date"
        >
            {{ t('fulfillment-order-card.no-date-yet') }}
        </p>

        <p
            v-if="promisedDate"
            class="m-0 text-sm opacity-75"
            data-test="fulfillment-order-promised"
        >
            {{ t('fulfillment-order-card.promised', { date: formatDateTime(promisedDate) }) }}
        </p>
        <p
            v-if="fulfillmentOrder.lastNoticeAt"
            class="m-0 text-sm opacity-75"
            data-test="fulfillment-order-last-notice"
        >
            {{
                t('fulfillment-order-card.last-notice', {
                    date: formatDateTime(fulfillmentOrder.lastNoticeAt)
                })
            }}
        </p>
        <v-chip
            v-if="fulfillmentOrder.cancelReason"
            size="small"
            variant="outlined"
            class="self-start"
            :data-cancel-reason="fulfillmentOrder.cancelReason"
            data-test="fulfillment-order-cancel-reason"
        >
            {{ t(`fulfillment-order-card.cancel-reason-${fulfillmentOrder.cancelReason}`) }}
        </v-chip>

        <ul class="m-0 list-none p-0 text-sm" data-test="fulfillment-order-lines">
            <li v-for="line in fulfillmentOrder.lines" :key="'fo-line-' + line.productId">
                {{ line.title }} —
                {{
                    t('fulfillment-order-card.line-progress', {
                        shipped: line.shippedQuantity,
                        quantity: line.quantity
                    })
                }}
                <template v-if="line.cancelledQuantity > 0">
                    ·
                    {{
                        t('fulfillment-order-card.line-cancelled', {
                            cancelled: line.cancelledQuantity
                        })
                    }}
                </template>
            </li>
        </ul>

        <div class="flex flex-wrap gap-2">
            <v-btn
                v-if="offerShip"
                color="primary"
                variant="tonal"
                size="small"
                :disabled="loading"
                data-test="open-ship"
                @click="shipOpen = true"
            >
                {{ t('fulfillment-order-card.button-ship') }}
            </v-btn>
            <v-btn
                v-if="fulfillmentOrder.actions.fulfill"
                color="primary"
                variant="tonal"
                size="small"
                :disabled="loading"
                data-test="mark-fulfilled"
                @click="markFulfilled"
            >
                {{ t('fulfillment-order-card.button-fulfill') }}
            </v-btn>
            <v-btn
                v-if="fulfillmentOrder.actions.hold"
                variant="tonal"
                size="small"
                :disabled="loading"
                data-test="open-hold"
                @click="holdOpen = true"
            >
                {{ t('fulfillment-order-card.button-hold') }}
            </v-btn>
            <v-btn
                v-if="fulfillmentOrder.actions.release"
                variant="tonal"
                size="small"
                :disabled="loading"
                data-test="release"
                @click="release"
            >
                {{ t('fulfillment-order-card.button-release') }}
            </v-btn>
        </div>

        <InlineErrorAlert :message="cardError" data-test="fulfillment-order-error" />

        <ul
            v-if="shipments.length > 0"
            class="m-0 flex list-none flex-col gap-2 p-0"
            data-test="fulfillment-order-shipments"
        >
            <ShipmentRow
                v-for="shipment in shipments"
                :key="'shipment-' + shipment.id"
                :shipment="shipment"
                :order-address="orderAddress"
                @moved="emit('moved')"
            />
        </ul>

        <ShipItemsDialog
            v-model="shipOpen"
            :fulfillment-order="fulfillmentOrder"
            @shipped="emit('moved')"
        />
        <HoldDialog
            v-model="holdOpen"
            :fulfillment-order="fulfillmentOrder"
            @held="emit('moved')"
        />
    </v-card>
</template>
