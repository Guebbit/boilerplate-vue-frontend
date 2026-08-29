<script lang="ts">
export default {
    name: 'ProfilePage'
};
</script>

<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { changeLanguage, supportedLanguages } from '@/infrastructure/i18n';
import { useSessionStore } from '@/infrastructure/stores/session.ts';
import { useAppForm } from '@/infrastructure/composables/use-app-form.ts';
import { useAccountStore } from '@/modules/account/store.ts';
import { usersSchema, usersPasswordSchema } from '@/modules/users';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import ProfileSessions from '@/modules/account/components/ProfileSessions.vue';
import ProfileAddresses from '@/modules/account/components/ProfileAddresses.vue';
import { z } from 'zod';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { useDialogStore } from '@/infrastructure/stores/dialog.ts';

const { t, locale } = useI18n();
const router = useRouter();
const route = useRoute();
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
const handleDeleteAccount = () =>
    useDialogStore()
        .confirm({ message: t('profile-page.confirm-delete-account'), color: 'error' })
        .then((accepted) => {
            if (!accepted) return;
            return requestAccountDelete()
                .then(() => addMessage(t('profile-page.success-delete-request')))
                .catch((error) => notifyErrorMessages(addMessage, error));
        });

/**
 * Profile logic
 */
const { updateProfile, updateOwnRole, changePassword, requestEmailVerification, fetchProfile } =
    useAccountStore();
const { profile } = storeToRefs(useAccountStore());
const { isAdmin } = storeToRefs(useSessionStore());

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
interface ProfileForm {
    id?: string | null;
    email?: string;
    username?: string;
    /**
     * Preferred language, a tag from {@link supportedLanguages}. Part of the record rather than a
     * UI-only field: `PUT /account` accepts it, and `Login.vue` reads it back to open the next
     * session in the language this visitor asked for.
     */
    locale?: string;
    imageUrl?: string | null;
    admin?: boolean | null;
    active?: boolean | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    phone?: string;
    website?: string;
}

const formElement = ref<HTMLFormElement>();

const {
    form,
    formErrors,
    showFormErrors: showErrors,
    isDirty,
    resetForm,
    validate,
    revealErrors,
    setInitialData
} = useAppForm<ProfileForm>({}, usersSchema, { formElement });

/**
 * Another instance of form only for the password
 */
const passwordFormElement = ref<HTMLFormElement>();

const {
    form: passwordForm,
    formErrors: passwordErrors,
    showFormErrors: showPasswordErrors,
    handleSubmit: handlePasswordSubmit
} = useAppForm(
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
                    code: 'custom',
                    message: t('users-form.password-dont-match'),
                    path: ['passwordConfirm']
                });
        }),
    { formElement: passwordFormElement }
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
 * The languages this build can switch to, named in the language currently on screen.
 *
 * `supportedLanguages` rather than a list of this page's own: it already includes whatever
 * `GET /locales` reported at boot, so a deployment that adds a language gets it here for free.
 */
const languageOptions = computed(() =>
    supportedLanguages.map((code) => ({ value: code, title: t(`generic.${code}`) }))
);

/**
 * Re-enters the current route in the language the saved record now carries.
 *
 * The select writes a PREFERENCE, and the preference is only read at login (see `Login.vue`) — so
 * without this a visitor saves "italian" and carries on reading English until they next sign in.
 * Switching the i18n runtime alone would not hold either: the `:locale` route param is what
 * `localeChoice` re-applies on the next navigation, and it would switch straight back. Hence
 * both, in that order — the same two steps the header's language switcher takes, for the same
 * reason.
 *
 * @param saved - The locale on the freshly saved record.
 * @returns A promise resolving once language and URL agree; immediately when the choice did not
 *  change. Never rejects — a failed re-entry must not report a saved profile as an error.
 */
const applyLanguagePreference = (saved?: string | null) =>
    typeof saved === 'string' && saved !== locale.value && supportedLanguages.includes(saved)
        ? changeLanguage(saved)
              .then(() =>
                  router.replace({
                      params: { ...route.params, locale: saved },
                      query: route.query
                  })
              )
              .then(() => undefined)
              .catch(() => undefined)
        : Promise.resolve();

/**
 * The role shown in the admin-only select.
 *
 * Seeded from the record and re-seeded whenever it changes underneath — the profile form's
 * "hydrate, never clobber" rule, without the dirty guard: a two-option select holds no keystrokes
 * that a refresh could garble.
 */
const roleIsAdmin = ref(false);

watch(
    profile,
    (userProfile) => {
        roleIsAdmin.value = Boolean(userProfile?.admin);
    },
    { immediate: true }
);

const roleOptions = computed(() => [
    { value: true, title: t('generic.administrator') },
    { value: false, title: t('generic.standard-user') }
]);

/** Whether the select has been moved away from what the record says. */
const roleIsDirty = computed(() => roleIsAdmin.value !== Boolean(profile.value?.admin));

/**
 * Applies the chosen role, confirming first when it gives administrator rights away.
 *
 * Only that direction asks. Demoting yourself is the one change on this page nobody can undo for
 * themselves — the admin routes are precisely what you would have to reach to put it back — while
 * promoting yourself needs no warning from a form you already had the rights to submit.
 *
 * The select is put back on refusal and on failure, so it never shows a role the record does not
 * hold.
 *
 * @returns A promise resolving once the change settles, reported as a toast.
 */
const handleRoleChange = () => {
    if (!roleIsDirty.value) return Promise.resolve();
    const wanted = roleIsAdmin.value;
    const restore = () => {
        roleIsAdmin.value = Boolean(profile.value?.admin);
    };

    return (
        wanted
            ? Promise.resolve(true)
            : useDialogStore().confirm({
                  message: t('profile-page.confirm-self-demote'),
                  color: 'error'
              })
    ).then((accepted) => {
        if (!accepted) {
            restore();
            return;
        }
        return updateOwnRole(wanted)
            .then(() => addMessage(t('profile-page.success-role-change')))
            .catch((error) => {
                restore();
                notifyErrorMessages(addMessage, error);
            });
    });
};

/**
 * Whether the password-change form below is open. While it is, its errors show instantly.
 */
const showChangePassword = ref(false);

/** The password form's id, for the toggle's `aria-controls`. */
const passwordFormId = useId();

/**
 * Validates and saves the profile changes — the fields a user owns. Role and account state
 * belong to the admin endpoints, and the password to its own flow below.
 *
 * @returns A promise resolving once the update settles, reported as a toast; on
 *  invalid input it returns early and reveals the validation errors.
 */
const submitForm = () => {
    // `revealErrors` is the whole of it: show the messages, focus the first bad field, say so.
    if (!validate()) return revealErrors();
    // Valid but unchanged. There is nothing to save and nothing to complain about — the button
    // is disabled in this state, so only a keyboard submit reaches here.
    if (!isDirty.value) return;
    return updateProfile({
        email: form.value.email,
        username: form.value.username,
        locale: form.value.locale,
        imageUrl: form.value.imageUrl ?? undefined
    })
        .then(() => {
            // Re-baseline on what the server now holds: the store refetched it, and a form
            // left dirty against a stale baseline would refuse the next hydration forever.
            setInitialData(profile.value ?? {});
            resetForm();
            addMessage(t('profile-page.success-update'));
            // Last, and on the SAVED record rather than on the form: the language only follows a
            // preference the server actually accepted.
            return applyLanguagePreference(profile.value?.locale);
        })
        .catch((error) => notifyErrorMessages(addMessage, error));
};

/**
 * Submits the password change — the current password is the proof, so a wrong one comes back
 * as a validation error from the API rather than a silent success.
 *
 * @returns A promise resolving once the change settles, reported as a toast.
 */
const submitPasswordChange = () =>
    // `handleSubmit` is the gate: an invalid form shows its messages and focuses the first one
    // rather than sitting behind a button that cannot be pressed.
    handlePasswordSubmit(({ currentPassword, password, passwordConfirm }) =>
        changePassword(currentPassword, password, passwordConfirm)
            .then(() => {
                addMessage(t('profile-page.success-password-change'));
                passwordForm.value.currentPassword = '';
                passwordForm.value.password = '';
                passwordForm.value.passwordConfirm = '';
                showChangePassword.value = false;
            })
            .catch((error) => notifyErrorMessages(addMessage, error))
    );
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
            <form ref="formElement" novalidate @submit.prevent="submitForm">
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
                    class="mb-2"
                />
                <v-select
                    v-model="form.locale"
                    :items="languageOptions"
                    :label="t('profile-page.label-language')"
                    :hint="t('profile-page.language-hint')"
                    :persistent-hint="true"
                    data-test="profile-language"
                />

                <div class="mt-4 flex flex-wrap gap-2">
                    <v-btn type="submit" color="primary" :disabled="!isDirty">
                        {{ t('profile-page.button-submit') }}
                    </v-btn>
                    <v-btn variant="tonal" @click="resetForm">
                        {{ t('profile-page.reset-form') }}
                    </v-btn>
                </div>
            </form>

            <!--
                Its own block, deliberately outside the form above: a role change goes to a
                different endpoint under a different authorisation, and folding it into "Save
                changes" would put two authorisations behind one button. The password form below
                is separated for the same reason.
            -->
            <template v-if="isAdmin">
                <v-divider class="my-6" />

                <section data-test="profile-role">
                    <h2 class="mb-1 text-lg font-semibold">{{ t('profile-page.role-title') }}</h2>
                    <p class="mb-4 opacity-80">{{ t('profile-page.role-intro') }}</p>

                    <v-select
                        v-model="roleIsAdmin"
                        :items="roleOptions"
                        :label="t('profile-page.label-role')"
                        data-test="role-select"
                    />

                    <v-btn
                        color="primary"
                        :disabled="!roleIsDirty"
                        data-test="role-submit"
                        @click="handleRoleChange"
                    >
                        {{ t('profile-page.button-submit-role') }}
                    </v-btn>
                </section>
            </template>

            <v-divider class="my-6" />

            <v-btn
                variant="tonal"
                color="secondary"
                data-test="toggle-change-password"
                :aria-expanded="showChangePassword ? 'true' : 'false'"
                :aria-controls="passwordFormId"
                @click="showChangePassword = !showChangePassword"
            >
                {{ t('profile-page.button-change-password') }}
            </v-btn>

            <v-expand-transition>
                <form
                    v-show="showChangePassword"
                    :id="passwordFormId"
                    ref="passwordFormElement"
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
                        :error-messages="
                            showPasswordErrors ? (passwordErrors.currentPassword ?? []) : []
                        "
                        class="mb-2"
                    />
                    <v-text-field
                        v-model="passwordForm.password"
                        type="password"
                        autocomplete="new-password"
                        data-test="new-password"
                        :label="t('profile-page.label-password')"
                        :error-messages="showPasswordErrors ? (passwordErrors.password ?? []) : []"
                        class="mb-2"
                    />
                    <v-text-field
                        v-model="passwordForm.passwordConfirm"
                        type="password"
                        autocomplete="new-password"
                        data-test="new-password-confirm"
                        :label="t('profile-page.label-passwordConfirm')"
                        :error-messages="
                            showPasswordErrors ? (passwordErrors.passwordConfirm ?? []) : []
                        "
                    />
                    <v-btn
                        type="submit"
                        color="primary"
                        class="mt-2"
                        data-test="submit-password-change"
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
