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
                <FormImageUpload
                    v-model="form.imageUpload"
                    :error-messages="showErrors ? formErrors.imageUpload : []"
                    :progress="uploadProgress"
                    :disabled="isSubmitting"
                    class="mt-2"
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
import FormImageUpload from '@/components/molecules/FormImageUpload.vue';
import { usersSchema } from '@/features/users';
import { notifyErrorMessages, focusFirstErrorField } from '@/utils/errors.ts';
import { imageUploadSchema, useUploadProgress } from '@/utils/uploads.ts';

/**
 * UI logics
 */
const { t, locale } = useI18n();
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
    imageUpload?: File;
}

/**
 * Built once, with thunked messages so the wording is chosen at parse time — see
 * `@/features/users/schemas.ts`. `revalidateOn` re-translates errors already on screen.
 */
const signupSchema = usersSchema
    .pick({ email: true })
    .extend({
        password: z.string().min(8, { error: () => t('users-form.password-required') }),
        passwordConfirm: z
            .string()
            .min(8, { error: () => t('users-form.password-confirm-required') }),
        conditions: z.boolean().refine((value) => value, {
            error: () => t('users-form.conditions-required')
        }),
        imageUpload: imageUploadSchema
    })
    .refine((data) => data.password === data.passwordConfirm, {
        error: () => t('users-form.password-dont-match'),
        path: ['passwordConfirm']
    });

const { form, formErrors, isSubmitting, handleSubmit } =
    useStructureFormValidation<IUserSignupForm>(
        {
            email: '',
            username: '',
            password: '',
            passwordConfirm: '',
            conditions: false
        },
        signupSchema,
        { revalidateOn: locale }
    );

/**
 * Whether to display validation errors in the UI
 */
const showErrors = ref(false);
const formElement = ref<HTMLFormElement>();

/**
 * Profile image upload progress, shown by `FormImageUpload` while the multipart signup is in
 * flight.
 */
const { uploadProgress, trackUpload } = useUploadProgress();

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
    handleSubmit(() => {
        const username = form.value.username?.trim();
        return trackUpload(form.value.imageUpload, (options) =>
            signup(
                {
                    email: form.value.email!,
                    password: form.value.password!,
                    username: username || undefined,
                    passwordConfirm: form.value.passwordConfirm!,
                    imageUpload: form.value.imageUpload
                },
                options
            )
        )
            .then(() => router.push({ name: 'Login', query: route.query }))
            .then(() => addMessage(t('signup-page.success-email-code-sent')));
    })
        .then((success) => {
            if (success) return;
            showErrors.value = true;
            addMessage(t('users-form.fix-errors'));
            // After nextTick so the error messages `showErrors` just revealed are in the DOM —
            // `focusFirstErrorField` looks for them.
            return nextTick().then(() => focusFirstErrorField(formElement.value));
        })
        .catch((error) => notifyErrorMessages(addMessage, error));
</script>
