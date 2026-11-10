---
source: src/infrastructure/utils/uploads.ts
sha256: fd9bb0804bb7d5dc50893b11b38224389c36ecd818af735d1a86cd2511a7bb84
signature: 32f4eacb608e6bc63f6a3ff362297396be616fcbc701054a7abe46af9480835f
generated_at: 2026-11-10T03:13:52.024859+00:00
model: ollama:qwen3.8:27b
---

# src/infrastructure/utils/uploads.ts

## Purpose

Client-side mirror of the backend's image-upload limits. Provides a reusable Zod schema and helper predicates so forms can reject oversized or wrong-type files *before* the user waits out a network upload. It is explicitly a UX affordance, not a security boundary — the backend independently validates `Content-Type` and magic bytes.

## Key elements

- **`ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE`** – Comma-joined string derived from `ACCEPTED_UPLOAD_TYPES`, meant for a file-input `accept` attribute so the picker filter and validation rule stay in sync.
- **`MAX_UPLOAD_BYTES`** – Upload size cap in bytes. Reads `VITE_MAX_UPLOAD_BYTES` via `runtimeValue`; falls back to 5 MiB if the value is missing, non-numeric, or zero.
- **`MAX_UPLOAD_SIZE_LABEL`** – Human-readable size string (via `formatFileSize`) resolved once, used in both the hint and the error message.
- **`isAcceptedImageType(file)`** – Returns `true` if the file's declared type matches `ACCEPTED_UPLOAD_TYPES`. Uses `caseSensitive: true` to mirror the backend's verbatim comparison.
- **`isWithinUploadSizeLimit(file)`** – Returns `true` if the file's size is ≤ `MAX_UPLOAD_BYTES`.
- **`imageUploadSchema`** – A Zod chain (`instanceof(File)` → `.refine(type)` → `.refine(size)`) → `.optional()`. Designed to be `.extend()`-ed into form schemas. Error messages are thunks resolved at parse time via `translate`.

## Relationships

No graph neighbors are recorded for this file. It is a leaf utility consumed by form schemas (not tracked in the dependency graph here).

## Notes

- **Not a security control.** The file's own docblock stresses this twice. Relying on these checks to *block* a bad upload is a bug; they only save the user from a wasted round-trip.
- **Case-sensitive type check.** `isAcceptedFileType` is called with `{ caseSensitive: true }` because the backend's `fileFilter` compares verbatim. Lowercasing client-side would accept files the server then rejects.
- **Size fallback is intentional.** A malformed or missing `VITE_MAX_UPLOAD_BYTES` falls back to 5 MiB rather than `0`/`NaN`, so a bad `.env` doesn't reject every file.
- **Schema is optional by design.** The trailing `.optional()` means the field can be absent; the `instanceof(File)` check only fires when a value *is* present.
- **Shared across four forms in two domains.** The schema is co-located with the limits deliberately — splitting them is noted as the historical cause of drift.
