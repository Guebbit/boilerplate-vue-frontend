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
 * Staff correcting where an unshipped order ships: the form a held `incorrect_address` group needs,
 * since nothing else changes an address after checkout. The owning page renders it only while the
 * order's own `actions.correctAddress` says the door is open, so this decides nothing about when;
 * a refusal that slipped through (the order shipped meanwhile) blocks the form in place.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { z } from 'zod';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { VUETIFY_INVALID_FIELD_SELECTOR } from '@/ui/vuetify/selectors.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { ISO_COUNTRY_CODES } from '@/infrastructure/utils/country-codes.ts';
import { countryLabel } from '@/i18n/country-label.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useOrdersStore } from '../store.ts';
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
 * Translation function and the reactive locale, which re-validates a form's messages.
 */
const { t, locale } = useI18n();

/**
 * Toast dispatcher, used to report the outcome.
 */
const { addMessage } = useNotificationsStore();

/**
 * The store's write and its in-flight flag.
 */
const ordersStore = useOrdersStore();

/**
 * True while an orders call is in flight; disables the submit so a double click cannot send two.
 */
const { loading } = storeToRefs(ordersStore);

/**
 * The `<form>` element, handed to the validation for its native-validity wiring.
 */
const formElement = ref<HTMLFormElement>();

/**
 * The contract's own rule — five non-empty strings — said in the operator's language. Messages are
 * thunks so they resolve in the active locale.
 */
const required = () =>
    z
        .string()
        .trim()
        .min(1, { error: () => t('shipping-address-form.error-required') });

/**
 * The form's rules; `phone` is optional and cleared by leaving it empty.
 */
const schema = z.object({
    fullName: required().max(100),
    street: required().max(200),
    city: required().max(100),
    zip: required().max(20),
    country: required(),
    phone: z.string().trim().max(32)
});

/**
 * Field state, errors and submit gating; starts from the address the order has now.
 */
const { form, formErrors, showFormErrors, handleSubmit, applyServerErrors } =
    useStructureFormValidation(
        {
            fullName: props.address?.fullName ?? '',
            street: props.address?.street ?? '',
            city: props.address?.city ?? '',
            zip: props.address?.zip ?? '',
            country: props.address?.country ?? '',
            phone: props.address?.phone ?? ''
        },
        schema,
        {
            formElement,
            revalidateOn: locale,
            invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
            onInvalid: () => addMessage(t('generic.fix-errors'))
        }
    );

/**
 * Every ISO country, localized and sorted for the select.
 */
const countryOptions = computed(() =>
    ISO_COUNTRY_CODES.map((code) => ({
        value: code,
        title: countryLabel(code, locale.value)
    })).toSorted((a, b) => a.title.localeCompare(b.title, locale.value))
);

/**
 * This form's own blocked state: the order shipped meanwhile, or has no address to redirect.
 */
const {
    message: addressError,
    report: reportAddressError,
    clear: clearAddressError
} = useBlockingError();

/**
 * Validates, then replaces the address.
 *
 * @returns A promise settling once the call finished; a refusal blocks the form in place.
 */
const submit = () =>
    handleSubmit(({ phone, ...rest }) => {
        clearAddressError();
        return ordersStore
            .correctShippingAddress(props.orderId, { ...rest, ...(phone ? { phone } : {}) })
            .then(() => {
                addMessage(t('shipping-address-form.success'));
                emit('corrected');
            })
            .catch((error: unknown) => {
                applyServerErrors(error, { onUnmapped: () => reportAddressError(error) });
            });
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
            :error-messages="showFormErrors ? (formErrors.fullName ?? []) : []"
            class="min-w-56 grow"
            hide-details="auto"
            data-test="shipping-address-full-name"
        />
        <v-text-field
            v-model="form.street"
            :label="t('shipping-address-form.label-street')"
            :error-messages="showFormErrors ? (formErrors.street ?? []) : []"
            class="min-w-56 grow"
            hide-details="auto"
            data-test="shipping-address-street"
        />
        <v-text-field
            v-model="form.city"
            :label="t('shipping-address-form.label-city')"
            :error-messages="showFormErrors ? (formErrors.city ?? []) : []"
            class="min-w-40 grow"
            hide-details="auto"
            data-test="shipping-address-city"
        />
        <v-text-field
            v-model="form.zip"
            :label="t('shipping-address-form.label-zip')"
            :error-messages="showFormErrors ? (formErrors.zip ?? []) : []"
            class="max-w-40"
            hide-details="auto"
            data-test="shipping-address-zip"
        />
        <v-select
            v-model="form.country"
            :items="countryOptions"
            :label="t('shipping-address-form.label-country')"
            :error-messages="showFormErrors ? (formErrors.country ?? []) : []"
            class="min-w-48"
            hide-details="auto"
            data-test="shipping-address-country"
        />
        <v-text-field
            v-model="form.phone"
            :label="t('shipping-address-form.label-phone')"
            :error-messages="showFormErrors ? (formErrors.phone ?? []) : []"
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
