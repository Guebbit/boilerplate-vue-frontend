# src/ui/molecules/FormImageUpload.vue

## Purpose

A single-image picker form field built on Vuetify's `v-file-input`. It renders a live preview from an object URL (or the record's existing image), displays validation errors, and shows an upload-progress bar whose percentage is driven by the parent via a `progress` prop. It exists so that every form that needs an "upload one image" input can drop in a consistent, self-contained field.

## Key elements

- **`pickedFile`** (`defineModel<File | undefined>`) — the two-way model the parent binds; always a single `File` or `undefined`.
- **`normaliseSelection`** — collapses Vuetify's `File | File[] | null` model shape down to a single `File`, guarding against an array ever leaking into the parent's form state.
- **`objectUrl`** (ref) + **`releaseObjectUrl`** — manually managed `URL.createObjectURL` / `revokeObjectURL` pair. Deliberately a ref, not a computed, so each blob is pinned exactly once and released on replacement, clear, or unmount.
- **`watch(pickedFile, …)`** — the single sync point: normalises the selection, revokes the outgoing URL, mints a new one, and writes the collapsed file back into the model.
- **`previewSource`** (computed) — resolves `objectUrl` or `currentImageUrl` through `resolveImageUrl`, then feeds the `<img>` tag.
- **`isUploading` / `progressPercent`** (computed) — derive the progress-bar visibility and label from the `progress` prop.
- **Props** — `label`, `hint`, `currentImageUrl`, `errorMessages`, `progress`, `disabled`; all optional with sensible defaults drawn from i18n and shared upload constants.

## Relationships

No graph neighbors are recorded for this file. It imports two shared utilities:

- `@/infrastructure/utils/uploads.ts` — `ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE`, `MAX_UPLOAD_SIZE_LABEL`.
- `@/infrastructure/utils/images.ts` — `resolveImageUrl` (rewrites API-relative image paths to the API origin).

The parent form is expected to pass a `progress` value from an axios `onUploadProgress` callback and to read `pickedFile` via the model binding.

## Notes

- **`progress` semantics:** `undefined` means "no upload in flight" (bar hidden); `0` means "request started, nothing sent yet" (bar shown at 0 %). Do not default the prop to `0`.
- **Object-URL lifecycle:** the URL is created and revoked only inside the `watch` and `onBeforeUnmount`. Adding a new code path that calls `URL.createObjectURL` without a matching `revokeObjectURL` will leak the blob for the lifetime of the SPA session.
- **`data-testid="upload-progress"`** is used instead of a class selector because Vuetify's own `v-file-input` renders an internal `.v-progress-linear`; a class-based spec would match both and pass regardless of whether this bar is rendered.
- **`resolveImageUrl`** is a no-op for `blob:` object URLs but rewrites `/images/…` paths against the API base URL. Skipping it would cause 404s on any deployment where the API origin differs from the app origin.
- The component uses `defineModel` (Vue ≥ 3.4). The parent must bind with `v-model` to get the two-way file binding.
