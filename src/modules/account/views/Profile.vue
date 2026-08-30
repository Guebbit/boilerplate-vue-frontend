<script lang="ts">
export default {
    name: 'ProfilePage'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The profile page: composes the record-edit form with the role/password/delete/sessions/
 * addresses panels as siblings, each owning its own store slice. `applyLanguagePreference` chains
 * the i18n switch and the route's `:locale` re-entry in that order after a save, mirroring the
 * header's language switcher.
 */
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { changeLanguage, supportedLanguages } from '@/infrastructure/i18n';
import { useAppForm } from '@/infrastructure/composables/use-app-form.ts';
import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { usersSchema } from '@/modules/users';
import LayoutDefault from '@/app/layouts/LayoutDefault.vue';
import ProfileVerificationBanner from '@/modules/account/components/ProfileVerificationBanner.vue';
import ProfileRole from '@/modules/account/components/ProfileRole.vue';
import ProfilePasswordChange from '@/modules/account/components/ProfilePasswordChange.vue';
import ProfileDeleteAccount from '@/modules/account/components/ProfileDeleteAccount.vue';
import ProfileSessions from '@/modules/account/components/ProfileSessions.vue';
import ProfileAddresses from '@/modules/account/components/ProfileAddresses.vue';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';

const { t, locale } = useI18n();
const router = useRouter();
const route = useRoute();
const { addMessage } = useNotificationsStore();

/**
 * Profile logic
 */
const { updateProfile, fetchProfile } = useProfileStore();
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
        imageUrl: form.value.imageUrl ?? undefined,
        phone: form.value.phone,
        website: form.value.website
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
</script>

<template>
    <LayoutDefault id="profile-page" :title="t('profile-page.page-title')">
        <ProfileVerificationBanner />

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

            <ProfileRole />
            <ProfilePasswordChange />
            <ProfileDeleteAccount />
        </v-card>

        <div class="mx-auto my-10 grid w-full max-w-xl gap-6">
            <ProfileSessions />
            <ProfileAddresses />
        </div>
    </LayoutDefault>
</template>
