---
source: src/modules/account/components/ProfileAvatar.vue
sha256: 9213ec137f573d56a9f8fae4ca8fcc73ccc1131d3b262b56b626120d9b0f4b41
generated_at: 2026-10-17T00:15:38.612013+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfileAvatar.vue

## Purpose

The profile-picture panel for the account page. It lets the visitor upload a new avatar or remove the current one, each action committed immediately to the profile store (no separate "save" step, since the avatar is not part of the details form below it). It owns client-side file validation, upload progress display, a confirmation dialog for removal, and in-place error reporting.

## Key elements

- **`pickedFile` (ref\<File\>)** – tracks the file selected in `FormImageUpload`; cleared to `undefined` in `.finally()` after upload settles so the picker never shows a stale selection.
- **`errorMessage` (ref\<string\>)** – synchronous client-side validation message from `imageUploadSchema.safeParse`, shown on the picker.
- **`busy` (computed)** – true while `uploadingAvatar` or `removingAvatar` is active; disables both the picker and the remove button to prevent a second concurrent `PATCH /account`.
- **`useBlockingError()` instance** (`avatarError` / `reportAvatarError` / `clearAvatarError`) – shared failure state rendered by `InlineErrorAlert`; upload and remove both report here since they target the same field.
- **`watch(pickedFile, …)`** – validates the picked file, then calls `trackUpload(file, opts => updateProfile({ imageUpload: file }, opts))` to start the multipart upload with progress tracking.
- **`handleRemove()`** – opens a confirm dialog (`useDialogStore`), then calls `updateProfile({ imageUrl: null })`.
- **Template** – `FormImageUpload` (picker + current image + progress), a conditionally-rendered `v-btn` for removal, and `InlineErrorAlert` for blocking errors.

## Relationships

- **`src/modules/account/stores/profile.ts`** – Consumes `updateProfile` (both upload and remove), and reads `profile`, `uploadingAvatar`, `removingAvatar` via `storeToRefs`. All avatar mutations flow through this single store action.
- **`src/modules/account/views/Profile.vue`** – Parent view that renders this component as the avatar section of the profile page.
- **`src/modules/account/tests/profile-avatar-panel.spec.ts`** – Unit/integration tests exercising the upload, validation, and remove flows of this component.

## Notes

- **Remove sends `imageUrl: null`, not `''` or `undefined`.** The API contract uses `null` to mean "delete the stored image"; `undefined` means "field not sent" (no-op), and `''` is rejected by the schema's `minLength: 1` with a 422.
- **Client-side validation is UX, not security.** `imageUploadSchema` gives an immediate friendly message; the backend's upload limiter and image pipeline are the authoritative gate.
- **Single blocking-error instance by design.** Because upload and remove target the same one picture field, they share one `useBlockingError` so there is exactly one error slot in the layout.
- **Dual `<script>` blocks.** The non-setup block exists solely to set the component `name` for devtools and `<KeepAlive>`; `<script setup>` cannot declare `name` itself.
