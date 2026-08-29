<script lang="ts">
export default {
    name: 'PasswordResetConfirmPage'
};
</script>

<script setup lang="ts">
import { ref } from 'vue';
import { z } from 'zod';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useAppForm } from '@/infrastructure/composables/use-app-form.ts';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import { useAccountStore } from '@/modules/account/store.ts';
import { usersPasswordSchema } from '@/modules/users';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';

/**
 * Form state: the one-time token (prefilled from the email link) plus the new
 * password and its confirmation.
 */
interface PasswordResetConfirmForm {
    token?: string;
    password?: string;
    passwordConfirm?: string;
}

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { addMessage } = useNotificationsStore();
const { confirmPasswordReset } = useAccountStore();

const formElement = ref<HTMLFormElement>();

const {
    form,
    formErrors,
    showFormErrors: showErrors,
    isSubmitting,
    handleSubmit,
    applyServerErrors
} = useAppForm<PasswordResetConfirmForm>(
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
    { formElement }
);

/**
 * Validates the form and sets the new password.
 *
 * @returns A promise resolving once the flow settles: on success a toast is
 *  shown and the user is sent to `Login`. Invalid input is revealed, announced and focused by the
 *  toolkit before the handler runs; API failures land on the field the server named, or as a toast.
 */
const submitForm = () =>
    handleSubmit(() =>
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
        if (!applyServerErrors(error)) notifyErrorMessages(addMessage, error);
    });
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
            </form>

            <div class="mt-4 flex justify-center">
                <v-btn variant="text" :to="routerLinkI18n({ name: 'Login' })">
                    {{ t('password-reset-confirm-page.button-go-to-login') }}
                </v-btn>
            </div>
        </v-card>
    </LayoutDefault>
</template>
