# src/infrastructure/utils/uploads.ts

## Purpose

Client-side mirror of the backend's image-upload limits (accepted MIME types, max size) and a single reusable Zod rule that enforces them on a form's optional `File` field. Exists purely as a UX affordance—so users get immediate feedback instead of waiting for a large upload to be rejected by the server.

## Key elements

- **`ACCEPTED_IMAGE_TYPES`** — `readonly` array of the four MIME types the backend's `fileFilter` accepts (`png`, `jpg`, `jpeg`, `webp`). Includes non-canonical `image/jpg` because browsers emit it.
- **`ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE`** — Comma-joined string derived from `ACCEPTED_IMAGE_TYPES` for use as a `<input type="file">` `accept` value, keeping the picker filter and the validation rule in lockstep.
- **`MAX_UPLOAD_BYTES`** — Maximum allowed upload size in bytes. Read from `VITE_MAX_UPLOAD_BYTES` env var; falls back to 5 MiB if the value is non-numeric or zero.
- **`MAX_UPLOAD_SIZE_LABEL`** — Human-readable size string (via `formatFileSize`) resolved once for hint text and error messages.
- **`isAcceptedImageType(file)`** — Predicate wrapping `isAcceptedFileType` with `caseSensitive: true` to match the backend's verbatim comparison.
- **`isWithinUploadSizeLimit(file)`** — Predicate wrapping `isWithinFileSize` against `MAX_UPLOAD_BYTES`.
- **`imageUploadSchema`** — Zod schema: `instanceof(File)` → refine type → refine size → `.optional()`. Error messages are thunks resolved at parse time through `translate()` for i18n. Intended to be `.extend()`-ed into a form schema.

## Relationships

No formal graph neighbors. The file imports:

- `@guebbit/js-toolkit` — `formatFileSize`, `isAcceptedFileType`, `isWithinFileSize` (underlying predicates and formatter).
- `@/infrastructure/i18n` — `translate` (locale-aware error message resolution).
- References `src/infrastructure/adapters/storage.ts` in a comment as the authoritative source of the limits it mirrors.

## Notes

- The numbers are a **deliberate copy** of the backend's, not derived from it. `openapi.yaml` declares upload fields as bare `type: string, format: binary`, so orval generates no constants to import. Keep both sides in sync manually.
- `isAcceptedImageType` is case-sensitive **on purpose**—the backend compares MIME types verbatim. Lowercasing client-side would accept files the server then rejects.
- `imageUploadSchema` is optional (`.optional()`), so a form can omit the field entirely without triggering validation.
- The two separate refine predicates (type, size) exist so each failure produces its own distinct i18n message rather than a single combined error.
- `image/jpg` alongside `image/jpeg` is intentional; both must be present in any list you mirror.
