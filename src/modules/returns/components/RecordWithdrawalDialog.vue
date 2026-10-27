<script setup lang="ts">
/**
 * @module
 * Staff recording a withdrawal the buyer stated by phone, email or letter: the day they sent it and
 * the channel, then `POST /returns` with `reason: withdrawal`. The server does everything the
 * buyer's own button does and judges the window on the day given, so a late-read withdrawal that
 * was sent in time is still accepted. It asks the password first (the http layer's step-up), since
 * this is a legal record that, before dispatch, also cancels and refunds the order.
 */
import { DIALOG_MAX_WIDTH } from '@/ui/organisms/dialog-width.ts';
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { z } from 'zod';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import DialogShell from '@/ui/organisms/DialogShell.vue';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useReturnsStore } from '../store.ts';
import {
    STATEMENT_CHANNELS,
    isStatedInTime,
    isStatementChannel,
    localToIso
} from '../domain/statement.ts';
import StatedAtFields from './StatedAtFields.vue';

/**
 * The order the buyer withdrew from.
 */
const props = defineProps<{
    orderId: string;
}>();

/**
 * Emitted once the withdrawal was recorded, so the owning page re-reads the order.
 */
const emit = defineEmits<
    /**
     * The withdrawal was recorded.
     */
    (event: 'recorded') => void
>();

/**
 * Two-way `v-model`: whether the dialog is open.
 */
const isOpen = defineModel<boolean>({ required: true });

/**
 * Translation function and the reactive locale, which re-validates a form's messages.
 */
const { t, locale } = useI18n();

/**
 * Toast dispatcher, used to report the outcome.
 */
const { addMessage } = useNotificationsStore();

/**
 * The store's opening call.
 */
const { openReturn } = useReturnsStore();

/**
 * True while a call is in flight; disables submit so a double click cannot record two.
 */
const { loading } = storeToRefs(useReturnsStore());

/**
 * The form's element, handed to the validation for its native-validity wiring.
 */
const formElement = ref<HTMLFormElement>();

/**
 * Both fields are required: the day the buyer sent it (not in the future) and how.
 */
const schema = z.object({
    requestedAt: z.string().refine((value) => value !== '' && isStatedInTime(value), {
        error: () => t('record-withdrawal-dialog.error-date-invalid')
    }),
    statedVia: z.string().refine((value) => isStatementChannel(value), {
        error: () => t('record-withdrawal-dialog.error-channel-required')
    })
});

/**
 * The form's state, errors and submit gating.
 */
const { form, formErrors, showFormErrors, handleSubmit, applyServerErrors, resetForm } =
    useStructureFormValidation({ requestedAt: '', statedVia: '' }, schema, {
        formElement,
        revalidateOn: locale,
        onInvalid: () => addMessage(t('generic.fix-errors'))
    });

/**
 * This dialog's own blocked state: a closed window, a missing key or a lost race stays next to the
 * button it blocked.
 */
const {
    message: recordError,
    report: reportRecordError,
    clear: clearRecordError
} = useBlockingError();

/**
 * Starts from an empty form every time the dialog opens.
 */
watch(isOpen, (open) => {
    if (!open) return;
    resetForm();
    clearRecordError();
});

/**
 * Validates, then records the withdrawal.
 *
 * @returns A promise settling once the call finished; a refusal blocks the dialog in place.
 */
const submit = () =>
    handleSubmit(({ requestedAt, statedVia }) => {
        clearRecordError();
        const channel = STATEMENT_CHANNELS.find((candidate) => candidate === statedVia);
        const stated = localToIso(requestedAt);
        // The schema already refused anything else; this narrows the two for the request type.
        if (!channel || !stated) return Promise.resolve();

        return openReturn({
            orderId: props.orderId,
            reason: 'withdrawal',
            requestedAt: stated,
            statedVia: channel
        })
            .then(() => {
                addMessage(t('record-withdrawal-dialog.success'));
                isOpen.value = false;
                emit('recorded');
            })
            .catch((error: unknown) => {
                applyServerErrors(error, { onUnmapped: () => reportRecordError(error) });
            });
    });
</script>

<template>
    <DialogShell
        v-model="isOpen"
        :max-width="DIALOG_MAX_WIDTH.form"
        data-test="record-withdrawal-dialog"
        v-slot="{ titleId }"
    >
        <v-card class="p-5">
            <h2 :id="titleId" class="mb-3 text-lg font-semibold">
                {{ t('record-withdrawal-dialog.title') }}
            </h2>
            <p class="m-0 mb-3 text-sm">{{ t('record-withdrawal-dialog.lead') }}</p>

            <form
                ref="formElement"
                novalidate
                class="flex flex-col gap-3"
                data-test="record-withdrawal-form"
                @submit.prevent="submit"
            >
                <StatedAtFields
                    v-model:requested-at="form.requestedAt"
                    v-model:stated-via="form.statedVia"
                    with-channel
                    date-required
                    :date-errors="showFormErrors ? (formErrors.requestedAt ?? []) : []"
                    :channel-errors="showFormErrors ? (formErrors.statedVia ?? []) : []"
                />

                <InlineErrorAlert :message="recordError" data-test="record-withdrawal-error" />

                <div class="flex justify-end gap-2">
                    <v-btn
                        variant="tonal"
                        data-test="record-withdrawal-back"
                        @click="isOpen = false"
                    >
                        {{ t('generic.cancel') }}
                    </v-btn>
                    <v-btn
                        type="submit"
                        color="error"
                        :disabled="loading"
                        data-test="record-withdrawal-confirm"
                    >
                        {{ t('record-withdrawal-dialog.button-confirm') }}
                    </v-btn>
                </div>
            </form>
        </v-card>
    </DialogShell>
</template>
