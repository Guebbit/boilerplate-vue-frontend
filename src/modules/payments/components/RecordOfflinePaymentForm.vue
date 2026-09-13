<script lang="ts">
export default {
    name: 'RecordOfflinePaymentForm'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The operator's "money arrived another way" form — cash at the counter, a phone order paid by
 * transfer. One call, `useRecordOfflinePayment`, settles the order exactly as a card payment would;
 * this component owns only the field state and reports back once it lands.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { z } from 'zod';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { RecordOfflinePaymentRequestMethod } from '@types';
import { usePaymentsStore } from '../store.ts';
import { useRecordOfflinePayment } from '../composables/use-record-offline-payment.ts';
import {
    notifyErrorMessages,
    VUETIFY_INVALID_FIELD_SELECTOR
} from '@/infrastructure/utils/errors.ts';

/**
 * The order this form pays. Only rendered by the caller while the order is still payable, so this
 * component itself decides nothing about when it may run — a 409 from the API (a card charge
 * already in flight) surfaces as a toast, same as any other refusal here.
 */
const props = defineProps<{
    orderId: string;
}>();

/**
 * Emitted once the money is recorded, so the owning page reloads the order — its status moved
 * `pending → paid` server-side, which this form's own state does not reflect.
 */
const emit = defineEmits<
    /**
     * Recorded and settled.
     */
    (event: 'recorded') => void
>();

/**
 * Translation function.
 */
const { t, locale } = useI18n();

/**
 * Toast dispatcher, used to report the outcome.
 */
const { addMessage } = useNotificationsStore();

/**
 * True while the record write is in flight; binds to the submit button, same flag the panel uses.
 */
const { loading } = storeToRefs(usePaymentsStore());

/**
 * The one call this form performs.
 */
const { recordOfflinePayment } = useRecordOfflinePayment(computed(() => props.orderId));

/**
 * The three offline methods the admin may pick — `card` is not one of them, that path is the
 * customer's own checkout.
 */
const methods = Object.values(RecordOfflinePaymentRequestMethod);

/**
 * The `<form>` element, handed to `useStructureFormValidation` for its native-validity wiring.
 */
const formElement = ref<HTMLFormElement>();

/**
 * Validation schema. `receivedAt` is a plain HTML date input's string — either empty (omitted from
 * the request, so the API defaults it to now) or `YYYY-MM-DD`, converted to a full timestamp at
 * submit time since the contract wants an ISO date-TIME.
 */
const schema = z.object({
    method: z.enum(RecordOfflinePaymentRequestMethod, {
        error: () => t('record-offline-payment-form.error-method-required')
    }),
    reference: z.string().max(120).optional(),
    receivedAt: z.string().optional()
});

/**
 * Field state, errors and submit gating.
 */
const { form, formErrors, showFormErrors, handleSubmit } = useStructureFormValidation(
    { method: methods[0], reference: '', receivedAt: '' },
    schema,
    {
        formElement,
        revalidateOn: locale,
        invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
        onInvalid: () => addMessage(t('generic.fix-errors'))
    }
);

/**
 * Validates and sends the record, then clears the form and tells the parent to reload the order.
 *
 * The interesting failures — the order is no longer payable, or a card charge is still reachable
 * at the provider — arrive as the server's own message, carried through verbatim.
 */
const submitForm = () =>
    handleSubmit(({ method, reference, receivedAt }) =>
        recordOfflinePayment({
            method,
            reference: reference || undefined,
            receivedAt: receivedAt ? new Date(`${receivedAt}T00:00`).toISOString() : undefined
        })
            .then(() => {
                addMessage(t('record-offline-payment-form.success'));
                form.value.reference = '';
                form.value.receivedAt = '';
                emit('recorded');
            })
            .catch((error: unknown) => notifyErrorMessages(addMessage, error))
    );
</script>

<template>
    <form
        ref="formElement"
        novalidate
        class="flex flex-wrap items-start gap-3"
        data-test="record-offline-payment-form"
        @submit.prevent="submitForm"
    >
        <v-select
            v-model="form.method"
            :items="
                methods.map((value) => ({
                    value,
                    title: t(`record-offline-payment-form.method-${value}`)
                }))
            "
            :label="t('record-offline-payment-form.label-method')"
            :error-messages="showFormErrors ? (formErrors.method ?? []) : []"
            data-test="record-offline-method"
            class="min-w-48"
            hide-details="auto"
        />
        <v-text-field
            v-model="form.reference"
            :label="t('record-offline-payment-form.label-reference')"
            :error-messages="showFormErrors ? (formErrors.reference ?? []) : []"
            data-test="record-offline-reference"
            class="min-w-40 grow"
            hide-details="auto"
        />
        <v-text-field
            v-model="form.receivedAt"
            type="date"
            :label="t('record-offline-payment-form.label-received-at')"
            :error-messages="showFormErrors ? (formErrors.receivedAt ?? []) : []"
            data-test="record-offline-received-at"
            class="max-w-48"
            hide-details="auto"
        />
        <v-btn type="submit" color="primary" data-test="record-offline-submit" :disabled="loading">
            {{ t('record-offline-payment-form.button-submit') }}
        </v-btn>
    </form>
</template>
