<script lang="ts">
export default {
    name: 'ProfilePage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The profile page: composes the record-edit form with the avatar/role/password/2FA/sessions/
 * addresses/delete panels as siblings, each owning its own store slice. `applyLanguagePreference`
 * re-enters the route under the saved language after a save, mirroring the header's language
 * switcher — routing only, so the locale guard is what actually loads and activates it.
 *
 * Panel order is deliberate: the most destructive control (`ProfileDeleteAccount`) sits LAST, so
 * nobody reaches it on the way to the password form or the sessions list.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useNotificationsStore, useStructureFormValidation } from '@guebbit/vue-toolkit';
import { supportedLanguages } from '@/i18n';
import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { usersSchema } from '@/modules/users';
import ProfileAvatar from '@/modules/account/components/ProfileAvatar.vue';
import ProfilePasswordChange from '@/modules/account/components/ProfilePasswordChange.vue';
import ProfileTwoFactor from '@/modules/account/components/ProfileTwoFactor.vue';
import ProfileDeleteAccount from '@/modules/account/components/ProfileDeleteAccount.vue';
import ProfileSessions from '@/modules/account/components/ProfileSessions.vue';
import ProfileAddresses from '@/modules/account/components/ProfileAddresses.vue';
import ProfileExportData from '@/modules/account/components/ProfileExportData.vue';
import { VUETIFY_INVALID_FIELD_SELECTOR } from '@/ui/vuetify/selectors.ts';
import { toRequestBody } from '@/infrastructure/utils/forms.ts';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useStaleRecord } from '@/infrastructure/utils/use-stale-record.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';

/**
 * Translation function, and the currently active locale code.
 */
const { t, locale } = useI18n();

/**
 * Router instance, for the navigations this file performs.
 */
const router = useRouter();

/**
 * Current route, read for its params, query and name.
 */
const route = useRoute();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * Profile logic
 */
const { updateProfile, cancelPendingEmailChange, fetchProfile } = useProfileStore();

/**
 * The signed-in visitor's profile record.
 */
const { profile } = storeToRefs(useProfileStore());

/*
 * The record this page edits, loaded by this page. The session restore only fills the shell's
 * viewer projection, so on a hard reload of /profile the store held no record at all: the form
 * mounted empty, and the first save failed validation on fields the visitor never emptied. The
 * cached read costs nothing when login already fetched it.
 */
onMounted(fetchProfile);

/**
 * The record this form edits — every field nullable in addition to optional, matching how
 * `profile.value` arrives from the store rather than how the API contract declares them.
 */
interface ProfileForm {
    id?: string | null;
    email?: string;
    username?: string;
    /**
     * Preferred language, a tag from {@link supportedLanguages}. Part of the record rather than a
     * UI-only field: `PATCH /account` accepts it, and `Login.vue` reads it back to open the next
     * session in the language this visitor asked for.
     */
    locale?: string;
    admin?: boolean | null;
    active?: boolean | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    phone?: string;
    website?: string;
    /**
     * GDPR Art. 7(3) withdrawal switch. Signup only ever asks once and never lets it change
     * afterward — this is the other half, so consent stays as revocable as it was given.
     * `undefined` until the record loads, rendered off like every other field before hydration.
     */
    analyticsConsent?: boolean;
}

/**
 * The `<form>` itself, so `useStructureFormValidation` can focus the first invalid field
 * on submit.
 */
const formElement = ref<HTMLFormElement>();

/**
 * Form state, error surface and submit handler, from the toolkit's form validation.
 */
const {
    form,
    formErrors,
    showFormErrors: showErrors,
    isDirty,
    resetForm,
    validate,
    revealErrors,
    setInitialData,
    applyServerErrors
} = useStructureFormValidation<ProfileForm>({}, usersSchema, {
    formElement,
    revalidateOn: locale,
    invalidFieldSelector: VUETIFY_INVALID_FIELD_SELECTOR,
    onInvalid: () => addMessage(t('generic.fix-errors'))
});

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
 * ROUTING ONLY, deliberately — the same pattern `AppLanguageSwitcher.vue` documents:
 * `localeChoice` is what loads the dictionary (bundle plus any edited overrides) and activates the
 * language, off the `:locale` param this re-enters on. Switching the i18n runtime here FIRST would
 * make every switch look like no switch at all to the guard, which decides by comparing the param
 * against whatever is already active.
 *
 * @param saved - The locale on the freshly saved record.
 * @returns A promise resolving once the URL carries the new locale; immediately when the choice
 *  did not change. Never rejects — a failed re-entry must not report a saved profile as an error.
 */
const applyLanguagePreference = (saved?: string | null) =>
    typeof saved === 'string' && saved !== locale.value && supportedLanguages.includes(saved)
        ? router
              .replace({
                  params: { ...route.params, locale: saved },
                  query: route.query
              })
              .then(() => undefined)
              .catch(() => undefined)
        : Promise.resolve();

/**
 * This save's own blocked state — a failed `PATCH /account` lands here instead of a toast, next to
 * the button the visitor just pressed.
 */
const {
    message: saveError,
    type: saveErrorType,
    report: reportSaveError,
    warn: warnSave,
    clear: clearSaveError
} = useBlockingError();

/**
 * The save came back 412: the profile changed (another device, another tab) since this page
 * loaded it. "Reload latest" re-reads it past the store's cache and re-baselines the form on it;
 * the read also refreshes the `ETag` the next save sends (`infrastructure/http/etag.ts`).
 */
const {
    isStale,
    handle: handleStaleSave,
    reloadLatest,
    clear: clearStale
} = useStaleRecord({ warn: warnSave, clear: clearSaveError }, () =>
    fetchProfile(true).then(() => {
        setInitialData(profile.value ?? {});
        resetForm();
    })
);

/**
 * Whether a save is in flight — the submit button spins and refuses a second one (FA52): this
 * form calls `validate`/`revealErrors` by hand instead of the toolkit's `handleSubmit`, which is
 * where {@link isSubmitting} would otherwise come from.
 */
const savingProfile = ref(false);

/**
 * Validates and saves the profile changes — the fields a user owns. Role and account state
 * belong to the admin endpoints, and the password to its own flow below.
 *
 * @returns A promise resolving once the update settles: success is a toast, a failure blocks the
 *  form in place ({@link saveError}); on invalid input it returns early and reveals the
 *  validation errors.
 */
const submitForm = () => {
    // `revealErrors` is the whole of it: show the messages, focus the first bad field, say so.
    if (!validate()) return revealErrors();
    // Valid but unchanged, or a save already in flight: nothing to do — the button is disabled in
    // both states, so only a keyboard submit reaches here.
    if (!isDirty.value || savingProfile.value) return;
    clearSaveError();
    clearStale();
    savingProfile.value = true;
    // No `imageUrl` here, ever: `ProfileAvatar.vue` is the only thing that writes it, through its
    // own request. Sending the loaded value back on every details save would overwrite whatever
    // the avatar panel just wrote and orphan the file it uploaded — see `updateProfile`'s docblock.
    //
    // The baseline is the loaded profile: an unchanged `email` is omitted (PATCH treats an included
    // one as a real request, even a no-op), so is an untouched `analyticsConsent`, and an emptied
    // phone or website becomes `null` (the clear) instead of a 422-bound `''`.
    const { email, username, locale, phone, website, analyticsConsent } = form.value;
    return toRequestBody(
        'UpdateAccountBody',
        { email, username, locale, phone, website, analyticsConsent },
        profile.value
    )
        .then((body) => updateProfile(body))
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
        .catch((error: unknown) => {
            if (handleStaleSave(error)) return;
            applyServerErrors(error, { onUnmapped: () => reportSaveError(error) });
        })
        .finally(() => {
            savingProfile.value = false;
        });
};

/**
 * The pending-email resend/cancel actions' own blocked state — kept separate from
 * {@link saveError} since neither action touches anything the profile form validates.
 */
const {
    message: pendingEmailError,
    report: reportPendingEmailError,
    clear: clearPendingEmailError
} = useBlockingError();

/**
 * Whether a resend or cancel is in flight — shared by both, since they act on the same pending
 * change and a click on one while the other settles would race it.
 */
const pendingEmailActionInFlight = ref(false);

/**
 * Re-sends the pending-email confirmation link. There is no dedicated resend endpoint: sending
 * `PATCH /account` with the SAME address already parked in `pendingEmail` is the backend's
 * documented resend path.
 *
 * @returns A promise resolving once the request settles; success is toasted, a failure blocks in
 *  place ({@link pendingEmailError}).
 */
const resendPendingEmail = () => {
    const pendingEmail = profile.value?.pendingEmail;
    if (!pendingEmail || pendingEmailActionInFlight.value) return;
    clearPendingEmailError();
    pendingEmailActionInFlight.value = true;
    return updateProfile({ email: pendingEmail })
        .then(() => addMessage(t('profile-page.pending-email-resent')))
        .catch((error) => reportPendingEmailError(error))
        .finally(() => {
            pendingEmailActionInFlight.value = false;
        });
};

/**
 * Cancels the pending email change through its own endpoint — `DELETE /account/pending-email`.
 * Resending the current address is a no-op, not a cancel, so a routine save can never drop a
 * change in flight by accident.
 *
 * @returns A promise resolving once the request settles; success is toasted, a failure blocks in
 *  place ({@link pendingEmailError}).
 */
const cancelPendingEmail = () => {
    if (!profile.value?.pendingEmail || pendingEmailActionInFlight.value) return;
    clearPendingEmailError();
    pendingEmailActionInFlight.value = true;
    return cancelPendingEmailChange()
        .then(() => addMessage(t('profile-page.pending-email-cancelled')))
        .catch((error) => reportPendingEmailError(error))
        .finally(() => {
            pendingEmailActionInFlight.value = false;
        });
};
</script>

<template>
    <div id="profile-page">
        <v-card class="mx-auto mt-10 w-full max-w-xl p-8">
            <ProfileAvatar />

            <form ref="formElement" novalidate @submit.prevent="submitForm">
                <v-text-field
                    v-model="form.username"
                    type="text"
                    autocomplete="username"
                    data-test="profile-username"
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
                <div
                    v-if="profile?.pendingEmail"
                    class="mb-2 flex flex-wrap items-center gap-2 text-sm opacity-80"
                    data-test="pending-email-notice"
                >
                    <span>
                        {{
                            t('profile-page.pending-email-notice', { email: profile.pendingEmail })
                        }}
                    </span>
                    <v-btn
                        variant="text"
                        size="small"
                        :disabled="pendingEmailActionInFlight"
                        data-test="pending-email-resend"
                        @click="resendPendingEmail"
                    >
                        {{ t('profile-page.pending-email-resend') }}
                    </v-btn>
                    <v-btn
                        variant="text"
                        size="small"
                        :disabled="pendingEmailActionInFlight"
                        data-test="pending-email-cancel"
                        @click="cancelPendingEmail"
                    >
                        {{ t('profile-page.pending-email-cancel') }}
                    </v-btn>
                </div>
                <InlineErrorAlert
                    :message="pendingEmailError"
                    class="mb-2"
                    data-test="pending-email-error"
                />
                <v-text-field
                    v-model="form.phone"
                    type="tel"
                    autocomplete="tel"
                    data-test="profile-phone"
                    :label="t('profile-page.label-phone')"
                    :error-messages="showErrors ? formErrors.phone : []"
                    class="mb-2"
                />
                <v-text-field
                    v-model="form.website"
                    type="url"
                    autocomplete="url"
                    data-test="profile-website"
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
                <v-switch
                    v-model="form.analyticsConsent"
                    :label="t('profile-page.label-analytics-consent')"
                    :hint="t('profile-page.analytics-consent-hint')"
                    :persistent-hint="true"
                    color="primary"
                    data-test="profile-analytics-consent"
                />

                <div class="mt-4 flex flex-wrap gap-2">
                    <v-btn
                        type="submit"
                        color="primary"
                        :loading="savingProfile"
                        :disabled="!isDirty || savingProfile"
                    >
                        {{ t('profile-page.button-submit') }}
                    </v-btn>
                    <v-btn variant="tonal" @click="resetForm">
                        {{ t('profile-page.reset-form') }}
                    </v-btn>
                </div>
                <InlineErrorAlert
                    :message="saveError"
                    :type="saveErrorType"
                    class="mt-4"
                    data-test="profile-form-error"
                />
                <v-btn
                    v-if="isStale"
                    class="mt-2"
                    variant="tonal"
                    color="warning"
                    data-test="profile-reload-latest"
                    :loading="savingProfile"
                    @click="reloadLatest"
                >
                    {{ t('generic.action-reload-latest') }}
                </v-btn>
            </form>

            <ProfilePasswordChange />
            <ProfileTwoFactor />
        </v-card>

        <div class="mx-auto my-10 grid w-full max-w-xl gap-6">
            <ProfileSessions />
            <ProfileAddresses />
            <ProfileExportData />
            <ProfileDeleteAccount />
        </div>
    </div>
</template>
