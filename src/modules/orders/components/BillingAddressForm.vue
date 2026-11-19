<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'BillingAddressForm'
};
</script>

<script setup lang="ts">
/**
 * @module
 * @module
 * Staff correcting who an order is invoiced to: the name, address or VAT number the buyer wrote in
 * about. An invoice already issued is cancelled and reissued by the server, so this form is the
 * whole door: there is no second step. The owning page renders it only while the order's own
 * `actions.correctBilling` says it is open, so this decides nothing about when; a refusal that
 * slipped through (retention erased the order meanwhile) blocks the form in place.
 */
import { fieldErrorProps } from '@/ui/vuetify/field-error.ts';
import { useI18n } from 'vue-i18n';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useOrdersStore } from '../store.ts';
import { billingAddressCorrectionSchema } from '../schemas.ts';
import { useAddressCorrectionForm } from '../composables/use-address-correction-form.ts';
import type { OrderBillingAddress } from '@types';

/**
 * The order, and the address it is invoiced to now (the form starts from it).
 */
const props = defineProps<{
    orderId: string;
    address?: OrderBillingAddress | undefined;
}>();

/**
 * Emitted once the address was replaced, so the owning page re-reads the order and its history.
 */
const emit = defineEmits<
    /**
     * The billing address was corrected.
     */
    (event: 'corrected') => void
>();

/**
 * Translation function for the labels.
 */
const { t } = useI18n();

/**
 * The store's write.
 */
const ordersStore = useOrdersStore();

/**
 * Field state, errors, country options and the submit, starting from the address the order has now.
 */
const {
    formElement,
    form,
    formErrors,
    showFormErrors,
    countryOptions,
    loading,
    addressError,
    submit
} = useAddressCorrectionForm({
    initial: {
        fullName: props.address?.fullName ?? '',
        street: props.address?.street ?? '',
        city: props.address?.city ?? '',
        zip: props.address?.zip ?? '',
        country: props.address?.country ?? '',
        phone: props.address?.phone ?? '',
        vatNumber: props.address?.vatNumber ?? ''
    },
    schema: billingAddressCorrectionSchema,
    save: ({ phone, vatNumber, ...rest }) =>
        ordersStore.correctBillingAddress(props.orderId, {
            ...rest,
            ...(phone ? { phone } : {}),
            // Typed in any case; the contract's pattern wants it upper-cased.
            ...(vatNumber ? { vatNumber: vatNumber.toUpperCase() } : {})
        }),
    successKey: 'billing-address-form.success',
    onCorrected: () => emit('corrected')
});
</script>

<template>
    <form
        ref="formElement"
        novalidate
        class="flex flex-wrap items-start gap-3"
        data-test="billing-address-form"
        @submit.prevent="submit"
    >
        <v-text-field
            v-model="form.fullName"
            :label="t('billing-address-form.label-full-name')"
            v-bind="fieldErrorProps(showFormErrors ? (formErrors.fullName ?? []) : [])"
            class="min-w-56 grow"
            hide-details="auto"
            data-test="billing-address-full-name"
        />
        <v-text-field
            v-model="form.street"
            :label="t('billing-address-form.label-street')"
            v-bind="fieldErrorProps(showFormErrors ? (formErrors.street ?? []) : [])"
            class="min-w-56 grow"
            hide-details="auto"
            data-test="billing-address-street"
        />
        <v-text-field
            v-model="form.city"
            :label="t('billing-address-form.label-city')"
            v-bind="fieldErrorProps(showFormErrors ? (formErrors.city ?? []) : [])"
            class="min-w-40 grow"
            hide-details="auto"
            data-test="billing-address-city"
        />
        <v-text-field
            v-model="form.zip"
            :label="t('billing-address-form.label-zip')"
            v-bind="fieldErrorProps(showFormErrors ? (formErrors.zip ?? []) : [])"
            class="max-w-40"
            hide-details="auto"
            data-test="billing-address-zip"
        />
        <v-select
            v-model="form.country"
            :items="countryOptions"
            :label="t('billing-address-form.label-country')"
            v-bind="fieldErrorProps(showFormErrors ? (formErrors.country ?? []) : [])"
            class="min-w-48"
            hide-details="auto"
            data-test="billing-address-country"
        />
        <v-text-field
            v-model="form.phone"
            :label="t('billing-address-form.label-phone')"
            v-bind="fieldErrorProps(showFormErrors ? (formErrors.phone ?? []) : [])"
            class="min-w-40"
            hide-details="auto"
            data-test="billing-address-phone"
        />
        <v-text-field
            v-model="form.vatNumber"
            :label="t('billing-address-form.label-vat-number')"
            v-bind="fieldErrorProps(showFormErrors ? (formErrors.vatNumber ?? []) : [])"
            class="min-w-48"
            hide-details="auto"
            data-test="billing-address-vat-number"
        />
        <v-btn type="submit" color="primary" :disabled="loading" data-test="billing-address-submit">
            {{ t('billing-address-form.button-submit') }}
        </v-btn>
        <InlineErrorAlert
            :message="addressError"
            class="w-full"
            data-test="billing-address-error"
        />
    </form>
</template>
