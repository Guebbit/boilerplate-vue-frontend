<script lang="ts">
export default {
    name: 'PasswordResetRequestPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Public request page: asks the backend for a reset token by email, and always shows the same
 * acknowledgement whether or not the account exists — see the e2e for the enumeration-safety
 * assertion.
 */
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { useAuthStore } from '@/modules/account/stores/auth.ts';
import { usersSchema } from '@/modules/users';
import {
    notifyErrorMessages,
    VUETIFY_INVALID_FIELD_SELECTOR
} from '@/infrastructure/utils/errors.ts';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';

/**
 * Translation function, and the currently active locale code.
 */
const { t, locale } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Sends the reset email. Answers the same way whether or not the address exists.
 */
const { requestPasswordReset } = useAuthStore();

/**
 * The `<form>` itself, so `useStructureFormValidation` can focus the first invalid field
 * on submit.
 */
const formElement = ref<HTMLFormElement>();

/**
 * Form state, error surface and submit handler, from the toolkit's form validation.
 */
const {
    form,
    formErrors,
    showFormErrors: showErrors,
    isSubmitting,
    handleSubmit,
    applyServerErrors
} = useStructureFormValidation<{
    email?: string;
}>({ email: '' }, usersSchema.pick({ email: true }), {
    formElement,
    revalidateOn: locale,
    invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
    onInvalid: () => addMessage(t('generic.fix-errors'))
});

/**
 * Validates the email and asks the backend for a reset token.
 *
 * @returns A promise resolving once the flow settles: on success a toast
 *  confirms the email was sent. Invalid input is revealed, announced and focused by the toolkit
 *  before the handler runs; API failures land on the field the server named, or as a toast.
 */
const submitForm = () =>
    handleSubmit(() =>
        requestPasswordReset(form.value.email!).then(() => {
            addMessage(t('password-reset-request-page.success'));
        })
    ).catch((error) => {
        if (!applyServerErrors(error)) notifyErrorMessages(addMessage, error);
    });
</script>

<template>
    <LayoutDefault
        id="password-reset-request-page"
        :title="t('password-reset-request-page.page-title')"
    >
        <v-card class="mx-auto mt-16 w-full max-w-md p-8">
            <form ref="formElement" novalidate @submit.prevent="submitForm">
                <v-text-field
                    v-model="form.email"
                    type="email"
                    autocomplete="email"
                    :label="t('password-reset-request-page.label-email')"
                    :error-messages="showErrors ? formErrors.email : []"
                />
                <v-btn
                    type="submit"
                    color="primary"
                    size="large"
                    block
                    :loading="isSubmitting"
                    class="mt-4"
                >
                    {{ t('password-reset-request-page.button-submit') }}
                </v-btn>
            </form>
            <div class="mt-4 flex justify-center">
                <v-btn variant="text" :to="routerLinkI18n({ name: 'Login' })">
                    {{ t('password-reset-request-page.button-go-to-login') }}
                </v-btn>
            </div>
        </v-card>
    </LayoutDefault>
</template>
