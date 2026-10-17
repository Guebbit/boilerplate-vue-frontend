---
source: src/modules/example/views/ExampleEdit.vue
sha256: 79c8190fe4f592beae90fe3eb7f02a4992fc2cd8ae8e0a40d4a01079c242230f
generated_at: 2026-10-17T00:54:38.862299+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/views/ExampleEdit.vue

## Purpose

The edit screen for an example resource. It hydrates a form from the Pinia store cache (the route guard has already loaded the record), lets the visitor change title, body, status, and cover image, and on save sends only the changed fields as a JSON diff followed by an optional multipart cover upload.

## Key elements

- **`ExampleEditForm`** (interface) — form data model: `title`, `body`, `status`, `imageUpload` (File).
- **`useStructureFormValidation`** (from `@guebbit/vue-toolkit`) — wires validation (Zod schema), submission, auto-hydration, and invalid-field focus in one composable.
- **`activateAutoHydrate`** — reactively fills the form from `currentExample`; re-fills if the record changes under the form.
- **`statusOptions`** (computed) — maps `EXAMPLE_STATUSES` to `{ value, label }` pairs, re-translated on locale change.
- **`heroTitle`** (computed) — heading fallback chain: record title → route id → i18n page title.
- **`submitForm`** — validates, diffs the form against the loaded record via `toRequestBody`, calls `updateExample`, then uploads a new cover through `setCover` if one was picked. Clears `form.imageUpload` on success to avoid re-uploading the same bytes.
- **`useBlockingError`** — in-place form-level error banner (unmapped API failures).
- **`useMissingRecord`** — redirects to the error page on 404/403 for the routed record.
- **`watchExample`** — selects and hydrates the store record whenever the route `id` changes.
- **`useAxiosUploadProgress`** — tracks cover upload progress for the `FormImageUpload` picker.

## Relationships

- **`src/modules/example/store.ts`** — supplies `useExampleStore` (`watchExample`, `updateExample`, `setCover`, `currentExample`, `loading`). All data reads and writes go through this store.
- **`src/modules/example/schemas.ts`** — provides `exampleEditSchema`, the Zod schema passed to `useStructureFormValidation`.
- **`src/modules/example/domain/index.ts`** — re-exports `EXAMPLE_STATUSES` (and the `ExampleStatus` type) used for the status `<v-select>` options.
- **`src/modules/example/domain/statuses.ts`** — source of the `ExampleStatus` enum values consumed via the domain barrel.
- **`src/modules/example/tests/example-edit-view.spec.ts`** — unit/integration tests targeting this component.

## Notes

- Dual `<script>` + `<script setup>` block is required: `<script setup>` cannot declare a component `name`, which is needed for `<KeepAlive>` and devtools.
- Save is a **two-step** flow: JSON diff PATCH first, then a separate multipart request for the cover (only when a new file is selected). The cover request is not part of the JSON payload.
- `toRequestBody` performs the diff against `currentExample`, so unchanged fields are omitted from the request body.
- `revalidateOn: locale` causes validation messages to re-translate when the active locale changes.
- The route guard is expected to have already loaded the record; `watchExample` handles subsequent id changes (e.g., navigating between two examples without a full reload).
