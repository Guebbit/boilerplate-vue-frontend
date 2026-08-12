import type { AxiosProgressEvent, AxiosRequestConfig } from 'axios';
import { z } from 'zod';
import { useUploadProgress as useToolkitUploadProgress } from '@guebbit/vue-toolkit';
import { formatFileSize, isAcceptedFileType, isWithinFileSize } from '@guebbit/js-toolkit';
import { translate } from '@/infrastructure/i18n.ts';

/**
 * Client-side limits for the `imageUpload` multipart fields.
 *
 * ── These numbers are a COPY, and the copy is deliberate ──────────────────────
 * The authority is the backend, in two places:
 *
 *   - accepted mime types  → `src/infrastructure/adapters/storage.ts:122`
 *   - maximum size         → `src/infrastructure/adapters/storage.ts:170-183`
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
 * Pinned to MB rather than letting `formatFileSize` pick the fitting unit: the hint and the
 * error quote a configured limit, and a limit that reads `512 KB` on one deployment and `5 MB`
 * on the next is harder to compare against than one that always reads in the same unit.
 *
 * @param bytes - Size in bytes.
 * @returns The size in MB with at most one decimal, e.g. `5 MB` or `1.5 MB`.
 */
export const formatUploadSize = (bytes: number) => formatFileSize(bytes, { unit: 'MB' });

/**
 * {@link MAX_UPLOAD_BYTES} as display text, resolved once.
 *
 * Both consumers — the field's hint and the size-exceeded message — need the same string, and
 * neither has anything to react to: both operands are module constants.
 */
export const MAX_UPLOAD_SIZE_LABEL = formatFileSize(MAX_UPLOAD_BYTES);

/**
 * Whether a picked file is within both client-side limits.
 *
 * Split into two predicates rather than one so each failure gets its own message — "too big" and
 * "wrong type" are different things to fix. Both are `@guebbit/js-toolkit` checks with this app's
 * limits bound to them, so the rule and the numbers cannot drift apart.
 *
 * @param file - The picked file.
 * @returns `true` when the file's declared type is one the backend accepts.
 */
export const isAcceptedImageType = (file: File) =>
    // `caseSensitive`, because the backend's fileFilter compares verbatim: a client-side check
    // that lowercased first would accept files the server then rejects — a worse experience than
    // rejecting early.
    isAcceptedFileType(file, ACCEPTED_IMAGE_TYPES, { caseSensitive: true });

/**
 * @param file - The picked file.
 * @returns `true` when the file is no larger than {@link MAX_UPLOAD_BYTES}.
 */
export const isWithinUploadSizeLimit = (file: File) => isWithinFileSize(file, MAX_UPLOAD_BYTES);

/**
 * Progress state for one form's image upload, and the wrapper that drives it.
 *
 * The state machine is the toolkit's — bar appears with the request, returns to idle however it
 * ends, nothing tracked when there is no file. All this adds is the axios binding, which is the
 * only app-specific part and lives here once instead of in each of the five forms that upload.
 *
 * @returns `uploadProgress`, `undefined` while idle and 0–100 during a request, and
 *  {@link trackUpload} to wrap the call itself.
 */
export const useUploadProgress = () => {
    const { progress, track } = useToolkitUploadProgress<AxiosRequestConfig>((onProgress) => ({
        // `event.progress` is a 0–1 fraction, absent when the total size is unknown (a chunked
        // or compressed request) — reporting 0 keeps the bar still rather than jumping about on
        // a number that means nothing.
        onUploadProgress: (event: AxiosProgressEvent) => onProgress(event.progress ?? 0)
    }));

    /**
     * Runs an API call with upload progress attached, and returns to idle however it ends.
     *
     * @param file - The picked file, or `undefined`. When absent nothing is tracked at all: on a
     *  plain field edit the bar would otherwise flash to 100% for a payload measured in bytes.
     * @param send - Performs the call. Receives the axios overrides to forward to the store
     *  method's `options` parameter, which is `undefined` when there is no file.
     * @returns Whatever `send` resolves with, untouched.
     */
    const trackUpload = <T>(
        file: File | undefined,
        send: (options?: AxiosRequestConfig) => Promise<T>
    ) => track(send, { enabled: !!file });

    return { uploadProgress: progress, trackUpload };
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
 * speak both languages. See {@link translate} for the long version.
 */
export const imageUploadSchema = z
    .instanceof(File, { error: () => translate('image-upload-form.wrong-type') })
    .refine(isAcceptedImageType, { error: () => translate('image-upload-form.wrong-type') })
    .refine(isWithinUploadSizeLimit, {
        error: () => translate('image-upload-form.size-exceeded', { size: MAX_UPLOAD_SIZE_LABEL })
    })
    .optional();
