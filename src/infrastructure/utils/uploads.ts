import { z } from 'zod';
import { formatFileSize, isAcceptedFileType, isWithinFileSize } from '@guebbit/js-toolkit';
import { translate } from '@/infrastructure/i18n';

/**
 * Client-side limits for the `imageUpload` multipart fields.
 *
 * These numbers are a COPY of the backend's (`src/infrastructure/adapters/storage.ts`), restated
 * rather than derived because `openapi.yaml` declares every `imageUpload` field as a bare
 * `type: string, format: binary` — orval's zod generator short-circuits on that and emits no
 * constant, so there is nothing generated to read and nothing that will announce a drift.
 *
 * A UX affordance, never a security control: the backend gates uploads on the declared
 * `Content-Type` and again on the actual magic bytes. Checking here only spares someone waiting
 * out a 5 MB upload to be told no.
 */

/**
 * Mime types the backend's `fileFilter` accepts.
 *
 * Note `image/jpg` alongside `image/jpeg`: not canonical, but browsers emit it and the backend's
 * list carries it for that reason. Keep the two lists identical.
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
 * `VITE_MAX_UPLOAD_BYTES` lets a deployment follow a non-default `NODE_MAX_UPLOAD_BYTES`; a
 * non-numeric or zero value falls back to 5 MB, so a malformed `.env` fails safe rather than
 * rejecting every file.
 */
export const MAX_UPLOAD_BYTES = Number(import.meta.env.VITE_MAX_UPLOAD_BYTES) || 5 * 1024 * 1024;

/** {@link MAX_UPLOAD_BYTES} as display text, resolved once for the hint and the error message. */
export const MAX_UPLOAD_SIZE_LABEL = formatFileSize(MAX_UPLOAD_BYTES);

/**
 * Whether a picked file's declared type is one the backend accepts.
 *
 * Two predicates rather than one so each failure gets its own message — "too big" and "wrong
 * type" are different things to fix.
 *
 * @param file - The picked file.
 * @returns `true` when the type is accepted.
 */
export const isAcceptedImageType = (file: File) =>
    // `caseSensitive`, because the backend's fileFilter compares verbatim: lowercasing first here
    // would accept files the server then rejects.
    isAcceptedFileType(file, ACCEPTED_IMAGE_TYPES, { caseSensitive: true });

/**
 * @param file - The picked file.
 * @returns `true` when the file is no larger than {@link MAX_UPLOAD_BYTES}.
 */
export const isWithinUploadSizeLimit = (file: File) => isWithinFileSize(file, MAX_UPLOAD_BYTES);

/**
 * Validation rule for an optional `imageUpload` field, to be `.extend()`ed into a form's schema.
 *
 * Here, beside the limits it enforces, because four forms across two domains share it and
 * splitting the rule from the numbers is how the two drift.
 *
 * Messages are THUNKS, resolved at parse time against the active locale — see {@link translate}.
 */
export const imageUploadSchema = z
    .instanceof(File, { error: () => translate('image-upload-form.wrong-type') })
    .refine(isAcceptedImageType, { error: () => translate('image-upload-form.wrong-type') })
    .refine(isWithinUploadSizeLimit, {
        error: () => translate('image-upload-form.size-exceeded', { size: MAX_UPLOAD_SIZE_LABEL })
    })
    .optional();
