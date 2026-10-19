<script setup lang="ts">
/**
 * @module
 * Pauses checkout for one account: an end date and a note the buyer reads with the refusal.
 * The note is written to be read by the person it is about (the reason and a way to contest it,
 * GDPR Art. 22(3)), so the form says so. A plain `v-model` component; the page owns the write.
 */
import { computed, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useFullscreenDialog } from '@/ui/composables/use-fullscreen-dialog.ts';
import { useReturnFocus } from '@/ui/composables/use-return-focus.ts';
import type { SetPurchaseHoldRequest } from '@types';

/**
 * Who the hold is for; `undefined` while the dialog is closed.
 */
defineProps<{
    target?: { id: string; name: string };
}>();

/**
 * Emitted when the admin confirms (with the request body) or backs out.
 */
const emit = defineEmits<{
    confirm: [hold: SetPurchaseHoldRequest];
    cancel: [];
}>();

/**
 * Two-way `v-model`.
 */
const isOpen = defineModel<boolean>({ required: true });

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * The heading's id, so the dialog is announced by its title.
 */
const titleId = useId();

/**
 * Whether the dialog fills the screen — it does on a phone.
 */
const fullscreen = useFullscreenDialog();

/**
 * Hands focus back to the control that opened the dialog.
 */
useReturnFocus(() => isOpen.value);

/**
 * The end date on screen, as `YYYY-MM-DD`.
 */
const untilDate = ref('');

/**
 * The note on screen.
 */
const note = ref('');

/**
 * Today as `YYYY-MM-DD` in UTC, the earliest end date offered tomorrow.
 *
 * @returns The date string one day after today.
 */
const tomorrow = (): string => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

/**
 * Re-seeds the form every time the dialog opens: one instance serves every user.
 */
watch(isOpen, (open) => {
    if (!open) return;
    untilDate.value = tomorrow();
    note.value = '';
});

/**
 * Whether the date on screen is a real day from tomorrow on.
 */
const dateValid = computed(
    () => /^\d{4}-\d{2}-\d{2}$/.test(untilDate.value) && untilDate.value >= tomorrow()
);

/**
 * Confirms: the hold ends at the close of the chosen day, UTC.
 */
const handleConfirm = () => {
    if (!dateValid.value) return;
    const trimmed = note.value.trim();
    emit('confirm', {
        until: `${untilDate.value}T23:59:59.999Z`,
        ...(trimmed === '' ? {} : { note: trimmed })
    });
};

/**
 * Backs out without writing anything.
 */
const handleCancel = () => {
    isOpen.value = false;
    emit('cancel');
};
</script>

<template>
    <v-dialog
        v-model="isOpen"
        max-width="480"
        :fullscreen="fullscreen"
        :aria-labelledby="titleId"
        data-test="user-purchase-hold-dialog"
    >
        <v-card v-if="target" class="p-5">
            <h2 :id="titleId" class="mb-2 text-lg font-semibold">
                {{ t('user-purchase-hold-dialog.title', { name: target.name }) }}
            </h2>
            <p class="mb-4 opacity-80">{{ t('user-purchase-hold-dialog.intro') }}</p>

            <div class="flex flex-col gap-3">
                <v-text-field
                    v-model="untilDate"
                    type="date"
                    :min="tomorrow()"
                    :label="t('user-purchase-hold-dialog.label-until')"
                    :hint="t('user-purchase-hold-dialog.hint-until')"
                    :error-messages="dateValid ? [] : [t('user-purchase-hold-dialog.error-until')]"
                    persistent-hint
                    data-test="user-purchase-hold-until"
                />
                <v-textarea
                    v-model="note"
                    :label="t('user-purchase-hold-dialog.label-note')"
                    :hint="t('user-purchase-hold-dialog.hint-note')"
                    maxlength="500"
                    rows="3"
                    persistent-hint
                    data-test="user-purchase-hold-note"
                />
            </div>

            <div class="mt-4 flex justify-end gap-2">
                <v-btn variant="tonal" data-test="user-purchase-hold-cancel" @click="handleCancel">
                    {{ t('generic.cancel') }}
                </v-btn>
                <v-btn
                    color="primary"
                    :disabled="!dateValid"
                    data-test="user-purchase-hold-confirm"
                    @click="handleConfirm"
                >
                    {{ t('user-purchase-hold-dialog.button-confirm') }}
                </v-btn>
            </div>
        </v-card>
    </v-dialog>
</template>
