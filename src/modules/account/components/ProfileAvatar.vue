<script lang="ts">
/**
 * Named component block: gives the SFC a stable `name` for devtools/`<KeepAlive>`,
 * required alongside `<script setup>` since the latter cannot declare one itself.
 */
export default {
    name: 'ProfileAvatar'
};
</script>

<script setup lang="ts">
/**
 * @module
 * The profile picture panel: a picker that uploads on selection (no separate save step — the
 * picture is not part of the details form below it) and a remove button. Mirrors
 * `modules/users/store.ts`'s `{ imageUpload, ...rest }` split, one call site further.
 *
 * Upload and remove both act on the same single picture, so a failure from either one blocks the
 * same spot: one shared `useBlockingError()`, rendered next to the picker. See
 * docs/theory/request-flow.md.
 */
import { fieldErrorProps } from '@/ui/vuetify/field-error.ts';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import { useNotificationsStore } from '@guebbit/vue-toolkit';
import { useAccountProfileStore } from '../stores/profile.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import { singleFlight } from '@/infrastructure/utils/single-flight.ts';
import FormImageUpload from '@/ui/molecules/FormImageUpload.vue';
import { useBlockingError } from '@/infrastructure/utils/use-blocking-error.ts';
import { useStaleRecord } from '@/infrastructure/utils/use-stale-record.ts';
import { imageUploadSchema } from '@/infrastructure/utils/uploads.ts';
import InlineErrorAlert from '@/ui/molecules/InlineErrorAlert.vue';
import { useAxiosUploadProgress } from '@/ui/composables/use-axios-upload-progress.ts';

/**
 * Translation function.
 */
const { t } = useI18n();

/**
 * Toast dispatcher, used to report every outcome to the visitor.
 */
const { addMessage } = useNotificationsStore();

/**
 * The profile store, held whole: its actions and its `storeToRefs` slice are both read.
 */
const profileStore = useAccountProfileStore();

/**
 * Writes the profile record, used here for the avatar field.
 */
const { updateProfile } = profileStore;

/**
 * The profile record, plus a flag per avatar action so each button disables on its own.
 */
const { profile, uploadingAvatar, removingAvatar } = storeToRefs(profileStore);

/**
 * The picked file — cleared back to `undefined` once the upload settles, whichever way, so the
 * field never shows a stale selection next to the record's own (now current) picture.
 */
const pickedFile = ref<File>();

/**
 * Client-side validation message for the picked file, resolved synchronously against
 * {@link imageUploadSchema} — the same rule `Signup.vue` uses, applied here to a single field
 * instead of a whole form.
 */
const errorMessage = ref<string>();

/**
 * Upload progress, shown by `FormImageUpload` while the multipart request is in flight.
 */
const { progress: uploadProgress, trackUpload } = useAxiosUploadProgress();

/**
 * Whether either avatar action is in flight — both the picker and the remove button are disabled
 * while this is true, so a pick mid-remove (or a second pick mid-upload) cannot fire a second
 * concurrent `PATCH /account` racing the first one's response and refetch.
 */
const busy = computed(() => uploadingAvatar.value || removingAvatar.value);

/**
 * This picture's own blocked state — upload and remove share one instance, since both work on
 * the same single field and there is only one place next to it to show a failure.
 */
const {
    message: avatarError,
    report: reportAvatarError,
    warn: warnAvatarError,
    clear: clearAvatarError
} = useBlockingError();

/**
 * The picture write came back 412: the account moved since it was loaded. This panel owns its
 * own reload: it re-reads `/account`, which refreshes the `ETag` the next write sends, and the
 * details form below keeps what is typed (`Profile.vue` skips hydrating a dirty form).
 */
const {
    isStale,
    handle: handleStaleSave,
    reloadLatest,
    clear: clearStale
} = useStaleRecord({ warn: warnAvatarError, clear: clearAvatarError }, () =>
    profileStore.fetchProfile(true)
);

/**
 * Shows a failed picture write beside the picker: a 412 as the stale warning, anything else as
 * the blocked error.
 *
 * @param error - The rejected value of the upload or the removal.
 */
const reportAvatarFailure = (error: unknown) => {
    if (!handleStaleSave(error)) reportAvatarError(error);
};

/**
 * Uploads the freshly picked file, validating it first — client-side, for the message rather than
 * the security; the backend's own upload limiter and image pipeline are the real gate.
 *
 * @param file - The file `FormImageUpload` just picked, or `undefined` on clear.
 */
watch(pickedFile, (file) => {
    errorMessage.value = undefined;
    // Only a new pick clears the last failure: the reset to `undefined` that follows an upload's
    // end would otherwise wipe the warning the failure has just raised.
    if (!file) return;
    clearAvatarError();
    clearStale();

    const parsed = imageUploadSchema.safeParse(file);
    if (!parsed.success) {
        errorMessage.value = parsed.error.issues[0]?.message;
        pickedFile.value = undefined;
        return;
    }

    trackUpload(file, (options) => updateProfile({ imageUpload: file }, options))
        .then(() => addMessage(t('profile-page.avatar-success-update')))
        .catch(reportAvatarFailure)
        .finally(() => {
            pickedFile.value = undefined;
        });
});

/**
 * Clears the record's picture after confirmation — `imageUrl: null` is what the API reads as
 * "remove it"; `undefined` means "not sent", which would leave the stored one alone. Never `''`:
 * the contract's `minLength: 1` refuses an empty string with a 422 .
 *
 * @returns Nothing; success is toasted, a failure blocks the panel in place ({@link avatarError}).
 */
const handleRemove = singleFlight(() =>
    useDialogStore()
        .confirm({ message: t('profile-page.avatar-confirm-remove'), color: 'error' })
        .then((accepted) => {
            if (!accepted) return;
            clearAvatarError();
            clearStale();
            return updateProfile({ imageUrl: null })
                .then(() => addMessage(t('profile-page.avatar-success-remove')))
                .catch(reportAvatarFailure);
        })
);
</script>

<template>
    <div class="mb-6">
        <h2 class="mb-3 text-lg font-semibold">{{ t('profile-page.avatar-title') }}</h2>

        <FormImageUpload
            v-model="pickedFile"
            :current-image-url="profile?.imageUrl"
            v-bind="fieldErrorProps(errorMessage ? [errorMessage] : [])"
            :progress="uploadProgress"
            :disabled="busy"
            data-test="profile-avatar-input"
        />

        <v-btn
            v-if="profile?.imageUrl"
            variant="text"
            color="error"
            size="small"
            class="mt-2"
            :disabled="busy"
            :loading="removingAvatar"
            data-test="profile-avatar-remove"
            @click="handleRemove"
        >
            {{ t('profile-page.avatar-button-remove') }}
        </v-btn>

        <InlineErrorAlert
            :message="avatarError"
            :type="isStale ? 'warning' : 'error'"
            class="mt-2"
            data-test="profile-avatar-error"
        />
        <v-btn
            v-if="isStale"
            variant="tonal"
            color="warning"
            size="small"
            class="mt-2"
            data-test="profile-avatar-reload-latest"
            @click="reloadLatest"
        >
            {{ t('generic.action-reload-latest') }}
        </v-btn>
    </div>
</template>
