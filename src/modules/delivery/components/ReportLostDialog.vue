<script setup lang="ts">
/**
 * @module
 * Staff reporting a parcel lost or damaged in transit: a reason (damaged means in transit, never
 * handed over), a note only colleagues read, and the message the BUYER reads and is mailed. The
 * dialog owns its call and reports the outcome in place.
 */
import { DIALOG_MAX_WIDTH } from '@/ui/organisms/dialog-width.ts';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import DialogShell from '@/ui/organisms/DialogShell.vue';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useDeliveryStore } from '../store.ts';
import type { Shipment, ShipmentLostReason } from '@types';

/**
 * The shipment that did not arrive.
 */
const props = defineProps<{
    shipment: Shipment;
}>();

/**
 * Emitted once the loss was recorded, so the owning page re-reads the order.
 */
const emit = defineEmits<
    /**
     * The shipment is now `lost`.
     */
    (event: 'reported') => void
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
 * The store's call and its in-flight flag.
 */
const deliveryStore = useDeliveryStore();

/**
 * True while any delivery call is in flight.
 */
const { loading } = storeToRefs(deliveryStore);

/**
 * The reasons on offer — the contract's own enum.
 */
const REASONS: ShipmentLostReason[] = ['lost', 'damaged'];

/**
 * The reason select's choices, translated.
 */
const reasonOptions = computed(() =>
    REASONS.map((reason) => ({ value: reason, title: t(`report-lost-dialog.reason-${reason}`) }))
);

/**
 * The chosen reason; empty until staff pick one, since a default would be a claim nobody made.
 */
const reason = ref<ShipmentLostReason | undefined>();

/**
 * Optional free text for the staff who read the record later.
 */
const note = ref('');

/**
 * Optional sentence for the buyer, mailed and shown on their order. The note stays staff's.
 */
const message = ref('');

/**
 * This dialog's own blocked state.
 */
const { message: lostError, report: reportLostError, clear: clearLostError } = useBlockingError();

/**
 * Starts from an empty form every time the dialog opens.
 */
watch(isOpen, (open) => {
    if (!open) return;
    reason.value = undefined;
    note.value = '';
    message.value = '';
    clearLostError();
});

/**
 * Records the loss.
 *
 * @returns A promise settling once the call finished; a refusal blocks the dialog in place.
 */
const submit = () => {
    if (!reason.value) return Promise.resolve();
    clearLostError();
    return deliveryStore
        .markLost(props.shipment.id, {
            reason: reason.value,
            ...(note.value.trim() ? { note: note.value.trim() } : {}),
            ...(message.value.trim() ? { message: message.value.trim() } : {})
        })
        .then(() => {
            addMessage(t('report-lost-dialog.success'));
            isOpen.value = false;
            emit('reported');
        })
        .catch((error: unknown) => reportLostError(error));
};
</script>

<template>
    <DialogShell
        v-model="isOpen"
        :max-width="DIALOG_MAX_WIDTH.form"
        data-test="report-lost-dialog"
        v-slot="{ titleId }"
    >
        <v-card class="p-5">
            <h2 :id="titleId" class="mb-4 text-lg font-semibold">
                {{ t('report-lost-dialog.title', { number: shipment.number }) }}
            </h2>

            <form class="flex flex-col gap-3" novalidate @submit.prevent="submit">
                <v-select
                    v-model="reason"
                    :items="reasonOptions"
                    :label="t('report-lost-dialog.label-reason')"
                    :hint="t('report-lost-dialog.hint-reason')"
                    persistent-hint
                    density="compact"
                    data-test="report-lost-reason"
                />
                <v-textarea
                    v-model="note"
                    :label="t('report-lost-dialog.label-note')"
                    :hint="t('report-lost-dialog.hint-note')"
                    persistent-hint
                    rows="2"
                    maxlength="1000"
                    density="compact"
                    data-test="report-lost-note"
                />
                <v-textarea
                    v-model="message"
                    :label="t('report-lost-dialog.label-message')"
                    :hint="t('report-lost-dialog.hint-message')"
                    persistent-hint
                    rows="2"
                    maxlength="500"
                    counter
                    density="compact"
                    data-test="report-lost-message"
                />

                <InlineErrorAlert :message="lostError" data-test="report-lost-error" />

                <div class="mt-2 flex justify-end gap-2">
                    <v-btn variant="tonal" data-test="report-lost-cancel" @click="isOpen = false">
                        {{ t('generic.cancel') }}
                    </v-btn>
                    <v-btn
                        type="submit"
                        color="primary"
                        :disabled="loading || !reason"
                        data-test="report-lost-submit"
                    >
                        {{ t('report-lost-dialog.button-report') }}
                    </v-btn>
                </div>
            </form>
        </v-card>
    </DialogShell>
</template>
