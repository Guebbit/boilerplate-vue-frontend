---
source: src/ui/molecules/FormImageUpload.vue
sha256: 2df7b6717e9ae5553220a4313c94d62c8993893ddb61e6ec9cddd852e4f27b50
signature: 2df7b6717e9ae5553220a4313c94d62c8993893ddb61e6ec9cddd852e4f27b50
generated_at: 2026-11-10T06:27:03.281796+00:00
model: ollama:qwen3.8:27b
---

# src/ui/molecules/FormImageUpload.vue

## Purpose

A reusable image-picker form field combining a `v-file-input`, a live `<img>` preview (object URL or existing record image), and an optional upload-progress bar. It encapsulates the object-URL lifecycle so parent forms only deal with a single `File` model and a numeric `progress` prop.

## Key elements

- **`pickedFile`** (`defineModel<File | undefined>`) — two-way binding for the selected file; the component normalises array-shaped values back to a single `File`.
- **`normaliseSelection(value)`** — collapses a possible `File[]` (Vuetify quirk) to the first `File`, or returns `undefined`.
- **`objectUrl`** (`ref<string>`) — holds the blob object URL for the preview. Managed as a `ref` (not a computed) so `URL.revokeObjectURL` can be called deterministically on every replacement and on unmount, preventing blob-memory leaks.
- **`releaseObjectUrl()`** — revokes and clears `objectUrl`; a safe no-op when nothing is held.
- **`watch(pickedFile, …)`** — on every selection change: revokes the outgoing URL, mints a new one if a file was picked, and writes the normalised single-file value back into the model.
- **`onBeforeUnmount(releaseObjectUrl)`** — final cleanup so the blob never outlives the component.
- **`previewSource`** (computed) — `resolveImageUrl(objectUrl ?? currentImageUrl)`. Falls through to the record's existing image while nothing new is picked.
- **`isUploading`** / **`progressPercent`** (computed) — derived from the `progress` prop; `undefined` hides the bar, `0` shows a just-started upload.
- **`fieldErrorProps(errorMessages)`** — spreads shared validation-error props onto the `v-file-input`.
- **Props** — `label`, `hint`, `currentImageUrl`, `errorMessages`, `progress`, `disabled`; all optional with sensible defaults (i18n strings, empty label).

## Relationships

No graph neighbors.

## Notes

- `resolveImageUrl` is critical: the API returns paths relative to its own origin; a bare `/images/…` in `src` would 404 on any deployment where the app origin differs.
- The progress bar carries `data-testid="upload-progress"` because Vuetify renders its own `.v-progress-linear` inside `v-file-input`'s loader; a class-based selector in tests would match that internal element instead.
- `progress: undefined` (no upload) is intentionally distinct from `progress: 0` (upload started, no bytes yet).
- The object-URL-as-ref decision is deliberate: a computed would re-evaluate and mint a fresh URL, orphaning every prior one.
- `ACCEPTED_IMAGE_ACCEPT_ATTRIBUTE` and `MAX_UPLOAD_SIZE_LABEL` come from `@/infrastructure/utils/uploads.ts`, keeping the allowed-types and size-limit copy in one place.
