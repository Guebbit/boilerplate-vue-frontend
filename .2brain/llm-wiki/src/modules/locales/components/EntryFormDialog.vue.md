---
source: src/modules/locales/components/EntryFormDialog.vue
sha256: e1bd72aae2ea655f5cdbe60dbd7d55d7a6cb61795a0eecc84397c2a553177bf6
generated_at: 2026-10-17T01:02:56.616372+00:00
model: ollama:qwen3.8:27b
---

# src/modules/locales/components/EntryFormDialog.vue

## Purpose

A reusable "add one locale entry" dialog that validates a three-field form (app, key, value) against `localesEntrySchema` and emits the validated fields upward. It owns no store access, performs no persistence, and renders no save-failure UI itself — all of that is delegated to the parent via the `error` slot and the exposed `applyServerErrors` method.

## Key elements

- **`isOpen` (v-model)** — two-way binding controlling dialog visibility; the parent toggles it.
- **Props** — `apps` (available apps from the API registry), `initialApp` (preselected app), `saving` (disables the submit button while a write is in flight to prevent double-submit).
- **`emit('save')`** — fires the validated `{ app, key, value }` tuple upward; the parent performs the actual write.
- **`useStructureFormValidation`** — provides `form`, `formErrors`, `showFormErrors`, `handleSubmit`, `setForm`, and `applyServerErrors`; validation is re-run when the i18n `locale` changes.
- **`watch(isOpen)`** — on every open, resets the form to `{ app: defaultApp, key: '', value: '' }` so a reused single instance never leaks stale values.
- **`appOptions` (computed)** — maps `apps` into Vuetify select items (`value`/`title`).
- **`handleSave`** — calls `handleSubmit`, which either validates-and-emits or displays field errors and a toast.
- **`defineExpose({ applyServerErrors })`** — lets the parent project a server-side refusal (e.g. duplicate key) onto a specific field inside the dialog.
- **Slot `error`** — reserved space above the buttons where the parent renders its own `InlineErrorAlert` for save failures the form cannot detect locally.
- **`useFullscreenDialog` / `useReturnFocus` / `useId`** — responsive fullscreen on small screens, focus restoration on close, and an accessible `aria-labelledby` title id.

## Relationships

- **`src/modules/locales/schemas.ts`** — source of `localesEntrySchema`, the Zod schema this dialog validates against.
- **`src/modules/locales/views/LocaleEntries.vue`** — the parent view that renders this dialog, supplies `apps`/`initialApp`/`saving`, listens for `save`, fills the `error` slot, and calls the exposed `applyServerErrors`.
- **`src/modules/locales/tests/form-dialogs.spec.ts`** — component tests covering open/reset, validation, emit, and server-error projection for this dialog.

## Notes

- The dialog is a **single instance** the parent reuses across the page; the reset happens on the `isOpen` watcher (open → reset), not on `mounted`. Do not assume a fresh mount per open.
- The submit button is **never disabled on validation state**. An unpressable button explains nothing; instead, `handleSubmit` surfaces inline field errors and a toast. It is only disabled while `saving` is true.
- This component handles **addition only**. Editing an existing entry's value happens inline in the table; the key is immutable. No "edit" mode exists here.
- `applyServerErrors` is the contract for server-side rejections: the parent calls it with a field→message map, and the dialog displays those messages on the matching field without re-validating locally.
