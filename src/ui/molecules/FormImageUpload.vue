<script setup lang="ts">
/**
 * @module
 * An image picker field: `v-file-input` plus a live preview built from an object URL, and an
 * optional upload-progress bar driven by a `progress` prop the parent controls.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
    ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE,
    MAX_UPLOAD_SIZE_LABEL
} from '@/infrastructure/utils/uploads.ts';
import { resolveImageUrl } from '@/infrastructure/utils/images.ts';

/**
 * Translation function for the field's label/hint/preview-alt copy.
 */
const { t } = useI18n();

/**
 * Component props — see each field's own doc comment below.
 */
const {
    label = '',
    hint = '',
    currentImageUrl,
    errorMessages = [],
    progress,
    disabled
} = defineProps<{
    /**
     * Field label. Defaults to the shared "Image" wording.
     */
    label?: string;
    /**
     * Helper text under the field. Defaults to the accepted types and the size limit.
     */
    hint?: string;
    /**
     * The record's existing image, shown as the initial preview on an edit form. Ignored once
     * the user picks a file of their own.
     */
    currentImageUrl?: string | null;
    /**
     * Validation errors, same prop every other field in these forms takes, so this composes with
     * `useStructureFormValidation`'s `formErrors` / `showFormErrors` pair.
     */
    errorMessages?: string[];
    /**
     * Upload completion from 0 to 100, driven by axios' `onUploadProgress`. `undefined` means no
     * upload is running and hides the bar — which is not the same as `0`, a request that has
     * started and sent nothing yet.
     */
    progress?: number;
    /**
     * Disables the picker, e.g. while the form is submitting.
     */
    disabled?: boolean;
}>();

/**
 * The picked file.
 *
 * Vuetify types `VFileInput`'s model as `File | File[] | null` because the same component covers
 * the `multiple` case; without that prop it hands back a single file. The local ref is typed to
 * what this component actually accepts, and {@link normaliseSelection} collapses the array shape
 * if a Vuetify version ever hands one over anyway.
 */
const pickedFile = defineModel<File | undefined>();

/**
 * Collapses `VFileInput`'s possible array selection down to the single file this component
 * models, or `undefined` when nothing usable was picked.
 *
 * @param value - Whatever the model currently holds.
 * @returns The single picked `File`, or `undefined`.
 */
const normaliseSelection = (value: unknown): File | undefined => {
    if (Array.isArray(value)) return value[0];
    return value instanceof File ? value : undefined;
};

/**
 * Whether an upload is currently in flight, per the `progress` prop.
 */
const isUploading = computed(() => progress !== undefined);

/**
 * Whole-percent completion, for both the bar and its label.
 */
const progressPercent = computed(() => Math.round(progress ?? 0));

/**
 * Object URL of the picked file, or `undefined` when nothing is picked.
 *
 * Held in its own ref rather than computed from `pickedFile` because it owns a resource:
 * `URL.createObjectURL` pins the blob in memory until `revokeObjectURL` releases it. A computed
 * would mint a new URL on every re-evaluation and leak every previous one — invisible until a
 * long editing session has quietly held on to a dozen images.
 */
const objectUrl = ref<string>();

/**
 * Revokes the current object URL, if one is held, and clears the ref.
 *
 * Safe to call unconditionally: a no-op when nothing is picked. Called both on every selection
 * change (before minting the replacement) and on unmount, so the blob never outlives the field.
 */
const releaseObjectUrl = () => {
    if (!objectUrl.value) return;
    URL.revokeObjectURL(objectUrl.value);
    objectUrl.value = undefined;
};

/**
 * Keeps {@link objectUrl} in sync with the picked file, and collapses a `multiple`-shaped
 * selection back to the single file this component models.
 *
 * @param file - The model's current value.
 */
watch(pickedFile, (file) => {
    const selected = normaliseSelection(file);
    // Revoke the outgoing URL BEFORE minting the replacement: on replacement as well as on
    // clearing, which is the case that is easy to forget.
    releaseObjectUrl();
    if (selected) objectUrl.value = URL.createObjectURL(selected);
    // Collapse an array selection back into the model so the parent's form only ever holds a
    // single File — what every `imageUpload` field in the contract declares.
    if (Array.isArray(file)) pickedFile.value = selected;
});

/**
 * Releases the held object URL so the field never leaks a blob past its own lifetime.
 */
onBeforeUnmount(releaseObjectUrl);

/**
 * What the preview shows.
 *
 * Both candidates go through `resolveImageUrl`, which is a no-op on the object URL and the whole
 * point for the stored one: the API answers an upload with a path relative to ITSELF, and a bare
 * `/images/…` in `src` is resolved by the browser against this app's origin instead — a 404 on
 * every deployment where the two differ, which is every deployment including the default `.env`.
 *
 * @returns The picked file's object URL, the record's existing image while nothing is picked, or
 *  `undefined` when there is neither and the preview is omitted entirely.
 */
const previewSource = computed(() => resolveImageUrl(objectUrl.value ?? currentImageUrl));
</script>

<template>
    <div class="flex flex-col gap-2">
        <v-file-input
            v-model="pickedFile"
            :accept="ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE"
            :label="label || t('image-upload-form.label')"
            :hint="hint || t('image-upload-form.hint', { size: MAX_UPLOAD_SIZE_LABEL })"
            :persistent-hint="true"
            :error-messages="errorMessages"
            :disabled="disabled"
            prepend-icon=""
            prepend-inner-icon="$upload"
            clearable
        />

        <img
            v-if="previewSource"
            :src="previewSource"
            :alt="t('image-upload-form.preview-alt')"
            class="max-h-40 w-auto self-start rounded object-contain"
        />

        <!--
            `data-testid` because Vuetify's own `v-file-input` renders an internal
            `.v-progress-linear` inside its field loader: a class selector matches that one too,
            so a spec written against the class passes whether this bar is rendered or not.
        -->
        <v-progress-linear
            v-if="isUploading"
            data-testid="upload-progress"
            :model-value="progressPercent"
            color="primary"
            height="18"
            rounded
        >
            <span class="text-xs">
                {{ t('image-upload-form.upload-progress', { percent: progressPercent }) }}
            </span>
        </v-progress-linear>
    </div>
</template>
