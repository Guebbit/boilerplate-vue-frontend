<template>
    <LayoutDefault id="profile-page" :title="t('profile-page.page-title')">
        <v-card class="mx-auto mt-10 w-full max-w-xl p-8">
            <form novalidate @submit.prevent="submitForm">
                <!-- TODO language select + roles (user edit, if admin) -->
                <v-text-field
                    v-model="form.username"
                    type="text"
                    autocomplete="username"
                    :label="t('profile-page.label-username')"
                    :error-messages="showErrors ? formErrors.username : []"
                    class="mb-2"
                />
                <v-text-field
                    v-model="form.email"
                    type="email"
                    autocomplete="email"
                    :label="t('profile-page.label-email')"
                    :error-messages="showErrors ? formErrors.email : []"
                    class="mb-2"
                />
                <v-text-field
                    v-model="form.phone"
                    type="tel"
                    autocomplete="tel"
                    :label="t('profile-page.label-phone')"
                    :error-messages="showErrors ? formErrors.phone : []"
                    class="mb-2"
                />
                <v-text-field
                    v-model="form.website"
                    type="url"
                    autocomplete="url"
                    :label="t('profile-page.label-website')"
                    :error-messages="showErrors ? formErrors.website : []"
                />

                <v-btn
                    variant="tonal"
                    color="secondary"
                    class="my-4"
                    @click="showChangePassword = !showChangePassword"
                >
                    {{ t('profile-page.button-change-password') }}
                </v-btn>

                <v-expand-transition>
                    <div v-show="showChangePassword">
                        <v-text-field
                            v-model="passwordForm.password"
                            type="password"
                            autocomplete="new-password"
                            :label="t('profile-page.label-password')"
                            :error-messages="passwordErrors.password ?? []"
                            class="mb-2"
                        />
                        <v-text-field
                            v-model="passwordForm.passwordConfirm"
                            type="password"
                            autocomplete="new-password"
                            :label="t('profile-page.label-passwordConfirm')"
                            :error-messages="passwordErrors.passwordConfirm ?? []"
                        />
                    </div>
                </v-expand-transition>

                <!-- If something has changed OR the password has changed (and it's valid) -->
                <div class="mt-4 flex flex-wrap gap-2">
                    <v-btn type="submit" color="primary" :disabled="!areFormsValid">
                        {{ t('profile-page.button-submit') }}
                    </v-btn>
                    <v-btn variant="tonal" @click="resetForm">
                        {{ t('profile-page.reset-form') }}
                    </v-btn>
                </div>

                <v-divider class="my-6" />

                <v-btn color="error" variant="tonal" block @click="handleDeleteAccount">
                    {{ t('profile-page.button-delete-account') }}
                </v-btn>
            </form>
        </v-card>
    </LayoutDefault>
</template>

<script lang="ts">
export default {
    name: 'ProfilePage'
};
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useProfileStore } from '@/stores/profile.ts';
import { usersSchema, usersPasswordSchema } from '@/features/users';
import LayoutDefault from '@/layouts/LayoutDefault.vue';
import { z } from 'zod';
import { notifyErrorMessages } from '@/utils/errors.ts';

const { t, locale } = useI18n();
const { addMessage } = useNotificationsStore();

/**
 * Account deletion request with confirmation dialog
 */
const { requestAccountDelete } = useProfileStore();

/**
 * Starts the account deletion flow after an explicit confirmation.
 *
 * @returns Nothing; a toast reports either that the confirmation email was sent
 *  or why the request failed.
 */
const handleDeleteAccount = () => {
    if (!globalThis.confirm(t('profile-page.confirm-delete-account'))) return;
    requestAccountDelete()
        .then(() => addMessage(t('profile-page.success-delete-request')))
        .catch((error) => notifyErrorMessages(addMessage, error));
};

/**
 * Profile logic
 */
const { updateProfile } = useProfileStore();
const { profile } = storeToRefs(useProfileStore());

/**
 * Extended profile form interface to accommodate extra UI fields (phone, website)
 * that are not part of the core User schema but are displayed in the profile form.
 */
interface IProfileForm {
    id?: string | null;
    email?: string;
    username?: string;
    imageUrl?: string | null;
    admin?: boolean | null;
    active?: boolean | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    phone?: string;
    website?: string;
}

const { form, formErrors, isDirty, resetForm, validate, setForm } =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    useStructureFormValidation<IProfileForm>({}, usersSchema as any, { revalidateOn: locale });

const showErrors = ref(false);

/**
 * Another instance of form only for the password
 */
const {
    form: passwordForm,
    formErrors: passwordErrors,
    isValid: passwordIsValid
} = useStructureFormValidation(
    {
        password: '',
        passwordConfirm: ''
    },
    z
        .object({
            password: usersPasswordSchema,
            passwordConfirm: z
                .string()
                .min(1, { error: () => t('users-form.password-confirm-required') })
        })
        // `superRefine` runs at parse time, so this `t()` is already lazy and needs no thunk
        .superRefine(({ passwordConfirm, password }, ctx) => {
            if (passwordConfirm !== password)
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: t('users-form.password-dont-match'),
                    path: ['passwordConfirm']
                });
        }),
    { revalidateOn: locale }
);

/**
 * Profile information is the original
 */
watch(
    profile,
    (userProfile) => {
        setForm(userProfile ?? {});
    },
    { immediate: true }
);

/**
 * Toggle password change
 * (I'll add a password change form + schemas)
 *
 * If password change is active, all password errors will be shown instantly
 */
const showChangePassword = ref(false);

/**
 * Whether the save button should be enabled.
 *
 * @returns `true` when the profile form has unsaved changes and no password
 *  change is in progress, or when the password change itself is valid.
 */
const areFormsValid = computed(
    () =>
        (isDirty.value && !showChangePassword.value) ||
        (showChangePassword.value && passwordIsValid.value)
);

/**
 * Validates and saves the profile changes.
 *
 * @returns A promise resolving once the update settles, reported as a toast; on
 *  invalid input it returns early and reveals the validation errors.
 */
const submitForm = () => {
    if (!validate() || !areFormsValid.value) {
        showErrors.value = true;
        return;
    }
    return updateProfile({
        email: form.value.email,
        username: form.value.username,
        imageUrl: form.value.imageUrl ?? undefined,
        admin: form.value.admin ?? undefined,
        active: form.value.active ?? undefined,
        createdAt: form.value.createdAt ?? undefined,
        updatedAt: form.value.updatedAt ?? undefined
    })
        .then(() => {
            addMessage(t('profile-page.success-update'));
        })
        .catch((error) => notifyErrorMessages(addMessage, error));
};
</script>
