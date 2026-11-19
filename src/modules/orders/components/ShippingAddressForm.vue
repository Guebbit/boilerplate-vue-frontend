<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'ShippingAddressForm'
};
</script>

<script setup lang="ts">
/**
 * @module
 * @module
 * Staff correcting where an unshipped order ships: the form a held `incorrect_address` group needs,
 * since nothing else changes an address after checkout. The owning page renders it only while the
 * order's own `actions.correctAddress` says the door is open, so this decides nothing about when;
 * a refusal that slipped through (the order shipped meanwhile) blocks the form in place.
 */
import { fieldErrorProps } from '@/ui/vuetify/field-error.ts';
import { useI18n } from 'vue-i18n';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useOrdersStore } from '../store.ts';
import { shippingAddressCorrectionSchema } from '../schemas.ts';
import { useAddressCorrectionForm } from '../composables/use-address-correction-form.ts';
import type { OrderAddress } from '@types';

/**
 * The order, and the address it ships to now (the form starts from it).
 */
const props = defineProps<{
    orderId: string;
    address?: OrderAddress | undefined;
}>();

/**
 * Emitted once the address was replaced, so the owning page re-reads the order and its history.
 */
const emit = defineEmits<
    /**
     * The shipping address was corrected.
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
        phone: props.address?.phone ?? ''
    },
    schema: shippingAddressCorrectionSchema,
    save: ({ phone, ...rest }) =>
        ordersStore.correctShippingAddress(props.orderId, {
            ...rest,
            ...(phone ? { phone } : {})
        }),
    successKey: 'shipping-address-form.success',
    onCorrected: () => emit('corrected')
});
</script>

<template>
    <form
        ref="formElement"
        novalidate
        class="flex flex-wrap items-start gap-3"
        data-test="shipping-address-form"
        @submit.prevent="submit"
    >
        <v-text-field
            v-model="form.fullName"
            :label="t('shipping-address-form.label-full-name')"
            v-bind="fieldErrorProps(showFormErrors ? (formErrors.fullName ?? []) : [])"
            class="min-w-56 grow"
            hide-details="auto"
            data-test="shipping-address-full-name"
        />
        <v-text-field
            v-model="form.street"
            :label="t('shipping-address-form.label-street')"
            v-bind="fieldErrorProps(showFormErrors ? (formErrors.street ?? []) : [])"
            class="min-w-56 grow"
            hide-details="auto"
            data-test="shipping-address-street"
        />
        <v-text-field
            v-model="form.city"
            :label="t('shipping-address-form.label-city')"
            v-bind="fieldErrorProps(showFormErrors ? (formErrors.city ?? []) : [])"
            class="min-w-40 grow"
            hide-details="auto"
            data-test="shipping-address-city"
        />
        <v-text-field
            v-model="form.zip"
            :label="t('shipping-address-form.label-zip')"
            v-bind="fieldErrorProps(showFormErrors ? (formErrors.zip ?? []) : [])"
            class="max-w-40"
            hide-details="auto"
            data-test="shipping-address-zip"
        />
        <v-select
            v-model="form.country"
            :items="countryOptions"
            :label="t('shipping-address-form.label-country')"
            v-bind="fieldErrorProps(showFormErrors ? (formErrors.country ?? []) : [])"
            class="min-w-48"
            hide-details="auto"
            data-test="shipping-address-country"
        />
        <v-text-field
            v-model="form.phone"
            :label="t('shipping-address-form.label-phone')"
            v-bind="fieldErrorProps(showFormErrors ? (formErrors.phone ?? []) : [])"
            class="min-w-40"
            hide-details="auto"
            data-test="shipping-address-phone"
        />
        <v-btn
            type="submit"
            color="primary"
            :disabled="loading"
            data-test="shipping-address-submit"
        >
            {{ t('shipping-address-form.button-submit') }}
        </v-btn>
        <InlineErrorAlert
            :message="addressError"
            class="w-full"
            data-test="shipping-address-error"
        />
    </form>
</template>
