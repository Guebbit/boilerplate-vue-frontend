<script lang="ts">
export default {
    name: 'SignupPage'
};
</script>

<script setup lang="ts">
import { ref } from 'vue';
import { z } from 'zod';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useAppForm } from '@/infrastructure/composables/use-app-form.ts';
import { useAuthStore } from '@/modules/account/stores/auth.ts';
import { useRouter, useRoute } from 'vue-router';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import FormImageUpload from '@/ui/molecules/FormImageUpload.vue';
import { usersSchema, usersPasswordSchema } from '@/modules/users';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { imageUploadSchema } from '@/infrastructure/utils/uploads.ts';
import { useUploadProgress } from '@/infrastructure/composables/use-upload-progress.ts';

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
interface UserSignupForm {
    email?: string;
    password?: string;
    passwordConfirm?: string;
    conditions?: boolean;
    imageUpload?: File;
}

/**
 * Built once, with thunked messages so the wording is chosen at parse time — see
 * `@/modules/users/schemas.ts`. `revalidateOn` re-translates errors already on screen.
 */
const signupSchema = usersSchema
    .pick({ email: true })
    .extend({
        password: usersPasswordSchema,
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

const formElement = ref<HTMLFormElement>();

const {
    form,
    formErrors,
    showFormErrors: showErrors,
    isSubmitting,
    handleSubmit,
    applyServerErrors
} = useAppForm<UserSignupForm>(
    {
        email: '',
        password: '',
        passwordConfirm: '',
        conditions: false
    },
    signupSchema,
    { formElement }
);

/**
 * Profile image upload progress, shown by `FormImageUpload` while the multipart signup is in
 * flight.
 */
const { uploadProgress, trackUpload } = useUploadProgress();

const { signup } = useAuthStore();

/**
 * Validates the form and registers the account.
 *
 * Signup does not log the user in: the account still needs email confirmation,
 * so they are sent to the login page instead of getting a profile/session.
 *
 * @returns A promise resolving once the flow settles. Invalid input is revealed, announced and
 *  focused by the toolkit before the handler runs; API failures land on the field the server
 *  named (a taken email, most often) or as a toast when it named none.
 */
const submitForm = () =>
    handleSubmit(() =>
        // No username field on this form: the store defaults it to the email address.
        trackUpload(form.value.imageUpload, (options) =>
            signup(
                {
                    email: form.value.email!,
                    password: form.value.password!,
                    passwordConfirm: form.value.passwordConfirm!,
                    imageUpload: form.value.imageUpload
                },
                options
            )
        )
            .then(() => router.push({ name: 'Login', query: route.query }))
            .then(() => addMessage(t('signup-page.success-email-code-sent')))
    ).catch((error) => {
        if (!applyServerErrors(error)) notifyErrorMessages(addMessage, error);
    });
</script>

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
