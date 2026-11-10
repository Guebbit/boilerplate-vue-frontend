---
source: src/modules/locales/components/EntryFormDialog.vue
sha256: 38aae378f8cf62edc03e51db64b9553edd1d7ef6064d3cebd3868776b697affc
signature: a3488de01db324a34460d4a55c46b85d8ea4b0e31fd65978b1ced9b68139ed61
generated_at: 2026-11-10T04:38:36.227234+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/components/EntryFormDialog.vue

## Purpose

A reusable "add one locale entry" dialog (app / key / value) that validates input against `localesEntrySchema`, resets all fields on every open, and emits the saved fields upward. It owns no store access and no error-handling policy of its own — the parent page decides how a blocked save is displayed. It is strictly add-only; edits to existing entries happen inline in the table.

## Key elements

- **Props** — `apps: LocaleAppDescriptor[]` (select options from the API registry), `initialApp?: string` (preselect matching the page filter), `saving?: boolean` (disables submit while a write is in flight).
- **`defineModel<boolean>` (`isOpen`)** — two-way visibility binding; the dialog neither declares the prop nor re-emits the event manually.
- **`emit('save', { app, key, value })`** — the single outward signal after successful validation.
- **`useStructureFormValidation`** — provides `form`, `formErrors`, `showFormErrors`, `handleSubmit`, `setForm`, `applyServerErrors`; validates against `localesEntrySchema`; re-validates on locale change; fires a toast via `useNotificationsStore` on invalid submit.
- **`watch(isOpen)`** — resets the form to `{ app: defaultApp, key: '', value: '' }` every time the dialog opens, preventing stale values from a prior use of the single shared instance.
- **`appOptions` (computed)** — maps the `apps` prop into Vuetify select items (`value` / `title`).
- **`handleSave`** — delegates to `handleSubmit`; on valid input, emits `save`.
- **`defineExpose({ applyServerErrors })`** — lets the parent push a server-side rejection (e.g. duplicate key) onto the specific field that caused it.
- **Slot `error`** — render point for the parent's `InlineErrorAlert`, positioned above the action buttons. The form's own validation errors do not use this slot.

## Relationships

- **`src/modules/locales/schemas.ts`** — imports `localesEntrySchema`, the Zod schema that drives all field validation in this dialog.
- **`src/modules/locales/views/LocaleEntries.vue`** — the parent page. Supplies `apps` and `initialApp`, toggles `isOpen` via `v-model`, listens for `save`, passes `saving`, renders the `error` slot with its `InlineErrorAlert`, and calls the exposed `applyServerErrors` when the API rejects the write.
- **`src/modules/locales/tests/form-dialogs.spec.ts`** — unit/integration tests exercising open-reset, validation, emit, and server-error passthrough behaviors.
- **`tests/cross-cutting/module-map.spec.ts`** — asserts this component appears in the expected module graph / barrel structure.

## Notes

- **Never disabled on validity.** The submit button stays enabled even when the form is invalid; clicking it triggers `handleSubmit`, which surfaces the field errors and toasts. A greyed-out button would explain nothing to the user.
- **Single instance, not per-row.** The page keeps one dialog instance and reopens it; the `watch(isOpen)` reset is what prevents yesterday's values leaking into today's add.
- **`saving` gates, not validates.** It exists purely to prevent a double-submit (Enter + click, or rapid double-click) while the parent's network write is in flight.
- **Server vs. local errors.** Local schema errors are shown inline via `fieldErrorProps`. Server-side rejections that name a field are routed through `applyServerErrors`; rejections that don't name a field are shown by the parent in the `error` slot.
- **`novalidate` on `<form>`** — all validation is delegated to the schema hook; the browser's native constraints are intentionally bypassed.
