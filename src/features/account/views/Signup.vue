<template>
    <LayoutDefault id="signup-page" :title="t('signup-page.page-title')">
        <v-card class="mx-auto mt-16 w-full max-w-md p-8">
            <form ref="formElement" novalidate @submit.prevent="submitForm">
                <v-text-field
                    v-model="form.email"
                    type="email"
                    autocomplete="email"
                    :label="t('signup-page.label-email')"
                    :error-messages="showErrors ? formErrors.email : []"
                    class="mb-2"
                />
                <v-text-field
                    v-model="form.password"
                    type="password"
                    autocomplete="new-password"
                    :label="t('signup-page.label-password')"
                    :error-messages="showErrors ? formErrors.password : []"
                    class="mb-2"
                />
                <v-text-field
                    v-model="form.passwordConfirm"
                    type="password"
                    autocomplete="new-password"
                    :label="t('users-form.label-passwordConfirm')"
                    :error-messages="showErrors ? formErrors.passwordConfirm : []"
                />
                <v-checkbox
                    v-model="form.conditions"
                    :label="t('signup-page.text-conditions')"
                    :error-messages="showErrors ? formErrors.conditions : []"
                />
                <v-btn
                    type="submit"
                    color="primary"
                    size="large"
                    block
                    :loading="isSubmitting"
                    class="mt-2"
                >
                    {{ t('signup-page.button-submit') }}
                </v-btn>
            </form>
        </v-card>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'SignupPage'
};
</script>

<script setup lang="ts">
import { nextTick, ref } from 'vue';
import { z } from 'zod';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useProfileStore } from '@/stores/profile.ts';
import { useRouter, useRoute } from 'vue-router';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import { createUsersSchema } from '@/features/users/schemas.ts';
import { notifyErrorMessages, focusFirstErrorField } from '@/utils/errors.ts';

/**
 * UI logics
 */
const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const router = useRouter();
const route = useRoute();

/**
 * Form logics
 */
interface IUserSignupForm {
    email?: string;
    username?: string;
    password?: string;
    passwordConfirm?: string;
    conditions?: boolean;
}

const { form, formErrors, isSubmitting, handleSubmit } =
    useStructureFormValidation<IUserSignupForm>(
        {
            email: '',
            username: '',
            password: '',
            passwordConfirm: '',
            conditions: false
        },
        () =>
            createUsersSchema(t)
                .pick({ email: true })
                .extend({
                    password: z.string().min(8, t('users-form.password-required')),
                    passwordConfirm: z.string().min(8, t('users-form.password-confirm-required')),
                    conditions: z.boolean().refine((value) => value, {
                        message: t('users-form.conditions-required')
                    })
                })
                .refine((data) => data.password === data.passwordConfirm, {
                    message: t('users-form.password-dont-match'),
                    path: ['passwordConfirm']
                })
    );

/**
 * Whether to display validation errors in the UI
 */
const showErrors = ref(false);
const formElement = ref<HTMLFormElement>();

const { signup } = useProfileStore();

/**
 * Validates the form and registers the account.
 *
 * Signup does not log the user in: the account still needs email confirmation,
 * so they are sent to the login page instead of getting a profile/session.
 *
 * @returns A promise resolving once the flow settles. `handleSubmit` resolves
 *  `false` on invalid input — errors are then shown and the first invalid field
 *  focused — and re-throws API errors, which are reported as toasts.
 */
const submitForm = () =>
    handleSubmit(async () => {
        const username = form.value.username?.trim();
        await signup(
            form.value.email!,
            form.value.password!,
            username || undefined,
            form.value.passwordConfirm!
        );
        await router.push({ name: 'Login', query: route.query });
        addMessage(t('signup-page.success-email-code-sent'));
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
