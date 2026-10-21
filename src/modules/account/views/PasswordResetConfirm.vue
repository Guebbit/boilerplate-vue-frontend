<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
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
 * submit, and works unauthenticated same as this page itself. Not on `LinkTokenConfirmCard`: a
 * multi-field form with a cross-field rule and server field errors.
 */
import FormCard from '@/ui/organisms/FormCard.vue';
import { ref, watch } from 'vue';
import { z } from 'zod';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useAuthStore } from '../stores/auth.ts';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter.vue';
import { usersPasswordSchema } from '@/modules/users';
import { resetPasswordConfirmSchema } from '../schemas.ts';
import { usePasswordBreachCheck } from '../composables/use-password-breach-check.ts';
import { VUETIFY_INVALID_FIELD_SELECTOR } from '@/ui/vuetify/selectors.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { readLinkToken, useLinkTokenCleanup } from '@/infrastructure/utils/use-link-token.ts';
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
 * Reference to the mounted `FormCard`, read for its `<form>` element.
 */
const card = ref<InstanceType<typeof FormCard>>();

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
        token: readLinkToken(route),
        password: '',
        passwordConfirm: ''
    },
    z
        .object({
            token: z
                .string()
                .min(1, { error: () => t('password-reset-confirm-page.token-required') }),
            password: usersPasswordSchema,
            passwordConfirm: resetPasswordConfirmSchema
        })
        .refine((data) => data.password === data.passwordConfirm, {
            error: () => t('users-form.password-dont-match'),
            path: ['passwordConfirm']
        }),
    {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access -- TypeScript-ESLint cannot fully resolve a template ref's Vue SFC instance type (InstanceType<typeof FormCard>), even with `formElement` explicitly exposed via FormCard.vue's own defineExpose
        formElement: () => card.value?.formElement,
        revalidateOn: locale,
        invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
        onInvalid: () => addMessage(t('generic.fix-errors'))
    }
);

// The token is the only credential for this action; it must not linger in the URL (a `#token=` fragment) for every
// pageview and observability event after mount to carry to Umami, Faro and browser history.
useLinkTokenCleanup(route, router);

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
        applyServerErrors(error, { onUnmapped: () => reportConfirmError(error) });
    });
};
</script>

<template>
    <div id="password-reset-confirm-page">
        <FormCard
            ref="card"
            size="md"
            :submit-label="t('password-reset-confirm-page.button-submit')"
            :loading="isSubmitting"
            :back-to="routerLinkI18n({ name: 'Login' })"
            :back-label="t('password-reset-confirm-page.button-go-to-login')"
            @submit="submitForm"
        >
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
            <template #after-submit>
                <InlineErrorAlert
                    :message="confirmError"
                    :type="confirmErrorType"
                    class="mt-4"
                    data-test="password-reset-confirm-error"
                />
            </template>
        </FormCard>
    </div>
</template>
