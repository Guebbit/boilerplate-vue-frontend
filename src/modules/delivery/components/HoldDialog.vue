<script setup lang="ts">
/**
 * @module
 * Staff hold one fulfillment order back: a reason from the three staff may give (never
 * `awaiting_stock`, which only the allocation of stock sets) and an optional note. The dialog owns
 * its call and reports the outcome in place. A second, separate text is the message the BUYER
 * reads: the note stays staff's.
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
import type { FulfillmentOrder, HoldFulfillmentOrderRequestReason } from '@types';

/**
 * The fulfillment order being held.
 */
const props = defineProps<{
    fulfillmentOrder: FulfillmentOrder;
}>();

/**
 * Emitted once the hold was placed, so the owning page re-reads the order.
 */
const emit = defineEmits<
    /**
     * The fulfillment order is now on hold.
     */
    (event: 'held') => void
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
 * The store's hold call and its in-flight flag.
 */
const deliveryStore = useDeliveryStore();

/**
 * True while any delivery call is in flight.
 */
const { loading } = storeToRefs(deliveryStore);

/**
 * The reasons staff may give — the contract's own enum minus `awaiting_stock`.
 */
const REASONS: HoldFulfillmentOrderRequestReason[] = ['incorrect_address', 'high_risk', 'other'];

/**
 * The reason select's choices, translated.
 */
const reasonOptions = computed(() =>
    REASONS.map((reason) => ({ value: reason, title: t(`hold-dialog.reason-${reason}`) }))
);

/**
 * The chosen reason; empty until staff pick one, since a default would be a claim nobody made.
 */
const reason = ref<HoldFulfillmentOrderRequestReason | undefined>();

/**
 * Optional free text for the staff who read the hold later.
 */
const note = ref('');

/**
 * Optional sentence for the buyer, mailed with the hold. Staff's note above stays staff's.
 */
const message = ref('');

/**
 * This dialog's own blocked state.
 */
const { message: holdError, report: reportHoldError, clear: clearHoldError } = useBlockingError();

/**
 * Starts from an empty form every time the dialog opens.
 */
watch(isOpen, (open) => {
    if (!open) return;
    reason.value = undefined;
    note.value = '';
    message.value = '';
    clearHoldError();
});

/**
 * Places the hold.
 *
 * @returns A promise settling once the call finished; a refusal blocks the dialog in place.
 */
const submit = () => {
    if (!reason.value) return Promise.resolve();
    clearHoldError();
    return deliveryStore
        .hold(props.fulfillmentOrder.id, {
            reason: reason.value,
            ...(note.value.trim() ? { note: note.value.trim() } : {}),
            ...(message.value.trim() ? { message: message.value.trim() } : {})
        })
        .then(() => {
            addMessage(t('hold-dialog.success'));
            isOpen.value = false;
            emit('held');
        })
        .catch((error: unknown) => reportHoldError(error));
};
</script>

<template>
    <v-dialog
        v-model="isOpen"
        max-width="480"
        :fullscreen="fullscreen"
        :aria-labelledby="titleId"
        data-test="hold-dialog"
    >
        <v-card class="p-5">
            <h2 :id="titleId" class="mb-4 text-lg font-semibold">
                {{ t('hold-dialog.title', { number: fulfillmentOrder.number }) }}
            </h2>

            <form class="flex flex-col gap-3" novalidate @submit.prevent="submit">
                <v-select
                    v-model="reason"
                    :items="reasonOptions"
                    :label="t('hold-dialog.label-reason')"
                    density="compact"
                    hide-details
                    data-test="hold-reason"
                />
                <v-textarea
                    v-model="note"
                    :label="t('hold-dialog.label-note')"
                    :hint="t('hold-dialog.hint-note')"
                    persistent-hint
                    rows="2"
                    maxlength="1000"
                    density="compact"
                    data-test="hold-note"
                />

                <v-textarea
                    v-model="message"
                    :label="t('hold-dialog.label-message')"
                    :hint="t('hold-dialog.hint-message')"
                    persistent-hint
                    rows="2"
                    maxlength="500"
                    counter
                    density="compact"
                    data-test="hold-message"
                />

                <InlineErrorAlert :message="holdError" data-test="hold-error" />

                <div class="mt-2 flex justify-end gap-2">
                    <v-btn variant="tonal" data-test="hold-cancel" @click="isOpen = false">
                        {{ t('generic.cancel') }}
                    </v-btn>
                    <v-btn
                        type="submit"
                        color="primary"
                        :disabled="loading || !reason"
                        data-test="hold-submit"
                    >
                        {{ t('hold-dialog.button-hold') }}
                    </v-btn>
                </div>
            </form>
        </v-card>
    </v-dialog>
</template>
