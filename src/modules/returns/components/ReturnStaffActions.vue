<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'ReturnStaffActions'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The staff's three moves on a return — approve, decline (with the reason the customer is told),
 * receive (with an optional handling deduction). Which of them is open is the server's
 * `Return.actions`; this component renders that answer and re-implements none of the lifecycle.
 */
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { z } from 'zod';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { VUETIFY_INVALID_FIELD_SELECTOR } from '@/ui/vuetify/selectors.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useReturnsStore } from '../store.ts';
import type { Return } from '@types';

/**
 * The return being worked on, with the caller's `actions`.
 */
const props = defineProps<{
    item: Return;
}>();

/**
 * Emitted after any move landed, so the page re-reads what the move changed elsewhere (the order's
 * statuses, the money).
 */
const emit = defineEmits<
    /**
     * A move on the return went through.
     */
    (event: 'changed') => void
>();

/**
 * Translation function and the reactive locale, which re-validates a form's messages.
 */
const { t, locale } = useI18n();

/**
 * Toast dispatcher, used to report each outcome.
 */
const { addMessage } = useNotificationsStore();

/**
 * The three moves.
 */
const { approve, decline, receive } = useReturnsStore();

/**
 * True while any move is in flight; disables every button so two cannot race from one screen.
 */
const { loading } = storeToRefs(useReturnsStore());

/**
 * One blocked state for the three moves: a lost race (409) or a refused amount (422) arrives as the
 * server's own message and stays in place.
 */
const { message: moveError, report: reportMoveError, clear: clearMoveError } = useBlockingError();

/**
 * The decline form's element, handed to the validation for its native-validity wiring.
 */
const declineElement = ref<HTMLFormElement>();

/**
 * Decline needs a reason — a refusal nobody explains is not one.
 */
const declineSchema = z.object({
    reason: z
        .string()
        .trim()
        .min(1, { error: () => t('return-staff-actions.error-reason-required') })
        .max(500)
});

/**
 * The decline form's state, errors and submit gating.
 */
const {
    form: declineForm,
    formErrors: declineErrors,
    showFormErrors: showDeclineErrors,
    handleSubmit: handleDeclineSubmit,
    applyServerErrors: applyDeclineErrors
} = useStructureFormValidation({ reason: '' }, declineSchema, {
    formElement: declineElement,
    revalidateOn: locale,
    invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
    onInvalid: () => addMessage(t('generic.fix-errors'))
});

/**
 * The receive form's element.
 */
const receiveElement = ref<HTMLFormElement>();

/**
 * The handling deduction is a plain number field's string: empty (none kept) or a non-negative
 * amount in the return's currency.
 */
const receiveSchema = z.object({
    handlingDeduction: z.string().refine((value) => value === '' || Number(value) >= 0, {
        error: () => t('return-staff-actions.error-deduction-invalid')
    })
});

/**
 * The receive form's state, errors and submit gating.
 */
const {
    form: receiveForm,
    formErrors: receiveErrors,
    showFormErrors: showReceiveErrors,
    handleSubmit: handleReceiveSubmit,
    applyServerErrors: applyReceiveErrors
} = useStructureFormValidation({ handlingDeduction: '' }, receiveSchema, {
    formElement: receiveElement,
    revalidateOn: locale,
    invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
    onInvalid: () => addMessage(t('generic.fix-errors'))
});

/**
 * Runs one move: clears the blocked state, reports success, tells the page, or blocks in place.
 *
 * @param move - The store call.
 * @param success - The toast key.
 * @param applyFieldErrors - The submitting form's own `applyServerErrors`, so a refusal that
 *  names one of its fields lands on it; absent for a move with no form. Its `false` answer (nothing
 *  was shown) makes the general error appear.
 * @returns A promise settling once the move finished.
 */
const run = (
    move: () => Promise<unknown>,
    success: string,
    applyFieldErrors?: (error: unknown, options: { onUnmapped: () => void }) => boolean
) => {
    clearMoveError();
    return move()
        .then(() => {
            addMessage(t(success));
            emit('changed');
        })
        .catch((error: unknown) => {
            // `false` means the rejection carried no field or form message at all (a bare 409, a
            // network failure): the blocking alert is then the only thing the staff member sees.
            const shown =
                applyFieldErrors?.(error, { onUnmapped: () => reportMoveError(error) }) ?? false;
            if (!shown) reportMoveError(error);
        });
};

/**
 * Approves the request.
 *
 * @returns A promise settling once the move finished.
 */
const handleApprove = () =>
    run(() => approve(props.item.id), 'return-staff-actions.success-approve');

/**
 * Validates the reason, then declines.
 *
 * @returns A promise settling once the move finished.
 */
const submitDecline = () =>
    handleDeclineSubmit(({ reason }) =>
        run(
            () => decline(props.item.id, reason),
            'return-staff-actions.success-decline',
            applyDeclineErrors
        )
    );

/**
 * Validates the deduction, then records the goods as received.
 *
 * @returns A promise settling once the move finished.
 */
const submitReceive = () =>
    handleReceiveSubmit(({ handlingDeduction }) =>
        run(
            () =>
                receive(
                    props.item.id,
                    handlingDeduction === ''
                        ? undefined
                        : { handlingDeduction: Number(handlingDeduction) }
                ),
            'return-staff-actions.success-receive',
            applyReceiveErrors
        )
    );
</script>

<template>
    <div class="flex flex-col gap-4" data-test="return-staff-actions">
        <v-btn
            v-if="item.actions?.approve"
            color="primary"
            data-test="return-approve"
            :disabled="loading"
            @click="handleApprove"
        >
            {{ t('return-staff-actions.button-approve') }}
        </v-btn>

        <form
            v-if="item.actions?.decline"
            ref="declineElement"
            novalidate
            class="flex flex-wrap items-start gap-3"
            data-test="return-decline-form"
            @submit.prevent="submitDecline"
        >
            <v-text-field
                v-model="declineForm.reason"
                :label="t('return-staff-actions.label-reason')"
                :error-messages="showDeclineErrors ? (declineErrors.reason ?? []) : []"
                maxlength="500"
                class="min-w-64 grow"
                hide-details="auto"
                data-test="return-decline-reason"
            />
            <v-btn
                type="submit"
                color="error"
                variant="tonal"
                data-test="return-decline"
                :disabled="loading"
            >
                {{ t('return-staff-actions.button-decline') }}
            </v-btn>
        </form>

        <form
            v-if="item.actions?.receive"
            ref="receiveElement"
            novalidate
            class="flex flex-wrap items-start gap-3"
            data-test="return-receive-form"
            @submit.prevent="submitReceive"
        >
            <v-text-field
                v-model="receiveForm.handlingDeduction"
                type="number"
                min="0"
                step="0.01"
                :label="t('return-staff-actions.label-deduction', { currency: item.currency })"
                :error-messages="showReceiveErrors ? (receiveErrors.handlingDeduction ?? []) : []"
                class="min-w-48"
                hide-details="auto"
                data-test="return-receive-deduction"
            />
            <v-btn type="submit" color="primary" data-test="return-receive" :disabled="loading">
                {{ t('return-staff-actions.button-receive') }}
            </v-btn>
        </form>

        <InlineErrorAlert :message="moveError" data-test="return-move-error" />
    </div>
</template>
