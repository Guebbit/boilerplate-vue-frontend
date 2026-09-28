<script lang="ts">
export default {
    name: 'PasswordResetConfirmPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Public confirm page for a password reset: the emailed one-time token is the credential, and
 * the zod schema chains a `.refine` to check the two password fields match before the store is
 * called. The breach check (`usePasswordBreachCheck`) is advisory only — it never blocks this
 * submit, and works unauthenticated same as this page itself.
 */
import { ref, watch } from 'vue';
import { z } from 'zod';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { useAuthStore } from '@/modules/account/stores/auth.ts';
import PasswordStrengthMeter from '@/modules/account/components/PasswordStrengthMeter.vue';
import { usersPasswordSchema } from '@/modules/users';
import { usePasswordBreachCheck } from '@/modules/account/composables/use-password-breach-check.ts';
import { VUETIFY_INVALID_FIELD_SELECTOR } from '@/ui/vuetify/selectors.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useClearQueryOnMount } from '@/infrastructure/utils/use-clear-query-on-mount.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { routerLinkI18n } from '@/i18n/router-link.ts';

/**
 * Form state: the one-time token (prefilled from the email link) plus the new
 * password and its confirmation.
 */
interface PasswordResetConfirmForm {
    token?: string;
    password?: string;
    passwordConfirm?: string;
}

/**
 * Translation function, and the currently active locale code.
 */
const { t, locale } = useI18n();

/**
 * Current route, read for its params, query and name.
 */
const route = useRoute();

/**
 * Router instance, for the navigations this file performs.
 */
const router = useRouter();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Sets the new password against the emailed token.
 */
const { confirmPasswordReset } = useAuthStore();

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
} = useStructureFormValidation<PasswordResetConfirmForm>(
    {
        token: typeof route.query.token === 'string' ? route.query.token : '',
        password: '',
        passwordConfirm: ''
    },
    z
        .object({
            token: z
                .string()
                .min(1, { error: () => t('password-reset-confirm-page.token-required') }),
            password: usersPasswordSchema,
            passwordConfirm: z
                .string()
                .min(8, { error: () => t('users-form.password-confirm-required') })
        })
        .refine((data) => data.password === data.passwordConfirm, {
            error: () => t('users-form.password-dont-match'),
            path: ['passwordConfirm']
        }),
    {
        formElement,
        revalidateOn: locale,
        invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
        onInvalid: () => addMessage(t('generic.fix-errors'))
    }
);

// The token is the only credential for this action; it must not linger in the URL for every
// pageview and observability event after mount to carry to Umami, Faro and browser history.
useClearQueryOnMount(route, router);

/**
 * Advisory breach check for the new password field — never a submit gate, see `@module`.
 */
const { breached: passwordBreached, check: checkPasswordBreach } = usePasswordBreachCheck();

// Debounced inside the composable — this fires on every keystroke, the check itself does not.
watch(
    () => form.value.password,
    (password) => checkPasswordBreach(password ?? '')
);

/**
 * This submit's own blocked state — a spent or unknown token names no field, so it lands here
 * instead of a toast, next to the button the visitor just pressed.
 */
const {
    message: confirmError,
    type: confirmErrorType,
    report: reportConfirmError,
    clear: clearConfirmError
} = useBlockingError();

/**
 * Validates the form and sets the new password.
 *
 * @returns A promise resolving once the flow settles: on success a toast is
 *  shown and the user is sent to `Login`. Invalid input is revealed, announced and focused by the
 *  toolkit before the handler runs; API failures land on the field the server named, or block the
 *  form in place ({@link confirmError}).
 */
const submitForm = () => {
    clearConfirmError();
    return handleSubmit(() =>
        confirmPasswordReset(form.value.token!, form.value.password!, form.value.passwordConfirm!)
            .then(() => {
                addMessage(t('password-reset-confirm-page.success'));
                return router.push(routerLinkI18n({ name: 'Login' }));
            })
            // Swallows `router.push`'s resolved value: it is a `NavigationFailure | undefined`,
            // which the submit handler's `Promise<void>` will not take, and a failed navigation is
            // the router's own `onError` to report rather than this form's.
            .then(() => undefined)
    ).catch((error) => {
        if (!applyServerErrors(error)) reportConfirmError(error);
    });
};
</script>

<template>
    <LayoutDefault
        id="password-reset-confirm-page"
        :title="t('password-reset-confirm-page.page-title')"
    >
        <v-card class="mx-auto mt-16 w-full max-w-md p-8">
            <form ref="formElement" novalidate @submit.prevent="submitForm">
                <v-text-field
                    v-model="form.token"
                    :label="t('password-reset-confirm-page.label-token')"
                    :error-messages="showErrors ? formErrors.token : []"
                    class="mb-2"
                />
                <v-text-field
                    v-model="form.password"
                    type="password"
                    autocomplete="new-password"
                    :label="t('password-reset-confirm-page.label-password')"
                    :error-messages="showErrors ? formErrors.password : []"
                    class="mb-2"
                />
                <PasswordStrengthMeter :password="form.password ?? ''" />
                <!-- Advisory only, never a submit gate — the four password-SET paths remain the
                     actual authority, checked again server-side regardless of this warning. -->
                <v-alert
                    v-if="passwordBreached"
                    type="warning"
                    density="compact"
                    variant="tonal"
                    class="mb-2"
                    data-test="password-breach-warning"
                >
                    {{ t('users-form.password-breached-warning') }}
                </v-alert>
                <v-text-field
                    v-model="form.passwordConfirm"
                    type="password"
                    autocomplete="new-password"
                    :label="t('password-reset-confirm-page.label-password-confirm')"
                    :error-messages="showErrors ? formErrors.passwordConfirm : []"
                />
                <v-btn
                    type="submit"
                    color="primary"
                    size="large"
                    block
                    :loading="isSubmitting"
                    class="mt-4"
                >
                    {{ t('password-reset-confirm-page.button-submit') }}
                </v-btn>
                <InlineErrorAlert
                    :message="confirmError"
                    :type="confirmErrorType"
                    class="mt-4"
                    data-test="password-reset-confirm-error"
                />
            </form>

            <div class="mt-4 flex justify-center">
                <v-btn variant="text" :to="routerLinkI18n({ name: 'Login' })">
                    {{ t('password-reset-confirm-page.button-go-to-login') }}
                </v-btn>
            </div>
        </v-card>
    </LayoutDefault>
</template>
