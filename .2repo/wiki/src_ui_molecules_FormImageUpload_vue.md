# src/ui/molecules/FormImageUpload.vue

## Purpose

A single-image picker field for forms: wraps Vuetify's `v-file-input`, renders a live preview from an object URL (or a stored image on edit), and optionally displays an upload-progress bar driven by the parent. It owns the full lifecycle of the temporary object URL so the blob never leaks.

## Key elements

- **`pickedFile`** — `defineModel<File | undefined>()`; the two-way binding the parent form reads/writes. Always a single `File`, never an array.
- **`normaliseSelection`** — Coerces whatever Vuetify's model emits (`File | File[] | null`) down to `File | undefined`.
- **`objectUrl`** (ref) + **`releaseObjectUrl`** — Pairs a `URL.createObjectURL` with a guaranteed `URL.revokeObjectURL` on every selection change and on unmount. Kept as a ref (not a computed) to avoid minting a new URL each re-evaluation and leaking the old one.
- **`isUploading` / `progressPercent`** — Computed booleans/numbers derived from the `progress` prop. `undefined` hides the bar; `0` means the request started but sent nothing yet.
- **`previewSource`** — Computed: prefers the object URL of the picked file, falls back to `currentImageUrl`. Both pass through `resolveImageUrl` so API-relative paths are resolved against the API origin, not the app origin.
- **Props** — `label`, `hint`, `currentImageUrl`, `errorMessages`, `progress`, `disabled`. All optional; i18n defaults supplied when label/hint are empty.

## Relationships

No graph neighbors are recorded. The file imports two infrastructure utilities (`ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE`, `MAX_UPLOAD_SIZE_LABEL` from `uploads.ts`; `resolveImageUrl` from `images.ts`) and Vuetify / vue-i18n, but no other in-repo source files depend on it or are listed as neighbors.

## Notes

- **`progress` is tri-state**: `undefined` (no upload → bar hidden) vs `0` (upload started, 0 bytes sent) vs `1–100`. Do not conflate `undefined` with `0` when wiring `onUploadProgress`.
- **Object-URL hygiene**: the revoke-before-recreate order matters; calling `revokeObjectURL` after creating the replacement URL is a no-op in some browsers and a silent bug in others. The watcher always revokes first.
- **`data-testid="upload-progress"`** on the progress bar exists because Vuetify's `v-file-input` renders its own internal `.v-progress-linear`; a class-based selector in tests would match that inner element and produce false positives.
- **`resolveImageUrl`** is essential for `currentImageUrl`: the API returns a path relative to itself (e.g. `/images/foo.png`), which the browser would otherwise resolve against the app's origin → 404 on any deployment where the two hosts differ.
- **Array collapse in the watcher**: if a future Vuetify version hands back a `File[]` despite `multiple` not being set, the watcher writes the first element back into the model so the parent contract stays `File | undefined`.
