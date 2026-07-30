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

<script lang="ts">
export default {
    name: 'PasswordResetConfirmPage'
};
</script>

<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { z } from 'zod';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import { useProfileStore } from '@/stores/profile.ts';
import { createUsersPasswordSchema } from '@/features/users/schemas.ts';
import { notifyErrorMessages, focusFirstErrorField } from '@/utils/errors.ts';
import { routerLinkI18n } from '@/utils/i18n.ts';

/**
 * Form state: the one-time token (prefilled from the email link) plus the new
 * password and its confirmation.
 */
interface IPasswordResetConfirmForm {
    token?: string;
    password?: string;
    passwordConfirm?: string;
}

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const { addMessage } = useNotificationsStore();
const { confirmPasswordReset } = useProfileStore();
const zodSchemaUsersPassword = createUsersPasswordSchema(t);

const { form, formErrors, isSubmitting, handleSubmit } =
    useStructureFormValidation<IPasswordResetConfirmForm>(
        {
            token: typeof route.query.token === 'string' ? route.query.token : '',
            password: '',
            passwordConfirm: ''
        },
        z
            .object({
                token: z.string().min(1, t('password-reset-confirm-page.token-required')),
                password: zodSchemaUsersPassword,
                passwordConfirm: z.string().min(8, t('users-form.password-confirm-required'))
            })
            .refine((data) => data.password === data.passwordConfirm, {
                message: t('users-form.password-dont-match'),
                path: ['passwordConfirm']
            })
    );

const showErrors = ref(false);
const formElement = ref<HTMLFormElement>();

/**
 * Validates the form and sets the new password.
 *
 * @returns A promise resolving once the flow settles: on success a toast is
 *  shown and the user is sent to `Login`; on invalid input the errors are
 *  revealed and the first invalid field focused; API failures are reported as
 *  toasts.
 */
const submitForm = () =>
    handleSubmit(async () => {
        await confirmPasswordReset(
            form.value.token!,
            form.value.password!,
            form.value.passwordConfirm!
        );
        addMessage(t('password-reset-confirm-page.success'));
        showErrors.value = false;
        await router.push(routerLinkI18n({ name: 'Login' }));
    })
        .then(async (success) => {
            if (success) return;
            showErrors.value = true;
            addMessage(t('users-form.fix-errors'));
            await nextTick();
            focusFirstErrorField(formElement.value);
        })
        .catch((error) => notifyErrorMessages(addMessage, error));
</script>
