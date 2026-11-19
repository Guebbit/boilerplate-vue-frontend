/**
 * @module
 * What the two staff address-correction forms share: the validated form state, the country options,
 * the submit that saves and reports, and the in-place blocked state for a refusal that slipped past
 * the page's own `actions` flag. The forms keep their own fields and their own save call (shipping
 * and billing are different doors with different bodies); this keeps the plumbing in one place.
 */
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import type { z } from 'zod';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { ISO_COUNTRY_CODES } from '@/infrastructure/utils/country-codes.ts';
import { countryLabel } from '@/i18n/country-label.ts';
import { useOrdersStore } from '../store.ts';

/**
 * What one correction form is made of.
 */
export interface AddressCorrectionOptions<T extends Record<string, string>> {
    /**
     * The fields the form starts from: the address the order has now.
     */
    initial: T;
    /**
     * The validation the form runs before it saves anything.
     */
    schema: z.ZodType<T>;
    /**
     * The write itself, called with the validated fields; rejects when the server refuses.
     */
    save: (values: T) => Promise<unknown>;
    /**
     * Locale key of the toast shown once the address was replaced.
     */
    successKey: string;
    /**
     * Called once the address was replaced, so the owning page re-reads the order.
     */
    onCorrected: () => void;
}

/**
 * Form state and submit for a staff address-correction form.
 *
 * @param options - The starting fields, the schema, the write and what follows it.
 * @returns The field state and errors, the country options, the in-flight flag, the blocked
 *  message and the submit handler to bind to the form.
 */
export const useAddressCorrectionForm = <T extends Record<string, string>>(
    options: AddressCorrectionOptions<T>
) => {
    /**
     * Translation function and the reactive locale, which re-validates a form's messages.
     */
    const { t, locale } = useI18n();

    /**
     * Toast dispatcher, used to report the outcome.
     */
    const { addMessage } = useNotificationsStore();

    /**
     * True while an orders call is in flight; disables the submit so a double click cannot send two.
     */
    const { loading } = storeToRefs(useOrdersStore());

    /**
     * The `<form>` element, handed to the validation for its native-validity wiring.
     */
    const formElement = ref<HTMLFormElement>();

    /**
     * Field state, errors and submit gating.
     */
    const { form, formErrors, showFormErrors, handleSubmit, applyServerErrors } =
        useStructureFormValidation<T>(options.initial, options.schema, {
            formElement,
            revalidateOn: locale,
            onInvalid: () => addMessage(t('generic.fix-errors'))
        });

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
     * The form's own blocked state: the door closed between the page's read and this write.
     */
    const {
        message: addressError,
        report: reportAddressError,
        clear: clearAddressError
    } = useBlockingError();

    /**
     * Validates, then saves. A refusal the fields explain lands on them; any other blocks the form
     * in place.
     *
     * @returns A promise settling once the call finished.
     */
    const submit = () =>
        handleSubmit((values) => {
            clearAddressError();
            return options
                .save(values)
                .then(() => {
                    addMessage(t(options.successKey));
                    options.onCorrected();
                })
                .catch((error: unknown) => {
                    applyServerErrors(error, { onUnmapped: () => reportAddressError(error) });
                });
        });

    return {
        formElement,
        form,
        formErrors,
        showFormErrors,
        countryOptions,
        loading,
        addressError,
        submit
    };
};
