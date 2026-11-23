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
 * The staff's six moves on a return — approve, decline (with the reason the customer is told),
 * record the carrier's proof of sending (once; on a withdrawal it opens the refund, and on a faulty
 * or wrong item staff may choose "refund on proof" to open it too), receive (with a restock count per line, the remedy for a faulty or wrong item and an optional
 * handling deduction), close by hand (with an optional note, when the
 * money will not follow the usual way), cancel (with an optional note, when the goods never came). Which of them is open is the server's
 * `Return.actions`; this component renders that answer and re-implements none of the lifecycle.
 */
import { fieldErrorProps } from '@/ui/vuetify/field-error.ts';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getCurrentLocale } from '@/i18n';
import { storeToRefs } from 'pinia';
import { z } from 'zod';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import {
    NON_NEGATIVE_DECIMAL,
    decimalScale,
    normalizeAmount,
    padDecimal
} from '@/infrastructure/utils/money.ts';
import { formatDateTime } from '@/infrastructure/utils/formatters.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useSessionStore } from '@/infrastructure/session.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useReturnsStore } from '../store.ts';
import {
    cancelNoteMax,
    cancelNoteSchema,
    closeNoteMax,
    closeNoteSchema,
    DECLINE_REASONS,
    declineMessageMax,
    declineMessageSchema,
    declineReasonSchema
} from '../schemas.ts';
import { hasRemedyChoice, REMEDIES } from '../domain/remedy.ts';
import type { PaidOutside, Return } from '@types';
import { PaidOutsideFields } from '@/modules/payments';

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
 * The six moves.
 */
const { approve, decline, receive, recordProof, close, cancel } = useReturnsStore();

/**
 * True while any move is in flight; disables every button so two cannot race from one screen.
 */
const { loading } = storeToRefs(useReturnsStore());

/**
 * One blocked state for the moves: a lost race (409) or a refused amount (422) arrives as the
 * server's own message and stays in place.
 */
const { message: moveError, report: reportMoveError, clear: clearMoveError } = useBlockingError();

/**
 * Signed-in caller, to tell staff (who read returns) from the buyer, who is never shown how many
 * units went back on sale.
 */
const session = useSessionStore();

/**
 * Whether to list how many units of each line went back on sale: staff only, once the goods were
 * received.
 */
const showRestocked = computed(
    () =>
        session.can('read', 'Return') &&
        props.item.lines.some((line) => line.restocked !== undefined)
);

/**
 * The decline form's element, handed to the validation for its native-validity wiring.
 */
const declineElement = ref<HTMLFormElement>();

/**
 * Decline needs a reason code, and a message to the buyer when the code is `other`: "other" alone
 * tells them nothing.
 */
const declineSchema = z
    .object({
        reason: declineReasonSchema,
        message: declineMessageSchema
    })
    .refine(({ reason, message }) => reason !== 'other' || message !== '', {
        path: ['message'],
        error: () => t('return-staff-actions.error-message-required')
    });

/**
 * The reason select's choices, translated.
 */
const declineOptions = computed(() =>
    DECLINE_REASONS.map((reason) => ({
        value: reason,
        title: t(`return-staff-actions.decline-reason-${reason}`)
    }))
);

/**
 * The decline form's state, errors and submit gating.
 */
const {
    form: declineForm,
    formErrors: declineErrors,
    showFormErrors: showDeclineErrors,
    handleSubmit: handleDeclineSubmit,
    applyServerErrors: applyDeclineErrors
} = useStructureFormValidation({ reason: '', message: '' }, declineSchema, {
    formElement: declineElement,
    revalidateOn: locale,
    onInvalid: () => addMessage(t('generic.fix-errors'))
});

/**
 * The receive form's element.
 */
const receiveElement = ref<HTMLFormElement>();

/**
 * Whether the buyer's reason is under the legal guarantee: staff then choose the remedy, and no
 * handling deduction applies (a guarantee remedy is free of charge).
 */
const underGuarantee = computed(() => hasRemedyChoice(props.item.reason));

/**
 * The remedy choices, translated, in the law's order.
 */
const remedyOptions = computed(() =>
    REMEDIES.map((remedy) => ({
        value: remedy,
        title: t(`return-staff-actions.remedy-${remedy}`)
    }))
);

/**
 * How many units of one returned line go back on sale, as the field's string: a whole number from
 * 0 (a broken unit) up to the line's quantity.
 *
 * @param quantity - The line's quantity.
 * @param value - What the field holds.
 * @returns `true` when it can be sent as is.
 */
const isValidRestock = (quantity: number, value: string | undefined): boolean => {
    const count = Number(value);
    return (
        value !== undefined &&
        value !== '' &&
        Number.isInteger(count) &&
        count >= 0 &&
        count <= quantity
    );
};

/**
 * Every returned line, all of it going back on sale: staff lower the count of a broken one.
 *
 * @returns The line's product id → its quantity, as the fields' strings.
 */
const startingRestock = (): Record<string, string> =>
    Object.fromEntries(props.item.lines.map((line) => [line.productId, String(line.quantity)]));

/**
 * The handling deduction is a plain number field's string: empty (none kept) or a non-negative
 * amount in the return's currency. The restock counts are one string per returned line.
 */
const receiveSchema = z.object({
    handlingDeduction: z
        .string()
        .refine(
            (value) =>
                value === '' ||
                NON_NEGATIVE_DECIMAL.test(normalizeAmount(value, getCurrentLocale())),
            {
                error: () => t('return-staff-actions.error-deduction-invalid')
            }
        ),
    remedy: z.string(),
    restock: z
        .record(z.string(), z.string())
        .refine(
            (counts) =>
                props.item.lines.every((line) =>
                    isValidRestock(line.quantity, counts[line.productId])
                ),
            { error: () => t('return-staff-actions.error-restock-invalid') }
        )
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
} = useStructureFormValidation(
    {
        handlingDeduction: '',
        /**
         * The buyer's wish is preselected; staff may give another (Art. 13(3)). A refund that
         * opened on the proof of sending is the only remedy left.
         */
        remedy: props.item.refundOnProof ? 'refund' : (props.item.preferredRemedy ?? 'refund'),
        restock: startingRestock()
    },
    receiveSchema,
    {
        formElement: receiveElement,
        revalidateOn: locale,
        onInvalid: () => addMessage(t('generic.fix-errors'))
    }
);

/**
 * Sets the restock count of one line, replacing the record so the validation sees the change.
 *
 * @param productId - The line's product.
 * @param value - What the field now holds.
 */
const setRestock = (productId: string, value: string) => {
    receiveForm.value.restock = { ...receiveForm.value.restock, [productId]: value };
};

/**
 * Staff's statement that the buyer was already paid back outside the app, or `undefined`. It rides
 * beside the receive form's fields, not in its schema: the contract's own shape is sent as it is.
 */
const paidOutside = ref<PaidOutside>();

/**
 * Whether the statement is offered: the caller may refund (`create:Refund`, which the server
 * demands for it on top of `receive:Return`), and the remedy is a refund — a replacement or a
 * repair moves no money.
 */
const canPayOutside = computed(
    () =>
        session.can('create', 'Refund') &&
        (!underGuarantee.value || receiveForm.value.remedy === 'refund')
);

/**
 * The proof-of-sending form's element.
 */
const proofElement = ref<HTMLFormElement>();

/**
 * The proof is the carrier's document: its date (not in the future), the carrier and the
 * reference, each required plain text.
 */
const proofSchema = z.object({
    sentAt: z
        .string()
        .refine((value) => value !== '' && new Date(`${value}T00:00:00`) <= new Date(), {
            error: () => t('return-staff-actions.error-proof-date-invalid')
        }),
    carrier: z
        .string()
        .trim()
        .min(1, { error: () => t('return-staff-actions.error-proof-text-required') })
        .max(200),
    reference: z
        .string()
        .trim()
        .min(1, { error: () => t('return-staff-actions.error-proof-text-required') })
        .max(200),
    refundOnProof: z.boolean()
});

/**
 * The proof form's state, errors and submit gating.
 */
const {
    form: proofForm,
    formErrors: proofErrors,
    showFormErrors: showProofErrors,
    handleSubmit: handleProofSubmit,
    applyServerErrors: applyProofErrors
} = useStructureFormValidation(
    { sentAt: '', carrier: '', reference: '', refundOnProof: false },
    proofSchema,
    {
        formElement: proofElement,
        revalidateOn: locale,
        onInvalid: () => addMessage(t('generic.fix-errors'))
    }
);

/**
 * Whether the proof opens the refund: a withdrawal's always does; a faulty or wrong item's only
 * when staff tick "refund on proof" (otherwise the remedy is chosen at receipt). Only its button
 * says "refund".
 */
const proofOpensRefund = computed(
    () =>
        props.item.reason === 'withdrawal' ||
        (underGuarantee.value && proofForm.value.refundOnProof)
);

/**
 * The close form's element.
 */
const closeElement = ref<HTMLFormElement>();

/**
 * Closing takes an optional note: the audit row keeps it, nothing else reads it.
 */
const closeSchema = z.object({
    note: closeNoteSchema
});

/**
 * The close form's state, errors and submit gating.
 */
const {
    form: closeForm,
    formErrors: closeErrors,
    showFormErrors: showCloseErrors,
    handleSubmit: handleCloseSubmit,
    applyServerErrors: applyCloseErrors
} = useStructureFormValidation({ note: '' }, closeSchema, {
    formElement: closeElement,
    revalidateOn: locale,
    onInvalid: () => addMessage(t('generic.fix-errors'))
});

/**
 * The cancel form's element.
 */
const cancelElement = ref<HTMLFormElement>();

/**
 * Canceling takes an optional note: the audit row keeps it, nothing else reads it.
 */
const cancelSchema = z.object({
    note: cancelNoteSchema
});

/**
 * The cancel form's state, errors and submit gating.
 */
const {
    form: cancelForm,
    formErrors: cancelErrors,
    showFormErrors: showCancelErrors,
    handleSubmit: handleCancelSubmit,
    applyServerErrors: applyCancelErrors
} = useStructureFormValidation({ note: '' }, cancelSchema, {
    formElement: cancelElement,
    revalidateOn: locale,
    onInvalid: () => addMessage(t('generic.fix-errors'))
});

/**
 * Runs one move: clears the blocked state, reports success, tells the page, or blocks in place.
 *
 * @param move - The store call.
 * @param success - The toast key.
 * @param applyFieldErrors - The submitting form's own `applyServerErrors`, so a refusal that
 *  names one of its fields lands on it; absent for a move with no form. It calls `onUnmapped`
 *  for whatever no field took, which is what makes the general error appear.
 * @param owed - The toast key for a move that answered `received` (its money still owed), when
 *  that differs from `success`.
 * @returns A promise settling once the move finished.
 */
const run = (
    move: () => Promise<unknown>,
    success: string,
    applyFieldErrors?: (error: unknown, options: { onUnmapped: () => void }) => boolean,
    owed?: string
) => {
    clearMoveError();
    return move()
        .then((moved) => {
            // A receipt whose refund has not landed yet is still a receipt: say the money is owed.
            const stillOwed =
                owed !== undefined &&
                (moved as { status?: string } | undefined)?.status === 'received';
            addMessage(t(stillOwed ? owed : success));
            emit('changed');
        })
        .catch((error: unknown) => {
            /**
             * `onUnmapped` also runs, with `[]`, for a rejection that carried no field or form
             * message at all (a bare 409, a network failure): the blocking alert is then the only
             * thing the staff member sees. A move with no form has no field to land on.
             */
            if (applyFieldErrors)
                applyFieldErrors(error, { onUnmapped: () => reportMoveError(error) });
            else reportMoveError(error);
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
    handleDeclineSubmit(({ reason, message }) => {
        // The schema already refused anything but a listed code; this narrows it for the store.
        const code = DECLINE_REASONS.find((candidate) => candidate === reason);
        if (!code) return Promise.resolve();
        return run(
            () => decline(props.item.id, code, message === '' ? undefined : message),
            'return-staff-actions.success-decline',
            applyDeclineErrors
        );
    });

/**
 * Validates the deduction and the restock counts, then records the goods as received. Only a line
 * set below its quantity is sent: no body at all means everything goes back and nothing is kept.
 *
 * @returns A promise settling once the move finished.
 */
const submitReceive = () =>
    handleReceiveSubmit(({ handlingDeduction, remedy, restock }) => {
        // The schema keeps `remedy` a string; the contract's union is narrowed from the list.
        const chosen = REMEDIES.find((candidate) => candidate === remedy);
        const lowered = props.item.lines
            .filter((line) => Number(restock[line.productId]) !== line.quantity)
            .map((line) => ({
                productId: line.productId,
                restock: Number(restock[line.productId])
            }));
        const body = {
            // A deduction is not offered under the guarantee, so none is ever sent for it.
            ...(handlingDeduction === '' || underGuarantee.value
                ? {}
                : {
                      handlingDeduction: padDecimal(
                          normalizeAmount(handlingDeduction, getCurrentLocale()),
                          decimalScale(props.item.lines[0]?.unitPrice ?? '')
                      )
                  }),
            ...(underGuarantee.value && chosen ? { remedy: chosen } : {}),
            ...(lowered.length > 0 ? { lines: lowered } : {}),
            ...(canPayOutside.value && paidOutside.value ? { paidOutside: paidOutside.value } : {})
        };
        // A repair or a replacement moves no money, so there is no refund to wait for.
        const moneyStays = body.remedy === 'repair' || body.remedy === 'replace';
        return run(
            () => receive(props.item.id, Object.keys(body).length > 0 ? body : undefined),
            moneyStays
                ? 'return-staff-actions.success-receive-remedy'
                : 'return-staff-actions.success-receive',
            applyReceiveErrors,
            'refund-notice.receive-owed'
        );
    });

/**
 * Validates the carrier's document, then records the proof. The date is the start of that day in the
 * staff member's own zone, so today's date is never read as the future.
 *
 * @returns A promise settling once the move finished.
 */
const submitProof = () =>
    handleProofSubmit(({ sentAt, carrier, reference, refundOnProof }) =>
        run(
            () =>
                recordProof(props.item.id, {
                    sentAt: new Date(`${sentAt}T00:00:00`).toISOString(),
                    carrier: carrier.trim(),
                    reference: reference.trim(),
                    // The choice exists for a faulty or wrong item only; the server refuses it elsewhere.
                    ...(underGuarantee.value && refundOnProof ? { refundOnProof: true } : {})
                }),
            proofOpensRefund.value
                ? 'return-staff-actions.success-proof-refund'
                : 'return-staff-actions.success-proof',
            applyProofErrors
        )
    );

/**
 * Validates the optional note, then closes the return by hand.
 *
 * @returns A promise settling once the move finished.
 */
const submitClose = () =>
    handleCloseSubmit(({ note }) =>
        run(
            () => close(props.item.id, note === '' ? undefined : note),
            'return-staff-actions.success-close',
            applyCloseErrors
        )
    );

/**
 * Validates the optional note, then cancels the return.
 *
 * @returns A promise settling once the move finished.
 */
const submitCancel = () =>
    handleCancelSubmit(({ note }) =>
        run(
            () => cancel(props.item.id, note === '' ? undefined : note),
            'return-staff-actions.success-cancel',
            applyCancelErrors
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
            <v-select
                v-model="declineForm.reason"
                :items="declineOptions"
                item-title="title"
                item-value="value"
                :label="t('return-staff-actions.label-reason')"
                v-bind="fieldErrorProps(showDeclineErrors ? (declineErrors.reason ?? []) : [])"
                class="w-full grow sm:w-auto sm:min-w-64"
                hide-details="auto"
                data-test="return-decline-reason"
            />
            <v-textarea
                v-model="declineForm.message"
                :label="t('return-staff-actions.label-message')"
                :hint="t('return-staff-actions.hint-message')"
                persistent-hint
                rows="2"
                :maxlength="declineMessageMax"
                v-bind="fieldErrorProps(showDeclineErrors ? (declineErrors.message ?? []) : [])"
                class="w-full grow sm:w-auto sm:min-w-64"
                hide-details="auto"
                data-test="return-decline-message"
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
            v-if="item.actions?.recordProof"
            ref="proofElement"
            novalidate
            class="flex flex-wrap items-start gap-3"
            data-test="return-proof-form"
            @submit.prevent="submitProof"
        >
            <fieldset class="m-0 flex w-full flex-col gap-2 border-0 p-0">
                <legend class="mb-1 text-sm font-semibold">
                    {{ t('return-staff-actions.label-proof-title') }}
                </legend>
                <p class="m-0 text-sm opacity-75">{{ t('return-staff-actions.hint-proof') }}</p>
                <v-text-field
                    v-model="proofForm.sentAt"
                    type="date"
                    :label="t('return-staff-actions.label-proof-sent-at')"
                    v-bind="fieldErrorProps(showProofErrors ? (proofErrors.sentAt ?? []) : [])"
                    class="max-w-72"
                    hide-details="auto"
                    data-test="return-proof-sent-at"
                />
                <v-text-field
                    v-model="proofForm.carrier"
                    :label="t('return-staff-actions.label-proof-carrier')"
                    maxlength="200"
                    v-bind="fieldErrorProps(showProofErrors ? (proofErrors.carrier ?? []) : [])"
                    class="max-w-72"
                    hide-details="auto"
                    data-test="return-proof-carrier"
                />
                <v-text-field
                    v-model="proofForm.reference"
                    :label="t('return-staff-actions.label-proof-reference')"
                    maxlength="200"
                    v-bind="fieldErrorProps(showProofErrors ? (proofErrors.reference ?? []) : [])"
                    class="max-w-72"
                    hide-details="auto"
                    data-test="return-proof-reference"
                />
                <!-- Staff accept the buyer ending the contract: the refund opens now, as on a withdrawal. -->
                <v-checkbox
                    v-if="underGuarantee"
                    v-model="proofForm.refundOnProof"
                    :label="t('return-staff-actions.label-refund-on-proof')"
                    :hint="t('return-staff-actions.hint-refund-on-proof')"
                    persistent-hint
                    data-test="return-proof-refund-on-proof"
                />
            </fieldset>
            <v-btn type="submit" color="primary" data-test="return-proof" :disabled="loading">
                {{
                    proofOpensRefund
                        ? t('return-staff-actions.button-proof-refund')
                        : t('return-staff-actions.button-proof')
                }}
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
            <fieldset class="m-0 flex w-full flex-col gap-2 border-0 p-0">
                <legend class="mb-1 text-sm font-semibold">
                    {{ t('return-staff-actions.label-restock') }}
                </legend>
                <p class="m-0 text-sm opacity-75">{{ t('return-staff-actions.hint-restock') }}</p>
                <v-text-field
                    v-for="line in item.lines"
                    :key="'restock-' + line.productId"
                    :model-value="receiveForm.restock[line.productId]"
                    type="number"
                    min="0"
                    :max="line.quantity"
                    step="1"
                    :label="
                        t('return-staff-actions.label-restock-line', {
                            title: line.title,
                            max: line.quantity
                        })
                    "
                    density="compact"
                    hide-details
                    class="max-w-72"
                    :data-test="'return-receive-restock-' + line.productId"
                    @update:model-value="setRestock(line.productId, String($event ?? ''))"
                />
                <p
                    v-if="showReceiveErrors && receiveErrors.restock?.length"
                    class="m-0 text-sm text-error"
                    role="alert"
                    data-test="return-receive-restock-error"
                >
                    {{ receiveErrors.restock[0] }}
                </p>
            </fieldset>
            <v-radio-group
                v-if="underGuarantee"
                v-model="receiveForm.remedy"
                :label="t('return-staff-actions.label-remedy')"
                :hint="
                    item.refundOnProof
                        ? t('return-staff-actions.hint-remedy-locked')
                        : t('return-staff-actions.hint-remedy')
                "
                :disabled="item.refundOnProof === true"
                persistent-hint
                inline
                class="w-full"
                data-test="return-receive-remedy"
            >
                <v-radio
                    v-for="option in remedyOptions"
                    :key="'remedy-' + option.value"
                    :label="option.title"
                    :value="option.value"
                    :data-test="'return-receive-remedy-' + option.value"
                />
            </v-radio-group>
            <v-text-field
                v-if="!underGuarantee"
                v-model="receiveForm.handlingDeduction"
                inputmode="decimal"
                :label="t('return-staff-actions.label-deduction', { currency: item.currency })"
                v-bind="
                    fieldErrorProps(
                        showReceiveErrors ? (receiveErrors.handlingDeduction ?? []) : []
                    )
                "
                class="min-w-48"
                hide-details="auto"
                data-test="return-receive-deduction"
            />
            <!-- The refund is recorded as paid by hand and no card is asked: the buyer was paid already. -->
            <PaidOutsideFields v-if="canPayOutside" v-model="paidOutside" class="w-full" />
            <v-btn type="submit" color="primary" data-test="return-receive" :disabled="loading">
                {{ t('return-staff-actions.button-receive') }}
            </v-btn>
        </form>

        <form
            v-if="item.actions?.close"
            ref="closeElement"
            novalidate
            class="flex flex-wrap items-start gap-3"
            data-test="return-close-form"
            @submit.prevent="submitClose"
        >
            <v-text-field
                v-model="closeForm.note"
                :label="t('return-staff-actions.label-close-note')"
                :hint="t('return-staff-actions.hint-close')"
                persistent-hint
                v-bind="fieldErrorProps(showCloseErrors ? (closeErrors.note ?? []) : [])"
                :maxlength="closeNoteMax"
                class="w-full grow sm:w-auto sm:min-w-64"
                hide-details="auto"
                data-test="return-close-note"
            />
            <v-btn type="submit" variant="tonal" data-test="return-close" :disabled="loading">
                {{ t('return-staff-actions.button-close') }}
            </v-btn>
        </form>

        <form
            v-if="item.actions?.cancel"
            ref="cancelElement"
            novalidate
            class="flex flex-wrap items-start gap-3"
            data-test="return-cancel-form"
            @submit.prevent="submitCancel"
        >
            <v-text-field
                v-model="cancelForm.note"
                :label="t('return-staff-actions.label-cancel-note')"
                :hint="t('return-staff-actions.hint-cancel')"
                persistent-hint
                v-bind="fieldErrorProps(showCancelErrors ? (cancelErrors.note ?? []) : [])"
                :maxlength="cancelNoteMax"
                class="w-full grow sm:w-auto sm:min-w-64"
                hide-details="auto"
                data-test="return-cancel-note"
            />
            <v-btn
                type="submit"
                color="error"
                variant="tonal"
                data-test="return-cancel"
                :disabled="loading"
            >
                {{ t('return-staff-actions.button-cancel') }}
            </v-btn>
        </form>

        <p v-if="item.proofOfSendingAt" class="m-0 text-sm" data-test="return-proof-recorded">
            {{
                t('return-staff-actions.proof-recorded', {
                    date: formatDateTime(item.proofOfSendingAt),
                    carrier: item.proofCarrier ?? '',
                    reference: item.proofReference ?? ''
                })
            }}
        </p>

        <ul
            v-if="showRestocked"
            class="m-0 flex list-none flex-col gap-1 p-0 text-sm"
            data-test="return-restocked"
        >
            <li v-for="line in item.lines" :key="'restocked-' + line.productId">
                {{
                    t('return-staff-actions.restocked-line', {
                        title: line.title,
                        restocked: line.restocked ?? 0,
                        quantity: line.quantity
                    })
                }}
            </li>
        </ul>

        <InlineErrorAlert :message="moveError" data-test="return-move-error" />
    </div>
</template>
