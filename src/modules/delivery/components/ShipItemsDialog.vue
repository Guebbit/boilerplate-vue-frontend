<script setup lang="ts">
/**
 * @module
 * Staff cut a shipment from one fulfillment order: a quantity per remaining line (default: all),
 * and a tracking code. The dialog owns its call and reports the outcome in place; the server re-checks every
 * limit, so the form only keeps staff from asking for the impossible.
 */
import { DIALOG_MAX_WIDTH } from '@/ui/organisms/dialog-width.ts';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import DialogShell from '@/ui/organisms/DialogShell.vue';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { singleFlight } from '@/infrastructure/utils/single-flight.ts';
import { useDeliveryStore } from '../store.ts';
import { readShipLines, shippableLines } from '../domain/ship-lines.ts';
import type { FulfillmentOrder } from '@types';

/**
 * The fulfillment order being shipped from.
 */
const props = defineProps<{
    fulfillmentOrder: FulfillmentOrder;
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
 * Whether the form can be sent right now.
 */
const canSubmit = computed(
    () => !loading.value && verdict.value.valid && props.fulfillmentOrder.actions.ship
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
    clearShipError();
});

/**
 * Cuts the shipment from the quantities on screen. A repeat submit while the first is in flight
 * does nothing, so a double press cuts one shipment.
 *
 * @returns A promise settling once the call finished; a refusal blocks the dialog in place.
 */
const submit = singleFlight(() => {
    clearShipError();
    return deliveryStore
        .ship(props.fulfillmentOrder.id, {
            lines: verdict.value.lines,
            ...(trackingCode.value.trim() ? { trackingCode: trackingCode.value.trim() } : {})
        })
        .then(() => {
            addMessage(t('ship-items-dialog.success'));
            isOpen.value = false;
            emit('shipped');
        })
        .catch((error: unknown) => reportShipError(error));
});
</script>

<template>
    <DialogShell
        v-model="isOpen"
        :max-width="DIALOG_MAX_WIDTH.form"
        data-test="ship-items-dialog"
        v-slot="{ titleId }"
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
                    :hint="t('ship-items-dialog.tracking-code-hint')"
                    persistent-hint
                    maxlength="100"
                    density="compact"
                    data-test="ship-tracking-code"
                />

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
    </DialogShell>
</template>
