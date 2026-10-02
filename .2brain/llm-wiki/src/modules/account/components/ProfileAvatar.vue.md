---
source: src/modules/account/components/ProfileAvatar.vue
sha256: a75e25c4ceaaa2718de2802ab8d157b03e1ff2e58125c63a5d32bf63d340ea0f
generated_at: 2026-10-02T12:10:38.893126+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfileAvatar.vue

## Purpose
Self-contained panel for the account profile's avatar image. It handles both uploading a new picture and removing the existing one, acting immediately on selection (no separate save step) — unlike the details form that sits below it in the profile page.

## Key elements
- **`watch(pickedFile, …)`** — Upload pipeline: resets local state, validates the file synchronously against `imageUploadSchema`, then fires `updateProfile({ imageUpload: file })` via `trackUpload` (axios progress-aware). Clears `pickedFile` in `.finally()` so the picker never shows a stale selection.
- **`handleRemove()`** — Opens a confirmation dialog (`useDialogStore().confirm`), then calls `updateProfile({ imageUrl: null })`. Success toasts; failure feeds the shared blocking error.
- **`busy` (computed)** — `uploadingAvatar || removingAvatar`; disables both the picker and the remove button to prevent concurrent `PATCH /account` calls.
- **`useBlockingError()` (single instance)** — Shared `message` / `report` / `clear` triple for both upload and remove failures, rendered as `InlineErrorAlert` next to the picker.
- **`useAxiosUploadProgress()`** — Exposes `progress` and `trackUpload` so `FormImageUpload` can display a percentage while the multipart request is in flight.
- **`errorMessage` (ref)** — Synchronous client-side validation message (e.g. wrong type, oversized) shown by `FormImageUpload`; distinct from the async `avatarError`.
- **`imageUploadSchema.safeParse(file)`** — Reuses the same Zod schema `Signup.vue` applies, but against a single file rather than a full form.

## Relationships
- **`src/infrastructure/utils/logger.ts`** — Connected through the `@/infrastructure/utils/` layer (`use-blocking-error.ts`, `uploads.ts`). This component does not import `logger.ts` directly; logging (if any) happens inside those shared utilities.

## Notes
- **`imageUrl: null` is the remove signal.** `undefined` means "field not sent" and leaves the stored image untouched; `''` is rejected by the backend's `minLength: 1` with a 422. Never use either of those for removal.
- **One blocking-error instance for two actions.** Upload and remove both mutate the same `imageUrl` field, so they share a single `useBlockingError()` and a single `InlineErrorAlert` slot. Don't split them without a UI redesign.
- **Client-side validation is UX-only.** `imageUploadSchema.safeParse` gates the message, not the security boundary — the backend's upload limiter and image pipeline are the real gate.
- **`pickedFile` reset is unconditional.** The `.finally()` in the upload watcher clears the ref whether the request succeeded or failed, so the picker always reflects the record's actual state.
- **Mirrors `modules/users/store.ts`**'s `{ imageUpload, …rest }` split, one call site further down the stack.
