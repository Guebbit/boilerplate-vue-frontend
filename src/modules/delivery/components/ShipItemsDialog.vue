<script setup lang="ts">
/**
 * @module
 * Staff cut a shipment from one fulfillment order: a quantity per remaining line (default: all),
 * a tracking code, and the forced door for an `override:Order` holder when the ordinary one
 * is closed. The dialog owns its call and reports the outcome in place; the server re-checks every
 * limit, so the form only keeps staff from asking for the impossible.
 */
import { computed, ref, watch, useId } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useFullscreenDialog } from '@/ui/composables/use-fullscreen-dialog.ts';
import { useReturnFocus } from '@/ui/composables/use-return-focus.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useDeliveryStore } from '../store.ts';
import { readShipLines, shippableLines } from '../domain/ship-lines.ts';
import type { FulfillmentOrder } from '@types';

/**
 * The fulfillment order being shipped from, and what the caller may do beyond the ordinary door.
 */
const props = defineProps<{
    fulfillmentOrder: FulfillmentOrder;
    /** Whether the order's shipping method needs a tracking code on every shipment. */
    trackingRequired?: boolean;
    /**
     * Whether the caller may force a shipment (`Order.actions.override` lists `shipped`). Offered
     * only while the ordinary door (`fulfillmentOrder.actions.ship`) is closed.
     */
    canForce?: boolean;
}>();

/**
 * Emitted once the shipment was cut, so the owning page re-reads the order.
 */
const emit = defineEmits<
    /**
     * A shipment was recorded.
     */
    (event: 'shipped') => void
>();

/**
 * Two-way `v-model`: whether the dialog is open.
 */
const isOpen = defineModel<boolean>({ required: true });

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report the outcome.
 */
const { addMessage } = useNotificationsStore();

/**
 * The heading's id, so the dialog is announced by its title rather than as "dialog".
 */
const titleId = useId();

/**
 * Whether the dialog fills the screen — it does on a phone.
 */
const fullscreen = useFullscreenDialog();

/**
 * Hands focus back to the control that opened the dialog once it closes.
 */
useReturnFocus(() => isOpen.value);

/**
 * The store's ship call and its in-flight flag.
 */
const deliveryStore = useDeliveryStore();

/**
 * True while any delivery call is in flight; disables submit so a double click cannot cut two.
 */
const { loading } = storeToRefs(deliveryStore);

/**
 * One quantity string per line, by product id; seeded with everything remaining on every open.
 */
const quantities = ref<Record<string, string>>({});

/**
 * The carrier's handle on this shipment.
 */
const trackingCode = ref('');

/**
 * Whether this shipment skips the `start` step.
 */
const force = ref(false);

/**
 * Why the normal door did not apply; required exactly when {@link force} is on.
 */
const forceReason = ref('');

/**
 * This dialog's own blocked state: a refusal (409, 422, a step-up failure) stays next to the form.
 */
const { message: shipError, report: reportShipError, clear: clearShipError } = useBlockingError();

/**
 * The lines that can still ship, in order.
 */
const lines = computed(() => shippableLines(props.fulfillmentOrder.lines));

/**
 * What the quantity fields currently mean: sendable or not, and the lines to send.
 */
const verdict = computed(() => readShipLines(props.fulfillmentOrder.lines, quantities.value));

/**
 * Whether the force controls show: only when the ordinary door is closed and the caller may force.
 */
const offerForce = computed(() => !props.fulfillmentOrder.actions.ship && props.canForce);

/**
 * Whether the form can be sent right now.
 */
const canSubmit = computed(
    () =>
        !loading.value &&
        verdict.value.valid &&
        (!props.trackingRequired || trackingCode.value.trim() !== '') &&
        (props.fulfillmentOrder.actions.ship || (force.value && forceReason.value.trim() !== ''))
);

/**
 * Re-seeds the form every time the dialog opens — never on mount: one instance may serve a list.
 */
watch(isOpen, (open) => {
    if (!open) return;
    quantities.value = Object.fromEntries(
        lines.value.map(({ productId, remaining }) => [productId, String(remaining)])
    );
    trackingCode.value = '';
    force.value = false;
    forceReason.value = '';
    clearShipError();
});

/**
 * Cuts the shipment from the quantities on screen.
 *
 * @returns A promise settling once the call finished; a refusal blocks the dialog in place.
 */
const submit = () => {
    clearShipError();
    return deliveryStore
        .ship(props.fulfillmentOrder.id, {
            lines: verdict.value.lines,
            ...(trackingCode.value.trim() ? { trackingCode: trackingCode.value.trim() } : {}),
            ...(force.value ? { forced: true, reason: forceReason.value.trim() } : {})
        })
        .then(() => {
            addMessage(t('ship-items-dialog.success'));
            isOpen.value = false;
            emit('shipped');
        })
        .catch((error: unknown) => reportShipError(error));
};
</script>

<template>
    <v-dialog
        v-model="isOpen"
        max-width="520"
        :fullscreen="fullscreen"
        :aria-labelledby="titleId"
        data-test="ship-items-dialog"
    >
        <v-card class="p-5">
            <h2 :id="titleId" class="mb-4 text-lg font-semibold">
                {{ t('ship-items-dialog.title', { number: fulfillmentOrder.number }) }}
            </h2>

            <form class="flex flex-col gap-3" novalidate @submit.prevent="submit">
                <v-text-field
                    v-for="line in lines"
                    :key="'ship-line-' + line.productId"
                    v-model="quantities[line.productId]"
                    type="number"
                    min="0"
                    :max="line.remaining"
                    :label="t('ship-items-dialog.label-quantity', { title: line.title })"
                    :hint="t('ship-items-dialog.hint-remaining', { remaining: line.remaining })"
                    persistent-hint
                    density="compact"
                    :data-test="'ship-quantity-' + line.productId"
                />
                <p v-if="!verdict.valid" class="m-0 text-sm" data-test="ship-lines-invalid">
                    {{ t('ship-items-dialog.error-lines-invalid') }}
                </p>

                <v-text-field
                    v-model="trackingCode"
                    :label="t('ship-items-dialog.label-tracking-code')"
                    :hint="
                        trackingRequired ? t('ship-items-dialog.tracking-code-required') : undefined
                    "
                    persistent-hint
                    maxlength="100"
                    density="compact"
                    data-test="ship-tracking-code"
                />

                <template v-if="offerForce">
                    <v-checkbox
                        v-model="force"
                        :label="t('ship-items-dialog.label-force')"
                        density="compact"
                        hide-details
                        data-test="ship-force-toggle"
                    />
                    <v-textarea
                        v-if="force"
                        v-model="forceReason"
                        :label="t('ship-items-dialog.label-force-reason')"
                        rows="2"
                        maxlength="1000"
                        density="compact"
                        data-test="ship-force-reason"
                    />
                </template>

                <InlineErrorAlert :message="shipError" data-test="ship-items-error" />

                <div class="mt-2 flex justify-end gap-2">
                    <v-btn variant="tonal" data-test="ship-cancel" @click="isOpen = false">
                        {{ t('generic.cancel') }}
                    </v-btn>
                    <v-btn
                        type="submit"
                        color="primary"
                        :disabled="!canSubmit"
                        data-test="ship-submit"
                    >
                        {{ t('ship-items-dialog.button-ship') }}
                    </v-btn>
                </div>
            </form>
        </v-card>
    </v-dialog>
</template>
