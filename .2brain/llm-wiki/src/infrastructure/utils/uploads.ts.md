---
source: src/infrastructure/utils/uploads.ts
sha256: 31f46366f3a1daa301cecbf1c7e47c79686a59593cd2750077ccf0b9dd067f01
generated_at: 2026-10-02T12:06:01.922324+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/uploads.ts

## Purpose

Client-side mirror of the backend's image-upload limits and a shared Zod validation rule (`imageUploadSchema`). It exists purely as a UX affordance—rejecting bad files before the user waits for a network round-trip—while the backend remains the authoritative gate on `Content-Type` and magic bytes.

## Key elements

- **`ACCEPTED_IMAGE_TYPES`** — readonly tuple of the four MIME types the backend's `fileFilter` accepts (`image/png`, `image/jpg`, `image/jpeg`, `image/webp`).
- **`ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE`** — the same list joined into a CSV string for a `<input accept>` attribute, so the file-picker filter and the validation rule can never disagree.
- **`MAX_UPLOAD_BYTES`** — maximum upload size in bytes. Resolved from `runtimeValue('MAX_UPLOAD_BYTES')` / `VITE_MAX_UPLOAD_BYTES`; falls back to 5 MiB on any non-numeric or zero value.
- **`MAX_UPLOAD_SIZE_LABEL`** — human-readable size string (via `formatFileSize`) resolved once for use in hint and error copy.
- **`isAcceptedImageType(file)`** — predicate wrapping `isAcceptedFileType` with `caseSensitive: true` to match the backend's verbatim comparison.
- **`isWithinUploadSizeLimit(file)`** — predicate wrapping `isWithinFileSize` against `MAX_UPLOAD_BYTES`.
- **`imageUploadSchema`** — a Zod chain (`instanceof File` → type refine → size refine → `.optional()`) intended to be `.extend()`-ed into form schemas. Error messages are thunks calling `translate()` so they resolve against the active locale at parse time.

## Notes

- The MIME list and byte limit are **hand-copied** from the backend (`src/infrastructure/adapters/storage.ts`). The OpenAPI spec declares upload fields as bare `format: binary`, so orval's Zod generator emits no constants to import—drift is silent and must be caught by keeping both lists in sync manually.
- `image/jpg` is non-canonical but present because some browsers emit it; the backend's list mirrors this. Keep the two lists identical.
- Type matching is **case-sensitive** on purpose. Lowercasing first would accept files the server then rejects.
- The `|| 5 * 1024 * 1024` fallback means a malformed or zero env value fails safe (accepts up to 5 MiB) rather than rejecting every file.
- Four forms across two domains share `imageUploadSchema`; the limits and the rule live in the same file deliberately to reduce the chance they diverge.
