# src/infrastructure/utils/uploads.ts

## Purpose

Client-side mirror of the backend's image-upload limits (accepted MIME types, max size) and a ready-made Zod rule for validating `File` fields in form schemas. It exists purely as a UX affordance—letting users get instant, localized feedback before a multi-megabyte upload is rejected by the server.

## Key elements

- **`ACCEPTED_IMAGE_TYPES`** – Readonly tuple of the four MIME types the backend's `fileFilter` accepts (`image/png`, `image/jpg`, `image/jpeg`, `image/webp`). Must stay in sync with the backend list.
- **`ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE`** – Comma-joined string for a `<input type="file">` `accept` attribute, derived from the tuple above so the picker filter and validation rule cannot disagree.
- **`MAX_UPLOAD_BYTES`** – Maximum upload size in bytes; reads `VITE_MAX_UPLOAD_BYTES` from the environment, falling back to 5 MiB when the value is missing, non-numeric, or zero.
- **`MAX_UPLOAD_SIZE_LABEL`** – Human-readable size string (via `formatFileSize`) resolved once for use in hint text and error messages.
- **`isAcceptedImageType(file)`** – Predicate that checks a `File`'s declared MIME type against `ACCEPTED_IMAGE_TYPES` using a *case-sensitive* comparison (matching the backend's verbatim check).
- **`isWithinUploadSizeLimit(file)`** – Predicate that checks a `File`'s size against `MAX_UPLOAD_BYTES`.
- **`imageUploadSchema`** – Zod schema for an **optional** `File` field. Chains `z.instanceof(File)` → `.refine(isAcceptedImageType)` → `.refine(isWithinUploadSizeLimit)`, each with a `translate()` thunk so error messages resolve in the active locale at parse time. Intended to be `.extend()`-ed into shared form schemas.

## Relationships

No graph neighbors are recorded. The file documents its counterpart on the server side as `src/infrastructure/adapters/storage.ts` (the authoritative `fileFilter` and size gate) and depends at runtime on `@guebbit/js-toolkit` (predicates, `formatFileSize`) and `@/infrastructure/i18n` (`translate`).

## Notes

- **Intentional duplication, not a single source of truth.** `openapi.yaml` declares upload fields as bare `binary`, so orval emits no generated constant. The limits here are hand-copied; a backend change will **not** surface here automatically.
- **`image/jpg` is kept alongside `image/jpeg`** on purpose—some browsers emit the former. Both lists (client and backend) carry it.
- **Case-sensitive MIME matching** is deliberate. Lowercasing before comparison would accept files the server's verbatim `fileFilter` then rejects.
- **`VITE_MAX_UPLOAD_BYTES` fallback is fail-safe:** a `0` or non-numeric value silently falls back to 5 MiB rather than rejecting every upload.
- **Error messages are thunks** (`() => translate(…)`) so they evaluate against the locale active *at parse time*, not at module-load time.
