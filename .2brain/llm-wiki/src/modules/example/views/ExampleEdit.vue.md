---
source: src/modules/example/views/ExampleEdit.vue
sha256: 124b150995150e1cefd9be939024488ce3748838082490e73bd53ff9e774ad06
signature: 124b150995150e1cefd9be939024488ce3748838082490e73bd53ff9e774ad06
generated_at: 2026-11-10T04:28:26.449369+00:00
model: ollama:qwen3.8:27b
---

# src/modules/example/views/ExampleEdit.vue

## Purpose

Edit screen for an "example" record, identified by the route `id`. It hydrates a form (title, body, cover image) from the Pinia cache, sends only changed fields as a JSON PATCH, handles the 412 "record moved" case with a reload-latest flow, and renders the status-transition buttons the server allows. The form is read-only when the record's `actions.update` is `false`.

## Key elements

- **`submitForm`** – Validates via `useStructureFormValidation`, diffs with `toRequestBody`, calls `updateExample`, then optionally uploads a cover via `setCover`. Catches errors: 412 → `useStaleRecord`; other server errors → `applyServerErrors`; unmapped → `useBlockingError`.
- **`activateAutoHydrate`** – Fills the form from `currentExample` and re-hydrates if the record changes underneath (e.g., after reload-latest).
- **`mayEdit`** (computed) – `false` only when `currentExample.actions.update === false`; drives the `<fieldset disabled>` and the read-only alert.
- **`useExampleTransition`** – Supplies `changeStatus` and `statusError`; the same composable the detail view uses. Exposed to children via `provideExample`.
- **`useStaleRecord`** – Detects 412 on save; `reloadLatest` calls `fetchExample(id, { forced: true })` to bust the cache and refresh the ETag.
- **`useLeaveGuard`** – Warns on navigation while `isDirty`; `markSaved()` suppresses the guard after a successful save.
- **`watchExample(() => id, …)`** – Re-fetches when the route param changes; `useMissingRecord` handles 404/403.
- **`asideFields`** (computed) – ID, `createdAt`, `updatedAt` rows for the aside card.
- **Named block `ExampleEditPage`** – Stable component name for `<KeepAlive>` / devtools.

## Relationships

- **`src/modules/example/store.ts`** – Primary data source: `watchExample`, `updateExample`, `setCover`, `fetchExample`, `currentExample`, `loading`.
- **`src/modules/example/schemas.ts`** – Provides `exampleFormSchema` (Zod/Valibot schema) consumed by `useStructureFormValidation`.
- **`src/modules/example/provided.ts`** – `provideExample({ example, changeStatus })` injects the record and transition action into descendant components.
- **`src/modules/example/composables/use-example-transition.ts`** – `useExampleTransition` drives the status buttons and surfaces `statusError`.
- **`src/modules/example/components/ExampleStatusActions.vue`** – Renders the server-supplied status moves; receives `changeStatus` via the provided context.
- **`src/modules/example/tests/example-edit-view.spec.ts`** – Unit/integration tests for this view.

## Notes

- The form submits **two sequential requests**: a JSON PATCH for scalar fields, then a separate multipart upload for the cover. The picked `File` is cleared from the form after upload so it is not re-sent on the next save.
- `toRequestBody` performs the diff against the in-memory record; if the record is stale the server returns 412 rather than silently overwriting.
- `revalidateOn: locale` in the form-validation options re-runs validation (and its i18n messages) on locale change.
- The read-only gate is **row-level** (`actions.update`), distinct from the route-level `meta.can` that permitted navigation in the first place.
- `useLeaveGuard` reads `session.isAuth` to distinguish a forced sign-out (suppress the guard) from a user-initiated navigation.
