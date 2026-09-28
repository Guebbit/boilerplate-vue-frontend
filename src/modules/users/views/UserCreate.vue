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
 * users store). A password is only conditionally required: checking "send setup email" trades it
 * for a reset-style email instead, so the schema's `superRefine` enforces "one or the other"
 * itself rather than trusting the server's own 422 for it.
 */
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { routerLinkI18n } from '@/i18n/router-link.ts';
import { useI18n } from 'vue-i18n';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useUsersStore } from '@/modules/users/store';
import { usersSchema, usersPasswordSchema } from '@/modules/users/schemas.ts';
import { userRoleOptions } from '@/modules/users/domain';
import { supportedLanguages, translate } from '@/i18n';
import { z } from 'zod';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import FormCard from '@/ui/organisms/FormCard.vue';
import FormImageUpload from '@/ui/molecules/FormImageUpload.vue';
import { VUETIFY_INVALID_FIELD_SELECTOR } from '@/ui/vuetify/selectors.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { imageUploadSchema } from '@/infrastructure/utils/uploads.ts';
import { useAxiosUploadProgress } from '@/ui/composables/use-axios-upload-progress.ts';

/**
 * Generics
 */
const { t, locale } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Router instance, for the navigations this file performs.
 */
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
    sendSetupEmail?: boolean;
    role?: string;
    active?: boolean;
    locale?: string;
    imageUpload?: File;
}

/**
 * Built once: the messages inside are thunks, resolved in the active language at parse time.
 *
 * `password` is a plain optional string here rather than `usersPasswordSchema` directly, because
 * that schema treats an empty value as a failure — wrong once `sendSetupEmail` makes a password
 * optional. The `superRefine` below enforces "one or the other" and, only when a password was
 * typed, re-runs `usersPasswordSchema`'s own strength rules against it — so those rules stay
 * declared in one place instead of being copied here.
 */
const createSchema = usersSchema
    .pick({ email: true, username: true })
    .extend({
        password: z.string().optional(),
        sendSetupEmail: z.boolean().optional(),
        role: z.string().optional(),
        active: z.boolean().optional(),
        locale: z.string().optional(),
        imageUpload: imageUploadSchema
    })
    .superRefine((data, ctx) => {
        if (data.sendSetupEmail) return;
        if (!data.password) {
            ctx.addIssue({
                code: 'custom',
                path: ['password'],
                message: translate('user-create-page.password-or-setup-email-required')
            });
            return;
        }
        const strength = usersPasswordSchema.safeParse(data.password);
        if (!strength.success) {
            for (const issue of strength.error.issues) {
                ctx.addIssue({ ...issue, path: ['password'] });
            }
        }
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
    handleSubmit,
    applyServerErrors
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
const { progress: uploadProgress, trackUpload } = useAxiosUploadProgress();

/**
 * The locale select's options — the languages this build can switch to, named in whatever
 * language is currently on screen. Same source as `Profile.vue`'s own language select: it already
 * includes whatever `GET /locales` reported at boot, so a deployment that adds one gets it here
 * for free.
 */
const localeOptions = computed(() =>
    supportedLanguages.map((code) => ({ value: code, title: t(`generic.${code}`) }))
);

/**
 * This form's own blocked state — a create that failed blocks the visitor from proceeding past
 * this one submit button, so it renders through {@link InlineErrorAlert} next to it rather than a
 * toast — see docs/theory/request-flow.md.
 */
const {
    message: submitError,
    report: reportSubmitError,
    clear: clearSubmitError
} = useBlockingError();

/**
 * Validates the form and creates the user.
 *
 * @returns A promise resolving once the flow settles: on success a toast is
 *  shown and the new user's detail page is opened; on invalid input the errors
 *  are revealed; API failures block the form in place ({@link submitError}).
 */
const submitForm = () => {
    clearSubmitError();
    return handleSubmit(() =>
        trackUpload(form.value.imageUpload, (options) =>
            createUser(
                {
                    email: form.value.email!,
                    username: form.value.username!,
                    // Never both: `sendSetupEmail` is exactly what makes a password optional, so
                    // sending an empty one alongside it would ask the API to validate a field the
                    // schema above never required.
                    password: form.value.sendSetupEmail ? undefined : form.value.password,
                    sendSetupEmail: form.value.sendSetupEmail,
                    role: form.value.role,
                    active: form.value.active,
                    locale: form.value.locale,
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
    ).catch((error: unknown) => {
        if (!applyServerErrors(error)) reportSubmitError(error);
    });
};
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
                data-test="user-email"
                :label="t('user-create-page.label-email')"
                :error-messages="showErrors ? formErrors.email : []"
                class="mb-2"
            />
            <v-text-field
                v-model="form.username"
                type="text"
                data-test="user-username"
                :label="t('user-create-page.label-username')"
                :error-messages="showErrors ? formErrors.username : []"
                class="mb-2"
            />
            <v-text-field
                v-model="form.password"
                type="password"
                data-test="user-password"
                autocomplete="new-password"
                :disabled="form.sendSetupEmail"
                :label="t('user-create-page.label-password')"
                :error-messages="showErrors ? formErrors.password : []"
                class="mb-2"
            />
            <v-checkbox
                v-model="form.sendSetupEmail"
                :label="t('user-create-page.label-send-setup-email')"
                :hint="t('user-create-page.hint-send-setup-email')"
                persistent-hint
                data-test="user-send-setup-email"
                class="mb-2"
            />
            <FormImageUpload
                v-model="form.imageUpload"
                :error-messages="showErrors ? formErrors.imageUpload : []"
                :progress="uploadProgress"
                :disabled="isSubmitting"
                class="mt-2 mb-2"
            />
            <div class="flex flex-wrap gap-x-8">
                <!-- One list, not a free-text field: `domain/roles.ts` is the single place every role
                     select in this module reads from, so it cannot drift into a second copy. -->
                <v-select
                    v-model="form.role"
                    :items="userRoleOptions"
                    :label="t('user-create-page.label-role')"
                    data-test="user-role"
                />
                <v-select
                    v-model="form.locale"
                    :items="localeOptions"
                    :label="t('user-create-page.label-locale')"
                    data-test="user-locale"
                />
                <v-switch v-model="form.active" :label="t('user-create-page.label-active')" />
            </div>

            <InlineErrorAlert :message="submitError" data-test="user-create-submit-error" />
        </FormCard>
    </LayoutDefault>
</template>
