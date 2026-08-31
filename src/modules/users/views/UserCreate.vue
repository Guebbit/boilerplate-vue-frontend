<script lang="ts">
export default {
    name: 'UserCreatePage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * User-create page. Builds a form on `useStructureFormValidation`, submitting multipart when
 * an avatar is attached and JSON otherwise (the branch itself lives in the
 * users store).
 */
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { routerLinkI18n } from '@/infrastructure/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import {
    useNotificationsStore,
    useStructureFormValidation,
    useUploadProgress as useToolkitUploadProgress
} from '@guebbit/vue-toolkit';
import { useUsersStore } from '@/modules/users/store';
import { usersSchema, usersPasswordSchema } from '@/modules/users/schemas.ts';
import { z } from 'zod';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import FormCard from '@/ui/organisms/FormCard.vue';
import FormImageUpload from '@/ui/molecules/FormImageUpload.vue';
import {
    notifyErrorMessages,
    VUETIFY_INVALID_FIELD_SELECTOR
} from '@/infrastructure/utils/errors.ts';
import { imageUploadSchema } from '@/infrastructure/utils/uploads.ts';
import type { AxiosProgressEvent, AxiosRequestConfig } from 'axios';

/**
 * Generics
 */
const { t, locale } = useI18n();
const { addMessage } = useNotificationsStore();
const router = useRouter();

/**
 * Users store
 */
const { createUser } = useUsersStore();

/**
 * Form definition
 */
interface UserCreateForm {
    email?: string;
    username?: string;
    password?: string;
    admin?: boolean;
    active?: boolean;
    imageUpload?: File;
}

/**
 * Built once: the messages inside are thunks, resolved in the active language at parse time.
 */
const createSchema = usersSchema.pick({ email: true, username: true }).extend({
    password: usersPasswordSchema,
    admin: z.boolean().optional(),
    active: z.boolean().optional(),
    imageUpload: imageUploadSchema
});

/**
 * Reference to the mounted `FormCard`, read for its `<form>` element.
 */
const card = ref<InstanceType<typeof FormCard>>();

/**
 * Form state, validation and submission wiring from the shared app-form composable.
 */
const {
    form,
    formErrors,
    showFormErrors: showErrors,
    isSubmitting,
    handleSubmit
} = useStructureFormValidation<UserCreateForm>({}, createSchema, {
    // The `<form>` lives in `FormCard`; read through a getter so the element is resolved when a
    // failed submit actually needs it, not while the card is still mounting.
    formElement: () => card.value?.formElement,
    revalidateOn: locale,
    invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
    onInvalid: () => addMessage(t('generic.fix-errors'))
});

/**
 * Avatar upload progress, shown by `FormImageUpload` while the multipart create is in flight.
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

/**
 * Validates the form and creates the user.
 *
 * @returns A promise resolving once the flow settles: on success a toast is
 *  shown and the new user's detail page is opened; on invalid input the errors
 *  are revealed; API failures are reported as toasts.
 */
const submitForm = () =>
    handleSubmit(() =>
        trackUpload(form.value.imageUpload, (options) =>
            createUser(
                {
                    email: form.value.email!,
                    username: form.value.username!,
                    password: form.value.password!,
                    admin: form.value.admin,
                    active: form.value.active,
                    imageUpload: form.value.imageUpload
                },
                options
            )
        ).then((newUser) => {
            if (!newUser) return;
            addMessage(t('user-create-page.success-create'));
            // Fire-and-forget: a NavigationFailure must not convert a completed create into an error toast.
            void router.push(routerLinkI18n({ name: 'UserTarget', params: { id: newUser.id } }));
        })
    ).catch((error) => notifyErrorMessages(addMessage, error));
</script>

<template>
    <LayoutDefault id="user-create-page" :title="t('user-create-page.page-title')">
        <FormCard
            ref="card"
            :submit-label="t('user-create-page.button-submit')"
            :back-to="{ name: 'UsersList' }"
            :back-label="t('user-create-page.button-go-to-list')"
            :loading="isSubmitting"
            @submit="submitForm"
        >
            <v-text-field
                v-model="form.email"
                type="email"
                :label="t('user-create-page.label-email')"
                :error-messages="showErrors ? formErrors.email : []"
                class="mb-2"
            />
            <v-text-field
                v-model="form.username"
                type="text"
                :label="t('user-create-page.label-username')"
                :error-messages="showErrors ? formErrors.username : []"
                class="mb-2"
            />
            <v-text-field
                v-model="form.password"
                type="password"
                autocomplete="new-password"
                :label="t('user-create-page.label-password')"
                :error-messages="showErrors ? formErrors.password : []"
            />
            <FormImageUpload
                v-model="form.imageUpload"
                :error-messages="showErrors ? formErrors.imageUpload : []"
                :progress="uploadProgress"
                :disabled="isSubmitting"
                class="mt-2"
            />
            <div class="flex flex-wrap gap-x-8">
                <v-switch v-model="form.admin" :label="t('user-create-page.label-admin')" />
                <v-switch v-model="form.active" :label="t('user-create-page.label-active')" />
            </div>
        </FormCard>
    </LayoutDefault>
</template>
