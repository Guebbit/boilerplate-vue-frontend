<script lang="ts">
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
 */
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { storeToRefs } from 'pinia';
import {
    useNotificationsStore,
    useUploadProgress as useToolkitUploadProgress
} from '@guebbit/vue-toolkit';
import { useProfileStore } from '@/modules/account/stores/profile.ts';
import { useDialogStore } from '@/ui/dialog.ts';
import FormImageUpload from '@/ui/molecules/FormImageUpload.vue';
import { notifyErrorMessages } from '@/infrastructure/utils/errors.ts';
import { imageUploadSchema } from '@/infrastructure/utils/uploads.ts';
import type { AxiosProgressEvent, AxiosRequestConfig } from 'axios';

const { t } = useI18n();
const { addMessage } = useNotificationsStore();
const { updateProfile } = useProfileStore();
const { profile } = storeToRefs(useProfileStore());

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
const { progress: uploadProgress, track } = useToolkitUploadProgress<AxiosRequestConfig>(
    (onProgress) => ({
        onUploadProgress: (event: AxiosProgressEvent) => onProgress(event.progress ?? 0)
    })
);

const uploading = ref(false);
const removing = ref(false);

/**
 * Whether either action is in flight — both the picker and the remove button are disabled while
 * this is true, so a pick mid-remove (or a second pick mid-upload) cannot fire a second
 * concurrent `PUT /account` racing the first one's response and refetch.
 */
const busy = computed(() => uploading.value || removing.value);

/**
 * Uploads the freshly picked file, validating it first — client-side, for the message rather than
 * the security; the backend's own upload limiter and image pipeline are the real gate.
 *
 * @param file - The file `FormImageUpload` just picked, or `undefined` on clear.
 */
watch(pickedFile, (file) => {
    errorMessage.value = undefined;
    if (!file) return;

    const parsed = imageUploadSchema.safeParse(file);
    if (!parsed.success) {
        errorMessage.value = parsed.error.issues[0]?.message;
        pickedFile.value = undefined;
        return;
    }

    uploading.value = true;
    track((options) => updateProfile({ imageUpload: file }, options), { enabled: true })
        .then(() => addMessage(t('profile-page.avatar-success-update')))
        .catch((error) => notifyErrorMessages(addMessage, error))
        .finally(() => {
            pickedFile.value = undefined;
            uploading.value = false;
        });
});

/**
 * Clears the record's picture after confirmation — `imageUrl: ''` is what the API reads as
 * "remove it"; `undefined` means "not sent", which would leave the stored one alone.
 *
 * @returns Nothing; the outcome is reported as a toast.
 */
const handleRemove = () =>
    useDialogStore()
        .confirm({ message: t('profile-page.avatar-confirm-remove'), color: 'error' })
        .then((accepted) => {
            if (!accepted) return;
            removing.value = true;
            return updateProfile({ imageUrl: '' })
                .then(() => addMessage(t('profile-page.avatar-success-remove')))
                .catch((error) => notifyErrorMessages(addMessage, error))
                .finally(() => {
                    removing.value = false;
                });
        });
</script>

<template>
    <div class="mb-6">
        <h2 class="mb-3 text-lg font-semibold">{{ t('profile-page.avatar-title') }}</h2>

        <FormImageUpload
            v-model="pickedFile"
            :current-image-url="profile?.imageUrl"
            :error-messages="errorMessage ? [errorMessage] : []"
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
            :loading="removing"
            data-test="profile-avatar-remove"
            @click="handleRemove"
        >
            {{ t('profile-page.avatar-button-remove') }}
        </v-btn>
    </div>
</template>
