<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'ReturnRequestForm'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The customer's returns form: which of the order's lines come back (and how many), why, and an
 * optional note — `POST /returns` with a reason other than `withdrawal`. The right of withdrawal
 * stays its own reason-free button (`WithdrawalPanel`); this is for faulty or wrong goods, or any
 * other reason, and for sending back only part of an order. The server re-checks every limit, so
 * the form only keeps the customer from asking for the impossible.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { z } from 'zod';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { VUETIFY_INVALID_FIELD_SELECTOR } from '@/ui/vuetify/selectors.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useReturnsStore } from '../store.ts';
import type { ReturnableLine } from '../domain/returnable-lines.ts';

/**
 * The order and what can still come back from it.
 */
const props = defineProps<{
    orderId: string;
    /** The lines the form offers, each with how many are still returnable. */
    lines: ReturnableLine[];
}>();

/**
 * Emitted once the return was opened, so the owning page re-reads the order and the list.
 */
const emit = defineEmits<
    /**
     * A return went through.
     */
    (event: 'opened') => void
>();

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
 * True while a call is in flight; disables the submit so a double click cannot open two.
 */
const { loading } = storeToRefs(useReturnsStore());

/**
 * The reasons a customer may give. `withdrawal` is not among them: it is the panel's own button.
 */
const REASONS = ['defective', 'wrong_item', 'other'] as const;

/**
 * {@link REASONS} widened to plain strings, so a form value can be checked against it.
 */
const REASON_NAMES: readonly string[] = REASONS;

/**
 * The reason select's choices, translated.
 */
const reasonOptions = computed(() =>
    REASONS.map((reason) => ({ value: reason, title: t(`returns-form.reason-${reason}`) }))
);

/**
 * Whether the form is on screen: collapsed, the panel shows one button and nothing else.
 */
const expanded = ref(false);

/**
 * The form's element, handed to the validation for its native-validity wiring.
 */
const formElement = ref<HTMLFormElement>();

/**
 * One blocked state: a refusal the form cannot attach to a field (a closed window, a line the
 * server excludes) arrives as the server's own message and stays in place.
 */
const { message: openError, report: reportOpenError, clear: clearOpenError } = useBlockingError();

/**
 * How many of a product the customer may still send back, or 0 for one that is not on offer.
 *
 * @param productId - The line's product.
 * @returns The line's `remaining`.
 */
const remainingOf = (productId: string): number =>
    props.lines.find((line) => line.productId === productId)?.remaining ?? 0;

/**
 * Whether a typed quantity is a whole number from 1 up to what is left of that product.
 *
 * @param productId - The line's product.
 * @param value - What the quantity field holds.
 * @returns `true` when it can be sent as is.
 */
const isValidQuantity = (productId: string, value: string): boolean => {
    const quantity = Number(value);
    return Number.isInteger(quantity) && quantity >= 1 && quantity <= remainingOf(productId);
};

/**
 * The form's rules. `lines` holds one quantity string per SELECTED product, so "nothing picked"
 * and "a quantity out of range" are both a message on the line list.
 */
const schema = z.object({
    // A plain string, not `z.enum`: the form starts empty, and the field's type must admit that.
    reason: z.string().refine((value) => REASON_NAMES.includes(value), {
        error: () => t('returns-request.error-reason-required')
    }),
    note: z
        .string()
        .trim()
        .max(1000, { error: () => t('returns-request.error-note-too-long') }),
    lines: z
        .record(z.string(), z.string())
        .refine((picked) => Object.keys(picked).length > 0, {
            error: () => t('returns-request.error-lines-required')
        })
        .refine(
            (picked) =>
                Object.entries(picked).every(([productId, value]) =>
                    isValidQuantity(productId, value)
                ),
            { error: () => t('returns-request.error-quantity-invalid') }
        )
});

/**
 * The form's state, errors and submit gating. `reason` starts empty on purpose: a default reason
 * would be a claim the customer never made.
 */
const { form, formErrors, showFormErrors, handleSubmit, applyServerErrors, resetForm } =
    useStructureFormValidation({ reason: '', note: '', lines: {} }, schema, {
        formElement,
        revalidateOn: locale,
        invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
        onInvalid: () => addMessage(t('generic.fix-errors'))
    });

/**
 * Whether a product is ticked for return.
 *
 * @param productId - The line's product.
 * @returns `true` when it has a quantity in the form.
 */
const isPicked = (productId: string): boolean => productId in form.value.lines;

/**
 * Ticks or unticks a line. Ticking asks for everything that is left, the usual shape; the
 * customer lowers it. The record is replaced, not mutated, so the validation sees the change.
 *
 * @param productId - The line's product.
 * @param picked - Whether the checkbox is now ticked.
 */
const setPicked = (productId: string, picked: boolean) => {
    const { [productId]: _dropped, ...rest } = form.value.lines;
    form.value.lines = picked ? { ...rest, [productId]: String(remainingOf(productId)) } : rest;
};

/**
 * Sets the quantity of a ticked line.
 *
 * @param productId - The line's product.
 * @param value - What the field now holds.
 */
const setQuantity = (productId: string, value: string) => {
    form.value.lines = { ...form.value.lines, [productId]: value };
};

/**
 * Closes the form and forgets what was typed.
 */
const collapse = () => {
    resetForm();
    clearOpenError();
    expanded.value = false;
};

/**
 * Validates, then opens the return with only the ticked lines.
 *
 * @returns A promise settling once the call finished.
 */
const submit = () =>
    handleSubmit(({ reason, note, lines }) => {
        clearOpenError();
        const trimmedNote = note.trim();
        return openReturn({
            orderId: props.orderId,
            // Narrows the select's string to the reason union; the schema already refused anything else.
            reason: REASONS.find((choice) => choice === reason) ?? 'other',
            ...(trimmedNote === '' ? {} : { note: trimmedNote }),
            lines: Object.entries(lines).map(([productId, quantity]) => ({
                productId,
                quantity: Number(quantity)
            }))
        })
            .then(() => {
                addMessage(t('returns-request.success'));
                collapse();
                emit('opened');
            })
            .catch((error: unknown) => {
                // `false` means the rejection carried no field or form message at all (a bare 409,
                // a closed window): the blocking alert is then the only thing the customer sees.
                const shown = applyServerErrors(error, {
                    onUnmapped: () => reportOpenError(error)
                });
                if (!shown) reportOpenError(error);
            });
    });
</script>

<template>
    <div class="flex flex-col gap-3" data-test="return-request">
        <v-btn
            v-if="!expanded"
            variant="tonal"
            data-test="return-request-open"
            @click="expanded = true"
        >
            {{ t('returns-request.button-open') }}
        </v-btn>

        <form
            v-else
            ref="formElement"
            novalidate
            class="flex flex-col gap-3"
            data-test="return-request-form"
            @submit.prevent="submit"
        >
            <fieldset class="m-0 flex flex-col gap-2 border-0 p-0">
                <legend class="mb-1 text-sm font-semibold">
                    {{ t('returns-request.label-lines') }}
                </legend>
                <div
                    v-for="line in lines"
                    :key="'return-line-' + line.productId"
                    class="flex flex-wrap items-center justify-between gap-3"
                    :data-test="'return-line-' + line.productId"
                >
                    <v-checkbox
                        :model-value="isPicked(line.productId)"
                        :label="line.title"
                        hide-details
                        density="compact"
                        :data-test="'return-line-pick-' + line.productId"
                        @update:model-value="setPicked(line.productId, $event === true)"
                    />
                    <v-text-field
                        v-if="isPicked(line.productId)"
                        :model-value="form.lines[line.productId]"
                        type="number"
                        min="1"
                        :max="line.remaining"
                        step="1"
                        :label="t('returns-request.label-quantity', { max: line.remaining })"
                        density="compact"
                        hide-details
                        class="max-w-48"
                        :data-test="'return-line-quantity-' + line.productId"
                        @update:model-value="setQuantity(line.productId, String($event ?? ''))"
                    />
                </div>
                <p
                    v-if="showFormErrors && formErrors.lines?.length"
                    class="m-0 text-sm text-error"
                    role="alert"
                    data-test="return-lines-error"
                >
                    {{ formErrors.lines[0] }}
                </p>
            </fieldset>

            <v-select
                v-model="form.reason"
                :label="t('returns-request.label-reason')"
                :items="reasonOptions"
                item-title="title"
                item-value="value"
                :error-messages="showFormErrors ? (formErrors.reason ?? []) : []"
                hide-details="auto"
                data-test="return-reason"
            />

            <v-textarea
                v-model="form.note"
                :label="t('returns-request.label-note')"
                rows="3"
                maxlength="1000"
                counter
                :error-messages="showFormErrors ? (formErrors.note ?? []) : []"
                hide-details="auto"
                data-test="return-note"
            />

            <InlineErrorAlert :message="openError" data-test="return-request-error" />

            <div class="flex flex-wrap gap-2">
                <v-btn
                    type="submit"
                    color="primary"
                    data-test="return-request-submit"
                    :disabled="loading"
                >
                    {{ t('returns-request.button-submit') }}
                </v-btn>
                <v-btn variant="text" data-test="return-request-cancel" @click="collapse">
                    {{ t('returns-request.button-cancel') }}
                </v-btn>
            </div>
        </form>
    </div>
</template>
