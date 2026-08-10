import { ref } from 'vue';
import type { AxiosProgressEvent, AxiosRequestConfig } from 'axios';
import { z } from 'zod';
import { i18n } from '@/utils/i18n.ts';

/**
 * Client-side limits for the `imageUpload` multipart fields.
 *
 * ── These numbers are a COPY, and the copy is deliberate ──────────────────────
 * The authority is the backend, in two places:
 *
 *   - accepted mime types  → `src/core/adapters/storage.ts:122`
 *   - maximum size         → `src/core/adapters/storage.ts:170-183`
 *     (`NODE_MAX_UPLOAD_BYTES`, defaulting to 5 MB)
 *
 * They are restated here rather than derived because `openapi.yaml` declares every
 * `imageUpload` field as a bare `type: string, format: binary` with no `maxLength` and no
 * `contentMediaType` — and even adding them would not help: orval's zod generator short-circuits
 * on `format: binary` to `zod.instanceof(File)` and emits no length constant, and the `zodSchemas`
 * target has no `splitByContentType`, so the multipart bodies never become zod schemas at all.
 * There is therefore nothing generated to read, and nothing that will announce a drift.
 *
 * ── What this is FOR ─────────────────────────────────────────────────────────
 * A UX affordance, never a security control. The backend gates uploads twice — `fileFilter`
 * rejects on the client's declared `Content-Type` before the bytes touch disk, then
 * `identifyImageFile()` re-reads the actual magic bytes and answers 422 when the declaration
 * lied. A browser cannot weaken or duplicate that; checking here only spares someone waiting
 * out a 5 MB upload to be told no.
 */

/**
 * Mime types the backend's `fileFilter` accepts.
 *
 * Note `image/jpg` alongside `image/jpeg`: not a canonical mime type, but browsers do emit it,
 * and the backend's list carries it for that reason. Keep the two lists identical.
 */
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'] as const;

/**
 * Value for a file input's `accept` attribute, derived from {@link ACCEPTED_IMAGE_TYPES} so the
 * picker's filter and the validation rule can never disagree.
 */
export const ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(',');

/**
 * Largest upload the backend will accept, in bytes.
 *
 * Configurable through `VITE_MAX_UPLOAD_BYTES` so a deployment whose backend runs a non-default
 * `NODE_MAX_UPLOAD_BYTES` can follow it without a code change; falls back to the backend's own
 * 5 MB default. A non-numeric or zero value falls back too, which is what makes a malformed
 * `.env` fail safe rather than rejecting every file.
 */
export const MAX_UPLOAD_BYTES = Number(import.meta.env.VITE_MAX_UPLOAD_BYTES) || 5 * 1024 * 1024;

/**
 * Renders a byte count as a human-readable size, for the "file too large" message.
 *
 * @param bytes - Size in bytes.
 * @returns The size in MB with at most one decimal, e.g. `5 MB` or `1.5 MB`.
 */
export const formatUploadSize = (bytes: number) =>
    `${Number((bytes / (1024 * 1024)).toFixed(1))} MB`;

/**
 * {@link MAX_UPLOAD_BYTES} as display text, resolved once.
 *
 * Both consumers — the field's hint and the size-exceeded message — need the same string, and
 * neither has anything to react to: both operands are module constants.
 */
export const MAX_UPLOAD_SIZE_LABEL = formatUploadSize(MAX_UPLOAD_BYTES);

/**
 * Whether a picked file is within both client-side limits.
 *
 * Split into two predicates rather than one so each failure gets its own message — "too big" and
 * "wrong type" are different things to fix.
 *
 * @param file - The picked file.
 * @returns `true` when the file's declared type is one the backend accepts.
 */
export const isAcceptedImageType = (file: File) =>
    (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type);

/**
 * @param file - The picked file.
 * @returns `true` when the file is no larger than {@link MAX_UPLOAD_BYTES}.
 */
export const isWithinUploadSizeLimit = (file: File) => file.size <= MAX_UPLOAD_BYTES;

/**
 * Progress state for one form's image upload, and the wrapper that drives it.
 *
 * This owns the whole sequence, not just the state. Every form that submits an optional image
 * needs the identical three decisions — attach `onUploadProgress` only when there is a file to
 * watch, surface the percentage while the request runs, return to idle however it ends — and
 * five views each re-deriving them is five places to edit when one of them changes. So the view
 * says what to send and this says how to watch it.
 *
 * @returns `uploadProgress`, `undefined` while idle and 0–100 during a request, and
 *  {@link trackUpload} to wrap the call itself.
 */
export const useUploadProgress = () => {
    /**
     * `undefined` means idle, which is NOT the same as `0` — a request that has started and sent
     * nothing yet. `FormImageUpload` shows the bar for one and hides it for the other.
     */
    const uploadProgress = ref<number>();

    /**
     * Runs an API call with upload progress attached, and returns to idle however it ends.
     *
     * @param file - The picked file, or `undefined`. When absent no progress callback is
     *  attached at all: on a plain field edit the bar would otherwise flash to 100% for a payload
     *  measured in bytes.
     * @param send - Performs the call. Receives the axios overrides to forward to the store
     *  method's `options` parameter, which is `undefined` when there is no file.
     * @returns Whatever `send` resolves with. Progress returns to idle on success, on failure and
     *  on cancellation alike.
     */
    const trackUpload = <T>(
        file: File | undefined,
        send: (options?: AxiosRequestConfig) => Promise<T>
    ) =>
        send(
            file
                ? {
                      // `event.progress` is a 0–1 fraction, absent when the total size is
                      // unknown (a chunked or compressed request) — the bar then stays at 0
                      // rather than jumping about on a number that means nothing.
                      onUploadProgress: (event: AxiosProgressEvent) => {
                          uploadProgress.value = (event.progress ?? 0) * 100;
                      }
                  }
                : undefined
        ).finally(() => {
            // `finally` rather than a `then`/`catch` pair: it forwards the resolved value and
            // re-throws the rejection untouched, so the caller sees exactly what `send` produced.
            uploadProgress.value = undefined;
        });

    return { uploadProgress, trackUpload };
};

/**
 * Validation rule for an optional `imageUpload` field, to be `.extend()`ed into a form's schema
 * next to its other fields.
 *
 * Lives here, beside the limits it enforces, rather than in a per-feature `schemas.ts`: four
 * forms across two features share it, and splitting the rule from the numbers is how the two
 * drift.
 *
 * Messages are THUNKS, resolved at parse time against whatever locale is active — the same
 * contract every other schema in this app keeps, and the reason a single module-scope schema can
 * speak both languages. See `@/features/users/schemas.ts` for the long version.
 */
export const imageUploadSchema = z
    .instanceof(File, { error: () => i18n.global.t('image-upload-form.wrong-type') })
    .refine(isAcceptedImageType, { error: () => i18n.global.t('image-upload-form.wrong-type') })
    .refine(isWithinUploadSizeLimit, {
        error: () =>
            i18n.global.t('image-upload-form.size-exceeded', { size: MAX_UPLOAD_SIZE_LABEL })
    })
    .optional();
