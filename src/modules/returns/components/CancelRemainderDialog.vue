<script setup lang="ts">
/**
 * @module
 * Cancels what has not shipped yet — the remainder of ONE fulfillment order — behind a confirm
 * step that shows the server's own refund (`GET /returns/options`), never a client's sum. Two
 * callers share it: the buyer, as part of their withdrawal (`reason: withdrawal`, no note), and
 * staff holding the refund key, who say why in a note; the step-up prompt for that key is the http
 * layer's, so it appears before the call resolves.
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useFullscreenDialog } from '@/ui/composables/use-fullscreen-dialog.ts';
import { useReturnFocus } from '@/ui/composables/use-return-focus.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { formatCurrency } from '@/infrastructure/utils/formatters.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useReturnsStore } from '../store.ts';
import type { CancellableFulfillmentOrder } from '@types';

/**
 * The order, the cancellable remainder, and who is asking.
 */
const props = defineProps<{
    orderId: string;
    /** ISO-4217 code the amounts are in (`ReturnOptions.currency`). */
    currency: string;
    /** The fulfillment order's remainder and the refund cancelling it would owe. */
    option: CancellableFulfillmentOrder;
    /** `buyer` exercises their withdrawal; `staff` cancels on the refund key and gives a note. */
    mode: 'buyer' | 'staff';
}>();

/**
 * Emitted once the cancellation was made, so the owning page re-reads the order.
 */
const emit = defineEmits<
    /**
     * The remainder was cancelled and its refund started.
     */
    (event: 'cancelled') => void
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
 * Whether the dialog fills the screen — it does on a phone.
 */
const fullscreen = useFullscreenDialog();

/**
 * Hands focus back to the control that opened the dialog once it closes.
 */
useReturnFocus(() => isOpen.value);

/**
 * The store's opening call.
 */
const { openReturn } = useReturnsStore();

/**
 * True while a call is in flight; disables submit so a double click cannot open two.
 */
const { loading } = storeToRefs(useReturnsStore());

/**
 * Staff's optional explanation, kept on the cancellation.
 */
const note = ref('');

/**
 * This dialog's own blocked state: a refusal (the window closed, a lost race, a step-up failure)
 * stays next to the button it blocked.
 */
const {
    message: cancelError,
    report: reportCancelError,
    clear: clearCancelError
} = useBlockingError();

/**
 * The refund, formatted in the order's currency.
 */
const refundText = computed(() => formatCurrency(props.option.refundAmount, props.currency));

/**
 * The delivery inside the refund, formatted; shown only when this cancel takes the last unit.
 */
const shippingText = computed(() => formatCurrency(props.option.shippingRefund, props.currency));

/**
 * Starts from an empty note every time the dialog opens.
 */
watch(isOpen, (open) => {
    if (!open) return;
    note.value = '';
    clearCancelError();
});

/**
 * Makes the cancellation: `POST /returns` with `kind: cancellation`.
 *
 * @returns A promise settling once the call finished; a refusal blocks the dialog in place.
 */
const submit = () => {
    clearCancelError();
    const trimmed = note.value.trim();
    return openReturn({
        orderId: props.orderId,
        kind: 'cancellation',
        fulfillmentOrderId: props.option.fulfillmentOrderId,
        // The buyer's door is their withdrawal; staff's has no legal reason, so it is "other".
        reason: props.mode === 'buyer' ? 'withdrawal' : 'other',
        ...(props.mode === 'staff' && trimmed ? { note: trimmed } : {})
    })
        .then(() => {
            addMessage(t('cancel-remainder-dialog.success'));
            isOpen.value = false;
            emit('cancelled');
        })
        .catch((error: unknown) => reportCancelError(error));
};
</script>

<template>
    <v-dialog
        v-model="isOpen"
        max-width="480"
        :fullscreen="fullscreen"
        data-test="cancel-remainder-dialog"
    >
        <v-card class="p-5">
            <h2 class="mb-3 text-lg font-semibold">
                {{ t('cancel-remainder-dialog.title', { number: option.number }) }}
            </h2>

            <p class="m-0 mb-2 text-sm">{{ t('cancel-remainder-dialog.lead') }}</p>
            <ul class="mb-3 flex list-disc flex-col gap-1 pl-5" data-test="cancel-remainder-lines">
                <li v-for="line in option.lines" :key="'cancel-line-' + line.productId">
                    {{ line.quantity }} × {{ line.title }}
                </li>
            </ul>

            <p class="m-0 font-semibold" data-test="cancel-remainder-refund">
                {{ t('cancel-remainder-dialog.refund', { amount: refundText }) }}
            </p>
            <p
                v-if="option.shippingRefund > 0"
                class="m-0 text-sm opacity-75"
                data-test="cancel-remainder-shipping"
            >
                {{ t('cancel-remainder-dialog.includes-shipping', { amount: shippingText }) }}
            </p>

            <v-textarea
                v-if="mode === 'staff'"
                v-model="note"
                class="mt-3"
                :label="t('cancel-remainder-dialog.label-note')"
                rows="2"
                maxlength="1000"
                density="compact"
                data-test="cancel-remainder-note"
            />

            <InlineErrorAlert
                class="mt-3"
                :message="cancelError"
                data-test="cancel-remainder-error"
            />

            <div class="mt-4 flex justify-end gap-2">
                <v-btn variant="tonal" data-test="cancel-remainder-back" @click="isOpen = false">
                    {{ t('generic.cancel') }}
                </v-btn>
                <v-btn
                    color="error"
                    :disabled="loading"
                    data-test="cancel-remainder-confirm"
                    @click="submit"
                >
                    {{ t('cancel-remainder-dialog.button-confirm') }}
                </v-btn>
            </div>
        </v-card>
    </v-dialog>
</template>
