---
source: src/modules/account/components/ProfileAvatar.vue
sha256: 2aee0c1e6db2e5c2492bc0a827c9592809edc94014cb1e8d0115220b41504710
signature: 2aee0c1e6db2e5c2492bc0a827c9592809edc94014cb1e8d0115220b41504710
generated_at: 2026-11-10T03:20:16.255834+00:00
model: ollama:qwen3.8:27b
---

# src/modules/account/components/ProfileAvatar.vue

## Purpose

Renders the profile-picture panel: a file picker that uploads immediately on selection (no separate save button — the image lives outside the details form) and a remove button. Uploads and removals both PATCH the same single field, so they share one blocking-error slot.

## Key elements

- **`pickedFile` (ref)** — Holds the `File` chosen by `FormImageUpload`; reset to `undefined` in the watcher's `finally`, so the input never shows a stale selection.
- **`watch(pickedFile, …)`** — On each non-`undefined` value: validates against `imageUploadSchema` (client-side message only), then calls `updateProfile({ imageUpload: file }, options)` inside `trackUpload`. Success → toast; failure → `reportAvatarError`.
- **`handleRemove`** — Wrapped in `singleFlight` to guard against double-clicks. Opens a Vuetify confirm dialog, then calls `updateProfile({ imageUrl: null })`. Success → toast; failure → `reportAvatarError`.
- **`busy` (computed)** — True while `uploadingAvatar` or `removingAvatar` is set; disables both the picker and the remove button to prevent concurrent `PATCH /account` calls.
- **`avatarError` / `reportAvatarError` / `clearAvatarError`** — Single `useBlockingError()` instance shared by both actions; rendered via `InlineErrorAlert` beneath the picker.
- **`uploadProgress` / `trackUpload`** — From `useAxiosUploadProgress`; feeds the progress bar prop on `FormImageUpload` during the multipart request.

## Relationships

- **`src/modules/account/stores/profile.ts`** — Source of the Pinia store. Provides the `updateProfile` action and the reactive refs `profile`, `uploadingAvatar`, `removingAvatar` (via `storeToRefs`) that drive this component's state and button-disabled logic.
- **`src/modules/account/views/Profile.vue`** — Parent view; renders `<ProfileAvatar>` as part of the account settings page.
- **`src/modules/account/tests/profile-avatar-panel.spec.ts`** — Unit test spec for this component (mounts it, simulates upload/remove flows).

## Notes

- The file uses **two** `<script>` blocks: a plain `export default { name: 'ProfileAvatar' }` alongside `<script setup>`, because `<script setup>` cannot declare a component name (needed for `<KeepAlive>` / DevTools).
- `imageUrl: null` is the API's "remove" sentinel; sending `undefined` means "don't touch," and `''` is rejected by the backend's `minLength: 1`.
- `handleRemove` is wrapped in `singleFlight` to collapse rapid clicks into one promise; the `busy` computed is a separate, broader guard that also blocks the picker.
- Client-side validation (`imageUploadSchema.safeParse`) exists only for the user-facing error message — the backend's upload limiter and image pipeline are the real enforcement.
