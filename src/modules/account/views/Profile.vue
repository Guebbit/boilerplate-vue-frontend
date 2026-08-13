<script lang="ts">
export default {
    name: 'ProfilePage'
};
</script>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { useAccountStore } from '@/modules/account/store.ts';
import { usersSchema, usersPasswordSchema } from '@/modules/users';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import ProfileSessions from '@/modules/account/components/ProfileSessions.vue';
import ProfileAddresses from '@/modules/account/components/ProfileAddresses.vue';
import { z } from 'zod';
import { notifyErrorMessages } from '@/infrastructure/errors.ts';

const { t, locale } = useI18n();
const { addMessage } = useNotificationsStore();

/**
 * Account deletion request with confirmation dialog
 */
const { requestAccountDelete } = useAccountStore();

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
const { updateProfile, changePassword, requestEmailVerification, fetchProfile } = useAccountStore();
const { profile } = storeToRefs(useAccountStore());

/*
 * The record this page edits, loaded by this page. The session restore only fills the shell's
 * viewer projection, so on a hard reload of /profile the store held no record at all: the form
 * mounted empty, and the first save failed validation on fields the visitor never emptied. The
 * cached read costs nothing when login already fetched it.
 */
onMounted(fetchProfile);

/**
 * Re-sends the verification email — the banner's one action.
 *
 * @returns Nothing; a toast reports the send (or the 409 for an already verified account).
 */
const handleResendVerification = () => {
    requestEmailVerification()
        .then(() => addMessage(t('profile-page.verify-email-sent')))
        .catch((error) => notifyErrorMessages(addMessage, error));
};

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

const { form, formErrors, isDirty, resetForm, validate, setInitialData } =
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
        currentPassword: '',
        password: '',
        passwordConfirm: ''
    },
    z
        .object({
            currentPassword: z
                .string()
                .min(1, { error: () => t('profile-page.current-password-required') }),
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
 * Hydrate, never clobber.
 *
 * The record can arrive — or refresh — while the visitor is already typing, and a `setForm`
 * that fires then overwrites keystrokes with server state: the e2e caught an email garbled
 * mid-word by exactly that race. So a fresh record becomes the BASELINE (`setInitialData` +
 * `resetForm`) only while the form is untouched; a dirty form is the visitor's, and the save
 * flow re-baselines it after the server accepts.
 */
watch(
    profile,
    (userProfile) => {
        if (!userProfile || isDirty.value) return;
        setInitialData(userProfile);
        resetForm();
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
 * Whether the profile save button should be enabled — unsaved changes, nothing more. The
 * password panel has its own submit now that changing it proves the current one.
 */
const areFormsValid = computed(() => isDirty.value);

/**
 * Validates and saves the profile changes — the fields a user owns. Role and account state
 * belong to the admin endpoints, and the password to its own flow below.
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
        imageUrl: form.value.imageUrl ?? undefined
    })
        .then(() => {
            // Re-baseline on what the server now holds: the store refetched it, and a form
            // left dirty against a stale baseline would refuse the next hydration forever.
            setInitialData(profile.value ?? {});
            resetForm();
            addMessage(t('profile-page.success-update'));
        })
        .catch((error) => notifyErrorMessages(addMessage, error));
};

/**
 * Submits the password change — the current password is the proof, so a wrong one comes back
 * as a validation error from the API rather than a silent success.
 *
 * @returns A promise resolving once the change settles, reported as a toast.
 */
const submitPasswordChange = () => {
    if (!passwordIsValid.value) return;
    return changePassword(
        passwordForm.value.currentPassword ?? '',
        passwordForm.value.password ?? '',
        passwordForm.value.passwordConfirm ?? ''
    )
        .then(() => {
            addMessage(t('profile-page.success-password-change'));
            passwordForm.value.currentPassword = '';
            passwordForm.value.password = '';
            passwordForm.value.passwordConfirm = '';
            showChangePassword.value = false;
        })
        .catch((error) => notifyErrorMessages(addMessage, error));
};
</script>

<template>
    <LayoutDefault id="profile-page" :title="t('profile-page.page-title')">
        <v-alert
            v-if="profile && profile.verified === false"
            type="warning"
            variant="tonal"
            class="mx-auto mt-10 w-full max-w-xl"
            data-test="verify-banner"
        >
            {{ t('profile-page.verify-banner') }}
            <template #append>
                <v-btn
                    variant="text"
                    size="small"
                    data-test="verify-resend"
                    @click="handleResendVerification"
                >
                    {{ t('profile-page.verify-resend') }}
                </v-btn>
            </template>
        </v-alert>

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

                <div class="mt-4 flex flex-wrap gap-2">
                    <v-btn type="submit" color="primary" :disabled="!areFormsValid">
                        {{ t('profile-page.button-submit') }}
                    </v-btn>
                    <v-btn variant="tonal" @click="resetForm">
                        {{ t('profile-page.reset-form') }}
                    </v-btn>
                </div>
            </form>

            <v-divider class="my-6" />

            <v-btn
                variant="tonal"
                color="secondary"
                data-test="toggle-change-password"
                @click="showChangePassword = !showChangePassword"
            >
                {{ t('profile-page.button-change-password') }}
            </v-btn>

            <v-expand-transition>
                <form
                    v-show="showChangePassword"
                    novalidate
                    class="mt-4"
                    @submit.prevent="submitPasswordChange"
                >
                    <v-text-field
                        v-model="passwordForm.currentPassword"
                        type="password"
                        autocomplete="current-password"
                        data-test="current-password"
                        :label="t('profile-page.label-current-password')"
                        :error-messages="passwordErrors.currentPassword ?? []"
                        class="mb-2"
                    />
                    <v-text-field
                        v-model="passwordForm.password"
                        type="password"
                        autocomplete="new-password"
                        data-test="new-password"
                        :label="t('profile-page.label-password')"
                        :error-messages="passwordErrors.password ?? []"
                        class="mb-2"
                    />
                    <v-text-field
                        v-model="passwordForm.passwordConfirm"
                        type="password"
                        autocomplete="new-password"
                        data-test="new-password-confirm"
                        :label="t('profile-page.label-passwordConfirm')"
                        :error-messages="passwordErrors.passwordConfirm ?? []"
                    />
                    <v-btn
                        type="submit"
                        color="primary"
                        class="mt-2"
                        data-test="submit-password-change"
                        :disabled="!passwordIsValid"
                    >
                        {{ t('profile-page.button-submit-password') }}
                    </v-btn>
                </form>
            </v-expand-transition>

            <v-divider class="my-6" />

            <v-btn color="error" variant="tonal" block @click="handleDeleteAccount">
                {{ t('profile-page.button-delete-account') }}
            </v-btn>
        </v-card>

        <div class="mx-auto my-10 grid w-full max-w-xl gap-6">
            <ProfileSessions />
            <ProfileAddresses />
        </div>
    </LayoutDefault>
</template>
