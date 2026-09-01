<script lang="ts">
export default {
    name: 'SignupPage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * Signup form: the zod schema chains a password-confirm `.refine` onto the shared
 * `usersSchema`/`usersPasswordSchema` rules, and `trackUpload` wraps the store call so
 * `FormImageUpload` can show real upload progress when an avatar is attached.
 */
import { ref } from 'vue';
import { z } from 'zod';
import { useI18n } from 'vue-i18n';
import {
    useNotificationsStore,
    useStructureFormValidation,
    useUploadProgress as useToolkitUploadProgress
} from '@guebbit/vue-toolkit';
import { useAuthStore } from '@/modules/account/stores/auth.ts';
import { RouterLink, useRouter, useRoute } from 'vue-router';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import FormImageUpload from '@/ui/molecules/FormImageUpload.vue';
import { usersSchema, usersPasswordSchema } from '@/modules/users';
import {
    notifyErrorMessages,
    VUETIFY_INVALID_FIELD_SELECTOR
} from '@/infrastructure/utils/errors.ts';
import { imageUploadSchema } from '@/infrastructure/utils/uploads.ts';
import type { AxiosProgressEvent, AxiosRequestConfig } from 'axios';

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
} = useStructureFormValidation<UserSignupForm>(
    {
        email: '',
        password: '',
        passwordConfirm: '',
        conditions: false
    },
    signupSchema,
    {
        formElement,
        revalidateOn: locale,
        invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
        onInvalid: () => addMessage(t('generic.fix-errors'))
    }
);

/**
 * Profile image upload progress, shown by `FormImageUpload` while the multipart signup is in
 * flight.
 */
const { progress: uploadProgress, track } = useToolkitUploadProgress<AxiosRequestConfig>(
    (onProgress) => ({
        // `event.progress` is a 0–1 fraction, absent when the total size is unknown (a chunked or
        // compressed request) — reporting 0 keeps the bar still rather than jumping about.
        onUploadProgress: (event: AxiosProgressEvent) => onProgress(event.progress ?? 0)
    })
);

/**
 * Runs an API call with upload progress attached, and returns to idle however it ends.
 */
const trackUpload = <T,>(
    file: File | undefined,
    send: (options?: AxiosRequestConfig) => Promise<T>
) => track(send, { enabled: !!file });

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
                    :error-messages="showErrors ? formErrors.conditions : []"
                >
                    <!-- `i18n-t` interpolates the two links into the translated sentence; `@click.stop`
                         keeps a link click from also toggling the checkbox, since Vuetify makes the
                         whole label clickable. -->
                    <template #label>
                        <i18n-t keypath="signup-page.text-conditions" tag="span">
                            <template #terms>
                                <RouterLink
                                    :to="routerLinkI18n({ name: 'StaticTerms' })"
                                    class="underline"
                                    @click.stop
                                >
                                    {{ t('static-pages.terms.title') }}
                                </RouterLink>
                            </template>
                            <template #privacy>
                                <RouterLink
                                    :to="routerLinkI18n({ name: 'StaticPrivacy' })"
                                    class="underline"
                                    @click.stop
                                >
                                    {{ t('static-pages.privacy.title') }}
                                </RouterLink>
                            </template>
                        </i18n-t>
                    </template>
                </v-checkbox>
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
